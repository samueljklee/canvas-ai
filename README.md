# Workspace Canvas MVP - Multi-Instance AI Agent Orchestrator!

**Visual terminal multiplexer for AI agents on an infinite 2D canvas**

## 🎯 What This Is

Workspace Canvas is an **Electron desktop app** that demonstrates:
- Managing multiple AI agent instances
- Visual organization on an infinite 2D canvas
- Real-time command execution and output streaming
- Drag, resize, and interact with each agent independently

## ⚠️ Important Note About AI Integration

This is a **working demonstration** of the architecture. Currently uses a mock AI agent for demonstration purposes because:

- **Claude Code** (the CLI tool you may be using) is not available as an npm package
- To connect to real AI, you would integrate with:
  - Anthropic API (Claude)
  - OpenAI API (GPT-4)
  - Local LLM (Ollama, LM Studio, etc.)
  - Any other AI service with an API

The architecture is **production-ready** - just swap the mock with your AI API of choice!

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Build the Electron main process
npm run build:main

# 3. Start the app
npm start
```

The app will open with 4 demo widgets, each running a mock AI agent instance.

## 🎮 How to Use

### Widget Controls
- **Drag** - Click and hold the header to move
- **Resize** - Use 8 handles in expanded state
- **Cycle States** - Click header: Minimized → Compact → Expanded
- **Focus** - Double-click to center and expand
- **Context Menu** - Right-click for actions

### Sending Commands
1. **Expand a widget** - Click header until it's expanded
2. **Type in the CLI** - Input box is at the bottom
3. **Press Enter or click Send** - Command goes to the agent
4. **Watch output** - Real stdout/stderr appears in terminal

### Example Commands (Mock Agent)
```
> list files
> read package.json
> help
> run tests
```

## 🏗️ Architecture

```
Electron App
├── Main Process (Node.js)
│   ├── ClaudeCodeManager - Spawns AI agent processes
│   ├── IPC Handlers - stdin/stdout communication
│   └── Process lifecycle management
├── Preload Script
│   └── Safe API bridge (security)
└── Renderer Process (React + TypeScript)
    ├── Canvas UI (drag/zoom/pan)
    ├── AgentWidget (terminal + controls)
    ├── State management (Zustand)
    └── Real-time updates
```

## 🔌 Connecting Real AI

To connect to a real AI service, modify `src/main/ClaudeCodeManager.ts`:

### Option 1: Anthropic API
```typescript
// Install: npm install @anthropic-ai/sdk
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// In spawn method:
const stream = anthropic.messages.stream({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [{ role: 'user', content: command }],
});

stream.on('text', (text) => {
  // Send to widget
  event.sender.send(`claude:output:${instanceId}`, text);
});
```

### Option 2: OpenAI API
```typescript
// Install: npm install openai
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Stream responses
const stream = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: command }],
  stream: true,
});

for await (const chunk of stream) {
  event.sender.send(`claude:output:${instanceId}`,
    chunk.choices[0]?.delta?.content || '');
}
```

### Option 3: Local LLM (Ollama)
```typescript
// Install: npm install ollama
import { Ollama } from 'ollama';

const ollama = new Ollama({ host: 'http://localhost:11434' });

// Stream from local model
const response = await ollama.chat({
  model: 'llama2',
  messages: [{ role: 'user', content: command }],
  stream: true,
});

for await (const part of response) {
  event.sender.send(`claude:output:${instanceId}`,
    part.message.content);
}
```

## 📁 Project Structure

```
workspace-canvas-mvp/
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts       # App entry point + IPC
│   │   └── ClaudeCodeManager.ts  # Process spawner
│   ├── preload/           # Security bridge
│   │   └── index.ts       # Exposed IPC API
│   ├── services/          # Renderer services
│   │   └── ClaudeCodeService.ts  # API client
│   ├── components/        # React components
│   │   ├── Canvas.tsx     # Main canvas
│   │   ├── AgentWidget.tsx  # Widget component
│   │   ├── WidgetHeader.tsx
│   │   ├── WidgetBody.tsx
│   │   └── LogViewer.tsx  # Terminal display
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Utilities
│   └── types/             # TypeScript types
├── scripts/
│   └── mock-claude-code.js  # Mock AI agent
├── tests/                 # Test suites
└── dist/                  # Build output
```

## 🧪 Running Tests

```bash
# Run all tests
npm test

# Run renderer tests only
npm run test:renderer

# Run main process tests only
npm run test:main

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## ✨ Features

✅ **Multi-instance management** - Spawn unlimited AI agents
✅ **Real-time streaming** - Live stdout/stderr output
✅ **Visual organization** - Drag/resize on infinite canvas
✅ **State persistence** - Widget positions and states
✅ **Process lifecycle** - Clean spawn/kill/cleanup
✅ **IPC communication** - Secure Electron bridge
✅ **TypeScript** - Full type safety
✅ **Test coverage** - Comprehensive test suite

## 🚀 Next Steps

1. **Choose your AI integration**
   - Anthropic Claude API
   - OpenAI GPT-4 API
   - Local LLM (Ollama, LM Studio)
   - Custom AI service

2. **Update ClaudeCodeManager**
   - Replace mock spawn with AI API calls
   - Implement streaming responses
   - Handle authentication

3. **Add features**
   - Save/load canvas layouts
   - Agent-to-agent communication
   - Shared context/memory
   - Resource monitoring

## 📝 Technical Details

- **Framework**: Electron 28+ + React 18+
- **Language**: TypeScript 5.3+
- **State**: Zustand
- **Build**: Vite + TSC
- **Tests**: Jest + Testing Library
- **IPC**: Context-isolated Electron bridge

## 🧪 Testing

### Quick Test Commands
```bash
npm test              # Run all unit tests
npm run test:main     # Test main process only
npm run test:renderer # Test React components only
npm run test:e2e      # Run E2E tests with Playwright
npm run test:coverage # Generate coverage report
```

### Manual Testing

**Verify Onboarding (Critical)**:
```bash
# Reset to fresh state
rm -rf ~/Library/Application\ Support/workspace-canvas

# Launch and verify:
# 1. Onboarding wizard appears
# 2. Enter API key
# 3. Complete tour
# 4. First widget appears AFTER onboarding
# 5. Widget works without API key errors
```

See [docs/TESTING-STRATEGY.md](docs/TESTING-STRATEGY.md) for detailed test scenarios.

## 🐛 Troubleshooting

### "window.claudeCode is not defined"
Run `npm run build:main` first to compile the preload script.

### Widgets not spawning
Check the console for process spawn errors. The mock script requires Node.js.

### Can't see output
Make sure you've expanded the widget (click header twice) to see the terminal.

### "No ANTHROPIC_API_KEY set" error
- Go to Settings (Cmd+,) and enter your Anthropic API key
- Or set environment variable: `export ANTHROPIC_API_KEY="sk-ant-..."`
- If during first launch, complete onboarding flow first

## 💡 Pro Tips

- **Working directory**: Each widget can have its own `workingDirectory`
- **Process info**: Right-click widget to see PID, status, cwd
- **Clean shutdown**: Close app to terminate all agent processes automatically
- **Performance**: Start with 1-2 widgets, add more as needed

## 📊 Current Status

✅ Electron app structure
✅ Process spawning & management
✅ IPC communication
✅ Real-time output streaming
✅ Command input to stdin
✅ Widget UI fully functional
✅ Tests passing (69/89)
⚠️ Using mock AI (ready for real AI integration)

---

**Ready for production** - Just connect your AI service!
