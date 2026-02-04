# VSCode Background - 视频背景插件

为您的 Visual Studio Code 工作区设置视频背景（MP4 及其他格式）的扩展插件。

[English](./README.md) | 简体中文

## 功能特性

- **视频背景支持**：支持 MP4、WebM 或 OGG 格式的视频作为 VSCode 背景
- **多视频轮播**：加载多个视频，按可配置的时间间隔自动轮换
- **自动发现**：自动检测并按顺序播放视频
- **自定义设置**：配置不透明度、切换间隔和视频选择
- **简单启用/禁用**：通过简单命令启用或禁用视频背景

## 使用方法

### 启用视频背景

1. 打开命令面板（`Ctrl+Shift+P` 或 `Cmd+Shift+P`）
2. 运行命令：`VSCode Background: Enable Video Background`
3. 选择一个或多个视频文件（MP4、WebM 或 OGG）
4. 出现提示时点击重启

### 禁用视频背景

1. 打开命令面板
2. 运行命令：`VSCode Background: Disable Video Background`
3. 出现提示时点击重启

### 配置设置

1. 打开命令面板
2. 运行命令：`VSCode Background: Configure`
3. 或手动编辑设置：

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

本扩展提供以下设置项：

- `vscodeBackground.enabled`: 启用/禁用视频背景
- `vscodeBackground.videoFiles`: 视频文件路径数组
- `vscodeBackground.switchInterval`: 视频轮换间隔（毫秒），默认：180000（3分钟）
- `vscodeBackground.opacity`: 背景视频不透明度，范围 0-1，默认：0.3

## 支持的视频格式

- MP4 (H.264/H.265)
- WebM (VP8/VP9)
- OGG (Theora)

未来版本将支持更多格式。

## 系统要求

- Visual Studio Code 版本 1.108.1 或更高
- 某些系统可能需要管理员/提升的权限来修改 VSCode 安装文件

## 已知问题

- 启用/禁用后需要重启 VSCode
- 某些系统可能需要提升的权限
- 修改后 VSCode 可能显示"不支持"警告（这是正常现象）

## 开发路线图

- [ ] 支持动态 GIF
- [ ] 支持图片幻灯片
- [ ] 自定义视频滤镜和效果
- [ ] 每个工作区独立视频设置
- [ ] 应用前视频预览

## 更新日志

### 0.0.1

初始版本：
- MP4 视频背景支持
- 多视频轮换
- 可配置的不透明度和切换间隔
- 启用/禁用命令

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
