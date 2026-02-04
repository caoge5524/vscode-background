# VSCode Background

A Visual Studio Code extension that allows you to set video backgrounds (MP4 and other formats) for your VSCode workspace.

English | [简体中文](./README.zh-CN.md)

## Features

- **Video Background Support**: Set MP4, WebM, or OGG videos as your VSCode background
- **Multiple Videos**: Load multiple videos that automatically rotate at configurable intervals
- **Auto-Discovery**: Automatically detects and plays videos in sequence
- **Customizable Settings**: Configure opacity, switch interval, and video selection
- **Easy Enable/Disable**: Simple commands to enable or disable video backgrounds

## Usage

### Enable Video Background

1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Run command: `VSCode Background: Enable Video Background`
3. Select one or more video files (MP4, WebM, or OGG)
4. Restart VSCode when prompted

### Disable Video Background

1. Open Command Palette
2. Run command: `VSCode Background: Disable Video Background`
3. Restart VSCode when prompted

### Configure Settings

1. Open Command Palette
2. Run command: `VSCode Background: Configure`
3. Or edit settings manually:

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

This extension contributes the following settings:

- `vscodeBackground.enabled`: Enable/disable video background
- `vscodeBackground.videoFiles`: Array of video file paths
- `vscodeBackground.switchInterval`: Video rotation interval in milliseconds (default: 180000 = 3 minutes)
- `vscodeBackground.opacity`: Background video opacity from 0 to 1 (default: 0.3)

## Supported Video Formats

- MP4 (H.264/H.265)
- WebM (VP8/VP9)
- OGG (Theora)

Future versions will support additional formats.

## Requirements

- Visual Studio Code version 1.108.1 or higher
- Administrator/elevated privileges may be required to modify VSCode installation files

## Known Issues

- Requires VSCode restart after enabling/disabling
- May require elevated permissions on some systems
- "Unsupported" warning may appear in VSCode after modification (this is normal)

## Roadmap

- [ ] Support for animated GIFs
- [ ] Support for image slideshows
- [ ] Custom video filters and effects
- [ ] Per-workspace video settings
- [ ] Video preview before applying

## Release Notes

### 0.0.1

Initial release:
- MP4 video background support
- Multi-video rotation
- Configurable opacity and switch intervals
- Enable/disable commands

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
