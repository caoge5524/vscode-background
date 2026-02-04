# 🐛 调试指南 / Debug Guide

## 如何查看调试日志 / How to View Debug Logs

### 方法 1：扩展开发主机控制台 / Extension Development Host Console

1. 在主 VSCode 窗口（开发扩展的窗口）中：
   - 打开"帮助" → "切换开发人员工具" (`Ctrl+Shift+I`)
   - 或直接按 `F12`

2. 切换到 "Console"（控制台）标签

3. 在扩展开发主机窗口中运行命令：
   ```
   VSCode Background: Enable Video Background
   ```

4. 回到控制台查看日志输出

### 方法 2：扩展主机窗口的控制台 / Extension Host Window Console

1. 在扩展开发主机窗口（测试窗口）中：
   - 打开"帮助" → "切换开发人员工具" (`Ctrl+Shift+I`)

2. 查看控制台中的视频加载错误

---

## 预期的日志输出 / Expected Log Output

### 启动时 / On Activation

```
VSCode Background extension activated
Found workbench.html at: D:\Tools\...\workbench.html
Found workbench.desktop.main.css at: D:\Tools\...\workbench.desktop.main.css
```

### 启用背景时 / When Enabling Background

```
=== applyVideoBackground START ===
Video files: ["D:\Videos\test.mp4"]
Workbench HTML path: D:\Tools\...\workbench.html
Workbench CSS path: D:\Tools\...\workbench.desktop.main.css
Config - switchInterval: 180000 opacity: 0.3
Video directory path: D:\Tools\...\background-videos
Created video directory
Copied video 1: D:\Videos\test.mp4 -> D:\Tools\...\bg1.mp4
Original HTML length: 12345
Generated video script length: 3456
HTML modified, length change: 3456
Wrote modified HTML to: D:\Tools\...\workbench.html
Original CSS length: 234567
Applied CSS opacity: 0.7 to D:\Tools\...\workbench.desktop.main.css
CSS rule added: .monaco-workbench { opacity: 0.7 !important; }
=== applyVideoBackground COMPLETE ===
```

---

## 常见问题诊断 / Common Issues Diagnosis

### 问题 1：找不到文件 / Files Not Found

**日志输出：**
```
Could not locate workbench.html. Checked paths: [...]
Could not locate workbench.desktop.main.css. Checked paths: [...]
```

**解决方案：**
1. 运行诊断命令：`VSCode Background: Show Diagnostics`
2. 查看哪些路径被检查过
3. 手动检查 VSCode 安装目录

### 问题 2：没有 <body 标签 / No <body Tag

**日志输出：**
```
ERROR: No <body tag found in HTML!
```

**原因：** HTML 文件格式不符合预期

**解决方案：**
1. 检查 workbench.html 文件内容
2. 确认文件未被损坏

### 问题 3：CSS 未找到 / CSS Not Found

**日志输出：**
```
Could not locate workbench CSS file, opacity may not work correctly
```

**影响：** 视频会被注入，但工作区不透明，看不到视频

**解决方案：**
1. 运行诊断命令确认 CSS 路径
2. 检查 VSCode 版本是否支持

### 问题 4：视频文件复制失败 / Video Copy Failed

**日志输出：**
```
Error: EACCES: permission denied
```

**解决方案：**
- Windows: 以管理员身份运行 VSCode
- Mac/Linux: 使用 `sudo code`

---

## 浏览器控制台错误 / Browser Console Errors

### 视频加载失败 / Video Loading Failed

在扩展开发主机窗口的控制台中查看：

```javascript
// 成功的情况
Found workbench.html at: ...
// 视频应该开始播放

// 失败的情况
Failed to load resource: net::ERR_FILE_NOT_FOUND
// 视频文件路径错误
```

**检查点：**
1. 视频文件是否成功复制到 `background-videos` 目录
2. 文件路径是否正确
3. 视频格式是否支持

### CSP (Content Security Policy) 错误

```
Refused to load media from 'file://...' because it violates the following Content Security Policy directive
```

**这是正常的！** workbench.html 中的 CSP 已经配置为允许 media-src。

---

## 调试步骤 / Debug Steps

### Step 1: 检查文件路径

1. 运行诊断命令
2. 确认 HTML 和 CSS 路径都找到（显示 ✓）

### Step 2: 启用背景并查看日志

```bash
# 1. 打开主窗口的开发者工具 (F12)
# 2. 在扩展开发主机中运行命令
# 3. 查看控制台输出
```

**应该看到：**
```
=== applyVideoBackground START ===
...
=== applyVideoBackground COMPLETE ===
```

### Step 3: 重启并检查文件

重启 VSCode 后：

1. 检查 `background-videos` 目录是否存在
   ```
   [VSCode安装目录]\resources\app\out\vs\code\electron-browser\workbench\background-videos\
   ```

2. 检查视频文件是否存在
   ```
   bg1.mp4
   bg2.mp4
   ...
   ```

3. 在浏览器中打开视频测试是否能播放

### Step 4: 检查 HTML 修改

1. 打开 workbench.html 文件
2. 搜索 `bgVideo`
3. 应该能找到：
   ```html
   <video id="bgVideo" loop autoplay muted playsinline ...>
   </video>
   ```

### Step 5: 检查 CSS 修改

1. 打开 workbench.desktop.main.css 文件
2. 滚动到文件末尾
3. 应该能看到：
   ```css
   /* VSCode Background Extension */
   .monaco-workbench { opacity: 0.7 !important; }
   ```

### Step 6: 检查浏览器控制台

在扩展开发主机窗口中：

1. 按 `F12` 打开开发者工具
2. 切换到 Console 标签
3. 查找视频相关的错误信息
4. 查找 JavaScript 错误

---

## 手动验证 / Manual Verification

### 验证视频注入 / Verify Video Injection

在扩展开发主机窗口的开发者工具中，切换到 "Elements" 标签：

1. 查找 `<video id="bgVideo">`
2. 检查其样式：
   ```
   position: fixed
   z-index: -100
   opacity: 0.3
   ```

### 验证 CSS 透明度 / Verify CSS Opacity

在 Elements 标签中：

1. 查找 `.monaco-workbench` 元素
2. 查看 Computed 样式
3. 确认 `opacity` 值为 0.7（或其他设置的值）

---

## 报告问题 / Report Issues

如果问题仍未解决，请提供以下信息：

### 1. 控制台完整输出

从 `=== applyVideoBackground START ===` 到 `COMPLETE` 的所有日志

### 2. 诊断信息

运行 `VSCode Background: Show Diagnostics` 的完整输出

### 3. 文件检查结果

- [ ] background-videos 目录是否存在？
- [ ] 视频文件是否存在？
- [ ] workbench.html 中是否有 `<video id="bgVideo">`？
- [ ] workbench.desktop.main.css 末尾是否有 opacity 规则？

### 4. 浏览器控制台错误

扩展开发主机窗口中的任何错误信息

### 5. 系统信息

- VSCode 版本
- 操作系统
- VSCode 安装路径

---

## 快速排查清单 / Quick Checklist

```
启用前：
□ 编译成功 (npm run compile)
□ 诊断命令显示 HTML 路径找到 (✓)
□ 诊断命令显示 CSS 路径找到 (✓)

启用时：
□ 控制台显示 START 和 COMPLETE 日志
□ 没有错误信息
□ 提示重启 VSCode

重启后：
□ background-videos 目录存在
□ 视频文件已复制 (bg1.mp4)
□ workbench.html 包含 <video> 标签
□ workbench.desktop.main.css 末尾有 opacity 规则
□ 浏览器控制台无错误
□ 视频背景显示 ✓
```

---

## 临时调试技巧 / Temporary Debug Tips

### 1. 增加视频不透明度

测试时使用更高的不透明度，更容易看到：

```json
{
  "vscodeBackground.opacity": 0.8
}
```

### 2. 使用小的测试视频

使用短小的、低分辨率的视频便于测试

### 3. 检查视频格式

确保视频是标准的 H.264 MP4：

```bash
ffmpeg -i input.mp4 -c:v libx264 -c:a aac -strict -2 output.mp4
```

---

**需要帮助？把控制台输出发给我！/ Need help? Send me the console output!** 📋
