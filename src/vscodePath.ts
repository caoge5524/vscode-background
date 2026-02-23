import * as fs from 'fs';
import * as path from 'path';

/**
 * 查找 workbench.desktop.main.js 路径
 * 兼容不同 VSCode 安装方式和版本
 * 
 * 注意：VS Code 会定期更新版本哈希部分（如 b6a47e94e3），
 * 导致路径改变。本函数每次都会动态寻找最新的路径。
 */
export function getWorkbenchJsPath(appRoot: string): string | null {
    const baseDirs = new Set<string>();
    baseDirs.add(appRoot);
    baseDirs.add(path.dirname(appRoot));
    baseDirs.add(path.dirname(path.dirname(appRoot)));

    const possiblePaths: string[] = [];
    const foundVersionHashes: string[] = [];

    for (const baseDir of baseDirs) {
        if (!fs.existsSync(baseDir)) { continue; }

        possiblePaths.push(
            path.join(baseDir, 'out', 'vs', 'workbench', 'workbench.desktop.main.js')
        );

        if (!baseDir.includes('resources' + path.sep + 'app')) {
            possiblePaths.push(
                path.join(baseDir, 'resources', 'app', 'out', 'vs', 'workbench', 'workbench.desktop.main.js')
            );
        }

        // 检查版本哈希子目录（VS Code 版本号）
        try {
            const entries = fs.readdirSync(baseDir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory() && /^[a-f0-9]{6,40}$/i.test(entry.name)) {
                    foundVersionHashes.push(entry.name); // 记录找到的版本号
                    possiblePaths.push(
                        path.join(baseDir, entry.name, 'out', 'vs', 'workbench', 'workbench.desktop.main.js')
                    );
                }
            }
        } catch { /* ignore */ }
    }

    // 日志输出，帮助调试
    if (foundVersionHashes.length > 0) {
        console.log(`VSCode Background: 找到版本哈希: ${foundVersionHashes.join(', ')}`);
    }

    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            console.log(`VSCode Background: 工作台文件路径确认: ${p}`);
            return p;
        }
    }

    console.warn(`VSCode Background: 无法找到 workbench.desktop.main.js，搜索路径: ${JSON.stringify(Array.from(baseDirs))}`);
    return null;
}

/**
 * 查找 workbench.html 路径（用于清理 v1 旧版注入）
 */
export function getWorkbenchHtmlPath(appRoot: string): string | null {
    const baseDirs = new Set<string>();
    baseDirs.add(appRoot);
    baseDirs.add(path.dirname(appRoot));

    const possiblePaths: string[] = [];

    for (const baseDir of baseDirs) {
        if (!fs.existsSync(baseDir)) { continue; }

        possiblePaths.push(
            path.join(baseDir, 'out', 'vs', 'code', 'electron-browser', 'workbench', 'workbench.html'),
            path.join(baseDir, 'out', 'vs', 'code', 'electron-sandbox', 'workbench', 'workbench.html')
        );

        if (!baseDir.includes('resources' + path.sep + 'app')) {
            possiblePaths.push(
                path.join(baseDir, 'resources', 'app', 'out', 'vs', 'code', 'electron-browser', 'workbench', 'workbench.html'),
                path.join(baseDir, 'resources', 'app', 'out', 'vs', 'code', 'electron-sandbox', 'workbench', 'workbench.html')
            );
        }
    }

    for (const p of possiblePaths) {
        if (fs.existsSync(p)) { return p; }
    }

    return null;
}

/**
 * 查找 workbench.desktop.main.css 路径（用于清理 v1 旧版注入）
 */
export function getWorkbenchCssPath(appRoot: string): string | null {
    const baseDirs = new Set<string>();
    baseDirs.add(appRoot);
    baseDirs.add(path.dirname(appRoot));

    const possiblePaths: string[] = [];

    for (const baseDir of baseDirs) {
        if (!fs.existsSync(baseDir)) { continue; }

        possiblePaths.push(
            path.join(baseDir, 'out', 'vs', 'workbench', 'workbench.desktop.main.css')
        );

        if (!baseDir.includes('resources' + path.sep + 'app')) {
            possiblePaths.push(
                path.join(baseDir, 'resources', 'app', 'out', 'vs', 'workbench', 'workbench.desktop.main.css')
            );
        }
    }

    for (const p of possiblePaths) {
        if (fs.existsSync(p)) { return p; }
    }

    return null;
}

/**
 * 将本地文件路径转换为 vscode-file:// 协议 URL
 * VSCode v1.51.1+ 的 sandbox 模式限制了 file:// 协议的访问，
 * 必须使用 vscode-file://vscode-app/ 协议来加载本地资源
 */
export function normalizeVideoUrl(filePath: string): string {
    // https:// 和 data: URL 直接使用
    if (filePath.startsWith('https://') || filePath.startsWith('data:')) {
        return filePath;
    }

    // 已经是 vscode-file:// 协议
    if (filePath.startsWith('vscode-file://')) {
        return filePath;
    }

    // file:// 协议 → vscode-file://
    if (filePath.startsWith('file:///')) {
        const localPath = filePath.substring('file:///'.length);
        return `vscode-file://vscode-app/${localPath}`;
    }

    // 本地绝对路径 → vscode-file://
    let normalized = filePath.replace(/\\/g, '/');
    if (!normalized.startsWith('/')) {
        // Windows 路径：C:/... → /C:/...
        normalized = '/' + normalized;
    }
    return `vscode-file://vscode-app${normalized}`;
}
