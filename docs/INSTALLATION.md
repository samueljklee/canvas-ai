# Canvas AI - Installation Guide

**Version:** 0.1.0-beta
**Last Updated:** 2025-10-14

---

## System Requirements

### macOS
- macOS 10.15 (Catalina) or later
- 4 GB RAM minimum, 8 GB recommended
- 200 MB free disk space
- Internet connection for API access

### Windows
- Windows 10 (64-bit) or later
- 4 GB RAM minimum, 8 GB recommended
- 200 MB free disk space
- Internet connection for API access

### Linux
- Ubuntu 20.04+ or equivalent
- 4 GB RAM minimum, 8 GB recommended
- 200 MB free disk space
- Internet connection for API access

---

## Installation Instructions

### macOS Installation

#### Step 1: Download

Download the appropriate DMG file for your Mac:

- **Apple Silicon (M1/M2/M3/M4 Macs):**
  - File: `Workspace-Canvas-0.1.0-beta-arm64.dmg`
  - Check: About This Mac → Chip (should say "Apple M1" or similar)

- **Intel Macs:**
  - File: `Workspace-Canvas-0.1.0-beta-x64.dmg`
  - Check: About This Mac → Processor (should say "Intel")

#### Step 2: Install

1. **Open the DMG file** by double-clicking it
2. **Drag "Canvas AI"** to the Applications folder
3. **Eject the DMG** (right-click → Eject)

#### Step 3: First Launch

1. **Open Applications folder**
2. **Find "Canvas AI"**
3. **Right-click** the app and select **"Open"** (important for first launch!)
4. If you see a security dialog:
   - Click **"Open"** to confirm

**Why right-click?** macOS Gatekeeper requires this for apps not from the App Store.

#### Step 4: Configure

1. The **onboarding wizard** will appear
2. Click **"Get Started"**
3. Enter your Anthropic API key
4. Click **"Validate & Continue"**
5. Complete the quick tour
6. Start using the app!

---

### Windows Installation

#### Step 1: Download

Download the Windows installer:
- File: `Workspace-Canvas-Setup-0.1.0-beta.exe`

#### Step 2: Install

1. **Run the installer** by double-clicking the EXE file
2. If **Windows SmartScreen** appears:
   - Click **"More info"**
   - Click **"Run anyway"**
3. Follow the installation wizard:
   - Choose installation directory (default: `C:\Program Files\Canvas AI`)
   - Select if you want desktop/start menu shortcuts
   - Click **"Install"**

#### Step 3: Launch

1. Launch from **Start Menu** or **Desktop shortcut**
2. The **onboarding wizard** will appear

#### Step 4: Configure

1. Click **"Get Started"** in the wizard
2. Enter your Anthropic API key
3. Click **"Validate & Continue"**
4. Complete the quick tour
5. Start using the app!

---

### Linux Installation

#### AppImage (Universal)

1. **Download:** `Workspace-Canvas-0.1.0-beta.AppImage`
2. **Make executable:**
   ```bash
   chmod +x Workspace-Canvas-0.1.0-beta.AppImage
   ```
3. **Run:**
   ```bash
   ./Workspace-Canvas-0.1.0-beta.AppImage
   ```

#### Debian/Ubuntu (DEB Package)

1. **Download:** `canvas-ai_0.1.0-beta_amd64.deb`
2. **Install:**
   ```bash
   sudo dpkg -i canvas-ai_0.1.0-beta_amd64.deb
   ```
3. **Run from applications menu** or:
   ```bash
   canvas-ai
   ```

---

## Getting Your API Key

### Step 1: Create Anthropic Account

1. Visit: [console.anthropic.com](https://console.anthropic.com/)
2. Click "Sign Up" (or "Sign In" if you have an account)
3. Complete registration with your email

### Step 2: Get API Key

1. Log in to the Anthropic Console
2. Navigate to **"API Keys"** section
3. Click **"Create Key"**
4. Give it a name (e.g., "Canvas AI")
5. **Copy the key** - it starts with `sk-ant-`
6. **Save it safely** - you won't be able to see it again!

### Step 3: Configure in App

1. Launch Canvas AI
2. Enter the API key when prompted
3. Click "Validate & Continue"
4. You're ready to go!

**Note:** API keys are stored encrypted on your device using OS-level security (Keychain on Mac, Credential Manager on Windows).

---

## First-Time Setup

### Onboarding Wizard

The onboarding wizard appears on first launch and guides you through:

1. **Welcome Screen:**
   - Overview of app features
   - Choose "Get Started" or "Skip Setup"

2. **API Key Configuration:**
   - Enter your Anthropic API key
   - Validates the key before proceeding
   - Shows clear errors if key is invalid
   - "Get Your API Key" link for easy access

3. **Quick Tour:**
   - 3 slides explaining key features
   - Can skip at any point
   - Learn about canvas, agents, and organization

4. **Completion:**
   - Setup complete!
   - Start using Canvas AI

### Skipping Setup

If you click "Skip Setup":
- App loads normally
- You can explore file browser and editor (no API needed)
- A reminder banner appears at the top
- Click "Configure Now" on the banner to set up later
- Banner can be dismissed (reappears after 24 hours)

---

## Updating Your Configuration

### Update API Key

1. Click **⚙️ Settings** button in toolbar
2. Go to **"API Keys"** tab
3. Enter your new API key
4. Click **"Update Key"**
5. Changes take effect immediately (no restart needed)

### Remove API Key

1. Open Settings → API Keys tab
2. Click **"Remove Key"**
3. Confirm the removal
4. API key is securely deleted

You can add a new key anytime via Settings.

---

## Uninstallation

### macOS

1. **Quit Canvas AI** (⌘Q)
2. **Delete the app:**
   - Open Applications folder
   - Drag "Canvas AI" to Trash
3. **Delete data (optional):**
   ```bash
   rm -rf ~/Library/Application\ Support/canvas-ai/
   ```

### Windows

1. **Quit Canvas AI**
2. **Uninstall via Settings:**
   - Settings → Apps → Canvas AI → Uninstall
3. **Or use Control Panel:**
   - Control Panel → Programs → Uninstall a program
   - Select "Canvas AI" → Uninstall
4. **Delete data (optional):**
   - Delete: `%APPDATA%\canvas-ai\`

### Linux

**AppImage:**
- Just delete the AppImage file

**DEB:**
```bash
sudo dpkg -r canvas-ai
```

**Data (optional):**
```bash
rm -rf ~/.config/canvas-ai/
```

---

## Troubleshooting

### Installation Issues

**macOS: "App is damaged and can't be opened"**
- This happens with unsigned apps
- Fix: Run in Terminal:
  ```bash
  xattr -cr /Applications/Workspace\ Canvas.app
  ```

**Windows: "Windows protected your PC"**
- This is SmartScreen protection
- Click "More info" → "Run anyway"
- Or disable SmartScreen temporarily

**Linux: "Permission denied"**
- Make sure AppImage is executable:
  ```bash
  chmod +x Workspace-Canvas-*.AppImage
  ```

### Launch Issues

**App crashes on launch:**
- Check system requirements met
- Try deleting config and relaunching:
  ```bash
  # macOS
  rm -rf ~/Library/Application\ Support/canvas-ai/

  # Windows
  rmdir /s %APPDATA%\canvas-ai\
  ```

**Onboarding doesn't appear:**
- Expected if you've already completed setup
- To see it again: Delete config (see above)

### API Key Issues

**"Invalid API Key":**
1. Verify key starts with `sk-ant-`
2. Check for spaces or extra characters
3. Ensure key is active in Anthropic Console
4. Try getting a fresh key

**"Network error during validation":**
1. Check internet connection
2. Verify firewall isn't blocking app
3. Check Anthropic status: status.anthropic.com

**Key works in browser but not in app:**
- Try removing and re-adding the key
- Restart the app
- Check console logs (Help → Developer Tools)

### Performance Issues

**App feels slow:**
- Close unused widgets
- Clear old conversation history
- Reduce number of active agents
- Check Activity Monitor/Task Manager for memory usage

**High memory usage:**
- Normal: 200-400 MB
- High: >1 GB (close some widgets)
- Restart app if persistently high

---

## Advanced Configuration

### Manual Config File

For advanced users, you can manually edit config:

**Location:**
- macOS: `~/Library/Application Support/canvas-ai/config.json`
- Windows: `%APPDATA%\canvas-ai\config.json`

**Warning:** Don't edit while app is running. API key is in separate encrypted file.

### Developer Mode

If you have the source code:

```bash
# Clone repo
git clone https://github.com/microsoft/canvas-ai

# Install
pnpm install

# Create .env
echo "ANTHROPIC_API_KEY=your-key-here" > .env

# Run
npm run dev
```

---

## Data Migration

### Export Your Workspace

Currently manual - copy these files:
- `workspace.db` - All workspace data
- `config.json` - App preferences
- `secrets.json` - Encrypted API key

### Import to Another Machine

1. Install Canvas AI on new machine
2. Close the app
3. Copy files to config directory
4. Relaunch app

**Note:** Encrypted API key may not work across machines (OS-specific encryption). You'll need to reconfigure via Settings.

---

## Updates

### Checking for Updates

1. Open Settings (⚙️)
2. Go to "About" tab
3. Click "Check for Updates"

**Note:** Auto-update feature coming in future release. For now, download and install new versions manually.

### Updating

1. Download new version installer/DMG
2. Install over existing version
3. Your data and settings are preserved

---

## Privacy & Security

### What Data Is Stored

**Locally on Your Device:**
- Workspace configurations
- Widget states and positions
- Conversation history with AI agents
- Command history
- API key (encrypted)

**Not Stored:**
- No cloud sync
- No telemetry or analytics
- No crash reports
- No usage tracking

### What Data Is Sent

**To Anthropic (via API):**
- Your messages to AI agents
- File contents you share with agents
- Tool execution results

**Nowhere Else:**
- No data sent to Microsoft or any third party
- No tracking pixels
- No external analytics

### API Key Security

- Encrypted using your OS's secure storage
- macOS: Keychain (same as saved passwords)
- Windows: DPAPI (Windows Credential Manager)
- Never sent to renderer process
- Never logged or exposed
- Can be removed anytime

---

## Getting Help

### Documentation

- **User Guide:** This file (INSTALLATION.md)
- **FAQ:** `docs/FAQ.md`
- **Technical Details:** `docs/ONBOARDING-IMPLEMENTATION-SUMMARY.md`

### Support Channels

- **Email:** samule@microsoft.com
- **Issues:** GitHub Issues (for bug reports)
- **Feature Requests:** GitHub Discussions

### Common Questions

See `docs/FAQ.md` for answers to:
- How much does API usage cost?
- Can I use multiple API keys?
- How do I backup my workspaces?
- What models are supported?
- And more...

---

## What's Next

### Upcoming Features (Roadmap)

- 🔄 Auto-update system
- 🎨 Theme customization
- 🤖 Model selection UI
- 📊 API usage dashboard
- 🌐 Cloud workspace sync (optional)
- 🔌 Plugin system
- 📱 Mobile companion app

### Contributing

This is currently a proprietary application. For collaboration inquiries, contact samule@microsoft.com.

---

**Thank you for using Canvas AI!** 🎨

*Built with ❤️ using Claude AI*
