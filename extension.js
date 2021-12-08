"use strict";

const vscode = require('vscode');

// # tree item
class vsclauncherView {
	data() {
		const symbol_dic = {
			comment: {
				javascript: "//",
				python: "#",
				c: "//",
				cpp: "//",
				bash:"#",
				shellscript: "#"
			},
			head: {
				markdown: "#"
			}
		}
		const obtainHeadRegExp = (lang = "") => {
			const symbol = {
				comment: symbol_dic.comment[lang],
				head: symbol_dic.head[lang]
			}
			if (symbol.comment) {
				return [RegExp(`(?<=^\\s*${symbol.comment}\\s*)#+`),
				RegExp(`(?<=^\\s*${symbol.comment}\\s*)#+.*`)];
			} else if (symbol.head) {
				return [RegExp(`^${symbol.head}+`), RegExp(`^${symbol.head}+.*`)];
			} else return [];
		}
		const editor = vscode.window.activeTextEditor;
		if (!editor || !editor.document) return [{ title: "" }];
		const lang = editor.document.languageId;
		const cont = editor.document.getText();
		//const eol = vscode.window.activeTextEditor.document.eol;
		const headExp = obtainHeadRegExp(lang);
		if (headExp.length == 0 || !cont) return [{ title: "" }];
		return cont.split("\n").map((d, ind) => ({ content: d, ind: ind }))
			.filter(line => headExp[0].test(line.content))
			.reduce((acc, line) => {
				const head = {
					level: line.content.match(headExp[0])[0].length,
					title: line.content.match(headExp[1])[0]
				};
				const length = acc.length;
				const command = `vsclauncherView.moveFocus`;
				const newItem = { title: head.title, command: command, arguments: [line.ind + 1] };
				if (head.level < 3) {
					acc.push(newItem);
				} else {
					if (Object.keys(acc[length - 1]).indexOf("children") == -1) {
						acc[length - 1].children = [newItem];
					} else {
						acc[length - 1].children.push(newItem);
					}
				}
				return acc;
			}, []);
	}

	constructor() {

	}
	//dataを元にツリー用に組み直す
	generateTree(data) {
		let self = this;
		let tree = data;
		Object.keys(tree).forEach((i) => {
			tree[i] = new TreeItem(tree[i]);
			if (tree[i].children !== undefined) {
				self.generateTree(tree[i].children);
			}
		});
		return tree;
	}
	getTreeItem(element) {
		return element;
	}
	//ツリーを生成
	getChildren(element) {
		if (element === undefined) {
			return this.generateTree(this.data());
		}
		return element.children;
	}

	moveFocus(listNum = 1) {
		const editor = vscode.window.activeTextEditor;
		const lineInd = listNum || 1;
		if (editor) {
			editor.revealRange(new vscode.Range(lineInd, 1, lineInd + 3, 1),
				vscode.TextEditorRevealType.InCenter);
		}
	}
}

//ツリー各要素を生成するクラス
class TreeItem extends vscode.TreeItem {
	constructor(data) {
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

const showMessage = vscode.window.showInformationMessage;

// # activate
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	//context;
	const searchEditor = setInterval(() => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			clearInterval(searchEditor)
			const vscl = new vsclauncherView();
			vscode.window.registerTreeDataProvider('vsclauncherView', vscl);
			vscode.commands.registerCommand("vsclauncherView.moveFocus", (args) => { vscl.moveFocus(args) });
			vscode.workspace.onDidChangeTextDocument(() => {
				vscode.window.registerTreeDataProvider('vsclauncherView', vscl);
			})
			vscode.window.onDidChangeActiveTextEditor((event) => {
				vscode.window.registerTreeDataProvider('vsclauncherView', vscl);
			})
		}

	}, 100)
}

// this method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}
