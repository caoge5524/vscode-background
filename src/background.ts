import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { VERSION, TOUCH_FILE_NAME } from './constants.js';
import { getWorkbenchJsPath, getWorkbenchHtmlPath, getWorkbenchCssPath } from './vscodePath.js';
import { getPatchType, PatchType, cleanPatch, applyPatch } from './patchFile.js';
import { generatePatch } from './patchGenerator.js';

export class Background {
    private context: vscode.ExtensionContext;
    private previousJsPath: string | null = null;
    private isUpdatingConfig = false;
    private configChangeTimer: ReturnType<typeof setTimeout> | undefined;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        const initialPath = getWorkbenchJsPath(vscode.env.appRoot);
        this.previousJsPath = initialPath;
        console.log(`VSCode Background v${VERSION} - JS path: ${initialPath || 'NOT FOUND'}`);
    }

    /**
     * 动态获取当前的 JS 路径
     * 如果原路径不存在，自动寻找新路径（用于 VS Code 更新导致版本号改变的情况）
     */
    private getJsPath(): string | null {
        const currentPath = getWorkbenchJsPath(vscode.env.appRoot);

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
    private cleanupOutdatedPatches(): void {
        try {
            const touchFile = path.join(this.context.extensionPath, TOUCH_FILE_NAME);

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
                } catch (e) {
                    console.warn('[VSCode Background] Failed to remove outdated touch file:', e);
                }
                return;
            }

            // 如果文件存在，检查是否仍为当前版本的补丁
            try {
                const content = fs.readFileSync(oldJsPath, 'utf-8');
                const patchType = getPatchType(content);

                // 如果没有补丁，更新 touch 文件指向当前路径
                if (patchType === PatchType.None) {
                    console.log(`[VSCode Background] Patch at ${oldJsPath} no longer exists, cleaning up touch file`);
                    try {
                        fs.unlinkSync(touchFile);
                    } catch { /* ignore */ }
                }
            } catch (e) {
                console.warn(`[VSCode Background] Failed to check old patch file: ${e}`);
            }
        } catch (e) {
            console.warn('[VSCode Background] Error during cleanup of outdated patches:', e);
        }
    }

    /**
     * 清理旧版本路径的补丁
     * 当 VS Code 更新导致版本号改变，导致文件路径改变时调用此方法
     * 这防止了旧目录中的文件阻止 VS Code 卸载
     */
    private cleanupOldVersionPatches(currentJsPath: string): void {
        try {
            const touchFile = path.join(this.context.extensionPath, TOUCH_FILE_NAME);

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
                    const patchType = getPatchType(content);

                    if (patchType !== PatchType.None) {
                        console.log(`[VSCode Background] Cleaning patch from old version path: ${recordedPath}`);
                        const cleaned = cleanPatch(content);
                        fs.writeFileSync(recordedPath, cleaned, 'utf-8');
                        console.log('[VSCode Background] Old version patch cleaned successfully');
                    }
                } catch (e) {
                    console.warn(`[VSCode Background] Failed to clean old version patch: ${e}`);
                    // 不抛出错误，继续执行
                }
            }
        } catch (e) {
            console.warn('[VSCode Background] Error during cleanup of old version patches:', e);
        }
    }

    /**
     * 修复之前版本可能被 Copy-Item 破坏的文件权限
     * 旧版本使用 Copy-Item -Force 以管理员权限写入文件，这会把文件所有者改为 Administrator，
     * 导致 VS Code 更新程序（以普通用户运行）无法修改/删除该文件及其所在目录。
     * 此方法在启动时检测并修复此问题。
     */
    private repairFilePermissions(): void {
        if (process.platform !== 'win32') { return; }

        try {
            const touchFile = path.join(this.context.extensionPath, TOUCH_FILE_NAME);

            if (!fs.existsSync(touchFile)) { return; }

            const recordedPath = fs.readFileSync(touchFile, 'utf-8').trim();

            if (!fs.existsSync(recordedPath)) { return; }

            // 尝试用当前用户写入文件来检测权限是否正常
            try {
                fs.accessSync(recordedPath, fs.constants.W_OK);
                // 当前用户有写入权限，无需修复
                return;
            } catch {
                // 没有写入权限，可能需要修复
            }

            console.log(`[VSCode Background] Detected permission issue on: ${recordedPath}`);
            console.log('[VSCode Background] Attempting to repair file permissions (resetting ACL to inherit from parent)...');

            // 使用 icacls 重置文件 ACL 为从父目录继承（不需要管理员权限即可尝试）
            const escapedPath = recordedPath.replace(/"/g, '\\"');
            exec(`icacls "${escapedPath}" /reset /Q`, { timeout: 10000 }, (error) => {
                if (error) {
                    console.warn('[VSCode Background] Failed to repair file permissions with icacls:', error.message);
                    console.warn('[VSCode Background] VS Code updates may fail. Consider running VS Code as admin once to fix.');
                } else {
                    console.log('[VSCode Background] File permissions repaired successfully');
                }
            });
        } catch (e) {
            console.warn('[VSCode Background] Error during permission repair check:', e);
        }
    }

    // ========== 公共 API ==========

    /** 管理视频/图片顺序与删除（Webview 拖拽排序 + 切换特效选择） */
    async manageVideos(): Promise<void> {
        const config = vscode.workspace.getConfiguration('vscodeBackground');
        let videos = config.get<string[]>('videos', []);
        if (!videos.length) {
            vscode.window.showInformationMessage('当前未配置任何视频或图片。');
            return;
        }
        // 加载并规范化 transitions（长度 = videos.length，含末尾→首帧回环槽）
        let savedTransitions = config.get<string[]>('transitions', []);
        const needed = videos.length;
        while (savedTransitions.length < needed) { savedTransitions.push('zoom'); }
        savedTransitions = savedTransitions.slice(0, needed);

        const panel = vscode.window.createWebviewPanel(
            'vscodeBackgroundManageVideos',
            '管理媒体与切换特效',
            vscode.ViewColumn.Active,
            { enableScripts: true }
        );

        const initFiles = JSON.stringify(videos);
        const initTrans = JSON.stringify(savedTransitions);

        panel.webview.html = `
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
            <meta charset="UTF-8">
            <title>管理媒体</title>
            <style>
            body{font-family:'Segoe UI','PingFang SC','Microsoft YaHei',Arial,sans-serif;background:linear-gradient(135deg,#232526 0%,#414345 100%);color:#f3f6fa;margin:0;padding:0;}
            .container{max-width:860px;min-width:440px;margin:28px auto 0 auto;background:rgba(34,38,46,0.98);border-radius:18px;box-shadow:0 6px 32px 0 #0006;padding:28px 36px 22px 36px;border:1.5px solid #2e3440;}
            h3{margin-top:0;font-weight:600;font-size:1.22rem;letter-spacing:1px;color:#7ecfff;text-align:center;}
            .subtitle{font-size:0.83rem;color:#7a9ec5;text-align:center;margin:-6px 0 14px 0;}
            .toolbar{display:flex;justify-content:flex-end;margin-bottom:10px;}
            #itemList{margin-bottom:16px;}
            .file-item{display:flex;align-items:center;padding:10px 14px 10px 12px;margin:0;background:linear-gradient(90deg,#2c2f36 60%,#232526 100%);border-radius:10px;cursor:grab;border:1.5px solid transparent;min-width:580px;font-size:1rem;word-break:break-all;transition:box-shadow 0.15s,border-color 0.15s;box-shadow:0 2px 8px 0 #0002;}
            .file-item:hover{border-color:#3a8ee6;box-shadow:0 4px 14px 0 #0004;}
            .file-item.dragging{opacity:0.45;box-shadow:0 4px 16px 0 #0004;}
            .file-item.drop-above{border-top:2.5px solid #7ecfff;}
            .file-item.drop-below{border-bottom:2.5px solid #7ecfff;}
            .grip{color:#4a5568;cursor:grab;margin-right:10px;font-size:1.1rem;user-select:none;line-height:1;}
            .file-name{flex:1;word-break:break-all;font-size:0.97rem;}
            .del{margin-left:10px;color:#ff6b81;cursor:pointer;font-size:1.1em;padding:2px 7px;border-radius:6px;transition:background 0.15s,color 0.15s;flex-shrink:0;}
            .del:hover{background:#ff6b8133;color:#fff;}
            .trans-row{display:flex;align-items:center;padding:4px 14px 4px 44px;margin:0;background:rgba(32,44,58,0.6);border-left:2px solid #1e4d7a;border-right:2px solid #1e4d7a;min-width:580px;}
            .trans-label{color:#5d85aa;font-size:0.8rem;margin-right:10px;white-space:nowrap;user-select:none;}
            .trans-select{background:#18202c;color:#a8c4dc;border:1px solid #2d5a8e;border-radius:5px;padding:3px 10px;font-size:0.82rem;cursor:pointer;outline:none;}
            .trans-select:hover{border-color:#4a8ec2;}
            button{margin:0 8px 0 0;padding:7px 20px;border-radius:8px;border:none;background:linear-gradient(90deg,#3a8ee6 0%,#70c1ff 100%);color:#fff;font-size:.98rem;font-weight:500;box-shadow:0 2px 8px 0 #0002;cursor:pointer;transition:background 0.15s,box-shadow 0.15s;}
            button#cancel{background:linear-gradient(90deg,#444950 0%,#232526 100%);color:#bfc9d1;}
            button#addFile{margin:0;padding:6px 16px;font-size:.92rem;}
            button:hover{filter:brightness(1.08);box-shadow:0 4px 14px 0 #0003;}
            </style>
            </head>
            <body>
            <div class="container">
            <h3>管理媒体与切换特效</h3>
            <p class="subtitle">拖拽调整文件顺序 · 切换特效与位置绑定 · ↩ 末尾→首帧回环槽在末尾显示</p>
            <div class="toolbar"><button id="addFile">+ 添加文件</button></div>
            <div id="itemList"></div>
            <div style="text-align:right;margin-top:14px;">
                <button id="save">保存</button>
                <button id="cancel">取消</button>
            </div>
            </div>
            <script>
            const vscode = acquireVsCodeApi();
            var files = ${initFiles};
            var transitions = ${initTrans};

            const TRANS = [
            {v:'zoom',        l:'🔍 缩放淡化（默认）'},
            {v:'fade',        l:'✨ 淡入淡出'},
            {v:'slide-left',  l:'⬅ 向左滑入'},
            {v:'slide-right', l:'➡ 向右滑入'},
            {v:'wipe-up',     l:'⬆ 从下向上滑入'},
            {v:'wipe-down',   l:'⬇ 从上向下滑入'},
            {v:'spiral',      l:'🌀 螺旋弹入'},
            {v:'flip',        l:'🔄 3D 翻转'},
            {v:'blur',        l:'🌫 模糊淡入'},
            {v:'instant',     l:'⚡ 瞬间切换'},
            ];

            function normalize() {
            const n = files.length;
            while (transitions.length < n) transitions.push('zoom');
            transitions.length = n;
            }

            function render() {
            normalize();
            const list = document.getElementById('itemList');
            list.innerHTML = '';
            files.forEach(function(file, i) {
                // ── 文件行 ──
                const row = document.createElement('div');
                row.className = 'file-item';
                row.draggable = true;
                row.dataset.idx = String(i);

                const grip = document.createElement('span');
                grip.className = 'grip';
                grip.textContent = '⠿';
                grip.title = '拖拽排序';

                const name = document.createElement('span');
                name.className = 'file-name';
                name.textContent = file;
                name.title = file;

                const del = document.createElement('span');
                del.className = 'del';
                del.textContent = '🗑️';
                del.title = '删除';
                del.addEventListener('click', function(e) {
                e.stopPropagation();
                const idx = parseInt(row.dataset.idx);
                files.splice(idx, 1);
                if (transitions.length > idx) {
                    transitions.splice(idx, 1);
                }
                render();
                });

                row.appendChild(grip);
                row.appendChild(name);
                row.appendChild(del);

                // 拖拽事件（仅文件行）
                row.addEventListener('dragstart', function(e) {
                window._dragSrc = i;
                row.classList.add('dragging');
                if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
                });
                row.addEventListener('dragend', function() {
                window._dragSrc = null;
                row.classList.remove('dragging');
                document.querySelectorAll('.drop-above,.drop-below').forEach(function(el) {
                    el.classList.remove('drop-above','drop-below');
                });
                });
                row.addEventListener('dragover', function(e) {
                e.preventDefault();
                if (window._dragSrc == null || window._dragSrc === i) return;
                var rect = row.getBoundingClientRect();
                var above = e.clientY < rect.top + rect.height / 2;
                document.querySelectorAll('.drop-above,.drop-below').forEach(function(el) {
                    el.classList.remove('drop-above','drop-below');
                });
                row.classList.add(above ? 'drop-above' : 'drop-below');
                });
                row.addEventListener('drop', function(e) {
                e.preventDefault();
                var src = window._dragSrc;
                if (src == null || src === i) return;
                var rect = row.getBoundingClientRect();
                var insertAfter = e.clientY >= rect.top + rect.height / 2;
                var newFiles = files.slice();
                var moved = newFiles.splice(src, 1)[0];
                var insertAt;
                if (insertAfter) {
                    insertAt = src < i ? i : i + 1;
                } else {
                    insertAt = src > i ? i : i - 1;
                    if (insertAt < 0) insertAt = 0;
                }
                if (insertAt > newFiles.length) insertAt = newFiles.length;
                newFiles.splice(insertAt, 0, moved);
                files = newFiles;
                // transitions 不随文件顺序改变
                render();
                });

                list.appendChild(row);

                // ── 切换特效行（在每个文件后，含末尾→首帧回环槽） ──
                if (files.length > 1) {
                const isWrap = (i === files.length - 1);
                const trow = document.createElement('div');
                trow.className = 'trans-row';

                const lbl = document.createElement('span');
                lbl.className = 'trans-label';
                lbl.textContent = isWrap ? '↩ 末尾→首帧：' : '↕ 切换特效：';
                if (isWrap) lbl.title = '播放列表循环时此处特效生效';

                const sel = document.createElement('select');
                sel.className = 'trans-select';
                sel.dataset.slot = String(i);
                TRANS.forEach(function(t) {
                    const opt = document.createElement('option');
                    opt.value = t.v;
                    opt.textContent = t.l;
                    if ((transitions[i] || 'zoom') === t.v) opt.selected = true;
                    sel.appendChild(opt);
                });
                sel.addEventListener('change', function() {
                    transitions[parseInt(sel.dataset.slot)] = sel.value;
                });

                trow.appendChild(lbl);
                trow.appendChild(sel);
                list.appendChild(trow);
                }
            });
            }

            document.getElementById('addFile').onclick = function() {
            vscode.postMessage({type:'addFileDialog'});
            };
            document.getElementById('save').onclick = function() {
            vscode.postMessage({type:'save', videos: files, transitions: transitions});
            };
            document.getElementById('cancel').onclick = function() {
            vscode.postMessage({type:'cancel'});
            };

            // 接收新增文件消息
            window.addEventListener('message', function(event) {
            var msg = event.data;
            if (msg.type === 'addFiles') {
                msg.files.forEach(function(f) {
                files.unshift(f);
                transitions.unshift('zoom');
                });
                render();
            }
            });

            render();
            </script>
            </body>
            </html>
        `;

        panel.webview.onDidReceiveMessage(async msg => {
            if (msg.type === 'save') {
                await config.update('videos', msg.videos, vscode.ConfigurationTarget.Global);
                await config.update('transitions', msg.transitions, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage('已保存媒体顺序与切换特效。');
                panel.dispose();
            } else if (msg.type === 'cancel') {
                panel.dispose();
            } else if (msg.type === 'addFileDialog') {
                const files = await this.selectVideosFallback();
                if (files && files.length) {
                    panel.webview.postMessage({ type: 'addFiles', files });
                }
            }
        });
    }

    /** 启动时检查补丁状态，如有需要提示重新应用 */
    async checkAndPrompt(): Promise<void> {
        // 先清理过期的 touch 文件，防止卸载失败
        this.cleanupOutdatedPatches();

        // 修复之前版本可能被 Copy-Item 破坏的文件权限
        this.repairFilePermissions();

        // 首次安装欢迎提示 - 检查版本以确保卸载重装后也能显示
        const lastVersion = this.context.globalState.get<string>('vscbg.lastVersion', '');
        const hasShownWelcome = this.context.globalState.get<boolean>('welcomeShown', false);

        // 如果版本不同（说明是新安装或卸载重装），清除旧的 welcomeShown 状态
        if (lastVersion !== VERSION) {
            await this.context.globalState.update('vscbg.lastVersion', VERSION);
            await this.context.globalState.update('welcomeShown', false);
        }

        if (!hasShownWelcome) {
            await this.context.globalState.update('welcomeShown', true);
            const action = await vscode.window.showInformationMessage(
                'VSCode Background 已就绪！请配置视频/图片文件地址以开始使用。',
                '配置视频路径', '打开文件选择器', '稍后'
            );
            if (action === '配置视频路径') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'vscodeBackground.videos');
            } else if (action === '打开文件选择器') {
                await this.addVideos();
            }
            return;
        }

        const jsPath = this.getJsPath();
        if (!jsPath) {
            console.warn('Cannot locate workbench.desktop.main.js - path detection failed');
            return;
        }

        const config = this.getConfig();
        if (!config.enabled) { return; }

        try {
            // 检查文件是否存在
            if (!fs.existsSync(jsPath)) {
                console.warn(`JS path exists in detection but file not found at: ${jsPath}`);
                return;
            }

            const content = fs.readFileSync(jsPath, 'utf-8');
            const patchType = getPatchType(content);

            if (patchType === PatchType.None) {
                // VS Code 更新后补丁丢失
                const action = await vscode.window.showInformationMessage(
                    'VSCode Background: 检测到背景设置丢失（可能是 VS Code 更新导致），是否重新应用？',
                    '重新应用', '稍后'
                );
                if (action === '重新应用') {
                    await this.install();
                }
            } else if (patchType === PatchType.Legacy) {
                // 旧版补丁，需要更新
                const action = await vscode.window.showInformationMessage(
                    'VSCode Background: 检测到旧版补丁，是否更新到最新版本？',
                    '更新', '稍后'
                );
                if (action === '更新') {
                    await this.install();
                }
            }
        } catch (e) {
            console.error('Failed to check patch status:', e);
        }
    }

    /** 安装/更新视频背景 */
    async install(): Promise<void> {
        const jsPath = this.getJsPath();
        if (!jsPath) {
            vscode.window.showErrorMessage('无法定位 VSCode 工作台文件 (workbench.desktop.main.js)');
            return;
        }

        // 清理旧版本路径的补丁（防止 VS Code 卸载时出错）
        this.cleanupOldVersionPatches(jsPath);

        const config = this.getConfig();

        if (config.videos.length === 0) {
            const action = await vscode.window.showWarningMessage(
                '未配置媒体文件（视频/图片）。请先在 settings.json 的 "vscodeBackground.videos" 中添加文件路径，或使用"添加视频"命令。',
                '添加媒体', '编辑 settings.json', '打开设置', '取消'
            );
            if (action === '添加媒体') {
                await this.addVideos();
            } else if (action === '编辑 settings.json') {
                await vscode.commands.executeCommand('workbench.action.openSettingsJson');
            } else if (action === '打开设置') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'vscodeBackground.videos');
            }
            return;
        }

        // 验证视频文件是否存在
        const missingFiles = config.videos.filter(v =>
            !v.startsWith('https://') && !v.startsWith('data:') && !v.startsWith('vscode-file://') && !fs.existsSync(v)
        );
        if (missingFiles.length > 0) {
            const action = await vscode.window.showWarningMessage(
                `以下 ${missingFiles.length} 个媒体文件不存在:\n${missingFiles.map(f => path.basename(f)).join(', ')}\n\n是否仍然继续？`,
                '继续', '编辑 settings.json', '取消'
            );
            if (action === '编辑 settings.json') {
                await vscode.commands.executeCommand('workbench.action.openSettingsJson');
            }
            if (action !== '继续') { return; }
        }

        try {
            const content = fs.readFileSync(jsPath, 'utf-8');
            const patchCode = generatePatch({
                videos: config.videos,
                transitions: config.transitions,
                opacity: config.opacity,
                switchInterval: config.switchInterval,
                theme: config.theme,
            });
            const patched = applyPatch(content, patchCode);

            // 尝试直接写入
            const writeSuccess = await this.writeFile(jsPath, patched);
            if (!writeSuccess) { return; }

            // 写入 touch 文件供卸载钩子使用
            this.writeTouchFile(jsPath);

            // 清理旧版 v1 补丁（HTML + CSS）
            await this.cleanupV1Patches();

            // 更新启用状态
            this.isUpdatingConfig = true;
            await vscode.workspace.getConfiguration('vscodeBackground')
                .update('enabled', true, vscode.ConfigurationTarget.Global);
            this.isUpdatingConfig = false;

            const action = await vscode.window.showInformationMessage(
                '✅ 背景已应用！请重启 VSCode 以查看效果。',
                '立即重启'
            );
            if (action === '立即重启') {
                vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`应用背景失败: ${error}`);
        }
    }

    /** 卸载视频背景 */
    async uninstall(): Promise<void> {
        const jsPath = this.getJsPath();
        if (!jsPath) {
            vscode.window.showErrorMessage('无法定位 VSCode 工作台文件');
            return;
        }

        try {
            const content = fs.readFileSync(jsPath, 'utf-8');
            const patchType = getPatchType(content);

            if (patchType === PatchType.None) {
                vscode.window.showInformationMessage('当前没有应用任何背景补丁。');
                return;
            }

            const cleaned = cleanPatch(content);
            const writeSuccess = await this.writeFile(jsPath, cleaned);
            if (!writeSuccess) { return; }

            // 清理旧版 v1 补丁
            await this.cleanupV1Patches();

            // 更新配置
            this.isUpdatingConfig = true;
            await vscode.workspace.getConfiguration('vscodeBackground')
                .update('enabled', false, vscode.ConfigurationTarget.Global);
            this.isUpdatingConfig = false;

            // 删除 touch 文件
            this.removeTouchFile();

            const action = await vscode.window.showInformationMessage(
                '✅ 视频背景已移除。请重启 VSCode。',
                '立即重启'
            );
            if (action === '立即重启') {
                vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`移除背景失败: ${error}`);
        }
    }

    /** 通过文件选择器添加视频或图片（跨平台，支持所有操作系统） */
    async addVideos(): Promise<void> {
        const selectedFiles = await this.selectVideosFallback();
        if (!selectedFiles || selectedFiles.length === 0) { return; }

        // 检测是否包含非英文字符
        const nonEnglishFiles = selectedFiles.filter(f => !/^[a-zA-Z0-9:\/\-._()\s]*$/.test(f));
        if (nonEnglishFiles.length > 0) {
            const action = await vscode.window.showWarningMessage(
                `检测到 ${nonEnglishFiles.length} 个文件路径包含非英文字符，建议在插件设置中添加。\n\n如需继续，请在 settings.json 中手动添加这些路径。`,
                '编辑 settings.json',
                '取消'
            );
            if (action === '编辑 settings.json') {
                await vscode.commands.executeCommand('workbench.action.openSettingsJson');
            }
            return;
        }

        const config = vscode.workspace.getConfiguration('vscodeBackground');
        const currentVideos = config.get<string[]>('videos', []);
        const newVideos = [...currentVideos, ...selectedFiles];

        this.isUpdatingConfig = true;
        await config.update('videos', newVideos, vscode.ConfigurationTarget.Global);
        this.isUpdatingConfig = false;

        const names = selectedFiles.map(f => path.basename(f)).join(', ');
        const action = await vscode.window.showInformationMessage(
            `已添加 ${selectedFiles.length} 个媒体文件: ${names}`,
            '立即应用', '编辑 settings.json', '稍后'
        );
        if (action === '立即应用') {
            await this.install();
        } else if (action === '编辑 settings.json') {
            await vscode.commands.executeCommand('workbench.action.openSettingsJson');
        }
    }

    /** 显示诊断信息 */
    async showDiagnostics(): Promise<void> {
        const config = this.getConfig();
        const appRoot = vscode.env.appRoot;
        const jsPath = this.getJsPath();

        let info = `VSCode Background v${VERSION} - 诊断信息\n`;
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
                const patchType = getPatchType(content);
                info += `补丁状态: ${patchType}\n`;

                try {
                    fs.accessSync(jsPath, fs.constants.W_OK);
                    info += `写入权限: ✓ 可写\n`;
                } catch {
                    info += `写入权限: ✗ 需要管理员权限\n`;
                }
            } catch (e) {
                info += `读取文件失败: ${e}\n`;
            }
        }

        // 检查 v1 旧版痕迹
        const htmlPath = getWorkbenchHtmlPath(appRoot);
        const cssPath = getWorkbenchCssPath(appRoot);
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
    onConfigChanged(): void {
        if (this.isUpdatingConfig) { return; }

        // 去抖动，避免多次变更触发多次提示
        if (this.configChangeTimer) {
            clearTimeout(this.configChangeTimer);
        }

        this.configChangeTimer = setTimeout(async () => {
            const config = this.getConfig();
            const jsPath = this.getJsPath();
            if (config.enabled && jsPath) {
                const action = await vscode.window.showInformationMessage(
                    '配置已更改，是否重新应用背景设置？',
                    '应用', '编辑 settings.json', '稍后'
                );
                if (action === '应用') {
                    await this.install();
                } else if (action === '编辑 settings.json') {
                    await vscode.commands.executeCommand('workbench.action.openSettingsJson');
                }
            }
        }, 200);
    }

    // ========== 内部方法 ==========

    private getConfig() {
        const config = vscode.workspace.getConfiguration('vscodeBackground');
        // 自动去掉视频路径中的引号
        let videos = config.get<string[]>('videos', []);
        videos = videos.map(v => v.replace(/^["']|["']$/g, ''));
        return {
            enabled: config.get<boolean>('enabled', false),
            videos: videos,
            transitions: config.get<string[]>('transitions', []),
            opacity: config.get<number>('opacity', 0.8),
            switchInterval: config.get<number>('switchInterval', 180),
            theme: config.get<string>('theme', 'glass') as import('./patchGenerator.js').ThemeType,
        };
    }

    /** 尝试写入文件，权限不足时自动提升 */
    private async writeFile(filePath: string, content: string): Promise<boolean> {
        try {
            fs.writeFileSync(filePath, content, 'utf-8');
            return true;
        } catch (writeError: any) {
            if (writeError.code === 'EPERM' || writeError.code === 'EACCES') {
                return await this.writeWithElevation(filePath, content);
            }
            throw writeError;
        }
    }

    /** Windows 上通过 UAC 提权写入文件 */
    private async writeWithElevation(filePath: string, content: string): Promise<boolean> {
        if (process.platform !== 'win32') {
            vscode.window.showErrorMessage('权限不足，请以管理员身份运行 VSCode 后重试。');
            return false;
        }

        const confirm = await vscode.window.showWarningMessage(
            '需要管理员权限来修改 VSCode 系统文件，是否继续？',
            { modal: true },
            '确认'
        );
        if (confirm !== '确认') { return false; }

        // 将内容写入临时文件，再通过管理员权限写入目标文件
        const tempFile = path.join(this.context.extensionPath, 'temp-patch.js');
        const resultFile = path.join(this.context.extensionPath, 'patch-result.txt');

        try { fs.unlinkSync(resultFile); } catch { /* ignore */ }

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
            exec(adminCmd, { timeout: 60000 }, () => {
                setTimeout(() => {
                    try {
                        // 清理临时文件
                        const cleanup = () => {
                            try { fs.unlinkSync(tempFile); } catch { /* ignore */ }
                            try { fs.unlinkSync(scriptFile); } catch { /* ignore */ }
                        };

                        if (fs.existsSync(resultFile)) {
                            const result = fs.readFileSync(resultFile, 'utf8').trim();
                            try { fs.unlinkSync(resultFile); } catch { /* ignore */ }
                            cleanup();

                            if (result.includes('SUCCESS')) {
                                resolve(true);
                            } else {
                                vscode.window.showErrorMessage('应用失败: ' + result);
                                resolve(false);
                            }
                        } else {
                            cleanup();
                            vscode.window.showErrorMessage('操作已取消或失败。请在 UAC 提示框中点击"是"。');
                            resolve(false);
                        }
                    } catch (e) {
                        vscode.window.showErrorMessage('检查结果失败: ' + e);
                        resolve(false);
                    }
                }, 2000);
            });
        });
    }

    /** VSCode 文件选择对话框（跨平台，支持视频与图片） */
    private async selectVideosFallback(): Promise<string[] | undefined> {
        const uris = await vscode.window.showOpenDialog({
            canSelectMany: true,
            openLabel: '选择视频/图片文件',
            filters: {
                '所有文件': ['mp4', 'webm', 'ogg', 'mkv', 'mov', 'avi', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'],
                '视频文件': ['mp4', 'webm', 'ogg', 'mkv', 'mov', 'avi'],
                '图片文件': ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']
            }
        });
        return uris?.map(u => u.fsPath);
    }

    /**
     * 清理 v1 版本的旧补丁（从 HTML 和 CSS 文件中移除注入）
     * v1 版本修改 workbench.html 和 workbench.desktop.main.css
     * v2 版本改为修改 workbench.desktop.main.js
     */
    private async cleanupV1Patches(): Promise<void> {
        const appRoot = vscode.env.appRoot;

        // 清理 HTML 中的 v1 注入
        const htmlPath = getWorkbenchHtmlPath(appRoot);
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
            } catch (e) {
                console.warn('Failed to clean v1 HTML injection:', e);
            }
        }

        // 清理 CSS 中的 v1 注入
        const cssPath = getWorkbenchCssPath(appRoot);
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
            } catch (e) {
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
                } catch (e) {
                    console.warn('Failed to remove old background-videos folder:', e);
                }
            }
        }
    }

    /** 写入 touch 文件（记录补丁目标路径，供卸载钩子使用） */
    private writeTouchFile(jsPath: string): void {
        const touchPath = path.join(this.context.extensionPath, TOUCH_FILE_NAME);
        try {
            fs.writeFileSync(touchPath, jsPath, 'utf-8');
        } catch (e) {
            console.warn('Failed to write touch file:', e);
        }
    }

    /** 删除 touch 文件 */
    private removeTouchFile(): void {
        const touchPath = path.join(this.context.extensionPath, TOUCH_FILE_NAME);
        try { fs.unlinkSync(touchPath); } catch { /* ignore */ }
    }

    /** 打开背景创意工坊（GitHub Discussions 社区分享） */
    async openWorkshop(): Promise<void> {
        const discussionsUrl = 'https://github.com/caoge5524/vscode-background/discussions';
        const workshopFileUrl = 'https://github.com/caoge5524/vscode-background/blob/main/WORKSHOP.md';
        const action = await vscode.window.showInformationMessage(
            '背景创意工坊：与社区一起分享和发现精美背景！',
            '打开 Discussions', '查看工坊指南'
        );
        if (action === '打开 Discussions') {
            await vscode.env.openExternal(vscode.Uri.parse(discussionsUrl));
        } else if (action === '查看工坊指南') {
            await vscode.env.openExternal(vscode.Uri.parse(workshopFileUrl));
        }
    }
}
