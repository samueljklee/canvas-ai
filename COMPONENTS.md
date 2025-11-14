# Canvas AI - Components Guide

**Developer guide to understanding and extending Canvas AI components**

📚 **Related Documentation:**
- [README.md](README.md) - Quick start and installation
- [FEATURES.md](FEATURES.md) - User guide to all capabilities
- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical architecture deep dive
- [docs/TESTING-STRATEGY.md](docs/TESTING-STRATEGY.md) - Testing guide

---

## Table of Contents

1. [Component Overview](#component-overview)
2. [Core Components](#core-components)
3. [Widget System](#widget-system)
4. [Custom Hooks](#custom-hooks)
5. [Services](#services)
6. [Adding New Features](#adding-new-features)
7. [Best Practices](#best-practices)

---

## Component Overview

### Component Hierarchy

```
App.tsx
└── Canvas.tsx (Main workspace)
    ├── WorkspaceTabs.tsx
    ├── SetupReminderBanner.tsx
    ├── OnboardingWizard.tsx (conditional)
    ├── SettingsModal.tsx (conditional)
    ├── ShortcutsModal.tsx (conditional)
    └── AgentWidget.tsx (x N widgets)
        ├── WidgetHeader.tsx
        │   └── ContextMenu.tsx
        └── WidgetBody.tsx
            ├── LogViewer.tsx (agent type)
            ├── DocumentEditor.tsx (document type)
            ├── FileBrowser.tsx (filebrowser type)
            ├── MarkdownPreview.tsx (markdown content)
            └── GeneratedApp.tsx (generated-app type)
```

### File Structure

```
src/
├── Canvas.tsx                      # Main canvas component
├── App.tsx                         # Root component
├── components/                     # React components
│   ├── AgentWidget.tsx             # Widget container
│   ├── WidgetHeader.tsx            # Widget title bar
│   ├── WidgetBody.tsx              # Widget content router
│   ├── LogViewer.tsx               # Terminal-style log display
│   ├── DocumentEditor.tsx          # Monaco code editor
│   ├── FileBrowser.tsx             # File tree view
│   ├── MarkdownPreview.tsx         # Markdown renderer
│   ├── GeneratedApp.tsx            # Dynamic React UI
│   ├── ContextMenu.tsx             # Right-click menu
│   ├── WorkspaceTabs.tsx           # Workspace switcher
│   ├── OnboardingWizard.tsx        # First-run setup
│   ├── SettingsModal.tsx           # App settings
│   ├── ShortcutsModal.tsx          # Keyboard reference
│   └── SetupReminderBanner.tsx     # API key reminder
├── hooks/                          # Custom React hooks
│   ├── useCanvasState.ts           # Canvas state management
│   ├── useWorkspaceManager.ts      # Workspace operations
│   └── useMockIPC.ts               # (unused - can be deleted)
├── services/                       # Renderer services
│   └── ClaudeCodeService.ts        # IPC client wrapper
├── utils/                          # Utility functions
│   └── widgetFactory.ts            # Widget creation helpers
├── types/                          # TypeScript types
│   └── widget.ts                   # Widget interfaces
└── styles/                         # CSS files
    ├── Canvas.css
    ├── AgentWidget.css
    └── ...
```

---

## Core Components

### Canvas.tsx

**Location:** `src/Canvas.tsx`

**Responsibility:** Main workspace container - manages pan, zoom, widgets, and workspaces

#### State Management

Uses two custom hooks:
- `useWorkspaceManager()` - Workspace CRUD operations
- `useCanvasState()` - Canvas state and widget operations

#### Key Features

**1. Pan/Zoom Implementation:**
```typescript
// CSS transform for hardware acceleration
<div style={{
  transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
  willChange: 'transform',
  transformOrigin: '0 0'
}}>
```

**2. Widget Rendering:**
```typescript
{Array.from(canvasState.widgets.values()).map((widget) => (
  <AgentWidget
    key={widget.id}
    widget={widget}
    isSelected={widget.id === canvasState.selectedWidgetId}
    onUpdate={updateWidget}
    onRemove={removeWidget}
    onSelect={selectWidget}
    onFocus={bringToFront}
    onStateChange={changeWidgetState}
  />
))}
```

**3. Keyboard Shortcuts:**
```typescript
// Cmd+N - New widget
// Cmd+D - Duplicate
// Cmd+Backspace - Delete
// Cmd+Plus/Minus - Zoom
// Cmd+0 - Reset zoom
// Cmd+, - Settings
```

**4. Auto-Save with Debouncing:**
```typescript
const SAVE_DEBOUNCE_MS = 500;
const IDLE_THRESHOLD_MS = 2000;

// Debounced save on changes
// Immediate save after idle period
```

#### How to Extend

**Add a new toolbar button:**
```typescript
// In Canvas.tsx, add to toolbar section:
<button
  className="toolbar-button"
  onClick={handleMyNewFeature}
  title="My Feature"
>
  🎯
</button>
```

**Add a new keyboard shortcut:**
```typescript
// In Canvas.tsx, keyboard event handler:
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.metaKey && e.key === 'x') { // Cmd+X
      e.preventDefault();
      handleMyNewFeature();
    }
  };
  // ... rest of handler
}, [/* dependencies */]);
```

---

### AgentWidget.tsx

**Location:** `src/components/AgentWidget.tsx`

**Responsibility:** Individual widget container with drag, resize, and state management

#### Widget Props

```typescript
interface AgentWidgetProps {
  widget: AgentWidgetData;
  isSelected: boolean;
  onUpdate: (id: string, updates: Partial<AgentWidgetData>) => void;
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
  onFocus: (id: string) => void;
  onStateChange: (id: string, state: WidgetState) => void;
}
```

#### Widget States

```typescript
type WidgetState = 'minimized' | 'compact' | 'expanded';

// Minimized: Title bar only (40px height)
// Compact: Header + preview (200px height)
// Expanded: Full view with resize handles
```

#### Drag Implementation

**Uses transform for 60fps performance:**
```typescript
const [dragTransform, setDragTransform] = useState({ x: 0, y: 0 });
const dragTransformRef = useRef({ x: 0, y: 0 });

// During drag: Update transform only (visual)
setDragTransform({ x: deltaX, y: deltaY });

// On mouse up: Update actual position
onUpdate(widget.id, {
  position: { x: newX, y: newY }
});

// Reset transform
setDragTransform({ x: 0, y: 0 });
```

**Key optimization:** Uses `useRef` to avoid effect dependencies causing jitter

#### Resize Implementation

**8 resize handles:**
- 4 corners: nw, ne, sw, se
- 4 edges: n, e, s, w

```typescript
const handleResize = (handle: ResizeHandle, deltaX: number, deltaY: number) => {
  let newWidth = widget.size.width;
  let newHeight = widget.size.height;
  let newX = widget.position.x;
  let newY = widget.position.y;

  switch (handle) {
    case 'se': // Southeast (bottom-right)
      newWidth += deltaX;
      newHeight += deltaY;
      break;
    case 'nw': // Northwest (top-left)
      newWidth -= deltaX;
      newHeight -= deltaY;
      newX += deltaX;
      newY += deltaY;
      break;
    // ... other handles
  }

  // Apply min/max constraints
  newWidth = Math.max(MIN_WIDTH, Math.min(newWidth, MAX_WIDTH));
  newHeight = Math.max(MIN_HEIGHT, Math.min(newHeight, MAX_HEIGHT));
};
```

#### How to Add Widget Type

1. **Define type in types/widget.ts:**
```typescript
export type WidgetType =
  | 'agent'
  | 'document'
  | 'filebrowser'
  | 'generated-app'
  | 'my-new-type'; // Add here
```

2. **Create component:** `src/components/MyNewWidget.tsx`

3. **Add to WidgetBody.tsx router:**
```typescript
{widget.type === 'my-new-type' && (
  <MyNewWidget widget={widget} onUpdate={onUpdate} />
)}
```

4. **Add icon in WidgetHeader.tsx:**
```typescript
{widget.type === 'my-new-type' && '🆕'}
```

---

### WidgetBody.tsx

**Location:** `src/components/WidgetBody.tsx`

**Responsibility:** Routes widget content based on widget type

#### Content Router

```typescript
// Determine which component to render
if (widget.type === 'agent') {
  return <LogViewer logs={logs} />;
} else if (widget.type === 'document') {
  return <DocumentEditor content={widget.content} />;
} else if (widget.type === 'filebrowser') {
  return <FileBrowser path={workingDirectory} />;
} else if (widget.type === 'generated-app') {
  return <GeneratedApp code={widget.content} />;
}
```

#### Command Input

**Autocomplete suggestions:**
```typescript
const SUGGESTIONS = [
  { type: 'command', value: '/help', label: '/help', description: 'Show help' },
  { type: 'command', value: '/clear', label: '/clear', description: 'Clear logs' },
  { type: 'command', value: '/spawn-widget', label: '/spawn-widget', description: 'Create widget' },
];
```

**Enter to send:**
```typescript
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};
```

---

### LogViewer.tsx

**Location:** `src/components/LogViewer.tsx`

**Responsibility:** Terminal-style log display with syntax highlighting

#### Features

- **Auto-scroll** to bottom on new messages
- **Syntax highlighting** for code blocks
- **Timestamp** display (optional)
- **Log levels** (info, warning, error)
- **Markdown support** via react-markdown

#### Rendering Logs

```typescript
{logs.map((log, index) => (
  <div key={index} className={`log-entry log-${log.level}`}>
    <span className="log-timestamp">{formatTime(log.timestamp)}</span>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code: CodeBlock, // Custom syntax highlighting
      }}
    >
      {log.message}
    </ReactMarkdown>
  </div>
))}
```

#### Virtual Scrolling (Planned)

For large logs (1000+ entries), consider:
```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={400}
  itemCount={logs.length}
  itemSize={30}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>{logs[index].message}</div>
  )}
</FixedSizeList>
```

---

### DocumentEditor.tsx

**Location:** `src/components/DocumentEditor.tsx`

**Responsibility:** Monaco Editor wrapper for code/text editing

#### Monaco Setup

```typescript
import Editor from '@monaco-editor/react';

<Editor
  height="100%"
  language={detectLanguage(widget.path)}
  value={content}
  onChange={handleChange}
  theme="vs-dark"
  options={{
    minimap: { enabled: true },
    fontSize: 14,
    lineNumbers: 'on',
    wordWrap: 'on',
    automaticLayout: true,
  }}
/>
```

#### Language Detection

```typescript
const detectLanguage = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    jsx: 'javascript',
    py: 'python',
    go: 'go',
    rs: 'rust',
    // ... more languages
  };
  return languageMap[ext || ''] || 'plaintext';
};
```

#### Auto-Save on Blur

```typescript
const handleBlur = () => {
  if (hasUnsavedChanges) {
    onUpdate(widget.id, { content: editorContent });
  }
};
```

---

### MarkdownPreview.tsx

**Location:** `src/components/MarkdownPreview.tsx`

**Responsibility:** Render rich markdown with Mermaid diagrams

#### Features

- **GitHub-flavored markdown** (tables, task lists, strikethrough)
- **Mermaid diagrams** (flowcharts, sequence diagrams, etc.)
- **Syntax highlighting** for code blocks
- **Math equations** (planned)

#### Implementation

```typescript
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';

// Initialize Mermaid
useEffect(() => {
  mermaid.initialize({ startOnLoad: true, theme: 'dark' });
}, []);

<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  components={{
    code: ({ node, inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      const lang = match ? match[1] : '';

      if (!inline && lang === 'mermaid') {
        return (
          <div className="mermaid">
            {String(children).replace(/\n$/, '')}
          </div>
        );
      }

      return <code className={className} {...props}>{children}</code>;
    },
  }}
>
  {content}
</ReactMarkdown>
```

---

### GeneratedApp.tsx

**Location:** `src/components/GeneratedApp.tsx`

**Responsibility:** Render dynamic React code generated by Claude

#### How It Works

1. Claude generates React code as string
2. Code is evaluated safely in sandboxed context
3. Component rendered in widget
4. Full React capabilities available

#### Security Considerations

**Current:**
- Eval used (careful!)
- No npm packages
- React only (no Node.js APIs)

**Future:**
- Web Workers for isolation
- Sandboxed iframe
- CSP headers

#### Example Generated Code

```typescript
// Claude generates this:
const code = `
  function TemperatureConverter() {
    const [celsius, setCelsius] = React.useState(0);
    const fahrenheit = (celsius * 9/5) + 32;

    return (
      <div style={{ padding: 20 }}>
        <input
          type="number"
          value={celsius}
          onChange={(e) => setCelsius(Number(e.target.value))}
        />
        <p>{celsius}°C = {fahrenheit}°F</p>
      </div>
    );
  }
`;

// Widget renders it live
```

---

## Custom Hooks

### useCanvasState.ts

**Location:** `src/hooks/useCanvasState.ts`

**Purpose:** Manages canvas state (widgets, pan, zoom)

#### API

```typescript
const {
  canvasState,        // Current state
  addWidget,          // Add new widget
  removeWidget,       // Delete widget
  updateWidget,       // Update widget properties
  selectWidget,       // Select for keyboard actions
  bringToFront,       // Update z-index
  changeWidgetState,  // Change min/compact/expanded
  setCanvasPan,       // Update pan offset
  setCanvasScale,     // Update zoom level
} = useCanvasState();
```

#### State Structure

```typescript
interface CanvasState {
  widgets: Map<string, AgentWidgetData>;
  selectedWidgetId: string | null;
  scale: number;  // 0.25 to 4.0
  pan: { x: number; y: number };
  highestZIndex: number;
}
```

#### Persistence

Automatically saves to database via `ClaudeCodeService`:
```typescript
const updateWidget = useCallback((id: string, updates: Partial<AgentWidgetData>) => {
  // Update local state
  setCanvasState(prev => ({
    ...prev,
    widgets: new Map(prev.widgets).set(id, { ...widget, ...updates })
  }));

  // Save to database
  window.claudeCode.saveWidget({ ...widget, ...updates });
}, []);
```

---

### useWorkspaceManager.ts

**Location:** `src/hooks/useWorkspaceManager.ts`

**Purpose:** Manages workspaces (CRUD operations)

#### API

```typescript
const {
  workspaces,          // All workspaces
  activeWorkspaceId,   // Current workspace ID
  createWorkspace,     // Create new workspace
  renameWorkspace,     // Rename workspace
  deleteWorkspace,     // Delete workspace
  switchWorkspace,     // Change active workspace
} = useWorkspaceManager();
```

#### Workspace Structure

```typescript
interface Workspace {
  id: string;
  name: string;
  created_at: number;
  last_accessed: number;
  scale: number;
  pan_x: number;
  pan_y: number;
}
```

#### Loading Workspace

```typescript
const switchWorkspace = async (id: string) => {
  const workspace = await window.claudeCode.loadWorkspace(id);
  const widgets = await window.claudeCode.getWidgetsForWorkspace(id);

  // Update canvas state with loaded data
  setCanvasState({
    widgets: new Map(widgets.map(w => [w.id, w])),
    scale: workspace.scale,
    pan: { x: workspace.pan_x, y: workspace.pan_y },
    // ...
  });
};
```

---

## Services

### ClaudeCodeService.ts

**Location:** `src/services/ClaudeCodeService.ts`

**Purpose:** Renderer-side wrapper for IPC communication

#### Why This Exists

- **Type safety** - TypeScript interfaces for all IPC calls
- **Error handling** - Consistent error handling
- **Event management** - Centralized event listeners
- **Abstraction** - Hides IPC implementation details

#### Usage Pattern

```typescript
// Instead of:
const result = await window.claudeCode.createAgent(config);

// Use service:
import { ClaudeCodeService } from './services/ClaudeCodeService';
const service = new ClaudeCodeService();
const result = await service.createAgent(config);
```

#### Event Listeners

```typescript
// Listen for agent output
service.onAgentOutput((instanceId, chunk) => {
  // Update UI with streaming chunk
  appendLogToWidget(instanceId, chunk);
});

// Listen for status changes
service.onAgentStatus((instanceId, status) => {
  updateWidgetStatus(instanceId, status);
});

// Listen for errors
service.onAgentError((instanceId, error) => {
  showErrorNotification(error);
});
```

---

## Adding New Features

### Add a New Widget Type

**1. Define type:**
```typescript
// src/types/widget.ts
export type WidgetType = 'agent' | 'document' | 'my-type';
```

**2. Create component:**
```typescript
// src/components/MyWidget.tsx
export const MyWidget: React.FC<MyWidgetProps> = ({ widget, onUpdate }) => {
  return (
    <div className="my-widget">
      {/* Your UI here */}
    </div>
  );
};
```

**3. Add to router:**
```typescript
// src/components/WidgetBody.tsx
{widget.type === 'my-type' && (
  <MyWidget widget={widget} onUpdate={onUpdate} />
)}
```

**4. Add styles:**
```css
/* src/styles/MyWidget.css */
.my-widget {
  /* styles */
}
```

**5. Register in factory:**
```typescript
// src/utils/widgetFactory.ts
export const createWidget = (options: CreateWidgetOptions) => {
  // ... existing code
  if (options.type === 'my-type') {
    // Initialize your widget
  }
};
```

---

### Add a New Tool for Claude

**See [ARCHITECTURE.md](ARCHITECTURE.md#7-tool-execution-framework) for tool implementation details**

**Summary:**

1. **Define tool in main process:**
```typescript
// src/main/tools/toolDefinitions.ts
{
  name: 'my_tool',
  description: 'What this tool does',
  input_schema: {
    type: 'object',
    properties: {
      param1: { type: 'string' }
    },
    required: ['param1']
  }
}
```

2. **Implement tool executor:**
```typescript
// src/main/AnthropicAgentManager.ts
if (toolUse.name === 'my_tool') {
  const result = await executeMyTool(toolUse.input);
  // Return result to Claude
}
```

3. **Test with Claude:**
```
You: Use my_tool with param1="test"
Claude: [Executes my_tool]
        Result: ...
```

---

### Add a New Keyboard Shortcut

**In Canvas.tsx:**
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Your shortcut
    if (e.metaKey && e.key === 'x') { // Cmd+X
      e.preventDefault();
      handleMyAction();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [handleMyAction]);
```

**Document in ShortcutsModal.tsx:**
```typescript
{ icon: '⚡', label: 'My Action', shortcut: '⌘X', action: handleMyAction }
```

---

## Best Practices

### Performance

**1. Use React.memo for expensive components:**
```typescript
export const MyComponent = React.memo(({ data }) => {
  // Component logic
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.data.id === nextProps.data.id;
});
```

**2. Use useCallback for event handlers:**
```typescript
const handleClick = useCallback(() => {
  // Handler logic
}, [/* dependencies */]);
```

**3. Use useMemo for expensive calculations:**
```typescript
const filteredData = useMemo(() => {
  return data.filter(item => item.active);
}, [data]);
```

**4. Debounce frequent updates:**
```typescript
const debouncedSave = useMemo(
  () => debounce((value) => saveToDatabase(value), 500),
  []
);
```

---

### State Management

**1. Use Map for widget collections:**
```typescript
// ✅ Good - O(1) lookups
widgets: Map<string, AgentWidgetData>

// ❌ Bad - O(n) lookups
widgets: AgentWidgetData[]
```

**2. Use refs for values that don't trigger re-renders:**
```typescript
// For transform values during drag
const dragTransformRef = useRef({ x: 0, y: 0 });
```

**3. Batch state updates:**
```typescript
// ✅ Good - Single re-render
setCanvasState(prev => ({
  ...prev,
  scale: newScale,
  pan: newPan
}));

// ❌ Bad - Two re-renders
setScale(newScale);
setPan(newPan);
```

---

### CSS & Styling

**1. Use CSS transforms for animations:**
```css
/* ✅ Good - GPU accelerated */
transform: translate(10px, 20px);
will-change: transform;

/* ❌ Bad - CPU-intensive repaints */
left: 10px;
top: 20px;
```

**2. Use CSS variables for theming:**
```css
:root {
  --primary-color: #007bff;
  --background-color: #1e1e1e;
}

.button {
  background: var(--primary-color);
}
```

**3. Scope styles to component:**
```css
/* AgentWidget.css */
.agent-widget .header {
  /* Only affects .header inside .agent-widget */
}
```

---

### TypeScript

**1. Define proper interfaces:**
```typescript
interface AgentWidgetData {
  id: string;
  name: string;
  type: WidgetType;
  position: Position;
  size: Size;
  // ... all properties
}
```

**2. Use type guards:**
```typescript
function isAgentWidget(widget: AgentWidgetData): widget is AgentWidget {
  return widget.type === 'agent';
}
```

**3. Avoid `any`, use `unknown`:**
```typescript
// ❌ Bad
const data: any = JSON.parse(json);

// ✅ Good
const data: unknown = JSON.parse(json);
if (isValidData(data)) {
  // Now TypeScript knows the type
}
```

---

### Testing

**1. Test user interactions:**
```typescript
it('should create widget on Cmd+N', () => {
  const { container } = render(<Canvas />);
  fireEvent.keyDown(window, { metaKey: true, key: 'n' });
  expect(screen.getByText(/new agent/i)).toBeInTheDocument();
});
```

**2. Test IPC communication:**
```typescript
it('should send message to agent', async () => {
  const mockSend = jest.fn();
  window.claudeCode.sendMessage = mockSend;

  const { getByPlaceholderText } = render(<AgentWidget {...props} />);
  const input = getByPlaceholderText(/enter a message/i);

  fireEvent.change(input, { target: { value: 'Hello' } });
  fireEvent.keyDown(input, { key: 'Enter' });

  expect(mockSend).toHaveBeenCalledWith(widget.id, 'Hello');
});
```

**3. Test edge cases:**
```typescript
it('should handle empty conversation history', async () => {
  // Test with no history
});

it('should handle very long messages', async () => {
  // Test with 10,000 character message
});

it('should handle rapid-fire updates', async () => {
  // Test with 100 updates in 1 second
});
```

---

## Common Patterns

### Pattern 1: Widget Content Updates

```typescript
// In widget component
const handleContentChange = (newContent: string) => {
  onUpdate(widget.id, { content: newContent });
};

// In Canvas.tsx
const updateWidget = useCallback((id: string, updates) => {
  setCanvasState(prev => {
    const newWidgets = new Map(prev.widgets);
    const widget = newWidgets.get(id);
    if (widget) {
      newWidgets.set(id, { ...widget, ...updates });
    }
    return { ...prev, widgets: newWidgets };
  });

  // Persist to database
  window.claudeCode.updateWidget(id, updates);
}, []);
```

### Pattern 2: IPC Event Handling

```typescript
// Listen for events
useEffect(() => {
  const unsubscribe = window.claudeCode.onAgentOutput((instanceId, chunk) => {
    // Update UI
    appendLog(instanceId, chunk);
  });

  return () => unsubscribe();
}, []);
```

### Pattern 3: Keyboard Shortcuts

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey) {
      switch(e.key) {
        case 'n':
          e.preventDefault();
          handleCreateWidget();
          break;
        case 'd':
          e.preventDefault();
          handleDuplicateWidget();
          break;
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [handleCreateWidget, handleDuplicateWidget]);
```

---

## Debugging Tips

### React DevTools

**Install:** [React Developer Tools](https://react.dev/learn/react-developer-tools)

**Use:**
- Inspect component tree
- View props and state
- Track re-renders
- Profile performance

### Console Logging

**Structured logging:**
```typescript
console.log('[Canvas] Creating widget:', { id, name, type });
console.warn('[Widget] Drag started but position not set');
console.error('[IPC] Failed to save widget:', error);
```

### Performance Profiling

**Chrome DevTools:**
1. Open Performance tab
2. Start recording
3. Interact with canvas
4. Stop recording
5. Analyze flame graph

**Look for:**
- Long tasks (> 50ms)
- Forced reflows
- Memory leaks

---

## Next Steps

- **Learn architecture:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Explore features:** [FEATURES.md](FEATURES.md)
- **Run tests:** [docs/TESTING-STRATEGY.md](docs/TESTING-STRATEGY.md)
- **Contribute:** Check GitHub issues

---

**Last Updated:** November 14, 2025
**Version:** 2.0.1-beta
