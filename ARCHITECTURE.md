# Canvas AI - Architecture Documentation

**Version:** 2.0.1-beta
**Last Updated:** November 14, 2025
**Status:** Living Document

📚 **Related Documentation:**
- [README.md](README.md) - Quick start and installation
- [FEATURES.md](FEATURES.md) - Complete guide to all capabilities
- [COMPONENTS.md](COMPONENTS.md) - Developer guide to components
- [docs/BUILD.md](docs/BUILD.md) - Build and packaging instructions
- [docs/TESTING-STRATEGY.md](docs/TESTING-STRATEGY.md) - Testing guide

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Main Process Architecture](#2-main-process-architecture)
3. [Renderer Process Architecture](#3-renderer-process-architecture)
4. [IPC Communication](#4-ipc-communication)
5. [Data Flow](#5-data-flow)
6. [Database Schema](#6-database-schema)
7. [Tool Execution Framework](#7-tool-execution-framework)
8. [Security Model](#8-security-model)
9. [Performance Considerations](#9-performance-considerations)

---

## 1. System Overview

### 1.1 Architecture Pattern

Canvas AI is an **Electron desktop application** with a three-tier architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                      ELECTRON APP                            │
├─────────────────────────────────────────────────────────────┤
│  Main Process (Node.js)                                      │
│  ├── AnthropicAgentManager - Claude API & streaming         │
│  ├── DatabaseService - SQLite persistence                    │
│  ├── ConfigManager - Settings & API keys                     │
│  └── IPC Handlers - Secure communication bridge              │
├─────────────────────────────────────────────────────────────┤
│  Preload Script (Context Isolation)                          │
│  └── window.claudeCode API - Sandboxed IPC exposure          │
├─────────────────────────────────────────────────────────────┤
│  Renderer Process (React + TypeScript)                       │
│  ├── Canvas - Infinite 2D workspace                          │
│  ├── AgentWidget - Chat interface                            │
│  ├── MarkdownPreview - Rich content                          │
│  ├── DocumentEditor - Monaco code editor                     │
│  └── ClaudeCodeService - IPC client wrapper                  │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Key Design Principles

1. **Security First** - Context isolation, no Node.js in renderer
2. **Real AI Integration** - Direct Anthropic API, no mocks
3. **Full Persistence** - SQLite for all app state
4. **Tool Execution** - Claude can execute bash, manipulate files, spawn widgets
5. **Multi-Agent** - Independent Claude instances per widget

---

## 2. Main Process Architecture

### 2.1 AnthropicAgentManager

**Location:** `src/main/AnthropicAgentManager.ts`
**Purpose:** Manages Claude API conversations with streaming and tool execution

#### Responsibilities:
```typescript
class AnthropicAgentManager extends EventEmitter {
  private agents: Map<string, AgentInstance>;
  private anthropic: Anthropic;
  private mainWindow: BrowserWindow;
  private dbService: DatabaseService;
  private configManager: ConfigManager;

  // Core operations
  createAgent(config: AgentConfig): string;
  sendMessage(instanceId: string, message: string): Promise<void>;
  cancelOperation(instanceId: string): void;
  killAgent(instanceId: string): void;
}
```

#### Agent Instance Structure:
```typescript
interface AgentInstance {
  id: string;
  widgetId: string;
  name: string;
  status: 'idle' | 'running' | 'error';
  conversationHistory: Anthropic.MessageParam[];
  currentStream?: Anthropic.MessageStream;
  abortController?: AbortController;
}
```

#### Features:
- ✅ Real-time streaming responses from Claude API
- ✅ Conversation history persistence (loaded from database on creation)
- ✅ Tool execution framework (bash, file ops, widget spawning)
- ✅ Abort controller for cancelling operations
- ✅ Error handling with user-friendly messages
- ✅ Automatic conversation saving after each interaction

#### Tool Execution:
Claude can execute these tools via the Anthropic Messages API:
1. **bash** - Execute terminal commands in workspace directory
2. **spawn_widget** - Create new widget instances dynamically
3. **file_read** - Read file contents
4. **file_write** - Write/update files

---

### 2.2 DatabaseService

**Location:** `src/main/DatabaseService.ts`
**Purpose:** SQLite-based persistence for all application data

#### Database File:
- **Path:** `~/Library/Application Support/canvas-ai/canvas-ai.db` (macOS)
- **Engine:** better-sqlite3 (synchronous API, faster than async)
- **Mode:** WAL (Write-Ahead Logging) for better concurrency

#### Core Operations:
```typescript
class DatabaseService {
  // Workspaces
  createWorkspace(name: string): Workspace;
  getWorkspace(id: string): Workspace | null;
  listWorkspaces(): Workspace[];
  deleteWorkspace(id: string): void;

  // Widgets
  saveWidget(widget: AgentWidgetData): void;
  getWidgetsForWorkspace(workspaceId: string): AgentWidgetData[];
  updateWidget(id: string, updates: Partial<AgentWidgetData>): void;
  deleteWidget(id: string): void;

  // Conversations
  saveConversation(widgetId: string, role: string, content: string): void;
  getConversationHistory(widgetId: string): ConversationMessage[];
  clearConversation(widgetId: string): void;

  // Logs
  addLog(widgetId: string, level: string, message: string): void;
  getLogs(widgetId: string, limit?: number): LogEntry[];

  // Command History
  saveCommand(widgetId: string, workspaceId: string, command: string): void;
  getCommandHistory(workspaceId: string, limit?: number): string[];
}
```

---

### 2.3 ConfigManager

**Location:** `src/main/ConfigManager.ts`
**Purpose:** Manages app settings and encrypted API key storage

#### Configuration Storage:
- **Engine:** electron-store (JSON file with encryption)
- **Path:** `~/Library/Application Support/canvas-ai/config.json`
- **Encryption:** AES-256 for API keys

#### Settings Managed:
```typescript
interface AppConfig {
  anthropicApiKey?: string;  // Encrypted
  onboardingCompleted: boolean;
  theme: 'light' | 'dark' | 'system';
  autoSave: boolean;
  defaultModel: string;
}
```

#### API Key Resolution Order:
1. **ConfigManager** (Settings or Onboarding) - Primary
2. **`.env` file** (development only) - Fallback
3. **Error if missing** - User prompted to configure

---

### 2.4 IPC Handlers

**Location:** `src/main/index.ts`

#### Registered Channels:
```typescript
// Agent management
ipcMain.handle('agent:create', async (event, config) => {...});
ipcMain.handle('agent:sendMessage', async (event, instanceId, message) => {...});
ipcMain.handle('agent:cancel', async (event, instanceId) => {...});
ipcMain.handle('agent:kill', async (event, instanceId) => {...});

// Workspace management
ipcMain.handle('workspace:create', async (event, name) => {...});
ipcMain.handle('workspace:load', async (event, id) => {...});
ipcMain.handle('workspace:save', async (event, workspace) => {...});
ipcMain.handle('workspace:delete', async (event, id) => {...});

// Widget operations
ipcMain.handle('widget:save', async (event, widget) => {...});
ipcMain.handle('widget:update', async (event, id, updates) => {...});
ipcMain.handle('widget:delete', async (event, id) => {...});

// Configuration
ipcMain.handle('config:get', async (event, key) => {...});
ipcMain.handle('config:set', async (event, key, value) => {...});
ipcMain.handle('config:getApiKey', async () => {...});
ipcMain.handle('config:setApiKey', async (event, apiKey) => {...});

// Conversation management
ipcMain.handle('conversation:getHistory', async (event, widgetId) => {...});
ipcMain.handle('conversation:clear', async (event, widgetId) => {...});

// Logs
ipcMain.handle('logs:get', async (event, widgetId, limit) => {...});
```

#### Event Emitters (Main → Renderer):
```typescript
// Streamed output from Claude
mainWindow.webContents.send('agent:output', instanceId, chunk);

// Status updates
mainWindow.webContents.send('agent:status', instanceId, status);

// Error notifications
mainWindow.webContents.send('agent:error', instanceId, error);

// Tool execution notifications
mainWindow.webContents.send('agent:tool', instanceId, toolName, toolInput);
```

---

## 3. Renderer Process Architecture

### 3.1 Component Hierarchy

```
App.tsx
├── Canvas.tsx (Main workspace)
│   ├── WorkspaceTabs.tsx
│   ├── SetupReminderBanner.tsx
│   ├── AgentWidget.tsx (x N widgets)
│   │   ├── WidgetHeader.tsx
│   │   │   └── ContextMenu.tsx
│   │   └── WidgetBody.tsx
│   │       ├── LogViewer.tsx (for agent type)
│   │       ├── DocumentEditor.tsx (for document type)
│   │       ├── MarkdownPreview.tsx (for markdown type)
│   │       ├── FileBrowser.tsx (for file browser type)
│   │       └── GeneratedApp.tsx (for dynamic UI)
│   └── ShortcutsModal.tsx
├── OnboardingWizard.tsx (first launch)
└── SettingsModal.tsx (Cmd+,)
```

### 3.2 Canvas Component

**Location:** `src/components/Canvas.tsx`

#### State Management:
```typescript
interface CanvasState {
  scale: number;                          // Zoom: 0.25 to 4.0
  pan: { x: number; y: number };          // Pan offset
  widgets: Map<string, AgentWidgetData>;  // All widgets
  selectedWidgetId: string | null;
  highestZIndex: number;
}
```

#### Features:
- **Infinite canvas** - Pan/zoom transform
- **Widget management** - CRUD operations on widgets
- **Keyboard shortcuts** - Cmd+N (new widget), Cmd+D (duplicate), etc.
- **Auto-arrange** - Grid layout for new widgets
- **Persistence** - Auto-save to database on changes

#### Pan/Zoom Implementation:
```typescript
// CSS transform for performance
<div style={{
  transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
  willChange: 'transform'
}}>
  {/* widgets */}
</div>
```

---

### 3.3 AgentWidget Component

**Location:** `src/components/AgentWidget.tsx`

#### Widget States:
```typescript
type WidgetState = 'minimized' | 'compact' | 'expanded';
```

#### Features:
- **Drag & drop** - Click header to drag
- **Resize** - 8 resize handles in expanded state
- **State cycling** - Click header to cycle states
- **Context menu** - Right-click for actions
- **Z-index management** - Click to bring to front

#### Widget Types:
```typescript
type WidgetType =
  | 'agent'      // Chat with Claude
  | 'document'   // Monaco editor
  | 'markdown'   // Markdown preview
  | 'browser'    // File browser
  | 'generated'; // Dynamic React UI
```

---

### 3.4 ClaudeCodeService

**Location:** `src/services/ClaudeCodeService.ts`
**Purpose:** Renderer-side IPC client wrapper

```typescript
class ClaudeCodeService {
  // Agent operations
  async createAgent(config: AgentConfig): Promise<string>;
  async sendMessage(instanceId: string, message: string): Promise<void>;
  async cancelOperation(instanceId: string): Promise<void>;
  async killAgent(instanceId: string): Promise<void>;

  // Workspace operations
  async createWorkspace(name: string): Promise<Workspace>;
  async loadWorkspace(id: string): Promise<Workspace>;
  async saveWorkspace(workspace: Workspace): Promise<void>;

  // Widget operations
  async saveWidget(widget: AgentWidgetData): Promise<void>;
  async updateWidget(id: string, updates: Partial<AgentWidgetData>): Promise<void>;
  async deleteWidget(id: string): Promise<void>;

  // Conversation operations
  async getConversationHistory(widgetId: string): Promise<ConversationMessage[]>;
  async clearConversation(widgetId: string): Promise<void>;

  // Event listeners
  onAgentOutput(callback: (instanceId: string, chunk: string) => void): void;
  onAgentStatus(callback: (instanceId: string, status: string) => void): void;
  onAgentError(callback: (instanceId: string, error: string) => void): void;
}
```

---

## 4. IPC Communication

### 4.1 Security Model

**Context Isolation:** Enabled
**Node Integration:** Disabled in renderer
**Preload Script:** Only exposes whitelisted IPC channels

#### Preload API:
```typescript
// src/preload/index.ts
contextBridge.exposeInMainWorld('claudeCode', {
  // Agent operations
  createAgent: (config: AgentConfig) => ipcRenderer.invoke('agent:create', config),
  sendMessage: (instanceId: string, message: string) =>
    ipcRenderer.invoke('agent:sendMessage', instanceId, message),

  // Event listeners (one-way: main → renderer)
  onAgentOutput: (callback: Function) =>
    ipcRenderer.on('agent:output', (_, instanceId, chunk) => callback(instanceId, chunk)),

  // ... other methods
});
```

### 4.2 Communication Patterns

#### Pattern 1: Request-Response (IPC Handle)
```
Renderer → Main Process → Response
[Button Click] → invoke('agent:create') → Promise<string>
```

#### Pattern 2: Streaming (IPC Send)
```
Main Process → Renderer (repeated)
[Claude Stream] → send('agent:output', chunk) → [UI Update]
```

#### Pattern 3: Bidirectional
```
Renderer → Main (Request)
Main → Renderer (Progress Events)
Renderer → Main (Cancel)
```

---

## 5. Data Flow

### 5.1 Creating a New Agent Widget

```
User Action (Click "New Widget")
  ↓
Canvas.tsx - handleCreateWidget()
  ↓
ClaudeCodeService.createAgent(config)
  ↓
IPC: 'agent:create'
  ↓
Main: AnthropicAgentManager.createAgent()
  ├── Create AgentInstance
  ├── Load conversation history from DB
  └── Return instanceId
  ↓
Canvas.tsx - Add widget to state
  ↓
DatabaseService.saveWidget(widget)
  ↓
UI Update (new AgentWidget rendered)
```

### 5.2 Sending a Message to Claude

```
User Types Message + Press Enter
  ↓
AgentWidget.tsx - handleSend()
  ↓
ClaudeCodeService.sendMessage(instanceId, message)
  ↓
IPC: 'agent:sendMessage'
  ↓
Main: AnthropicAgentManager.sendMessage()
  ├── Add user message to conversation history
  ├── Save message to DB
  ├── Call Anthropic API with streaming
  └── For each chunk:
      ├── Emit: 'agent:output' → Renderer
      └── If tool execution:
          ├── Execute tool (bash, file ops, widget spawn)
          ├── Emit: 'agent:tool' → Renderer
          └── Continue conversation with tool result
  ↓
Renderer: ClaudeCodeService.onAgentOutput()
  ↓
AgentWidget.tsx - Append chunk to display
  ↓
LogViewer.tsx - Render with syntax highlighting
```

### 5.3 Tool Execution Flow

```
Claude Returns Tool Use
  ↓
AnthropicAgentManager detects tool_use content block
  ↓
Switch on tool.name:
  ├── 'bash' → Execute command in workspace dir
  ├── 'spawn_widget' → Create new AgentWidget
  ├── 'file_read' → Read file contents
  └── 'file_write' → Write file contents
  ↓
Tool result → Anthropic API (continue conversation)
  ↓
Claude processes result → Sends response to user
  ↓
Renderer updates UI
```

---

## 6. Database Schema

### 6.1 Tables

#### workspaces
```sql
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,              -- UUID
  name TEXT NOT NULL,               -- Workspace name
  created_at INTEGER NOT NULL,      -- Unix timestamp
  last_accessed INTEGER NOT NULL,   -- Unix timestamp
  scale REAL DEFAULT 1.0,           -- Canvas zoom level
  pan_x REAL DEFAULT 0,             -- Canvas pan X
  pan_y REAL DEFAULT 0              -- Canvas pan Y
);
```

#### widgets
```sql
CREATE TABLE widgets (
  id TEXT PRIMARY KEY,              -- UUID
  workspace_id TEXT NOT NULL,       -- FK to workspaces
  name TEXT NOT NULL,               -- Widget name
  type TEXT NOT NULL,               -- agent|document|markdown|browser|generated
  status TEXT NOT NULL,             -- idle|running|error
  state TEXT NOT NULL,              -- minimized|compact|expanded
  position_x REAL NOT NULL,         -- Canvas X coordinate
  position_y REAL NOT NULL,         -- Canvas Y coordinate
  size_width REAL NOT NULL,         -- Widget width
  size_height REAL NOT NULL,        -- Widget height
  z_index INTEGER NOT NULL,         -- Stacking order
  content TEXT,                     -- Document/markdown content
  path TEXT,                        -- File path (for documents)
  widget_state TEXT,                -- JSON serialized state
  created_at INTEGER NOT NULL,      -- Unix timestamp
  updated_at INTEGER NOT NULL,      -- Unix timestamp
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);
```

#### conversations
```sql
CREATE TABLE conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  widget_id TEXT NOT NULL,          -- FK to widgets
  role TEXT NOT NULL,               -- user|assistant
  content TEXT NOT NULL,            -- Message content (JSON for tool use)
  timestamp INTEGER NOT NULL,       -- Unix timestamp
  FOREIGN KEY (widget_id) REFERENCES widgets(id) ON DELETE CASCADE
);
```

#### logs
```sql
CREATE TABLE logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  widget_id TEXT NOT NULL,          -- FK to widgets
  level TEXT NOT NULL,              -- info|warning|error
  message TEXT NOT NULL,            -- Log message
  timestamp INTEGER NOT NULL,       -- Unix timestamp
  FOREIGN KEY (widget_id) REFERENCES widgets(id) ON DELETE CASCADE
);
```

#### command_history
```sql
CREATE TABLE command_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  widget_id TEXT NOT NULL,          -- FK to widgets
  workspace_id TEXT NOT NULL,       -- FK to workspaces
  command TEXT NOT NULL,            -- User command
  timestamp INTEGER NOT NULL,       -- Unix timestamp
  FOREIGN KEY (widget_id) REFERENCES widgets(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);
```

### 6.2 Indexes

```sql
CREATE INDEX idx_widgets_workspace ON widgets(workspace_id);
CREATE INDEX idx_conversations_widget ON conversations(widget_id);
CREATE INDEX idx_logs_widget ON logs(widget_id);
CREATE INDEX idx_logs_timestamp ON logs(timestamp);
CREATE INDEX idx_command_history_widget ON command_history(widget_id);
CREATE INDEX idx_command_history_workspace ON command_history(workspace_id);
CREATE INDEX idx_command_history_timestamp ON command_history(timestamp);
```

---

## 7. Tool Execution Framework

### 7.1 Available Tools

Claude has access to these tools via the Anthropic Messages API:

#### Tool: bash
```typescript
{
  name: 'bash',
  description: 'Execute bash commands in the workspace directory',
  input_schema: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'The bash command to execute' }
    },
    required: ['command']
  }
}
```

**Implementation:**
- Executes in workspace directory
- Captures stdout/stderr
- Returns output to Claude
- Security: No `rm -rf /`, no privileged commands

#### Tool: spawn_widget
```typescript
{
  name: 'spawn_widget',
  description: 'Create a new widget on the canvas',
  input_schema: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['agent', 'document', 'markdown'] },
      name: { type: 'string' },
      content: { type: 'string' }
    },
    required: ['type', 'name']
  }
}
```

**Implementation:**
- Creates new widget via IPC
- Positions automatically on canvas
- Returns widget ID to Claude

#### Tool: file_read (Planned)
```typescript
{
  name: 'file_read',
  description: 'Read contents of a file',
  input_schema: {
    type: 'object',
    properties: {
      path: { type: 'string' }
    },
    required: ['path']
  }
}
```

#### Tool: file_write (Planned)
```typescript
{
  name: 'file_write',
  description: 'Write contents to a file',
  input_schema: {
    type: 'object',
    properties: {
      path: { type: 'string' },
      content: { type: 'string' }
    },
    required: ['path', 'content']
  }
}
```

---

## 8. Security Model

### 8.1 Electron Security Best Practices

✅ **Context Isolation:** Enabled
✅ **Node Integration:** Disabled in renderer
✅ **Remote Module:** Disabled
✅ **Web Security:** Enabled
✅ **Sandbox:** Enabled for renderer
✅ **Content Security Policy:** Configured

### 8.2 API Key Security

- **Storage:** Encrypted with AES-256 via electron-store
- **Access:** Only main process can decrypt
- **Transmission:** Never sent to renderer (stays in main)
- **Environment:** `.env` only in development, not committed

### 8.3 IPC Security

- **Whitelist:** Only specific channels exposed via preload
- **Validation:** All inputs validated before processing
- **No eval:** No dynamic code execution from renderer
- **Sanitization:** User input sanitized before tool execution

### 8.4 Tool Execution Security

**⚠️ Important Security Considerations:**

**Current Implementation:**
- Bash commands execute with **user permissions** (not sandboxed)
- Working directory is the **workspace directory** set by user
- No command filtering or sandboxing by default

**Risks:**
- Claude can execute **any bash command** the user can run
- Can read/write files accessible to the user
- Can spawn processes and install software
- Malicious or accidental commands could cause damage

**Mitigation Strategies (Recommended for Production):**

1. **Sandboxing (Future):**
   - Run commands in Docker container
   - Use chroot/jail environment
   - Implement command whitelist

2. **Command Review:**
   - Require user confirmation for destructive commands
   - Show command preview before execution
   - Implement "dry-run" mode

3. **File System Restrictions:**
   - Limit access to specific directories
   - Prevent access to sensitive paths (`~/.ssh`, `/etc`)
   - Implement path traversal protection

4. **Audit Logging:**
   - Log all executed commands
   - Track file system changes
   - Monitor for suspicious activity

**User Responsibility:**
- Users must understand the risks before using tool execution
- Should use in dedicated, non-sensitive directories
- Should monitor what commands Claude suggests

---

## 9. Performance Considerations

### 9.1 Rendering Optimizations

- **CSS Transforms:** Hardware-accelerated pan/zoom
- **Virtual Scrolling:** LogViewer uses virtualization for large logs
- **Debounced Saves:** Database writes debounced to reduce I/O
- **React.memo:** Memoized components to prevent unnecessary re-renders
- **Map Storage:** O(1) widget lookups via Map instead of Array

### 9.2 Database Optimizations

- **WAL Mode:** Write-Ahead Logging for better concurrency
- **Prepared Statements:** Reused for common queries
- **Indexes:** Strategic indexes on foreign keys and timestamps
- **Batch Operations:** Transaction support for bulk operations
- **Synchronous API:** better-sqlite3 for predictable performance

### 9.3 Memory Management

- **Conversation History:** Loaded on-demand per widget
- **Log Truncation:** Old logs automatically pruned
- **Stream Cleanup:** AbortController to cancel ongoing streams
- **Widget Limits:** Recommended max 10-20 widgets per workspace

---

## 10. Future Architecture Enhancements

### 10.1 Planned Features

1. **Multi-user Collaboration**
   - WebSocket server for real-time sync
   - Operational Transform for concurrent edits
   - Presence indicators

2. **Plugin System**
   - Custom tool definitions
   - Widget type extensions
   - Theme customization

3. **Cloud Sync**
   - Optional cloud backup
   - Cross-device workspace sync
   - Shared workspaces

4. **Performance Monitoring**
   - API usage tracking
   - Cost estimation
   - Response time metrics

---

## Appendix A: File Structure

```
src/
├── main/                          # Main process (Node.js)
│   ├── index.ts                   # Entry point + IPC handlers
│   ├── AnthropicAgentManager.ts   # Claude API integration
│   ├── DatabaseService.ts         # SQLite persistence
│   └── ConfigManager.ts           # Settings management
├── preload/                       # Preload script
│   └── index.ts                   # Context bridge API
├── renderer/                      # Renderer process (React)
│   ├── App.tsx                    # Root component
│   ├── components/
│   │   ├── Canvas.tsx             # Main workspace
│   │   ├── AgentWidget.tsx        # Widget component
│   │   ├── MarkdownPreview.tsx    # Markdown renderer
│   │   ├── DocumentEditor.tsx     # Monaco editor
│   │   └── ...
│   ├── services/
│   │   └── ClaudeCodeService.ts   # IPC client
│   ├── hooks/                     # React hooks
│   ├── utils/                     # Utilities
│   └── types/                     # TypeScript types
└── types/                         # Shared types
    └── widget.ts                  # Widget interfaces
```

---

## Further Reading

- **[COMPONENTS.md](COMPONENTS.md)** - Detailed component documentation for developers
- **[FEATURES.md](FEATURES.md)** - Complete feature guide and workflows
- **[docs/TESTING-STRATEGY.md](docs/TESTING-STRATEGY.md)** - Testing approach and best practices
- **[docs/BUILD.md](docs/BUILD.md)** - Build and packaging instructions

---

**Document Maintained By:** Canvas AI Development Team
