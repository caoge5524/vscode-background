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

        const jsPath = fs.readFileSync(touchFile, 'utf-8').trim();

        if (!fs.existsSync(jsPath)) {
            console.log('[vscode-background] Target JS file not found:', jsPath);
            return;
        }

        let content = fs.readFileSync(jsPath, 'utf-8');

        if (!content.includes(PATCH_MARKER_START)) {
            console.log('[vscode-background] No patch found in target file.');
            return;
        }

        // 移除补丁
        const regex = new RegExp(
            `\\n?${escapeRegex(PATCH_MARKER_START)}[\\s\\S]*?${escapeRegex(PATCH_MARKER_END)}\\n?`,
            'g'
        );
        content = content.replace(regex, '').trimEnd() + '\n';

        fs.writeFileSync(jsPath, content, 'utf-8');
        console.log('[vscode-background] Successfully cleaned up patch from:', jsPath);

        // 删除 touch 文件
        try { fs.unlinkSync(touchFile); } catch { /* ignore */ }
    } catch (error) {
        console.error('[vscode-background] Uninstall cleanup failed:', error);
        // 不抛出错误，确保卸载流程能继续
    }
}

main();
