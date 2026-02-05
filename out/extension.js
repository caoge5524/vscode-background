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
// 生成应用脚本（内部函数）
async function generateApplyScript() {
    const config = vscode.workspace.getConfiguration('vscodeBackground');
    const videoFiles = config.get('videoFiles', []);
    const switchInterval = config.get('switchInterval', 180000);
    const opacity = config.get('opacity', 0.3);
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
    // 准备视频文件复制命令
    const videoCopyLines = [];
    if (videoFiles.length > 0) {
        videoFiles.forEach((file, index) => {
            const ext = path.extname(file).toLowerCase().replace('.', '') || 'mp4';
            const destFile = 'bg' + (index + 1) + '.' + ext;
            videoCopyLines.push('    Copy-Item -Path "' + file.replace(/\\/g, '\\\\') + '" -Destination "$videosDir\\\\' + destFile + '" -Force');
        });
    }
    // 生成视频脚本和 CSS
    const videoScript = generateVideoScript(switchInterval, opacity);
    const cssRules = generateCssRules(opacity);
    // 转义特殊字符
    const escapedVideoScript = videoScript
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/`/g, '``')
        .replace(/\$/g, '`$');
    const escapedCssRules = cssRules
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"');
    const scriptLines = [
        '# VSCode Background - Auto-Apply Script',
        '# This script is automatically generated and executed',
        '',
        '$ErrorActionPreference = "Stop"',
        '',
        '$htmlPath = "' + workbenchHtmlPath.replace(/\\/g, '\\\\') + '"',
        '$cssPath = "' + workbenchCssPath.replace(/\\/g, '\\\\') + '"',
        '$videosDir = "' + videosDir.replace(/\\/g, '\\\\') + '"',
        '$productJsonPath = "' + productJsonPath.replace(/\\/g, '\\\\') + '"',
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
    if (enabled && videoFiles.length > 0) {
        scriptLines.push('# Copy video files', 'Write-Host "Copying ' + videoFiles.length + ' video file(s)..." -ForegroundColor Yellow', ...videoCopyLines, '', '# Read and modify HTML', 'Write-Host "Modifying workbench.html..." -ForegroundColor Yellow', '$html = Get-Content $htmlPath -Raw -Encoding UTF8', '', '# Remove existing injection', '$html = $html -replace "(?s)<!-- VSCODE-BACKGROUND-START -->.*?<!-- VSCODE-BACKGROUND-END -->", ""', '', '# Add new injection', '$injection = "<!-- VSCODE-BACKGROUND-START -->" + "\\r\\n' + escapedVideoScript + '\\r\\n" + "<!-- VSCODE-BACKGROUND-END -->"', '$html = $html -replace "(</body>)", "$injection`r`n`$1"', '', '[System.IO.File]::WriteAllText($htmlPath, $html, [System.Text.Encoding]::UTF8)', 'Write-Host "HTML updated!" -ForegroundColor Green', '', '# Modify CSS', 'Write-Host "Modifying CSS..." -ForegroundColor Yellow', '$css = Get-Content $cssPath -Raw -Encoding UTF8', '', '# Remove existing CSS', '$css = $css -replace "(?s)/\\* VSCODE-BACKGROUND-CSS-START \\*/.*?/\\* VSCODE-BACKGROUND-CSS-END \\*/", ""', '', '# Add new CSS', '$cssInjection = "/* VSCODE-BACKGROUND-CSS-START */" + "\\r\\n' + escapedCssRules + '\\r\\n" + "/* VSCODE-BACKGROUND-CSS-END */"', '$css = $css + "`r`n" + $cssInjection', '', '[System.IO.File]::WriteAllText($cssPath, $css, [System.Text.Encoding]::UTF8)', 'Write-Host "CSS updated!" -ForegroundColor Green', '');
    }
    else {
        scriptLines.push('# Remove injection (disabled or no videos)', 'Write-Host "Removing background injection..." -ForegroundColor Yellow', '$html = Get-Content $htmlPath -Raw -Encoding UTF8', '$html = $html -replace "(?s)<!-- VSCODE-BACKGROUND-START -->.*?<!-- VSCODE-BACKGROUND-END -->", ""', '[System.IO.File]::WriteAllText($htmlPath, $html, [System.Text.Encoding]::UTF8)', '', '$css = Get-Content $cssPath -Raw -Encoding UTF8', '$css = $css -replace "(?s)/\\* VSCODE-BACKGROUND-CSS-START \\*/.*?/\\* VSCODE-BACKGROUND-CSS-END \\*/", ""', '[System.IO.File]::WriteAllText($cssPath, $css, [System.Text.Encoding]::UTF8)', 'Write-Host "Background removed!" -ForegroundColor Green', '');
    }
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
        const command = `powershell -Command "Start-Process powershell -ArgumentList '-ExecutionPolicy Bypass -File \\"${scriptPath}\\"' -Verb RunAs -Wait"`;
        (0, child_process_1.exec)(command, (error) => {
            if (error) {
                vscode.window.showErrorMessage('Failed to apply settings: ' + error.message + '. Make sure to accept the Administrator prompt.');
                resolve(false);
            }
            else {
                resolve(true);
            }
        });
    });
}
// 检查当前状态
async function checkCurrentStatus() {
    if (!workbenchHtmlPath || !fs.existsSync(workbenchHtmlPath)) {
        return '❌ VSCode workbench files not found';
    }
    try {
        const html = fs.readFileSync(workbenchHtmlPath, 'utf-8');
        const hasInjection = html.includes('<!-- VSCODE-BACKGROUND-START -->');
        if (!hasInjection) {
            return '⚪ Not injected - Background is disabled';
        }
        // 提取视频数量
        const videoMatch = html.match(/const DISCOVERY_MAX = (\d+)/);
        const intervalMatch = html.match(/const switchInterval = (\d+)/);
        const opacityMatch = html.match(/opacity: ([\d.]+)/);
        let status = '✅ Background active';
        if (intervalMatch) {
            const interval = parseInt(intervalMatch[1]);
            if (interval === 0) {
                status += ' | Infinite loop';
            }
            else {
                status += ' | Switch: ' + (interval / 1000) + 's';
            }
        }
        if (opacityMatch) {
            status += ' | Opacity: ' + opacityMatch[1];
        }
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
            const videoFiles = await selectVideoFiles();
            if (videoFiles && videoFiles.length > 0) {
                await applyVideoBackground(videoFiles);
                vscode.window.showInformationMessage('Video background enabled! Please restart VSCode to see changes.', 'Restart').then(selection => {
                    if (selection === 'Restart') {
                        vscode.commands.executeCommand('workbench.action.reloadWindow');
                    }
                });
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
        const currentFiles = config.get('videoFiles', []);
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
        let diagnosticInfo = `VSCode Background - Diagnostics\n`;
        diagnosticInfo += `${'='.repeat(50)}\n\n`;
        diagnosticInfo += `VSCode Version: ${vscode.version}\n`;
        diagnosticInfo += `App Root: ${appRoot}\n`;
        diagnosticInfo += `Running as Admin: ${process.platform === 'win32' ? 'Check manually' : 'N/A'}\n\n`;
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
        vscode.window.showInformationMessage('Diagnostics information shown in output panel');
    });
    // 监听配置变化 - 自动应用（如果启用）
    const configWatcher = vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration('vscodeBackground')) {
            const config = vscode.workspace.getConfiguration('vscodeBackground');
            const autoApply = config.get('autoApply', true);
            // 跳过 currentStatus 的变化（避免循环）
            if (e.affectsConfiguration('vscodeBackground.currentStatus')) {
                return;
            }
            // 如果启用了自动应用
            if (autoApply) {
                // 给用户一点时间看配置变化，然后自动应用
                setTimeout(async () => {
                    const action = await vscode.window.showInformationMessage('Settings changed. Apply now?', 'Apply', 'Later');
                    if (action === 'Apply') {
                        vscode.commands.executeCommand('vscode-background.applySettings');
                    }
                }, 1000);
            }
            else {
                // 提示用户手动应用
                vscode.window.showInformationMessage('Settings changed. Run "Apply Settings" command to apply.', 'Apply Now').then(action => {
                    if (action === 'Apply Now') {
                        vscode.commands.executeCommand('vscode-background.applySettings');
                    }
                });
            }
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
                            const config = vscode.workspace.getConfiguration('vscodeBackground');
                            const currentFiles = config.get('videoFiles', []);
                            // 合并并去重
                            const allFiles = [...currentFiles];
                            for (const file of newFiles) {
                                if (!allFiles.includes(file)) {
                                    allFiles.push(file);
                                }
                            }
                            await config.update('videoFiles', allFiles, vscode.ConfigurationTarget.Global);
                            const fileNames = newFiles.map(f => path.basename(f)).join(', ');
                            vscode.window.showInformationMessage(`Added ${newFiles.length} video(s): ${fileNames}`);
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
            const config = vscode.workspace.getConfiguration('vscodeBackground');
            const currentFiles = config.get('videoFiles', []);
            const newFiles = fileUris.map(uri => uri.fsPath);
            // 合并并去重
            const allFiles = [...currentFiles];
            for (const file of newFiles) {
                if (!allFiles.includes(file)) {
                    allFiles.push(file);
                }
            }
            await config.update('videoFiles', allFiles, vscode.ConfigurationTarget.Global);
            const fileNames = newFiles.map(f => path.basename(f)).join(', ');
            vscode.window.showInformationMessage(`Added ${newFiles.length} video(s): ${fileNames}`);
        }
    }
    // 删除视频命令
    const removeVideo = vscode.commands.registerCommand('vscode-background.removeVideo', async () => {
        try {
            const config = vscode.workspace.getConfiguration('vscodeBackground');
            const currentFiles = config.get('videoFiles', []);
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
                await config.update('videoFiles', newFiles, vscode.ConfigurationTarget.Global);
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
        const currentFiles = config.get('videoFiles', []);
        if (currentFiles.length === 0) {
            const action = await vscode.window.showInformationMessage('No videos configured. Would you like to add some?', 'Add Videos', 'Cancel');
            if (action === 'Add Videos') {
                vscode.commands.executeCommand('vscode-background.addVideos');
            }
            return;
        }
        // 显示当前视频列表
        let message = 'Current video playlist (play order):\n\n';
        currentFiles.forEach((filePath, index) => {
            message += `${index + 1}. ${path.basename(filePath)}\n`;
        });
        const action = await vscode.window.showInformationMessage(`${currentFiles.length} video(s) in playlist`, 'Add Videos', 'Remove Videos', 'View List');
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
            outputChannel.appendLine('Videos are played in order from top to bottom:\n');
            currentFiles.forEach((filePath, index) => {
                outputChannel.appendLine(`${index + 1}. ${path.basename(filePath)}`);
                outputChannel.appendLine(`   Path: ${filePath}\n`);
            });
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
        const current = config.get('switchInterval', 30000);
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
                await config.update('switchInterval', newInterval, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(`Switch interval set to ${newInterval / 1000} seconds.`);
            }
        }
        else {
            // 当前不是无限循环，设置为无限循环
            await config.update('switchInterval', 0, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage('Infinite loop enabled! Video will loop forever without switching.');
        }
    });
    // 应用设置命令 - 自动生成并运行脚本
    const applySettings = vscode.commands.registerCommand('vscode-background.applySettings', async () => {
        const config = vscode.workspace.getConfiguration('vscodeBackground');
        const videoFiles = config.get('videoFiles', []);
        const enabled = config.get('enabled', true);
        if (enabled && videoFiles.length === 0) {
            const action = await vscode.window.showWarningMessage('No video files configured. Add videos first?', 'Add Videos', 'Cancel');
            if (action === 'Add Videos') {
                vscode.commands.executeCommand('vscode-background.addVideos');
            }
            return;
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
    // 刷新状态命令
    const refreshStatus = vscode.commands.registerCommand('vscode-background.refreshStatus', async () => {
        const status = await checkCurrentStatus();
        const config = vscode.workspace.getConfiguration('vscodeBackground');
        await config.update('currentStatus', status, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage('Status refreshed: ' + status);
    });
    // 清理命令 - 卸载插件前运行
    const cleanup = vscode.commands.registerCommand('vscode-background.cleanup', async () => {
        const action = await vscode.window.showWarningMessage('This will remove all injected code and video files. Run this BEFORE uninstalling the extension. Continue?', 'Yes, Cleanup', 'Cancel');
        if (action !== 'Yes, Cleanup')
            return;
        try {
            await restoreOriginalWorkbench();
            // 清理配置
            const config = vscode.workspace.getConfiguration('vscodeBackground');
            await config.update('enabled', false, vscode.ConfigurationTarget.Global);
            await config.update('videoFiles', [], vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage('Cleanup complete! You can now safely uninstall the extension. Please restart VSCode.', 'Restart Now').then(action => {
                if (action === 'Restart Now') {
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`Cleanup failed: ${error}. Try running 'Grant Permissions' first.`);
        }
    });
    // 启动时检查是否已启用背景并更新状态
    const config = vscode.workspace.getConfiguration('vscodeBackground');
    isBackgroundEnabled = config.get('enabled', false);
    // 初始化状态
    checkCurrentStatus().then(status => {
        config.update('currentStatus', status, vscode.ConfigurationTarget.Global);
    });
    context.subscriptions.push(enableBackground, disableBackground, configureBackground, diagnostics, configWatcher, addVideos, removeVideo, manageVideos, fixChecksums, setInfiniteLoop, applySettings, refreshStatus, cleanup);
}
async function selectVideoFiles() {
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
    const switchInterval = config.get('switchInterval', 180000);
    const opacity = config.get('opacity', 0.8);
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
        // Remove any existing opacity rules (both old and new format)
        workbenchCss = workbenchCss.replace(/\/\* VSCode Background Extension - START \*\/[\s\S]*?\/\* VSCode Background Extension - END \*\/\n?/g, '');
        workbenchCss = workbenchCss.replace(/\/\* VSCode Background Extension \*\/[\s\S]*?\.monaco-workbench[^}]*\}[^/]*\.monaco-workbench > \.part[^}]*\}\n?/g, '');
        // Also remove simple opacity rule if exists
        workbenchCss = workbenchCss.replace(/\.monaco-workbench\s*\{[^}]*opacity[^}]*\}\n?/g, '');
        // Add simple opacity rule for video background visibility
        const opacityRule = `
		/* VSCode Background Extension - START */
		.monaco-workbench {
			opacity: ${opacity} !important;
		}
		/* VSCode Background Extension - END */
		`;
        workbenchCss += opacityRule;
        try {
            fs.writeFileSync(workbenchCssPath, workbenchCss, 'utf-8');
            console.log(`Applied CSS transparency rules to ${workbenchCssPath}`);
            console.log('CSS rule added:', opacityRule.trim());
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
    await config.update('videoFiles', videoFiles, vscode.ConfigurationTarget.Global);
    await config.update('enabled', true, vscode.ConfigurationTarget.Global);
    isBackgroundEnabled = true;
    console.log('=== applyVideoBackground COMPLETE ===');
}
function generateVideoScript(switchInterval, opacity) {
    // 处理 switchInterval：0 表示无限循环（不切换），否则最小 5 秒
    const effectiveInterval = switchInterval === 0 ? 0 : Math.max(switchInterval, 5000);
    return `
	<video id="bgVideo" loop autoplay muted playsinline
		style="position: fixed; inset: 0; width: 100vw; height: 100vh; object-fit: cover; object-position: center; z-index: -100; opacity: ${opacity};">
	</video>

	<script>
		const VIDEO_BASENAME = 'bg';
		const VIDEO_EXT = 'mp4';
		const DISCOVERY_MAX = 100;
		const INFINITE_LOOP = ${effectiveInterval === 0}; // 无限循环模式

		let videoList = [];
		let currentIndex = 0;
		const videoElement = document.getElementById('bgVideo');
		const switchInterval = ${effectiveInterval};
		let timer = null;
		let switching = false;

		function sleep(ms) {
			return new Promise(resolve => setTimeout(resolve, ms));
		}

		async function ensureVideoPlaying({ retries = 3 } = {}) {
			for (let attempt = 0; attempt < retries; attempt++) {
				try {
					await videoElement.play();
				} catch (err) {
					// ignore and retry
				}

				if (!videoElement.paused) return true;
				await sleep(250 * (attempt + 1));
			}

			return !videoElement.paused;
		}

		async function mediaExists(src) {
			try {
				const headResp = await fetch(src, { method: 'HEAD', cache: 'no-store' });
				return headResp.ok;
			} catch (_) {
				// ignore
			}

			try {
				const resp = await fetch(src, {
					method: 'GET',
					cache: 'no-store',
					headers: { 'Range': 'bytes=0-0' }
				});
				return resp.ok;
			} catch (_) {
				return false;
			}
		}

		async function discoverVideosInFolder() {
			const discovered = [];
			for (let i = 1; i <= DISCOVERY_MAX; i++) {
				const src = \`./background-videos/\${VIDEO_BASENAME}\${i}.\${VIDEO_EXT}\`;
				const exists = await mediaExists(src);
				if (!exists) break;
				discovered.push(src);
			}
			return discovered;
		}

		async function playVideoByIndex(index) {
			currentIndex = (index + videoList.length) % videoList.length;
			const src = videoList[currentIndex];

			try {
				videoElement.pause();
				videoElement.removeAttribute('src');
				videoElement.load();
			} catch (_) {
				// ignore
			}

			videoElement.muted = true;
			videoElement.volume = 0;
			videoElement.setAttribute('muted', '');

			videoElement.src = src;
			videoElement.load();

			const started = await ensureVideoPlaying({ retries: 3 });
			if (!started) {
				throw new Error('Failed to start video playback');
			}
		}

		async function initVideo() {
			videoList = await discoverVideosInFolder();
			if (!videoList.length) {
				console.error('No video files found');
				return;
			}

			try {
				await playVideoByIndex(0);
			} catch (err) {
				console.error('Failed to initialize video:', err);
				await switchToNextVideo();
			}
		}

		async function switchToNextVideo() {
			if (!videoList.length) return;
			if (switching) return;
			switching = true;

			try {
				const startIndex = currentIndex;
				for (let tries = 0; tries < videoList.length; tries++) {
					const nextIndex = (startIndex + 1 + tries) % videoList.length;
					try {
						await playVideoByIndex(nextIndex);
						return;
					} catch (err) {
						console.error('Failed to switch video:', err);
					}
				}
			} finally {
				switching = false;
			}
		}

		function startSwitchTimer() {
			if (INFINITE_LOOP) return; // 无限循环模式不启动定时器
			if (timer) clearInterval(timer);
			timer = setInterval(() => {
				switchToNextVideo();
			}, switchInterval);
		}

		window.addEventListener('load', () => {
			initVideo();
			if (!INFINITE_LOOP) {
				startSwitchTimer();
			}
			console.log(INFINITE_LOOP ? 'Infinite loop mode - video will loop forever' : 'Switch timer started: ' + switchInterval + 'ms');
		});

		videoElement.addEventListener('error', (err) => {
			console.error('Video loading error:', err);
			switchToNextVideo();
		});

		document.addEventListener('visibilitychange', () => {
			if (document.hidden) {
				clearInterval(timer);
			} else {
				startSwitchTimer();
			}
		});
	</script>`;
}
function generateCssRules(opacity) {
    return `
.monaco-workbench {
	background: transparent !important;
}
.monaco-workbench .part {
	background: transparent !important;
}
.monaco-workbench .editor-container {
	background: transparent !important;
}
.monaco-workbench .editor-instance {
	background: transparent !important;
}
body {
	background: rgba(30, 30, 30, ${1 - opacity}) !important;
}
`;
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
            fs.writeFileSync(workbenchHtmlPath, workbenchHtml, 'utf-8');
            console.log('Removed background injection from HTML');
        }
    }
    // Restore CSS by removing our injected rules
    if (workbenchCssPath && fs.existsSync(workbenchCssPath)) {
        let workbenchCss = fs.readFileSync(workbenchCssPath, 'utf-8');
        // Remove our CSS rules using markers
        workbenchCss = workbenchCss.replace(/\/\* VSCode Background Extension - START \*\/[\s\S]*?\/\* VSCode Background Extension - END \*\/\n?/g, '');
        // Also remove old format if exists
        workbenchCss = workbenchCss.replace(/\/\* VSCode Background Extension \*\/[\s\S]*?\.monaco-workbench[^}]*\}[^/]*\.monaco-workbench > \.part[^}]*\}\n?/g, '');
        // Also remove simple opacity rule if exists
        workbenchCss = workbenchCss.replace(/\.monaco-workbench\s*\{[^}]*opacity[^}]*!important[^}]*\}\n?/g, '');
        fs.writeFileSync(workbenchCssPath, workbenchCss, 'utf-8');
        console.log('Removed CSS rules from workbench CSS');
    }
    // Clean up video files
    if (workbenchHtmlPath) {
        const videoDirPath = path.join(path.dirname(workbenchHtmlPath), 'background-videos');
        if (fs.existsSync(videoDirPath)) {
            fs.rmSync(videoDirPath, { recursive: true, force: true });
            console.log('Cleaned up video directory');
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