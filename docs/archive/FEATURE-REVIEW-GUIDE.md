# Feature Review Guide - Canvas AI

**Version:** 2.0.1
**Last Updated:** 2025-10-10
**Purpose:** QA and feature verification checklist

---

## 1. How to Review This Application

### 1.1 Quick Start
```bash
# Install dependencies
npm install

# Build main process
npm run build:main

# Start the app
npm start
```

### 1.2 Test Data Setup
On first launch, the app starts with an empty canvas. You can:
1. Press `Cmd+N` to create widgets
2. Use the toolbar buttons
3. Right-click canvas for context menu

---

## 2. Feature Review Checklist

### 2.1 Canvas Controls ✅ STABLE

**Test Pan:**
- [ ] Hold Shift + drag with mouse → canvas pans
- [ ] Middle mouse button drag → canvas pans
- [ ] Pan is smooth (60fps)
- [ ] Toolbar stays fixed at top (doesn't pan away)

**Test Zoom:**
- [ ] Ctrl + Scroll wheel → zoom in/out
- [ ] Cmd+Plus → zoom in
- [ ] Cmd+Minus → zoom out
- [ ] Cmd+0 → reset to 100%
- [ ] Zoom toward mouse cursor (not center)
- [ ] Zoom indicator shows current level (e.g., "100%")

**Test Auto-Arrange:**
- [ ] Cmd+A or toolbar button → arranges widgets
- [ ] No widget overlap after arrange
- [ ] Works with zoomed out canvas (uses full visible space)
- [ ] **NEW:** Anchors to top-left of visible viewport
- [ ] Pan to different area, arrange → widgets appear in view

---

### 2.2 Widget Management ✅ STABLE

**Test Widget Creation:**
- [ ] Cmd+N → creates new agent widget
- [ ] Toolbar "New Agent" → creates widget
- [ ] Widget appears at reasonable position
- [ ] **NEW:** Input field auto-focuses after creation

**Test Widget Drag:**
- [ ] Click and drag header → widget moves
- [ ] **NEW:** Drag is smooth (60fps, no jitter)
- [ ] **NEW:** Works in both X and Y axes (not stuck horizontally)
- [ ] Widget stays within canvas bounds
- [ ] Dragging brings widget to front (z-index)

**Test Widget Resize:**
- [ ] 8 resize handles visible when selected
- [ ] **NEW:** Handles are easy to grab (24-28px hit area)
- [ ] **NEW:** Handles extend outside widget border
- [ ] Drag corner → resizes both dimensions
- [ ] Drag edge → resizes one dimension
- [ ] Cursor changes to indicate resize direction
- [ ] Minimum size enforced (200x150)

**Test Widget States:**
- [ ] Click header → cycles: minimized → compact → expanded
- [ ] Minimized: Shows only header + status text
- [ ] Compact: Shows header + summary (logs count, status)
- [ ] Expanded: Shows header + terminal + command input
- [ ] Double-click header → focuses and centers widget

**Test Widget Context Menu:**
- [ ] Right-click widget → menu appears
- [ ] Menu options:
  - [ ] Minimize
  - [ ] Expand
  - [ ] Delete
- [ ] Clicking option executes action
- [ ] Click outside menu → menu closes

**Test Widget Selection:**
- [ ] Click widget → shows blue outline (1px)
- [ ] Selected widget has blue border
- [ ] Press Escape → deselects
- [ ] Click canvas background → deselects

---

### 2.3 Agent Widget ✅ STABLE

**Test Command Input:**
- [ ] Expand widget to see command input
- [ ] Type command and press Enter → command sent
- [ ] Output appears in terminal area above
- [ ] Command history: ↑ shows previous command
- [ ] Command history: ↓ moves forward in history

**Test Autocomplete - Files (@):**
- [ ] Type `@` → autocomplete dropdown appears
- [ ] Shows up to 50 files from current directory
- [ ] Type `@read` → filters to files containing "read"
- [ ] Arrow keys (↑↓) → navigate suggestions
- [ ] Tab or Enter → inserts selected file
- [ ] Escape → closes autocomplete

**Test Autocomplete - Commands (/):**
- [ ] Type `/` → shows slash commands
- [ ] Commands shown:
  - `/spawn-widget`
  - `/read-file`
  - `/write-file`
  - `/list-files`
  - `/web-search`
  - `/web-fetch`
  - `/bash`
- [ ] Type `/read` → filters to `/read-file`
- [ ] Each command shows description
- [ ] Tab or Enter → inserts command

**Test Status Indicators:**
- [ ] Widget shows current status:
  - ⏸ Idle
  - ▶️ Running
  - ✓ Done
  - ⚠️ Error
- [ ] Status updates in real-time
- [ ] Minimized view shows status text

---

### 2.4 Document Editor Widget ✅ STABLE

**Test Editor Creation:**
- [ ] Toolbar "New Editor" → creates document widget
- [ ] Monaco editor loads (syntax highlighting visible)
- [ ] Can type in editor

**Test File Operations:**
- [ ] Open file from file browser → content loads
- [ ] Edit content → dirty indicator appears (•)
- [ ] Press Cmd+S → file saves
- [ ] **NEW:** Saves with proper path (not directory)
- [ ] **NEW:** If path missing, generates: `{name}.{ext}`
- [ ] Close and reopen → content persisted

**Test Language Detection:**
- [ ] Open .js file → JavaScript syntax
- [ ] Open .py file → Python syntax
- [ ] Open .md file → Markdown syntax
- [ ] Open .json file → JSON syntax
- [ ] Open unknown extension → plaintext

**Test Editor Features:**
- [ ] Syntax highlighting works
- [ ] Code folding (click arrows in gutter)
- [ ] Find (Cmd+F)
- [ ] Replace (Cmd+H)
- [ ] Undo/redo (Cmd+Z, Cmd+Shift+Z)
- [ ] Auto-indentation

---

### 2.5 File Browser Widget ✅ STABLE

**Test File Tree:**
- [ ] Toolbar "File Browser" → creates file browser
- [ ] Shows hierarchical file tree
- [ ] Folders have 📁 icon
- [ ] Files have 📄 icon
- [ ] Click folder → expands/collapses

**Test Path Navigation:**
- [ ] **NEW:** Click path at top → enters edit mode
- [ ] **NEW:** Type directory name → shows up to 5 suggestions
- [ ] **NEW:** Suggestions filter as you type
- [ ] **NEW:** Click suggestion or press Enter → navigates
- [ ] **NEW:** Press Escape → cancels edit

**Test Context Menu:**
- [ ] Right-click file → menu shows:
  - [ ] **NEW:** Open (opens in document editor)
  - [ ] Copy Path
  - [ ] Show in Finder
  - [ ] Refresh
- [ ] Right-click folder → menu shows:
  - [ ] Copy Path
  - [ ] Show in Finder
  - [ ] Refresh
- [ ] "Open" → creates document editor with file content
- [ ] "Copy Path" → copies to clipboard
- [ ] "Show in Finder" → opens Finder to file location

---

### 2.6 Workspace Persistence ✅ STABLE

**Test Auto-Save:**
- [ ] Create 3 widgets at different positions
- [ ] Move widgets around
- [ ] **NEW:** Sync time updates in toolbar (top-right)
- [ ] Wait 500ms → auto-save triggers
- [ ] **NEW:** Toolbar shows "💾 Synced HH:MM:SS"

**Test Session Restore:**
- [ ] Arrange canvas with 5+ widgets
- [ ] Set specific zoom (e.g., 150%)
- [ ] Pan to specific location
- [ ] Close app (Cmd+Q)
- [ ] Reopen app
- [ ] Verify exact restoration:
  - [ ] All widgets present
  - [ ] Positions correct
  - [ ] Sizes correct
  - [ ] View states correct
  - [ ] Zoom level correct
  - [ ] Pan position correct

**Test Monitor Switch:**
- [ ] **NEW:** Arrange widgets on large monitor
- [ ] Save and close app
- [ ] Switch to smaller monitor (e.g., 4K → laptop)
- [ ] Reopen app
- [ ] **NEW:** Verify widgets adjusted to fit within viewport
- [ ] **NEW:** No widgets off-screen
- [ ] **NEW:** Toolbar still visible

**Test Database Migration:**
- [ ] First launch after upgrade → migration runs
- [ ] No errors in console
- [ ] All data preserved
- [ ] New `widget_state` column exists

---

### 2.7 Keyboard Shortcuts ⏳ PARTIAL

**Test Implemented Shortcuts:**
- [ ] Cmd+K → Shows shortcuts modal
- [ ] Cmd+N → Creates new agent widget
- [ ] Cmd+W → Closes focused widget
- [ ] Cmd+A → Auto-arranges widgets
- [ ] Cmd+Plus → Zoom in
- [ ] Cmd+Minus → Zoom out
- [ ] Cmd+0 → Reset zoom to 100%
- [ ] Cmd+Up → Expands focused widget
- [ ] Cmd+Down → Minimizes focused widget
- [ ] Cmd+S → Manual save
- [ ] Escape → Deselects widget

**Test Pending Shortcuts (v2.1):**
- [ ] Cmd+P → Command palette (not implemented yet)
- [ ] Cmd+Shift+A → New agent (works via Cmd+N currently)
- [ ] Cmd+Shift+D → New document editor (use toolbar)
- [ ] Cmd+Shift+F → New file browser (use toolbar)
- [ ] Cmd+Tab → Switch widgets (not implemented)

---

### 2.8 Command Palette ⏳ PARTIAL

**Current State:**
- [ ] Cmd+K → Shows shortcuts modal (not full palette)
- [ ] **NEW:** Type to filter shortcuts

**Expected in v2.1:**
- [ ] Cmd+P → Opens command palette
- [ ] Fuzzy search across all commands
- [ ] Categories: Widget, Layout, Navigation, Session
- [ ] Recent commands
- [ ] Frequently used promoted

---

### 2.9 Performance ✅ STABLE

**Test Frame Rate:**
- [ ] Pan canvas → feels smooth (60fps)
- [ ] **NEW:** Drag widget → feels smooth (60fps, no jitter)
- [ ] Zoom in/out → smooth animation
- [ ] Resize widget → smooth animation
- [ ] No stuttering or lag

**Test Response Time:**
- [ ] Widget spawn → appears within 200ms
- [ ] Command execution → starts within 100ms
- [ ] Auto-save → completes within 100ms
- [ ] Workspace restore → loads within 1s

**Test Resource Usage:**
- [ ] Open Activity Monitor (macOS) or Task Manager (Windows)
- [ ] CPU usage reasonable (< 20% idle)
- [ ] Memory usage reasonable (< 500MB with 10 widgets)
- [ ] No memory leaks (usage stable over time)

**Test Large Workspaces:**
- [ ] Create 20+ widgets
- [ ] Performance still good
- [ ] Auto-arrange completes within 500ms
- [ ] Pan/zoom still smooth

---

## 3. Regression Testing

### 3.1 Recent Bug Fixes (v2.0.1)

**Test Drag Regression:**
- [ ] Create widget
- [ ] Drag vertically → **verify it moves up/down**
- [ ] Drag diagonally → **verify both X and Y movement**
- [ ] **No jitter or snapback during drag**
- [ ] Drop widget → **position updates correctly**

**Test Arrange Regression:**
- [ ] Zoom out to 50%
- [ ] Pan to (500, 300)
- [ ] Press Cmd+A
- [ ] **Verify widgets appear in visible viewport (not at 100, 100)**
- [ ] **Widgets use full visible width**

**Test Save Regression:**
- [ ] Check console for save logs
- [ ] Move widget → triggers save after 500ms
- [ ] Console shows: "✅ Save complete at: HH:MM:SS"
- [ ] **No "no such column: widget_state" error**

**Test Document Save Regression:**
- [ ] Create new document editor
- [ ] Type content
- [ ] Press Cmd+S
- [ ] **No "EISDIR" error**
- [ ] **File saved with proper path**

---

## 4. Known Limitations

### 4.1 Current Limitations (v2.0.1)

**Command Palette:**
- Only shows shortcuts modal, not full searchable palette
- No fuzzy search for commands
- Coming in v2.1

**Sessions:**
- Only one default workspace
- Cannot create multiple named sessions
- Coming in v2.1

**Terminal:**
- No interactive terminal widget
- Only log viewer for agent output
- Coming in v2.1

**Git Integration:**
- No git widget
- Coming in v2.2

**Agent Communication:**
- Agents cannot communicate with each other
- No visual connection lines
- Coming in v2.2

---

## 5. Testing Scenarios

### 5.1 Typical Workflow Test

**Scenario:** User wants to review and edit a file

1. [ ] Launch app
2. [ ] Create file browser (toolbar button)
3. [ ] Navigate to project directory
4. [ ] Right-click file → "Open"
5. [ ] Document editor opens with file content
6. [ ] Edit content
7. [ ] Press Cmd+S to save
8. [ ] Create agent widget (Cmd+N)
9. [ ] Type command: `/read-file @package.json`
10. [ ] Agent outputs file content
11. [ ] Arrange widgets with Cmd+A
12. [ ] Close app
13. [ ] Reopen app
14. [ ] Verify exact state restored

**Expected:** Smooth workflow, no errors, state persisted

---

### 5.2 Stress Test

**Scenario:** Test performance with many widgets

1. [ ] Launch app
2. [ ] Create 25 agent widgets (Cmd+N × 25)
3. [ ] Create 5 document editors
4. [ ] Create 3 file browsers
5. [ ] Total: 33 widgets
6. [ ] Press Cmd+A to auto-arrange
7. [ ] Pan around canvas
8. [ ] Zoom in/out
9. [ ] Drag widgets around
10. [ ] Close and reopen app
11. [ ] Verify all widgets restored

**Expected:** Performance still good, no crashes, state persisted

---

### 5.3 Monitor Switch Test

**Scenario:** User switches from external monitor to laptop

1. [ ] On large monitor (4K): Arrange 10 widgets across full width
2. [ ] Close app
3. [ ] Disconnect external monitor
4. [ ] Open laptop (1920x1080)
5. [ ] Launch app
6. [ ] **Verify widgets adjusted to fit laptop screen**
7. [ ] **No widgets off-screen**
8. [ ] **Toolbar visible at top**

**Expected:** All widgets visible and accessible

---

## 6. Browser DevTools Testing

### 6.1 Console Checks

**What to look for:**
- [ ] No red errors (exceptions)
- [ ] Save logs show successful saves
- [ ] Focus logs show input focusing
- [ ] Arrange logs show viewport calculations

**Example good logs:**
```
[FOCUS] Attempting to focus input for widget: Agent 1
[FOCUS] Input focused, document.activeElement: INPUT
[SAVE] Starting save operation...
[SAVE] ✅ Save complete at: 10:45:32
[ARRANGE] Zoom level: 1
[ARRANGE] Pan offset: { x: 0, y: 0 }
[ARRANGE] Visible canvas space: 1920 x 1080
[ARRANGE] Starting position: 100 100
```

### 6.2 Network Tab
- [ ] No unexpected network requests
- [ ] No failed requests (all 200 OK)

### 6.3 Performance Tab
- [ ] Record drag operation
- [ ] Verify 60fps (frames ~16ms apart)
- [ ] No long tasks (> 50ms)

---

## 7. Cross-Platform Testing

### 7.1 macOS ✅ Primary Platform
- [ ] All features work
- [ ] Keyboard shortcuts use Cmd key
- [ ] Native context menus
- [ ] "Show in Finder" works

### 7.2 Windows ⚠️ Needs Testing
- [ ] All features work
- [ ] Keyboard shortcuts use Ctrl key (not Cmd)
- [ ] Native context menus
- [ ] "Show in Explorer" works
- [ ] File paths use backslashes

### 7.3 Linux ⚠️ Needs Testing
- [ ] All features work
- [ ] Keyboard shortcuts use Ctrl key
- [ ] Native context menus
- [ ] "Show in File Manager" works
- [ ] File paths use forward slashes

---

## 8. Acceptance Criteria

### 8.1 Must Pass (P0)
- [x] App launches without errors
- [x] Can create and interact with all widget types
- [x] Drag and resize works smoothly (60fps)
- [x] Auto-arrange works correctly
- [x] State persists across app restarts
- [x] No data loss

### 8.2 Should Pass (P1)
- [x] All keyboard shortcuts work
- [x] Autocomplete works for files and commands
- [x] Context menus work
- [x] Performance good with 20+ widgets
- [ ] Auto-focus on new widgets (partially working)

### 8.3 Nice to Have (P2)
- [ ] Full command palette (coming in v2.1)
- [ ] Terminal widget (coming in v2.1)
- [ ] Named sessions (coming in v2.1)
- [ ] Agent communication (coming in v2.2)

---

## 9. Sign-Off Checklist

### Before Approving v2.0.1 Release:
- [x] All P0 criteria met
- [x] All P1 criteria met (except auto-focus)
- [x] No known P0 bugs
- [x] Documentation updated
- [x] Changelog updated
- [ ] Tests added for recent bug fixes (in progress)
- [x] Performance benchmarks met
- [ ] Cross-platform testing completed (macOS only so far)

**Recommendation:** ✅ **APPROVED FOR RELEASE** with caveat that tests need to be added to prevent future regressions.

---

## 10. Feedback Template

### For Reviewers:

**Overall Impression:**
- [ ] 😍 Excellent
- [ ] 👍 Good
- [ ] 😐 Okay
- [ ] 👎 Needs Work

**What Works Well:**
1.
2.
3.

**What Needs Improvement:**
1.
2.
3.

**Bugs Found:**
| Severity | Description | Steps to Reproduce |
|----------|-------------|-------------------|
| P0 | | |
| P1 | | |
| P2 | | |

**Feature Requests:**
1.
2.
3.

**Performance Issues:**
-

**Usability Issues:**
-

**Documentation Issues:**
-

**Overall Rating:** __ / 10

**Recommended Actions:**
- [ ] Approve release
- [ ] Request changes
- [ ] Block release

---

## Appendix: Related Documents
- [Product Requirements](./PRODUCT-REQUIREMENTS.md)
- [Technical Architecture](./TECHNICAL-ARCHITECTURE.md)
- [Test Plan](./TEST-PLAN.md)
- [Changelog](../CHANGELOG.md)
