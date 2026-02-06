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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const crypto = __importStar(require("crypto"));
let workbenchHtmlPath = '';
let workbenchCssPath = '';
let isBackgroundEnabled = false;
let extensionContext;
// 动态发现 VSCode 安装目录下可能的版本哈希子目录
function findVersionedPaths(baseDir) {
    const versionedPaths = [];
    try {
        if (!fs.existsSync(baseDir))
            return versionedPaths;
        const entries = fs.readdirSync(baseDir, { withFileTypes: true });
        for (const entry of entries) {
            // 匹配类似 bdd88df003 这样的版本哈希目录（字母数字，通常8-40位）
            if (entry.isDirectory() && /^[a-f0-9]{6,40}$/i.test(entry.name)) {
                versionedPaths.push(path.join(baseDir, entry.name));
            }
        }
    }
    catch (e) {
        // 忽略读取目录失败的情况
    }
    return versionedPaths;
}
// 递归向上查找 VSCode 安装根目录
function findVSCodeRoot(startDir, maxLevels = 5) {
    const roots = [];
    let currentDir = startDir;
    for (let i = 0; i < maxLevels; i++) {
        roots.push(currentDir);
        // 查找当前目录下的版本哈希子目录
        const versionedDirs = findVersionedPaths(currentDir);
        roots.push(...versionedDirs);
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir)
            break; // 到达根目录
        currentDir = parentDir;
    }
    return [...new Set(roots)]; // 去重
}
// 辅助函数：读取配置（内部存储，不在UI显示）
function getVideoFiles() {
    const config = vscode.workspace.getConfiguration('vscodeBackground');
    return config.get('videoFiles', []);
}
function getOpacity() {
    const config = vscode.workspace.getConfiguration('vscodeBackground');
    return config.get('opacity', 0.8);
}
function getSwitchInterval() {
    const config = vscode.workspace.getConfiguration('vscodeBackground');
    return config.get('switchInterval', 180000);
}
async function setVideoFiles(files) {
    const config = vscode.workspace.getConfiguration('vscodeBackground');
    await config.update('videoFiles', files, vscode.ConfigurationTarget.Global);
}
async function updateOpacity(opacity) {
    const config = vscode.workspace.getConfiguration('vscodeBackground');
    await config.update('opacity', opacity, vscode.ConfigurationTarget.Global);
}
async function updateSwitchInterval(interval) {
    const config = vscode.workspace.getConfiguration('vscodeBackground');
    await config.update('switchInterval', interval, vscode.ConfigurationTarget.Global);
}
// 定义所有可用主题
const THEMES = {
    glass: {
        name: 'glass',
        label: 'Glass (玻璃)',
        description: 'Completely transparent - see the video clearly',
        css: (opacity) => `
.monaco-workbench {
	opacity: ${opacity} !important;
}
`
    },
    matte: {
        name: 'matte',
        label: 'Matte (磨砂)',
        description: 'Semi-transparent frosted glass effect with blur',
        css: (opacity) => `
.monaco-workbench {
	opacity: ${opacity} !important;
	background: rgba(30, 30, 30, ${Math.max(0.4, (1 - opacity) * 0.6)}) !important;
	backdrop-filter: blur(12px) saturate(180%);
	-webkit-backdrop-filter: blur(12px) saturate(180%);
}
.monaco-workbench .part {
	background: rgba(40, 40, 40, 0.3) !important;
	backdrop-filter: blur(8px);
}
.monaco-workbench .editor-container {
	background: rgba(25, 25, 25, 0.4) !important;
	backdrop-filter: blur(6px);
}
body {
	background: transparent !important;
}
`
    }
};
function getTheme() {
    const config = vscode.workspace.getConfiguration('vscodeBackground');
    const theme = config.get('theme', 'glass');
    return theme;
}
async function setThemeConfig(theme) {
    const config = vscode.workspace.getConfiguration('vscodeBackground');
    await config.update('theme', theme, vscode.ConfigurationTarget.Global);
}
function generateCssForTheme(theme, opacity) {
    const themeObj = THEMES[theme] || THEMES.glass;
    return themeObj.css(opacity);
}
// 辅助函数：将选中的视频文件复制到 background-videos 文件夹
async function copyVideosToBackgroundFolder(selectedFiles) {
    if (!workbenchHtmlPath) {
        throw new Error('Cannot locate VSCode workbench files');
    }
    const videoDirPath = path.join(path.dirname(workbenchHtmlPath), 'background-videos');
    // 创建文件夹
    try {
        if (!fs.existsSync(videoDirPath)) {
            fs.mkdirSync(videoDirPath, { recursive: true });
        }
    }
    catch (error) {
        if (error.code === 'EPERM' || error.code === 'EACCES') {
            throw new Error('Permission denied - please run VSCode as Administrator');
        }
        throw error;
    }
    // 找到已有的最高索引
    let nextIndex = 1;
    try {
        const files = fs.readdirSync(videoDirPath);
        for (const file of files) {
            const match = file.match(/^bg(\d+)\./);
            if (match) {
                const num = parseInt(match[1], 10);
                nextIndex = Math.max(nextIndex, num + 1);
            }
        }
    }
    catch (error) {
        // 目录读取失败，使用默认值 1
    }
    // 复制文件
    const copiedFiles = [];
    const failedFiles = [];
    for (const sourceFile of selectedFiles) {
        try {
            // 验证源文件是否存在
            if (!fs.existsSync(sourceFile)) {
                failedFiles.push(`${path.basename(sourceFile)} (file not found)`);
                console.error(`Source file not found: ${sourceFile}`);
                continue;
            }
            const ext = path.extname(sourceFile);
            const destName = `bg${nextIndex}${ext}`;
            const destPath = path.join(videoDirPath, destName);
            fs.copyFileSync(sourceFile, destPath);
            copiedFiles.push(destPath);
            nextIndex++;
            console.log(`Copied video: ${sourceFile} -> ${destPath}`);
        }
        catch (error) {
            const errorMsg = error.message || error.code || String(error);
            failedFiles.push(`${path.basename(sourceFile)} (${errorMsg})`);
            console.error(`Failed to copy file: ${sourceFile}`, error);
            if (error.code === 'EPERM' || error.code === 'EACCES') {
                throw new Error(`Permission denied - please run VSCode as Administrator`);
            }
        }
    }
    // 如果有复制失败的文件，提示用户
    if (failedFiles.length > 0) {
        const failureMessage = `Failed to copy ${failedFiles.length} file(s):\n${failedFiles.join('\n')}`;
        if (copiedFiles.length === 0) {
            throw new Error(failureMessage);
        }
        else {
            vscode.window.showWarningMessage(`Partially copied: ${copiedFiles.length} succeeded, ${failedFiles.length} failed`);
        }
    }
    return copiedFiles;
}
// 生成应用脚本（内部函数）
async function generateApplyScript() {
    const config = vscode.workspace.getConfiguration('vscodeBackground');
    const videoFiles = getVideoFiles();
    const switchInterval = getSwitchInterval();
    const opacity = getOpacity();
    const enabled = config.get('enabled', true);
    if (!workbenchHtmlPath || !workbenchCssPath) {
        vscode.window.showErrorMessage('Cannot locate VSCode workbench files.');
        return null;
    }
    const htmlDir = path.dirname(workbenchHtmlPath);
    const cssDir = path.dirname(workbenchCssPath);
    const videosDir = path.join(htmlDir, 'background-videos');
    const appRoot = vscode.env.appRoot;
    const productJsonPath = path.join(appRoot, 'product.json');
    // 检查哪些文件需要复制（不在 background-videos 中的文件）
    const filesToCopy = [];
    for (const file of videoFiles) {
        if (!file.includes('background-videos')) {
            filesToCopy.push(file);
        }
    }
    // 准备视频文件复制命令（仅复制需要复制的文件）
    const videoCopyLines = [];
    let nextBgIndex = 1;
    // 查找已存在的 bg*.* 文件，从最高索引继续
    try {
        if (fs.existsSync(videosDir)) {
            const files = fs.readdirSync(videosDir);
            for (const file of files) {
                const match = file.match(/^bg(\d+)\./);
                if (match) {
                    const num = parseInt(match[1], 10);
                    nextBgIndex = Math.max(nextBgIndex, num + 1);
                }
            }
        }
    }
    catch (error) {
        // 忽略错误，使用默认值
    }
    if (filesToCopy.length > 0) {
        filesToCopy.forEach((file) => {
            const ext = path.extname(file).toLowerCase().replace('.', '') || 'mp4';
            const destFile = 'bg' + nextBgIndex + '.' + ext;
            videoCopyLines.push('    Copy-Item -Path "' + file.replace(/\\/g, '\\\\') + '" -Destination "$videosDir\\\\' + destFile + '" -Force');
            nextBgIndex++;
        });
    }
    // 生成视频脚本和 CSS
    const videoScript = generateVideoScript(switchInterval, opacity);
    const cssRules = generateCssRules(opacity);
    const scriptLines = [
        '# VSCode Background - Auto-Apply Script',
        '# This script is automatically generated and executed',
        '',
        '$ErrorActionPreference = "Stop"',
        '',
        "$htmlPath = '" + workbenchHtmlPath + "'",
        "$cssPath = '" + workbenchCssPath + "'",
        "$videosDir = '" + videosDir + "'",
        "$productJsonPath = '" + productJsonPath + "'",
        '$enabled = $' + (enabled ? 'true' : 'false'),
        '',
        'Write-Host "VSCode Background - Applying Settings..." -ForegroundColor Cyan',
        '',
        '# Create videos directory',
        'if (-not (Test-Path $videosDir)) {',
        '    New-Item -ItemType Directory -Path $videosDir -Force | Out-Null',
        '}',
        '',
    ];
    // 第一步：仅当有新文件需要复制时才执行复制
    if (filesToCopy.length > 0) {
        scriptLines.push('# Copy video files', 'Write-Host "Copying ' + filesToCopy.length + ' video file(s)..." -ForegroundColor Yellow');
        filesToCopy.forEach((file) => {
            const ext = path.extname(file).toLowerCase().replace('.', '') || 'mp4';
            const destFile = 'bg' + nextBgIndex + '.' + ext;
            scriptLines.push('Copy-Item -Path \'' + file + '\' -Destination "$videosDir\\' + destFile + '" -Force');
            nextBgIndex++;
        });
        scriptLines.push('');
    }
    // 第二步：处理 HTML 文件
    scriptLines.push('# Process HTML file', 'Write-Host "Processing workbench.html..." -ForegroundColor Yellow', '$html = Get-Content $htmlPath -Raw -Encoding UTF8', '', '# Remove ALL existing injections (old and new formats)', '$html = $html -replace "(?s)<!-- VSCODE-BACKGROUND-START -->.*?<!-- VSCODE-BACKGROUND-END -->", ""', '$html = $html -replace "(?s)<!-- VSCode Background.*?-->", ""', '# Remove orphaned brackets', '$html = $html -replace "(?m)^\\s*\\[\\]\\s*$", ""', '$html = $html -replace "(?m)^\\s*\\[\\s*$", ""', '$html = $html -replace "(?m)^\\s*\\]\\s*$", ""', '');
    // 只在启用且有视频时添加新的 HTML 注入
    if (enabled && videoFiles.length > 0) {
        // 使用 Here-String 来处理复杂的多行脚本（避免转义问题）
        const videoScriptLines = videoScript.split('\n');
        scriptLines.push('# Add injection to HTML', '$videoScript = @"', ...videoScriptLines, '"@', '', '$injection = "<!-- VSCODE-BACKGROUND-START -->" + [System.Environment]::NewLine + $videoScript + [System.Environment]::NewLine + "<!-- VSCODE-BACKGROUND-END -->"', '$html = $html -replace "(<body[^>]*>)", "`$1`r`n$injection"', 'Write-Host "HTML injection added" -ForegroundColor Green', '');
    }
    else if (enabled && videoFiles.length === 0) {
        scriptLines.push('Write-Host "WARNING: No video files configured" -ForegroundColor Yellow', '');
    }
    else {
        scriptLines.push('Write-Host "HTML injection removed (disabled or no videos)" -ForegroundColor Green', '');
    }
    scriptLines.push('[System.IO.File]::WriteAllText($htmlPath, $html, [System.Text.Encoding]::UTF8)', '');
    // 第三步：处理 CSS 文件（始终处理，确保单次注入）
    scriptLines.push('# Process CSS file', 'Write-Host "Processing CSS..." -ForegroundColor Yellow', '$css = Get-Content $cssPath -Raw -Encoding UTF8', '', '# Remove ALL existing CSS injections (old and new formats)', '$css = $css -replace "(?s)/\\* VSCODE-BACKGROUND-CSS-START \\*/.*?/\\* VSCODE-BACKGROUND-CSS-END \\*/", ""', '$css = $css -replace "(?s)/\\* VSCode Background Extension - START \\*/.*?/\\* VSCode Background Extension - END \\*/", ""', '');
    // 启用时总是添加 CSS，即使没有视频文件（为了后续视频做准备）
    if (enabled) {
        // 使用 Here-String 处理 CSS
        const cssRulesLines = cssRules.split('\n');
        scriptLines.push('# Add CSS injection', '$cssRules = @"', ...cssRulesLines, '"@', '', '$cssInjection = "/* VSCODE-BACKGROUND-CSS-START */" + [System.Environment]::NewLine + $cssRules + [System.Environment]::NewLine + "/* VSCODE-BACKGROUND-CSS-END */"', '$css = $css + "`r`n" + $cssInjection', 'Write-Host "CSS injection added" -ForegroundColor Green', '');
    }
    else {
        scriptLines.push('Write-Host "CSS injection removed (disabled)" -ForegroundColor Green', '');
    }
    scriptLines.push('[System.IO.File]::WriteAllText($cssPath, $css, [System.Text.Encoding]::UTF8)', '');
    scriptLines.push('Write-Host ""', 'Write-Host "Settings applied successfully!" -ForegroundColor Cyan', 'Write-Host "Please restart VSCode to see changes." -ForegroundColor Yellow');
    return scriptLines.join('\r\n');
}
// 运行应用脚本（需要管理员权限）
async function runApplyScript() {
    const scriptContent = await generateApplyScript();
    if (!scriptContent) {
        return false;
    }
    // 保存到扩展目录
    const scriptPath = path.join(extensionContext.extensionPath, 'apply-settings.ps1');
    fs.writeFileSync(scriptPath, scriptContent, 'utf8');
    return new Promise((resolve) => {
        // 方法1: 直接运行 PowerShell 脚本（在当前用户上下文中，可能需要额外权限提示）
        // 方法2: 使用 Start-Process -Verb RunAs 在新 PowerShell 窗口中运行
        // 为确保文件写入成功，我们直接使用 powershell.exe -File，让 Windows 处理权限提示
        const command = 'powershell.exe';
        const args = [
            '-NoProfile',
            '-ExecutionPolicy', 'Bypass',
            '-File', scriptPath
        ];
        (0, child_process_1.exec)(`${command} ${args.map(a => `"${a}"`).join(' ')}`, (error, stdout, stderr) => {
            if (error) {
                // 检查是否是权限问题
                if (stderr && stderr.includes('Access Denied')) {
                    // 需要以管理员身份运行
                    const adminCommand = `powershell -Command "Start-Process powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \\\"${scriptPath}\\\"' -Verb RunAs -Wait"`;
                    (0, child_process_1.exec)(adminCommand, (adminError) => {
                        if (adminError) {
                            vscode.window.showErrorMessage('Failed to apply settings with admin privileges: ' + adminError.message + '. Please run VSCode as Administrator and try again.');
                            resolve(false);
                        }
                        else {
                            resolve(true);
                        }
                    });
                }
                else {
                    vscode.window.showErrorMessage('Failed to apply settings: ' + (stderr || error.message) + '. Make sure to accept the Administrator prompt.');
                    resolve(false);
                }
            }
            else {
                resolve(true);
            }
        });
    });
}
// 检查当前状态（从文件中读取真实数据）
async function checkCurrentStatus(updateConfig = false) {
    if (!workbenchHtmlPath || !fs.existsSync(workbenchHtmlPath)) {
        return '❌ VSCode workbench files not found';
    }
    try {
        const html = fs.readFileSync(workbenchHtmlPath, 'utf-8');
        const hasInjection = html.includes('<!-- VSCODE-BACKGROUND-START -->');
        if (!hasInjection) {
            return '⚪ Not injected - Background is disabled';
        }
        // 从文件中提取真实数据
        let videoCount = 0;
        let realOpacity = 0.8;
        let realSwitchInterval = 180000;
        // 提取 opacity（从 CSS 或 video 标签中）
        const opacityMatch = html.match(/opacity: ([\d.]+)/);
        if (opacityMatch) {
            realOpacity = parseFloat(opacityMatch[1]);
        }
        // 提取 switchInterval
        const intervalMatch = html.match(/const switchInterval = (\d+)/);
        if (intervalMatch) {
            realSwitchInterval = parseInt(intervalMatch[1], 10);
        }
        // 统计 background-videos 文件夹中的视频文件
        if (workbenchHtmlPath) {
            const videoDirPath = path.join(path.dirname(workbenchHtmlPath), 'background-videos');
            if (fs.existsSync(videoDirPath)) {
                try {
                    const files = fs.readdirSync(videoDirPath);
                    for (const file of files) {
                        if (/^bg\d+\.(mp4|webm|ogg)$/i.test(file)) {
                            videoCount++;
                        }
                    }
                }
                catch (error) {
                    // 忽略目录读取错误
                }
            }
        }
        // 如果需要，同步真实数据到配置
        if (updateConfig) {
            await updateOpacity(realOpacity);
            await updateSwitchInterval(realSwitchInterval);
            console.log(`Synced config from file: opacity=${realOpacity}, switchInterval=${realSwitchInterval}`);
        }
        let status = '✅ Background active';
        status += ` | Videos: ${videoCount}`;
        if (realSwitchInterval === 0) {
            status += ' | Infinite loop mode';
        }
        else {
            status += ` | Switch: ${(realSwitchInterval / 1000).toFixed(0)}s`;
        }
        status += ` | Opacity: ${(realOpacity * 100).toFixed(0)}%`;
        return status;
    }
    catch (error) {
        return '⚠️ Error reading files: ' + error;
    }
}
function activate(context) {
    console.log('VSCode Background extension activated');
    extensionContext = context;
    // Locate workbench.html - try multiple possible paths
    const appRoot = vscode.env.appRoot;
    console.log('VSCode appRoot:', appRoot);
    // 从 appRoot 向上查找所有可能的基础目录
    const baseDirs = findVSCodeRoot(appRoot);
    console.log('Base directories found:', baseDirs);
    const possibleHtmlPaths = [];
    for (const baseDir of baseDirs) {
        possibleHtmlPaths.push(path.join(baseDir, 'out', 'vs', 'code', 'electron-sandbox', 'workbench', 'workbench.html'), path.join(baseDir, 'out', 'vs', 'code', 'electron-browser', 'workbench', 'workbench.html'), path.join(baseDir, 'out', 'vs', 'workbench', 'workbench.html'), path.join(baseDir, 'resources', 'app', 'out', 'vs', 'code', 'electron-sandbox', 'workbench', 'workbench.html'), path.join(baseDir, 'resources', 'app', 'out', 'vs', 'code', 'electron-browser', 'workbench', 'workbench.html'));
    }
    for (const possiblePath of possibleHtmlPaths) {
        if (fs.existsSync(possiblePath)) {
            workbenchHtmlPath = possiblePath;
            console.log(`Found workbench.html at: ${workbenchHtmlPath}`);
            break;
        }
    }
    if (!workbenchHtmlPath) {
        console.error('Could not locate workbench.html. Checked paths:', possibleHtmlPaths);
    }
    // Locate workbench.desktop.main.css
    const possibleCssPaths = [];
    for (const baseDir of baseDirs) {
        possibleCssPaths.push(path.join(baseDir, 'out', 'vs', 'workbench', 'workbench.desktop.main.css'), path.join(baseDir, 'resources', 'app', 'out', 'vs', 'workbench', 'workbench.desktop.main.css'));
    }
    for (const possiblePath of possibleCssPaths) {
        if (fs.existsSync(possiblePath)) {
            workbenchCssPath = possiblePath;
            console.log(`Found workbench.desktop.main.css at: ${workbenchCssPath}`);
            break;
        }
    }
    if (!workbenchCssPath) {
        console.error('Could not locate workbench.desktop.main.css. Checked paths:', possibleCssPaths);
    }
    const enableBackground = vscode.commands.registerCommand('vscode-background.enable', async () => {
        try {
            const config = vscode.workspace.getConfiguration('vscodeBackground');
            const videoFiles = getVideoFiles();
            if (videoFiles.length === 0) {
                const action = await vscode.window.showInformationMessage('No video files configured. Please add videos first.', 'Add Videos', 'Cancel');
                if (action === 'Add Videos') {
                    await vscode.commands.executeCommand('vscode-background.addVideos');
                }
                return;
            }
            await config.update('enabled', true, vscode.ConfigurationTarget.Global);
            const action = await vscode.window.showInformationMessage(`Ready to enable video background with ${videoFiles.length} video(s). Apply settings now?`, 'Apply', 'Cancel');
            if (action === 'Apply') {
                await vscode.commands.executeCommand('vscode-background.applySettings');
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to enable background: ${error}`);
        }
    });
    const disableBackground = vscode.commands.registerCommand('vscode-background.disable', async () => {
        try {
            await restoreOriginalWorkbench();
            vscode.window.showInformationMessage('Video background disabled! Please restart VSCode.', 'Restart').then(selection => {
                if (selection === 'Restart') {
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to disable background: ${error}`);
        }
    });
    const configureBackground = vscode.commands.registerCommand('vscode-background.configure', async () => {
        const config = vscode.workspace.getConfiguration('vscodeBackground');
        const currentFiles = getVideoFiles();
        vscode.window.showInformationMessage(`Current video files: ${currentFiles.length > 0 ? currentFiles.join(', ') : 'None'}`, 'Select Videos', 'Cancel').then(selection => {
            if (selection === 'Select Videos') {
                vscode.commands.executeCommand('vscode-background.enable');
            }
        });
    });
    const diagnostics = vscode.commands.registerCommand('vscode-background.diagnostics', async () => {
        const appRoot = vscode.env.appRoot;
        const baseDirs = findVSCodeRoot(appRoot);
        const possibleHtmlPaths = [];
        for (const baseDir of baseDirs) {
            possibleHtmlPaths.push(path.join(baseDir, 'out', 'vs', 'code', 'electron-sandbox', 'workbench', 'workbench.html'), path.join(baseDir, 'out', 'vs', 'code', 'electron-browser', 'workbench', 'workbench.html'), path.join(baseDir, 'out', 'vs', 'workbench', 'workbench.html'), path.join(baseDir, 'resources', 'app', 'out', 'vs', 'code', 'electron-sandbox', 'workbench', 'workbench.html'), path.join(baseDir, 'resources', 'app', 'out', 'vs', 'code', 'electron-browser', 'workbench', 'workbench.html'));
        }
        const possibleCssPaths = [];
        for (const baseDir of baseDirs) {
            possibleCssPaths.push(path.join(baseDir, 'out', 'vs', 'workbench', 'workbench.desktop.main.css'), path.join(baseDir, 'resources', 'app', 'out', 'vs', 'workbench', 'workbench.desktop.main.css'));
        }
        // 获取 background-videos 文件夹路径
        const videosFolder = workbenchHtmlPath ? path.join(path.dirname(workbenchHtmlPath), 'background-videos') : 'N/A';
        const videosFolderExists = videosFolder !== 'N/A' && fs.existsSync(videosFolder);
        let diagnosticInfo = `VSCode Background - Diagnostics\n`;
        diagnosticInfo += `${'='.repeat(50)}\n\n`;
        diagnosticInfo += `VSCode Version: ${vscode.version}\n`;
        diagnosticInfo += `App Root: ${appRoot}\n`;
        diagnosticInfo += `Running as Admin: ${process.platform === 'win32' ? 'Check manually' : 'N/A'}\n\n`;
        // 显示 background-videos 文件夹路径
        diagnosticInfo += `Background Videos Folder:\n`;
        diagnosticInfo += `  ${videosFolderExists ? '✓' : '✗'} ${videosFolder}\n`;
        if (videosFolderExists) {
            try {
                const files = fs.readdirSync(videosFolder);
                const videoFiles = files.filter(f => /\.(mp4|webm|ogg)$/i.test(f));
                diagnosticInfo += `  Video files found: ${videoFiles.length}\n`;
                videoFiles.forEach((file, i) => {
                    diagnosticInfo += `    ${i + 1}. ${file}\n`;
                });
            }
            catch (e) {
                diagnosticInfo += `  Error reading folder: ${e.message}\n`;
            }
        }
        diagnosticInfo += `\n`;
        diagnosticInfo += `Base Directories Searched:\n`;
        for (const dir of baseDirs) {
            const exists = fs.existsSync(dir);
            diagnosticInfo += `  ${exists ? '✓' : '✗'} ${dir}\n`;
        }
        diagnosticInfo += `\nCurrent Found Paths:\n`;
        diagnosticInfo += `  HTML: ${workbenchHtmlPath || 'NOT FOUND'}\n`;
        diagnosticInfo += `  CSS:  ${workbenchCssPath || 'NOT FOUND'}\n`;
        // Test write permission - test actual file write, not just directory creation
        diagnosticInfo += `\nWrite Permission Test:\n`;
        // Test HTML file write
        if (workbenchHtmlPath && fs.existsSync(workbenchHtmlPath)) {
            diagnosticInfo += `\n  HTML File: ${workbenchHtmlPath}\n`;
            try {
                // Read original content
                const originalContent = fs.readFileSync(workbenchHtmlPath, 'utf-8');
                // Try to write it back (no changes)
                fs.writeFileSync(workbenchHtmlPath, originalContent, 'utf-8');
                diagnosticInfo += `  HTML Write: ✓ OK\n`;
            }
            catch (e) {
                diagnosticInfo += `  HTML Write: ✗ FAILED\n`;
                diagnosticInfo += `  Error Code: ${e.code}\n`;
                diagnosticInfo += `  Error: ${e.message}\n`;
            }
        }
        else {
            diagnosticInfo += `  HTML File: NOT FOUND\n`;
        }
        // Test CSS file write
        if (workbenchCssPath && fs.existsSync(workbenchCssPath)) {
            diagnosticInfo += `\n  CSS File: ${workbenchCssPath}\n`;
            try {
                // Read original content
                const originalContent = fs.readFileSync(workbenchCssPath, 'utf-8');
                // Try to write it back (no changes)
                fs.writeFileSync(workbenchCssPath, originalContent, 'utf-8');
                diagnosticInfo += `  CSS Write: ✓ OK\n`;
            }
            catch (e) {
                diagnosticInfo += `  CSS Write: ✗ FAILED\n`;
                diagnosticInfo += `  Error Code: ${e.code}\n`;
                diagnosticInfo += `  Error: ${e.message}\n`;
            }
        }
        else {
            diagnosticInfo += `  CSS File: NOT FOUND\n`;
        }
        // Test directory creation
        if (workbenchHtmlPath) {
            const testDir = path.join(path.dirname(workbenchHtmlPath), 'background-videos-test');
            diagnosticInfo += `\n  Directory Test: ${testDir}\n`;
            try {
                fs.mkdirSync(testDir, { recursive: true });
                fs.rmdirSync(testDir);
                diagnosticInfo += `  Directory Create: ✓ OK\n`;
            }
            catch (e) {
                diagnosticInfo += `  Directory Create: ✗ FAILED (${e.code})\n`;
                diagnosticInfo += `  Error: ${e.message}\n`;
            }
        }
        diagnosticInfo += `\n  Note: If write tests fail, please:\n`;
        diagnosticInfo += `  1. Close all VSCode windows\n`;
        diagnosticInfo += `  2. Right-click VSCode and select "Run as Administrator"\n`;
        diagnosticInfo += `  3. Or modify file permissions manually\n`;
        diagnosticInfo += `\nChecked HTML Paths:\n`;
        for (const p of possibleHtmlPaths) {
            const exists = fs.existsSync(p);
            diagnosticInfo += `${exists ? '✓' : '✗'} ${p}\n`;
        }
        diagnosticInfo += `\nChecked CSS Paths:\n`;
        for (const p of possibleCssPaths) {
            const exists = fs.existsSync(p);
            diagnosticInfo += `${exists ? '✓' : '✗'} ${p}\n`;
        }
        // Create output channel to show diagnostics
        const outputChannel = vscode.window.createOutputChannel('VSCode Background Diagnostics');
        outputChannel.clear();
        outputChannel.appendLine(diagnosticInfo);
        outputChannel.show();
        // 弹窗提示 background-videos 文件夹路径
        if (videosFolderExists) {
            const action = await vscode.window.showInformationMessage(`Background Videos Folder:\n${videosFolder}`, 'Copy Path', 'Open Folder', 'OK');
            if (action === 'Copy Path') {
                vscode.env.clipboard.writeText(videosFolder);
                vscode.window.showInformationMessage('Path copied to clipboard!');
            }
            else if (action === 'Open Folder') {
                if (process.platform === 'win32') {
                    (0, child_process_1.exec)(`explorer "${videosFolder}"`);
                }
                else if (process.platform === 'darwin') {
                    (0, child_process_1.exec)(`open "${videosFolder}"`);
                }
                else {
                    (0, child_process_1.exec)(`xdg-open "${videosFolder}"`);
                }
            }
        }
        else {
            vscode.window.showWarningMessage(`Background videos folder not found. Please enable background first.`, 'View Details').then(action => {
                if (action === 'View Details') {
                    outputChannel.show();
                }
            });
        }
    });
    // 添加视频命令 - Windows 上使用原生文件对话框
    const addVideos = vscode.commands.registerCommand('vscode-background.addVideos', async () => {
        try {
            if (process.platform === 'win32') {
                // 使用 PowerShell 调用 Windows 原生文件选择对话框
                const psScript = `
				Add-Type -AssemblyName System.Windows.Forms
				$dialog = New-Object System.Windows.Forms.OpenFileDialog
				$dialog.Filter = 'Video Files (*.mp4;*.webm;*.ogg)|*.mp4;*.webm;*.ogg|All Files (*.*)|*.*'
				$dialog.Multiselect = $true
				$dialog.Title = 'Select Video Files for Background'
				if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
					$dialog.FileNames -join '|'
				}
				`.trim();
                (0, child_process_1.exec)(`powershell -Command "${psScript.replace(/"/g, '\\"').replace(/\n/g, '; ')}"`, async (error, stdout, stderr) => {
                    if (error) {
                        console.error('PowerShell error:', error);
                        // 回退到 VSCode 对话框
                        await fallbackAddVideos();
                        return;
                    }
                    const selectedFiles = stdout.trim();
                    if (selectedFiles) {
                        const newFiles = selectedFiles.split('|').filter(f => f.length > 0);
                        if (newFiles.length > 0) {
                            try {
                                // 复制文件到 background-videos 文件夹
                                const copiedFilePaths = await copyVideosToBackgroundFolder(newFiles);
                                // 更新配置：获取当前配置，添加复制后的文件路径
                                const currentFiles = getVideoFiles();
                                const allFiles = [...currentFiles, ...copiedFilePaths];
                                await setVideoFiles(allFiles);
                                // 显示成功消息
                                const fileNames = newFiles.map(f => path.basename(f)).join(', ');
                                const action = await vscode.window.showInformationMessage(`Added ${newFiles.length} video(s) to background folder: ${fileNames}\n\nApply settings now?`, 'Apply', 'Later');
                                if (action === 'Apply') {
                                    await vscode.commands.executeCommand('vscode-background.applySettings');
                                }
                            }
                            catch (error) {
                                vscode.window.showErrorMessage(`Failed to copy videos: ${error}`);
                            }
                        }
                    }
                });
            }
            else {
                // 非 Windows 系统使用 VSCode 对话框
                await fallbackAddVideos();
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to add videos: ${error}`);
        }
    });
    // 回退方法：使用 VSCode 文件对话框
    async function fallbackAddVideos() {
        const options = {
            canSelectMany: true,
            openLabel: 'Add Video Files',
            filters: {
                'Video Files': ['mp4', 'webm', 'ogg'],
                'All Files': ['*']
            }
        };
        const fileUris = await vscode.window.showOpenDialog(options);
        if (fileUris && fileUris.length > 0) {
            try {
                const newFiles = fileUris.map(uri => uri.fsPath);
                // 复制文件到 background-videos 文件夹
                const copiedFilePaths = await copyVideosToBackgroundFolder(newFiles);
                // 更新配置：获取当前配置，添加复制后的文件路径
                const currentFiles = getVideoFiles();
                const allFiles = [...currentFiles, ...copiedFilePaths];
                await setVideoFiles(allFiles);
                // 显示成功消息
                const fileNames = newFiles.map(f => path.basename(f)).join(', ');
                const action = await vscode.window.showInformationMessage(`Added ${newFiles.length} video(s) to background folder: ${fileNames}\n\nApply settings now?`, 'Apply', 'Later');
                if (action === 'Apply') {
                    await vscode.commands.executeCommand('vscode-background.applySettings');
                }
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to copy videos: ${error}`);
            }
        }
    }
    // 删除视频命令
    const removeVideo = vscode.commands.registerCommand('vscode-background.removeVideo', async () => {
        try {
            const config = vscode.workspace.getConfiguration('vscodeBackground');
            const currentFiles = getVideoFiles();
            if (currentFiles.length === 0) {
                vscode.window.showInformationMessage('No videos in the list.');
                return;
            }
            // 显示带有原始文件名的选择列表
            const items = currentFiles.map((filePath, index) => ({
                label: `${index + 1}. ${path.basename(filePath)}`,
                description: filePath,
                filePath: filePath
            }));
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a video to remove',
                canPickMany: true
            });
            if (selected && selected.length > 0) {
                const filesToRemove = selected.map(item => item.filePath);
                const newFiles = currentFiles.filter(f => !filesToRemove.includes(f));
                await setVideoFiles(newFiles);
                const removedNames = selected.map(s => path.basename(s.filePath)).join(', ');
                vscode.window.showInformationMessage(`Removed ${selected.length} video(s): ${removedNames}`);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to remove video: ${error}`);
        }
    });
    // 管理视频命令（显示当前列表并提供操作选项）
    const manageVideos = vscode.commands.registerCommand('vscode-background.manageVideos', async () => {
        const config = vscode.workspace.getConfiguration('vscodeBackground');
        // 读取 background-videos 文件夹内的实际文件
        let actualVideoFiles = [];
        if (workbenchHtmlPath) {
            const videosFolder = path.join(path.dirname(workbenchHtmlPath), 'background-videos');
            if (fs.existsSync(videosFolder)) {
                try {
                    const files = fs.readdirSync(videosFolder);
                    // 只获取视频文件，并按 bg1, bg2... 排序
                    const videoFiles = files.filter(f => /\.(mp4|webm|ogg)$/i.test(f));
                    videoFiles.sort((a, b) => {
                        const aMatch = a.match(/bg(\d+)/);
                        const bMatch = b.match(/bg(\d+)/);
                        if (aMatch && bMatch) {
                            return parseInt(aMatch[1]) - parseInt(bMatch[1]);
                        }
                        return a.localeCompare(b);
                    });
                    actualVideoFiles = videoFiles.map(f => path.join(videosFolder, f));
                }
                catch (e) {
                    console.error('Failed to read videos folder:', e);
                }
            }
        }
        if (actualVideoFiles.length === 0) {
            const action = await vscode.window.showInformationMessage('No videos found in background-videos folder. Would you like to add some?', 'Add Videos', 'Cancel');
            if (action === 'Add Videos') {
                vscode.commands.executeCommand('vscode-background.addVideos');
            }
            return;
        }
        // 显示当前视频列表
        let message = 'Current video playlist (from background-videos folder):\n\n';
        actualVideoFiles.forEach((filePath, index) => {
            message += `${index + 1}. ${path.basename(filePath)}\n`;
        });
        const action = await vscode.window.showInformationMessage(`${actualVideoFiles.length} video(s) in background-videos folder`, 'Add Videos', 'Remove Videos', 'View List');
        if (action === 'Add Videos') {
            vscode.commands.executeCommand('vscode-background.addVideos');
        }
        else if (action === 'Remove Videos') {
            vscode.commands.executeCommand('vscode-background.removeVideo');
        }
        else if (action === 'View List') {
            // 在输出面板显示完整列表
            const outputChannel = vscode.window.createOutputChannel('VSCode Background - Video List');
            outputChannel.clear();
            outputChannel.appendLine('=== Video Background Playlist ===\n');
            outputChannel.appendLine('Videos in background-videos folder (play order):\n');
            if (workbenchHtmlPath) {
                const videosFolder = path.join(path.dirname(workbenchHtmlPath), 'background-videos');
                outputChannel.appendLine(`Folder: ${videosFolder}\n`);
            }
            actualVideoFiles.forEach((filePath, index) => {
                const stats = fs.statSync(filePath);
                const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
                outputChannel.appendLine(`${index + 1}. ${path.basename(filePath)} (${sizeMB} MB)`);
                outputChannel.appendLine(`   Path: ${filePath}\n`);
            });
            outputChannel.appendLine(`\nNote: Files are named as bg1.mp4, bg2.mp4, etc.`);
            outputChannel.appendLine(`You can manually add videos to this folder following the naming convention.`);
            outputChannel.show();
        }
    });
    // 修复校验和命令 - 消除"Code 安装似乎损坏"警告
    const fixChecksums = vscode.commands.registerCommand('vscode-background.fixChecksums', async () => {
        try {
            const appRoot = vscode.env.appRoot;
            const productJsonPath = path.join(appRoot, 'product.json');
            if (!fs.existsSync(productJsonPath)) {
                vscode.window.showErrorMessage('Cannot find product.json file.');
                return;
            }
            // 读取 product.json
            const productJson = JSON.parse(fs.readFileSync(productJsonPath, 'utf8'));
            // 计算被修改文件的新校验和
            const filesToCheck = [
                { relative: 'out/vs/code/electron-browser/workbench/workbench.html', path: workbenchHtmlPath },
                { relative: 'out/vs/workbench/workbench.desktop.main.css', path: workbenchCssPath }
            ];
            if (!productJson.checksums) {
                productJson.checksums = {};
            }
            for (const file of filesToCheck) {
                if (file.path && fs.existsSync(file.path)) {
                    const content = fs.readFileSync(file.path, 'utf8');
                    const hash = crypto.createHash('md5').update(content).digest('base64').replace(/=+$/, '');
                    productJson.checksums[file.relative] = hash;
                    console.log(`Updated checksum for ${file.relative}: ${hash}`);
                }
            }
            // 写回 product.json
            fs.writeFileSync(productJsonPath, JSON.stringify(productJson, null, '\t'), 'utf8');
            const action = await vscode.window.showInformationMessage('Checksums fixed! Please restart VSCode to remove the "Installation Corrupt" warning.', 'Restart Now');
            if (action === 'Restart Now') {
                vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to fix checksums: ${error}`);
        }
    });
    // 设置无限循环命令
    const setInfiniteLoop = vscode.commands.registerCommand('vscode-background.setInfiniteLoop', async () => {
        const config = vscode.workspace.getConfiguration('vscodeBackground');
        const current = getSwitchInterval();
        if (current === 0) {
            // 当前是无限循环，询问是否恢复
            const action = await vscode.window.showInformationMessage('Currently in infinite loop mode. Set a switch interval?', '30 seconds', '1 minute', '5 minutes', 'Keep Infinite');
            let newInterval = 0;
            if (action === '30 seconds')
                newInterval = 30000;
            else if (action === '1 minute')
                newInterval = 60000;
            else if (action === '5 minutes')
                newInterval = 300000;
            if (newInterval > 0) {
                await updateSwitchInterval(newInterval);
                vscode.window.showInformationMessage(`Switch interval set to ${newInterval / 1000} seconds.`);
            }
        }
        else {
            // 当前不是无限循环，设置为无限循环
            await updateSwitchInterval(0);
            vscode.window.showInformationMessage('Infinite loop enabled! Video will loop forever without switching.');
        }
    });
    // 设置不透明度命令
    const setOpacity = vscode.commands.registerCommand('vscode-background.setOpacity', async () => {
        const config = vscode.workspace.getConfiguration('vscodeBackground');
        const current = getOpacity();
        const input = await vscode.window.showInputBox({
            prompt: 'Set background opacity (0 - 1)',
            value: String(current),
            validateInput: (value) => {
                const num = Number(value);
                if (Number.isNaN(num))
                    return 'Please enter a number.';
                if (num < 0 || num > 1)
                    return 'Opacity must be between 0 and 1.';
                return null;
            }
        });
        if (!input)
            return;
        const opacity = Number(input);
        await updateOpacity(opacity);
        const action = await vscode.window.showInformationMessage(`Opacity set to ${opacity}. Apply settings now?`, 'Apply', 'Later');
        if (action === 'Apply') {
            vscode.commands.executeCommand('vscode-background.applySettings');
        }
    });
    // 设置切换间隔命令
    const setSwitchInterval = vscode.commands.registerCommand('vscode-background.setSwitchInterval', async () => {
        const config = vscode.workspace.getConfiguration('vscodeBackground');
        const current = getSwitchInterval();
        const input = await vscode.window.showInputBox({
            prompt: 'Set switch interval in ms (0 = infinite loop, min 10000)',
            value: String(current),
            validateInput: (value) => {
                const num = Number(value);
                if (!Number.isFinite(num))
                    return 'Please enter a valid number.';
                if (num !== 0 && num < 10000)
                    return 'Minimum is 10000 ms (10 seconds).';
                if (num < 0)
                    return 'Interval cannot be negative.';
                return null;
            }
        });
        if (!input)
            return;
        const interval = Number(input);
        await updateSwitchInterval(interval);
        const action = await vscode.window.showInformationMessage(`Switch interval set to ${interval} ms. Apply settings now?`, 'Apply', 'Later');
        if (action === 'Apply') {
            vscode.commands.executeCommand('vscode-background.applySettings');
        }
    });
    // 显示 background-videos 文件夹路径
    const showVideosFolder = vscode.commands.registerCommand('vscode-background.showVideosFolder', async () => {
        if (!workbenchHtmlPath) {
            vscode.window.showErrorMessage('Cannot locate VSCode workbench files.');
            return;
        }
        const videosDir = path.join(path.dirname(workbenchHtmlPath), 'background-videos');
        vscode.window.showInformationMessage(`Videos folder: ${videosDir}\nManual files must be named bg1.mp4, bg2.mp4, ... in order.`);
    });
    // 设置主题命令
    const setTheme = vscode.commands.registerCommand('vscode-background.setTheme', async () => {
        const currentTheme = getTheme();
        const items = Object.values(THEMES).map(theme => ({
            label: theme.label,
            description: theme.description,
            themeName: theme.name,
            picked: theme.name === currentTheme
        }));
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a theme for your video background'
        });
        if (!selected)
            return;
        await setThemeConfig(selected.themeName);
        const action = await vscode.window.showInformationMessage(`Theme changed to ${selected.label}. Apply settings now?`, 'Apply', 'Later');
        if (action === 'Apply') {
            vscode.commands.executeCommand('vscode-background.applySettings');
        }
    });
    // 应用设置命令 - 自动生成并运行脚本
    const applySettings = vscode.commands.registerCommand('vscode-background.applySettings', async () => {
        const config = vscode.workspace.getConfiguration('vscodeBackground');
        const videoFiles = getVideoFiles();
        const enabled = config.get('enabled', true);
        if (enabled && videoFiles.length === 0) {
            // 即使没有视频也继续，CSS 会被注入为后续视频做准备
            vscode.window.showInformationMessage('No video files currently. CSS theme will be applied. Add videos to see them play.');
        }
        vscode.window.showInformationMessage('Applying settings... Please accept the Administrator prompt.');
        const success = await runApplyScript();
        if (success) {
            // 更新状态
            const status = await checkCurrentStatus();
            await config.update('currentStatus', status, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage('Settings applied! Restart VSCode to see changes.', 'Restart Now').then(action => {
                if (action === 'Restart Now') {
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
            });
        }
    });
    // 刷新状态命令 - 从文件中读取真实数据并同步到配置
    const refreshStatus = vscode.commands.registerCommand('vscode-background.refreshStatus', async () => {
        try {
            const status = await checkCurrentStatus(true); // 传入 true 参数以同步文件数据到配置
            const config = vscode.workspace.getConfiguration('vscodeBackground');
            await config.update('currentStatus', status, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage('✅ Status refreshed and synced from file:\n' + status);
        }
        catch (error) {
            vscode.window.showErrorMessage('Failed to refresh status: ' + error);
        }
    });
    // 清理命令 - 卸载插件前运行
    const cleanup = vscode.commands.registerCommand('vscode-background.cleanup', async () => {
        const action = await vscode.window.showWarningMessage('This will remove all injected code and video files. Run this BEFORE uninstalling the extension. Continue?', 'Yes, Cleanup', 'Cancel');
        if (action !== 'Yes, Cleanup')
            return;
        try {
            vscode.window.showInformationMessage('Cleanup in progress... Please wait.');
            await restoreOriginalWorkbench();
            // 清理配置
            const config = vscode.workspace.getConfiguration('vscodeBackground');
            await config.update('enabled', false, vscode.ConfigurationTarget.Global);
            await setVideoFiles([]);
            vscode.window.showInformationMessage('✅ Cleanup complete! You can now safely uninstall the extension. Please restart VSCode.', 'Restart Now').then(action => {
                if (action === 'Restart Now') {
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
            });
        }
        catch (error) {
            const errorCode = error?.code || error?.message?.includes('EBUSY') ? 'EBUSY' : 'UNKNOWN';
            const errorMessage = error?.message || String(error);
            if (errorCode === 'EBUSY' || errorMessage.includes('EBUSY') || errorMessage.includes('busy')) {
                const action = await vscode.window.showErrorMessage('❌ Cleanup failed: Resource busy (files are still in use).\n\n' +
                    'Solutions:\n' +
                    '1. Close all VSCode windows completely\n' +
                    '2. Kill all VSCode processes in Task Manager\n' +
                    '3. Wait a few seconds and try again\n' +
                    '4. Run VSCode as Administrator\n\n' +
                    'After killing processes, the cleanup may succeed automatically on next run.', 'Close VSCode', 'Manual Cleanup', 'Retry', 'Cancel');
                if (action === 'Close VSCode') {
                    vscode.commands.executeCommand('workbench.action.quit');
                }
                else if (action === 'Manual Cleanup') {
                    const videosDir = workbenchHtmlPath ? path.join(path.dirname(workbenchHtmlPath), 'background-videos') : 'N/A';
                    vscode.window.showInformationMessage(`Manual cleanup needed. Delete this folder manually:\n${videosDir}\n\n` +
                        `Then run cleanup command again.`, 'Copy Path').then(btnAction => {
                        if (btnAction === 'Copy Path') {
                            vscode.env.clipboard.writeText(videosDir);
                            vscode.window.showInformationMessage('Path copied to clipboard!');
                        }
                    });
                }
                else if (action === 'Retry') {
                    // Retry immediately
                    vscode.commands.executeCommand('vscode-background.cleanup');
                }
            }
            else {
                const action = await vscode.window.showErrorMessage(`❌ Cleanup failed: ${errorMessage}\n\n` +
                    'Try running VSCode as Administrator.', 'Show Details', 'Cancel');
                if (action === 'Show Details') {
                    const outputChannel = vscode.window.createOutputChannel('VSCode Background Cleanup Error');
                    outputChannel.clear();
                    outputChannel.appendLine('Cleanup Error Details:');
                    outputChannel.appendLine(`Error Code: ${errorCode}`);
                    outputChannel.appendLine(`Error Message: ${errorMessage}`);
                    outputChannel.appendLine(`\nWorkbench HTML Path: ${workbenchHtmlPath}`);
                    outputChannel.appendLine(`Workbench CSS Path: ${workbenchCssPath}`);
                    outputChannel.show();
                }
            }
        }
    });
    // 启动时检查是否已启用背景并更新状态
    const config = vscode.workspace.getConfiguration('vscodeBackground');
    isBackgroundEnabled = config.get('enabled', false);
    // 初始化状态
    checkCurrentStatus().then(status => {
        config.update('currentStatus', status, vscode.ConfigurationTarget.Global);
    });
    context.subscriptions.push(enableBackground, disableBackground, configureBackground, diagnostics, addVideos, removeVideo, manageVideos, fixChecksums, setInfiniteLoop, setOpacity, setSwitchInterval, showVideosFolder, setTheme, applySettings, refreshStatus, cleanup);
}
async function selectVideoFiles() {
    // Windows 系统使用原生文件选择对话框（高清晰度）
    if (process.platform === 'win32') {
        return new Promise((resolve) => {
            const psScript = `
			Add-Type -AssemblyName System.Windows.Forms
			$dialog = New-Object System.Windows.Forms.OpenFileDialog
			$dialog.Filter = 'Video Files (*.mp4;*.webm;*.ogg)|*.mp4;*.webm;*.ogg|All Files (*.*)|*.*'
			$dialog.Multiselect = $true
			$dialog.Title = 'Select Video Files for Background'
			if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
				$dialog.FileNames -join '|'
			}
			`.trim();
            (0, child_process_1.exec)(`powershell -Command "${psScript.replace(/"/g, '\\"').replace(/\n/g, '; ')}"`, (error, stdout, stderr) => {
                if (error) {
                    console.error('PowerShell error:', error);
                    // 回退到 VSCode 对话框
                    fallbackSelectVideoFiles().then(resolve);
                    return;
                }
                const selectedFiles = stdout.trim();
                if (selectedFiles) {
                    const files = selectedFiles.split('|').filter(f => f.length > 0);
                    resolve(files.length > 0 ? files : undefined);
                }
                else {
                    resolve(undefined);
                }
            });
        });
    }
    else {
        // 非 Windows 系统使用 VSCode 对话框
        return fallbackSelectVideoFiles();
    }
}
// 回退方法：使用 VSCode 文件对话框
async function fallbackSelectVideoFiles() {
    const options = {
        canSelectMany: true,
        openLabel: 'Select Video Files',
        filters: {
            'Video Files': ['mp4', 'webm', 'ogg'],
            'All Files': ['*']
        }
    };
    const fileUris = await vscode.window.showOpenDialog(options);
    if (fileUris && fileUris.length > 0) {
        return fileUris.map(uri => uri.fsPath);
    }
    return undefined;
}
async function applyVideoBackground(videoFiles) {
    console.log('=== applyVideoBackground START ===');
    console.log('Video files:', videoFiles);
    console.log('Workbench HTML path:', workbenchHtmlPath);
    console.log('Workbench CSS path:', workbenchCssPath);
    if (!workbenchHtmlPath || !fs.existsSync(workbenchHtmlPath)) {
        const appRoot = vscode.env.appRoot;
        const errorMsg = `Workbench HTML file not found.\n\nVSCode Root: ${appRoot}\n\nPlease report this issue with your VSCode version.`;
        // Show detailed error with option to see diagnostic info
        const action = await vscode.window.showErrorMessage('Cannot locate workbench.html file', 'Show Details', 'Cancel');
        if (action === 'Show Details') {
            vscode.window.showInformationMessage(errorMsg, { modal: true });
        }
        throw new Error('Workbench HTML file not found');
    }
    const config = vscode.workspace.getConfiguration('vscodeBackground');
    const switchInterval = getSwitchInterval();
    const opacity = getOpacity();
    console.log('Config - switchInterval:', switchInterval, 'opacity:', opacity);
    // Copy videos to a local directory
    const videoDirPath = path.join(path.dirname(workbenchHtmlPath), 'background-videos');
    console.log('Video directory path:', videoDirPath);
    try {
        if (!fs.existsSync(videoDirPath)) {
            fs.mkdirSync(videoDirPath, { recursive: true });
            console.log('Created video directory');
        }
    }
    catch (error) {
        if (error.code === 'EPERM' || error.code === 'EACCES') {
            const action = await vscode.window.showErrorMessage('Permission denied. Please run VSCode as Administrator to modify system files.', 'Show Path', 'OK');
            if (action === 'Show Path') {
                vscode.window.showInformationMessage(`Cannot write to: ${videoDirPath}`, { modal: true });
            }
            throw new Error('Permission denied - run VSCode as Administrator');
        }
        throw error;
    }
    // Copy and rename videos to bg1.mp4, bg2.mp4, etc.
    try {
        for (let i = 0; i < videoFiles.length; i++) {
            const sourcePath = videoFiles[i];
            const ext = path.extname(sourcePath);
            const destPath = path.join(videoDirPath, `bg${i + 1}${ext}`);
            fs.copyFileSync(sourcePath, destPath);
            console.log(`Copied video ${i + 1}: ${sourcePath} -> ${destPath}`);
        }
    }
    catch (error) {
        if (error.code === 'EPERM' || error.code === 'EACCES') {
            const action = await vscode.window.showErrorMessage('Permission denied when copying video files. Please run VSCode as Administrator.', 'OK');
            throw new Error('Permission denied - run VSCode as Administrator');
        }
        throw error;
    }
    // Read fresh HTML (not cached version)
    let workbenchHtml = fs.readFileSync(workbenchHtmlPath, 'utf-8');
    console.log('Original HTML length:', workbenchHtml.length);
    // Remove any existing video background injection
    const bgMarkerStart = '<!-- VSCODE-BACKGROUND-START -->';
    const bgMarkerEnd = '<!-- VSCODE-BACKGROUND-END -->';
    if (workbenchHtml.includes(bgMarkerStart)) {
        console.log('Removing existing background injection...');
        const regex = new RegExp(`${bgMarkerStart}[\\s\\S]*?${bgMarkerEnd}`, 'g');
        workbenchHtml = workbenchHtml.replace(regex, '');
        console.log('Removed existing injection, new length:', workbenchHtml.length);
    }
    // Remove orphaned brackets from previous bad injections
    workbenchHtml = workbenchHtml.replace(/^\s*\[\]\s*$/gm, '');
    workbenchHtml = workbenchHtml.replace(/^\s*\[\s*$/gm, '');
    workbenchHtml = workbenchHtml.replace(/^\s*\]\s*$/gm, '');
    console.log('Cleaned orphaned brackets');
    const videoScript = generateVideoScript(switchInterval, opacity);
    console.log('Generated video script length:', videoScript.length);
    // Modify CSP to allow inline scripts (required for video background script)
    // Need to check specifically if script-src has 'unsafe-inline', not just anywhere in the file
    // (style-src may already have it)
    const scriptSrcMatch = workbenchHtml.match(/script-src[\s\S]*?;/);
    const scriptSrcHasUnsafeInline = scriptSrcMatch && scriptSrcMatch[0].includes("'unsafe-inline'");
    if (workbenchHtml.includes("script-src") && !scriptSrcHasUnsafeInline) {
        // Match script-src followed by 'self' and 'unsafe-eval'
        const cspRegex = /(script-src[\s\S]*?'self'[\s]*?)(\n[\s]*'unsafe-eval')/;
        if (cspRegex.test(workbenchHtml)) {
            workbenchHtml = workbenchHtml.replace(cspRegex, "$1\n\t\t\t\t\t'unsafe-inline'$2");
            console.log('Added unsafe-inline to CSP script-src (before unsafe-eval)');
        }
        else {
            // Fallback: insert after 'self' in script-src
            workbenchHtml = workbenchHtml.replace(/(script-src[\s\S]*?'self')/, "$1\n\t\t\t\t\t'unsafe-inline'");
            console.log('Added unsafe-inline to CSP script-src (fallback)');
        }
    }
    else if (scriptSrcHasUnsafeInline) {
        console.log('script-src already has unsafe-inline, skipping CSP modification');
    }
    console.log('Looking for <body tag in HTML...');
    console.log('HTML contains <body:', workbenchHtml.includes('<body'));
    console.log('First 500 chars of body area:', workbenchHtml.substring(workbenchHtml.indexOf('<body'), workbenchHtml.indexOf('<body') + 500));
    if (workbenchHtml.includes('<body')) {
        const before = workbenchHtml.length;
        const originalHtml = workbenchHtml;
        workbenchHtml = workbenchHtml.replace(/<body([^>]*)>/, `<body$1>\n${bgMarkerStart}\n${videoScript}\n${bgMarkerEnd}`);
        console.log('HTML modified, length change:', workbenchHtml.length - before);
        console.log('Replacement happened:', workbenchHtml !== originalHtml);
        console.log('Marker now in HTML:', workbenchHtml.includes(bgMarkerStart));
    }
    else {
        console.error('ERROR: No <body tag found in HTML!');
    }
    try {
        console.log('Attempting to write to:', workbenchHtmlPath);
        console.log('Content length to write:', workbenchHtml.length);
        console.log('Content includes marker before write:', workbenchHtml.includes(bgMarkerStart));
        fs.writeFileSync(workbenchHtmlPath, workbenchHtml, 'utf-8');
        console.log('Wrote modified HTML to:', workbenchHtmlPath);
        // Verify the write was successful by reading back
        const verifyContent = fs.readFileSync(workbenchHtmlPath, 'utf-8');
        console.log('Verify content length:', verifyContent.length);
        console.log('Verify includes marker:', verifyContent.includes(bgMarkerStart));
        if (verifyContent.includes(bgMarkerStart)) {
            console.log('✓ HTML injection verified successfully');
            vscode.window.showInformationMessage('✓ HTML 注入验证成功！');
        }
        else {
            console.error('✗ HTML injection verification FAILED - marker not found after write!');
            console.error('Expected marker:', bgMarkerStart);
            console.error('File content preview (first 1000 chars):', verifyContent.substring(0, 1000));
            vscode.window.showErrorMessage('文件写入验证失败！内容可能被系统保护。\n' +
                '请尝试手动修改文件权限或使用管理员模式。');
        }
    }
    catch (error) {
        console.error('Failed to write HTML:', error);
        if (error.code === 'EPERM' || error.code === 'EACCES' || error.code === 'EBUSY') {
            const action = await vscode.window.showErrorMessage(`无法写入 workbench.html (${error.code})。\n\n` +
                '可能的解决方案:\n' +
                '1. 以管理员身份运行 VSCode\n' +
                '2. 关闭所有 VSCode 窗口后重试\n' +
                '3. 检查文件是否被其他程序占用', '查看路径', '确定');
            if (action === '查看路径') {
                vscode.window.showInformationMessage(workbenchHtmlPath, { modal: true });
            }
            throw new Error(`Permission denied (${error.code}) - ${error.message}`);
        }
        throw error;
    }
    // Modify CSS to make workbench transparent
    if (workbenchCssPath && fs.existsSync(workbenchCssPath)) {
        // Always read fresh CSS from disk
        let workbenchCss = fs.readFileSync(workbenchCssPath, 'utf-8');
        console.log('Current CSS length:', workbenchCss.length);
        // Remove all existing CSS injections (old and new formats)
        workbenchCss = workbenchCss.replace(/\/\* VSCODE-BACKGROUND-CSS-START \*\/[\s\S]*?\/\* VSCODE-BACKGROUND-CSS-END \*\/\n?/g, '');
        workbenchCss = workbenchCss.replace(/\/\* VSCode Background Extension - START \*\/[\s\S]*?\/\* VSCode Background Extension - END \*\/\n?/g, '');
        workbenchCss = workbenchCss.replace(/\/\* VSCode Background Extension \*\/[\s\S]*?\.monaco-workbench[^}]*\}[^/]*\.monaco-workbench > \.part[^}]*\}\n?/g, '');
        // Also remove simple opacity rule if exists
        workbenchCss = workbenchCss.replace(/\.monaco-workbench\s*\{[^}]*opacity[^}]*\}\n?/g, '');
        // Always add CSS rules when any videos are configured or when explicitly enabled
        const cssRules = generateCssRules(opacity);
        const cssInjection = `
/* VSCODE-BACKGROUND-CSS-START */
${cssRules}
/* VSCODE-BACKGROUND-CSS-END */
`;
        workbenchCss += cssInjection;
        try {
            fs.writeFileSync(workbenchCssPath, workbenchCss, 'utf-8');
            console.log(`Applied CSS rules to ${workbenchCssPath}`);
            console.log('CSS injection content:', cssInjection.substring(0, 200));
        }
        catch (error) {
            console.error('Failed to write CSS:', error);
            if (error.code === 'EPERM' || error.code === 'EACCES' || error.code === 'EBUSY') {
                const action = await vscode.window.showErrorMessage(`无法写入 CSS 文件 (${error.code})。\n\n` +
                    '可能的解决方案:\n' +
                    '1. 以管理员身份运行 VSCode\n' +
                    '2. 关闭所有 VSCode 窗口后重试\n' +
                    '3. 检查文件是否被其他程序占用', '查看路径', '确定');
                if (action === '查看路径') {
                    vscode.window.showInformationMessage(workbenchCssPath, { modal: true });
                }
                throw new Error(`Permission denied (${error.code}) - ${error.message}`);
            }
            throw error;
        }
    }
    else {
        console.warn('Could not locate workbench CSS file, opacity may not work correctly');
    }
    // Save configuration
    await setVideoFiles(videoFiles);
    await config.update('enabled', true, vscode.ConfigurationTarget.Global);
    isBackgroundEnabled = true;
    console.log('=== applyVideoBackground COMPLETE ===');
}
function generateVideoScript(switchInterval, opacity) {
    const effectiveInterval = switchInterval === 0 ? 0 : Math.max(switchInterval, 5000);
    return `
	<video id="bgVideo" muted playsinline
		style="position: fixed; inset: 0; width: 100vw; height: 100vh; object-fit: cover; object-position: center; z-index: -100; opacity: ${opacity};">
	</video>
	<script>
		(function(){
			const bgVideo = document.getElementById('bgVideo') || (() => {
				const v = document.createElement('video');
				v.id = 'bgVideo';
				v.muted = true;
				v.playsinline = true;
				v.style.cssText = 'position: fixed; inset: 0; width: 100vw; height: 100vh; object-fit: cover; object-position: center; z-index: -100; opacity: ${opacity};';
				document.body.appendChild(v);
				return v;
			})();
			let available = [];
			let currentPos = 0;
			const switchInterval = ${effectiveInterval};

			async function findVideos() {
				available = [];
				for (let i = 1; i <= 100; i++) {
					try {
						const response = await fetch('./background-videos/bg' + i + '.mp4', { method: 'HEAD' });
						if (response.ok) {
							available.push(i);
						}
					} catch (e) {
						// ignore
					}
				}
			}

			function playByPos(pos) {
				if (!available || available.length === 0) return;
				const idx = available[pos % available.length];
				const src = './background-videos/bg' + idx + '.mp4';
				bgVideo.setAttribute('loop', 'loop');
				bgVideo.setAttribute('autoplay', 'autoplay');
				bgVideo.src = src;
				bgVideo.load();
				bgVideo.play().catch(e => console.warn('Play failed:', e));
			}

			async function switchVideo() {
				if (!available || available.length <= 1) return;
				currentPos = (currentPos + 1) % available.length;
				playByPos(currentPos);
			}

			async function init() {
				await findVideos();
				if (available.length >= 1) {
					currentPos = 0;
					playByPos(currentPos);
					if (switchInterval > 0 && available.length > 1) {
						setInterval(switchVideo, switchInterval);
					}
				} else {
					console.warn('No background videos available - skipping video init');
				}
			}

			if (document.readyState === 'loading') {
				document.addEventListener('DOMContentLoaded', init);
			} else {
				init();
			}
		})();
	</script>`;
}
function generateCssRules(opacity) {
    const theme = getTheme();
    return generateCssForTheme(theme, opacity);
}
async function restoreOriginalWorkbench() {
    // Read current HTML and remove injection
    if (workbenchHtmlPath && fs.existsSync(workbenchHtmlPath)) {
        let workbenchHtml = fs.readFileSync(workbenchHtmlPath, 'utf-8');
        const bgMarkerStart = '<!-- VSCODE-BACKGROUND-START -->';
        const bgMarkerEnd = '<!-- VSCODE-BACKGROUND-END -->';
        if (workbenchHtml.includes(bgMarkerStart)) {
            console.log('Removing background injection...');
            const regex = new RegExp(`${bgMarkerStart}[\\s\\S]*?${bgMarkerEnd}\\n?`, 'g');
            workbenchHtml = workbenchHtml.replace(regex, '');
            // Remove orphaned brackets
            workbenchHtml = workbenchHtml.replace(/^\s*\[\]\s*$/gm, '');
            workbenchHtml = workbenchHtml.replace(/^\s*\[\s*$/gm, '');
            workbenchHtml = workbenchHtml.replace(/^\s*\]\s*$/gm, '');
            fs.writeFileSync(workbenchHtmlPath, workbenchHtml, 'utf-8');
            console.log('Removed background injection from HTML');
        }
    }
    // Restore CSS by removing our injected rules
    if (workbenchCssPath && fs.existsSync(workbenchCssPath)) {
        let workbenchCss = fs.readFileSync(workbenchCssPath, 'utf-8');
        // Remove all CSS injections with different markers
        workbenchCss = workbenchCss.replace(/\/\* VSCODE-BACKGROUND-CSS-START \*\/[\s\S]*?\/\* VSCODE-BACKGROUND-CSS-END \*\/\n?/g, '');
        workbenchCss = workbenchCss.replace(/\/\* VSCode Background Extension - START \*\/[\s\S]*?\/\* VSCode Background Extension - END \*\/\n?/g, '');
        // Also remove old format if exists
        workbenchCss = workbenchCss.replace(/\/\* VSCode Background Extension \*\/[\s\S]*?\.monaco-workbench[^}]*\}[^/]*\.monaco-workbench > \.part[^}]*\}\n?/g, '');
        // Also remove simple opacity rule if exists
        workbenchCss = workbenchCss.replace(/\.monaco-workbench\s*\{[^}]*opacity[^}]*!important[^}]*\}\n?/g, '');
        fs.writeFileSync(workbenchCssPath, workbenchCss, 'utf-8');
        console.log('Removed CSS rules from workbench CSS');
    }
    // Try simple removal of video directory; if fails, surface error to caller
    if (workbenchHtmlPath) {
        const videoDirPath = path.join(path.dirname(workbenchHtmlPath), 'background-videos');
        if (fs.existsSync(videoDirPath)) {
            try {
                fs.rmSync(videoDirPath, { recursive: true, force: true });
                console.log('Removed video directory');
            }
            catch (e) {
                console.warn('Failed to remove video directory directly:', e.message);
                // Try a shell-based removal as a last attempt
                try {
                    if (process.platform === 'win32') {
                        await new Promise((resolve) => {
                            (0, child_process_1.exec)(`powershell -Command "Remove-Item -LiteralPath '${videoDirPath}' -Recurse -Force"`, (err, stdout, stderr) => {
                                if (err)
                                    console.warn('PowerShell remove failed:', stderr || err.message);
                                resolve();
                            });
                        });
                    }
                    else {
                        await new Promise((resolve) => {
                            (0, child_process_1.exec)(`rm -rf "${videoDirPath}"`, (err, stdout, stderr) => {
                                if (err)
                                    console.warn('rm -rf failed:', stderr || err.message);
                                resolve();
                            });
                        });
                    }
                    if (!fs.existsSync(videoDirPath)) {
                        console.log('Removed video directory via shell fallback');
                        return;
                    }
                }
                catch (shellErr) {
                    console.warn('Shell fallback also failed:', shellErr.message);
                }
                // Still exists - surface EBUSY to caller
                const err = new Error(`EBUSY: resource busy or locked - ${videoDirPath}`);
                err.code = 'EBUSY';
                throw err;
            }
        }
    }
    // Update configuration
    const config = vscode.workspace.getConfiguration('vscodeBackground');
    await config.update('enabled', false, vscode.ConfigurationTarget.Global);
    isBackgroundEnabled = false;
}
function deactivate() {
    // NOTE: We intentionally do NOT clean up on deactivate.
    // The video background should persist across VSCode restarts.
    // Users should use the "Disable Background" command to remove the background.
    // 
    // If we clean up here, the background would be removed every time:
    // - The extension host restarts
    // - VSCode reloads
    // - Debug session ends
    // 
    // This would defeat the purpose of having a persistent background.
    console.log('VSCode Background extension deactivated (background preserved)');
}
//# sourceMappingURL=extension.js.map