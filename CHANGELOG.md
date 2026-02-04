# Change Log

All notable changes to the "vscode-background" extension will be documented in this file.

[English](#english) | [简体中文](#简体中文)

---

## English

### [0.0.1] - 2026-01-29

#### Added
- 🎬 Initial release of VSCode Background extension
- 🎥 MP4 video background support
- 🎞️ WebM and OGG video format support
- 🔄 Multi-video rotation with configurable intervals (default: 3 minutes)
- 🎨 Adjustable background opacity (0-1 range, default: 0.3)
- ⚙️ Three user commands:
  - Enable Video Background
  - Disable Video Background
  - Configure Settings
- 📝 Configuration settings for video files, switch interval, and opacity
- 🔧 Automatic workbench.html backup and restoration
- 🌐 Multi-language support (English & Chinese)
- 📚 Comprehensive documentation (README, Implementation Guide, Testing & Publishing Guide)

#### Features
- Auto-discovery of video files (bg1.mp4, bg2.mp4, ...)
- Muted autoplay to bypass browser restrictions
- Automatic error recovery (skips failed videos)
- Resource management (cleans up old video elements)
- Visibility optimization (pauses when VSCode is hidden)
- Full viewport coverage with responsive design

#### Known Issues
- Requires VSCode restart after enable/disable
- May require elevated permissions on some systems
- VSCode shows "unsupported" warning (safe to ignore)

---

## 简体中文

### [0.0.1] - 2026-01-29

#### 新增
- 🎬 VSCode Background 扩展初始版本发布
- 🎥 MP4 视频背景支持
- 🎞️ WebM 和 OGG 视频格式支持
- 🔄 多视频轮换，可配置间隔（默认：3 分钟）
- 🎨 可调整的背景不透明度（0-1 范围，默认：0.3）
- ⚙️ 三个用户命令：
  - 启用视频背景
  - 禁用视频背景
  - 配置设置
- 📝 视频文件、切换间隔和不透明度的配置设置
- 🔧 自动 workbench.html 备份和恢复
- 🌐 多语言支持（英文和中文）
- 📚 完整文档（README、实施指南、测试和发布指南）

#### 功能特性
- 自动发现视频文件（bg1.mp4、bg2.mp4...）
- 静音自动播放以绕过浏览器限制
- 自动错误恢复（跳过失败的视频）
- 资源管理（清理旧视频元素）
- 可见性优化（VSCode 隐藏时暂停）
- 响应式设计的全视口覆盖

#### 已知问题
- 启用/禁用后需要重启 VSCode
- 某些系统可能需要提升的权限
- VSCode 显示"不支持"警告（可以安全忽略）

---

## Future Roadmap / 未来路线图

### Planned Features / 计划功能
- [ ] Animated GIF support / 动态 GIF 支持
- [ ] Image slideshow mode / 图片幻灯片模式
- [ ] Custom video filters (blur, brightness, contrast) / 自定义视频滤镜
- [ ] Per-workspace video settings / 每个工作区独立视频设置
- [ ] Video preview before applying / 应用前视频预览
- [ ] Remote URL support (YouTube, Vimeo) / 远程 URL 支持
- [ ] Settings GUI panel / 设置图形界面面板
- [ ] Drag-and-drop video selection / 拖放视频选择
- [ ] Background presets gallery / 背景预设画廊

---

**Thank you for using VSCode Background! / 感谢使用 VSCode Background！**