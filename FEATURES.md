# Canvas AI - Features Guide

**Complete guide to Canvas AI capabilities and workflows**

📚 **Related Documentation:**
- [README.md](README.md) - Quick start and installation
- [COMPONENTS.md](COMPONENTS.md) - Developer guide to components
- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical architecture deep dive
- [docs/TESTING-STRATEGY.md](docs/TESTING-STRATEGY.md) - Testing guide

⚠️ **IMPORTANT:** See [README.md Security Notice](README.md#-important-security-notice) before using!

---

## Table of Contents

1. [Overview](#overview)
2. [Widget Types](#widget-types)
3. [Canvas Workspace](#canvas-workspace)
4. [AI Agent Capabilities](#ai-agent-capabilities)
5. [Tool Execution](#tool-execution)
6. [Workspace Management](#workspace-management)
7. [Keyboard Shortcuts](#keyboard-shortcuts)
8. [Example Workflows](#example-workflows)

---

## Overview

Canvas AI is a **visual AI agent orchestrator** that combines:
- Real-time Claude AI conversations
- Infinite 2D canvas workspace
- Multiple independent AI agents
- Tool execution (bash, files, UI generation)
- Full persistence across sessions

### What Makes It Unique?

🤖 **Claude can create UI** - The AI can spawn new widgets and generate React apps
🔧 **Real tool execution** - Bash commands, file operations in workspace context
💾 **Full conversation memory** - Complete history saved to SQLite database
🎨 **Infinite canvas** - Organize visually, pan/zoom, arrange freely
🔄 **Multi-agent** - Multiple independent Claude instances working simultaneously

---

## Widget Types

Canvas AI supports **4 widget types**, each with its own purpose:

### 1. Agent Widget 🤖

**Purpose:** Chat with Claude AI

**Features:**
- Real-time streaming responses from Anthropic API
- Full conversation history (persisted)
- Tool execution capabilities
- Syntax-highlighted log viewer
- Command input with history

**Use Cases:**
- General AI assistance
- Code review and debugging
- Project planning
- System administration tasks
- Creating other widgets dynamically

**How to Create:**
- Click "New Widget" button
- Press `Cmd+N`
- Ask Claude to spawn one: "Create another agent"

**Example Interaction:**
```
You: Analyze the package.json and suggest improvements
Claude: [Executes bash: cat package.json]
        I'll review your dependencies...

        Suggestions:
        1. Update Electron to 30.5.1 (current: 30.5.1) ✅
        2. Consider adding husky for pre-commit hooks
        3. Your better-sqlite3 version is current
```

---

### 2. Document Widget 📄

**Purpose:** Code/text editor with syntax highlighting

**Features:**
- **Monaco Editor** - Same editor as VS Code
- Syntax highlighting for 50+ languages
- Auto-detection of language from file extension
- IntelliSense support
- Mini-map navigation
- Auto-save on blur

**Supported Languages:**
- JavaScript, TypeScript, Python, Go, Rust
- HTML, CSS, JSON, YAML, Markdown
- Shell scripts, SQL, and more

**How to Create:**
- Ask Claude: "Create a document for my React component"
- Tool: `spawn_widget` with type `document`
- Manual: Right-click canvas → New Document

**Example Use:**
```
You: Create a React component for a user profile card
Claude: I'll create that for you
        [Spawns document widget with code]

        ┌─ UserProfile.tsx ──────────────┐
        │ import React from 'react';     │
        │                                │
        │ interface UserProfileProps {   │
        │   name: string;                │
        │   avatar: string;              │
        │ }                              │
        │                                │
        │ export const UserProfile...    │
        └────────────────────────────────┘
```

---

### 3. File Browser Widget 📁

**Purpose:** Navigate project file structure

**Features:**
- Tree view of workspace directory
- Expand/collapse folders
- File type icons
- Click to open in document editor
- Context menu actions

**Use Cases:**
- Exploring project structure
- Quick file access
- Visualizing directory layout

**How to Create:**
- Ask Claude: "Show me the project files"
- Tool: `spawn_widget` with type `filebrowser`

---

### 4. Generated App Widget 🎨

**Purpose:** Dynamic React UI created by Claude

**Features:**
- Claude generates React code on the fly
- Live rendering in widget
- Interactive components
- Custom styling
- Full React capabilities (hooks, state, effects)

**What Claude Can Generate:**
- Data visualizations (charts, graphs)
- Form builders
- TODO lists, kanban boards
- Calculators, converters
- Dashboard widgets
- Mini-games
- Any React UI you can imagine!

**How It Works:**
```
1. You: "Create a temperature converter"
2. Claude: [Generates React code]
3. Widget: Renders live React component
4. Result: Working temperature converter app!
```

**Example Generated Apps:**
- Calculator
- Color picker
- Markdown previewer
- JSON formatter
- Image gallery
- Timer/Stopwatch
- Weather widget

---

## Canvas Workspace

### Infinite 2D Canvas

**Zoom:**
- `Cmd+Plus` / `Cmd+Minus` - Zoom in/out
- `Cmd+0` - Reset zoom to 100%
- `Ctrl+Scroll` - Zoom towards mouse cursor
- Range: 25% to 400%

**Pan:**
- `Shift+Drag` - Pan canvas
- `Middle Mouse Button` - Pan while held
- Smooth momentum scrolling

**Performance:**
- Hardware-accelerated CSS transforms
- 60fps dragging and zooming
- Efficient rendering (only visible widgets updated)

---

### Widget Operations

#### Creating Widgets
- **New Agent:** `Cmd+N` or "New Widget" button
- **Duplicate:** `Cmd+D` (copies selected widget)
- **Via AI:** Ask Claude to create widgets

#### Moving Widgets
- **Drag:** Click and hold header
- **Smooth:** Transform-based, no jittering
- **Constrained:** Can't drag off canvas edges

#### Resizing Widgets
- **8 Resize Handles:** Corners and edges (expanded state only)
- **Aspect Ratio:** Free resize, no constraints
- **Min Size:** 200x150px (prevents too-small widgets)

#### Widget States
**3 States** (click header to cycle):
1. **Minimized** - Title bar only
2. **Compact** - Header + preview
3. **Expanded** - Full view with resize handles

#### Focus Management
- **Click** - Brings widget to front (z-index++)
- **Double-click header** - Centers widget in viewport + expands
- **Selected** - Yellow border indicates selection

#### Context Menu
**Right-click widget for:**
- Duplicate
- Delete
- Change state (minimize/compact/expand)
- View info (ID, position, size)

---

### Auto-Arrange

**What It Does:** Organizes widgets in a grid layout

**Algorithm:**
- Anchors to visible viewport area (not absolute canvas)
- Calculates optimal grid based on zoom level
- Avoids overlaps with intelligent collision detection
- Maintains reading order (left-to-right, top-to-bottom)

**When to Use:**
- After creating many widgets
- When canvas is cluttered
- After zooming/panning to new area

**How:**
- Toolbar: Click "Arrange" button
- Shortcut: (customizable)

**Smart Features:**
- Zoom-aware spacing
- Pan-aware starting position
- Respects widget sizes
- Preserves relative order

---

## AI Agent Capabilities

### Real-Time Streaming

**How It Works:**
1. Type message → Press Enter
2. Request sent to Anthropic API
3. Response streams token-by-token
4. Updates appear in real-time in log viewer
5. Conversation saved to database

**Benefits:**
- See responses as they're generated
- Cancel mid-stream if needed (`Cmd+.`)
- No waiting for complete response

---

### Conversation Persistence

**What's Saved:**
- Every user message
- Every Claude response
- Tool execution details
- Timestamps for all messages

**Storage:**
- SQLite database in user data directory
- Indexed for fast retrieval
- Survives app restarts

**Loading History:**
- Automatic on widget creation
- Full context available to Claude
- No loss of conversation state

---

### Multi-Agent Coordination

**Independent Agents:**
- Each widget = separate Claude instance
- Independent conversation histories
- Isolated tool execution contexts
- No shared state (by design)

**Use Cases:**
1. **Parallel Tasks:**
   - Agent 1: "Review this code"
   - Agent 2: "Write tests for this module"
   - Agent 3: "Research best practices"

2. **Specialized Agents:**
   - Frontend agent (React focus)
   - Backend agent (API/database focus)
   - DevOps agent (deployment focus)

3. **Compare Approaches:**
   - Agent 1: Solution A
   - Agent 2: Solution B
   - You decide the best approach

---

## Tool Execution

Claude has access to these tools via the Anthropic Messages API:

### 1. Bash Tool

**What It Does:** Executes terminal commands in workspace directory

**⚠️ Security Warning:**
- Runs with **your user permissions**
- Can access **any file you can access**
- **Not sandboxed** - real commands on your system
- Be mindful of what commands Claude suggests
- Review destructive commands before executing

**Safe Examples:**
```bash
# Claude can execute:
npm test
git status
ls -la src/
cat package.json
grep -r "TODO" src/
```

**Use Cases:**
- Run tests
- Check git status
- List files
- Read file contents
- Search codebase
- Install dependencies
- Build project

**What Claude Sees:**
```
Tool: bash
Input: { command: "npm test" }
Output:
  PASS src/components/Canvas.test.tsx
  PASS src/hooks/useCanvasState.test.ts
  Tests: 45 passed, 45 total
```

---

### 2. Spawn Widget Tool

**What It Does:** Claude can create new widgets programmatically

**Parameters:**
```typescript
{
  type: 'agent' | 'document' | 'filebrowser' | 'generated-app',
  name: string,
  content?: string,  // For documents/generated apps
  code?: string      // For generated apps
}
```

**Examples:**

**Create Agent:**
```
You: I need help with both frontend and backend
Claude: I'll create two specialized agents
        [spawn_widget: type=agent, name="Frontend Expert"]
        [spawn_widget: type=agent, name="Backend Expert"]
```

**Create Document:**
```
You: Create a React component for user login
Claude: I'll create the component file
        [spawn_widget: type=document, name="Login.tsx", content="..."]
```

**Create Generated App:**
```
You: Build me a color picker
Claude: Creating an interactive color picker
        [spawn_widget: type=generated-app, name="Color Picker", code="..."]
```

---

### 3. File Operations (Planned)

**Coming Soon:**
- `file_read` - Read file contents
- `file_write` - Write/update files
- `file_delete` - Remove files
- `file_list` - List directory contents

---

## Workspace Management

### Multiple Workspaces

**What They Are:**
- Separate canvas environments
- Independent widget collections
- Isolated zoom/pan state
- Saved to database

**Use Cases:**
1. **Project-based:**
   - Workspace 1: Frontend work
   - Workspace 2: Backend API
   - Workspace 3: Documentation

2. **Task-based:**
   - Workspace 1: Bug fixes
   - Workspace 2: New features
   - Workspace 3: Code review

3. **Context-based:**
   - Workspace 1: Learning React
   - Workspace 2: Building app
   - Workspace 3: Deployment

---

### Workspace Operations

**Create:**
- Click "+" tab
- Name your workspace
- Empty canvas ready to use

**Switch:**
- Click workspace tab
- State saved automatically
- Return anytime with full context

**Rename:**
- Right-click tab → Rename
- Or use context menu

**Delete:**
- Right-click tab → Delete
- Confirmation required
- All widgets deleted (cascade)

---

### Auto-Save

**How It Works:**
- **Debounced:** Waits 500ms after last change
- **Idle Detection:** Saves immediately after 2s idle
- **Background:** Non-blocking saves
- **Status:** Shows "Synced" timestamp

**What's Saved:**
- Widget positions and sizes
- Widget states (min/compact/exp)
- Canvas zoom and pan
- Workspace metadata
- All changes tracked

**No Manual Save Needed!**

---

## Keyboard Shortcuts

### Widget Operations
| Shortcut | Action |
|----------|--------|
| `Cmd+N` | Create new agent widget |
| `Cmd+D` | Duplicate selected widget |
| `Cmd+Backspace` | Delete selected widget |
| `Escape` | Deselect widget |

### Canvas Navigation
| Shortcut | Action |
|----------|--------|
| `Cmd+Plus` | Zoom in |
| `Cmd+Minus` | Zoom out |
| `Cmd+0` | Reset zoom to 100% |
| `Ctrl+Scroll` | Zoom towards cursor |
| `Shift+Drag` | Pan canvas |
| `Middle Mouse` | Pan while held |

### Application
| Shortcut | Action |
|----------|--------|
| `Cmd+,` | Open Settings |
| `Cmd+/` | Show keyboard shortcuts |
| `Cmd+S` | Manual save (usually auto-saves) |
| `Cmd+Q` | Quit application |

### Widget States
| Shortcut | Action |
|----------|--------|
| Click header | Cycle states (min → compact → expanded) |
| Double-click header | Center + expand |
| Right-click | Context menu |

---

## Example Workflows

### Workflow 1: Debug Production Issue

```
1. Create agent: "Help me debug a production issue"

2. Claude asks for logs:
   [bash: tail -n 100 logs/production.log]

3. You paste error stack trace

4. Claude analyzes and spawns document:
   [spawn_widget: type=document, name="Fix for bug #123"]

5. Claude generates fix code in document

6. You test locally:
   [bash: npm test]

7. Claude confirms tests pass, suggests deployment
```

---

### Workflow 2: Build New Feature

```
1. Create workspace: "User Authentication Feature"

2. Create planning agent:
   You: "Plan implementation for user auth"
   Claude: Creates implementation plan

3. Claude spawns specialized agents:
   [spawn_widget: "Backend API Agent"]
   [spawn_widget: "Frontend UI Agent"]
   [spawn_widget: "Database Schema Agent"]

4. Each agent works independently:
   - Backend: Creates API endpoints
   - Frontend: Builds login form
   - Database: Designs user table

5. Claude spawns documents with code:
   [document: "auth.routes.ts"]
   [document: "LoginForm.tsx"]
   [document: "user.schema.sql"]

6. You review, test, and deploy
```

---

### Workflow 3: Learn New Framework

```
1. Create workspace: "Learning React"

2. Create teaching agent:
   You: "Teach me React hooks"
   Claude: Explains concepts

3. Claude creates interactive examples:
   [spawn_widget: type=generated-app, name="useState Demo"]
   [spawn_widget: type=generated-app, name="useEffect Demo"]

4. You experiment with live apps

5. Claude spawns document:
   [document: "MyFirstComponent.tsx"]

6. You code along with guidance

7. Claude runs tests:
   [bash: npm test MyFirstComponent]
```

---

### Workflow 4: Code Review Session

```
1. Create agent: "Review my pull request"

2. Claude fetches files:
   [bash: git diff main...feature-branch --name-only]

3. For each file, Claude:
   [bash: git diff main...feature-branch src/component.tsx]
   Analyzes changes
   Suggests improvements

4. Claude spawns document with refactored code:
   [document: "component.refactored.tsx"]

5. You compare side-by-side

6. Claude explains trade-offs
```

---

### Workflow 5: Create Dashboard

```
1. You: "Create a project dashboard showing git stats"

2. Claude:
   [bash: git log --oneline --since='1 month ago' | wc -l]
   [bash: git shortlog -sn --all]

3. Claude spawns generated app:
   [spawn_widget: type=generated-app, name="Git Dashboard"]

4. Dashboard renders with:
   - Commit count graph
   - Contributor list
   - Recent activity timeline
   - Branch status

5. Interactive, live-updating dashboard in widget!
```

---

## Advanced Features

### Generated App Capabilities

**What Claude Can Build:**
- **Data Viz:** Charts with Recharts/D3
- **Forms:** Multi-step forms with validation
- **Games:** Tic-tac-toe, snake, memory match
- **Tools:** JSON formatter, regex tester, base64 encoder
- **Widgets:** Countdown timer, pomodoro, calculator
- **Utilities:** Color picker, lorem ipsum, UUID generator

**Technical:**
- Full React API (hooks, context, effects)
- CSS-in-JS or styled components
- State management
- Event handling
- API calls (fetch)

---

### Conversation Search (Coming Soon)

- Full-text search across all conversations
- Filter by date, agent, keyword
- Jump to specific message

---

### Export/Import (Planned)

- Export workspace to JSON
- Share canvas layouts
- Import from file

---

## Tips & Tricks

### 1. Use Multiple Agents for Complex Tasks
Break large tasks across specialized agents:
- Research agent
- Implementation agent
- Testing agent
- Documentation agent

### 2. Leverage Generated Apps
Ask Claude to create interactive tools:
- "Create a regex tester"
- "Build a markdown preview"
- "Make a color palette generator"

### 3. Let Claude Organize
Say: "Create 3 agents for frontend, backend, and database work"
Claude will spawn and organize them for you.

### 4. Use Workspaces as Contexts
Create workspace per project:
- Clean separation
- Easy context switching
- Better organization

### 5. Double-Click to Focus
Double-click widget header to:
- Center in viewport
- Expand to full view
- Bring to front

### 6. Ask Claude to Read Files
"Check the package.json dependencies"
Claude will execute: `bash: cat package.json`

### 7. Use Document Widgets as Scratchpads
Create document for:
- Notes
- TODO lists
- Code snippets
- Planning docs

---

## Security Best Practices

### 🔒 Safe Usage Guidelines

**1. Use a Dedicated Workspace:**
```bash
# Create a test directory for Canvas AI
mkdir ~/canvas-ai-workspace
cd ~/canvas-ai-workspace

# Don't use in sensitive directories like:
# - ~/Documents
# - Production codebases
# - Directories with credentials/keys
```

**2. Review Commands:**
- Read what Claude suggests before executing
- Be cautious of commands that:
  - Delete files (`rm -rf`)
  - Modify system settings
  - Access sensitive data
  - Install software

**3. Monitor API Usage:**
- Check https://console.anthropic.com regularly
- Set spending limits on your Anthropic account
- Each conversation costs tokens

**4. Protect Your API Key:**
- Never share your API key
- Don't commit `.env` files to git
- Use Settings or Onboarding (encrypted storage)

---

## Limitations & Known Issues

### Current Limitations:

1. **Security:**
   - ⚠️ No sandbox - commands run on your system
   - ⚠️ Claude has access to workspace files
   - ⚠️ Be careful with sensitive data

2. **Agent Communication:**
   - Agents don't share context (by design)
   - Use workspace for manual coordination

3. **File Operations:**
   - Limited to bash commands currently
   - Direct file read/write tools coming soon

4. **Generated Apps:**
   - No npm packages (React only)
   - Inline code only
   - No external resources

5. **Performance:**
   - Recommended max 10-20 widgets per workspace
   - Large conversations may slow loading

---

## FAQ

**Q: Can agents talk to each other?**
A: Not directly. Each agent is independent. You coordinate between them manually.

**Q: Can Claude access my file system?**
A: Only via bash commands in workspace directory. No system-wide access.

**Q: How much does it cost?**
A: Uses your Anthropic API key. Costs based on Claude API usage (tokens).

**Q: Can I use other AI models?**
A: Currently Claude-only. OpenAI/local LLMs planned for future.

**Q: Where is data stored?**
A: SQLite database in `~/Library/Application Support/canvas-ai/` (macOS)

**Q: Is it open source?**
A: Check the repository for license details.

**Q: Can I customize widgets?**
A: See [COMPONENTS.md](COMPONENTS.md) for developer guide to extending widgets.

---

## Next Steps

- **Get Started:** Follow [README.md](README.md) for installation
- **Learn Architecture:** Read [ARCHITECTURE.md](ARCHITECTURE.md)
- **Extend Features:** See [COMPONENTS.md](COMPONENTS.md)
- **Report Issues:** GitHub Issues

---

**Last Updated:** November 14, 2025
**Version:** 2.0.1-beta
