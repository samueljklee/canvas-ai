# Canvas AI App - Onboarding & Packaging Implementation Plan

**Version:** 1.0
**Last Updated:** 2025-10-14
**Status:** Planning Phase

---

## Executive Summary

This document outlines the complete implementation plan for converting Canvas AI App from a developer-focused .env-based application to a production-ready, user-friendly packaged application with smooth onboarding for Mac and Windows users.

**Goals:**
1. Enable non-technical users to configure and use the app
2. Secure API key storage using OS-level encryption
3. Distribute packaged installers for Mac (DMG) and Windows (EXE)
4. Provide excellent first-run experience with wizard and persistent settings

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [User Experience Design](#user-experience-design)
3. [Technical Architecture](#technical-architecture)
4. [Implementation Phases](#implementation-phases)
5. [Packaging Strategy](#packaging-strategy)
6. [Testing & Validation](#testing--validation)
7. [Distribution & Updates](#distribution--updates)

---

## Current State Analysis

### **Existing Setup**
- **Configuration:** `.env` file with `ANTHROPIC_API_KEY`
- **Target Users:** Developers comfortable with environment variables
- **Distribution:** Manual `npm start` execution
- **Limitations:**
  - Requires technical knowledge to set up
  - API key stored in plaintext
  - Not distributable as standalone app
  - No user-facing configuration UI

### **Files Using API Key**
- `src/main/AnthropicAgentManager.ts:38` - Reads `process.env.ANTHROPIC_API_KEY`
- `.env` - Plaintext storage (development only)

---

## User Experience Design

### **First Launch Flow**

```
┌─────────────────────────────────────────────────────────┐
│                    FIRST LAUNCH                          │
└─────────────────────────────────────────────────────────┘

Step 1: Welcome Screen (Modal)
┌─────────────────────────────────────┐
│  Welcome to Canvas AI! 🎨     │
│                                      │
│  Coordinate multiple Claude AI       │
│  agents in an infinite canvas.       │
│                                      │
│  Features:                           │
│  • Multi-agent orchestration         │
│  • File browser integration          │
│  • Document editing                  │
│  • Command history & persistence     │
│                                      │
│  [Get Started] [Skip Setup]          │
└─────────────────────────────────────┘

Step 2a: API Key Configuration (if "Get Started")
┌─────────────────────────────────────┐
│  Anthropic API Key Setup             │
│                                      │
│  Enter your Anthropic API key:       │
│  ┌─────────────────────────────────┐ │
│  │ sk-ant-...                      │ │
│  └─────────────────────────────────┘ │
│                                      │
│  Don't have an API key?              │
│  [Get Your API Key →]                │
│  https://console.anthropic.com/      │
│                                      │
│  ⚠️ Your key is encrypted and        │
│     stored securely on your device   │
│                                      │
│  [Back]  [Validate & Continue]       │
└─────────────────────────────────────┘
    ↓ (Validates with test API call)

Step 2b: Validation Success
┌─────────────────────────────────────┐
│  ✓ API Key Validated!                │
│                                      │
│  Connection successful               │
│  Model: Claude Sonnet 4.5            │
│                                      │
│  [Continue to Quick Tour]            │
└─────────────────────────────────────┘

Step 3: Quick Tour
┌─────────────────────────────────────┐
│  Quick Tour (1/3)                    │
│                                      │
│  Create Your First Agent             │
│  ┌─────────────────────┐             │
│  │  [New Agent] ← Click │             │
│  └─────────────────────┘             │
│                                      │
│  Click the "New Agent" button to     │
│  create a Claude AI agent widget.    │
│                                      │
│  [Next] [Skip Tour]                  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Quick Tour (2/3)                    │
│                                      │
│  Send Commands                       │
│  • Type in the command input         │
│  • Press Enter to send               │
│  • Use ↑↓ for command history        │
│  • Use @ for file autocomplete       │
│                                      │
│  [Next] [Skip Tour]                  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Quick Tour (3/3)                    │
│                                      │
│  Explore More Features               │
│  • 📁 File Browser - Navigate files  │
│  • 📝 Editor - Edit documents        │
│  • ⌘K - Command palette              │
│  • ⚙️ Settings - Update config       │
│                                      │
│  [Start Using Canvas AI]      │
└─────────────────────────────────────┘
```

### **Skipped Setup Flow**

```
User clicks "Skip Setup"
    ↓
App loads normally
    ↓
Persistent reminder banner at top:
┌─────────────────────────────────────────────────────────┐
│ ⚠️ API Key not configured. [Configure Now] [Dismiss]    │
└─────────────────────────────────────────────────────────┘
    ↓
User can:
- Browse files (works without API)
- Edit documents (works without API)
- Create workspaces (works without API)
- View UI and explore

When trying to create agent:
    ↓
Show contextual prompt (see Step 2a above)
```

### **Settings Panel (Always Accessible)**

```
Click ⚙️ Settings button in toolbar
    ↓
┌─────────────────────────────────────┐
│  Settings                            │
│  ┌─────────────────────────────────┐ │
│  │ 🔑 API Key                      │ │
│  │ 🤖 Model Selection              │ │
│  │ 🎨 Appearance                   │ │
│  │ 💾 Data & Storage               │ │
│  │ ⌨️  Keyboard Shortcuts           │ │
│  │ ℹ️  About                        │ │
│  └─────────────────────────────────┘ │
│                                      │
│  [Current Tab: API Key]              │
│                                      │
│  Status: ✓ Connected                 │
│  Current Key: sk-ant-...xxxxx        │
│                                      │
│  [Update API Key]                    │
│  [Test Connection]                   │
│  [Remove Key]                        │
│                                      │
│  [Save] [Cancel]                     │
└─────────────────────────────────────┘
```

---

## Technical Architecture

### **Configuration Manager Architecture**

```typescript
// src/main/ConfigManager.ts

import { safeStorage } from 'electron';
import Store from 'electron-store';
import Anthropic from '@anthropic-ai/sdk';

interface AppConfig {
  // Authentication (encrypted separately)
  anthropicApiKey?: string;  // Not stored directly

  // User Preferences
  selectedModel: 'claude-sonnet-4' | 'claude-opus-3' | 'claude-haiku';
  theme: 'dark' | 'light' | 'system';

  // Onboarding State
  hasCompletedOnboarding: boolean;
  onboardingSkipped: boolean;
  lastOnboardingPrompt: number;
  tourCompleted: boolean;

  // Advanced Settings
  autoUpdate: boolean;
  showSetupReminder: boolean;
  telemetryEnabled: boolean;

  // App State
  firstLaunchDate: number;
  lastUsedVersion: string;
}

class ConfigManager {
  private store: Store<AppConfig>;
  private encryptedStore: Store;  // For API key

  constructor() {
    // Regular config
    this.store = new Store<AppConfig>({
      defaults: {
        selectedModel: 'claude-sonnet-4',
        theme: 'dark',
        hasCompletedOnboarding: false,
        onboardingSkipped: false,
        tourCompleted: false,
        autoUpdate: true,
        showSetupReminder: true,
        telemetryEnabled: false,
        firstLaunchDate: Date.now(),
        lastUsedVersion: app.getVersion(),
      }
    });

    // Encrypted store for sensitive data
    this.encryptedStore = new Store({
      name: 'secure',
      encryptionKey: 'canvas-ai-secure-key',
    });
  }

  // API Key Management (Encrypted)
  async setApiKey(key: string): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption not available on this system');
    }

    const encrypted = safeStorage.encryptString(key);
    this.encryptedStore.set('apiKeyEncrypted', encrypted.toString('base64'));
  }

  async getApiKey(): Promise<string | null> {
    const encrypted = this.encryptedStore.get('apiKeyEncrypted') as string;
    if (!encrypted) return null;

    try {
      const buffer = Buffer.from(encrypted, 'base64');
      return safeStorage.decryptString(buffer);
    } catch (error) {
      console.error('Failed to decrypt API key:', error);
      return null;
    }
  }

  async validateApiKey(key: string): Promise<boolean> {
    try {
      const client = new Anthropic({ apiKey: key });
      await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async removeApiKey(): Promise<void> {
    this.encryptedStore.delete('apiKeyEncrypted');
  }

  // Onboarding State
  markOnboardingComplete(): void {
    this.store.set('hasCompletedOnboarding', true);
    this.store.set('tourCompleted', true);
  }

  skipOnboarding(): void {
    this.store.set('onboardingSkipped', true);
    this.store.set('lastOnboardingPrompt', Date.now());
  }

  shouldShowOnboarding(): boolean {
    return !this.store.get('hasCompletedOnboarding') &&
           !this.store.get('onboardingSkipped');
  }

  shouldShowSetupReminder(): boolean {
    if (!this.store.get('onboardingSkipped')) return false;
    if (this.store.get('hasCompletedOnboarding')) return false;

    const lastPrompt = this.store.get('lastOnboardingPrompt') || 0;
    const daysSincePrompt = (Date.now() - lastPrompt) / (1000 * 60 * 60 * 24);

    return daysSincePrompt > 1; // Show reminder after 1 day
  }

  // Config getters/setters
  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.store.get(key);
  }

  set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    this.store.set(key, value);
  }
}

export const configManager = new ConfigManager();
```

### **IPC Handlers for Config**

```typescript
// src/main/index.ts

import { configManager } from './ConfigManager';

// API Key Management
ipcMain.handle('config:get-api-key', async () => {
  try {
    const key = await configManager.getApiKey();
    return { success: true, hasKey: !!key, keyPreview: key ? maskApiKey(key) : null };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('config:set-api-key', async (event, key: string) => {
  try {
    // Validate first
    const isValid = await configManager.validateApiKey(key);
    if (!isValid) {
      return { success: false, error: 'Invalid API key' };
    }

    await configManager.setApiKey(key);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('config:validate-api-key', async (event, key: string) => {
  try {
    const isValid = await configManager.validateApiKey(key);
    return { success: true, valid: isValid };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('config:remove-api-key', async () => {
  try {
    await configManager.removeApiKey();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Onboarding State
ipcMain.handle('config:should-show-onboarding', async () => {
  return { success: true, shouldShow: configManager.shouldShowOnboarding() };
});

ipcMain.handle('config:complete-onboarding', async () => {
  configManager.markOnboardingComplete();
  return { success: true };
});

ipcMain.handle('config:skip-onboarding', async () => {
  configManager.skipOnboarding();
  return { success: true };
});

// General Config
ipcMain.handle('config:get', async (event, key: string) => {
  return { success: true, value: configManager.get(key as any) };
});

ipcMain.handle('config:set', async (event, key: string, value: any) => {
  configManager.set(key as any, value);
  return { success: true };
});

// Helper
function maskApiKey(key: string): string {
  if (key.length < 10) return '***';
  return key.substring(0, 7) + '...' + key.substring(key.length - 4);
}
```

### **Preload API Extensions**

```typescript
// src/preload/index.ts

const configApi = {
  // API Key
  getApiKey: () => ipcRenderer.invoke('config:get-api-key'),
  setApiKey: (key: string) => ipcRenderer.invoke('config:set-api-key', key),
  validateApiKey: (key: string) => ipcRenderer.invoke('config:validate-api-key', key),
  removeApiKey: () => ipcRenderer.invoke('config:remove-api-key'),

  // Onboarding
  shouldShowOnboarding: () => ipcRenderer.invoke('config:should-show-onboarding'),
  completeOnboarding: () => ipcRenderer.invoke('config:complete-onboarding'),
  skipOnboarding: () => ipcRenderer.invoke('config:skip-onboarding'),

  // General
  get: (key: string) => ipcRenderer.invoke('config:get', key),
  set: (key: string, value: any) => ipcRenderer.invoke('config:set', key, value),
};

contextBridge.exposeInMainWorld('config', configApi);
```

---

## User Experience Design

### **Onboarding Wizard Component**

**File:** `src/components/OnboardingWizard.tsx`

**Features:**
- Multi-step modal dialog
- Step 1: Welcome screen
- Step 2: API key input with validation
- Step 3: Quick tour (optional)
- Skip button on each step
- Progress indicator
- Keyboard navigation (Enter to continue, Esc to skip)

**User Actions:**
1. **Configure Now** → API key setup → Validation → Success → Tour → Main app
2. **Skip Setup** → Main app with reminder banner → Can configure later via Settings

### **Settings Panel Component**

**File:** `src/components/SettingsPanel.tsx` (expand existing SettingsModal)

**Tabs:**

#### **1. 🔑 API Key Tab**
```
┌─────────────────────────────────────┐
│  Anthropic API Key                   │
│                                      │
│  Status: ✓ Connected                 │
│  Current Key: sk-ant-...xxxxx        │
│  Last Validated: 2 hours ago         │
│                                      │
│  ┌─────────────────────────────────┐ │
│  │ Update API Key:                 │ │
│  │ [Enter new key...]              │ │
│  └─────────────────────────────────┘ │
│                                      │
│  [Validate Key]  [Update]  [Remove]  │
│                                      │
│  Need an API key?                    │
│  [Get Your API Key →]                │
└─────────────────────────────────────┘
```

#### **2. 🤖 Model Selection Tab**
```
┌─────────────────────────────────────┐
│  Claude Model Selection              │
│                                      │
│  ○ Claude Sonnet 4.5 (Recommended)   │
│     Fast, capable, cost-effective    │
│     Best for: Most tasks             │
│                                      │
│  ○ Claude Opus 3.7                   │
│     Most capable, slower, pricier    │
│     Best for: Complex reasoning      │
│                                      │
│  ○ Claude Haiku                      │
│     Fastest, most affordable         │
│     Best for: Simple tasks           │
│                                      │
│  [Save Selection]                    │
└─────────────────────────────────────┘
```

#### **3. 💾 Data & Privacy Tab**
```
┌─────────────────────────────────────┐
│  Data Storage                        │
│                                      │
│  Database Location:                  │
│  ~/Library/Application Support/      │
│  canvas-ai/workspace.db       │
│                                      │
│  Storage Used: 2.4 MB                │
│  Workspaces: 3                       │
│  Total Widgets: 12                   │
│                                      │
│  [Open Database Folder]              │
│  [Clear All Data]                    │
│                                      │
│  Privacy:                            │
│  ✓ All data stored locally           │
│  ✓ No analytics collected            │
│  ✓ API key encrypted with OS keychain│
│                                      │
│  [Export Workspace]  [Import]        │
└─────────────────────────────────────┘
```

#### **4. ℹ️ About Tab**
```
┌─────────────────────────────────────┐
│  About Canvas AI              │
│                                      │
│  Version: 0.1.0                      │
│  Electron: 30.5.1                    │
│  Chrome: 124.0.6367.243              │
│  Node: 20.18.0                       │
│                                      │
│  [Check for Updates]                 │
│  [View Changelog]                    │
│  [Report Issue]                      │
│                                      │
│  Open Source Licenses                │
│  [View Licenses]                     │
│                                      │
│  © 2025 Canvas AI             │
└─────────────────────────────────────┘
```

### **Setup Reminder Banner**

**File:** `src/components/SetupReminderBanner.tsx`

```tsx
// Shown when onboarding skipped and no API key configured
┌─────────────────────────────────────────────────────────┐
│ ⚠️ Configure your Anthropic API key to create AI agents │
│ [Configure Now] [Get API Key →] [Dismiss]               │
└─────────────────────────────────────────────────────────┘

// Auto-dismiss: After user configures key
// Re-show: If dismissed, show again after 24 hours
// Hide forever: If user clicks "Don't show again" (add checkbox)
```

---

## Implementation Phases

### **Phase 1: Configuration System** ⏱️ 1-2 days

#### **Tasks:**
- [x] Install dependencies: `electron-store`
- [ ] Create `src/main/ConfigManager.ts`
- [ ] Implement encrypted API key storage with `safeStorage`
- [ ] Add IPC handlers for config operations
- [ ] Extend preload API with config methods
- [ ] Update `AnthropicAgentManager` to use ConfigManager
- [ ] Add .env fallback for development mode
- [ ] Write unit tests for ConfigManager

#### **Files to Create:**
```
src/main/ConfigManager.ts          (200 lines)
tests/main/ConfigManager.test.ts   (150 lines)
```

#### **Files to Modify:**
```
src/main/index.ts                  (+80 lines - IPC handlers)
src/main/AnthropicAgentManager.ts  (+15 lines - use ConfigManager)
src/preload/index.ts               (+30 lines - config API)
src/types/electron.d.ts            (+20 lines - config types)
package.json                       (+1 dependency)
```

#### **Testing:**
```bash
npm test                           # Unit tests pass
npm run dev                        # App starts with ConfigManager
# Verify .env fallback still works
```

---

### **Phase 2: Onboarding UI** ⏱️ 1-2 days

#### **Tasks:**
- [ ] Create `OnboardingWizard` component
- [ ] Add welcome screen with app overview
- [ ] Create API key input form with validation
- [ ] Add loading states and error handling
- [ ] Create quick tour slides (3 steps)
- [ ] Add "Get API Key" external link handler
- [ ] Implement skip functionality
- [ ] Create `SetupReminderBanner` component
- [ ] Add first-run detection on app launch
- [ ] Style onboarding components

#### **Files to Create:**
```
src/components/OnboardingWizard.tsx      (300 lines)
src/components/SetupReminderBanner.tsx   (80 lines)
src/styles/OnboardingWizard.css          (150 lines)
src/styles/SetupReminderBanner.css       (40 lines)
```

#### **Files to Modify:**
```
src/Canvas.tsx                    (+40 lines - show wizard/banner)
src/components/SettingsModal.tsx  (+100 lines - API key tab)
```

#### **User Flow Testing:**
```
Test 1: Fresh Install
- Delete config: rm -rf ~/Library/Application\ Support/canvas-ai/
- Launch app
- Verify wizard appears
- Enter invalid key → See error
- Enter valid key → See success
- Complete tour
- Verify main app loads

Test 2: Skip Flow
- Delete config
- Launch app
- Click "Skip Setup"
- Verify banner appears
- Click agent creation → See contextual prompt
- Configure via prompt
- Verify banner disappears

Test 3: Settings Update
- Launch app with existing key
- Open Settings (⚙️)
- Update API key
- Verify immediate effect
```

---

### **Phase 3: Packaging Configuration** ⏱️ 2-3 days

#### **Tasks:**
- [ ] Create `electron-builder.json` configuration
- [ ] Design and create app icons (1024x1024 PNG)
  - Generate .icns for Mac (icon.icns)
  - Generate .ico for Windows (icon.ico)
- [ ] Configure Mac build (DMG, ARM64 + x64)
- [ ] Configure Windows build (NSIS installer, x64)
- [ ] Add build scripts to package.json
- [ ] Test local builds on Mac
- [ ] Test Windows build (via CI or VM)
- [ ] Configure code signing (optional for beta)
- [ ] Add app metadata (version, description, author)

#### **Files to Create:**
```
electron-builder.json              (100 lines)
build/icon.png                     (1024x1024 source)
build/icon.icns                    (Mac icon set)
build/icon.ico                     (Windows icon)
build/entitlements.mac.plist       (Mac permissions)
.github/workflows/release.yml      (CI build - optional)
```

#### **electron-builder.json:**
```json
{
  "appId": "com.canvas-ai.app",
  "productName": "Canvas AI",
  "copyright": "Copyright © 2025 Canvas AI",
  "directories": {
    "output": "release",
    "buildResources": "build"
  },
  "files": [
    "dist/**/*",
    "package.json"
  ],
  "extraMetadata": {
    "main": "dist/main/main/index.js"
  },
  "mac": {
    "target": [
      {
        "target": "dmg",
        "arch": ["arm64", "x64"]
      },
      {
        "target": "zip",
        "arch": ["arm64", "x64"]
      }
    ],
    "category": "public.app-category.developer-tools",
    "icon": "build/icon.icns",
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "build/entitlements.mac.plist",
    "entitlementsInherit": "build/entitlements.mac.plist"
  },
  "dmg": {
    "title": "Canvas AI ${version}",
    "icon": "build/icon.icns",
    "contents": [
      {
        "x": 130,
        "y": 220
      },
      {
        "x": 410,
        "y": 220,
        "type": "link",
        "path": "/Applications"
      }
    ]
  },
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64"]
      },
      {
        "target": "portable",
        "arch": ["x64"]
      }
    ],
    "icon": "build/icon.ico"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true
  },
  "linux": {
    "target": ["AppImage", "deb"],
    "category": "Development",
    "icon": "build/icon.png"
  }
}
```

#### **Package.json Scripts:**
```json
{
  "scripts": {
    "build": "tsc && vite build",
    "build:main": "tsc --project tsconfig.main.json",
    "build:all": "npm run build:main && npm run build",
    "pack": "npm run build:all && electron-builder --dir",
    "dist": "npm run build:all && electron-builder",
    "dist:mac": "npm run build:all && electron-builder --mac",
    "dist:win": "npm run build:all && electron-builder --win",
    "dist:all": "npm run build:all && electron-builder --mac --win --linux",
    "release": "npm run build:all && electron-builder --publish always"
  }
}
```

#### **Build Commands:**
```bash
# Test packaging (creates unpacked app)
npm run pack

# Build Mac DMG (on macOS)
npm run dist:mac
# Output: release/Workspace-Canvas-0.1.0-arm64.dmg (Apple Silicon)
#         release/Workspace-Canvas-0.1.0-x64.dmg (Intel)

# Build Windows installer (requires Windows or CI)
npm run dist:win
# Output: release/Workspace-Canvas-Setup-0.1.0.exe

# Build all platforms (on CI)
npm run dist:all
```

---

### **Phase 4: Auto-Update System** ⏱️ 1 day (Optional)

#### **Tasks:**
- [ ] Install `electron-updater`
- [ ] Configure update server (GitHub Releases)
- [ ] Add update check on app launch
- [ ] Create update notification UI
- [ ] Add "Check for Updates" in Settings → About
- [ ] Test update mechanism with beta builds

#### **Implementation:**
```typescript
// src/main/AutoUpdater.ts
import { autoUpdater } from 'electron-updater';

export class AutoUpdater {
  constructor(private mainWindow: BrowserWindow) {
    this.setupAutoUpdater();
  }

  private setupAutoUpdater() {
    autoUpdater.on('update-available', () => {
      this.mainWindow.webContents.send('update-available');
    });

    autoUpdater.on('update-downloaded', () => {
      this.mainWindow.webContents.send('update-downloaded');
    });
  }

  async checkForUpdates() {
    if (isDev) return;
    await autoUpdater.checkForUpdates();
  }

  quitAndInstall() {
    autoUpdater.quitAndInstall();
  }
}
```

**electron-builder.json addition:**
```json
{
  "publish": {
    "provider": "github",
    "owner": "your-username",
    "repo": "canvas-ai"
  }
}
```

---

## Packaging Strategy

### **Build Matrix**

| Platform | Architecture | Format | Size | Notes |
|----------|-------------|--------|------|-------|
| macOS | ARM64 (Apple Silicon) | DMG | ~150 MB | Primary Mac target |
| macOS | x64 (Intel) | DMG | ~150 MB | Legacy Mac support |
| Windows | x64 | NSIS Installer | ~180 MB | Standard installer |
| Windows | x64 | Portable EXE | ~180 MB | No install required |
| Linux | x64 | AppImage | ~170 MB | Universal Linux |
| Linux | x64 | DEB | ~170 MB | Debian/Ubuntu |

### **Code Signing** (Optional but recommended)

**Mac:**
- Requires Apple Developer account ($99/year)
- Prevents "Unidentified Developer" warning
- Required for auto-updates

**Windows:**
- Requires code signing certificate ($100-300/year)
- Prevents SmartScreen warnings
- Optional for beta distribution

**Alternative (Free):**
- Skip signing for beta/personal use
- Users need to:
  - Mac: Right-click → Open (first time)
  - Windows: Click "More info" → "Run anyway"

### **Distribution Channels**

#### **Option A: GitHub Releases (Recommended)**
```
Pros:
✓ Free hosting
✓ Automatic with CI/CD
✓ Version management built-in
✓ Works with electron-updater
✓ Easy to track downloads

Setup:
1. Push tag: git tag v0.1.0 && git push --tags
2. GitHub Actions builds all platforms
3. Uploads to Releases page
4. Users download from: github.com/user/repo/releases
```

#### **Option B: Direct File Sharing**
```
Pros:
✓ Immediate availability
✓ No setup required
✓ Good for small user base

Cons:
✗ No auto-update
✗ Manual distribution
✗ No analytics

Methods:
- Google Drive / Dropbox shared link
- File transfer services
- Email attachment (compressed)
```

---

## Implementation Timeline

### **Week 1: Configuration & Onboarding**

**Days 1-2:** Config System
- Create ConfigManager with encryption
- Add IPC handlers
- Update AnthropicAgentManager
- Test with existing features

**Days 3-4:** Onboarding UI
- Build OnboardingWizard component
- Add API key validation UI
- Create quick tour slides
- Add SetupReminderBanner

**Day 5:** Testing & Polish
- E2E test onboarding flow
- Fix bugs and edge cases
- Polish animations and styling

### **Week 2: Packaging & Distribution**

**Days 1-2:** Packaging Config
- Set up electron-builder
- Create app icons
- Configure build for Mac/Windows
- Test local builds

**Days 3-4:** Distribution Prep
- Set up GitHub releases (if using)
- Write installation instructions
- Create README for users
- Test on clean machines

**Day 5:** Release
- Build final packages
- Upload to distribution channel
- Send to beta testers
- Gather feedback

---

## Testing & Validation

### **Configuration Testing**

```bash
# Test 1: Fresh install without config
rm -rf ~/Library/Application\ Support/canvas-ai/
npm start
# Expected: Onboarding wizard appears

# Test 2: Invalid API key
# Enter: sk-ant-invalid-key
# Expected: Validation error shown

# Test 3: Valid API key
# Enter: sk-ant-[valid-key]
# Expected: Validation success, wizard proceeds

# Test 4: Skip onboarding
# Click "Skip Setup"
# Expected: App loads, reminder banner visible

# Test 5: Settings update
# Open Settings → Update API key
# Expected: Key updated, agents work immediately

# Test 6: Remove key
# Settings → Remove API Key
# Expected: Key deleted, app shows setup prompts

# Test 7: Encryption persistence
# Close app, reopen
# Expected: API key still works (decrypted successfully)
```

### **Packaging Testing**

```bash
# Mac Testing
npm run dist:mac
open release/Workspace-Canvas-0.1.0-arm64.dmg
# Install app
# Launch from Applications
# Verify: Onboarding works, agents work, persistence works

# Windows Testing (on Windows VM or CI)
npm run dist:win
# Run installer
# Install to Program Files
# Launch app
# Verify: All features work

# Cross-platform Testing
# Test on:
# - macOS 12+ (Monterey, Ventura, Sonoma)
# - Windows 10/11
# - Fresh user accounts (no dev tools)
```

---

## Distribution & Updates

### **Initial Distribution**

**For Beta Testing:**
1. Build packages: `npm run dist:mac` (and dist:win on Windows)
2. Upload to GitHub Releases (create v0.1.0 tag)
3. Share download link:
   ```
   Mac (Apple Silicon): github.com/user/repo/releases/download/v0.1.0/Workspace-Canvas-0.1.0-arm64.dmg
   Mac (Intel):         github.com/user/repo/releases/download/v0.1.0/Workspace-Canvas-0.1.0-x64.dmg
   Windows:             github.com/user/repo/releases/download/v0.1.0/Workspace-Canvas-Setup-0.1.0.exe
   ```

**Installation Instructions for Users:**

**macOS:**
```
1. Download the DMG file for your Mac (ARM64 for M1/M2/M3, x64 for Intel)
2. Open the DMG file
3. Drag "Canvas AI" to Applications folder
4. Open from Applications (right-click → Open first time if not code signed)
5. Follow onboarding wizard to configure API key
```

**Windows:**
```
1. Download the Setup.exe file
2. Run the installer (click "More info" → "Run anyway" if SmartScreen appears)
3. Follow installation wizard
4. Launch from Start Menu or Desktop
5. Follow onboarding wizard to configure API key
```

### **Future: Auto-Update Flow**

```
App launches
    ↓
Check for updates (background)
    ↓
Update available?
    ↓ Yes
┌─────────────────────────────────────┐
│  Update Available                    │
│                                      │
│  Version 0.2.0 is available          │
│  You're running: 0.1.0               │
│                                      │
│  Release notes:                      │
│  • New feature: Multi-model support  │
│  • Bug fixes                         │
│                                      │
│  [Download & Install]  [Later]       │
└─────────────────────────────────────┘
    ↓ (Downloads in background)
┌─────────────────────────────────────┐
│  Update Ready                        │
│                                      │
│  Restart to install update           │
│                                      │
│  [Restart Now]  [Later]              │
└─────────────────────────────────────┘
```

---

## Security Considerations

### **API Key Protection**

1. **Encryption at Rest:**
   - Use `electron.safeStorage` (OS-level encryption)
   - macOS: Keychain encryption
   - Windows: DPAPI (Data Protection API)
   - Linux: libsecret

2. **No Network Exposure:**
   - API key never sent anywhere except Anthropic
   - No telemetry includes key
   - No logging of full key (mask in logs)

3. **User Control:**
   - Easy to view status (connected/not connected)
   - Easy to update key
   - Easy to remove key
   - Export workspace without exposing key

### **Privacy Statement:**

```
Privacy & Security

✓ Your API key is encrypted using your operating system's secure storage
✓ All data is stored locally on your device
✓ No analytics or telemetry collected
✓ API calls go directly to Anthropic (not through our servers)
✓ Workspace data never leaves your device

You can delete all data anytime via Settings → Data & Privacy
```

---

## File Size Optimization

### **Current Bundle Analysis:**
```
dist/assets/index-DaR-31Hg.js   876 KB  (main bundle)
dist/assets/mermaid chunks     ~2 MB   (diagram library)
dist/assets/monaco chunks      ~1.5 MB (code editor)
```

### **Optimization Strategies:**

1. **Lazy Load Heavy Dependencies:**
```typescript
// Load mermaid only when needed
const loadMermaid = async () => {
  const { default: mermaid } = await import('mermaid');
  return mermaid;
};
```

2. **Code Splitting:**
```typescript
// Vite config
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'monaco': ['@monaco-editor/react'],
          'mermaid': ['mermaid'],
          'vendor': ['react', 'react-dom'],
        }
      }
    }
  }
});
```

3. **Asset Compression:**
- Enable gzip/brotli for asar archive
- Minimize icon sizes
- Remove unused dependencies

**Target Sizes:**
- Mac DMG: ~120-150 MB (down from 200 MB)
- Windows Installer: ~140-180 MB

---

## Dependencies to Add

```json
{
  "dependencies": {
    "electron-store": "^8.1.0"  // Config management
  },
  "devDependencies": {
    "electron-builder": "^24.0.0",  // Already installed
    "electron-updater": "^6.1.0"     // For auto-updates (Phase 4)
  }
}
```

---

## User Documentation

### **Files to Create:**

1. **README.md** (for users, not developers)
   - What is Canvas AI
   - Installation instructions
   - Getting an API key
   - Basic usage guide
   - Troubleshooting

2. **INSTALLATION.md**
   - Platform-specific install steps
   - First-run setup guide
   - Screenshots

3. **FAQ.md**
   - Common questions
   - API key issues
   - Performance tips
   - Privacy concerns

---

## Success Metrics

### **Phase 1 Success:**
- ✅ App starts without .env file
- ✅ Config stored encrypted on disk
- ✅ API key can be updated via code
- ✅ Development mode still uses .env fallback

### **Phase 2 Success:**
- ✅ First launch shows onboarding
- ✅ Invalid keys show clear errors
- ✅ Valid keys are saved and work
- ✅ Skip flow works with reminders
- ✅ Settings panel can update config

### **Phase 3 Success:**
- ✅ Mac DMG installs cleanly
- ✅ Windows EXE installs cleanly
- ✅ App launches on fresh user account
- ✅ Onboarding works in packaged app
- ✅ API key persistence works after restart

---

## Risk Mitigation

### **Risks & Solutions**

| Risk | Impact | Mitigation |
|------|--------|------------|
| API key encryption fails | High | Graceful fallback to plaintext with warning |
| Build fails on Windows | Medium | Use GitHub Actions Windows runner |
| DMG not opening on older macOS | Medium | Test on macOS 12+ (Monterey minimum) |
| Large file size | Low | Optimize later, functionality first |
| Code signing issues | Low | Distribute unsigned for beta, sign for release |
| User forgets API key | Low | Add "Test Connection" to help diagnose |

---

## Development Environment vs Production

### **Development Mode** (npm run dev)
```
✓ Uses .env file (fallback)
✓ Hot reload enabled
✓ DevTools open by default
✓ Source maps available
✓ Faster iteration
```

### **Production Mode** (packaged app)
```
✓ Uses ConfigManager (encrypted storage)
✓ No hot reload
✓ DevTools hidden (Cmd+Opt+I to open)
✓ Optimized bundle
✓ App signed (optional)
✓ Auto-update enabled (optional)
```

### **Environment Detection:**
```typescript
const isDev = process.env.NODE_ENV === 'development' ||
              !app.isPackaged;

// In ConfigManager
async getApiKey(): Promise<string | null> {
  // Production: Use encrypted storage
  if (!isDev) {
    return this.getEncryptedApiKey();
  }

  // Development: Check .env fallback
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }

  // Fallback to config
  return this.getEncryptedApiKey();
}
```

---

## Rollout Plan

### **Beta Release (v0.1.0-beta)**
1. Package app without code signing
2. Distribute to 5-10 beta testers
3. Gather feedback on:
   - Onboarding clarity
   - Installation issues
   - API key setup confusion
   - Feature requests
4. Iterate based on feedback

### **Public Release (v0.1.0)**
1. Implement feedback from beta
2. Add code signing (if budget allows)
3. Write complete user documentation
4. Create demo video/screenshots
5. Announce on relevant communities

### **Post-Launch (v0.2.0+)**
1. Add auto-update system
2. Add telemetry (opt-in)
3. Multi-API key support
4. Cloud sync (optional)
5. Collaboration features

---

## Questions for Final Decisions

Before implementation, please confirm:

1. **App Name:** "Canvas AI" official? Or rebrand?

2. **Onboarding Length:**
   - Quick (1 step: API key only)
   - Standard (3 steps: Welcome → API → Tour)
   - Comprehensive (5+ steps with tutorial)

3. **Demo Mode:** Should app work at all without API key, or require it immediately?

4. **Model Selection:** Include in onboarding wizard or only in settings?

5. **Code Signing:** Budget for certificates, or skip for beta?

6. **Target Users:**
   - Developers only (technical docs)
   - General users (simplified docs)
   - Both (dual documentation)

7. **Pricing Display:** Show Anthropic API pricing info anywhere in app?

8. **Support Channel:** GitHub Issues, Discord, Email, or in-app help?

---

## Decisions Made

**From User Input (2025-10-14):**
1. ✅ **App Name:** Canvas AI (may rebrand later if better name found)
2. ✅ **License:** Proprietary/Confidential (private, high confidential)
3. ✅ **GitHub Repo:** Use placeholder values for now
4. ✅ **First Launch:** Show onboarding wizard (blocking modal)
5. ✅ **Model Default:** Claude Sonnet 4.5 (existing logic handles providers)
6. ✅ **Onboarding UX:** Wizard on first run + Settings panel for updates (Option C)
7. ✅ **Key Storage:** OS Keychain with safeStorage (Option A)
8. ✅ **Distribution:** Direct download for now (Option A)
9. ✅ **Onboarding Flow:** Standard (Welcome → API Key → Quick Tour)
10. ✅ **Error Handling:** Graceful degradation (Option D)

---

## Complete Task Checklist

### **Phase 1: Configuration System** ⏱️ 1-2 days

#### **Setup:**
- [ ] Install `electron-store` dependency
- [ ] Add proprietary license to package.json
- [ ] Update app metadata (name, description, author)

#### **Core Implementation (TDD):**
- [ ] Write ConfigManager tests first (TDD approach)
  - [ ] Test: Get/set encrypted API key
  - [ ] Test: Validate API key with Anthropic
  - [ ] Test: Remove API key
  - [ ] Test: Onboarding state management
  - [ ] Test: Config persistence across restarts
  - [ ] Test: Encryption/decryption with safeStorage
  - [ ] Test: Fallback to .env in development mode
- [ ] Create `src/main/ConfigManager.ts`
  - [ ] Implement encrypted API key storage
  - [ ] Implement config persistence
  - [ ] Implement validation method
  - [ ] Add error handling
- [ ] Add IPC handlers in `src/main/index.ts`
  - [ ] config:get-api-key
  - [ ] config:set-api-key
  - [ ] config:validate-api-key
  - [ ] config:remove-api-key
  - [ ] config:should-show-onboarding
  - [ ] config:complete-onboarding
  - [ ] config:skip-onboarding
  - [ ] config:get (general config)
  - [ ] config:set (general config)
- [ ] Extend preload API in `src/preload/index.ts`
  - [ ] Add config namespace
  - [ ] Expose all config methods
- [ ] Update `src/types/electron.d.ts`
  - [ ] Add ConfigAPI interface
  - [ ] Add to Window interface
- [ ] Migrate `AnthropicAgentManager` to use ConfigManager
  - [ ] Replace process.env.ANTHROPIC_API_KEY
  - [ ] Add .env fallback for dev mode
  - [ ] Update initialization logic
- [ ] Test ConfigManager integration
  - [ ] Run unit tests
  - [ ] Manual test with app
  - [ ] Verify .env fallback works
  - [ ] Verify encryption works

### **Phase 2: Onboarding UI** ⏱️ 1-2 days

#### **Components (TDD):**
- [ ] Write OnboardingWizard tests
  - [ ] Test: Welcome screen renders
  - [ ] Test: API key input validation
  - [ ] Test: Skip functionality
  - [ ] Test: Tour navigation
  - [ ] Test: Completion flow
- [ ] Create `src/components/OnboardingWizard.tsx`
  - [ ] Step 1: Welcome screen
  - [ ] Step 2: API key input form
  - [ ] Step 3: Validation with loading state
  - [ ] Step 4: Success confirmation
  - [ ] Step 5: Quick tour (3 slides)
  - [ ] Skip button on all steps
  - [ ] Progress indicator
  - [ ] Keyboard navigation
- [ ] Create `src/components/SetupReminderBanner.tsx`
  - [ ] Persistent banner at top of canvas
  - [ ] "Configure Now" button
  - [ ] "Get API Key" link
  - [ ] Dismiss functionality
  - [ ] Don't show again option
- [ ] Expand `src/components/SettingsModal.tsx`
  - [ ] Add API Key tab
  - [ ] Add key input with validation
  - [ ] Add masked key display
  - [ ] Add "Test Connection" button
  - [ ] Add "Remove Key" button
  - [ ] Update existing tabs
- [ ] Style components
  - [ ] `src/styles/OnboardingWizard.css`
  - [ ] `src/styles/SetupReminderBanner.css`
  - [ ] Update `src/styles/SettingsModal.css`
- [ ] Integrate with Canvas
  - [ ] Add onboarding detection in Canvas.tsx
  - [ ] Show wizard on first launch
  - [ ] Show reminder banner if skipped
  - [ ] Hide banner when configured

#### **User Flow Testing:**
- [ ] Test fresh install → wizard → configure → success
- [ ] Test fresh install → skip → banner → configure later
- [ ] Test invalid API key → error message
- [ ] Test settings update → immediate effect
- [ ] Test tour navigation → skip → completion
- [ ] Test encrypted storage persistence

### **Phase 3: Packaging** ⏱️ 2-3 days

#### **Setup:**
- [ ] Create `electron-builder.json` configuration
  - [ ] Configure Mac builds (DMG, ARM64 + x64)
  - [ ] Configure Windows builds (NSIS + Portable)
  - [ ] Configure Linux builds (AppImage + DEB)
  - [ ] Set app metadata
  - [ ] Configure file associations
- [ ] Create app icons
  - [ ] Design/generate 1024x1024 source icon
  - [ ] Generate icon.icns for Mac
  - [ ] Generate icon.ico for Windows
  - [ ] Generate icon.png for Linux
- [ ] Create `build/` directory structure
  - [ ] Add icons
  - [ ] Add entitlements.mac.plist (Mac permissions)
  - [ ] Add installer assets
- [ ] Add build scripts to package.json
  - [ ] build:all (main + renderer)
  - [ ] pack (test packaging)
  - [ ] dist:mac
  - [ ] dist:win
  - [ ] dist:linux
  - [ ] dist:all

#### **Build Testing:**
- [ ] Test local Mac build
  - [ ] ARM64 DMG creation
  - [ ] x64 DMG creation
  - [ ] Install and launch test
  - [ ] Verify onboarding works
  - [ ] Verify API key persistence
- [ ] Test Windows build (VM or CI)
  - [ ] NSIS installer creation
  - [ ] Portable EXE creation
  - [ ] Install and launch test
  - [ ] Verify all features work
- [ ] Test Linux build (optional)
  - [ ] AppImage creation
  - [ ] DEB package creation
  - [ ] Install and test

#### **Documentation:**
- [ ] Create user-facing README.md
  - [ ] What is Canvas AI
  - [ ] Installation instructions
  - [ ] Getting started guide
  - [ ] Screenshots
- [ ] Create INSTALLATION.md
  - [ ] Mac installation steps
  - [ ] Windows installation steps
  - [ ] First-run setup guide
  - [ ] Troubleshooting section
- [ ] Create FAQ.md
  - [ ] API key questions
  - [ ] Installation issues
  - [ ] Usage tips
  - [ ] Privacy/security

### **Phase 4: Auto-Update** ⏱️ 1 day (Optional - Future)

- [ ] Install electron-updater
- [ ] Create AutoUpdater service
- [ ] Add update check on launch
- [ ] Create update notification UI
- [ ] Add "Check for Updates" menu item
- [ ] Configure GitHub releases integration
- [ ] Test update flow

### **Phase 5: Polish & Release** ⏱️ 1-2 days

- [ ] Code signing setup (if budget allows)
  - [ ] Mac: Apple Developer certificate
  - [ ] Windows: Code signing certificate
- [ ] Beta testing
  - [ ] Package unsigned builds
  - [ ] Distribute to 5-10 testers
  - [ ] Collect feedback
  - [ ] Fix critical issues
- [ ] Final release preparation
  - [ ] Version bump to 0.1.0
  - [ ] Generate changelog
  - [ ] Build final packages
  - [ ] Upload to distribution channel
  - [ ] Announce release

---

## Next Steps

**Immediate Action Items:**

1. **Review this plan** - Confirm approach aligns with your vision

2. **Answer final questions** - Make key decisions on UX/features

3. **Start Phase 1** - Begin ConfigManager implementation
   ```bash
   npm install electron-store
   # Create ConfigManager
   # Add IPC handlers
   # Test with existing features
   ```

4. **Design Icons** - Create app icon (1024x1024)
   - Professional designer (recommended)
   - AI-generated (Midjourney, DALL-E)
   - Simple design tool (Figma, Sketch)

5. **Write User Docs** - Start README for end users

**Estimated Total Time:** 1-2 weeks for complete implementation

**Implementation Status:** Ready to begin Phase 1 with TDD approach

**User Input Needed:** See ONBOARDING-AND-PACKAGING-USER-INPUT.md for any questions during implementation
