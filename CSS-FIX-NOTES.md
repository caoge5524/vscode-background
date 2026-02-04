# 🎨 CSS 透明度修复 / CSS Opacity Fix

## 问题 / Problem

视频背景已注入到 HTML 中，但无法显示，因为 VSCode 的工作区不透明。

**Video background injected into HTML but not visible because VSCode workbench is not transparent.**

---

## 解决方案 / Solution

### 修改内容 / Changes Made

#### 1. 添加 CSS 文件支持
现在扩展会同时修改两个文件：

**Now the extension modifies both files:**

- ✅ `workbench.html` - 注入视频元素 / Inject video element
- ✅ `workbench.desktop.main.css` - 设置透明度 / Set opacity

#### 2. 自动 CSS 路径检测
扩展会检查以下 CSS 路径：

**Extension checks these CSS paths:**

```
out/vs/workbench/workbench.desktop.main.css
resources/app/out/vs/workbench/workbench.desktop.main.css
```

#### 3. 透明度计算
根据视频不透明度自动计算工作区透明度：

**Opacity calculation based on video opacity:**

```typescript
// 如果视频不透明度为 0.3，工作区透明度应为 0.7
// If video opacity is 0.3, workbench opacity should be 0.7
const cssOpacity = 1 - videoOpacity;
```

添加到 CSS 末尾的规则：

**Rule added to end of CSS:**

```css
/* VSCode Background Extension */
.monaco-workbench { opacity: 0.7 !important; }
```

#### 4. 完整恢复功能
禁用背景时会同时恢复 HTML 和 CSS：

**Disable restores both HTML and CSS:**

- 恢复原始 HTML / Restore original HTML
- 恢复原始 CSS / Restore original CSS
- 删除视频文件 / Delete video files

---

## 使用说明 / Usage

### 1. 重新编译 / Recompile

```bash
cd d:\Programes\vscode-background
npm run compile
```

或在 VSCode 中按 `Ctrl+Shift+B` 选择 "npm: compile"

### 2. 测试 / Test

1. 按 `F5` 启动扩展开发主机
2. 运行诊断命令查看 CSS 路径是否找到：
   ```
   VSCode Background: Show Diagnostics
   ```
3. 启用视频背景：
   ```
   VSCode Background: Enable Video Background
   ```
4. 重启 VSCode
5. 现在应该能看到透明的工作区和视频背景！

### 3. 调整透明度 / Adjust Opacity

在设置中调整：

**Adjust in settings:**

```json
{
  "vscodeBackground.opacity": 0.5  // 0-1 之间，值越大背景越明显
}
```

- `0.1` - 背景几乎不可见，工作区 90% 不透明
- `0.3` - 默认值，平衡效果
- `0.5` - 背景更明显，工作区 50% 不透明
- `0.8` - 背景非常明显，工作区 20% 不透明

---

## 技术细节 / Technical Details

### 修改的文件 / Modified Files

#### workbench.html
在 `<body>` 标签后注入：

**Injected after `<body>` tag:**

```html
<video id="bgVideo" loop autoplay muted playsinline
  style="position: fixed; inset: 0; width: 100vw; height: 100vh; 
         object-fit: cover; z-index: -100; opacity: 0.3;">
</video>
<script>
  // Video rotation logic...
</script>
```

#### workbench.desktop.main.css
在文件末尾添加：

**Added at end of file:**

```css
/* VSCode Background Extension */
.monaco-workbench { opacity: 0.7 !important; }
```

### 为什么需要修改 CSS？ / Why Modify CSS?

VSCode 的工作区默认是完全不透明的（`opacity: 1`），即使在 HTML 中添加了视频背景，也会被完全遮挡。通过设置工作区的透明度，视频才能透过来显示。

**VSCode's workbench is fully opaque by default (`opacity: 1`). Even with video in HTML, it's completely blocked. By setting workbench opacity, video becomes visible through it.**

### z-index 层级 / z-index Layers

```
视频背景 (z-index: -100)  ← 最底层
    ↓
工作区 (opacity: 0.7)     ← 半透明
    ↓
编辑器和 UI               ← 正常显示
```

---

## 诊断输出示例 / Diagnostic Output Example

运行 `VSCode Background: Show Diagnostics` 后应看到：

**After running diagnostics, you should see:**

```
VSCode Background - Diagnostics

VSCode Version: 1.108.1
App Root: D:\Tools\Microsoft VS Code\resources\app

Current Workbench HTML Path: D:\Tools\...\workbench.html
Current Workbench CSS Path: D:\Tools\...\workbench.desktop.main.css

Checked HTML Paths:
✗ D:\Tools\Microsoft VS Code\resources\app\out\vs\code\electron-sandbox\workbench\workbench.html
✓ D:\Tools\Microsoft VS Code\resources\app\out\vs\code\electron-browser\workbench\workbench.html
...

Checked CSS Paths:
✓ D:\Tools\Microsoft VS Code\resources\app\out\vs\workbench\workbench.desktop.main.css
✗ D:\Tools\Microsoft VS Code\out\vs\workbench\workbench.desktop.main.css
```

✓ 表示文件存在 / ✓ means file exists
✗ 表示文件不存在 / ✗ means file not found

---

## 故障排除 / Troubleshooting

### 问题：仍然看不到视频 / Still No Video

1. **检查 CSS 路径是否找到**
   ```
   运行诊断命令，确认 CSS 路径显示 ✓
   ```

2. **检查透明度设置**
   ```json
   {
     "vscodeBackground.opacity": 0.5  // 尝试更高的值
   }
   ```

3. **检查视频文件**
   - 确认视频文件在浏览器中能播放
   - 尝试使用不同的视频文件

4. **清除缓存**
   ```bash
   # 完全禁用后重新启用
   VSCode Background: Disable Video Background
   # 重启 VSCode
   VSCode Background: Enable Video Background
   ```

### 问题：工作区太透明，文字看不清

降低不透明度值：

**Reduce opacity value:**

```json
{
  "vscodeBackground.opacity": 0.2  // 降低到 0.2
}
```

### 问题：VSCode 性能下降

1. 使用较低分辨率的视频（720p 而不是 4K）
2. 减少视频不透明度
3. 增加切换间隔

---

## 变更记录 / Changelog

### v0.0.2 (当前版本 / Current)
- ✅ 添加 CSS 文件修改支持
- ✅ 自动透明度计算
- ✅ CSS 路径自动检测
- ✅ 恢复功能包含 CSS
- ✅ 诊断命令显示 CSS 路径

### v0.0.1
- ✅ 基本 HTML 注入功能
- ✅ 视频轮换功能

---

## 下一步 / Next Steps

1. **编译代码** / Compile
   ```bash
   npm run compile
   ```

2. **测试功能** / Test
   - 按 F5
   - 运行诊断
   - 启用背景
   - 重启 VSCode

3. **反馈问题** / Report Issues
   如果仍有问题，请提供：
   - 诊断命令的完整输出
   - VSCode 版本
   - 操作系统版本

---

**修复完成！现在应该能看到视频背景了！🎉**

**Fix complete! You should now see the video background! 🎉**
