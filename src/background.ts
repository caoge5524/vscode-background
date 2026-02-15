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
    private jsPath: string | null;
    private isUpdatingConfig = false;
    private configChangeTimer: ReturnType<typeof setTimeout> | undefined;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.jsPath = getWorkbenchJsPath(vscode.env.appRoot);
        console.log(`VSCode Background v${VERSION} - JS path: ${this.jsPath || 'NOT FOUND'}`);
    }

    // ========== 公共 API ==========

    /** 启动时检查补丁状态，如有需要提示重新应用 */
    async checkAndPrompt(): Promise<void> {
        if (!this.jsPath) { return; }

        const config = this.getConfig();
        if (!config.enabled) { return; }

        try {
            const content = fs.readFileSync(this.jsPath, 'utf-8');
            const patchType = getPatchType(content);

            if (patchType === PatchType.None) {
                // VSCode 更新后补丁丢失
                const action = await vscode.window.showInformationMessage(
                    'VSCode Background: 检测到背景设置丢失（可能是 VSCode 更新导致），是否重新应用？',
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
        if (!this.jsPath) {
            vscode.window.showErrorMessage('无法定位 VSCode 工作台文件 (workbench.desktop.main.js)');
            return;
        }

        const config = this.getConfig();

        if (config.videos.length === 0) {
            const action = await vscode.window.showWarningMessage(
                '未配置视频文件。请先在 settings.json 的 "vscodeBackground.videos" 中添加视频路径，或使用"添加视频"命令。',
                '添加视频', '编辑 settings.json', '打开设置', '取消'
            );
            if (action === '添加视频') {
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
                `以下 ${missingFiles.length} 个视频文件不存在:\n${missingFiles.map(f => path.basename(f)).join(', ')}\n\n是否仍然继续？`,
                '继续', '编辑 settings.json', '取消'
            );
            if (action === '编辑 settings.json') {
                await vscode.commands.executeCommand('workbench.action.openSettingsJson');
            }
            if (action !== '继续') { return; }
        }

        try {
            const content = fs.readFileSync(this.jsPath, 'utf-8');
            const patchCode = generatePatch({
                videos: config.videos,
                opacity: config.opacity,
                switchInterval: config.switchInterval,
                theme: config.theme,
            });
            const patched = applyPatch(content, patchCode);

            // 尝试直接写入
            const writeSuccess = await this.writeFile(this.jsPath, patched);
            if (!writeSuccess) { return; }

            // 写入 touch 文件供卸载钩子使用
            this.writeTouchFile(this.jsPath);

            // 清理旧版 v1 补丁（HTML + CSS）
            await this.cleanupV1Patches();

            // 更新启用状态
            this.isUpdatingConfig = true;
            await vscode.workspace.getConfiguration('vscodeBackground')
                .update('enabled', true, vscode.ConfigurationTarget.Global);
            this.isUpdatingConfig = false;

            const action = await vscode.window.showInformationMessage(
                '✅ 视频背景已应用！请重启 VSCode 以查看效果。',
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
        if (!this.jsPath) {
            vscode.window.showErrorMessage('无法定位 VSCode 工作台文件');
            return;
        }

        try {
            const content = fs.readFileSync(this.jsPath, 'utf-8');
            const patchType = getPatchType(content);

            if (patchType === PatchType.None) {
                vscode.window.showInformationMessage('当前没有应用任何背景补丁。');
                return;
            }

            const cleaned = cleanPatch(content);
            const writeSuccess = await this.writeFile(this.jsPath, cleaned);
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

    /** 通过文件选择器添加视频 */
    async addVideos(): Promise<void> {
        let selectedFiles: string[] | undefined;

        if (process.platform === 'win32') {
            selectedFiles = await this.selectVideosWindows();
        }

        if (!selectedFiles) {
            selectedFiles = await this.selectVideosFallback();
        }

        if (!selectedFiles || selectedFiles.length === 0) { return; }

        // 检测是否包含非英文字符
        const nonEnglishFiles = selectedFiles.filter(f => !/^[a-zA-Z0-9:\\/\-._()\s]*$/.test(f));
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
            `已添加 ${selectedFiles.length} 个视频: ${names}`,
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

        let info = `VSCode Background v${VERSION} - 诊断信息\n`;
        info += `${'='.repeat(50)}\n\n`;
        info += `VSCode 版本: ${vscode.version}\n`;
        info += `平台: ${process.platform}\n`;
        info += `App Root: ${appRoot}\n`;
        info += `工作台 JS 路径: ${this.jsPath || '未找到'}\n\n`;

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

        if (this.jsPath) {
            try {
                const content = fs.readFileSync(this.jsPath, 'utf-8');
                const patchType = getPatchType(content);
                info += `补丁状态: ${patchType}\n`;

                try {
                    fs.accessSync(this.jsPath, fs.constants.W_OK);
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
            if (config.enabled && this.jsPath) {
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
        }, 1500);
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
            opacity: config.get<number>('opacity', 0.8),
            switchInterval: config.get<number>('switchInterval', 180),
            theme: config.get<'glass' | 'matte'>('theme', 'glass'),
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

        // 将内容写入临时文件，再通过管理员权限复制到目标位置
        const tempFile = path.join(this.context.extensionPath, 'temp-patch.js');
        const resultFile = path.join(this.context.extensionPath, 'patch-result.txt');

        try { fs.unlinkSync(resultFile); } catch { /* ignore */ }

        fs.writeFileSync(tempFile, content, 'utf-8');

        const script = [
            'try {',
            `    Copy-Item -LiteralPath '${tempFile.replace(/'/g, "''")}' -Destination '${filePath.replace(/'/g, "''")}' -Force`,
            `    'SUCCESS' | Out-File -FilePath '${resultFile.replace(/'/g, "''")}' -Encoding UTF8`,
            '} catch {',
            `    "FAILED: \$(\$_.Exception.Message)" | Out-File -FilePath '${resultFile.replace(/'/g, "''")}' -Encoding UTF8`,
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

    /** Windows 原生文件选择对话框 */
    private selectVideosWindows(): Promise<string[] | undefined> {
        return new Promise((resolve) => {
            const psScript = [
                'Add-Type -AssemblyName System.Windows.Forms',
                '$d = New-Object System.Windows.Forms.OpenFileDialog',
                "$d.Filter = 'Video Files (*.mp4;*.webm;*.ogg)|*.mp4;*.webm;*.ogg|All Files (*.*)|*.*'",
                '$d.Multiselect = $true',
                "$d.Title = 'Select Video Files'",
                "if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { $d.FileNames -join '|' }",
            ].join('; ');

            exec(`powershell -NoProfile -Command "${psScript.replace(/"/g, '\\"')}"`, (error, stdout) => {
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
    private async selectVideosFallback(): Promise<string[] | undefined> {
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
}
