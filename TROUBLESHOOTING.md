# VSCode Background - 故障排除指南 / Troubleshooting Guide

[简体中文](#简体中文) | [English](#english)

---

## 简体中文

### 问题：Workbench HTML file not found（找不到 workbench HTML 文件）

#### 症状
运行 `VSCode Background: Enable Video Background` 命令后出现错误：
```
Failed to enable background: Error: Workbench HTML file not found
```

#### 原因
扩展无法找到 VSCode 的 workbench.html 文件。这可能是因为：
1. VSCode 版本不同，文件路径不同
2. VSCode 安装方式不同（安装版 vs 便携版）
3. 操作系统不同

#### 解决方案

##### 方案 1：运行诊断命令（推荐）

1. 按 `Ctrl+Shift+P` 打开命令面板
2. 运行命令：`VSCode Background: Show Diagnostics`
3. 查看输出面板中的诊断信息
4. 查找带 ✓ 标记的路径（表示文件存在）

##### 方案 2：手动定位 workbench.html

**Windows:**
1. 找到 VSCode 安装目录，通常在：
   - `C:\Program Files\Microsoft VS Code\`
   - `C:\Users\<用户名>\AppData\Local\Programs\Microsoft VS Code\`
   
2. 在安装目录下查找 `workbench.html`，可能的位置：
   - `resources\app\out\vs\code\electron-sandbox\workbench\workbench.html`
   - `resources\app\out\vs\code\electron-browser\workbench\workbench.html`
   - `out\vs\code\electron-sandbox\workbench\workbench.html`

3. 记下完整路径并报告给开发者

**macOS:**
1. 右键点击 VSCode 应用 → 显示包内容
2. 查找路径：
   - `Contents/Resources/app/out/vs/code/electron-sandbox/workbench/workbench.html`
   - `Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html`

**Linux:**
1. VSCode 通常安装在 `/usr/share/code/`
2. 查找：
   - `/usr/share/code/resources/app/out/vs/code/electron-sandbox/workbench/workbench.html`

##### 方案 3：使用 VSCode Insiders 版本

如果您使用的是 VSCode Insiders 版本，路径可能不同。请：
1. 切换到稳定版 VSCode
2. 或等待扩展更新以支持 Insiders 版本

##### 方案 4：权限问题

1. **Windows**: 以管理员身份运行 VSCode
   - 右键点击 VSCode 图标 → 以管理员身份运行

2. **macOS/Linux**: 使用 sudo 启动
   ```bash
   sudo code --user-data-dir=/tmp/vscode-root
   ```

#### 报告问题

如果上述方案都无法解决，请在 GitHub 上创建 Issue，并提供：
1. VSCode 版本（帮助 → 关于）
2. 操作系统版本
3. 诊断命令的完整输出
4. VSCode 安装路径

---

### 问题：权限被拒绝 / Permission Denied

#### 症状
```
Failed to enable background: Error: EACCES: permission denied
```

#### 解决方案
VSCode 安装目录需要写权限来修改 workbench.html

**Windows:**
1. 以管理员身份运行 VSCode
2. 或修改 VSCode 安装目录权限：
   - 右键 VSCode 安装目录 → 属性 → 安全
   - 编辑权限，给当前用户完全控制权限

**macOS/Linux:**
```bash
# 修改 VSCode 目录权限
sudo chown -R $USER /usr/share/code
# 或以 sudo 运行 VSCode
sudo code --user-data-dir=/tmp/vscode-root
```

---

### 问题：VSCode 显示"不支持"警告

#### 症状
启用背景后，VSCode 显示：
```
Your Code installation appears to be corrupt. Please reinstall.
```

#### 原因
这是正常的！扩展修改了 VSCode 的核心文件，触发了完整性检查。

#### 解决方案
1. **忽略警告**：点击齿轮图标 → "不再显示"
2. **这是安全的**：扩展只是添加了视频元素，没有破坏任何功能
3. **可恢复**：运行 `VSCode Background: Disable` 即可恢复

---

### 问题：视频不播放 / 黑屏

#### 可能原因
1. 视频文件损坏
2. 视频编码格式不支持
3. 文件路径包含特殊字符

#### 解决方案
1. **测试视频文件**：在浏览器中打开测试是否能播放
2. **转换格式**：使用 H.264 编码的 MP4
   ```bash
   ffmpeg -i input.mp4 -c:v libx264 -c:a aac output.mp4
   ```
3. **检查路径**：避免使用包含空格或特殊字符的路径
4. **降低分辨率**：大文件可能影响性能

---

### 问题：VSCode 性能下降

#### 症状
- VSCode 启动变慢
- 编辑器卡顿
- CPU/内存占用高

#### 解决方案
1. **降低视频分辨率**：使用 720p 而不是 4K
2. **减少不透明度**：设置更低的 opacity（如 0.2）
3. **增加切换间隔**：减少视频切换频率
   ```json
   {
     "vscodeBackground.switchInterval": 600000  // 10分钟
   }
   ```
4. **使用静态图片**：考虑使用图片而不是视频

---

## English

### Issue: Workbench HTML file not found

#### Symptoms
Error when running `VSCode Background: Enable Video Background`:
```
Failed to enable background: Error: Workbench HTML file not found
```

#### Cause
Extension cannot locate VSCode's workbench.html file. This may be due to:
1. Different VSCode versions with different file paths
2. Different installation types (installer vs portable)
3. Different operating systems

#### Solutions

##### Solution 1: Run Diagnostics Command (Recommended)

1. Press `Ctrl+Shift+P` to open command palette
2. Run: `VSCode Background: Show Diagnostics`
3. Check diagnostics information in output panel
4. Look for paths marked with ✓ (file exists)

##### Solution 2: Manually Locate workbench.html

**Windows:**
1. Find VSCode installation directory, usually:
   - `C:\Program Files\Microsoft VS Code\`
   - `C:\Users\<username>\AppData\Local\Programs\Microsoft VS Code\`
   
2. Search for `workbench.html`, possible locations:
   - `resources\app\out\vs\code\electron-sandbox\workbench\workbench.html`
   - `resources\app\out\vs\code\electron-browser\workbench\workbench.html`
   - `out\vs\code\electron-sandbox\workbench\workbench.html`

3. Note the full path and report to developer

**macOS:**
1. Right-click VSCode app → Show Package Contents
2. Look for:
   - `Contents/Resources/app/out/vs/code/electron-sandbox/workbench/workbench.html`
   - `Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html`

**Linux:**
1. VSCode usually installed in `/usr/share/code/`
2. Search:
   - `/usr/share/code/resources/app/out/vs/code/electron-sandbox/workbench/workbench.html`

##### Solution 3: VSCode Insiders Version

If using VSCode Insiders, paths may differ:
1. Switch to stable VSCode
2. Or wait for extension update to support Insiders

##### Solution 4: Permission Issues

1. **Windows**: Run VSCode as Administrator
   - Right-click VSCode icon → Run as administrator

2. **macOS/Linux**: Launch with sudo
   ```bash
   sudo code --user-data-dir=/tmp/vscode-root
   ```

#### Report Issue

If none of the above works, create a GitHub Issue with:
1. VSCode version (Help → About)
2. Operating system version
3. Full diagnostics command output
4. VSCode installation path

---

### Issue: Permission Denied

#### Symptoms
```
Failed to enable background: Error: EACCES: permission denied
```

#### Solutions
VSCode installation directory needs write permission to modify workbench.html

**Windows:**
1. Run VSCode as Administrator
2. Or modify VSCode directory permissions:
   - Right-click VSCode directory → Properties → Security
   - Edit permissions, grant full control to current user

**macOS/Linux:**
```bash
# Change VSCode directory permissions
sudo chown -R $USER /usr/share/code
# Or run VSCode with sudo
sudo code --user-data-dir=/tmp/vscode-root
```

---

### Issue: VSCode Shows "Unsupported" Warning

#### Symptoms
After enabling background, VSCode shows:
```
Your Code installation appears to be corrupt. Please reinstall.
```

#### Cause
This is normal! Extension modified VSCode core files, triggering integrity check.

#### Solutions
1. **Ignore warning**: Click gear icon → "Don't Show Again"
2. **It's safe**: Extension only adds video element, doesn't break functionality
3. **Reversible**: Run `VSCode Background: Disable` to restore

---

### Issue: Video Not Playing / Black Screen

#### Possible Causes
1. Video file corrupted
2. Video codec not supported
3. File path contains special characters

#### Solutions
1. **Test video**: Open in browser to verify playback
2. **Convert format**: Use H.264 encoded MP4
   ```bash
   ffmpeg -i input.mp4 -c:v libx264 -c:a aac output.mp4
   ```
3. **Check path**: Avoid spaces or special characters in path
4. **Reduce resolution**: Large files may impact performance

---

### Issue: VSCode Performance Degradation

#### Symptoms
- VSCode starts slowly
- Editor lags
- High CPU/memory usage

#### Solutions
1. **Lower video resolution**: Use 720p instead of 4K
2. **Reduce opacity**: Set lower opacity (e.g., 0.2)
3. **Increase switch interval**: Reduce video switching frequency
   ```json
   {
     "vscodeBackground.switchInterval": 600000  // 10 minutes
   }
   ```
4. **Use static images**: Consider images instead of videos

---

## 📞 获取帮助 / Get Help

如果问题仍未解决 / If issue persists:

1. 📋 查看完整文档 / Check full documentation:
   - `TESTING-PUBLISHING.md`
   - `README.md`

2. 🐛 报告 Bug / Report bugs:
   - GitHub Issues: [项目地址]
   - 包含诊断信息 / Include diagnostics output

3. 💬 社区支持 / Community support:
   - VSCode 扩展市场 Q&A
   - Stack Overflow (tag: vscode-extension)

---

**祝使用愉快！/ Happy coding!** 🎉
