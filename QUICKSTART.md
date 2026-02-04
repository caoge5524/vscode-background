# Quick Start Guide - VSCode Background Extension

[English](#english) | [简体中文](#简体中文)

---

## English

### 🚀 Getting Started in 5 Steps

#### 1. Install Dependencies
```bash
cd d:\Programes\vscode-background
npm install
```

#### 2. Compile TypeScript
```bash
npm run compile
```

#### 3. Test the Extension
Press `F5` in VSCode to launch Extension Development Host

#### 4. Try Commands
In the new VSCode window:
- Press `Ctrl+Shift+P`
- Run: `VSCode Background: Enable Video Background`
- Select your MP4 files
- Restart and enjoy!

#### 5. Package for Distribution
```bash
npm install -g @vscode/vsce
vsce package
```

### 📝 Key Files

- `src/extension.ts` - Main extension logic
- `package.json` - Extension manifest and configuration
- `README.md` / `README.zh-CN.md` - User documentation
- `TESTING-PUBLISHING.md` - Complete testing & publishing guide

### 🔧 Development Commands

```bash
npm run compile     # Compile TypeScript
npm run watch       # Watch mode compilation
npm run lint        # Run ESLint
npm run test        # Run tests
vsce package        # Create .vsix package
vsce publish        # Publish to marketplace
```

### 📦 Before Publishing

1. Update `package.json`:
   - Set `publisher` field
   - Update `version`
   - Add `repository` URL

2. Create icon: `images/icon.png` (128x128)

3. Get Personal Access Token from Azure DevOps

4. Login: `vsce login your-publisher-name`

5. Publish: `vsce publish`

### 📚 Documentation

- **User Guide**: `README.md`
- **Implementation Details**: `IMPLEMENTATION.md`
- **Testing & Publishing**: `TESTING-PUBLISHING.md`
- **Change Log**: `CHANGELOG.md`

---

## 简体中文

### 🚀 5 步快速开始

#### 1. 安装依赖
```bash
cd d:\Programes\vscode-background
npm install
```

#### 2. 编译 TypeScript
```bash
npm run compile
```

#### 3. 测试扩展
在 VSCode 中按 `F5` 启动扩展开发主机

#### 4. 尝试命令
在新的 VSCode 窗口中：
- 按 `Ctrl+Shift+P`
- 运行：`VSCode Background: Enable Video Background`
- 选择您的 MP4 文件
- 重启并享受！

#### 5. 打包分发
```bash
npm install -g @vscode/vsce
vsce package
```

### 📝 关键文件

- `src/extension.ts` - 主扩展逻辑
- `package.json` - 扩展清单和配置
- `README.md` / `README.zh-CN.md` - 用户文档
- `TESTING-PUBLISHING.md` - 完整的测试和发布指南

### 🔧 开发命令

```bash
npm run compile     # 编译 TypeScript
npm run watch       # 监视模式编译
npm run lint        # 运行 ESLint
npm run test        # 运行测试
vsce package        # 创建 .vsix 包
vsce publish        # 发布到市场
```

### 📦 发布前准备

1. 更新 `package.json`：
   - 设置 `publisher` 字段
   - 更新 `version`
   - 添加 `repository` URL

2. 创建图标：`images/icon.png`（128x128）

3. 从 Azure DevOps 获取个人访问令牌

4. 登录：`vsce login your-publisher-name`

5. 发布：`vsce publish`

### 📚 文档

- **用户指南**：`README.md` / `README.zh-CN.md`
- **实施细节**：`IMPLEMENTATION.md` / `IMPLEMENTATION.zh-CN.md`
- **测试与发布**：`TESTING-PUBLISHING.md` / `TESTING-PUBLISHING.zh-CN.md`
- **更新日志**：`CHANGELOG.md`

---

**Happy Coding! / 编码愉快！** 🎉
