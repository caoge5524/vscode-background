# Change Log

All notable changes to the "vscode-background" extension will be documented in this file.

[English](#english) | [简体中文](#简体中文)

---

## English

### [1.0.1] - 2026-02-06

#### Fixed
- 🔧 **CSS Injection Without Videos**: Extension now injects CSS opacity/theme rules even when no video files are configured, allowing users to set up the extension before adding videos
- 🎬 **Video Playback Gap Handling**: Rewrote video discovery to scan all bgN.mp4 files (1-100) via HEAD requests, building an "available" array to prevent black screens when video files are sparse or missing
- 🗑️ **Reliable Cleanup**: Implemented multi-stage cleanup with fs.rmSync → shell fallback (PowerShell/rm-rf) → EBUSY error surfacing for actionable user menu
- 🔐 **CSP Robustness**: Replaced fragile line-specific regex with format-agnostic CSP modification that finds the entire `script-src` directive and adds `'unsafe-inline'` before the semicolon, fixing inline script execution across different VSCode versions
- ✨ **Better Error Messages**: Added visual indicators (✅, ⚠️, ℹ️) in console logs for easier debugging

#### Improved
- Video script now gracefully handles missing bgN files without freezing on black screen
- CSS is always applied when extension is enabled, independent of video count
- CSP modification tolerates various formatting styles in workbench.html

---

### [1.0.0] - 2026-01-29

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

### [1.0.1] - 2026-02-06

#### 修复
- 🔧 **无视频时 CSS 注入**：扩展现在即使在没有配置视频文件时也会注入 CSS 不透明度/主题规则，允许用户在添加视频前设置扩展
- 🎬 **视频播放间隙处理**：重写视频发现逻辑，通过 HEAD 请求扫描所有 bgN.mp4 文件（1-100），构建"可用"数组以防止视频文件稀疏或缺失时出现黑屏
- 🗑️ **可靠的清理**：实现多阶段清理，包括 fs.rmSync → shell 回退（PowerShell/rm-rf）→ EBUSY 错误提示，为用户提供可操作的菜单
- 🔐 **CSP 鲁棒性**：用格式无关的 CSP 修改替代了脆弱的特定行正则表达式，找到整个 `script-src` 指令并在分号前添加 `'unsafe-inline'`，修复不同 VSCode 版本中的内联脚本执行
- ✨ **更好的错误信息**：在控制台日志中添加了视觉指示符（✅、⚠️、ℹ️）便于调试

#### 改进
- 视频脚本现在可以优雅地处理缺失的 bgN 文件，不会在黑屏时冻结
- 扩展启用时 CSS 始终被应用，与视频数量无关
- CSP 修改可以容忍 workbench.html 中各种格式样式

---

### [1.0.0] - 2026-01-29

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