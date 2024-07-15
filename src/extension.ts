import * as vscode from 'vscode';

// let orange = vscode.window.createOutputChannel("Orange");
// const CONF = vscode.workspace.getConfiguration("manualized_toc");

interface SymbolDic {
    comment: { [key: string]: string[] };
    header: { [key: string]: string[] };
}

const SYMBOL_DIC_DEFAULT: SymbolDic = {
    comment: {
        javascript: ["//"],
        python: ["#"],
        c: ["//"],
        cpp: ["//"],
        bash: ["#"],
        shellscript: ["#"],
        php: ["#", "//"],
        typescript: ["//"],
    },
    header: {
        markdown: ["#"]
    }
};

interface HeadInfo {
    level: number;
    title: string;
}

interface ResultToc {
    title: string;
    command: string;
    arguments: number[];
    children?: ResultToc[];
}

class MakeToc {
    // public text: string;
    public editor: vscode.TextEditor;
    public text: string;
    constructor(editor: vscode.TextEditor) {
        this.editor = editor;
        this.text = editor.document.getText();
        if (this.lang === "markdown") {
            // markdownの場合、コードブロックは除外
            this.text = this.text.replace(/```[\s\S]*?```/g, "\n");
        }
    }
    get conf() {
        return vscode.workspace.getConfiguration("manualized_toc");
    }
    get symbolDic(): SymbolDic {
        return {
            comment: Object.assign(SYMBOL_DIC_DEFAULT.comment, this.conf.comment_symbols),
            header: Object.assign(SYMBOL_DIC_DEFAULT.header, this.conf.header_symbols),
        };
    }
    public line: string = "";
    public lineNum: number = 0;
    private levelMin: number | null = null;
    // private indMin: number = 0;
    private *nextLine() {
        for (const line of this.text.split("\n")) {
            this.lineNum += 1;
            this.line = line;
            yield line;
        }
    };
    get lang(): string {
        return this.editor.document.languageId;
    }
    get str_symHeader(): string {
        if (this.symbolDic.header[this.lang] && this.symbolDic.header[this.lang].length > 0) {
            return this.symbolDic.header[this.lang][0];
        }
        return "#";
    }
    get arr_symComment(): string[] {
        return this.symbolDic.comment[this.lang] || [""];
    }
    get arr_regHeader(): string[] {
        const str_symHeader = this.str_symHeader;
        const arr_symComment = this.arr_symComment;
        let arr_regexs = [];
        for (const str_symComment of arr_symComment) {
            arr_regexs.push(
                `^\\s*${str_symComment}\\s*([${str_symHeader}]+)` +
                (this.conf.require_spaces_after ? "\\s" : "") + "\\s*(.*?)\\s*$"
            );
            // arr_regexs.push(
            //     `^\\s*${str_symComment}\\s*([${str_symHeader}]+.*)`
            // );
        }
        return arr_regexs;
    }

    private obtain_header(): HeadInfo | null {
        const arr_regHeader = this.arr_regHeader;
        // console.log(this.arr_symComment, arr_regHeader);

        for (const regHeader of arr_regHeader) {
            const resHeader = this.line.match(RegExp(regHeader));
            if (!resHeader) { continue; }
            const level = Math.floor(resHeader[1].length / this.str_symHeader.length);
            if (this.levelMin === null || (this.levelMin > level && level >= 1)) {
                this.levelMin = level;
                // this.indMin = this.lineNum;
            }
            return {
                level: level,
                title: resHeader[2]
            };
        }
        return null;
    }

    public arr_result_toc: ResultToc[] = [];
    public makeToc_all() {
        for (const _line of this.nextLine()) {
            this.makeToc_line();
        }
    }
    private makeToc_line() {
        const headInfo = this.obtain_header();
        if (!headInfo) { return null; }

        const command = `vsclauncherView.moveFocus`;
        const newItem = {
            title: "#".repeat(headInfo.level) + " " + headInfo.title,
            command: command,
            arguments: [this.lineNum + 1]
        };
        const length = this.arr_result_toc.length;
        const lastItem = this.arr_result_toc[length - 1];

        if (this.conf.depth_parent_max <= 0 || headInfo.level <= this.conf.depth_parent_max) {
            this.arr_result_toc.push(newItem);
        } else {
            if (!lastItem.children) {
                lastItem.children = [newItem];
            } else {
                lastItem.children.push(newItem);
            }
        }

    }


}

class vsclauncherView implements vscode.TreeDataProvider<TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined> = new vscode.EventEmitter<TreeItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined> = this._onDidChangeTreeData.event;

    data() {

        const editor = vscode.window.activeTextEditor;
        if (!editor || !editor.document) { return [{ title: "" }]; }
        const makeToc = new MakeToc(editor);
        makeToc.makeToc_all();
        return makeToc.arr_result_toc;
    }


    generateTree(data: any): TreeItem[] {
        let tree = data;
        Object.keys(tree).forEach((i) => {
            tree[i] = new TreeItem(tree[i]);
            if (tree[i].children !== undefined) {
                this.generateTree(tree[i].children);
            }
        });
        return tree;
    }

    getTreeItem(element: TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TreeItem): Thenable<TreeItem[]> {
        if (element === undefined) {
            return Promise.resolve(this.generateTree(this.data()));
        }
        return Promise.resolve(element.children || []);
    }

    moveFocus(listNum = 1) {
        const editor = vscode.window.activeTextEditor;
        const lineInd = listNum || 1;
        if (editor) {
            editor.revealRange(new vscode.Range(lineInd, 1, lineInd + 3, 1), vscode.TextEditorRevealType.InCenter);
        }
    }
}

class TreeItem extends vscode.TreeItem {
    children?: TreeItem[];

    constructor(data: any) {
        super(data.title, data.children === undefined ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Expanded);
        this.label = data.title;
        this.command = {
            title: data.title,
            command: data.command,
            arguments: data.arguments
        };
        this.iconPath = data.icon;
        this.children = data.children;
    }
}

// const showMessage = vscode.window.showInformationMessage;

export function activate(context: vscode.ExtensionContext) {
    const searchEditor = setInterval(() => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            clearInterval(searchEditor);
            const vscl = new vsclauncherView();
            vscode.window.registerTreeDataProvider('vsclauncherView', vscl);
            vscode.commands.registerCommand("vsclauncherView.moveFocus", (args) => {
                vscl.moveFocus(args);
            });
            vscode.workspace.onDidChangeTextDocument(() => {
                vscode.window.registerTreeDataProvider('vsclauncherView', vscl);
            });
            vscode.window.onDidChangeActiveTextEditor(() => {
                vscode.window.registerTreeDataProvider('vsclauncherView', vscl);
            });
        }
    }, 100);
}

// this method is called when your extension is deactivated
function deactivate() { }

module.exports = {
    activate,
    deactivate
};
