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
exports.Background = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const constants_js_1 = require("./constants.js");
const vscodePath_js_1 = require("./vscodePath.js");
const patchFile_js_1 = require("./patchFile.js");
const patchGenerator_js_1 = require("./patchGenerator.js");
class Background {
    context;
    previousJsPath = null;
    isUpdatingConfig = false;
    configChangeTimer;
    constructor(context) {
        this.context = context;
        const initialPath = (0, vscodePath_js_1.getWorkbenchJsPath)(vscode.env.appRoot);
        this.previousJsPath = initialPath;
        console.log(`VSCode Background v${constants_js_1.VERSION} - JS path: ${initialPath || 'NOT FOUND'}`);
    }
    /**
     * 动态获取当前的 JS 路径
     * 如果原路径不存在，自动寻找新路径（用于 VS Code 更新导致版本号改变的情况）
     */
    getJsPath() {
        const currentPath = (0, vscodePath_js_1.getWorkbenchJsPath)(vscode.env.appRoot);
        // 检查路径是否改变（例如版本号从 b6a47e94e3 变为其他值）
        if (currentPath && currentPath !== this.previousJsPath) {
            console.log(`VS Code path changed:\n  Old: ${this.previousJsPath}\n  New: ${currentPath}`);
            // 尝试清理旧路径的过期补丁
            this.cleanupOutdatedPatches();
            this.previousJsPath = currentPath;
        }
        return currentPath;
    }
    /**
     * 清理过期的补丁和 touch 文件
     * 当 VS Code 版本号改变时，旧的补丁文件会变得无用且可能阻止卸载
     */
    cleanupOutdatedPatches() {
        try {
            const touchFile = path.join(this.context.extensionPath, constants_js_1.TOUCH_FILE_NAME);
            if (!fs.existsSync(touchFile)) {
                return; // 没有 touch 文件，无需清理
            }
            const oldJsPath = fs.readFileSync(touchFile, 'utf-8').trim();
            // 如果 touch 文件指向的路径不存在，说明该路径已过期
            if (!fs.existsSync(oldJsPath)) {
                console.log(`[VSCode Background] Cleaning up outdated touch file pointing to: ${oldJsPath}`);
                try {
                    fs.unlinkSync(touchFile);
                    console.log('[VSCode Background] Outdated touch file removed');
                }
                catch (e) {
                    console.warn('[VSCode Background] Failed to remove outdated touch file:', e);
                }
                return;
            }
            // 如果文件存在，检查是否仍为当前版本的补丁
            try {
                const content = fs.readFileSync(oldJsPath, 'utf-8');
                const patchType = (0, patchFile_js_1.getPatchType)(content);
                // 如果没有补丁，更新 touch 文件指向当前路径
                if (patchType === patchFile_js_1.PatchType.None) {
                    console.log(`[VSCode Background] Patch at ${oldJsPath} no longer exists, cleaning up touch file`);
                    try {
                        fs.unlinkSync(touchFile);
                    }
                    catch { /* ignore */ }
                }
            }
            catch (e) {
                console.warn(`[VSCode Background] Failed to check old patch file: ${e}`);
            }
        }
        catch (e) {
            console.warn('[VSCode Background] Error during cleanup of outdated patches:', e);
        }
    }
    /**
     * 清理旧版本路径的补丁
     * 当 VS Code 更新导致版本号改变，导致文件路径改变时调用此方法
     * 这防止了旧目录中的文件阻止 VS Code 卸载
     */
    cleanupOldVersionPatches(currentJsPath) {
        try {
            const touchFile = path.join(this.context.extensionPath, constants_js_1.TOUCH_FILE_NAME);
            if (!fs.existsSync(touchFile)) {
                return;
            }
            const recordedPath = fs.readFileSync(touchFile, 'utf-8').trim();
            // 路径没有改变，无需清理
            if (recordedPath === currentJsPath) {
                return;
            }
            // 旧路径仍然存在且包含补丁，需要清理
            if (fs.existsSync(recordedPath)) {
                try {
                    const content = fs.readFileSync(recordedPath, 'utf-8');
                    const patchType = (0, patchFile_js_1.getPatchType)(content);
                    if (patchType !== patchFile_js_1.PatchType.None) {
                        console.log(`[VSCode Background] Cleaning patch from old version path: ${recordedPath}`);
                        const cleaned = (0, patchFile_js_1.cleanPatch)(content);
                        fs.writeFileSync(recordedPath, cleaned, 'utf-8');
                        console.log('[VSCode Background] Old version patch cleaned successfully');
                    }
                }
                catch (e) {
                    console.warn(`[VSCode Background] Failed to clean old version patch: ${e}`);
                    // 不抛出错误，继续执行
                }
            }
        }
        catch (e) {
            console.warn('[VSCode Background] Error during cleanup of old version patches:', e);
        }
    }
    /**
     * 修复之前版本可能被 Copy-Item 破坏的文件权限
     * 旧版本使用 Copy-Item -Force 以管理员权限写入文件，这会把文件所有者改为 Administrator，
     * 导致 VS Code 更新程序（以普通用户运行）无法修改/删除该文件及其所在目录。
     * 此方法在启动时检测并修复此问题。
     */
    repairFilePermissions() {
        if (process.platform !== 'win32') {
            return;
        }
        try {
            const touchFile = path.join(this.context.extensionPath, constants_js_1.TOUCH_FILE_NAME);
            if (!fs.existsSync(touchFile)) {
                return;
            }
            const recordedPath = fs.readFileSync(touchFile, 'utf-8').trim();
            if (!fs.existsSync(recordedPath)) {
                return;
            }
            // 尝试用当前用户写入文件来检测权限是否正常
            try {
                fs.accessSync(recordedPath, fs.constants.W_OK);
                // 当前用户有写入权限，无需修复
                return;
            }
            catch {
                // 没有写入权限，可能需要修复
            }
            console.log(`[VSCode Background] Detected permission issue on: ${recordedPath}`);
            console.log('[VSCode Background] Attempting to repair file permissions (resetting ACL to inherit from parent)...');
            // 使用 icacls 重置文件 ACL 为从父目录继承（不需要管理员权限即可尝试）
            const escapedPath = recordedPath.replace(/"/g, '\\"');
            (0, child_process_1.exec)(`icacls "${escapedPath}" /reset /Q`, { timeout: 10000 }, (error) => {
                if (error) {
                    console.warn('[VSCode Background] Failed to repair file permissions with icacls:', error.message);
                    console.warn('[VSCode Background] VS Code updates may fail. Consider running VS Code as admin once to fix.');
                }
                else {
                    console.log('[VSCode Background] File permissions repaired successfully');
                }
            });
        }
        catch (e) {
            console.warn('[VSCode Background] Error during permission repair check:', e);
        }
    }
    // ========== 公共 API ==========
    /** 管理视频/图片顺序与删除（Webview 拖拽排序） */
    async manageVideos() {
        const config = vscode.workspace.getConfiguration('vscodeBackground');
        let videos = config.get('videos', []);
        if (!videos.length) {
            vscode.window.showInformationMessage('当前未配置任何视频或图片。');
            return;
        }
        const panel = vscode.window.createWebviewPanel('vscodeBackgroundManageVideos', '管理媒体顺序', vscode.ViewColumn.Active, { enableScripts: true });
        // 生成 HTML
        panel.webview.html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <title>管理媒体顺序</title>
        <style>
            body { font-family: sans-serif; background: #232323; color: #eee; }
            ul { list-style: none; padding: 0; }
            li { padding: 8px 12px; margin: 4px 0; background: #333; border-radius: 4px; cursor: grab; display: flex; align-items: center; }
            li.dragging { opacity: 0.5; }
            .del { margin-left: auto; color: #f55; cursor: pointer; }
            button { margin: 12px 8px 0 0; }
            .drag-over-top { border-top: 2px solid #4af; }
            .drag-over-bottom { border-bottom: 2px solid #4af; }
            .toolbar { margin-bottom: 10px; }
        </style>
    </head>
    <body>
        <h3>拖拽排序，点击删除</h3>
        <div class="toolbar">
            <button id="addFile">添加文件</button>
        </div>
        <ul id="list">
            ${videos.map((v, i) => `<li draggable="true" data-idx="${i}">${v}<span class="del" title="删除">🗑️</span></li>`).join('')}
        </ul>
        <button id="save">保存</button>
        <button id="cancel">取消</button>
        <script>
            const vscode = acquireVsCodeApi();
            let dragging = null;
            let dragIdx = null;
            const list = document.getElementById('list');
            function clearDragOver() {
                document.querySelectorAll('li').forEach(li => {
                    li.classList.remove('drag-over-top', 'drag-over-bottom');
                });
            }
            document.querySelectorAll('li').forEach(li => {
                li.addEventListener('dragstart', e => {
                    dragging = li;
                    dragIdx = +li.dataset.idx;
                    li.classList.add('dragging');
                });
                li.addEventListener('dragend', e => {
                    dragging = null;
                    dragIdx = null;
                    li.classList.remove('dragging');
                    clearDragOver();
                });
                li.addEventListener('dragover', e => {
                    e.preventDefault();
                    if (!dragging || dragging === li) return;
                    const rect = li.getBoundingClientRect();
                    const offset = e.clientY - rect.top;
                    clearDragOver();
                    if (offset < rect.height / 2) {
                        li.classList.add('drag-over-top');
                    } else {
                        li.classList.add('drag-over-bottom');
                    }
                });
                li.addEventListener('drop', e => {
                    e.preventDefault();
                    if (!dragging || dragging === li) return;
                    const rect = li.getBoundingClientRect();
                    const offset = e.clientY - rect.top;
                    if (offset < rect.height / 2) {
                        list.insertBefore(dragging, li);
                    } else {
                        list.insertBefore(dragging, li.nextSibling);
                    }
                    clearDragOver();
                });
                li.querySelector('.del').onclick = e => {
                    li.remove();
                };
            });
            // 仅当鼠标接近ul顶部时才显示最上方蓝线
            list.addEventListener('dragover', e => {
                e.preventDefault();
                if (!dragging) return;
                const first = list.firstElementChild;
                if (first && e.target === list) {
                    // 只在鼠标距离ul顶部8px内才显示最上方蓝线
                    const ulRect = list.getBoundingClientRect();
                    if (e.clientY - ulRect.top < 8) {
                        clearDragOver();
                        first.classList.add('drag-over-top');
                    } else {
                        clearDragOver();
                    }
                }
            });
            list.addEventListener('drop', e => {
                e.preventDefault();
                if (!dragging) return;
                const first = list.firstElementChild;
                if (first && e.target === list) {
                    const ulRect = list.getBoundingClientRect();
                    if (e.clientY - ulRect.top < 8) {
                        list.insertBefore(dragging, first);
                        clearDragOver();
                    }
                }
            });
            document.getElementById('addFile').onclick = () => {
                vscode.postMessage({ type: 'addFileDialog' });
            };
            document.getElementById('save').onclick = () => {
                const newList = Array.from(document.querySelectorAll('li')).map(li => li.childNodes[0].textContent);
                vscode.postMessage({ type: 'save', videos: newList });
            };
            document.getElementById('cancel').onclick = () => {
                vscode.postMessage({ type: 'cancel' });
            };
            // 接收主进程消息，动态添加新项
            window.addEventListener('message', event => {
                const msg = event.data;
                if (msg.type === 'addFiles') {
                    for (const file of msg.files) {
                        const li = document.createElement('li');
                        li.draggable = true;
                        li.innerHTML = file + '<span class="del" title="删除">🗑️</span>';
                        li.querySelector('.del').onclick = e => li.remove();
                        list.insertBefore(li, list.firstChild);
                        // 重新绑定拖拽事件
                        li.addEventListener('dragstart', e => {
                            dragging = li;
                            li.classList.add('dragging');
                        });
                        li.addEventListener('dragend', e => {
                            dragging = null;
                            li.classList.remove('dragging');
                            clearDragOver();
                        });
                        li.addEventListener('dragover', e => {
                            e.preventDefault();
                            if (!dragging || dragging === li) return;
                            const rect = li.getBoundingClientRect();
                            const offset = e.clientY - rect.top;
                            clearDragOver();
                            if (offset < rect.height / 2) {
                                li.classList.add('drag-over-top');
                            } else {
                                li.classList.add('drag-over-bottom');
                            }
                        });
                        li.addEventListener('drop', e => {
                            e.preventDefault();
                            if (!dragging || dragging === li) return;
                            const rect = li.getBoundingClientRect();
                            const offset = e.clientY - rect.top;
                            if (offset < rect.height / 2) {
                                list.insertBefore(dragging, li);
                            } else {
                                list.insertBefore(dragging, li.nextSibling);
                            }
                            clearDragOver();
                        });
                    }
                }
            });
        </script>
    </body>
    </html>
        `;
        panel.webview.onDidReceiveMessage(async (msg) => {
            if (msg.type === 'save') {
                await config.update('videos', msg.videos, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage('已保存媒体顺序。');
                panel.dispose();
            }
            else if (msg.type === 'cancel') {
                panel.dispose();
            }
            else if (msg.type === 'addFileDialog') {
                // 弹出文件选择器
                let files = await this.selectVideosFallback();
                if (files && files.length) {
                    // 过滤掉包含非英文字符的路径，提示用户手动添加
                    const nonEnglishFiles = files.filter(f => !/^[a-zA-Z0-9:./\\\-_'()\s]*$/.test(f));
                    if (nonEnglishFiles.length > 0) {
                        vscode.window.showWarningMessage(`检测到 ${nonEnglishFiles.length} 个文件路径包含非英文字符，建议在插件设置中手动添加。`);
                        files = files.filter(f => !nonEnglishFiles.includes(f));
                    }
                    if (files.length) {
                        panel.webview.postMessage({ type: 'addFiles', files });
                    }
                }
            }
        });
    }
    /** 启动时检查补丁状态，如有需要提示重新应用 */
    async checkAndPrompt() {
        // 先清理过期的 touch 文件，防止卸载失败
        this.cleanupOutdatedPatches();
        // 修复之前版本可能被 Copy-Item 破坏的文件权限
        this.repairFilePermissions();
        const jsPath = this.getJsPath();
        if (!jsPath) {
            console.warn('Cannot locate workbench.desktop.main.js - path detection failed');
            return;
        }
        const config = this.getConfig();
        if (!config.enabled) {
            return;
        }
        try {
            // 检查文件是否存在
            if (!fs.existsSync(jsPath)) {
                console.warn(`JS path exists in detection but file not found at: ${jsPath}`);
                return;
            }
            const content = fs.readFileSync(jsPath, 'utf-8');
            const patchType = (0, patchFile_js_1.getPatchType)(content);
            if (patchType === patchFile_js_1.PatchType.None) {
                // VS Code 更新后补丁丢失
                const action = await vscode.window.showInformationMessage('VSCode Background: 检测到背景设置丢失（可能是 VS Code 更新导致），是否重新应用？', '重新应用', '稍后');
                if (action === '重新应用') {
                    await this.install();
                }
            }
            else if (patchType === patchFile_js_1.PatchType.Legacy) {
                // 旧版补丁，需要更新
                const action = await vscode.window.showInformationMessage('VSCode Background: 检测到旧版补丁，是否更新到最新版本？', '更新', '稍后');
                if (action === '更新') {
                    await this.install();
                }
            }
        }
        catch (e) {
            console.error('Failed to check patch status:', e);
        }
    }
    /** 安装/更新视频背景 */
    async install() {
        const jsPath = this.getJsPath();
        if (!jsPath) {
            vscode.window.showErrorMessage('无法定位 VSCode 工作台文件 (workbench.desktop.main.js)');
            return;
        }
        // 清理旧版本路径的补丁（防止 VS Code 卸载时出错）
        this.cleanupOldVersionPatches(jsPath);
        const config = this.getConfig();
        if (config.videos.length === 0) {
            const action = await vscode.window.showWarningMessage('未配置视频文件。请先在 settings.json 的 "vscodeBackground.videos" 中添加视频路径，或使用"添加视频"命令。', '添加视频', '编辑 settings.json', '打开设置', '取消');
            if (action === '添加视频') {
                await this.addVideos();
            }
            else if (action === '编辑 settings.json') {
                await vscode.commands.executeCommand('workbench.action.openSettingsJson');
            }
            else if (action === '打开设置') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'vscodeBackground.videos');
            }
            return;
        }
        // 验证视频文件是否存在
        const missingFiles = config.videos.filter(v => !v.startsWith('https://') && !v.startsWith('data:') && !v.startsWith('vscode-file://') && !fs.existsSync(v));
        if (missingFiles.length > 0) {
            const action = await vscode.window.showWarningMessage(`以下 ${missingFiles.length} 个视频文件不存在:\n${missingFiles.map(f => path.basename(f)).join(', ')}\n\n是否仍然继续？`, '继续', '编辑 settings.json', '取消');
            if (action === '编辑 settings.json') {
                await vscode.commands.executeCommand('workbench.action.openSettingsJson');
            }
            if (action !== '继续') {
                return;
            }
        }
        try {
            const content = fs.readFileSync(jsPath, 'utf-8');
            const patchCode = (0, patchGenerator_js_1.generatePatch)({
                videos: config.videos,
                opacity: config.opacity,
                switchInterval: config.switchInterval,
                theme: config.theme,
            });
            const patched = (0, patchFile_js_1.applyPatch)(content, patchCode);
            // 尝试直接写入
            const writeSuccess = await this.writeFile(jsPath, patched);
            if (!writeSuccess) {
                return;
            }
            // 写入 touch 文件供卸载钩子使用
            this.writeTouchFile(jsPath);
            // 清理旧版 v1 补丁（HTML + CSS）
            await this.cleanupV1Patches();
            // 更新启用状态
            this.isUpdatingConfig = true;
            await vscode.workspace.getConfiguration('vscodeBackground')
                .update('enabled', true, vscode.ConfigurationTarget.Global);
            this.isUpdatingConfig = false;
            const action = await vscode.window.showInformationMessage('✅ 视频背景已应用！请重启 VSCode 以查看效果。', '立即重启');
            if (action === '立即重启') {
                vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`应用背景失败: ${error}`);
        }
    }
    /** 卸载视频背景 */
    async uninstall() {
        const jsPath = this.getJsPath();
        if (!jsPath) {
            vscode.window.showErrorMessage('无法定位 VSCode 工作台文件');
            return;
        }
        try {
            const content = fs.readFileSync(jsPath, 'utf-8');
            const patchType = (0, patchFile_js_1.getPatchType)(content);
            if (patchType === patchFile_js_1.PatchType.None) {
                vscode.window.showInformationMessage('当前没有应用任何背景补丁。');
                return;
            }
            const cleaned = (0, patchFile_js_1.cleanPatch)(content);
            const writeSuccess = await this.writeFile(jsPath, cleaned);
            if (!writeSuccess) {
                return;
            }
            // 清理旧版 v1 补丁
            await this.cleanupV1Patches();
            // 更新配置
            this.isUpdatingConfig = true;
            await vscode.workspace.getConfiguration('vscodeBackground')
                .update('enabled', false, vscode.ConfigurationTarget.Global);
            this.isUpdatingConfig = false;
            // 删除 touch 文件
            this.removeTouchFile();
            const action = await vscode.window.showInformationMessage('✅ 视频背景已移除。请重启 VSCode。', '立即重启');
            if (action === '立即重启') {
                vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`移除背景失败: ${error}`);
        }
    }
    /** 通过文件选择器添加视频 */
    async addVideos() {
        // 只使用VSCode文件选择对话框
        const selectedFiles = await this.selectVideosFallback();
        if (!selectedFiles || selectedFiles.length === 0) {
            return;
        }
        // 检测是否包含非英文字符
        const nonEnglishFiles = selectedFiles.filter(f => !/^[a-zA-Z0-9:\/\-._()\s]*$/.test(f));
        if (nonEnglishFiles.length > 0) {
            const action = await vscode.window.showWarningMessage(`检测到 ${nonEnglishFiles.length} 个文件路径包含非英文字符，建议在插件设置中添加。\n\n如需继续，请在 settings.json 中手动添加这些路径。`, '编辑 settings.json', '取消');
            if (action === '编辑 settings.json') {
                await vscode.commands.executeCommand('workbench.action.openSettingsJson');
            }
            return;
        }
        const config = vscode.workspace.getConfiguration('vscodeBackground');
        const currentVideos = config.get('videos', []);
        const newVideos = [...currentVideos, ...selectedFiles];
        this.isUpdatingConfig = true;
        await config.update('videos', newVideos, vscode.ConfigurationTarget.Global);
        this.isUpdatingConfig = false;
        const names = selectedFiles.map(f => path.basename(f)).join(', ');
        const action = await vscode.window.showInformationMessage(`已添加 ${selectedFiles.length} 个视频: ${names}`, '立即应用', '编辑 settings.json', '稍后');
        if (action === '立即应用') {
            await this.install();
        }
        else if (action === '编辑 settings.json') {
            await vscode.commands.executeCommand('workbench.action.openSettingsJson');
        }
    }
    /** 显示诊断信息 */
    async showDiagnostics() {
        const config = this.getConfig();
        const appRoot = vscode.env.appRoot;
        const jsPath = this.getJsPath();
        let info = `VSCode Background v${constants_js_1.VERSION} - 诊断信息\n`;
        info += `${'='.repeat(50)}\n\n`;
        info += `VSCode 版本: ${vscode.version}\n`;
        info += `平台: ${process.platform}\n`;
        info += `App Root: ${appRoot}\n`;
        info += `工作台 JS 路径: ${jsPath || '未找到'}\n\n`;
        info += `当前配置:\n`;
        info += `  启用: ${config.enabled}\n`;
        info += `  视频数量: ${config.videos.length}\n`;
        info += `  透明度: ${config.opacity}\n`;
        info += `  切换间隔: ${config.switchInterval} 秒\n`;
        info += `  主题: ${config.theme}\n\n`;
        if (config.videos.length > 0) {
            info += `视频文件:\n`;
            config.videos.forEach((v, i) => {
                const isUrl = v.startsWith('https://') || v.startsWith('data:') || v.startsWith('vscode-file://');
                const exists = isUrl || fs.existsSync(v);
                info += `  ${i + 1}. ${exists ? '✓' : '✗'} ${v}\n`;
            });
            info += '\n';
        }
        if (jsPath) {
            try {
                const content = fs.readFileSync(jsPath, 'utf-8');
                const patchType = (0, patchFile_js_1.getPatchType)(content);
                info += `补丁状态: ${patchType}\n`;
                try {
                    fs.accessSync(jsPath, fs.constants.W_OK);
                    info += `写入权限: ✓ 可写\n`;
                }
                catch {
                    info += `写入权限: ✗ 需要管理员权限\n`;
                }
            }
            catch (e) {
                info += `读取文件失败: ${e}\n`;
            }
        }
        // 检查 v1 旧版痕迹
        const htmlPath = (0, vscodePath_js_1.getWorkbenchHtmlPath)(appRoot);
        const cssPath = (0, vscodePath_js_1.getWorkbenchCssPath)(appRoot);
        info += `\nv1 旧版文件:\n`;
        info += `  HTML 路径: ${htmlPath || '未找到'}\n`;
        info += `  CSS 路径: ${cssPath || '未找到'}\n`;
        if (htmlPath && fs.existsSync(htmlPath)) {
            const html = fs.readFileSync(htmlPath, 'utf-8');
            info += `  HTML 中有 v1 注入: ${html.includes('VSCODE-BACKGROUND-START') ? '是' : '否'}\n`;
        }
        if (cssPath && fs.existsSync(cssPath)) {
            const css = fs.readFileSync(cssPath, 'utf-8');
            info += `  CSS 中有 v1 注入: ${css.includes('VSCODE-BACKGROUND-CSS-START') ? '是' : '否'}\n`;
        }
        const outputChannel = vscode.window.createOutputChannel('VSCode Background 诊断');
        outputChannel.clear();
        outputChannel.appendLine(info);
        outputChannel.show();
    }
    /** 处理配置变更事件 */
    onConfigChanged() {
        if (this.isUpdatingConfig) {
            return;
        }
        // 去抖动，避免多次变更触发多次提示
        if (this.configChangeTimer) {
            clearTimeout(this.configChangeTimer);
        }
        this.configChangeTimer = setTimeout(async () => {
            const config = this.getConfig();
            const jsPath = this.getJsPath();
            if (config.enabled && jsPath) {
                const action = await vscode.window.showInformationMessage('配置已更改，是否重新应用背景设置？', '应用', '编辑 settings.json', '稍后');
                if (action === '应用') {
                    await this.install();
                }
                else if (action === '编辑 settings.json') {
                    await vscode.commands.executeCommand('workbench.action.openSettingsJson');
                }
            }
        }, 200);
    }
    // ========== 内部方法 ==========
    getConfig() {
        const config = vscode.workspace.getConfiguration('vscodeBackground');
        // 自动去掉视频路径中的引号
        let videos = config.get('videos', []);
        videos = videos.map(v => v.replace(/^["']|["']$/g, ''));
        return {
            enabled: config.get('enabled', false),
            videos: videos,
            opacity: config.get('opacity', 0.8),
            switchInterval: config.get('switchInterval', 180),
            theme: config.get('theme', 'glass'),
        };
    }
    /** 尝试写入文件，权限不足时自动提升 */
    async writeFile(filePath, content) {
        try {
            fs.writeFileSync(filePath, content, 'utf-8');
            return true;
        }
        catch (writeError) {
            if (writeError.code === 'EPERM' || writeError.code === 'EACCES') {
                return await this.writeWithElevation(filePath, content);
            }
            throw writeError;
        }
    }
    /** Windows 上通过 UAC 提权写入文件 */
    async writeWithElevation(filePath, content) {
        if (process.platform !== 'win32') {
            vscode.window.showErrorMessage('权限不足，请以管理员身份运行 VSCode 后重试。');
            return false;
        }
        const confirm = await vscode.window.showWarningMessage('需要管理员权限来修改 VSCode 系统文件，是否继续？', { modal: true }, '确认');
        if (confirm !== '确认') {
            return false;
        }
        // 将内容写入临时文件，再通过管理员权限写入目标文件
        const tempFile = path.join(this.context.extensionPath, 'temp-patch.js');
        const resultFile = path.join(this.context.extensionPath, 'patch-result.txt');
        try {
            fs.unlinkSync(resultFile);
        }
        catch { /* ignore */ }
        fs.writeFileSync(tempFile, content, 'utf-8');
        // 关键修复：使用 WriteAllText 直接写入内容到现有文件，而不是用 Copy-Item 替换文件
        // Copy-Item 会替换整个文件（包括 ACL 和所有者），导致文件权限变为 Administrator
        // 这会阻止 VS Code 更新程序（以普通用户运行）访问/删除该文件及其所在目录
        // WriteAllText 只修改文件内容，保留原有的权限和所有者
        const escapedTempFile = tempFile.replace(/'/g, "''");
        const escapedFilePath = filePath.replace(/'/g, "''");
        const escapedResultFile = resultFile.replace(/'/g, "''");
        const script = [
            'try {',
            `    $content = [System.IO.File]::ReadAllText('${escapedTempFile}', [System.Text.Encoding]::UTF8)`,
            `    [System.IO.File]::WriteAllText('${escapedFilePath}', $content, (New-Object System.Text.UTF8Encoding $false))`,
            `    'SUCCESS' | Out-File -FilePath '${escapedResultFile}' -Encoding UTF8`,
            '} catch {',
            `    "FAILED: \$(\$_.Exception.Message)" | Out-File -FilePath '${escapedResultFile}' -Encoding UTF8`,
            '}',
        ].join('\r\n');
        const scriptFile = path.join(this.context.extensionPath, 'elevate.ps1');
        fs.writeFileSync(scriptFile, script, 'utf-8');
        const adminCmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath powershell.exe -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', '${scriptFile.replace(/'/g, "''")}') -Verb RunAs -Wait"`;
        return new Promise((resolve) => {
            (0, child_process_1.exec)(adminCmd, { timeout: 60000 }, () => {
                setTimeout(() => {
                    try {
                        // 清理临时文件
                        const cleanup = () => {
                            try {
                                fs.unlinkSync(tempFile);
                            }
                            catch { /* ignore */ }
                            try {
                                fs.unlinkSync(scriptFile);
                            }
                            catch { /* ignore */ }
                        };
                        if (fs.existsSync(resultFile)) {
                            const result = fs.readFileSync(resultFile, 'utf8').trim();
                            try {
                                fs.unlinkSync(resultFile);
                            }
                            catch { /* ignore */ }
                            cleanup();
                            if (result.includes('SUCCESS')) {
                                resolve(true);
                            }
                            else {
                                vscode.window.showErrorMessage('应用失败: ' + result);
                                resolve(false);
                            }
                        }
                        else {
                            cleanup();
                            vscode.window.showErrorMessage('操作已取消或失败。请在 UAC 提示框中点击"是"。');
                            resolve(false);
                        }
                    }
                    catch (e) {
                        vscode.window.showErrorMessage('检查结果失败: ' + e);
                        resolve(false);
                    }
                }, 2000);
            });
        });
    }
    /** Windows 原生文件选择对话框 */
    selectVideosWindows() {
        return new Promise((resolve) => {
            const psScript = [
                'Add-Type -AssemblyName System.Windows.Forms',
                '$d = New-Object System.Windows.Forms.OpenFileDialog',
                "$d.Filter = 'Video Files (*.mp4;*.webm;*.ogg)|*.mp4;*.webm;*.ogg|All Files (*.*)|*.*'",
                '$d.Multiselect = $true',
                "$d.Title = 'Select Video Files'",
                "if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { $d.FileNames -join '|' }",
            ].join('; ');
            (0, child_process_1.exec)(`powershell -NoProfile -Command "${psScript.replace(/"/g, '\\"')}"`, (error, stdout) => {
                if (error || !stdout.trim()) {
                    resolve(undefined);
                    return;
                }
                const files = stdout.trim().split('|').filter(f => f.length > 0);
                resolve(files.length > 0 ? files : undefined);
            });
        });
    }
    /** VSCode 文件选择对话框（跨平台后备方案） */
    async selectVideosFallback() {
        const uris = await vscode.window.showOpenDialog({
            canSelectMany: true,
            openLabel: '选择视频文件',
            filters: {
                'Video Files': ['mp4', 'webm', 'ogg'],
                'All Files': ['*']
            }
        });
        return uris?.map(u => u.fsPath);
    }
    /**
     * 清理 v1 版本的旧补丁（从 HTML 和 CSS 文件中移除注入）
     * v1 版本修改 workbench.html 和 workbench.desktop.main.css
     * v2 版本改为修改 workbench.desktop.main.js
     */
    async cleanupV1Patches() {
        const appRoot = vscode.env.appRoot;
        // 清理 HTML 中的 v1 注入
        const htmlPath = (0, vscodePath_js_1.getWorkbenchHtmlPath)(appRoot);
        if (htmlPath && fs.existsSync(htmlPath)) {
            try {
                let html = fs.readFileSync(htmlPath, 'utf-8');
                if (html.includes('VSCODE-BACKGROUND-START')) {
                    html = html.replace(/<!-- VSCODE-BACKGROUND-START -->[\s\S]*?<!-- VSCODE-BACKGROUND-END -->\n?/g, '');
                    html = html.replace(/<!-- VSCode Background[\s\S]*?-->\n?/g, '');
                    html = html.replace(/^\s*\[\]?\s*$/gm, '');
                    await this.writeFile(htmlPath, html);
                    console.log('Cleaned v1 HTML injection');
                }
            }
            catch (e) {
                console.warn('Failed to clean v1 HTML injection:', e);
            }
        }
        // 清理 CSS 中的 v1 注入
        const cssPath = (0, vscodePath_js_1.getWorkbenchCssPath)(appRoot);
        if (cssPath && fs.existsSync(cssPath)) {
            try {
                let css = fs.readFileSync(cssPath, 'utf-8');
                let changed = false;
                if (css.includes('VSCODE-BACKGROUND-CSS-START')) {
                    css = css.replace(/\/\* VSCODE-BACKGROUND-CSS-START \*\/[\s\S]*?\/\* VSCODE-BACKGROUND-CSS-END \*\/\n?/g, '');
                    changed = true;
                }
                if (css.includes('VSCode Background Extension')) {
                    css = css.replace(/\/\* VSCode Background Extension[\s\S]*?END \*\/\n?/g, '');
                    changed = true;
                }
                if (changed) {
                    await this.writeFile(cssPath, css);
                    console.log('Cleaned v1 CSS injection');
                }
            }
            catch (e) {
                console.warn('Failed to clean v1 CSS injection:', e);
            }
        }
        // 清理旧版 background-videos 文件夹
        if (htmlPath) {
            const videosDir = path.join(path.dirname(htmlPath), 'background-videos');
            if (fs.existsSync(videosDir)) {
                try {
                    fs.rmSync(videosDir, { recursive: true, force: true });
                    console.log('Removed old background-videos folder');
                }
                catch (e) {
                    console.warn('Failed to remove old background-videos folder:', e);
                }
            }
        }
    }
    /** 写入 touch 文件（记录补丁目标路径，供卸载钩子使用） */
    writeTouchFile(jsPath) {
        const touchPath = path.join(this.context.extensionPath, constants_js_1.TOUCH_FILE_NAME);
        try {
            fs.writeFileSync(touchPath, jsPath, 'utf-8');
        }
        catch (e) {
            console.warn('Failed to write touch file:', e);
        }
    }
    /** 删除 touch 文件 */
    removeTouchFile() {
        const touchPath = path.join(this.context.extensionPath, constants_js_1.TOUCH_FILE_NAME);
        try {
            fs.unlinkSync(touchPath);
        }
        catch { /* ignore */ }
    }
}
exports.Background = Background;
//# sourceMappingURL=background.js.map