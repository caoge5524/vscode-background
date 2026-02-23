/**
 * vscode:uninstall 钩子脚本
 * 在扩展被卸载时自动运行，清理注入到 workbench.desktop.main.js 中的补丁
 * 注意：此脚本在 VSCode 扩展宿主外部运行，不能使用 vscode API
 */
import * as fs from 'fs';
import * as path from 'path';
import { TOUCH_FILE_NAME, PATCH_MARKER_START, PATCH_MARKER_END } from './constants.js';

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function main(): void {
    try {
        // __dirname 是 out/，扩展根目录是其父目录
        const extensionRoot = path.dirname(__dirname);
        const touchFile = path.join(extensionRoot, TOUCH_FILE_NAME);

        if (!fs.existsSync(touchFile)) {
            console.log('[vscode-background] No touch file found, nothing to clean up.');
            return;
        }

        let jsPath: string;
        try {
            jsPath = fs.readFileSync(touchFile, 'utf-8').trim();
        } catch (e) {
            console.warn('[vscode-background] Failed to read touch file:', e);
            return;
        }

        // 检查文件是否存在
        if (!fs.existsSync(jsPath)) {
            console.log('[vscode-background] Target JS file not found at:', jsPath);
            console.log('[vscode-background] This is expected after VS Code updates. Cleaning up touch file.');
            try {
                fs.unlinkSync(touchFile);
            } catch { /* ignore */ }
            return;
        }

        let content: string;
        try {
            content = fs.readFileSync(jsPath, 'utf-8');
        } catch (e) {
            console.warn('[vscode-background] Failed to read target JS file:', e);
            return;
        }

        if (!content.includes(PATCH_MARKER_START)) {
            console.log('[vscode-background] No patch found in target file.');
            try {
                fs.unlinkSync(touchFile);
            } catch { /* ignore */ }
            return;
        }

        // 移除补丁
        const regex = new RegExp(
            `\\n?${escapeRegex(PATCH_MARKER_START)}[\\s\\S]*?${escapeRegex(PATCH_MARKER_END)}\\n?`,
            'g'
        );
        const cleaned = content.replace(regex, '').trimEnd() + '\n';

        try {
            fs.writeFileSync(jsPath, cleaned, 'utf-8');
            console.log('[vscode-background] Successfully cleaned up patch from:', jsPath);
        } catch (e) {
            console.warn('[vscode-background] Failed to write cleaned content:', e);
            return;
        }

        // 删除 touch 文件
        try {
            fs.unlinkSync(touchFile);
        } catch (e) {
            console.warn('[vscode-background] Failed to delete touch file:', e);
        }
    } catch (error) {
        console.error('[vscode-background] Uninstall cleanup failed:', error);
        // 不抛出错误，确保卸载流程能继续
    }
}

main();
