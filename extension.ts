"use strict";

const vscode = require('vscode');

const escapeRegExp = (string_: string) => {
    return string_.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
const conf = vscode.workspace.getConfiguration("Manualized_TOC");
// # parse symbols from conf
const parseConf = (phrase: string) => {
	const arr_dic: {[x: string]:string[]}[] = phrase.split(","
	).map((d: string) =>{
		const arr: string[]=d.split(":");
		if (arr.length !=2 ) return null;
		return {
			[arr[0]]: arr[1].split(" "
			).filter(dd=>dd.length>0)};
		}
		).filter(d=>d!==null);
	const dic_combined: {[x:string]: string[]} = Object.assign(...arr_dic);
	return dic_combined;
}
const symbol_dic_add = {
	comment : parseConf(conf.comment_symbols),
	head : parseConf(conf.head_symbols)
}

const a: {[x: number]:number}[] = [{1:1, 2:2}, {3:1}];
const b = Object.assign(...a);

// # tree item
class vsclauncherView {
	data() {
		const symbol_dic_default = {
			comment: {
				javascript: ["//"],
				python: ["#"],
				c: ["//"],
				cpp: ["//"],
				bash: ["#"],
				shellscript: ["#"],
				php:[ "#", "//"]
			},
			head: {
				markdown: ["#"]
			}
		};
		const symbol_dic = {...symbol_dic_default, ...symbol_dic_add};
		const obtainHeadRegExp = (lang = "") => {
			const symbol = {
				comment: symbol_dic.comment[lang],
				head: symbol_dic.head[lang]
			}
			if (symbol.comment) {
				const reg_pattern: string = symbol.comment.map((d: string)=>escapeRegExp(d)).join("|");
				return [RegExp(`(?<=^\\s*${reg_pattern}\\s*)#+`),
				RegExp(`(?<=^\\s*${reg_pattern}\\s*)#+.*`)];
			} else if (symbol.head) {
				const reg_pattern = symbol.head.map((d: string)=>escapeRegExp(d)).join("|");
				return [RegExp(`^${reg_pattern}+`), RegExp(`^${reg_pattern}+.*`)];
			} else return [];
		}
		const editor = vscode.window.activeTextEditor;
		if (!editor || !editor.document) return [{ title: "" }];
		const lang = editor.document.languageId;
		const cont = editor.document.getText();
		//const eol = vscode.window.activeTextEditor.document.eol;
		const headExp = obtainHeadRegExp(lang);
		if (headExp.length == 0 || !cont) return [{ title: "" }];
		return cont.split("\n").map((d: string, ind: number) => Object({ content: d, ind: ind }))
			.filter((line: {content: string, ind: number} )=> headExp[0].test(line.content))
			.reduce((acc: {
				title: string, command: string, arguments: number[],
				 children:{title: string, command: string, arguments: number[]}[]}[],
				 line: {content: string, ind: number} ) => {
				const head = {
					level: line.content.match(headExp[0])[0].length,
					title: line.content.match(headExp[1])[0]
				};
				const length = acc.length;
				const command = `vsclauncherView.moveFocus`;
				const newItem = { title: head.title, command: command, arguments: [line.ind + 1], children: [] };
				if (head.level < 3) {
					acc.push(newItem);
				} else {
					acc[length - 1].children.push(newItem);
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
