# Change Log

All notable changes to the "vscode-background" extension will be documented in this file.

[English](#english) | [简体中文](#简体中文)

---

## English

### [2.0.0] - 2026-02-15

#### Major Rewrite - Architecture & Implementation Redesign

This is a **major version bump** with significant architectural changes, inspired by [shalldie.background](https://marketplace.visualstudio.com/items?itemName=shalldie.background).

##### 🎯 Breaking Changes

1. **Video Storage Model**
   - **Before (v1)**: Videos copied to `VSCode-Root/background-videos/` folder
   - **After (v2)**: Video paths stored in `settings.json`, files remain in original locations
   - **Benefit**: Videos no longer deleted on VSCode updates, persist across all versions

2. **Patch Injection Method**
   - **Before (v1)**: Modified `workbench.html` + `workbench.desktop.main.css` (2 files)
   - **After (v2)**: Modify only `workbench.desktop.main.js` (1 file), append JS code with markers
   - **Benefit**: Cleaner, single-file approach; easier to track and remove patches

3. **Settings Model**
   - **Before (v1)**: All settings read-only, only modifiable via commands
   - **After (v2)**: Settings directly editable in `settings.json`, fully user-controlled
   - **New Config Items**:
     ```json
     {
       "vscodeBackground.enabled": false,
       "vscodeBackground.videos": ["file path", "https://..."],
       "vscodeBackground.opacity": 0.8,
       "vscodeBackground.switchInterval": 180,
       "vscodeBackground.theme": "glass"
     }
     ```

4. **Command Simplification**
   - **Removed** (now use settings.json): 
     - Enable/Disable (use `vscodeBackground.enabled`)
     - Configure, Remove Video, Manage Videos (edit `vscodeBackground.videos` directly)
     - Set Opacity, Set Switch Interval, Set Theme (edit corresponding settings)
     - Various helper commands
   - **Kept** (core functionality):
     - `Install / Update` - Apply current settings
     - `Uninstall` - Remove background
     - `Add Videos` - File picker
     - `Show Diagnostics` - Debug info

##### ✨ New Features

1. **Auto-Detection After VSCode Updates**
   - On startup, checks if patch exists
   - If missing (VSCode updated): Auto-detects and prompts user to reapply
   - Seamless recovery after major/minor/patch version updates

2. **Uninstall Cleanup Hook** (`vscode:uninstall`)
   - Runs automatically when extension uninstalled
   - Cleans patch from `workbench.desktop.main.js`
   - No manual cleanup needed before uninstalling

3. **Enhanced Checksum Handling**
   - Injects CSS hiding "Installation appears corrupt" notifications
   - Covers 15 different language variants
   - No need to manually run "Fix Checksums" command

4. **URL Protocol Support**
   - Local paths: `C:\Videos\bg.mp4` or `/home/user/videos/bg.mp4`
   - file:// URLs: `file:///path/to/video.mp4`
   - https:// URLs: `https://example.com/video.mp4`
   - data: URLs: Base64-encoded video data
   - Automatically converts to `vscode-file://vscode-app/` protocol for VSCode sandbox

5. **Configuration Validation**
   - On apply, checks if video files exist
   - Warns about missing files, allows override
   - Better diagnostics for troubleshooting

##### 🏗️ Code Architecture

**Modular Design** - Split from 1935-line monolithic file to 6 focused modules:

| Module              | Purpose                                     |
| ------------------- | ------------------------------------------- |
| `extension.ts`      | Entry point: commands, config listeners     |
| `background.ts`     | Core logic: install, uninstall, diagnostics |
| `patchGenerator.ts` | Generate JS code to inject into workbench   |
| `patchFile.ts`      | Read/write patches, version detection       |
| `vscodePath.ts`     | Locate workbench files, URL conversion      |
| `uninstall.ts`      | Cleanup hook script for uninstallation      |

**Benefits**:
- ✅ Single responsibility principle
- ✅ Easier to test and maintain
- ✅ Clear separation of concerns
- ✅ Reusable utility functions

##### 🔄 Migration from v1 to v2

**Automatic Migration**:
- v2 reads v1 settings on first run
- Prompts user to reapply background
- Automatically cleans old v1 patches from HTML/CSS
- No manual data loss or corruption

**What You Need to Do**:
1. Update extension
2. Open settings and check `vscodeBackground.videos` 
3. If empty, run "Add Videos" command
4. Click "Apply" (or run "Install / Update" command)
5. Accept UAC prompt
6. Restart VSCode

##### 🐛 Bug Fixes

- Resolved "videos deleted on VSCode update" issue (v1 main complaint)
- Fixed CSP (Content Security Policy) issues with inline scripts
- Improved file permission error handling and reporting
- Better multi-language error message detection
- Eliminated complex PowerShell escaping bugs

##### 📊 Comparison Table

| Feature               | v1                          | v2                    |
| --------------------- | --------------------------- | --------------------- |
| Video Storage         | `background-videos/` folder | `settings.json` paths |
| Persistence on Update | ❌ Deleted                   | ✅ Preserved           |
| Patch Method          | HTML + CSS                  | JS only               |
| Settings UI           | Read-only display           | Full edit             |
| Command Count         | 16                          | 4                     |
| Auto-recovery         | ❌ Manual                    | ✅ Automatic           |
| Uninstall Cleanup     | ⚠️ Manual                    | ✅ Automatic           |
| Config Format         | Implicit (code)             | Explicit (JSON)       |
| Modularity            | Monolithic                  | 6 modules             |

##### 🎓 Architecture Advantage Over v1

**Problem with v1**: Videos stored in `workbench/` dir → deleted on update → user must re-add

**Solution in v2**: 
- Video **paths** stored in `settings.json` (survives VSCode updates)
- Actual files stay in user's original location (not touched by VSCode)
- Inject handler loads videos on demand via `vscode-file://` protocol
- No file copying overhead
- No cleanup on uninstall (videos weren't ours to delete anyway)

**Code Quality**:
- v1: Single 1935-line TypeScript file → hard to maintain
- v2: 6 focused modules → easier to understand and improve

---

### [1.0.3] - 2026-02-12

#### Fixed
- 🔒 **File Lock Permission Error**: Improved detection and handling of `UnauthorizedAccessException` when VSCode files are locked
  - Added detection for both "Access Denied" and "file is locked" scenarios
  - Diff from 1.0.2: Now recognizes Chinese error messages ("拒绝访问", "被占用")
  - Enhanced error dialog with actionable guidance:
    - "CLOSE ALL VSCode windows completely" (primary instruction in bold)
    - Lists specific items to close (editor tabs, preview windows, terminals)
    - Explains the two requirements: admin privileges + exclusive file access
  - Provides troubleshooting options: "Close VSCode Now", "Show Troubleshooting", "Cancel"
  - Better detection of error types (distinguishes permission vs file-locked scenarios)

- 📋 **Improved Documentation**: Updated both README files with comprehensive troubleshooting section
  - Root cause explanation: "VSCode is currently using (has open) the workbench files"
  - Step-by-step solution with clear emphasis on closing all windows first
  - Explanation of both required conditions for success
  - Added to both English and Chinese documentation

#### Technical Details
**Error Detection Improvement:**
```typescript
// Detects errors in both English and Chinese environments
const isAccessDenied = errorMsg.includes('Access Denied') || 
                       errorMsg.includes('UnauthorizedAccessException') || 
                       errorMsg.includes('拒绝访问');
const isFileLocked = errorMsg.includes('file is locked') || 
                     errorMsg.includes('被占用');
```

**Error Message Flow:**
- Before 1.0.3: Generic "Failed to apply settings" error
- After 1.0.3: Specific detection → tailored error dialog → actionable guidance

**Documentation Update:**
- Before 1.0.3: Brief permission note only
- After 1.0.3: Full troubleshooting section with root cause, step-by-step solution, and requirements explanation

---

### [1.0.2] - 2026-02-12

#### Fixed
- 🔧 **PowerShell Script Generation**: Fixed syntax errors in dynamically generated PowerShell scripts by properly escaping single quotes and simplifying parameter passing
  - Removed complex param() block that caused parser errors
  - Changed to direct variable injection at script generation time
  - Used SQL-style quote escaping: `'` → `''`
  - Result: Fixed `MissingEndCurlyBrace` errors during admin elevation
  
- 📁 **Video Directory Persistence**: Moved `background-videos` folder from workbench directory to VSCode root directory
  - **Problem**: Workbench folder is recreated/replaced on every VSCode update, deleting user's videos
  - **Solution**: Store videos in VSCode root (`<VSCodeRoot>/background-videos`)
  - **Impact**: Videos now persist across VSCode updates, maintenance releases, and minor/major version upgrades
  - Implementation:
    - Added `getVSCodeRoot(appRoot)`: Walks up 3 directories from appRoot to find stable root
    - Added `getRelativePathToVideos()`: Computes relative path for HTML/CSS injection
    - Updated all path references in: copyVideosToBackgroundFolder, generateApplyScript, applyVideoBackground, diagnostics, cleanup

- ⚠️ **Admin Confirmation Dialog**: Added modal warning dialog before executing administrator script
  - Shows users what permissions are being requested
  - Allows user to cancel operation before running as admin
  - Clear indication: "This extension needs administrator permissions to apply changes"

- 🛡️ **Improved Admin Execution Flow**: Simplified PowerShell command execution
  - Old: Complex nested arrays and parameter lists → parsing errors
  - New: Atomic command using `Start-Process -Verb RunAs` with minimal nesting
  - Better error handling: Distinguishes permission denied (user blocked) from cancellation

#### Improved
- Script paths properly escape single quotes to avoid PowerShell parser errors
- Video files persist across VSCode updates (no more deletion on updates)
- Users receive explicit confirmation before admin elevation
- Clearer error messages when admin permission is denied or operation cancelled
- More robust PowerShell command generation (fewer edge cases)

#### Technical Details
**Script Generation Changes:**
```typescript
// Before 1.0.2: Parameterized approach (caused parsing errors)
// param([string]$htmlPath = '...', ...)

// After 1.0.2: Direct variable injection (clean execution)
// $htmlPath = '...'  // with proper quote escaping
```

**Video Storage Path Change:**
```
Before: $appRoot/../../workbench/background-videos 
        (deleted on VSCode update)

After:  $appRoot/../../../../../../background-videos 
        (VSCode root, survives all updates)
```

**PowerShell Execution:**
```typescript
// Before: Complex -ArgumentList with nested arrays
// After: Simple command with -Verb RunAs for atomic admin elevation
```

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

### [2.0.0] - 2026-02-15

#### 重大改写 - 架构与实现设计重构

这是一个**主版本升级**，包含重大架构变更，灵感来自 [shalldie.background](https://marketplace.visualstudio.com/items?itemName=shalldie.background)。

##### 🎯 破坏性变更

1. **视频存储模型**
   - **v1 之前**：视频复制到 `VSCode根目录/background-videos/` 文件夹
   - **v2 之后**：视频路径存储在 `settings.json` 中，文件保留在原始位置
   - **优势**：視頻不再因 VSCode 更新而被删除，在所有版本间保持持久化

2. **补丁注入方法**
   - **v1 之前**：修改 `workbench.html` + `workbench.desktop.main.css`（2个文件）
   - **v2 之后**：仅修改 `workbench.desktop.main.js`（1个文件），使用标记包裹追加 JS 代码
   - **优势**：更清晰，单文件方案；更容易追踪和移除补丁

3. **设置模型**
   - **v1 之前**：所有设置只读，只能通过命令修改
   - **v2 之后**：设置可直接在 `settings.json` 中编辑，完全用户可控
   - **新配置项**：
     ```json
     {
       "vscodeBackground.enabled": false,
       "vscodeBackground.videos": ["文件路径", "https://..."],
       "vscodeBackground.opacity": 0.8,
       "vscodeBackground.switchInterval": 180,
       "vscodeBackground.theme": "glass"
     }
     ```

4. **命令精简**
   - **已移除**（现在使用 settings.json）：
     - 启用/禁用（使用 `vscodeBackground.enabled`）
     - 配置、删除视频、管理视频（直接编辑 `vscodeBackground.videos`）
     - 设置不透明度、切换间隔、主题（编辑对应设置）
     - 各种辅助命令
   - **保留**（核心功能）：
     - `安装 / 更新` - 应用当前设置
     - `卸载` - 移除背景
     - `添加视频` - 文件选择器
     - `诊断信息` - 调试信息

##### ✨ 新特性

1. **VSCode 更新后自动检测**
   - 启动时检查补丁是否存在
   - 若缺失（VSCode 已更新）：自动检测并提示用户重新应用
   - 大版本/小版本/patch 更新后无缝恢复

2. **卸载清理钩子** (`vscode:uninstall`)
   - 扩展卸载时自动运行
   - 从 `workbench.desktop.main.js` 清理补丁
   - 卸载前无需手动清理

3. **增强的校验和处理**
   - 注入 CSS 隐藏"安装似乎损坏"通知
   - 覆盖 15 种不同语言变体
   - 无需手动运行"修复校验和"命令

4. **URL 协议支持**
   - 本地路径：`C:\Videos\bg.mp4` 或 `/home/user/videos/bg.mp4`
   - file:// URLs：`file:///path/to/video.mp4`
   - https:// URLs：`https://example.com/video.mp4`
   - data: URLs：Base64 编码的视频数据
   - 自动转换为 `vscode-file://vscode-app/` 协议以支持 VSCode 沙箱机制

5. **配置验证**
   - 应用时检查视频文件是否存在
   - 警告缺失文件，允许用户覆盖
   - 为故障排查提供更好的诊断信息

##### 🏗️ 代码架构

**模块化设计** - 从 1935 行单文件拆分为 6 个专注模块：

| 模块                | 用途                            |
| ------------------- | ------------------------------- |
| `extension.ts`      | 入口：命令和配置监听            |
| `background.ts`     | 核心逻辑：安装、卸载、诊断      |
| `patchGenerator.ts` | 生成注入到 workbench 的 JS 代码 |
| `patchFile.ts`      | 读写补丁，版本检测              |
| `vscodePath.ts`     | 定位 workbench 文件，URL 转换   |
| `uninstall.ts`      | 卸载清理钩子脚本                |

**优势**：
- ✅ 单一职责原则  
- ✅ 更易于测试和维护
- ✅ 清晰的关注点分离
- ✅ 可重用的工具函数

##### 🔄 从 v1 迁移到 v2

**自动迁移**：
- v2 首次运行时读取 v1 设置
- 提示用户重新应用背景
- 自动清理旧 v1 的 HTML/CSS 补丁
- 无手动数据丢失或损坏

**用户需要做的**：
1. 更新扩展
2. 打开设置检查 `vscodeBackground.videos`
3. 若为空，运行"添加视频"命令
4. 点击"应用"（或运行"安装 / 更新"命令）
5. 接受 UAC 提示
6. 重启 VSCode

##### 🐛 bug 修复

- 解决"VSCode 更新时视频被删除"问题（v1 主要投诉）
- 修复内联脚本的 CSP（内容安全策略）问题
- 改进文件权限错误处理和报告
- 更好的多语言错误消息检测
- 消除复杂的 PowerShell 转义 bug

##### 📊 对比表

| 功能         | v1                          | v2                   |
| ------------ | --------------------------- | -------------------- |
| 视频存储     | `background-videos/` 文件夹 | `settings.json` 路径 |
| 更新时持久化 | ❌ 被删除                    | ✅ 保留               |
| 补丁方式     | HTML + CSS                  | 仅 JS                |
| 设置 UI      | 只读显示                    | 完全编辑             |
| 命令数量     | 16 个                       | 4 个                 |
| 自动恢复     | ❌ 手动                      | ✅ 自动               |
| 卸载清理     | ⚠️ 手动                      | ✅ 自动               |
| 配置格式     | 隐式（代码）                | 显式（JSON）         |
| 模块化       | 单文件                      | 6 个模块             |

##### 🎓 相比 v1 的架构优势

**v1 的问题**：视频存储在 `workbench/` 目录 → VSCode 更新时删除 → 用户必须重新添加

**v2 的解决方案**：
- 视频**路径**存储在 `settings.json` 中（在 VSCode 更新中生存）
- 实际文件保留在用户原始位置（不被 VSCode 触及）
- 注入的处理器通过 `vscode-file://` 协议按需加载视频
- 无文件复制开销
- 卸载时无需清理（视频从来不是我们的资源）

**代码质量**：
- v1：单个 1935 行 TypeScript 文件 → 难以维护
- v2：6 个专注模块 → 易于理解和改进

---

### [1.0.3] - 2026-02-12

#### 修复
- 🔒 **文件锁定权限错误**：改进了对 `UnauthorizedAccessException` 的检测和处理，当 VSCode 文件被锁定时
  - 添加了对"拒绝访问"和"文件被占用"两种场景的检测
  - 相比 1.0.2 的改进：现在能识别中文错误消息（"拒绝访问"、"被占用"）
  - 增强的错误对话框，提供可操作的指导：
    - "完全关闭所有 VSCode 窗口"（粗体突出的主要指示）
    - 列出具体要关闭的项目（编辑器标签页、预览窗口、终端）
    - 解释两个必要条件：管理员权限 + 独占文件访问权
  - 提供故障排查选项："关闭 VSCode"、"显示故障排查"、"取消"
  - 更好地区分错误类型（区分权限错误 vs 文件锁定错误）

- 📋 **改进文档**：更新两份 README 文件，添加全面的故障排查部分
  - 根本原因说明："VSCode 当前正在使用（打开）workbench 文件"
  - 分步解决方案，清晰强调首先需要关闭所有窗口
  - 解释成功所需的两个条件
  - 同时添加到英文和中文文档

#### 技术细节
**错误检测改进：**
```typescript
// 在英文和中文环境中都能检测到错误
const isAccessDenied = errorMsg.includes('Access Denied') || 
                       errorMsg.includes('UnauthorizedAccessException') || 
                       errorMsg.includes('拒绝访问');
const isFileLocked = errorMsg.includes('file is locked') || 
                     errorMsg.includes('被占用');
```

**错误消息流**：
- 1.0.2 之前：通用"应用设置失败"错误
- 1.0.3 之后：特定检测 → 定制错误对话框 → 可操作的指导

**文档更新**：
- 1.0.2 之前：仅有简短权限说明
- 1.0.3 之后：完整故障排查部分，包含根本原因、分步解决方案和需求说明

---

### [1.0.2] - 2026-02-12

#### 修复
- 🔧 **PowerShell 脚本生成**：通过正确转义单引号并简化参数传递，修复了动态生成的 PowerShell 脚本中的语法错误
  - 移除了导致解析器错误的复杂 param() 块
  - 改为在脚本生成时直接注入变量
  - 使用 SQL 类型的引号转义：`'` → `''`
  - 结果：修复了管理员提升期间的 `MissingEndCurlyBrace` 错误

- 📁 **视频目录持久化**：将 `background-videos` 文件夹从 workbench 目录移到 VSCode 根目录
  - **问题**：Workbench 文件夹在每次 VSCode 更新时都会重新创建/替换，导致用户视频被删除
  - **解决方案**：将视频存储在 VSCode 根目录（`<VSCode根>/background-videos`）
  - **影响**：视频现在可以在 VSCode 更新、维护版本和小版本/大版本升级中保留
  - 实现：
    - 添加 `getVSCodeRoot(appRoot)`：从 appRoot 向上查询 3 级目录找到稳定的根目录
    - 添加 `getRelativePathToVideos()`：计算 HTML/CSS 注入需要的相对路径
    - 更新所有路径引用：copyVideosToBackgroundFolder、generateApplyScript、applyVideoBackground、诊断、清理

- ⚠️ **管理员确认对话框**：在执行管理员脚本前添加模态确认对话框
  - 向用户显示请求了哪些权限
  - 允许用户在以管理员身份运行前取消操作
  - 清晰指示："此扩展需要管理员权限以应用更改"

- 🛡️ **改进的管理员执行流程**：简化 PowerShell 命令执行
  - 之前：复杂的嵌套数组和参数列表 → 解析错误
  - 现在：使用 `Start-Process -Verb RunAs` 实现原子性命令，最小化嵌套
  - 更好的错误处理：区分权限被拒（用户阻止）和取消操作

#### 改进
- 脚本路径正确转义单引号，避免 PowerShell 解析器错误
- 视频文件在 VSCode 更新中持久保留（不再因为更新而被删除）
- 用户在管理员提升前收到明确的确认
- 当管理员权限被拒绝或操作被取消时显示更清晰的错误消息
- 更鲁棒的 PowerShell 命令生成（更少边界情况）

#### 技术细节
**脚本生成变更：**
```typescript
// 1.0.2 之前：参数化方法（导致解析错误）
// param([string]$htmlPath = '...', ...)

// 1.0.2 之后：直接变量注入（清晰执行）
// $htmlPath = '...'  // 具有适当的引号转义
```

**视频存储路径变更：**
```
之前：$appRoot/../../workbench/background-videos 
      （VSCode 更新时被删除）

之后：$appRoot/../../../../../../background-videos 
      （VSCode 根目录，幸存所有更新）
```

**PowerShell 执行：**
```typescript
// 之前：复杂的 -ArgumentList 带嵌套数组
// 之后：简单命令，使用 -Verb RunAs 实现原子式管理员提升
```

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