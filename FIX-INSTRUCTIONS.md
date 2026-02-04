# 🔧 修复说明 / Fix Instructions

## 问题 / Problem
**错误信息 / Error**: `Workbench HTML file not found`

## 已实施的修复 / Fixes Implemented

### 1. 多路径检测 / Multiple Path Detection
扩展现在会自动检查以下路径：
- `out/vs/code/electron-sandbox/workbench/workbench.html`
- `out/vs/code/electron-browser/workbench/workbench.html`
- `out/vs/workbench/workbench.html`
- `resources/app/out/vs/code/electron-sandbox/workbench/workbench.html`
- `resources/app/out/vs/code/electron-browser/workbench/workbench.html`

### 2. 诊断命令 / Diagnostic Command
新增命令：`VSCode Background: Show Diagnostics`

使用方法：
1. 按 `Ctrl+Shift+P`
2. 输入 `VSCode Background: Show Diagnostics`
3. 查看输出面板中的详细信息

### 3. 改进的错误消息 / Improved Error Messages
现在会显示：
- VSCode 根目录
- 检查过的所有路径
- 更详细的诊断信息

## 下一步操作 / Next Steps

### 1. 重新编译扩展 / Recompile Extension

**在 VSCode 项目中：**
```bash
# 方法 1: 使用 npm
cd d:\Programes\vscode-background
npm run compile

# 方法 2: 直接使用 tsc
tsc -p ./
```

**或者在 VSCode 中：**
- 按 `Ctrl+Shift+B`
- 选择 "npm: compile"

### 2. 重新测试 / Test Again

1. 编译完成后，按 `F5` 启动扩展开发主机
2. 在新窗口中运行诊断命令：
   ```
   VSCode Background: Show Diagnostics
   ```
3. 查看输出，确认是否找到 workbench.html
4. 如果找到（显示 ✓），再次尝试启用视频背景

### 3. 如果仍然失败 / If Still Fails

运行诊断命令后：
1. 截图输出面板内容
2. 查看 `TROUBLESHOOTING.md` 获取更多解决方案
3. 在 GitHub 上报告问题（附带诊断输出）

## 快速测试步骤 / Quick Test Steps

```bash
# 1. 进入项目目录
cd d:\Programes\vscode-background

# 2. 编译（选择一种方式）
npm run compile
# 或
tsc -p ./

# 3. 在 VSCode 中按 F5 启动测试

# 4. 在扩展开发主机中：
#    - Ctrl+Shift+P
#    - VSCode Background: Show Diagnostics
#    - 查看输出
```

## 文件更改 / Files Modified

1. ✅ `src/extension.ts` - 添加多路径检测和诊断功能
2. ✅ `package.json` - 添加诊断命令
3. ✅ `TROUBLESHOOTING.md` - 新建故障排除文档

## 期望结果 / Expected Results

编译后，诊断命令应该显示类似：
```
VSCode Background - Diagnostics

VSCode Version: 1.108.1
App Root: C:\Program Files\Microsoft VS Code\resources\app

Current Workbench Path: C:\...\workbench.html

Checked Paths:
✓ C:\Program Files\Microsoft VS Code\resources\app\out\vs\code\electron-sandbox\workbench\workbench.html
✗ C:\Program Files\Microsoft VS Code\resources\app\out\vs\code\electron-browser\workbench\workbench.html
...
```

如果所有路径都显示 ✗，请查看 TROUBLESHOOTING.md 获取帮助。

---

**需要帮助？/ Need Help?**
- 查看: `TROUBLESHOOTING.md`
- 运行: `VSCode Background: Show Diagnostics`
- 报告: GitHub Issues

🎉 **修复完成！请重新编译并测试。**
