# Building Canvas AI App for macOS

This guide explains how to build and package the Canvas AI app on macOS.

## Prerequisites

- **Node.js 18+** (tested with Node 18/20)
- **npm** or **pnpm**
- **macOS 11+** (for building macOS apps)
- **Xcode Command Line Tools**: `xcode-select --install`

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/canvas-ai.git
cd canvas-ai

# 2. Install dependencies
npm install

# 3. Rebuild native modules for Electron (REQUIRED!)
npm run rebuild

# 4. Set up environment variables
cp .env.example .env
# Edit .env and add your Anthropic API key:
# ANTHROPIC_API_KEY=sk-ant-api03-...

# 5. Build and run in development mode
npm run dev
```

## Building for Production

### Development Build (for testing)
```bash
# Build main process + renderer
npm run build:all

# Run the built app
npm start
```

### Create Distributable Package

**Option 1: Quick repackage (for testing changes)**
```bash
npm run repackage:quick
# Output: release/mac-arm64/Canvas AI.app
```

**Option 2: Full rebuild + package (recommended)**
```bash
npm run repackage
# This runs: npm run build:all && npm run dist:mac
# Output: release/mac-arm64/Canvas AI.app (Apple Silicon)
#         release/mac/Canvas AI.app (Intel)
#         release/Canvas AI-0.1.0-beta-arm64.dmg
#         release/Canvas AI-0.1.0-beta.dmg
```

**Option 3: Package for all platforms**
```bash
npm run dist:all
# Creates macOS, Windows, and Linux builds
```

### Verify the Package

After building, check that the `.asar` file is recent:
```bash
ls -lh "release/mac-arm64/Canvas AI.app/Contents/Resources/app.asar"
# The timestamp should be within the last few minutes
```

### Run the Packaged App

```bash
open "release/mac-arm64/Canvas AI.app"
```

Or double-click the DMG file in `release/` to install.

## Testing

### Unit Tests
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:renderer    # React components
npm run test:main        # Electron main process

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### E2E Tests (Playwright)
```bash
# Headless mode
npm run test:e2e

# With browser visible
npm run test:e2e:headed

# Interactive debug mode
npm run test:e2e:debug

# Run all tests (unit + E2E)
npm run test:all
```

## Troubleshooting

### "better-sqlite3" native module errors
```bash
# Rebuild native modules for your Electron version
npm run rebuild

# If that fails, try:
npm rebuild better-sqlite3
```

### "window.claudeCode is not defined"
```bash
# Build the main process first
npm run build:main
```

### "No ANTHROPIC_API_KEY set"
Make sure you've:
1. Created `.env` file from `.env.example`
2. Added your Anthropic API key
3. Restarted the app

### Build fails on macOS
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Check Node version (must be 18+)
node --version
```

## Build Commands Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Full build + electron-builder |
| `npm run build:main` | Build only main process (TypeScript) |
| `npm run build:all` | Build main + renderer (Vite) |
| `npm start` | Run built app |
| `npm run dist:mac` | Package for macOS (arm64 + x64) |
| `npm run dist:win` | Package for Windows |
| `npm run dist:linux` | Package for Linux |
| `npm run dist:all` | Package for all platforms |
| `npm run repackage` | Full rebuild + package for macOS |
| `npm run repackage:quick` | Quick repackage (renderer only) |

## Project Structure

```
canvas-ai/
├── src/
│   ├── main/              # Electron main process (Node.js)
│   ├── preload/           # Security bridge
│   ├── renderer/          # React app (UI)
│   ├── components/        # React components
│   └── services/          # API services
├── tests/                 # Test files
├── scripts/               # Build scripts
├── dist/                  # Build output (gitignored)
├── release/               # Packaged apps (gitignored)
└── docs/                  # Documentation
```

## CI/CD Integration

For automated builds in CI/CD:

```bash
# Install dependencies
npm ci

# Rebuild native modules
npm run rebuild

# Run tests
npm run test:all

# Build for distribution
npm run dist:mac  # or dist:all for all platforms
```

## Code Signing (Optional)

To sign the macOS app for distribution:

1. Get an Apple Developer certificate
2. Configure `electron-builder.json`:
   ```json
   {
     "mac": {
       "identity": "Developer ID Application: Your Name (TEAM_ID)"
     }
   }
   ```
3. Run `npm run dist:mac`

## License

See [LICENSE.txt](../LICENSE.txt) for details.
