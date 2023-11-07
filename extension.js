"use strict";

const vscode = require('vscode');

let orange = vscode.window.createOutputChannel("Orange");
const conf = vscode.workspace.getConfiguration("manualized_toc");


// const langp = "python"

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
			php: ["#", "//"]
		},
		header: {
			markdown: ["#"]
		}
	};

	const escapeRegExp = (phrase) => {
		return phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
	}
	// # parse symbols from conf
	const parseConf = (phrase) => {
		const arr_dic = (phrase || "").split(","
		).map(d => {
			const arr = d.split(":");
			if (arr.length != 2) return null;
			return {
				[arr[0].trim()]: arr[1].trim().split(" "
				).filter(dd => dd.length > 0).map(dd=>decodeURI(dd))
			};
		}
		).filter(d => d !== null);
		if (arr_dic.length == 0) return {};
		return Object.assign(
			// @ts-ignore
			...arr_dic, {}
		);
	}
	const symbol_dic_add = {
		comment: parseConf(conf.comment_symbols),
		header: parseConf(conf.header_symbols) || ["#"]
	}
	// @ts-ignore
	const symbol_dic = Object.assign( ...["comment", "header"].map(
		key => Object({[key]: {...symbol_dic_default[key], ...symbol_dic_add[key]}}))
	);


	const arr2regex = (arr_comment, arr_header) => {
		if (arr_comment.length==0){
			arr_comment = [""]
		}
		if (arr_header.length==0){
			arr_header = ["#"]
		}
		return arr_comment.map(
			reg_pattern => {
				const sym_header=arr_header[0];
				if (conf.require_spaces===true){
					return [`^\\s*${escapeRegExp(reg_pattern)}\\s*(${sym_header}+)\s`,
				`^\\s*${escapeRegExp(reg_pattern)}\\s*(${sym_header}+.*)`]
				} else {
					return [`^\\s*${escapeRegExp(reg_pattern)}\\s*(${sym_header}+)`,
					`^\\s*${escapeRegExp(reg_pattern)}\\s*(${sym_header}+.*)`]	
				}
			}
		);
	}

	const obtainHeadRegExp = (lang="") => {
		return arr2regex(symbol_dic.comment[lang] , symbol_dic.header[lang] );
	}

	const judge_toc = (cont, headExps) => {
		return cont.split("\n").map((d, ind) => ({ content: d, ind: ind }))
		.reduce((acc, line) => {
			let level_min = null;
			let ind_min = 0;
			const head_cands = headExps.filter(
				headExp => headExp.length===2 && RegExp(headExp[0]).test(line.content)
			).map((headExp, ind) => {
				const level = line.content.match(RegExp(headExp[0]))[1].length;
				if (level_min===null || (level_min > level && level >= 1)){
					level_min = level;
					ind_min = ind;
				}
				return {
					level: level,
					title: line.content.match(RegExp(headExp[1]))[1]}
			})
			if (head_cands.length===0) return acc;
			const head = head_cands[ind_min];
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
		const editor = vscode.window.activeTextEditor;
		if (!editor || !editor.document) return [{ title: "" }];
		const lang = editor.document.languageId;
		const cont = editor.document.getText();
		//const eol = vscode.window.activeTextEditor.document.eol;
		
		const headExps = obtainHeadRegExp(lang);
		// orange.appendLine(JSON.stringify(symbol_dic));
		// orange.show();

		if (headExps.length == 0 || !cont) return [{ title: "" }];
		return judge_toc(cont, headExps);

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
