# Change Log

All notable changes to the "vscode-background" extension will be documented in this file.

[English](#english) | [简体中文](#简体中文)

---

## English

### [2.3.1] - 2026-03-05

#### Bug Fixes

- **Jump button resets playback order on restart** — fixed: after jumping to a media via the ⏩ button, restarting VSCode would continue playback from the jumped position instead of the original configured order. Root cause: `vscbg-jump.json` file persisted across restarts, and the injected JS re-applied the old jump command on `init()`. Solution: extension now deletes the jump file 3 seconds after writing, ensuring restart always begins from the first media.

#### Technical Notes

- `background.ts`: `jumpToMedia()` now calls `setTimeout(..., 3000)` to delete `vscbg-jump.json` after write, preventing re-application on restart. This preserves the original playback order across VSCode restarts.

---

### [2.3.0] - 2026-03-05

#### New Features

- **⏩ Jump-to-Media Button in Manage Media**
  - Each file row in the "Manage Media" panel now has an ⏩ button
  - Clicking it immediately switches the running background to that media (no restart needed)
  - Uses a lightweight IPC file `vscbg-jump.json` polled every 500 ms by the injected JS
  - Requires the background patch to have been (re-)installed with v2.3.0+ to activate polling

#### Bug Fixes

- **Jump button always showed "not saved" error** — root cause: `jumpToMedia` used `Array.indexOf` with string path comparison; Windows backslash serialization caused permanent mismatches. Fixed by sending the numeric array index `i` from the webview instead of the file path; extension now bounds-checks the index against `config.videos.length`, no string matching needed.
- **`Add Media` command rejected Chinese/Unicode paths** — removed the unnecessary non-ASCII path filter from `addVideos()`; all Unicode file paths are now accepted directly.

#### Technical Notes

- `background.ts`: `jumpToMedia(idx: number)` replaces `jumpToMedia(file: string)`; webview sends `{type:'jumpTo', idx: i}` (was `file: file`); bounds-check `0 <= idx < videoCount`
- `background.ts`: `addVideos()` — deleted 14-line non-English character guard block
- `patchGenerator.ts`: `PatchConfig.extensionPath?: string` added; `generateVideoPatch` encodes path to `vscode-file://vscode-app/...` and injects a 500 ms `fetch` polling loop for `vscbg-jump.json`

---

### [2.2.0] - 2026-03-02

#### New Features

- **10-Type Per-Slot Transition System (Restructured)**
  - `generateVideoPatch` restructured to match `getThemeCss` architecture:
    - New `TransitionDef` interface: `{d, oi, ti, fi, of, tf, ff, xo, xt, xf, rm}` (adds `filter` fields)
    - New `getTransitionDef(name)` function: per-effect switch statement, mirrors `getThemeCss`
    - New `buildTDTableJs()` helper: serializes all known effects to JS object literal
    - `generateVideoPatch()` now calls these helpers; the injected `makeEl` and `play` functions now also apply `filter` CSS transitions
  - **10 transition types** (was 5):
    - `zoom` *(default)*: scale + fade — 1s ease
    - `fade`: crossfade only — 1s ease
    - `slide-left`: enter from right — 0.6s ease
    - `slide-right`: enter from left — 0.6s ease
    - `wipe-up` *(new)*: enter from bottom — 0.6s ease
    - `wipe-down` *(new)*: enter from top — 0.6s ease
    - `spiral` *(new)*: rotate + scale spring (cubic-bezier overshoot) — 0.9s
    - `flip` *(new)*: 3D horizontal flip via `perspective(1200px) rotateY` — 0.5s
    - `blur` *(new)*: blur-fade (`filter:blur`) — 0.8s
    - `instant`: zero-animation cut

- **Wrap-Around Transition (Last → First)**
  - `transitions` array length is now `videos.length` (was `videos.length - 1`)
  - `transitions[n-1]` is the effect when the last media loops back to the first
  - `play(i)` uses `slot = idx` (current position) as the key into `transitions[]`; backward compatible — old arrays with `n-1` entries fall back to `zoom` on wrap

- **Visual Wrap-Around Row in Manage Media**
  - The bottom of the file list now shows a `↩ 末尾→首帧：` transition row after the last file
  - `normalize()` now pads to `files.length` (not `files.length - 1`)
  - TRANS dropdown includes all 10 effect options
  - Delete: removes `transitions[idx]` (the slot for the deleted file)
  - Add: always `transitions.unshift('zoom')` regardless of array length

#### Improvements

- **Full Image Format Documentation**
  - BMP and SVG were already supported since v2.1.0 via `isImage()` regex but were undocumented
  - Both README files now list all 6 image formats: JPG/JPEG, PNG, GIF (animated), WebP, BMP, SVG
  - "Supported Video Formats" section renamed to **"Supported Media Formats"** in both READMEs

#### Technical Notes

- `patchGenerator.ts`: `TransitionDef` interface; `getTransitionDef()` switch (10 cases); `buildTDTableJs()` serializer; `makeEl` adds `filter` to CSS transition; `play()` uses `slot=idx` before updating `idx`
- `background.ts`: `manageVideos` normalize target changed to `videos.length`; delete uses `splice(idx,1)`; add always unshifts transition; wrap-around row rendered after last file
- `package.json`: `vscodeBackground.transitions` enum expanded to 10 values
- NLS: descriptions updated with Markdown table listing all 10 effects and wrap-around note

---

### [2.1.0] - 2026-03-02

#### New Features

- **Image Background Support (JPG, PNG, GIF, WebP)**
  - The `vscodeBackground.videos` setting now accepts image files alongside videos
  - Supported formats: `*.jpg` / `*.jpeg`, `*.png`, `*.gif` (animated), `*.webp`, `*.bmp`, `*.svg`
  - Images and videos can be **freely mixed** in the same playlist for a slideshow effect
  - Implemented fade transition (0.8s ease) between media items via `opacity` CSS animation
  - A shared `div` container is used per media item — videos use `<video>` element, images use `<img>` element
  - Detection is done by file extension or `data:image` URL prefix at runtime
  - The file picker (`Add Media` command) now also shows image file types

- **First-Run Welcome Popup**
  - On first install, automatically shows a notification: *"VSCode Background is ready! Please configure your video/image file paths to get started."*
  - Provides direct action buttons: **Configure Video Paths** (opens Settings UI to `vscodeBackground.videos`) and **Open File Picker**
  - Uses `extensionContext.globalState` to track first-run, shows only once per install

- **Open File Explorer Button in Settings**
  - Added `vscode-background.openFileExplorer` command
  - A **clickable link** is now embedded in the `vscodeBackground.videos` setting description:
    `[Open File Explorer](command:vscode-background.openFileExplorer)`
  - Opens the OS native file manager (Explorer on Windows, Finder on macOS, file manager on Linux)
  - After opening, an action prompt lets users directly invoke **Add Videos** or **Open Settings**

- **Background Workshop (GitHub Discussions)**
  - Added `vscode-background.openWorkshop` command: *"VSCode Background: Open Background Workshop (GitHub Discussions)"*
  - A **Workshop link** is embedded in the `vscodeBackground.videos` setting description for quick access
  - Opens the GitHub Discussions page of the repository in the browser
  - **Recommended over Issues or a separate repo**: GitHub Discussions supports categories, reactions/upvotes, threaded replies, and media uploads
  - Added `vscodeBackground.workshopUrl` setting for customizing the workshop URL (default: `https://github.com/caoge5524/vscode-background/discussions`)

#### Improvements

- **Cross-Platform `addVideos` (`Add Media`) Command**
  - Renamed internally to reflect both video and image support
  - Removed the non-English path filter — paths in any language/script (中文, 日本語, etc.) now work correctly on all platforms
  - File picker now shows two filter categories: `Video Files` and `Image Files`
  - Works identically on Windows, macOS, and Linux

- **Background Workshop (`openWorkshop`) Enhancement**
  - Since `https://github.com/caoge5524/vscode-background/discussions` was returning 404 (GitHub Discussions not yet enabled), added a secondary option
  - Command now shows a prompt with two choices: **Open Discussions** and **View Workshop Guide**
  - Created `WORKSHOP.md` in the repository root as a standalone workshop guide with sharing templates, category descriptions, and instructions for enabling Discussions
  - To activate the live Discussions tab: repo owner must go to `Settings → Features → Discussions` and enable it

#### Removed

- Removed `vscode-background.openFileExplorer` command (user can use `Add Media` picker instead)
- Removed `config.workshopUrl` setting (URL is now hardcoded in the command for simplicity)
- Removed non-English character path filter in the `addVideos` flow and the `manageVideos` Webview

#### Architecture Notes

- `patchGenerator.ts`: `generateVideoPatch` → unified media patch with `isImage()` detection; creates `<img>` for images, `<video>` for videos; uses a shared wrapper `div` with `opacity` fade transitions
- `background.ts`: `selectVideosFallback()` now includes `['jpg','jpeg','png','gif','webp','bmp','svg']`; non-English filter removed from both `addVideos()` and `manageVideos` Webview handler
- `background.ts`: `checkAndPrompt()` now checks `globalState.welcomeShown` before patch state checks
- `Background` class new public methods: `openFileExplorer()`, `openWorkshop()`
- New file: `WORKSHOP.md` — community workshop landing page
- NLS keys added: `cmd.openFileExplorer`, `cmd.openWorkshop`, `config.workshopUrl`

### [2.0.4] - 2026-02-28

#### UI Improvements

- Enhanced the "Manage video/image order and deletion" Webview:
  - Modernized the visual style: gradient backgrounds, rounded corners, shadow, and improved button design.
  - Increased media list row width for better readability and aesthetics.
  - Improved drag-and-drop experience and overall usability.

### [2.0.3] - 2026-02-28

#### New Features & Improvements

- Added "Manage video/image order and deletion" feature (Webview drag-and-drop sorting). Users can visually adjust media order, delete or add files in the settings panel for a better experience.
- Improved documentation, updated error handling suggestions, unified image references.
- Fixed some UI responsiveness issues for smoother interaction.

### [2.0.1,2.0.2] - 2026-02-27

#### Documentation Improvements

- Optimized README.md and README.zh-CN.md:
  - Added gif demo for direct playback in VSCode Marketplace.
  - Added Settings UI and Command Line screenshots for clearer usage guidance.
  - Unified error popup image references for consistency.
  - Improved Markdown structure and visual presentation.

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

### [2.3.1] - 2026-03-05

#### 缺陷修复

- **⏩按钮跳转后重启导致播放顺序改变** 修复：点击⏩按钮跳转到某媒体后，重启 VSCode 会从跳转位置继续播放，而不是恢复为原配置顺序。根本原因：`vscbg-jump.json` 文件跨重启持久化，注入 JS 启动时再次应用旧指令。修复方案：extension 在写入文件后 3 秒自动删除，确保重启时始终从第一个媒体开始，播放顺序不受跳转影响。

---

### [2.3.0] - 2026-03-05

#### 新功能

- **〈管理媒体〉中每行新增 ⏩ 跳转按钮**
  - 点击后立即切换正在运行的背景到该媒体，无需重启 VSCode
  - 底层通过 `vscbg-jump.json` 文件 IPC，注入的 JS 每 500 ms 轮询一次
  - 需要已用 v2.3.0+ 重新安装背景补丁才能激活轮询逻辑

#### 缺陷修复

- **跳转按钮始终弹出“尚未保存”错误** — 根本原因：`jumpToMedia` 使用 `indexOf` 对路径字符串做精确匹配，Windows 反斜杠序列化差异导致永远返回 -1。修复方式：webview 直接传递数组索引 `i`，展开端仅做边界检查，完全无需字符串匹配。
- **“添加媒体”命令拒绝中文/Unicode 路径** — 删除了 `addVideos()` 中多余的非 ASCII 字符过滤逻辑，现在所有 Unicode 文件地址均可直接添加。

---

### [2.2.0] - 2026-03-02

#### 新功能

- **10 种切换特效 + 系统架构重构**
  - `generateVideoPatch` 改为与 `getThemeCss` 相同的分层结构：
    - 新增 `TransitionDef` 接口：`{d, oi, ti, fi, of, tf, ff, xo, xt, xf, rm}`（新增 `filter` 字段）
    - 新增 `getTransitionDef(name)` 函数：switch 语句按特效名分支，类比 `getThemeCss`
    - 新增 `buildTDTableJs()` 辅助函数：将所有特效序列化为 JS 对象字面量
    - 注入的 `makeEl` 和 `play` 函数现在也对 `filter` 属性做 CSS 过渡
  - **支持 10 种切换特效**（原 5 种）：
    - `zoom` *（默认）*：缩放淡化 — 1s ease
    - `fade`：淡入淡出 — 1s ease
    - `slide-left`：从右侧滑入 — 0.6s ease
    - `slide-right`：从左侧滑入 — 0.6s ease
    - `wipe-up` *（新）*：从底部向上滑入 — 0.6s ease
    - `wipe-down` *（新）*：从顶部向下滑入 — 0.6s ease
    - `spiral` *（新）*：螺旋弹入（旋转 + 缩放弹跳） — 0.9s cubic-bezier
    - `flip` *（新）*：3D 水平翻转（`perspective rotateY`） — 0.5s ease-in-out
    - `blur` *（新）*：模糊淡入（`filter:blur`） — 0.8s ease
    - `instant`：无动画瞬切

- **末尾→首帧回环切换特效**
  - `transitions` 数组长度从 `videos.length - 1` 改为 `videos.length`
  - `transitions[n-1]` 为最后一个媒体循环回到第一个时的切换特效
  - `play(i)` 以 `slot = idx`（切换前的当前索引）查找 `transitions[]`；向后兼容——旧的 `n-1` 长度数组在回环时自动回退到 `zoom`

- **管理媒体 Webview 末尾回环行**
  - 文件列表末尾添加 `↩ 末尾→首帧：` 切换特效选择行
  - `normalize()` 现在补全到 `files.length` 长度
  - 下拉框涵盖全部 10 种特效
  - 删除操作：移除 `transitions[idx]`（被删文件的出行槽位）
  - 添加操作：无论数组长度均执行 `transitions.unshift('zoom')`

#### 改进

- **完整图片格式文档**
  - BMP 和 SVG 自 v2.1.0 起已支持但未正式记录；两个 README 现已完整列出全部 6 种图片格式
  - "支持的视频格式"章节更名为**"支持的媒体格式"**

#### 技术说明

- `patchGenerator.ts`：`TransitionDef` 接口；`getTransitionDef()` switch（10 分支）；`buildTDTableJs()` 序列化器；`makeEl` 新增 filter CSS 过渡；`play()` 以 `slot=idx` 在修改 `idx` 前确定切换特效
- `background.ts`：`manageVideos` normalize 目标改为 `videos.length`；delete 改用 `splice(idx,1)`；add 始终 unshift；末尾回环行渲染在最后一个文件之后
- `package.json`：`vscodeBackground.transitions` enum 扩展至 10 种值
- NLS：描述更新为 Markdown 表格，列出全部 10 种特效及回环说明

---

### [2.1.0] - 2026-03-02

#### 新功能

- **图片背景支持（JPG、PNG、GIF、WebP）**
  - `vscodeBackground.videos` 配置项现在支持除视频外的图片文件
  - 支持格式：`*.jpg` / `*.jpeg`、`*.png`、`*.gif`（支持动态 GIF）、`*.webp`、`*.bmp`、`*.svg`
  - 视频和图片可以**自由混合**在同一播放列表中，实现轮播背景幻灯片效果
  - 媒体切换时通过 `opacity` CSS 动画实现 0.8s 淡入淡出过渡效果
  - 每个媒体项使用独立容器：视频使用 `<video>` 元素，图片使用 `<img>` 元素
  - 运行时通过文件扩展名或 `data:image` URL 前缀自动检测类型
  - "添加媒体"命令的文件选择器现在也显示图片文件类型

- **首次安装欢迎弹窗**
  - 首次安装插件后自动弹出提示："VSCode Background 已就绪！请配置视频/图片文件地址以开始使用。"  
  - 提供直接操作按钮：**配置视频路径**（跳转到 `vscodeBackground.videos` 设置页）和 **打开文件选择器**  
  - 使用 `extensionContext.globalState` 记录已显示状态，每次安装只弹一次

- **设置中添加"打开文件资源管理器"按钮**
  - 新增 `vscode-background.openFileExplorer` 命令  
  - 在 `vscodeBackground.videos` 设置说明中嵌入可点击链接：  
    `[打开文件资源管理器](command:vscode-background.openFileExplorer)`  
  - 跨平台打开系统原生文件管理器（Windows：Explorer，macOS：Finder，Linux：文件管理器）  
  - 打开后显示操作提示，可直接调用**添加视频**或**打开设置**

- **背景创意工坊（GitHub Discussions）**
  - 新增 `vscode-background.openWorkshop` 命令：`VSCode Background: 打开背景创意工坊（GitHub Discussions）`  
  - 在 `vscodeBackground.videos` 设置说明中嵌入工坊快捷链接  
  - 在浏览器中打开仓库的 GitHub Discussions 页面  
  - **优于 Issues 或独立仓库的原因**：GitHub Discussions 支持分类（如"🎬背景分享"）、点赞/反应、嵌套回复和媒体上传，专为社区分享设计，维护成本为零  
  - 新增 `vscodeBackground.workshopUrl` 配置项，可自定义创意工坊 URL（默认：`https://github.com/caoge5524/vscode-background/discussions`）

#### 改进

- **跨平台 `addVideos`（添加媒体）命令**
  - 从内部将命令更名以反映同时支持视频和图片
  - **移除了非英文路径过滤器** — 包含中文、日文等任意语言字符的路径现在在所有平台上均可正常使用
  - 文件选择器现在显示两个过滤分类：`Video Files`（视频）和 `Image Files`（图片）
  - 在 Windows、macOS 和 Linux 上行为完全一致

- **背景创意工坊（`openWorkshop`）增强**
  - 由于 `https://github.com/caoge5524/vscode-background/discussions` 返回 404（GitHub Discussions 尚未启用），新增了备用入口
  - 命令现在显示包含两个选项的提示：**打开 Discussions** 和 **查看工坊指南**
  - 创建了 `WORKSHOP.md` 在仓库根目录作为独立的工坊指南，包含分享模板、分类描述和启用 Discussions 的方法
  - 启用方式：仓库所有者前往 `Settings → Features → Discussions` 并勾选即可

#### 移除

- 移除了 `vscode-background.openFileExplorer` 命令（用户可用"添加媒体"选择器代替）
- 移除了 `config.workshopUrl` 配置项（URL 现在硬编码在命令中）
- 移除了 `addVideos` 流程和 `manageVideos` Webview 处理器中的非英文路径过滤

#### 架构说明

- `patchGenerator.ts`：`generateVideoPatch` → 统一媒体补丁，含 `isImage()` 检测；图片生成 `<img>`，视频生成 `<video>`；使用共享容器 `div` 并带 `opacity` 淡入淡出过渡
- `background.ts`：`selectVideosFallback()` 新增 `['jpg','jpeg','png','gif','webp','bmp','svg']`；`addVideos()` 和 `manageVideos` Webview 处理器均移除非英文过滤
- `background.ts`：`checkAndPrompt()` 现在在补丁状态检查前先判断 `globalState.welcomeShown`
- `Background` 类新增公共方法：`openFileExplorer()`, `openWorkshop()`
- 新增文件：`WORKSHOP.md` — 社区创意工坊落地页
- NLS 新增键：`cmd.openFileExplorer`, `cmd.openWorkshop`, `config.workshopUrl`

### [2.0.4] - 2026-02-28

#### 界面优化

- 优化“管理视频/图片顺序与删除”Webview：
  - 视觉风格现代化：渐变背景、圆角、阴影、按钮样式更精美
  - 增加媒体列表行宽，提升可读性与美观度
  - 拖拽排序体验和整体易用性进一步提升

### [2.0.3] - 2026-02-28

#### 新功能与改进

- 新增“管理视频/图片顺序与删除”功能（Webview 拖拽排序），可在设置中通过可视化界面调整媒体顺序、删除或添加文件，提升用户体验。
- 优化部分文档内容，调整错误处理建议，统一图片引用。
- 修复部分界面响应速度，提升交互流畅性。

### [2.0.1,2.0.2] - 2026-02-27

#### 文档优化

- 优化 README.md 和 README.zh-CN.md：
  - 嵌入gif演示，支持市场直接播放。
  - 增加设置界面和命令行截图，提升使用指引。
  - 统一错误弹窗图片引用，保持一致性。
  - 改进 Markdown 结构和视觉展示。

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

| 功能       | v1                          | v2                   |
| ---------- | --------------------------- | -------------------- |
| 视频存储   | `background-videos/` 文件夹 | `settings.json` 路径 |
| 持久化更新 | ❌ 被删除                    | ✅ 保留               |
| 补丁方式   | HTML + CSS                  | 仅 JS                |
| 设置 UI    | 只读显示                    | 完全编辑             |
| 命令数量   | 16 个                       | 4 个                 |
| 自动恢复   | ❌ 手动                      | ✅ 自动               |
| 卸载清理   | ⚠️ 手动                      | ✅ 自动               |
| 配置格式   | 隐式（代码）                | 显式（JSON）         |
| 模块化     | 单文件                      | 6 个模块             |

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
  - 根本原因说明："VSCode 是当前正在使用（打开）workbench 文件"
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
  - **解决方案**：将视频存储在 VSCode 根目录（`<VSCodeRoot>/background-videos`）
  - **影响**：视频现在可以在 VSCode 更新、维护版本和小版本/大版本升级中保留
  - 实现：
    - 添加 `getVSCodeRoot(appRoot)`: Walks up 3 directories from appRoot to find stable root
    - 添加 `getRelativePathToVideos()`: Computes relative path for HTML/CSS injection
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