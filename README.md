# VSCode Background

A Visual Studio Code extension that allows you to set video backgrounds (MP4 and other formats) for your VSCode workspace.

English | [简体中文](./README.zh-CN.md)

## Features

- **Video Background Support**: Set MP4, WebM, or OGG videos as your VSCode background
- **Multiple Videos**: Load multiple videos that automatically rotate at configurable intervals
- **Infinite Loop Mode**: Set switch interval to 0 to loop a single video forever
- **Auto-Discovery**: Automatically detects and plays videos in sequence
- **Customizable Settings**: Configure opacity, switch interval, and video selection
- **Easy Enable/Disable**: Simple commands to enable or disable video backgrounds
- **Auto-Apply**: Automatically apply changes when settings are modified (requires Administrator permission once)
- **Real-time Status**: Display current background status and configuration info

## Installation

### First Time Setup (Windows)

Due to Windows file permissions, you'll see an **Administrator permission prompt** when applying settings for the first time. This is normal.

1. Open Settings (`Ctrl+,`)
2. Search for `VSCode Background`
3. Configure video files, opacity, switch interval, etc.
4. Click **Apply Settings** or wait for auto-prompt
5. Accept the Administrator permission prompt
6. Restart VSCode

### Quick Start

**Via Settings UI (Recommended):**

1. Open Settings → Search "VSCode Background"
2. Find **Video Files** setting → Click "Add Videos" command
3. Select video files
4. Adjust **Opacity** (0-1) and **Switch Interval**
5. Make sure **Enabled** is checked
6. Auto-prompt "Apply now?" → Click **Apply**
7. Accept Administrator prompt
8. Restart VSCode

## Usage

### Recommended: Via Settings UI

1. **Open Settings** (`Ctrl+,`) → Search "VSCode Background"
2. **Configure Videos**:
   - Click "Add Videos" command to add video files
   - Or use Command Palette: `VSCode Background: Add Videos`
3. **Adjust Parameters**:
   - **Enabled**: Check to enable background
   - **Opacity**: Adjust transparency (recommended 0.5-0.9)
   - **Switch Interval**: Switch interval in milliseconds (0 = infinite loop)
4. **Apply**: Auto-prompt "Apply now?" after changes
5. **Status**: "Current Status" displays current state

### Via Commands

Shortcut: `Ctrl+Shift+P` to open Command Palette

- `Add Videos` - Add video files
- `Remove Video` - Remove video files
- `Manage Videos` - View playlist
- `Apply Settings` - Apply current settings
- `Refresh Status` - Refresh status display
- `Set Infinite Loop` - Quick toggle infinite loop
- `Set Opacity` - Set background opacity (command only)
- `Set Switch Interval` - Set rotation interval (command only)
- `Show Videos Folder` - Show `background-videos` path and naming rules

### Configure Settings

Settings are **read-only** and only show current values.

Use commands to change values:

- `VSCode Background: Set Opacity`
- `VSCode Background: Set Switch Interval`
- `VSCode Background: Add Videos` / `Remove Video`
- `VSCode Background: Enable Video Background` / `Disable Video Background`

## Extension Settings

| Setting                           | Type    | Default           | Description                                          |
| --------------------------------- | ------- | ----------------- | ---------------------------------------------------- |
| `vscodeBackground.enabled`        | boolean | true              | **Read-only** - Use enable/disable commands          |
| `vscodeBackground.videoFiles`     | array   | []                | **Read-only** - Use add/remove/manage commands       |
| `vscodeBackground.switchInterval` | number  | 180000            | **Read-only** - Use Set Switch Interval (min: 10000) |
| `vscodeBackground.opacity`        | number  | 0.8               | **Read-only** - Use Set Opacity (0-1)                |
| `vscodeBackground.currentStatus`  | string  | "Not initialized" | **Read-only** - Display current background status    |

### Infinite Loop Mode

Set `switchInterval` to `0` to enable infinite loop mode - the first video will loop forever without switching to other videos.

You can also run: `VSCode Background: Set Infinite Loop (No Switch)`

## Commands

| Command                              | Description                                               |
| ------------------------------------ | --------------------------------------------------------- |
| `Enable Video Background`            | Enable video background with current settings (legacy)    |
| `Disable Video Background`           | Remove video background (legacy)                          |
| `Add Videos`                         | **Recommended** - Add video files to playlist             |
| `Remove Video`                       | Remove videos from playlist                               |
| `Manage Videos`                      | View and manage video playlist                            |
| `Apply Settings`                     | **Core** - Apply current settings (auto-run script)       |
| `Refresh Status`                     | Refresh status display                                    |
| `Configure`                          | Quick open settings                                       |
| `Fix 'Installation Corrupt' Warning` | Update checksums to remove VSCode warning                 |
| `Set Infinite Loop`                  | Toggle infinite loop mode                                 |
| `Set Opacity`                        | Set background opacity (command only)                     |
| `Set Switch Interval`                | Set rotation interval (command only)                      |
| `Show Videos Folder`                 | Show background-videos path and naming rules              |
| `Cleanup (Run Before Uninstall)`     | **IMPORTANT** - Remove all injected code before uninstall |
| `Show Diagnostics`                   | Display debug information                                 |

## Important Notes

### ⚠️ Before Uninstalling

**You MUST run the cleanup command before uninstalling this extension!**

1. Open Command Palette
2. Run: `VSCode Background: Cleanup (Run Before Uninstall)`
3. Then uninstall the extension

If you uninstall without cleanup, the injected code will remain in VSCode's files.

### "Installation Corrupt" Warning

After enabling the background, VSCode may show an "Installation appears to be corrupt" warning. This is normal and can be dismissed by:

- Running: `VSCode Background: Fix 'Installation Corrupt' Warning`
- Or simply clicking "Don't Show Again"

### Permission Issues

**You'll see an Administrator permission prompt when applying settings for the first time. This is normal.**

- ✅ Click "Yes" to allow the script to modify VSCode files
- ❌ If denied, the background won't be applied
- 📝 Script location: `apply-settings.ps1` in extension directory
- 🔒 Script only modifies VSCode's HTML/CSS files, not system files

If you encounter permission errors:
1. Close all VSCode windows
2. Run VSCode as Administrator
3. Or manually run the script as Administrator: `apply-settings.ps1` in extension directory

### Manual video files

You can manually add videos into the `background-videos` folder. Use `Show Videos Folder` to display the exact path.

Naming rules (required):

- `bg1.mp4`, `bg2.mp4`, `bg3.mp4` ...
- Files are discovered in order starting from 1

## Supported Video Formats

- MP4 (H.264/H.265)
- WebM (VP8/VP9)
- OGG (Theora)

## Requirements

- Visual Studio Code version 1.108.1 or higher
- Windows: May require Administrator privileges for first-time setup

## Troubleshooting

### Background not showing

1. Run `Show Diagnostics` command to check paths
2. Make sure VSCode was restarted after enabling
3. Check if video files exist and are valid

### Permission denied

1. Make sure to accept the Administrator permission prompt
2. Close all VSCode windows
3. Run VSCode as Administrator
4. Or manually run the script as Administrator: `apply-settings.ps1` in extension directory

### Video not playing

- Check video format (MP4/WebM/OGG)
- Try a different video file
- Check browser console for errors (Help → Toggle Developer Tools)

## Release Notes

### 1.0.0

- Video background support (MP4, WebM, OGG)
- Multi-video rotation with configurable intervals
- Infinite loop mode (switchInterval = 0)
- Permission management tools
- Cleanup command for safe uninstallation
- Checksum fix for "Installation Corrupt" warning

---

## For Developers

### Building

```bash
npm install
npm run compile
```

### Testing

```bash
npm run test
```

### Packaging

```bash
vsce package
```

**Enjoy your video backgrounds!**

## Future Roadmap

### Planned Features

We're actively developing the following features to enhance your VSCode experience:

#### 🎬 Video Transition Effects
- **Fade In/Out**: Smooth fade transitions between videos
- **Slide Transitions**: Left, right, up, down sliding effects
- **Zoom Effects**: Scale in/out animations
- **Custom Duration**: Configurable transition animation duration

#### 🎨 More Theme Styles
- **Gradient Theme**: Colorful gradient overlay effects
- **Blur Theme**: Adjustable background blur intensity
- **Vignette Effect**: Darkened corners to focus on center
- **Color Adjustments**: Saturation, brightness, contrast controls
- **Custom CSS Themes**: Allow users to write custom theme styles

#### 🖼️ Image Background Support
- **Static Images**: Support JPG, PNG, GIF formats
- **Image Carousel**: Multiple images rotating on schedule
- **Mixed Playlist**: Combine images and videos in one playlist
- **Image Filters**: B&W, vintage, vibrant, and more filters

#### ⚙️ Advanced Configuration
- **Playback Controls**:
  - Random/Shuffle play mode
  - Single/List loop modes
  - Playback speed adjustment (0.5x - 2x)
  - Video volume control (muted by default)
- **Time-based Settings**:
  - Auto-switch backgrounds by time of day
  - Different backgrounds for work/break times
  - Holiday special backgrounds

#### 📦 Content Management
- **Background Library**:
  - Built-in curated background collection
  - Download community-shared backgrounds
  - Favorite and rating system
- **Smart Categories**:
  - By type (nature, tech, abstract, etc.)
  - By mood (calm, energetic, focused, etc.)
  - Custom tagging system

#### 🔧 Performance Optimization
- **Resource Preloading**: Preload next video for seamless transitions
- **Memory Optimization**: Smart resource management
- **GPU Acceleration**: Hardware-accelerated rendering
- **Low-spec Mode**: Auto quality reduction on low-end devices

#### 🌐 Cross-platform Sync
- **Cloud Sync**: Sync settings across devices
- **Import/Export**: One-click backup and restore
- **Team Sharing**: Share configurations with team members

#### 🎯 Enhanced Interactions
- **Gesture Controls**: Quick switch backgrounds with hotkeys
- **Context Menu**: Access features from editor right-click menu
- **Status Bar**: Display current background info
- **Preview Feature**: Preview background before applying

### Feedback & Suggestions

We value user feedback! If you have suggestions or ideas, please contact us:
- Submit an Issue on GitHub
- Leave a review on the marketplace
- Send feedback via email

Your support drives our continuous improvement! 🚀
