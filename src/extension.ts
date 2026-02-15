import * as vscode from 'vscode';
                                 import { Background } from './background.js';

let background: Background;

export function activate(context: vscode.ExtensionContext) {
	console.log('VSCode Background extension activated');

	background = new Background(context);

	// 注册命令
	context.subscriptions.push(
		vscode.commands.registerCommand('vscode-background.install', () => background.install()),
		vscode.commands.registerCommand('vscode-background.uninstall', () => background.uninstall()),
		vscode.commands.registerCommand('vscode-background.addVideos', () => background.addVideos()),
		vscode.commands.registerCommand('vscode-background.diagnostics', () => background.showDiagnostics()),
	);

	// 监听配置变更
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('vscodeBackground')) {
				background.onConfigChanged();
			}
		})
	);

	// 启动时检查补丁状态（VSCode 更新后可能丢失）
	background.checkAndPrompt();
}

export function deactivate() {
	// 不在此处清理 —— 背景应在 VSCode 重启后保持
	// 用户应使用 "卸载背景" 命令来移除
	console.log('VSCode Background extension deactivated (background preserved)');
}
