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
- **Permission Tools**: Built-in tools to handle Windows file permission issues

## Installation

### First Time Setup (Windows)

Due to Windows file permissions, you may need to run one of these commands first:

1. **Option A - Grant Permissions (Recommended)**:

   - Open Command Palette (`Ctrl+Shift+P`)
   - Run: `VSCode Background: Grant File Permissions (Run Once)`
   - Accept the Administrator prompt
   - Restart VSCode
2. **Option B - Generate Install Script**:

   - Run: `VSCode Background: Generate Install Script (Manual)`
   - Save the script to your Desktop
   - Right-click the script → "Run with PowerShell" as Administrator

## Usage

### Enable Video Background

1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Run: `VSCode Background: Add Videos` - select your video files
3. Run: `VSCode Background: Enable Video Background`
4. Restart VSCode when prompted

### Disable Video Background

1. Open Command Palette
2. Run: `VSCode Background: Disable Video Background`
3. Restart VSCode when prompted

### Configure Settings

Settings can be configured via:

- Command Palette → `VSCode Background: Configure`
- Or edit settings.json directly:

```json
{
  "vscodeBackground.enabled": true,
  "vscodeBackground.videoFiles": [
    "C:\\path\\to\\video1.mp4",
    "C:\\path\\to\\video2.mp4"
  ],
  "vscodeBackground.switchInterval": 180000,
  "vscodeBackground.opacity": 0.3
}
```

## Extension Settings

| Setting                             | Type    | Default | Description                                                |
| ----------------------------------- | ------- | ------- | ---------------------------------------------------------- |
| `vscodeBackground.enabled`        | boolean | true    | Enable/disable video background                            |
| `vscodeBackground.videoFiles`     | array   | []      | List of video file paths                                   |
| `vscodeBackground.switchInterval` | number  | 180000  | Video switch interval in ms (0 = infinite loop, min: 5000) |
| `vscodeBackground.opacity`        | number  | 0.3     | Background video opacity (0-1)                             |

### Infinite Loop Mode

Set `switchInterval` to `0` to enable infinite loop mode - the first video will loop forever without switching to other videos.

You can also run: `VSCode Background: Set Infinite Loop (No Switch)`

## Commands

| Command                                | Description                                   |
| -------------------------------------- | --------------------------------------------- |
| `Enable Video Background`            | Enable video background with current settings |
| `Disable Video Background`           | Remove video background                       |
| `Add Videos`                         | Add video files to playlist                   |
| `Remove Video`                       | Remove videos from playlist                   |
| `Manage Videos`                      | View and manage video playlist                |
| `Configure`                          | Quick access to settings                      |
| `Grant File Permissions`             | One-time permission fix for Windows           |
| `Generate Install Script`            | Create manual install script                  |
| `Fix 'Installation Corrupt' Warning` | Update checksums to remove VSCode warning     |
| `Set Infinite Loop`                  | Toggle infinite loop mode                     |
| `Cleanup (Run Before Uninstall)`     | **IMPORTANT**: Remove all injected code |
| `Show Diagnostics`                   | Debug information                             |

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

If you see "Permission denied" errors:

1. Try: `VSCode Background: Grant File Permissions (Run Once)`
2. Or generate and run the install script as Administrator
3. Make sure no other VSCode instances are running

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

1. Run `Grant File Permissions` command
2. Or run VSCode as Administrator
3. Close all VSCode windows before trying again

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
