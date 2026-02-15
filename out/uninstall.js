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
/**
 * vscode:uninstall 钩子脚本
 * 在扩展被卸载时自动运行，清理注入到 workbench.desktop.main.js 中的补丁
 * 注意：此脚本在 VSCode 扩展宿主外部运行，不能使用 vscode API
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const constants_js_1 = require("./constants.js");
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function main() {
    try {
        // __dirname 是 out/，扩展根目录是其父目录
        const extensionRoot = path.dirname(__dirname);
        const touchFile = path.join(extensionRoot, constants_js_1.TOUCH_FILE_NAME);
        if (!fs.existsSync(touchFile)) {
            console.log('[vscode-background] No touch file found, nothing to clean up.');
            return;
        }
        const jsPath = fs.readFileSync(touchFile, 'utf-8').trim();
        if (!fs.existsSync(jsPath)) {
            console.log('[vscode-background] Target JS file not found:', jsPath);
            return;
        }
        let content = fs.readFileSync(jsPath, 'utf-8');
        if (!content.includes(constants_js_1.PATCH_MARKER_START)) {
            console.log('[vscode-background] No patch found in target file.');
            return;
        }
        // 移除补丁
        const regex = new RegExp(`\\n?${escapeRegex(constants_js_1.PATCH_MARKER_START)}[\\s\\S]*?${escapeRegex(constants_js_1.PATCH_MARKER_END)}\\n?`, 'g');
        content = content.replace(regex, '').trimEnd() + '\n';
        fs.writeFileSync(jsPath, content, 'utf-8');
        console.log('[vscode-background] Successfully cleaned up patch from:', jsPath);
        // 删除 touch 文件
        try {
            fs.unlinkSync(touchFile);
        }
        catch { /* ignore */ }
    }
    catch (error) {
        console.error('[vscode-background] Uninstall cleanup failed:', error);
        // 不抛出错误，确保卸载流程能继续
    }
}
main();
//# sourceMappingURL=uninstall.js.map