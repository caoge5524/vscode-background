# VSCode Background Extension - Testing & Publishing Guide

[简体中文](./TESTING-PUBLISHING.zh-CN.md) | English

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Development Setup](#development-setup)
3. [Testing Guide](#testing-guide)
4. [Building & Packaging](#building--packaging)
5. [Publishing to Marketplace](#publishing-to-marketplace)
6. [Post-Publishing](#post-publishing)

---

## 🔧 Prerequisites

### Required Tools

1. **Node.js** (v16 or higher)
   ```bash
   node --version  # Should be v16+
   npm --version
   ```

2. **Visual Studio Code** (v1.108.1 or higher)
   ```bash
   code --version
   ```

3. **TypeScript**
   ```bash
   npm install -g typescript
   ```

4. **VSCE (Visual Studio Code Extension Manager)**
   ```bash
   npm install -g @vscode/vsce
   ```

5. **Git** (for version control)
   ```bash
   git --version
   ```

### Optional Tools

- **ESLint** (for code quality)
- **Prettier** (for code formatting)

---

## 🚀 Development Setup

### 1. Clone & Install Dependencies

```bash
cd d:\Programes\vscode-background
npm install
```

### 2. Verify Installation

```bash
npm run compile
```

Expected output: No errors, compiled files in `out/` directory

### 3. Open in VSCode

```bash
code .
```

---

## 🧪 Testing Guide

### Phase 1: Unit Testing (Optional)

Create test files in `src/test/`:

```bash
npm run test
```

### Phase 2: Manual Integration Testing

#### Step 1: Launch Extension Development Host

1. Open the project in VSCode
2. Press `F5` or click "Run and Debug" → "Run Extension"
3. A new VSCode window opens (Extension Development Host)

#### Step 2: Test Enable Command

1. In the Extension Development Host:
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
   - Type: `VSCode Background: Enable Video Background`
   - Select one or more test MP4 files
   - Click "Restart" when prompted

2. **Expected Result**:
   - VSCode restarts
   - Video background appears behind all UI elements
   - Video plays automatically (muted)

#### Step 3: Test Video Rotation (Multiple Videos)

1. Enable background with 2+ videos
2. Wait for 3 minutes (default interval)
3. **Expected Result**: Video automatically switches to next

#### Step 4: Test Configuration

1. Press `Ctrl+Shift+P`
2. Run: `VSCode Background: Configure`
3. Check current video files displayed

#### Step 5: Test Disable Command

1. Press `Ctrl+Shift+P`
2. Run: `VSCode Background: Disable Video Background`
3. Click "Restart"
4. **Expected Result**: Original VSCode appearance restored

#### Step 6: Test Settings Persistence

1. Enable background with specific settings:
   ```json
   {
     "vscodeBackground.opacity": 0.5,
     "vscodeBackground.switchInterval": 60000
   }
   ```
2. Restart VSCode
3. **Expected Result**: Settings preserved, opacity/interval applied

### Phase 3: Error Handling Tests

#### Test Case 1: Invalid File Path
- Enable with non-existent file path
- **Expected**: Error message shown

#### Test Case 2: Unsupported Format
- Try to select `.txt` or other non-video file
- **Expected**: File picker filters prevent selection

#### Test Case 3: Permission Denied
- Test on system requiring admin rights
- **Expected**: Clear error message with instructions

#### Test Case 4: Corrupted Video File
- Use a corrupted/incomplete MP4 file
- **Expected**: Automatic skip to next video

### Phase 4: Cross-Platform Testing

Test on multiple platforms:
- ✅ Windows 10/11
- ✅ macOS (Intel & Apple Silicon)
- ✅ Linux (Ubuntu, Fedora)

### Phase 5: Performance Testing

1. **Memory Usage**:
   - Open Task Manager / Activity Monitor
   - Enable background with large video files
   - Monitor VSCode memory consumption
   - **Target**: < 500MB additional memory

2. **CPU Usage**:
   - Monitor CPU during video playback
   - **Target**: < 10% CPU on average

3. **Startup Time**:
   - Measure VSCode startup with/without extension
   - **Target**: < 2 seconds additional startup time

---

## 📦 Building & Packaging

### Step 1: Update Version & Metadata

Edit `package.json`:

```json
{
  "version": "0.0.1",
  "publisher": "your-publisher-name",
  "displayName": "VSCode Background",
  "description": "Set video backgrounds for VSCode",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/vscode-background"
  }
}
```

### Step 2: Create Icon (Optional)

Create `images/icon.png`:
- Size: 128x128 pixels
- Format: PNG
- Content: Extension logo

### Step 3: Update README & CHANGELOG

Update `CHANGELOG.md`:

```markdown
# Change Log

## [0.0.1] - 2026-01-29

### Added
- Initial release
- MP4/WebM/OGG video background support
- Multi-video rotation
- Configurable opacity and switch interval
```

### Step 4: Compile TypeScript

```bash
npm run compile
```

Verify no compilation errors.

### Step 5: Run Linter

```bash
npm run lint
```

Fix any linting errors.

### Step 6: Package Extension

```bash
vsce package
```

**Output**: `vscode-background-0.0.1.vsix`

### Step 7: Test .vsix Installation

```bash
code --install-extension vscode-background-0.0.1.vsix
```

Test the installed extension works correctly.

---

## 🌐 Publishing to Marketplace

### Prerequisites

1. **Create Azure DevOps Account**
   - Visit: https://dev.azure.com
   - Sign up with Microsoft account

2. **Create Personal Access Token (PAT)**
   - Go to: https://dev.azure.com → User Settings → Personal Access Tokens
   - Click "New Token"
   - Name: `vscode-extension-publishing`
   - Organization: All accessible organizations
   - Scopes: **Marketplace** → **Manage**
   - Expiration: 1 year (or custom)
   - Copy the token (save it securely!)

3. **Create Publisher Account**
   - Visit: https://marketplace.visualstudio.com/manage
   - Click "Create Publisher"
   - Publisher ID: `your-publisher-name` (must match package.json)
   - Display Name: Your display name

### Publishing Steps

#### Step 1: Login to VSCE

```bash
vsce login your-publisher-name
```

Enter your Personal Access Token when prompted.

#### Step 2: Publish Extension

```bash
vsce publish
```

Or publish with specific version:

```bash
vsce publish 0.0.1
vsce publish patch  # 0.0.1 → 0.0.2
vsce publish minor  # 0.0.1 → 0.1.0
vsce publish major  # 0.0.1 → 1.0.0
```

#### Step 3: Verify Publication

1. Visit: https://marketplace.visualstudio.com/items?itemName=your-publisher-name.vscode-background
2. Check extension page loads correctly
3. Verify README, screenshots, metadata

---

## 🎯 Post-Publishing

### 1. Update Repository

```bash
git tag v0.0.1
git push origin v0.0.1
```

### 2. Create GitHub Release (Optional)

1. Go to: https://github.com/yourusername/vscode-background/releases
2. Click "Create new release"
3. Tag: `v0.0.1`
4. Title: `v0.0.1 - Initial Release`
5. Description: Copy from CHANGELOG.md
6. Attach: `vscode-background-0.0.1.vsix`

### 3. Monitor Analytics

Check Marketplace dashboard:
- Installs count
- Ratings & reviews
- Q&A section

### 4. Respond to Feedback

- Monitor GitHub Issues
- Respond to Marketplace Q&A
- Update documentation based on user questions

### 5. Plan Next Release

Create roadmap in GitHub Projects:
- Bug fixes
- Feature requests
- Performance improvements

---

## 🐛 Troubleshooting

### Issue: "vsce: command not found"

**Solution**:
```bash
npm install -g @vscode/vsce
```

### Issue: "Error: Missing publisher name"

**Solution**: Add publisher to `package.json`:
```json
{
  "publisher": "your-publisher-name"
}
```

### Issue: "Error: Extension manifest missing"

**Solution**: Ensure `package.json` has all required fields:
- name, version, engines, publisher, displayName

### Issue: "Publishing failed: 401 Unauthorized"

**Solution**: 
1. Regenerate Personal Access Token
2. Run `vsce login your-publisher-name` again

### Issue: Extension not appearing in Marketplace

**Solution**: Wait 5-10 minutes for indexing, then refresh

---

## 📊 Release Checklist

Before each release:

- [ ] Update version in `package.json`
- [ ] Update `CHANGELOG.md`
- [ ] Run `npm run compile` (no errors)
- [ ] Run `npm run lint` (no errors)
- [ ] Test extension functionality (F5)
- [ ] Test on multiple platforms
- [ ] Update README if needed
- [ ] Create git tag
- [ ] Run `vsce package`
- [ ] Test .vsix installation
- [ ] Run `vsce publish`
- [ ] Verify on Marketplace
- [ ] Create GitHub release
- [ ] Announce on social media (optional)

---

## 🔄 Continuous Integration (Optional)

### GitHub Actions Workflow

Create `.github/workflows/publish.yml`:

```yaml
name: Publish Extension

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 16
      - run: npm install
      - run: npm run compile
      - run: npm run lint
      - run: npx vsce package
      - run: npx vsce publish -p ${{ secrets.VSCE_TOKEN }}
```

Add `VSCE_TOKEN` secret in GitHub repository settings.

---

## 📚 Additional Resources

- [VSCode Extension API](https://code.visualstudio.com/api)
- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Extension Manifest](https://code.visualstudio.com/api/references/extension-manifest)

---

**Good luck with your extension! 🚀**
