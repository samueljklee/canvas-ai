# Workspace Canvas - User Input Required

**Status:** Active
**Last Updated:** 2025-10-14

This document tracks questions and decisions needed from the user during the onboarding and packaging implementation.

---

## Questions Requiring Input

### ✅ **Answered (2025-10-14)**

1. **App Name:** Workspace Canvas (open to cooler names)
2. **License:** Proprietary/Confidential (high confidential)
3. **GitHub Repo:** Use placeholder values
4. **First Launch:** Show onboarding wizard (blocking modal)
5. **Model Default:** Claude Sonnet 4.5
6. **Onboarding UX:** Wizard + Settings (Option C)
7. **Key Storage:** OS Keychain with safeStorage (Option A)
8. **Distribution:** Direct download (Option A)
9. **Onboarding Flow:** Standard (Welcome → API Key → Tour)
10. **Error Handling:** Graceful degradation (Option D)

---

## ⏳ **Pending During Implementation**

### **Design & Branding**

**Priority: Medium**

1. **App Icon:**
   - Do you have a logo/brand guidelines?
   - Should I create a placeholder icon for now?
   - Colors/theme preference for icon?

2. **App Description:**
   - One-line tagline for installers/about dialog?
   - Suggested: "Coordinate multiple Claude AI agents in an infinite canvas workspace"

3. **Window Title:**
   - Keep as "Workspace Canvas"?
   - Or something like "Workspace Canvas - [workspace name]"?

---

### **Onboarding Copy**

**Priority: Low** (I'll use defaults, you can revise)

1. **Welcome Message:**
   - Current draft: "Coordinate multiple Claude AI agents in an infinite canvas"
   - Any specific messaging you want?

2. **Quick Tour Content:**
   - Should I include specific use cases/examples?
   - Or keep it generic (create agents, send commands, browse files)?

3. **API Key Instructions:**
   - Link to console.anthropic.com - correct?
   - Any additional guidance for users?

---

### **Configuration Defaults**

**Priority: Low** (Using sensible defaults)

1. **Theme:**
   - Default to dark mode? (current)
   - Or auto-detect system preference?

2. **Auto-update:**
   - Default to enabled or disabled?
   - (Note: Phase 4 feature, can decide later)

3. **Workspace Behavior:**
   - Create "Default Workspace" on first launch?
   - Or start with empty canvas?

---

### **Privacy & Security**

**Priority: Medium**

1. **Privacy Policy:**
   - Do you need a privacy policy statement in app?
   - Or just the simple "data stored locally" message?

2. **Terms of Service:**
   - Any ToS for app usage?
   - Or skip for internal/beta use?

3. **Telemetry:**
   - Currently disabled
   - Any interest in anonymous usage stats later?

---

### **Packaging Details**

**Priority: High** (Needed before Phase 3)

1. **Company/Author Name:**
   - Package metadata needs author name
   - Use "Workspace Canvas Team" or your name/company?

2. **App Version:**
   - Start with 0.1.0-beta?
   - Or 1.0.0 directly?

3. **Update URL:**
   - When you set up GitHub releases, I'll need the repo URL
   - Format: `https://github.com/username/workspace-canvas-app`

---

## 💡 **Open Questions (No Rush)**

These don't block current work, but good to think about:

1. **Collaboration:**
   - Future: Multi-user workspaces?
   - Cloud sync?
   - Sharing workspaces with others?

2. **API Key Management:**
   - Support for multiple API keys (switch between accounts)?
   - Support for organization/team keys?
   - API key from environment variable override?

3. **Model Selection:**
   - Allow per-widget model selection?
   - Or workspace-wide setting only?
   - Support for other providers (OpenAI, local models)?

4. **Export/Import:**
   - Export workspace to share with team?
   - Import workspace from file?
   - Format: JSON, ZIP, custom?

5. **Marketplace/Extensions:**
   - Future: Plugin system for custom widgets?
   - Template library?
   - Community-shared workspaces?

---

## Decisions I'm Making (Let me know if you disagree)

### **Default Choices:**

1. **Config Storage Location:**
   - Mac: `~/Library/Application Support/workspace-canvas/config.json`
   - Windows: `%APPDATA%/workspace-canvas/config.json`
   - Linux: `~/.config/workspace-canvas/config.json`

2. **Onboarding Skip Behavior:**
   - Show reminder banner at top
   - Re-prompt after 24 hours if still not configured
   - Add "Don't ask again" option

3. **API Key Validation:**
   - Test with minimal API call (10 tokens max)
   - Show loading spinner during validation
   - Clear error messages on failure

4. **Settings Panel Location:**
   - Add ⚙️ button to toolbar (top right)
   - Keyboard shortcut: Cmd+, (Mac) / Ctrl+, (Windows)
   - Modal overlay style (consistent with current UI)

5. **Tour Complexity:**
   - 3 simple slides (not interactive)
   - Can skip at any point
   - Mark as completed after viewing all 3
   - Don't show again once completed

6. **Development Mode:**
   - Keep .env support for developers
   - ConfigManager checks .env as fallback
   - Warn in console if using .env (not encrypted)

---

## Implementation Notes

### **Placeholder Values Used:**

```json
{
  "appId": "com.placeholder.workspace-canvas",
  "author": "Workspace Canvas Team",
  "repository": "https://github.com/placeholder/workspace-canvas-app",
  "homepage": "https://github.com/placeholder/workspace-canvas-app"
}
```

**Action Required:** Update these before public distribution

### **License Header:**

I'll use this for proprietary code:
```
/**
 * Workspace Canvas App
 * Copyright (c) 2025 [Your Company/Name]
 * All Rights Reserved
 *
 * CONFIDENTIAL AND PROPRIETARY
 * This source code is the proprietary and confidential information.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */
```

**Action Required:** Confirm company/copyright holder name

---

## Status Updates

### **Implementation Progress:**

#### **Phase 1: Configuration System** ✅ COMPLETE (2025-10-14)
- ✅ ConfigManager implemented with TDD (60 tests, all passing)
- ✅ Encrypted API key storage using electron.safeStorage
- ✅ IPC handlers added (12 handlers)
- ✅ Preload API extended with config namespace
- ✅ AnthropicAgentManager updated to use ConfigManager
- ✅ .env fallback working in development mode
- ✅ TypeScript types updated
- ✅ Committed: `feat: Add ConfigManager with encrypted API key storage`

**Files Created:**
- src/main/ConfigManager.ts (350 lines)
- tests/main/ConfigManager.test.ts (500 lines, 60 tests)

**Files Modified:**
- src/main/index.ts (+100 lines - IPC handlers)
- src/main/AnthropicAgentManager.ts (+50 lines - ConfigManager integration)
- src/preload/index.ts (+20 lines - config API)
- src/types/electron.d.ts (+20 lines - ConfigAPI interface)

#### **Phase 2: Onboarding UI** ✅ COMPLETE (2025-10-14)
- ✅ OnboardingWizard component (30+ tests passing)
- ✅ SetupReminderBanner component (10 tests passing)
- ✅ SettingsModal expanded with API Keys tab
- ✅ Canvas integration with wizard and banner
- ✅ Complete onboarding flow working
- ✅ Committed: `feat: Add onboarding wizard and API key management UI`

**Files Created:**
- src/components/OnboardingWizard.tsx (420 lines)
- src/components/SetupReminderBanner.tsx (80 lines)
- src/styles/OnboardingWizard.css (350 lines)
- src/styles/SetupReminderBanner.css (120 lines)
- tests/components/OnboardingWizard.test.tsx (982 lines, 36 tests)
- tests/components/SetupReminderBanner.test.tsx (400 lines, 10 tests)

**Files Modified:**
- src/components/SettingsModal.tsx (+200 lines - API Keys tab)
- src/styles/SettingsModal.css (+200 lines - tab styling)
- src/Canvas.tsx (+60 lines - onboarding integration)

#### **Phase 3: Packaging** ⏳ NEXT UP
- [ ] Create electron-builder.json
- [ ] Create app icons
- [ ] Test Mac/Windows builds
- [ ] Write user documentation

### **Next Milestone:**
Phase 3 complete - Distributable packages for Mac and Windows

### **Questions That Arose During Implementation:**

**None so far!** Implementation proceeded smoothly with the decisions you provided.

### **What's Working Now:**

1. ✅ App starts without .env (uses ConfigManager)
2. ✅ First launch shows onboarding wizard
3. ✅ API key validation works
4. ✅ Encrypted storage tested
5. ✅ Skip flow shows reminder banner
6. ✅ Settings modal has API Keys tab
7. ✅ All 115 unit tests passing
8. ✅ Development mode still uses .env fallback

---

## How to Respond

When you return, please review:

1. **Open Questions** section - Answer what you can
2. **Decisions I'm Making** section - Let me know if you disagree
3. **Placeholder Values** section - Provide real values when ready

I'll continue with sensible defaults and document anything that needs your input here.

**Enjoy your lunch! 🍽️**
