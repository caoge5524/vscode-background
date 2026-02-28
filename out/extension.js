"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const background_js_1 = require("./background.js");
let background;
function activate(context) {
    console.log('VSCode Background extension activated');
    background = new background_js_1.Background(context);
    // 注册命令
    context.subscriptions.push(vscode.commands.registerCommand('vscode-background.install', () => background.install()), vscode.commands.registerCommand('vscode-background.uninstall', () => background.uninstall()), vscode.commands.registerCommand('vscode-background.addVideos', () => background.addVideos()), vscode.commands.registerCommand('vscode-background.diagnostics', () => background.showDiagnostics()), vscode.commands.registerCommand('vscode-background.manageVideos', () => background.manageVideos()));
    // 监听配置变更
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('vscodeBackground')) {
            background.onConfigChanged();
        }
    }));
    // 启动时检查补丁状态（VSCode 更新后可能丢失）
    background.checkAndPrompt();
}
function deactivate() {
    // 不在此处清理 —— 背景应在 VSCode 重启后保持
    // 用户应使用 "卸载背景" 命令来移除
    console.log('VSCode Background extension deactivated (background preserved)');
}
//# sourceMappingURL=extension.js.map