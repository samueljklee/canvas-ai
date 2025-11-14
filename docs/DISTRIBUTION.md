# Distribution Guide - Canvas AI

How to distribute Canvas AI to users via GitHub Releases.

---

## Why Not Commit Built Apps?

**❌ DON'T commit to git:**
- Built apps are **979MB+** (way too large)
- Binary files don't diff well
- Makes repo huge for clones
- Every build = new commit

**✅ DO use GitHub Releases:**
- Source code stays small
- Users download from Releases page
- Automatic versioning
- Release notes with each version

---

## Current .gitignore

Already configured correctly:

```gitignore
# Build outputs (excluded from git)
dist/
dist-ssr/
release/
```

This means:
- ✅ Built apps in `release/` won't be tracked
- ✅ Repo stays small (source code only)
- ✅ Local builds don't affect git status

---

## Distribution Workflow

### Step 1: Build the App

```bash
# Full rebuild and package for macOS
npm run repackage

# Or for all platforms
npm run dist:all

# Output will be in release/:
# - Workspace Canvas.app (macOS app bundle)
# - Workspace Canvas-x.x.x-arm64.dmg (Apple Silicon installer)
# - Workspace Canvas-x.x.x.dmg (Intel Mac installer)
# - Workspace Canvas-x.x.x.exe (Windows installer)
# - Workspace Canvas-x.x.x.AppImage (Linux)
```

### Step 2: Test Locally

```bash
# Test the built app
open "release/mac-arm64/Workspace Canvas.app"

# Or install from DMG
open "release/Workspace Canvas-0.1.0-beta-arm64.dmg"
```

**Verify:**
- ✅ App launches without errors
- ✅ Onboarding wizard works
- ✅ Can create widgets
- ✅ Claude API integration works
- ✅ Database persistence works

### Step 3: Create Git Tag

```bash
# Tag the release
git tag -a v0.1.0-beta -m "Release v0.1.0-beta"

# Push tag to GitHub
git push origin v0.1.0-beta
```

### Step 4: Create GitHub Release

**Option A: Manual (GitHub Web UI)**

1. Go to https://github.com/samueljklee/canvas-ai/releases
2. Click "Draft a new release"
3. Select the tag: `v0.1.0-beta`
4. Enter release title: `Canvas AI v0.1.0-beta`
5. Write release notes (see template below)
6. Upload files:
   - `Workspace Canvas-0.1.0-beta-arm64.dmg` (Apple Silicon)
   - `Workspace Canvas-0.1.0-beta.dmg` (Intel Mac)
   - `Workspace Canvas-0.1.0-beta-arm64-mac.zip` (Apple Silicon ZIP)
   - `Workspace Canvas-0.1.0-beta-mac.zip` (Intel ZIP)
7. Click "Publish release"

**Option B: GitHub CLI**

```bash
# Install GitHub CLI if needed
brew install gh

# Create release with files
gh release create v0.1.0-beta \
  --title "Canvas AI v0.1.0-beta" \
  --notes-file RELEASE_NOTES.md \
  "release/Workspace Canvas-0.1.0-beta-arm64.dmg#macOS (Apple Silicon)" \
  "release/Workspace Canvas-0.1.0-beta.dmg#macOS (Intel)" \
  "release/Workspace Canvas-0.1.0-beta-arm64-mac.zip" \
  "release/Workspace Canvas-0.1.0-beta-mac.zip"
```

---

## Release Notes Template

Save as `RELEASE_NOTES.md`:

```markdown
# Canvas AI v0.1.0-beta

Visual AI agent orchestrator on an infinite 2D canvas.

## 🎯 Highlights

- Real-time Claude AI conversations
- 4 widget types (Agent, Document, File Browser, Generated App)
- Tool execution (bash, file operations, widget spawning)
- Infinite canvas with pan/zoom
- Full SQLite persistence

## 📦 Installation

### macOS

**Apple Silicon (M1/M2/M3/M4):**
- Download: `Workspace Canvas-0.1.0-beta-arm64.dmg`
- Open DMG and drag to Applications

**Intel Mac:**
- Download: `Workspace Canvas-0.1.0-beta.dmg`
- Open DMG and drag to Applications

### First Launch

1. Open "Workspace Canvas" from Applications
2. Complete onboarding wizard
3. Enter your Anthropic API key (get one at https://console.anthropic.com/settings/keys)
4. Start creating widgets!

## ✨ What's New

- Initial beta release
- Real Claude API integration
- Multi-agent workspace
- Tool execution framework
- Database persistence

## 🐛 Known Issues

- Currently macOS only (Windows/Linux coming soon)
- App is unsigned (you may see security warning - see instructions below)
- Beta software - expect rough edges!

## 🔓 Security Note (macOS)

If you see "App can't be opened because it is from an unidentified developer":

1. Right-click the app → "Open"
2. Click "Open" in the dialog
3. Or: System Settings → Privacy & Security → "Open Anyway"

## 📚 Documentation

- [README.md](https://github.com/samueljklee/canvas-ai#readme) - Quick start
- [FEATURES.md](https://github.com/samueljklee/canvas-ai/blob/main/FEATURES.md) - Complete guide
- [ARCHITECTURE.md](https://github.com/samueljklee/canvas-ai/blob/main/ARCHITECTURE.md) - Technical details

## 🙏 Feedback

Report issues: https://github.com/samueljklee/canvas-ai/issues

---

**Full Changelog**: https://github.com/samueljklee/canvas-ai/commits/v0.1.0-beta
```

---

## Automated Releases (Advanced)

### GitHub Actions Workflow

Create `.github/workflows/release.yml`:

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: macos-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Rebuild native modules
        run: npm run rebuild

      - name: Build app
        run: npm run dist:mac

      - name: Upload Release Assets
        uses: softprops/action-gh-release@v1
        with:
          files: |
            release/*.dmg
            release/*.zip
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Benefits:**
- Automatic builds on tag push
- Consistent build environment
- Less manual work

---

## Version Bumping

### Before Each Release

1. **Update version in package.json:**
```json
{
  "version": "0.1.1-beta"
}
```

2. **Update CHANGELOG.md:**
```markdown
## [0.1.1-beta] - 2025-11-15

### Added
- New feature X

### Fixed
- Bug Y
```

3. **Commit changes:**
```bash
git add package.json CHANGELOG.md
git commit -m "Bump version to 0.1.1-beta"
git push
```

4. **Tag and release:**
```bash
git tag -a v0.1.1-beta -m "Release v0.1.1-beta"
git push origin v0.1.1-beta
```

---

## File Size Optimization

### Current Sizes
- DMG: ~130MB (per architecture)
- ZIP: ~120MB (per architecture)
- Total: ~500MB for both architectures

### Reduce Size (Optional)

**1. Remove dev dependencies from build:**
```bash
# Already done in package.json scripts
pnpm install --prod
```

**2. Enable asar compression:**
```json
// electron-builder.json
{
  "asar": true,
  "compression": "maximum"
}
```

**3. Exclude unnecessary files:**
```json
// electron-builder.json
{
  "files": [
    "dist",
    "!dist/**/*.map",
    "!node_modules/.cache"
  ]
}
```

---

## Code Signing (macOS)

### Why Sign?

- **Unsigned apps** show security warnings
- **Signed apps** install smoothly
- **Notarized apps** work seamlessly on macOS 10.15+

### Requirements

- Apple Developer Account ($99/year)
- Developer ID Application certificate
- App-specific password for notarization

### Setup

1. **Get certificate** from Apple Developer portal
2. **Update electron-builder.json:**
```json
{
  "mac": {
    "identity": "Developer ID Application: Your Name (TEAM_ID)",
    "hardenedRuntime": true,
    "entitlements": "build/entitlements.mac.plist",
    "gatekeeperAssess": false
  },
  "afterSign": "scripts/notarize.js"
}
```

3. **Create notarization script:** `scripts/notarize.js`

4. **Build with signing:**
```bash
npm run dist:mac
```

---

## Distribution Checklist

Before releasing:

- [ ] Version bumped in package.json
- [ ] CHANGELOG.md updated
- [ ] Built app tested locally
- [ ] All tests passing (`npm test`)
- [ ] Documentation updated
- [ ] Git tag created
- [ ] Release notes written
- [ ] Files uploaded to GitHub Release
- [ ] Release published
- [ ] README updated with latest version
- [ ] Announcement posted (if applicable)

---

## User Download Instructions

Update README.md with:

```markdown
## Download

### Pre-Built App (Recommended)

**macOS:**
1. Download from [Releases](https://github.com/samueljklee/canvas-ai/releases/latest)
2. Choose:
   - `Workspace Canvas-x.x.x-arm64.dmg` (Apple Silicon)
   - `Workspace Canvas-x.x.x.dmg` (Intel Mac)
3. Open DMG and drag to Applications
4. Right-click → Open (first time only)

**Windows/Linux:**
Coming soon!

### Build from Source

See [docs/BUILD.md](docs/BUILD.md) for build instructions.
```

---

## FAQ

**Q: Do I need to sign the app?**
A: Not required, but recommended for better user experience.

**Q: Can I distribute via Mac App Store?**
A: Yes, but requires additional work (sandboxing, entitlements).

**Q: How often should I release?**
A: Depends on your workflow. Weekly/monthly for active development.

**Q: Should I include both architectures?**
A: Yes! Provide both arm64 (Apple Silicon) and x64 (Intel).

**Q: Can users auto-update?**
A: Add `electron-updater` for auto-update functionality (see [electron-builder docs](https://www.electron.build/auto-update)).

---

## Resources

- [electron-builder docs](https://www.electron.build/)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github)
- [Code signing guide](https://www.electron.build/code-signing)
- [Notarization guide](https://kilianvalkhof.com/2019/electron/notarizing-your-electron-application/)

---

**Last Updated:** November 14, 2025
