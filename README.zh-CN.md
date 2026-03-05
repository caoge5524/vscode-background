# VSCode Background - 视频背景插件

为您的 Visual Studio Code 工作区设置视频背景（MP4、WebM、OGG）的扩展 —— **不会在 VSCode 更新时被删除**。

[English](./README.md) | 简体中文

---

## 🔗 资源

- **[GitHub 讨论](https://github.com/caoge5524/vscode-background/discussions)** — 分享和发现社区背景
- **[工坊指南](./WORKSHOP.md)** — 完整的背景分享教程
- **[问题报告](https://github.com/caoge5524/vscode-background/issues)** — 报告 Bug
- **[更新日志](./CHANGELOG.md)** — 版本历史

---

## 功能特性

- **视频背景支持**：支持 MP4、WebM 或 OGG 格式视频作为 VSCode 背景
- **🆕 图片背景支持**：JPG、PNG、GIF（动态）、WebP、BMP、SVG 均可作为背景
- **🆕 每位置独立切换特效**：为每个媒体槽位单独选择切换效果（10 种：zoom、fade、slide-left、slide-right、wipe-up、wipe-down、spiral、flip、blur、instant），含最后→第一的回环切换，特效与位置绑定，不随文件排序改变
- **🆕 ⏩ 立即跳转**：管理媒体中每行右侧的 ⏩ 按钮可无需重启地立即切换当前背景到该媒体
- **视频/图片混排轮播**：视频和图片可自由混合
- **多媒体轮播**：加载多个视频/图片，按可配置间隔自动轮换
- **设置直接编辑**：所有配置在 `settings.json` 中直接编辑，在 VSCode 更新间保存
- **媒体持久保留**：文件路径存储在设置，文件保留在原始位置（不复制）
- **更新后自动恢复**：检测 VSCode 更新后的缺失补丁并提示重新应用
- **卸载自动清理**：`vscode:uninstall` 钉子在扩展卸载时自动移除补丁
- **无限循环模式**：将 `switchInterval` 设为 0 可让媒体永久循环
- **多种主题**：玻璃、深色、霓虹、影院、极光、极简、复古主题
- **完全自定义**：不透明度、切换间隔、主题选择等完全可自定义
- **首次安装欢迎弹窗**：安装后自动引导新用户配置媒体文件路径
- **背景创意工坊**：通过 [GitHub Discussions](https://github.com/caoge5524/vscode-background/discussions) 和 [工坊指南](./WORKSHOP.md) 与社区分享和发现精美背景

## 效果示例

>![效果示例](./images/效果示例.gif)

---

## v2.3.0 新特性

**跳转按钮 + 路径修复**：
- ✅ **⏩ 立即跳转** — 管理媒体中每个文件行新增 ⏩ 按钮，点击后无需重启即可立即把背景切换到该媒体；底层通过 `vscbg-jump.json` 文件 IPC 实现，注入 JS 每 500 ms 轮询
- ✅ **中文及 Unicode 路径修复** — 「添加媒体」命令彻底移除了非 ASCII 字符过滤，现在中文/日文/特殊符号路径可通过文件选择器直接添加- ✅ **播放顺序保持** — 跳转操作仅改变当前播放的媒体，重启 VSCode 后播放顺序自动恢复为原配置，不受跳转影响
> ⚠️ **⏩ 跳转功能需要重新安装背景**：首次使用前请运行 `VSCode Background: 安装 / 更新背景` 以将轮询逻辑写入补丁。

---

## v2.2.0 新特性

**10 种切换特效 + 回环支持**：
- ✅ **10 种切换特效** — `zoom`（缩放淡化）、`fade`（淡入淡出）、`slide-left`（从右滑入）、`slide-right`（从左滑入）、`wipe-up`（从下向上）、`wipe-down`（从上向下）、`spiral`（螺旋弹入）、`flip`（3D 翻转）、`blur`（模糊淡入）、`instant`（瞬切）
- ✅ **回环切换** — `transitions[n-1]` 控制最后一个媒体循环回到第一个的特效；数组长度现为 `videos.length`
- ✅ **位置绑定** — 拖动文件不改变各槽位的切换特效
- ✅ **可视化编辑器升级** — "管理媒体"在每两个文件之间显示 ↕ 行，并在末尾添加 ↩ 回环行
- ✅ **filter 支持** — `blur` 特效及全部特效现在同时对 CSS `filter` 做过渡

> 💡 **特效建议**：`spiral`/`flip` 有冲击感；`slide-left`/`slide-right` 适合幻灯片；`fade`/`zoom` 适合氛围背景；`instant` 适合锐利瞬切。

---

## v2.1.0 新特性

**图片背景支持 + 用户体验增强**：
- ✅ **图片背景** — JPG、PNG、动态 GIF、WebP 现已完全支持作为背景
- ✅ **视频/图片混排轮播** — 在 `vscodeBackground.videos` 中自由混合视频和图片，媒体切换时带淡入淡出过渡
- ✅ **跨平台路径支持** — 移除了英文路径限制，包含中文、日文等任意 Unicode 字符的路径在 Windows、macOS、Linux 上均可正常使用
- ✅ **首次安装欢迎弹窗** — 安装后自动引导用户配置媒体文件路径
- ✅ **打开文件资源管理器按钮** — 快速浏览文件并复制路径到设置
- ✅ **背景创意工坊** — [WORKSHOP.md](./WORKSHOP.md) 已建立为社区指南；通过 GitHub Discussions 分享和发现精美背景

> 💡 **图片使用提示**：将 `"C:\\用户\\图片\\背景.png"` 就像视频路径一样添加到 `vscodeBackground.videos` 即可。

---

## v2.0.0 新特性

**重大架构重写**：
- ✅ **VSCode 更新时视频不再被删除**（v1 主要问题已解决）
- ✅ **单文件补丁方式**（仅修改 `workbench.desktop.main.js`）
- ✅ **视频路径存储在 settings.json**（无需复制到临时文件夹）
- ✅ **命令精简**（4 个命令 vs v1 的 16 个）
- ✅ **自动恢复**（更新后自动检测缺失补丁）
- ✅ **自动清理**（卸载钩子自动处理清理）
- ✅ **模块化代码**（6 个专注模块 vs 1935 行单文件）

参见 [CHANGELOG.md](./CHANGELOG.md) 查看完整升级细节和迁移指南。

## 安装配置

### 首次设置

1. **安装**扩展（从 VSCode 应用市场）
2. **打开设置** (`Ctrl+,`) → 搜索 `VSCode Background`
3. **检查设置**（初次应该为空）
4. **添加视频**：运行命令 `VSCode Background: Add Videos`
5. **应用设置**：运行命令 `VSCode Background: Install / Update`
6. **接受**管理员权限提示 (UAC)
7. **重启** VSCode

### 快速开始（Settings.json 方式）

1. **打开设置 UI** (`Ctrl+,`) → 搜索 "VSCode Background"
2. **找到设置项**（共 5 个）
3. **直接编辑**或使用命令设置值
4. **运行命令** `Install / Update` 应用更改
5. **重启** VSCode

## 使用方法

### 推荐：直接编辑 Settings.json


打开设置 (`Ctrl+,`) 并搜索 "VSCode Background"：

#### 设置界面示例
![设置界面](./images/设置.png)

#### 命令行应用示例
![命令行操作](./images/命令行.png)

```json
{
  "vscodeBackground.enabled": true,
  "vscodeBackground.videos": [
    "C:\\Videos\\background1.mp4",
    "C:\\Videos\\background2.mp4",
    "https://example.com/video.mp4"
  ],
  "vscodeBackground.opacity": 0.8,
  "vscodeBackground.switchInterval": 180,
  "vscodeBackground.theme": "glass"
}
```

然后运行：**`VSCode Background: Install / Update`** 命令


### 管理视频/图片顺序与切换特效

通过命令面板运行：

- **`VSCode Background: 管理媒体`**

打开拖拽排序界面，显示：
- **文件行** — 拖拽调整顺序；点击 ⏩ 立即跳转到该媒体背景；点击 🗑️ 删除
- **切换特效行** (↕) — 位于每对文件之间，从下拉框选择 10 种特效之一
- **回环行** (↩) — 末尾文件下方，控制最后→首帧的回环切换特效

**重要**：切换特效与**槽位绑定**——拖动文件不会改变各位置的特效。

保存后运行 **`VSCode Background: 安装 / 更新背景`** 并重启 VSCode。

### 通过命令

按 `Ctrl+Shift+P` 打开命令面板：

- **`Install / Update`** - 应用 settings.json 中的当前设置（核心命令）
- **`Uninstall`** - 从 workbench 中移除背景（清理命令）
- **`Add Media (视频 / 图片)`** - 打开文件选择器添加视频/图片路径到 settings.json
- **`Manage Media`** - 可视化管理、排序、添加或删除视频/图片
- **`Show Diagnostics`** - 显示调试信息
- **`Open Background Workshop`** - 打开社区分享页面

## 扩展设置

| 设置项                            | 类型    | 默认值  | 说明                                                                                                                                                          |
| --------------------------------- | ------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vscodeBackground.enabled`        | boolean | false   | 启用/禁用背景                                                                                                                                                 |
| `vscodeBackground.videos`         | array   | []      | **媒体文件路径**（本地或 URL）                                                                                                                                |
| `vscodeBackground.transitions`    | array   | []      | **每位置切换特效**（10 种：`zoom`、`fade`、`slide-left`、`slide-right`、`wipe-up`、`wipe-down`、`spiral`、`flip`、`blur`、`instant`；长度 = `videos.length`） |
| `vscodeBackground.opacity`        | number  | 0.8     | 背景不透明度 (0-1)                                                                                                                                            |
| `vscodeBackground.switchInterval` | number  | 180     | 切换间隔（**秒**）(0 = 无限循环)                                                                                                                              |
| `vscodeBackground.theme`          | string  | "glass" | 主题风格                                                                                                                                                      |

### 视频路径格式

所有格式都支持，会自动转换：

```json
"vscodeBackground.videos": [
  "C:\\Users\\You\\Videos\\bg.mp4",          // Windows 绝对路径
  "/home/user/videos/bg.mp4",                // Linux/Mac 绝对路径
  "file:///C:/Videos/video.mp4",             // file:// URL
  "https://example.com/background.mp4",      // HTTPS URL
  "data:video/mp4;base64,..."                // Base64 编码视频
]
```

**重要**：视频文件**不会被复制到任何地方**。路径指向原始位置。文件在 VSCode 更新中保留。

## 命令列表

| 命令               | 用途                                                  |
| ------------------ | ----------------------------------------------------- |
| `Install / Update` | **核心** - 使用 settings.json 中的当前设置应用背景    |
| `Uninstall`        | **清理** - 完全从 VSCode 中移除背景                   |
| `Add Videos`       | **辅助** - 打开文件选择器添加视频路径到 settings.json |
| `Show Diagnostics` | **调试** - 显示扩展和系统信息                         |

## 为什么 v2.0.0 更好

### v1 的问题
- 视频存储在 VSCode 安装目录内的 `background-videos/` 文件夹
- 文件夹在每次 VSCode 更新时被删除（维护、小版本、大版本）
- 用户不得不反复添加视频
- 非常令人沮丧的用户体验 ❌

### v2 的解决方案
- 视频**路径**存储在 `settings.json` 中（在更新中保存）
- 实际文件保留在用户原始位置（不被 VSCode 触及）
- 补丁检测到缺失文件并提示用户重新应用
- 无文件复制，无文件夹管理 ✅

```
v1 流程：选择视频 → 复制到 background-videos/ → VSCode 更新 → 被删除 ❌
v2 流程：选择视频 → 路径存储到 settings.json → VSCode 更新 → 路径仍在 ✅
```

## 重要说明

### ⚠️ 卸载前

**只需运行卸载命令** - 清理钩子会自动处理：

1. 打开命令面板
2. 运行：`VSCode Background: Uninstall`
3. 然后卸载扩展

`vscode:uninstall` 钉子会自动从 `workbench.desktop.main.js` 中移除补丁。

### 从 v1 升级

v2 会自动：
- ✅ 读取旧的 v1 设置
- ✅ 将视频路径迁移到新格式
- ✅ 清理旧补丁文件
- ✅ 提示应用新背景

**无数据丢失！**

### "安装似乎损坏"警告

VSCode 显示此警告是因为我们修改了某些文件。完全无害 - 可以忽略或关闭。

扩展通过注入 CSS 来自动隐藏这个通知。

### 管理员权限

首次应用设置需要**管理员权限**：

✅ 正常且预期（修改 VSCode 核心系统文件）
✅ 在 UAC 提示上点击"是"
❌ 如果拒绝，背景将不会生效

脚本位置：扩展目录中的临时 PowerShell 脚本
范围：仅修改 VSCode 的 `workbench.desktop.main.js` 文件

### 文件被占用/拒绝访问错误弹窗

![VSCode拒绝访问报错](./images/pop-up1.png)

如上图所示，若出现“拒绝访问”或“Failed to create file handle”报错弹窗，这是因为 VSCode 进程未完全退出，导致部分文件被占用。

**此报错不会影响您的文件或系统安全**

- 解决方法：
  1. 关闭所有 VSCode 窗口
  2. 删除PkgExplorerPlugin.dll文件
  >![1772265853829](./images/solution1.png)

## 支持的媒体格式

### 视频

- **MP4** (H.264/H.265)
- **WebM** (VP8/VP9)
- **OGG** (Theora)
- **HTTPS URLs**（流式播放，不下载）

### 图片

- **JPG / JPEG**
- **PNG**
- **GIF**（支持动态 GIF）
- **WebP**
- **BMP**
- **SVG**

视频和图片可在 `vscodeBackground.videos` 中**自由混排**，实现混合轮播背景幻灯片。

## 系统要求

- VSCode 1.108.1 或更高版本
- Windows/Mac/Linux
- 管理员权限（仅首次设置）

## 故障排除

### 应用后背景不显示

1. 确保**重启 VSCode**（重载不够）
2. 运行 `Show Diagnostics` 验证路径
3. 检查视频文件是否仍在指定路径中存在

### "应用失败"错误

1. 关闭所有 VSCode 窗口
2. 以管理员身份运行 VSCode
3. 重试

### 设置未保存

1. 检查 `settings.json` 的文件权限
2. 确保对 VSCode 配置目录有写入权限
3. 重启 VSCode

### 视频无法播放

- 检查格式（支持 MP4/WebM/OGG）
- 尝试其他视频文件
- 验证文件路径正确
- 运行诊断：`Show Diagnostics` 命令

## 更新日志

### v2.0.0 - 2026-02-15

参见 [CHANGELOG.md](./CHANGELOG.md#200---2026-02-15) 了解完整详情。

**关键改进**：
- 视频现在在 VSCode 更新间保持
- 简化的设置模型（直接编辑 settings.json）
- 更新后自动恢复
- 卸载时自动清理
- 更好的错误消息
- 更清晰的单文件补丁方式

### 从 v1 迁移

设置会自动迁移。只需：
1. 打开设置
2. 验证 `vscodeBackground.videos` 包含您的视频（路径，不是复制）
3. 运行 `Install / Update`
4. 接受 UAC 提示
5. 重启

---

## 开发者指南

### 构建

```bash
npm install
npm run compile
```

### 监视模式

```bash
npm run watch
```

### 测试

```bash
npm run test
```

### 打包

```bash
vsce package
```

### 项目结构

```
src/
  ├── extension.ts          # 入口，命令注册
  ├── background.ts         # 核心逻辑（安装、卸载、诊断）
  ├── patchGenerator.ts     # 生成要注入的 JS 代码
  ├── patchFile.ts          # 补丁读写，版本检测
  ├── vscodePath.ts         # 路径工具，URL 转换
  ├── constants.ts          # 版本，标记，文件名
  ├── uninstall.ts          # 卸载钩子脚本
  └── test/
      └── extension.test.ts # 测试套件
```

**享受您的视频背景！**

## 未来规划

### 计划中的功能

- ✅ 图片背景支持（JPG、PNG、GIF）
- ✅ 10 种切换特效（含回环）
- 🎨 更多主题样式（渐变、暗角等）
- ⚙️ 每个工作区独立配置
- 🔊 音量控制和音频设置
- 🎯 基于时间的背景切换
- 📦 内置背景库
- 🌐 云同步能力

您的反馈助力我们持续改进！🚀
