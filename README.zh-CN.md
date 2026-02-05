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
- **权限工具**：内置工具处理 Windows 文件权限问题

## 安装配置

### 首次安装（Windows）

由于 Windows 文件权限限制，首次使用可能需要运行以下命令之一：

1. **方案 A - 授权权限（推荐）**：

   - 打开命令面板（`Ctrl+Shift+P`）
   - 运行：`VSCode Background: Grant File Permissions (Run Once)`
   - 接受管理员提示
   - 重启 VSCode
2. **方案 B - 生成安装脚本**：

   - 运行：`VSCode Background: Generate Install Script (Manual)`
   - 将脚本保存到桌面
   - 右键点击脚本 → "使用 PowerShell 运行"并以管理员身份执行

## 使用方法

### 启用视频背景

1. 打开命令面板（`Ctrl+Shift+P` 或 `Cmd+Shift+P`）
2. 运行：`VSCode Background: Add Videos` - 选择视频文件
3. 运行：`VSCode Background: Enable Video Background`
4. 出现提示时点击重启

### 禁用视频背景

1. 打开命令面板
2. 运行：`VSCode Background: Disable Video Background`
3. 出现提示时点击重启

### 配置设置

可通过以下方式配置：

- 命令面板 → `VSCode Background: Configure`
- 或直接编辑 settings.json：

```json
{
  "vscodeBackground.enabled": true,
  "vscodeBackground.videoFiles": [
    "C:\\Videos\\background1.mp4",
    "C:\\Videos\\background2.mp4"
  ],
  "vscodeBackground.switchInterval": 180000,
  "vscodeBackground.opacity": 0.3
}
```

## 扩展设置

| 设置项                              | 类型    | 默认值 | 说明                                             |
| ----------------------------------- | ------- | ------ | ------------------------------------------------ |
| `vscodeBackground.enabled`        | boolean | true   | 启用/禁用视频背景                                |
| `vscodeBackground.videoFiles`     | array   | []     | 视频文件路径列表                                 |
| `vscodeBackground.switchInterval` | number  | 180000 | 视频切换间隔（毫秒），0 = 无限循环，最小值：5000 |
| `vscodeBackground.opacity`        | number  | 0.3    | 背景视频不透明度（0-1）                          |

### 无限循环模式

将 `switchInterval` 设为 `0` 启用无限循环模式 - 第一个视频将永久循环播放，不会切换到其他视频。

也可以运行命令：`VSCode Background: Set Infinite Loop (No Switch)`

## 命令列表

| 命令                                   | 说明                             |
| -------------------------------------- | -------------------------------- |
| `Enable Video Background`            | 使用当前设置启用视频背景         |
| `Disable Video Background`           | 移除视频背景                     |
| `Add Videos`                         | 添加视频文件到播放列表           |
| `Remove Video`                       | 从播放列表移除视频               |
| `Manage Videos`                      | 查看和管理视频播放列表           |
| `Configure`                          | 快速访问设置                     |
| `Grant File Permissions`             | Windows 一次性权限修复           |
| `Generate Install Script`            | 创建手动安装脚本                 |
| `Fix 'Installation Corrupt' Warning` | 更新校验和以移除 VSCode 警告     |
| `Set Infinite Loop`                  | 切换无限循环模式                 |
| `Cleanup (Run Before Uninstall)`     | **重要**：移除所有注入代码 |
| `Show Diagnostics`                   | 调试信息                         |

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

如果遇到"权限被拒绝"错误：

1. 尝试运行：`VSCode Background: Grant File Permissions (Run Once)`
2. 或生成安装脚本并以管理员身份运行
3. 确保关闭所有其他 VSCode 实例

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

1. 运行 `Grant File Permissions` 命令
2. 或以管理员身份运行 VSCode
3. 尝试前关闭所有 VSCode 窗口

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
