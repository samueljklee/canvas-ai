# Canvas AI - Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.1] - 2025-10-10

### 🐛 Bug Fixes

#### Critical Fixes

**Drag Performance Optimization**
- Fixed jittery drag behavior where widgets fought between transform and position updates
- Removed throttled position updates during drag - now uses pure CSS transform
- Only updates actual position once on mouseup
- Result: Smooth 60fps drag in both X and Y axes
- Files: `src/components/AgentWidget.tsx:217-298`

**Vertical Drag Not Working**
- Fixed bug where widgets could only be dragged horizontally
- Root cause: `dragTransform` not in useEffect dependencies, causing stale closure
- Solution: Use `useRef` to track transform values without triggering re-renders
- Files: `src/components/AgentWidget.tsx:46, 254, 271, 285`

**Viewport-Aware Auto-Arrange**
- Fixed auto-arrange not anchoring to top-left of visible viewport
- Now calculates starting position relative to current pan and zoom:
  ```typescript
  const startX = (-canvasState.pan.x / canvasState.scale) + 100;
  const startY = (-canvasState.pan.y / canvasState.scale) + 100;
  ```
- Widgets now arrange properly when zoomed out or panned to different areas
- Files: `src/Canvas.tsx:354-357`

### 📝 Documentation

**Added Comprehensive Documentation**
- Created `docs/PRODUCT-REQUIREMENTS.md` - Full PRD with all features and roadmap
- Created `docs/TECHNICAL-ARCHITECTURE.md` - Complete technical architecture guide
- Created `docs/TEST-PLAN.md` - Test strategy and regression prevention plan
- Updated `CHANGELOG.md` with detailed changes

### 🧪 Testing

**Identified Test Gaps**
- Documented 6 critical test gaps that allowed recent regressions
- Created test plan for drag performance tests
- Created test plan for viewport-aware arrange tests
- Created test plan for database migration tests
- See `docs/TEST-PLAN.md` for full details

---

## [2.0.0] - 2025-10-08

### ✨ New Features

#### Command Palette Search
- Added search filtering to command palette
- Type to filter commands with case-insensitive matching
- Files: `src/Canvas.tsx:33-34, 627-710`

#### Sync Time Display
- Replaced "Pan" indicator with sync timestamp
- Shows last auto-save time in toolbar
- Format: "💾 Synced HH:MM:SS"
- Files: `src/Canvas.tsx:39, 598-600`

#### File Browser Enhancements
- Added "Open" option to file browser context menu
- Opens files directly in document editor
- Files: `src/components/FileBrowser.tsx:369-382`

#### Path Input with Autocomplete
- Click path in file browser to enter edit mode
- Shows up to 5 directory suggestions as you type
- Enter to navigate, Escape to cancel
- Files: `src/components/FileBrowser.tsx:35-37, 236-306`
- Styles: `src/styles/FileBrowser.css:57-130`

### 🐛 Bug Fixes

#### Database Migration
- Added `widget_state` column migration
- Checks if column exists using `pragma table_info`
- Adds column with `ALTER TABLE` if missing
- Prevents "no such column: widget_state" error
- Files: `src/main/DatabaseService.ts:137-149`

#### Document Editor Save Error
- Fixed "EISDIR: illegal operation on a directory" error
- Added directory detection logic
- Generates proper file path if invalid
- Files: `src/components/DocumentEditor.tsx:96-154`

#### Viewport Responsiveness
- Fixed toolbar hidden when switching monitors
- Changed toolbar to `position: fixed` with `z-index: 10000`
- Added viewport bounds checking on workspace load
- Adjusts off-screen widgets to fit within current viewport
- Files:
  - `src/Canvas.tsx:71-110` (bounds checking)
  - `src/styles/Canvas.css:13-29` (fixed toolbar)

### 🎨 UX Improvements

#### Resize Handle Improvements
- Expanded resize handles from 8-12px to 24-28px
- Extended handles outside widget border:
  - Edge handles: -15px horizontal offset
  - Corner handles: -18px horizontal, -14px vertical
- Much easier to grab and resize
- Files: `src/styles/AgentWidget.css:80-142`

#### Selection Outline
- Reduced selection outline from 2px to 1px
- Less visually intrusive
- Files: `src/styles/AgentWidget.css:23-27`

#### Auto-Focus on New Widgets
- New agent widgets automatically focus command input
- 150ms delay to ensure DOM ready
- Files: `src/components/WidgetBody.tsx:81-93`

### 🚀 Performance

#### Zoom-Aware Auto-Arrange
- Auto-arrange now calculates visible canvas space based on zoom level
- Formula: `visibleWidth = window.innerWidth / canvasState.scale`
- At 50% zoom: 2x space available
- At 200% zoom: ½ space available
- Files: `src/Canvas.tsx:351-366`

#### Comprehensive Save Logging
- Added detailed logging for save operations
- Logs workspace state, widget positions, and timestamps
- Helps debug state persistence issues
- Files: `src/Canvas.tsx:115-140`

---

## [1.0.0] - 2025-10-05

### ✨ Initial Release

#### Core Features

**Infinite Canvas Workspace**
- Zoomable, pannable 2D canvas (60fps performance)
- Pan with Shift+Drag or middle mouse button
- Zoom with Ctrl+Scroll
- Zoom levels from 25% to 400%
- Keyboard shortcuts: Cmd+Plus/Minus, Cmd+0

**Widget System**
- 3 widget types: Agent, Document Editor, File Browser
- Drag and drop widgets
- Resize with 8 handles (N, NE, E, SE, S, SW, W, NW)
- 3 view states: minimized, compact, expanded
- Z-index management (click to bring to front)

**Agent Widget**
- Real-time command execution
- Streaming output (stdout/stderr)
- Command history (↑↓ navigation)
- Autocomplete for files (@) and commands (/)
- Status indicators (running, idle, error, completed)

**Document Editor Widget**
- Monaco editor with syntax highlighting
- Language detection from file extension
- Auto-save on Cmd+S
- Read/write to filesystem
- Dirty state tracking

**File Browser Widget**
- Hierarchical file tree display
- Recursive directory listing
- Context menu (copy path, show in finder)
- File type icons
- Navigation breadcrumbs

**Workspace Persistence**
- SQLite-based state saving
- Auto-save on state changes (500ms debounce)
- Restore workspace on app restart
- Save widget positions, sizes, and content
- Save canvas pan/zoom state

**Keyboard Shortcuts**
- Cmd+K - Show shortcuts modal
- Cmd+N - Create new agent widget
- Cmd+W - Close focused widget
- Cmd+A - Auto-arrange widgets
- Cmd+Plus/Minus - Zoom in/out
- Cmd+0 - Reset zoom
- Cmd+Up/Down - Expand/minimize widget
- Escape - Deselect widget
- Double-click - Focus and center widget

**Auto-Arrange Algorithm**
- 2D bin-packing with collision detection
- Sorts widgets by area (largest first)
- Grid-based positioning (10px increments)
- No widget overlap

#### Technical Stack
- Electron 30+
- React 18+ with TypeScript 5.3+
- Better-SQLite3 for persistence
- Monaco Editor for code editing
- Vite + TSC for build
- Jest + React Testing Library for tests

---

## Upgrade Guide

### From v1.x to v2.0

**Database Migration**
The v2.0 release adds a new `widget_state` column to the widgets table. The migration runs automatically on first launch, but we recommend backing up your database first:

```bash
# Backup database
cp ~/.canvas-ai/workspace.db ~/.canvas-ai/workspace.db.backup

# Launch app (migration runs automatically)
npm start
```

**Breaking Changes**
- None - v2.0 is fully backward compatible

**New Features to Try**
1. **Command Palette Search**: Press Cmd+K and start typing to filter commands
2. **Path Autocomplete**: In file browser, click the path and start typing
3. **Improved Resize**: Grab widget edges more easily with expanded hit areas
4. **Sync Time**: See last save time in top-right corner

---

## Known Issues

### v2.0.1
- [ ] Auto-focus on new widgets may not work consistently (#TBD)
- [ ] Command palette is just shortcuts modal (full palette coming in v2.1)
- [ ] No tests for recent bug fixes (tests being added)

### v2.0.0
- [x] Vertical drag not working - **FIXED in v2.0.1**
- [x] Drag jitter/fighting - **FIXED in v2.0.1**
- [x] Arrange not viewport-aware - **FIXED in v2.0.1**

---

## Roadmap

### v2.1 (Planned: Q1 2026)
- [ ] Full command palette with fuzzy search
- [ ] Terminal widget with PTY integration
- [ ] Named sessions (multiple workspaces)
- [ ] Global search across all widgets
- [ ] Comprehensive regression tests

### v2.2 (Planned: Q2 2026)
- [ ] Agent-to-agent communication
- [ ] Smart widget linking UI (visual connections)
- [ ] Git integration widget
- [ ] Enhanced file browser with search

### v3.0 (Planned: Q3 2026)
- [ ] Task board widget
- [ ] Plugin system foundation
- [ ] Custom themes
- [ ] Performance monitoring widget

### v4.0 (Future)
- [ ] Real-time collaboration (WebRTC)
- [ ] Shared workspaces
- [ ] User presence
- [ ] Built-in chat

---

## Contributing

### Reporting Bugs
Please use the issue tracker: https://github.com/yourusername/canvas-ai/issues

Include:
- Version number
- OS and Node version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

### Suggesting Features
Feature requests are welcome! Please provide:
- Use case / problem statement
- Proposed solution
- Alternative solutions considered
- Mockups if applicable

### Pull Requests
1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass
5. Update documentation
6. Submit PR with clear description

---

## License

MIT License - see LICENSE file for details

---

## Acknowledgments

- Monaco Editor team for the excellent code editor
- Better-SQLite3 maintainers for the fast database
- Electron team for the desktop framework
- React team for the UI library

---

## Contact

- GitHub: https://github.com/yourusername/canvas-ai
- Issues: https://github.com/yourusername/canvas-ai/issues
- Discussions: https://github.com/yourusername/canvas-ai/discussions
