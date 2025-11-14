# Canvas AI - Visual AI Agent Orchestrator

**Visual terminal multiplexer for AI agents on an infinite 2D canvas**

## ⚠️ Security Warning

**Educational project - use at your own risk.** Claude AI can execute bash commands, read/write files, and spawn processes with your user permissions. No sandboxing. Use in a dedicated test directory only, not with sensitive data. You're responsible for API costs. See [FEATURES.md - Security](FEATURES.md#security-best-practices) for details.

---

## 🎯 What This Is

Canvas AI is an **Electron desktop app** that demonstrates:
- Managing multiple AI agent instances
- Visual organization on an infinite 2D canvas
- Real-time command execution and output streaming
- Drag, resize, and interact with each agent independently

## 🚀 Quick Start

### Build from Source

**Requirements:** Node.js 18+, macOS 11+, Xcode Command Line Tools

```bash
# Clone and install
git clone https://github.com/samueljklee/canvas-ai.git
cd canvas-ai
npm install

# Rebuild native modules (required!)
npm run rebuild

# Run in development mode
npm run dev
```

On first launch, enter your [Anthropic API key](https://console.anthropic.com/settings/keys) in the onboarding wizard.

> **📦 Build/packaging details:** [docs/BUILD.md](docs/BUILD.md)

### Download Pre-Built App (Coming Soon)

1. Go to [Releases](https://github.com/samueljklee/canvas-ai/releases)
2. Download `.dmg` for your Mac (Apple Silicon or Intel)
3. Open DMG, drag to Applications
4. Launch and enter your Anthropic API key


## 🎮 How to Use

**Basic workflow:**
1. Create a widget (Cmd+N or "New Widget" button)
2. Chat with Claude AI
3. Let Claude execute commands, create files, spawn more widgets
4. Organize on infinite canvas (drag, resize, zoom)

**Quick tips:**
- Click header to cycle widget states (minimized → compact → expanded)
- Right-click for context menu
- Use Cmd+, for Settings

> **📖 For complete usage guide**, see [FEATURES.md](FEATURES.md)

## 📚 **Documentation:**
- [FEATURES.md](FEATURES.md) - Complete guide to all capabilities and workflows
- [COMPONENTS.md](COMPONENTS.md) - Developer guide to understanding and extending components
- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical architecture deep dive
- [docs/BUILD.md](docs/BUILD.md) - Build and packaging instructions
- [docs/TESTING-STRATEGY.md](docs/TESTING-STRATEGY.md) - Testing guide

---
