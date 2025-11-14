# Canvas AI - Technical Architecture Document

**Version:** 2.0
**Last Updated:** 2025-10-10
**Status:** Living Document

---

## 1. System Overview

### 1.1 Architecture Pattern
**Electron Desktop Application** with:
- **Main Process** (Node.js) - System access, process management, database
- **Renderer Process** (React + TypeScript) - UI, canvas, widgets
- **Preload Script** - Secure IPC bridge (context isolation)

### 1.2 High-Level Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    Electron App                          │
├─────────────────────────────────────────────────────────┤
│  Main Process (Node.js)                                 │
│  ├── ClaudeCodeManager                                   │
│  │   ├── Process spawning & lifecycle                    │
│  │   ├── stdin/stdout/stderr streaming                   │
│  │   └── Mock AI agent (scripts/mock-claude-code.js)    │
│  ├── DatabaseService                                     │
│  │   ├── SQLite (better-sqlite3)                        │
│  │   ├── Workspace persistence                           │
│  │   └── Widget state management                         │
│  └── IPC Handlers                                        │
│      ├── claude:spawn                                    │
│      ├── claude:command                                  │
│      ├── workspace:save/load                             │
│      └── File system operations                          │
├─────────────────────────────────────────────────────────┤
│  Preload Script (preload/index.ts)                      │
│  └── window.claudeCode API                              │
│      ├── Safe IPC exposure                              │
│      └── Context isolation enforcement                   │
├─────────────────────────────────────────────────────────┤
│  Renderer Process (React + TypeScript)                  │
│  ├── Canvas.tsx - Main workspace                        │
│  │   ├── Pan/zoom with transform                        │
│  │   ├── Widget container                               │
│  │   └── Toolbar & controls                             │
│  ├── AgentWidget.tsx - Widget base component            │
│  │   ├── Drag with CSS transform (60fps)                │
│  │   ├── Resize with 8 handles                          │
│  │   ├── State: minimized/compact/expanded              │
│  │   └── Z-index management                             │
│  ├── WidgetBody.tsx - Widget content router             │
│  │   ├── LogViewer for agent output                     │
│  │   ├── Command input with autocomplete                │
│  │   └── History navigation                             │
│  ├── DocumentEditor.tsx - Monaco editor                 │
│  ├── FileBrowser.tsx - File tree                        │
│  └── Services                                            │
│      └── ClaudeCodeService.ts - IPC client              │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Core Components

### 2.1 Canvas System

#### Canvas.tsx
**Responsibility:** Main workspace container managing pan, zoom, and widgets

**State Management:**
```typescript
interface CanvasState {
  scale: number;          // Zoom level (0.25 to 4.0)
  pan: { x: number; y: number };  // Pan offset
  widgets: Map<string, AgentWidgetData>;
  selectedWidgetId: string | null;
  highestZIndex: number;
}
```

**Key Features:**
1. **Pan Implementation**
   - Transform via CSS: `transform: translate(${pan.x}px, ${pan.y}px) scale(${scale})`
   - Shift+Drag or middle mouse button
   - Smooth updates using `will-change: transform`

2. **Zoom Implementation**
   - Ctrl+Scroll wheel for zoom
   - Zoom toward mouse cursor (transform-origin adjustment)
   - Clamped between 25% and 400%
   - Keyboard: Cmd+Plus/Minus, Cmd+0 to reset

3. **Widget Management**
   - Map-based storage for O(1) lookups
   - Z-index tracking (increment on focus)
   - Position in canvas coordinates (not viewport)

4. **Auto-Arrange Algorithm**
   - 2D bin-packing with collision detection
   - Sorts widgets by area (largest first)
   - Grid-based positioning (10px increments)
   - Viewport-aware: anchors to top-left of visible area
   ```typescript
   const startX = (-canvasState.pan.x / canvasState.scale) + 100;
   const startY = (-canvasState.pan.y / canvasState.scale) + 100;
   ```

**Performance Optimizations:**
- CSS transforms (GPU-accelerated)
- `will-change` hints for animations
- RequestAnimationFrame for smooth updates
- Debounced auto-save (500ms)

---

### 2.2 Widget System

#### AgentWidget.tsx
**Responsibility:** Individual widget container with drag, resize, and lifecycle

**State Machine:**
```typescript
type WidgetState = 'minimized' | 'compact' | 'expanded';
type WidgetStatus = 'idle' | 'running' | 'completed' | 'paused' | 'error';
```

**Drag Implementation (60fps):**
```typescript
// Uses useRef to avoid re-render thrashing
const dragTransformRef = useRef({ x: 0, y: 0 });

// On mousemove (in requestAnimationFrame):
const transformX = newX - widget.position.x;
const transformY = newY - widget.position.y;
dragTransformRef.current = { x: transformX, y: transformY };
setDragTransform({ x: transformX, y: transformY });

// No position updates during drag - only CSS transform
// Final position update on mouseup
```

**Why this works:**
- CSS `transform: translate()` is GPU-accelerated
- No layout recalculations during drag
- Ref holds values without triggering re-renders
- Single position update on drop

**Resize Implementation:**
- 8 resize handles: N, NE, E, SE, S, SW, W, NW
- Extended hit areas (24-28px) for better UX
- Positioned outside widget border (-15 to -18px)
- Cursor changes (ns-resize, ew-resize, nwse-resize, nesw-resize)

**State Transitions:**
- Click header: Minimized → Compact → Expanded → Minimized
- Double-click: Focus and center (zoom + pan to widget)
- Right-click: Context menu (minimize, expand, close, etc.)

---

#### WidgetBody.tsx
**Responsibility:** Adaptive content area based on widget state

**View States:**

1. **Minimized:**
   ```
   ┌─────────────────────┐
   │ Agent Name   [x]    │  ← Header only
   │ ⏸ Ready             │  ← Status text
   └─────────────────────┘
   ```

2. **Compact:**
   ```
   ┌─────────────────────┐
   │ Agent Name   [x]    │
   ├─────────────────────┤
   │ Status: ⏸ Ready     │
   │ Logs: 42 entries    │
   │ Last: Done          │
   └─────────────────────┘
   ```

3. **Expanded:**
   ```
   ┌─────────────────────┐
   │ Agent Name   [x]    │
   ├─────────────────────┤
   │ [Terminal Output]   │
   │ $ Processing...     │
   │ ✓ Task complete     │
   │                     │
   ├─────────────────────┤
   │ > [@file /cmd] ⏎    │  ← Command input
   └─────────────────────┘
   ```

**Command Input Features:**
- Command history (↑↓ to navigate)
- Autocomplete:
  - `@` triggers file autocomplete (shows up to 50 files)
  - `/` triggers command autocomplete (shows slash commands)
- Tab/Enter to insert autocomplete
- Escape to close autocomplete

**File Autocomplete Algorithm:**
```typescript
// Determines working directory based on widget type:
if (widget.type === 'filebrowser' && widget.path) {
  workingDir = widget.path;  // Use file browser's current path
} else if (widget.type === 'document' && widget.path) {
  workingDir = path.dirname(widget.path);  // Use document's directory
} else {
  workingDir = await getCwd();  // Use app's working directory
}

// Recursive listing with relative paths
const files = await listDirectoryRecursive(workingDir);
const filtered = files
  .filter(file => file.relativePath.toLowerCase().includes(query))
  .slice(0, 50);
```

---

### 2.3 Document Editor

#### DocumentEditor.tsx
**Responsibility:** Code editor with Monaco, file I/O, syntax highlighting

**Key Features:**
- Monaco Editor React wrapper
- Language detection from file extension
- Auto-save on Cmd+S
- Dirty state tracking (unsaved changes indicator)
- Read from/write to filesystem via IPC

**Language Detection:**
```typescript
const detectLanguage = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    jsx: 'javascript',
    py: 'python',
    md: 'markdown',
    json: 'json',
    html: 'html',
    css: 'css',
    // ... more mappings
  };
  return languageMap[ext || ''] || 'plaintext';
};
```

**Save Flow:**
1. User presses Cmd+S
2. Check if widget has valid file path
3. If path is directory or missing, generate path:
   ```typescript
   const fileName = widget.name.replace(/[^a-zA-Z0-9-_.]/g, '-').toLowerCase();
   const filePath = `${workingDir}/${baseName}.${ext}`;
   ```
4. Write to file via IPC
5. Update dirty state on success

---

### 2.4 File Browser

#### FileBrowser.tsx
**Responsibility:** Hierarchical file tree with navigation and actions

**Key Features:**
- Recursive directory listing (cached)
- Collapsible folders
- File type icons (📄 file, 📁 directory)
- Path input with autocomplete (5 suggestions)
- Context menu:
  - Open (opens in document editor)
  - Copy Path
  - Show in Finder
  - Refresh

**Path Autocomplete:**
```typescript
// On path input change:
const lastSlash = value.lastIndexOf('/');
const dirPath = lastSlash > 0 ? value.substring(0, lastSlash) : '/';
const partial = value.substring(lastSlash + 1);

const suggestions = files
  .filter(file =>
    file.type === 'directory' &&
    file.name.toLowerCase().startsWith(partial.toLowerCase())
  )
  .map(file => `${dirPath}/${file.name}`)
  .slice(0, 5);
```

**Open File Flow:**
1. User clicks file or uses context menu "Open"
2. Read file content via IPC: `window.claudeCode.readFile(path)`
3. Spawn new DocumentEditor widget with content
4. Auto-detect language from file extension
5. Position widget next to file browser

---

## 3. Data Persistence

### 3.1 Database Service

#### DatabaseService.ts
**Responsibility:** SQLite wrapper for workspace state persistence

**Schema:**
```sql
-- Workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  scale REAL DEFAULT 1.0,
  pan_x REAL DEFAULT 0,
  pan_y REAL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

-- Widgets table
CREATE TABLE IF NOT EXISTS widgets (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  position_x REAL NOT NULL,
  position_y REAL NOT NULL,
  size_width REAL NOT NULL,
  size_height REAL NOT NULL,
  widget_state TEXT NOT NULL,  -- Added in migration
  z_index INTEGER NOT NULL,
  content TEXT,
  path TEXT,
  status TEXT DEFAULT 'idle',
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
```

**Migration System:**
```typescript
// Check if column exists
const tableInfo = db.pragma('table_info(widgets)') as Array<{ name: string }>;
const hasWidgetState = tableInfo.some(col => col.name === 'widget_state');

if (!hasWidgetState) {
  db.exec('ALTER TABLE widgets ADD COLUMN widget_state TEXT');
}
```

**Auto-Save Flow:**
1. Widget position/size changes
2. Debounced save (500ms) starts countdown
3. If another change occurs within 500ms, restart countdown
4. After 500ms idle, save to database:
   ```typescript
   await saveWorkspaceState(workspaceId, scale, pan);
   for (const widget of widgets.values()) {
     await saveWidget(workspaceId, widget);
   }
   ```
5. Update sync timestamp in toolbar

---

### 3.2 Workspace State

**State Flow:**
```
App Start
  ↓
Load Workspace (DatabaseService)
  ↓
Restore Canvas State (scale, pan)
  ↓
Restore Widgets (position, size, state)
  ↓
Viewport Bounds Check
  ├─ If widget off-screen → adjust position
  └─ If widget fits → use saved position
  ↓
Render Canvas
  ↓
User Interactions
  ↓
Debounced Auto-Save (500ms)
  ↓
Update Database
```

**Viewport Bounds Check:**
```typescript
// On workspace load, check if widgets fit in current viewport
const viewportWidth = window.innerWidth;
const viewportHeight = window.innerHeight;

if (widget.position.x > viewportWidth - 200) {
  widget.position.x = Math.max(50, viewportWidth - widget.size.width - 50);
}
if (widget.position.y > viewportHeight - 100) {
  widget.position.y = Math.max(50, viewportHeight - widget.size.height - 50);
}
```

**Why needed:** Users switching between monitors (e.g., 4K → laptop) would have widgets off-screen.

---

## 4. Inter-Process Communication (IPC)

### 4.1 IPC Architecture

```
┌───────────────────────────────────────────────────────┐
│               Renderer Process (React)                 │
│  window.claudeCode.spawnInstance()                    │
│          ↓                                             │
│  ClaudeCodeService.ts (wrapper)                       │
│          ↓                                             │
│  ipcRenderer.invoke('claude:spawn', ...)              │
└───────────────────────────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────┐
│               Preload Script (Bridge)                  │
│  contextBridge.exposeInMainWorld('claudeCode', {      │
│    spawnInstance: (...) => ipcRenderer.invoke(...),   │
│    sendCommand: (...) => ipcRenderer.invoke(...),     │
│    saveWorkspaceState: (...) => ...                   │
│  })                                                    │
└───────────────────────────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────┐
│               Main Process (Node.js)                   │
│  ipcMain.handle('claude:spawn', async (event, ...) => │
│    return claudeCodeManager.spawnInstance(...)        │
│  })                                                    │
│                                                        │
│  ClaudeCodeManager spawns child process               │
│  ↓                                                     │
│  child.stdout.on('data', (data) => {                  │
│    event.sender.send(`claude:output:${id}`, data)     │
│  })                                                    │
└───────────────────────────────────────────────────────┘
```

### 4.2 Available IPC Channels

**Agent Management:**
- `claude:spawn` → Spawn new agent instance
- `claude:command` → Send command to agent stdin
- `claude:kill` → Terminate agent process
- `claude:output:${instanceId}` → Stream stdout/stderr (event)

**File System:**
- `file:read` → Read file content
- `file:write` → Write file content
- `file:list` → List directory contents
- `file:list-recursive` → Recursive directory listing
- `file:get-cwd` → Get current working directory

**Workspace:**
- `workspace:save` → Save workspace state
- `workspace:load` → Load workspace state
- `widget:save` → Save widget data
- `widget:load` → Load widgets for workspace
- `workspace:clear` → Clear all widgets

**Window:**
- `window:show-item-in-folder` → Show file in file manager

---

## 5. Performance Optimizations

### 5.1 Drag Performance (60fps)

**Problem:** Original implementation updated widget position on every mousemove, causing:
- Layout thrashing (DOM recalculates positions)
- React re-renders propagating to children
- Jittery movement, especially vertically

**Solution:**
```typescript
// Use CSS transform instead of position updates
const [dragTransform, setDragTransform] = useState({ x: 0, y: 0 });
const dragTransformRef = useRef({ x: 0, y: 0 });

// During drag (in requestAnimationFrame):
const transformX = newX - widget.position.x;
const transformY = newY - widget.position.y;
dragTransformRef.current = { x: transformX, y: transformY };
setDragTransform({ x: transformX, y: transformY });

// Apply transform to widget
style={{
  position: 'absolute',
  left: widget.position.x,
  top: widget.position.y,
  transform: dragState.isDragging
    ? `translate(${dragTransform.x}px, ${dragTransform.y}px)`
    : undefined,
  willChange: dragState.isDragging ? 'transform' : undefined,
}}

// Only update position on mouseup
onUpdate(widget.id, {
  position: {
    x: widget.position.x + dragTransformRef.current.x,
    y: widget.position.y + dragTransformRef.current.y,
  },
});
```

**Result:**
- Smooth 60fps drag in both X and Y axes
- No layout recalculations during drag
- Single DOM update on drop

---

### 5.2 Auto-Save Debouncing

**Strategy:** Don't save on every keystroke - wait for idle period

```typescript
const SAVE_DEBOUNCE_MS = 500;
let saveTimeoutId: NodeJS.Timeout | null = null;

const triggerSave = () => {
  if (saveTimeoutId) clearTimeout(saveTimeoutId);

  saveTimeoutId = setTimeout(async () => {
    await saveState();
    setLastSyncTime(Date.now());
  }, SAVE_DEBOUNCE_MS);
};

// Call triggerSave on any state change
useEffect(() => {
  triggerSave();
}, [canvasState.widgets, canvasState.scale, canvasState.pan]);
```

**Trade-offs:**
- ✅ Reduces database writes (better SSD longevity)
- ✅ Prevents UI stuttering from frequent saves
- ⚠️ Up to 500ms of unsaved work at risk

---

### 5.3 Viewport Culling (Future)

**Not yet implemented, but planned for 50+ widgets:**

```typescript
// Only render widgets in viewport + margin
const isInViewport = (widget: AgentWidgetData): boolean => {
  const margin = 200; // pixels
  const viewportRect = {
    left: -pan.x / scale - margin,
    top: -pan.y / scale - margin,
    right: (-pan.x + window.innerWidth) / scale + margin,
    bottom: (-pan.y + window.innerHeight) / scale + margin,
  };

  const widgetRect = {
    left: widget.position.x,
    top: widget.position.y,
    right: widget.position.x + widget.size.width,
    bottom: widget.position.y + widget.size.height,
  };

  return !(
    widgetRect.right < viewportRect.left ||
    widgetRect.left > viewportRect.right ||
    widgetRect.bottom < viewportRect.top ||
    widgetRect.top > viewportRect.bottom
  );
};

// In render:
const visibleWidgets = Array.from(widgets.values()).filter(isInViewport);
```

---

## 6. Testing Strategy

### 6.1 Test Structure
```
tests/
├── components/          # Component unit tests
│   ├── Canvas.test.tsx
│   ├── AgentWidget.test.tsx
│   ├── DocumentEditor.test.tsx
│   └── FileBrowser.test.tsx
├── features/            # Feature integration tests
│   ├── widget-dragging.test.tsx
│   ├── canvas-pan-zoom.test.tsx
│   └── bin-packing.test.ts
├── integration/         # Full workflow tests
│   └── widget-lifecycle.test.tsx
├── main/                # Main process tests
│   ├── ClaudeCodeManager.test.ts
│   └── DatabaseService.test.ts
├── services/            # Service tests
│   └── ClaudeCodeService.test.ts
└── utils/               # Utility tests
    └── widgetFactory.test.ts
```

### 6.2 Current Test Coverage
```
Component Tests:    8/8   ✅ 100%
Feature Tests:      3/3   ✅ 100%
Integration Tests:  1/1   ✅ 100%
Main Process Tests: 1/2   ⏳ 50% (need DatabaseService tests)
Service Tests:      1/1   ✅ 100%
Util Tests:         1/1   ✅ 100%

Overall: 15/16 test files (93.75%)
```

### 6.3 Critical Tests Needed

**Regression Prevention:**
1. **Drag Performance Test**
   - Verify 60fps during drag
   - Test both X and Y axis movement
   - Ensure no jitter or snapback

2. **Auto-Arrange Test**
   - Test viewport-aware positioning
   - Verify no widget overlap
   - Check zoom/pan calculations

3. **State Persistence Test**
   - Save workspace with multiple widgets
   - Close app
   - Reopen and verify exact restoration

4. **Database Migration Test**
   - Test adding `widget_state` column
   - Verify no data loss
   - Test idempotent migrations

5. **Autocomplete Test**
   - Test file autocomplete with @ trigger
   - Test command autocomplete with / trigger
   - Verify keyboard navigation (↑↓ Tab Enter)

6. **Viewport Bounds Test**
   - Save workspace on large monitor
   - Load on small monitor
   - Verify widgets adjusted to fit

---

## 7. Key Design Decisions

### 7.1 Why Electron?
**Decision:** Build as Electron desktop app instead of web app

**Rationale:**
- ✅ Native file system access (read/write without browser restrictions)
- ✅ Can spawn child processes (AI agents, terminals)
- ✅ No CORS or security restrictions
- ✅ Better performance for canvas rendering
- ✅ Offline-first by default

**Trade-offs:**
- ❌ Larger download size (~150MB vs ~5MB web)
- ❌ Separate builds for Mac/Windows/Linux
- ❌ No easy deployment (vs web deploy)
- ❌ Updates require installer download

---

### 7.2 Why SQLite?
**Decision:** Use better-sqlite3 instead of JSON files or cloud DB

**Rationale:**
- ✅ Synchronous API (no async complexity)
- ✅ ACID transactions (atomic saves)
- ✅ Fast queries with indexes
- ✅ No external dependencies (local file)
- ✅ Migrations built-in (ALTER TABLE)

**Trade-offs:**
- ❌ Not cloud-synced (future: add sync layer)
- ❌ Single workspace per DB (future: support multiple)
- ❌ Native module (requires electron-rebuild)

---

### 7.3 Why CSS Transform for Drag?
**Decision:** Use `transform: translate()` instead of `left/top` updates

**Rationale:**
- ✅ GPU-accelerated (compositing layer)
- ✅ No layout recalculation (only paint)
- ✅ Smooth 60fps animation
- ✅ Works with React without fighting VDOM

**Trade-offs:**
- ❌ Slightly more complex state (position + transform)
- ❌ Need to sync transform back to position on drop

---

### 7.4 Why Map<string, Widget> not Array?
**Decision:** Use Map for widget storage instead of Array

**Rationale:**
- ✅ O(1) lookups by ID (vs O(n) with array.find)
- ✅ O(1) deletions (vs splice + reindex)
- ✅ No accidental duplicates (Map keys unique)
- ✅ Easier to update single widget (map.set vs array.map)

**Trade-offs:**
- ❌ Must convert to array for rendering (Array.from)
- ❌ Slightly more memory overhead

---

## 8. Future Architecture Changes

### 8.1 Message Bus (v2.2)
**Planned:** Central event bus for widget-to-widget communication

```typescript
interface MessageBus {
  subscribe(topic: string, handler: (message: AgentMessage) => void): string;
  unsubscribe(subscriptionId: string): void;
  publish(topic: string, message: AgentMessage): void;
  request(target: string, payload: any): Promise<any>;
}

// Usage:
messageBus.subscribe('agent:output', (msg) => {
  if (msg.from === sourceWidgetId) {
    targetWidget.receiveData(msg.payload);
  }
});
```

### 8.2 Plugin System (v3.0)
**Planned:** Dynamic widget loading via plugins

```typescript
interface WidgetPlugin {
  id: string;
  name: string;
  version: string;
  component: React.ComponentType<WidgetProps>;
  defaultSize: Size;
  icon: string;
  category: 'productivity' | 'developer' | 'ai' | 'custom';
}

// Plugin registration:
pluginManager.register({
  id: 'my-custom-widget',
  name: 'My Custom Widget',
  version: '1.0.0',
  component: MyWidgetComponent,
  defaultSize: { width: 400, height: 300 },
  icon: '🔌',
  category: 'custom',
});
```

### 8.3 Real-Time Collaboration (v4.0)
**Planned:** Multi-user workspaces with WebRTC

**Architecture:**
```
User A (Electron App)
  ↓ WebRTC Data Channel
Signaling Server (Node.js)
  ↓ WebRTC Data Channel
User B (Electron App)

// CRDT for conflict-free state sync
interface WorkspaceOperation {
  type: 'widget:move' | 'widget:create' | 'widget:delete';
  widgetId: string;
  userId: string;
  timestamp: number;
  data: any;
}
```

---

## 9. Appendix

### 9.1 Key Files
| File | LOC | Purpose |
|------|-----|---------|
| `src/Canvas.tsx` | ~700 | Main workspace canvas |
| `src/components/AgentWidget.tsx` | ~600 | Widget base component |
| `src/components/WidgetBody.tsx` | ~400 | Widget content router |
| `src/components/DocumentEditor.tsx` | ~250 | Monaco editor wrapper |
| `src/components/FileBrowser.tsx` | ~450 | File tree browser |
| `src/main/DatabaseService.ts` | ~300 | SQLite persistence |
| `src/main/ClaudeCodeManager.ts` | ~200 | Process management |
| `src/preload/index.ts` | ~150 | IPC bridge |

**Total LOC:** ~5,000 (excluding tests)

### 9.2 Dependencies
**Production:**
- `better-sqlite3` - SQLite database
- `@monaco-editor/react` - Code editor
- `react` + `react-dom` - UI framework
- `electron` - Desktop app framework
- `nanoid` - UUID generation

**Development:**
- `vite` - Fast build tool
- `typescript` - Type safety
- `jest` + `@testing-library/react` - Testing
- `electron-builder` - App packaging

### 9.3 Browser Compatibility
**Not applicable** - Electron app uses Chromium 120+

### 9.4 Related Documents
- [Product Requirements](./PRODUCT-REQUIREMENTS.md)
- [Test Plan](./TEST-PLAN.md)
- [API Documentation](./API-DOCUMENTATION.md)
