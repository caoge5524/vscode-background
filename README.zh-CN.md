# VSCode Background - 视频背景插件

为您的 Visual Studio Code 工作区设置视频背景（MP4 及其他格式）的扩展插件。

[English](./README.md) | 简体中文

## 功能特性

- **视频背景支持**：支持 MP4、WebM 或 OGG 格式的视频作为 VSCode 背景
- **多视频轮播**：加载多个视频，按可配置的时间间隔自动轮换
- **无限循环模式**：将切换间隔设为 0 可让单个视频永久循环播放
- **自动发现**：自动检测并按顺序播放视频
- **自定义设置**：配置不透明度、切换间隔和视频选择
- **简单启用/禁用**：通过简单命令启用或禁用视频背景
- **自动应用**：修改设置后自动应用更改（需要一次管理员权限）
- **实时状态**：显示当前背景状态和配置信息

## 安装配置

### 首次使用（Windows）

由于 Windows 文件权限限制，首次应用设置时会弹出**管理员权限提示**，这是正常现象。

1. 打开设置（`Ctrl+,`）
2. 搜索 `VSCode Background`
3. 配置视频文件、不透明度、切换间隔等
4. 点击 **Apply Settings** 或等待自动提示
5. 接受管理员权限提示
6. 重启 VSCode

### 快速开始

**通过设置界面（推荐）：**

1. 打开设置 → 搜索 "VSCode Background"
2. 找到 **Video Files** 设置 → 点击 "Add Videos" 命令
3. 选择视频文件
4. 调整 **Opacity** (0-1) 和 **Switch Interval**
5. 确保 **Enabled** 已勾选
6. 自动弹出 "Apply now?" → 点击 **Apply**
7. 接受管理员提示
8. 重启 VSCode

## 使用方法

### 推荐方式：通过设置界面

1. **打开设置** (`Ctrl+,`) → 搜索 "VSCode Background"
2. **配置视频**：
   - 点击 "Add Videos" 命令添加视频文件
   - 或使用命令面板：`VSCode Background: Add Videos`
3. **调整参数**：
   - **Enabled**：勾选启用背景
   - **Opacity**：调整透明度 (推荐 0.5-0.9)
   - **Switch Interval**：切换间隔毫秒数 (0 = 无限循环)
4. **应用**: 修改后会自动提示 "Apply now?"
5. **Status**: "Current Status" 显示当前状态

### 命令方式

快捷键：`Ctrl+Shift+P` 打开命令面板

- `Add Videos` - 添加视频文件
- `Remove Video` - 删除视频文件
- `Manage Videos` - 查看播放列表
- `Apply Settings` - 应用当前设置
- `Refresh Status` - 刷新状态显示
- `Set Infinite Loop` - 快速切换无限循环
- `Set Opacity` - 设置背景透明度（仅命令）
- `Set Switch Interval` - 设置轮播间隔（仅命令）
- `Show Videos Folder` - 显示 background-videos 路径及命名规则

### 配置设置

设置项为**只读**，仅用于显示当前数据。

请使用命令进行修改：

- `VSCode Background: Set Opacity`
- `VSCode Background: Set Switch Interval`
- `VSCode Background: Add Videos` / `Remove Video`
- `VSCode Background: Enable Video Background` / `Disable Video Background`

## 扩展设置

| 设置项                            | 类型    | 默认值            | 说明                                              |
| --------------------------------- | ------- | ----------------- | ------------------------------------------------- |
| `vscodeBackground.enabled`        | boolean | true              | **只读** - 使用启用/禁用命令修改                  |
| `vscodeBackground.videoFiles`     | array   | []                | **只读** - 使用添加/删除/管理命令修改             |
| `vscodeBackground.switchInterval` | number  | 180000            | **只读** - 使用 Set Switch Interval（最小 10000） |
| `vscodeBackground.opacity`        | number  | 0.8               | **只读** - 使用 Set Opacity（0-1）                |
| `vscodeBackground.currentStatus`  | string  | "Not initialized" | **只读** - 显示当前背景状态                       |

### 无限循环模式

将 `switchInterval` 设为 `0` 启用无限循环模式 - 第一个视频将永久循环播放，不会切换到其他视频。

也可以运行命令：`VSCode Background: Set Infinite Loop (No Switch)`

## 命令列表

| 命令                                 | 说明                                    |
| ------------------------------------ | --------------------------------------- |
| `Enable Video Background`            | 使用当前设置启用视频背景（旧方式）      |
| `Disable Video Background`           | 移除视频背景（旧方式）                  |
| `Add Videos`                         | **推荐** - 添加视频文件到播放列表       |
| `Remove Video`                       | 从播放列表移除视频                      |
| `Manage Videos`                      | 查看和管理视频播放列表                  |
| `Apply Settings`                     | **核心** - 应用当前设置（自动运行脚本） |
| `Refresh Status`                     | 刷新状态显示                            |
| `Configure`                          | 快速打开设置                            |
| `Fix 'Installation Corrupt' Warning` | 更新校验和以移除 VSCode 警告            |
| `Set Infinite Loop`                  | 切换无限循环模式                        |
| `Set Opacity`                        | 设置背景透明度（仅命令）                |
| `Set Switch Interval`                | 设置轮播间隔（仅命令）                  |
| `Show Videos Folder`                 | 显示 background-videos 路径及命名规则   |
| `Cleanup (Run Before Uninstall)`     | **重要** - 卸载前必须运行，移除所有注入 |
| `Show Diagnostics`                   | 显示调试信息                            |

## 重要说明

### ⚠️ 卸载前必读

**卸载此扩展前必须运行清理命令！**

1. 打开命令面板
2. 运行：`VSCode Background: Cleanup (Run Before Uninstall)`
3. 然后卸载扩展

如果直接卸载而不清理，注入的代码将保留在 VSCode 的文件中。

### "安装似乎损坏"警告

启用背景后，VSCode 可能显示"安装似乎损坏"警告。这是正常现象，可通过以下方式消除：

- 运行：`VSCode Background: Fix 'Installation Corrupt' Warning`
- 或直接点击"不再显示"

### 权限问题

**首次应用设置时会弹出管理员权限提示，这是正常的。**

- ✅ 点击"是"允许脚本修改 VSCode 文件
- ❌ 如果拒绝，背景将不会生效
- 📝 脚本位于扩展目录：`apply-settings.ps1`
- 🔒 脚本只修改 VSCode 的 HTML/CSS 文件，不涉及系统文件

如果遇到权限错误：

1. 关闭所有 VSCode 窗口
2. 以管理员身份运行 VSCode
3. 或手动以管理员身份运行脚本：扩展目录下的 `apply-settings.ps1`

### 手动添加视频

可将视频手动放入 `background-videos` 文件夹。使用 `Show Videos Folder` 命令查看准确路径。

命名规则（必须）：

- `bg1.mp4`, `bg2.mp4`, `bg3.mp4` ...
- 按从 1 开始的顺序自动发现

## 支持的视频格式

- MP4 (H.264/H.265)
- WebM (VP8/VP9)
- OGG (Theora)

## 系统要求

- Visual Studio Code 版本 1.108.1 或更高
- Windows：首次安装可能需要管理员权限

## 故障排除

### 背景不显示

1. 运行 `Show Diagnostics` 命令检查路径
2. 确保启用后已重启 VSCode
3. 检查视频文件是否存在且有效

### 权限被拒绝

1. 确保接受管理员权限提示
2. 关闭所有 VSCode 窗口
3. 以管理员身份运行 VSCode
4. 或手动以管理员身份运行脚本：扩展目录下的 `apply-settings.ps1`

### 视频不播放

- 检查视频格式（MP4/WebM/OGG）
- 尝试其他视频文件
- 检查浏览器控制台错误（帮助 → 切换开发人员工具）

## 更新日志

### 1.0.0

- 视频背景支持（MP4、WebM、OGG）
- 多视频轮播，可配置间隔
- 无限循环模式（switchInterval = 0）
- 权限管理工具
- 安全卸载的清理命令
- 修复"安装似乎损坏"警告的校验和工具

---

## 开发者指南

### 构建

```bash
npm install
npm run compile
```

### 测试

```bash
npm run test
```

### 打包

```bash
vsce package
```

**享受您的视频背景！**

## 未来规划

### 计划中的功能

我们正在积极开发以下功能，以提升您的 VSCode 体验：

#### 🎬 视频切换特效
- **淡入淡出效果**：视频切换时的平滑过渡动画
- **滑动切换**：左右滑动、上下滑动等多种切换方式
- **缩放效果**：视频缩放进出的动画效果
- **自定义特效时长**：可配置特效动画持续时间

#### 🎨 更多主题样式
- **渐变主题**：彩色渐变叠加效果
- **模糊主题**：可调节的背景模糊强度
- **暗角效果**：四周暗角聚焦中心
- **色彩调整**：饱和度、亮度、对比度调节
- **自定义CSS主题**：允许用户编写自定义主题样式

#### 🖼️ 图片背景支持
- **静态图片背景**：支持 JPG、PNG、GIF 等格式
- **图片轮播**：多张图片按时间切换
- **图片与视频混合播放**：在同一播放列表中混合图片和视频
- **图片滤镜效果**：黑白、复古、鲜艳等滤镜

#### ⚙️ 高级配置
- **播放控制**：
  - 随机播放模式
  - 单曲循环/列表循环
  - 播放速度调节（0.5x - 2x）
  - 视频音量控制（默认静音）
- **时间段配置**：
  - 根据时间段自动切换不同背景
  - 工作时间/休息时间不同背景
  - 节假日特殊背景

#### 📦 内容管理
- **背景库**：
  - 内置精选背景视频/图片库
  - 在线下载社区分享的背景
  - 收藏和评分系统
- **智能分类**：
  - 按类型分类（自然、科技、抽象等）
  - 按心情分类（平静、活力、专注等）
  - 自定义标签系统

#### 🔧 性能优化
- **资源预加载**：提前加载下一个视频，实现无缝切换
- **内存优化**：智能管理视频资源，降低内存占用
- **GPU 加速**：利用硬件加速提升渲染性能
- **低性能模式**：在低配置设备上自动降低画质

#### 🌐 跨平台同步
- **云同步**：在不同设备间同步背景设置
- **配置导入/导出**：一键备份和恢复配置
- **团队共享**：团队成员共享背景配置

#### 🎯 交互增强
- **手势控制**：通过快捷键快速切换背景
- **右键菜单**：在编辑器右键菜单中快速访问功能
- **状态栏显示**：在状态栏显示当前背景信息
- **预览功能**：应用前预览背景效果

### 反馈与建议

我们非常重视用户的反馈！如果您有任何建议或想法，请通过以下方式联系我们：
- 在 GitHub 上提交 Issue
- 在扩展市场留下评论
- 通过邮件发送反馈

您的支持是我们持续改进的动力！🚀
