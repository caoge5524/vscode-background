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
exports.getWorkbenchJsPath = getWorkbenchJsPath;
exports.getWorkbenchHtmlPath = getWorkbenchHtmlPath;
exports.getWorkbenchCssPath = getWorkbenchCssPath;
exports.normalizeVideoUrl = normalizeVideoUrl;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * 查找 workbench.desktop.main.js 路径
 * 兼容不同 VSCode 安装方式和版本
 */
function getWorkbenchJsPath(appRoot) {
    const baseDirs = new Set();
    baseDirs.add(appRoot);
    baseDirs.add(path.dirname(appRoot));
    baseDirs.add(path.dirname(path.dirname(appRoot)));
    const possiblePaths = [];
    for (const baseDir of baseDirs) {
        if (!fs.existsSync(baseDir)) {
            continue;
        }
        possiblePaths.push(path.join(baseDir, 'out', 'vs', 'workbench', 'workbench.desktop.main.js'));
        if (!baseDir.includes('resources' + path.sep + 'app')) {
            possiblePaths.push(path.join(baseDir, 'resources', 'app', 'out', 'vs', 'workbench', 'workbench.desktop.main.js'));
        }
        // 检查版本哈希子目录
        try {
            const entries = fs.readdirSync(baseDir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory() && /^[a-f0-9]{6,40}$/i.test(entry.name)) {
                    possiblePaths.push(path.join(baseDir, entry.name, 'out', 'vs', 'workbench', 'workbench.desktop.main.js'));
                }
            }
        }
        catch { /* ignore */ }
    }
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            return p;
        }
    }
    return null;
}
/**
 * 查找 workbench.html 路径（用于清理 v1 旧版注入）
 */
function getWorkbenchHtmlPath(appRoot) {
    const baseDirs = new Set();
    baseDirs.add(appRoot);
    baseDirs.add(path.dirname(appRoot));
    const possiblePaths = [];
    for (const baseDir of baseDirs) {
        if (!fs.existsSync(baseDir)) {
            continue;
        }
        possiblePaths.push(path.join(baseDir, 'out', 'vs', 'code', 'electron-browser', 'workbench', 'workbench.html'), path.join(baseDir, 'out', 'vs', 'code', 'electron-sandbox', 'workbench', 'workbench.html'));
        if (!baseDir.includes('resources' + path.sep + 'app')) {
            possiblePaths.push(path.join(baseDir, 'resources', 'app', 'out', 'vs', 'code', 'electron-browser', 'workbench', 'workbench.html'), path.join(baseDir, 'resources', 'app', 'out', 'vs', 'code', 'electron-sandbox', 'workbench', 'workbench.html'));
        }
    }
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            return p;
        }
    }
    return null;
}
/**
 * 查找 workbench.desktop.main.css 路径（用于清理 v1 旧版注入）
 */
function getWorkbenchCssPath(appRoot) {
    const baseDirs = new Set();
    baseDirs.add(appRoot);
    baseDirs.add(path.dirname(appRoot));
    const possiblePaths = [];
    for (const baseDir of baseDirs) {
        if (!fs.existsSync(baseDir)) {
            continue;
        }
        possiblePaths.push(path.join(baseDir, 'out', 'vs', 'workbench', 'workbench.desktop.main.css'));
        if (!baseDir.includes('resources' + path.sep + 'app')) {
            possiblePaths.push(path.join(baseDir, 'resources', 'app', 'out', 'vs', 'workbench', 'workbench.desktop.main.css'));
        }
    }
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            return p;
        }
    }
    return null;
}
/**
 * 将本地文件路径转换为 vscode-file:// 协议 URL
 * VSCode v1.51.1+ 的 sandbox 模式限制了 file:// 协议的访问，
 * 必须使用 vscode-file://vscode-app/ 协议来加载本地资源
 */
function normalizeVideoUrl(filePath) {
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
//# sourceMappingURL=vscodePath.js.map