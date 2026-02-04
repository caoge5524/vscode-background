# VSCode Background 扩展 - 测试与发布指南

简体中文 | [English](./TESTING-PUBLISHING.md)

## 📋 目录

1. [前置要求](#前置要求)
2. [开发环境设置](#开发环境设置)
3. [测试指南](#测试指南)
4. [构建与打包](#构建与打包)
5. [发布到市场](#发布到市场)
6. [发布后工作](#发布后工作)

---

## 🔧 前置要求

### 必需工具

1. **Node.js**（v16 或更高版本）
   ```bash
   node --version  # 应该是 v16+
   npm --version
   ```

2. **Visual Studio Code**（v1.108.1 或更高版本）
   ```bash
   code --version
   ```

3. **TypeScript**
   ```bash
   npm install -g typescript
   ```

4. **VSCE（Visual Studio Code 扩展管理器）**
   ```bash
   npm install -g @vscode/vsce
   ```

5. **Git**（用于版本控制）
   ```bash
   git --version
   ```

### 可选工具

- **ESLint**（代码质量检查）
- **Prettier**（代码格式化）

---

## 🚀 开发环境设置

### 1. 克隆并安装依赖

```bash
cd d:\Programes\vscode-background
npm install
```

### 2. 验证安装

```bash
npm run compile
```

预期输出：无错误，编译后的文件在 `out/` 目录中

### 3. 在 VSCode 中打开

```bash
code .
```

---

## 🧪 测试指南

### 第一阶段：单元测试（可选）

在 `src/test/` 中创建测试文件：

```bash
npm run test
```

### 第二阶段：手动集成测试

#### 步骤 1：启动扩展开发主机

1. 在 VSCode 中打开项目
2. 按 `F5` 或点击"运行和调试" → "运行扩展"
3. 会打开一个新的 VSCode 窗口（扩展开发主机）

#### 步骤 2：测试启用命令

1. 在扩展开发主机中：
   - 按 `Ctrl+Shift+P`（Windows/Linux）或 `Cmd+Shift+P`（Mac）
   - 输入：`VSCode Background: Enable Video Background`
   - 选择一个或多个测试 MP4 文件
   - 出现提示时点击"重启"

2. **预期结果**：
   - VSCode 重启
   - 视频背景出现在所有 UI 元素后面
   - 视频自动播放（静音）

#### 步骤 3：测试视频轮换（多个视频）

1. 使用 2 个以上视频启用背景
2. 等待 3 分钟（默认间隔）
3. **预期结果**：视频自动切换到下一个

#### 步骤 4：测试配置

1. 按 `Ctrl+Shift+P`
2. 运行：`VSCode Background: Configure`
3. 检查显示的当前视频文件

#### 步骤 5：测试禁用命令

1. 按 `Ctrl+Shift+P`
2. 运行：`VSCode Background: Disable Video Background`
3. 点击"重启"
4. **预期结果**：恢复原始 VSCode 外观

#### 步骤 6：测试设置持久化

1. 使用特定设置启用背景：
   ```json
   {
     "vscodeBackground.opacity": 0.5,
     "vscodeBackground.switchInterval": 60000
   }
   ```
2. 重启 VSCode
3. **预期结果**：设置保留，应用不透明度/间隔

### 第三阶段：错误处理测试

#### 测试用例 1：无效文件路径
- 使用不存在的文件路径启用
- **预期**：显示错误消息

#### 测试用例 2：不支持的格式
- 尝试选择 `.txt` 或其他非视频文件
- **预期**：文件选择器过滤器阻止选择

#### 测试用例 3：权限被拒绝
- 在需要管理员权限的系统上测试
- **预期**：显示清晰的错误消息和说明

#### 测试用例 4：损坏的视频文件
- 使用损坏/不完整的 MP4 文件
- **预期**：自动跳到下一个视频

### 第四阶段：跨平台测试

在多个平台上测试：
- ✅ Windows 10/11
- ✅ macOS（Intel 和 Apple Silicon）
- ✅ Linux（Ubuntu、Fedora）

### 第五阶段：性能测试

1. **内存使用**：
   - 打开任务管理器 / 活动监视器
   - 使用大视频文件启用背景
   - 监控 VSCode 内存消耗
   - **目标**：额外内存 < 500MB

2. **CPU 使用率**：
   - 视频播放期间监控 CPU
   - **目标**：平均 CPU < 10%

3. **启动时间**：
   - 测量有/无扩展时 VSCode 启动时间
   - **目标**：额外启动时间 < 2 秒

---

## 📦 构建与打包

### 步骤 1：更新版本和元数据

编辑 `package.json`：

```json
{
  "version": "0.0.1",
  "publisher": "your-publisher-name",
  "displayName": "VSCode Background",
  "description": "为 VSCode 设置视频背景",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/vscode-background"
  }
}
```

### 步骤 2：创建图标（可选）

创建 `images/icon.png`：
- 大小：128x128 像素
- 格式：PNG
- 内容：扩展 logo

### 步骤 3：更新 README 和 CHANGELOG

更新 `CHANGELOG.md`：

```markdown
# 更新日志

## [0.0.1] - 2026-01-29

### 新增
- 初始版本发布
- MP4/WebM/OGG 视频背景支持
- 多视频轮换
- 可配置的不透明度和切换间隔
```

### 步骤 4：编译 TypeScript

```bash
npm run compile
```

验证没有编译错误。

### 步骤 5：运行代码检查

```bash
npm run lint
```

修复任何代码检查错误。

### 步骤 6：打包扩展

```bash
vsce package
```

**输出**：`vscode-background-0.0.1.vsix`

### 步骤 7：测试 .vsix 安装

```bash
code --install-extension vscode-background-0.0.1.vsix
```

测试已安装的扩展是否正常工作。

---

## 🌐 发布到市场

### 前置要求

1. **创建 Azure DevOps 账户**
   - 访问：https://dev.azure.com
   - 使用 Microsoft 账户注册

2. **创建个人访问令牌（PAT）**
   - 前往：https://dev.azure.com → 用户设置 → 个人访问令牌
   - 点击"新建令牌"
   - 名称：`vscode-extension-publishing`
   - 组织：所有可访问的组织
   - 范围：**Marketplace** → **管理**
   - 过期时间：1 年（或自定义）
   - 复制令牌（安全保存！）

3. **创建发布者账户**
   - 访问：https://marketplace.visualstudio.com/manage
   - 点击"创建发布者"
   - 发布者 ID：`your-publisher-name`（必须与 package.json 匹配）
   - 显示名称：您的显示名称

### 发布步骤

#### 步骤 1：登录到 VSCE

```bash
vsce login your-publisher-name
```

提示时输入您的个人访问令牌。

#### 步骤 2：发布扩展

```bash
vsce publish
```

或发布特定版本：

```bash
vsce publish 0.0.1
vsce publish patch  # 0.0.1 → 0.0.2
vsce publish minor  # 0.0.1 → 0.1.0
vsce publish major  # 0.0.1 → 1.0.0
```

#### 步骤 3：验证发布

1. 访问：https://marketplace.visualstudio.com/items?itemName=your-publisher-name.vscode-background
2. 检查扩展页面是否正确加载
3. 验证 README、截图、元数据

---

## 🎯 发布后工作

### 1. 更新代码仓库

```bash
git tag v0.0.1
git push origin v0.0.1
```

### 2. 创建 GitHub 发布（可选）

1. 前往：https://github.com/yourusername/vscode-background/releases
2. 点击"创建新发布"
3. 标签：`v0.0.1`
4. 标题：`v0.0.1 - 初始版本`
5. 描述：从 CHANGELOG.md 复制
6. 附加：`vscode-background-0.0.1.vsix`

### 3. 监控分析数据

检查市场仪表板：
- 安装数量
- 评分和评论
- 问答部分

### 4. 回复反馈

- 监控 GitHub Issues
- 回复市场问答
- 根据用户问题更新文档

### 5. 规划下一个版本

在 GitHub Projects 中创建路线图：
- Bug 修复
- 功能请求
- 性能改进

---

## 🐛 故障排除

### 问题："vsce: command not found"

**解决方案**：
```bash
npm install -g @vscode/vsce
```

### 问题："Error: Missing publisher name"

**解决方案**：在 `package.json` 中添加 publisher：
```json
{
  "publisher": "your-publisher-name"
}
```

### 问题："Error: Extension manifest missing"

**解决方案**：确保 `package.json` 包含所有必需字段：
- name、version、engines、publisher、displayName

### 问题："Publishing failed: 401 Unauthorized"

**解决方案**：
1. 重新生成个人访问令牌
2. 再次运行 `vsce login your-publisher-name`

### 问题：扩展未出现在市场中

**解决方案**：等待 5-10 分钟进行索引，然后刷新

---

## 📊 发布检查清单

每次发布前：

- [ ] 更新 `package.json` 中的版本
- [ ] 更新 `CHANGELOG.md`
- [ ] 运行 `npm run compile`（无错误）
- [ ] 运行 `npm run lint`（无错误）
- [ ] 测试扩展功能（F5）
- [ ] 在多个平台上测试
- [ ] 如需要更新 README
- [ ] 创建 git 标签
- [ ] 运行 `vsce package`
- [ ] 测试 .vsix 安装
- [ ] 运行 `vsce publish`
- [ ] 在市场上验证
- [ ] 创建 GitHub 发布
- [ ] 在社交媒体上宣布（可选）

---

## 🔄 持续集成（可选）

### GitHub Actions 工作流

创建 `.github/workflows/publish.yml`：

```yaml
name: Publish Extension

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 16
      - run: npm install
      - run: npm run compile
      - run: npm run lint
      - run: npx vsce package
      - run: npx vsce publish -p ${{ secrets.VSCE_TOKEN }}
```

在 GitHub 仓库设置中添加 `VSCE_TOKEN` 密钥。

---

## 📚 其他资源

- [VSCode 扩展 API](https://code.visualstudio.com/api)
- [扩展指南](https://code.visualstudio.com/api/references/extension-guidelines)
- [发布扩展](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [扩展清单](https://code.visualstudio.com/api/references/extension-manifest)

---

**祝您的扩展发布顺利！🚀**
