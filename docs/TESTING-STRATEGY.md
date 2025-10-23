# Testing Strategy for Workspace Canvas App

## Executive Summary

This document outlines a comprehensive testing strategy for the Workspace Canvas Electron application. The app has a complex architecture with Electron main process, renderer process (React), IPC communication, SQLite database, and Anthropic API integration.

## Quick Testing Commands

```bash
# Run all unit tests
npm test

# Run only renderer tests (React components)
npm run test:renderer

# Run only main process tests (Electron, database)
npm run test:main

# Run E2E tests
npm run test:e2e

# Run all tests (unit + E2E)
npm run test:all

# Generate coverage report
npm run test:coverage
```

## Manual Testing Scenarios

### 🔑 Verify Onboarding Flow (Critical)

**When to test**: After changes to `ConfigManager.ts`, `OnboardingWizard.tsx`, or `Canvas.tsx`

**Steps**:
1. **Reset to fresh state**:
   ```bash
   rm -rf ~/Library/Application\ Support/workspace-canvas
   ```

2. **Launch the app**:
   ```bash
   npm run dev  # or open the packaged .app
   ```

3. **Expected behavior**:
   - ✅ Onboarding wizard appears automatically
   - ✅ Welcome screen shows with "Get Started" button
   - ✅ API key step prompts for Anthropic key
   - ✅ No default widget created yet (canvas should be empty)

4. **Enter API key**:
   - Paste a valid Anthropic API key (starts with `sk-ant-`)
   - Click "Validate & Continue"
   - ✅ Key validates successfully
   - ✅ Moves to tour step after brief success message

5. **Complete tour**:
   - Navigate through tour slides
   - Click "Get Started" on final screen
   - ✅ Onboarding wizard closes
   - ✅ **First widget "Agent 1" appears** on canvas at (100, 100)

6. **Test first widget**:
   - Click "Start Agent" on the widget
   - Type a message like "Hello, who are you?"
   - Send the message
   - ✅ Agent responds WITHOUT "No ANTHROPIC_API_KEY set" error
   - ✅ Conversation works normally

7. **Verify persistence**:
   - Quit and relaunch the app
   - ✅ Onboarding does NOT appear again
   - ✅ Widget is still there with conversation history

**Common Issues**:
- ❌ Widget created before onboarding → Won't have API key
- ❌ "No ANTHROPIC_API_KEY set" error → API key not saved correctly
- ❌ Widget appears during onboarding → Logic error in Canvas.tsx

### 📑 Verify Workspace Tab Ordering

**When to test**: After changes to `useWorkspaceManager.ts`

**Steps**:
1. Launch app with existing workspace (e.g., "Default Workspace")
2. Press `Cmd+T` to create new workspace
3. ✅ New workspace tab appears **at the end** (rightmost)
4. ✅ Original workspace stays in first position
5. Create another workspace with `Cmd+T`
6. ✅ It appears after the previous one, not at the beginning

**Expected order**: `[Default Workspace] [Workspace 2] [Workspace 3]`
**Wrong order**: `[Workspace 3] [Workspace 2] [Default Workspace]` ❌

---

## Current State

### ✅ Already Configured
- **Jest** setup for both renderer and main process
- **React Testing Library** for component testing
- **Coverage thresholds** (70% across all metrics)
- **Basic test structure** in `/tests` directory
- **Existing tests** for components, hooks, and utilities

### ❌ Missing Coverage
- Main process business logic (DatabaseService, AnthropicAgentManager, ToolExecutor)
- IPC communication between main and renderer
- End-to-end Electron workflows
- Database integration tests
- API integration tests (Anthropic)

---

## Testing Layers

### 1. Unit Tests (Foundation)

**Purpose**: Test individual functions and classes in isolation

#### 1.1 Main Process Unit Tests

**Location**: `tests/main/`
**Environment**: Node (jest.main.config.js)

**Key Areas to Test**:

##### DatabaseService (`tests/main/DatabaseService.test.ts`)
```typescript
describe('DatabaseService', () => {
  let db: DatabaseService;

  beforeEach(() => {
    db = new DatabaseService(':memory:'); // Use in-memory SQLite
  });

  describe('Conversation Persistence', () => {
    it('should save and load conversations correctly');
    it('should filter invalid messages on load');
    it('should handle malformed JSON gracefully');
    it('should CASCADE delete conversations when widget deleted');
  });

  describe('Log Persistence', () => {
    it('should save logs for a widget');
    it('should load logs in correct order');
    it('should limit logs to 1000 per widget');
  });

  describe('Command History', () => {
    it('should save command history');
    it('should load widget-specific history');
    it('should search workspace-wide commands');
  });

  describe('Workspace Management', () => {
    it('should create workspaces');
    it('should load widgets with logs');
    it('should handle widget state persistence');
  });
});
```

##### AnthropicAgentManager (`tests/main/AnthropicAgentManager.test.ts`)
```typescript
describe('AnthropicAgentManager', () => {
  let manager: AnthropicAgentManager;
  let mockDb: jest.Mocked<DatabaseService>;
  let mockAnthropicClient: any;

  beforeEach(() => {
    mockDb = {
      saveConversation: jest.fn(),
      loadConversation: jest.fn(() => []),
      saveCommand: jest.fn(),
    } as any;

    mockAnthropicClient = {
      messages: {
        create: jest.fn(),
      },
    };

    manager = new AnthropicAgentManager(null, mockDb);
    (manager as any).anthropic = mockAnthropicClient;
  });

  describe('Conversation Management', () => {
    it('should load existing conversation on spawn');
    it('should save conversation after user message');
    it('should save conversation after assistant response');
    it('should save conversation after tool results');
  });

  describe('Message Handling', () => {
    it('should handle text messages');
    it('should handle tool use requests');
    it('should execute tools in parallel');
    it('should handle cancellation during tool execution');
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully');
    it('should validate tool results have content');
    it('should skip invalid messages from database');
  });
});
```

##### ToolExecutor (`tests/main/ToolExecutor.test.ts`)
```typescript
describe('ToolExecutor', () => {
  let executor: ToolExecutor;
  let mockWindow: any;

  beforeEach(() => {
    mockWindow = {
      webContents: {
        send: jest.fn(),
      },
    };
    executor = new ToolExecutor('/tmp/test', mockWindow);
  });

  describe('File Operations', () => {
    it('should write files with content validation');
    it('should read files correctly');
    it('should handle file not found errors');
    it('should create directories recursively');
  });

  describe('Bash Execution', () => {
    it('should execute bash commands');
    it('should handle command timeouts');
    it('should capture stdout and stderr');
  });

  describe('Widget Spawning', () => {
    it('should emit spawn-widget events');
    it('should validate spawn parameters');
  });
});
```

#### 1.2 Renderer Unit Tests

**Location**: `tests/components/`, `tests/hooks/`, `tests/utils/`
**Environment**: jsdom (jest.config.js)

**Already have good coverage, enhance with**:

##### ClaudeCodeService (`tests/services/ClaudeCodeService.test.ts`)
```typescript
describe('ClaudeCodeService', () => {
  let service: ClaudeCodeService;

  beforeEach(() => {
    global.window = {
      claudeCode: {
        spawn: jest.fn(),
        sendCommand: jest.fn(),
        subscribeOutput: jest.fn(() => jest.fn()),
        getWidgetCommandHistory: jest.fn(),
      },
    } as any;

    service = new ClaudeCodeService();
  });

  it('should spawn instances with widget and workspace IDs');
  it('should send commands through IPC');
  it('should subscribe to output streams');
  it('should load command history');
});
```

---

### 2. Integration Tests

**Purpose**: Test interactions between multiple components

#### 2.1 IPC Integration Tests

**Location**: `tests/integration/ipc/`
**Challenge**: Testing across main/renderer boundary

**Solution**: Use `spectron` alternative or manual IPC mocking

```typescript
// tests/integration/ipc/conversation-persistence.test.ts
describe('Conversation Persistence Integration', () => {
  it('should save conversation when user sends message', async () => {
    // 1. Spawn agent with widgetId
    // 2. Send message through IPC
    // 3. Verify DatabaseService.saveConversation called
    // 4. Verify conversation saved to database
    // 5. Kill and respawn agent
    // 6. Verify conversation loaded from database
  });
});
```

#### 2.2 Database Integration Tests

**Location**: `tests/integration/database/`
**Use real SQLite** (in-memory or temp file)

```typescript
describe('Database Integration', () => {
  describe('CASCADE Deletes', () => {
    it('should delete conversations when widget deleted');
    it('should delete logs when widget deleted');
    it('should delete commands when widget deleted');
    it('should delete widgets when workspace deleted');
  });

  describe('Transaction Integrity', () => {
    it('should save widget with logs atomically');
    it('should rollback on error');
  });
});
```

---

### 3. E2E Tests (Optional but Recommended)

**Purpose**: Test full user workflows in real Electron app

**Tools**:
- **Playwright** (recommended - better Electron support than Spectron)
- **electron-playwright-helpers**

**Setup**:
```bash
npm install --save-dev playwright @playwright/test
npm install --save-dev electron-playwright-helpers
```

**Location**: `tests/e2e/`

```typescript
// tests/e2e/widget-lifecycle.e2e.ts
import { test, expect } from '@playwright/test';
import { ElectronApplication, Page } from 'playwright';
import { _electron as electron } from 'playwright';

test.describe('Widget Lifecycle E2E', () => {
  let app: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    app = await electron.launch({
      args: ['dist/main/main/index.js'],
    });
    page = await app.firstWindow();
  });

  test.afterAll(async () => {
    await app.close();
  });

  test('should create widget, send message, and persist conversation', async () => {
    // Click "New Agent" button
    await page.click('button:has-text("New Agent")');

    // Wait for widget to appear
    await page.waitForSelector('.agent-widget');

    // Send a message
    await page.fill('input.widget-command-field', 'Hello!');
    await page.press('input.widget-command-field', 'Enter');

    // Wait for response
    await page.waitForSelector('.log-viewer .log-entry', { timeout: 10000 });

    // Close and reopen app
    await app.close();
    app = await electron.launch({ args: ['dist/main/main/index.js'] });
    page = await app.firstWindow();

    // Verify widget and conversation restored
    await page.waitForSelector('.agent-widget');
    const logEntries = await page.locator('.log-viewer .log-entry').count();
    expect(logEntries).toBeGreaterThan(0);
  });

  test('should use arrow keys to navigate command history', async () => {
    // Send multiple commands
    // Press arrow up
    // Verify previous command loaded
  });
});
```

---

## Testing Electron-Specific Challenges

### Challenge 1: IPC Communication

**Problem**: Jest can't test across process boundary

**Solutions**:

#### A. Mock IPC in Renderer Tests
```typescript
// tests/__mocks__/electron.ts
export const ipcRenderer = {
  invoke: jest.fn(),
  on: jest.fn(),
  send: jest.fn(),
};

export const contextBridge = {
  exposeInMainWorld: jest.fn(),
};
```

#### B. Test Main and Renderer Separately
- Main tests verify IPC handlers work correctly
- Renderer tests verify IPC calls are made correctly
- Integration tests verify end-to-end flow

#### C. Use Dependency Injection
```typescript
// Instead of:
window.claudeCode.spawn(...)

// Make service testable:
class ClaudeCodeService {
  constructor(private ipcClient: IpcClient = window.claudeCode) {}

  spawn() {
    return this.ipcClient.spawn(...);
  }
}

// In tests, inject mock:
const mockIpc = { spawn: jest.fn() };
const service = new ClaudeCodeService(mockIpc);
```

### Challenge 2: Anthropic API

**Problem**: Can't make real API calls in tests

**Solutions**:

#### A. Mock the SDK
```typescript
jest.mock('@anthropic-ai/sdk', () => ({
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Test response' }],
        stop_reason: 'end_turn',
      }),
    },
  })),
}));
```

#### B. Use VCR-like recording
```typescript
// tests/fixtures/anthropic-responses.json
{
  "simple_message": {
    "content": [{ "type": "text", "text": "Hello!" }],
    "stop_reason": "end_turn"
  },
  "tool_use": {
    "content": [
      { "type": "text", "text": "I'll write a file" },
      { "type": "tool_use", "name": "write_file", "input": {...} }
    ]
  }
}
```

### Challenge 3: SQLite Database

**Solution**: Use in-memory databases for tests

```typescript
beforeEach(() => {
  db = new DatabaseService(':memory:');
});

afterEach(() => {
  db.close();
});
```

**Advantages**:
- Fast (no disk I/O)
- Isolated (each test gets fresh DB)
- Real SQLite behavior
- Tests CASCADE deletes, transactions, etc.

---

## Recommended Test Implementation Plan

### Phase 1: Core Unit Tests (Week 1)
1. ✅ DatabaseService - all CRUD operations
2. ✅ AnthropicAgentManager - conversation management
3. ✅ ToolExecutor - tool execution logic
4. ✅ Conversation persistence validation
5. ✅ Command history persistence

### Phase 2: Enhanced Component Tests (Week 2)
1. ✅ Test command history loading in WidgetBody
2. ✅ Test conversation restoration in AgentWidget
3. ✅ Test IPC service abstractions
4. ✅ Test error boundaries and error handling

### Phase 3: Integration Tests (Week 3)
1. ✅ IPC communication flows
2. ✅ Database integration with CASCADE deletes
3. ✅ Full widget lifecycle (spawn → message → save → restore)
4. ✅ Tool execution integration

### Phase 4: E2E Tests (Optional - Week 4)
1. ⚠️ Setup Playwright with Electron
2. ⚠️ Critical user flows
3. ⚠️ Regression test suite

---

## Test Utilities & Helpers

### Database Test Helper
```typescript
// tests/helpers/database.helper.ts
export class TestDatabaseHelper {
  static createInMemoryDb(): DatabaseService {
    return new DatabaseService(':memory:');
  }

  static seedTestData(db: DatabaseService) {
    const workspace = { id: 'test-workspace', name: 'Test' };
    const widget = createWidget({ name: 'Test Widget' });
    db.createWorkspace(workspace.name);
    db.saveWidget(workspace.id, widget);
    return { workspace, widget };
  }
}
```

### Anthropic Mock Helper
```typescript
// tests/helpers/anthropic.helper.ts
export class MockAnthropicHelper {
  static createMockClient(responses: any[] = []) {
    const mockCreate = jest.fn();
    responses.forEach((response, i) => {
      mockCreate.mockResolvedValueOnce(response);
    });

    return {
      messages: { create: mockCreate },
    };
  }

  static textResponse(text: string) {
    return {
      content: [{ type: 'text', text }],
      stop_reason: 'end_turn',
    };
  }

  static toolUseResponse(toolName: string, input: any) {
    return {
      content: [
        { type: 'text', text: `I'll use ${toolName}` },
        { type: 'tool_use', id: 'test-id', name: toolName, input },
      ],
      stop_reason: 'tool_use',
    };
  }
}
```

---

## Running Tests

### Commands
```bash
# Run all tests
npm test

# Run renderer tests only
npm run test:renderer

# Run main process tests only
npm run test:main

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Run specific test file
npm test -- AgentWidget.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="conversation"
```

### CI/CD Integration
```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run rebuild
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

---

## Best Practices

### 1. Test Naming
```typescript
// ❌ Bad
it('test 1');

// ✅ Good
it('should save conversation after user sends message');
```

### 2. Arrange-Act-Assert Pattern
```typescript
it('should load command history on mount', () => {
  // Arrange
  const mockHistory = ['cmd1', 'cmd2'];
  window.claudeCode.getWidgetCommandHistory = jest.fn()
    .mockResolvedValue({ success: true, commands: mockHistory });

  // Act
  render(<WidgetBody widget={mockWidget} workspaceId="test" />);

  // Assert
  await waitFor(() => {
    expect(window.claudeCode.getWidgetCommandHistory)
      .toHaveBeenCalledWith(mockWidget.id, 50);
  });
});
```

### 3. Don't Test Implementation Details
```typescript
// ❌ Bad - testing internal state
expect(component.state.internalCounter).toBe(5);

// ✅ Good - testing behavior
expect(screen.getByText('Count: 5')).toBeInTheDocument();
```

### 4. Use Test IDs for Complex Queries
```typescript
// Component
<div data-testid="widget-log-entry">{message}</div>

// Test
const logEntries = screen.getAllByTestId('widget-log-entry');
expect(logEntries).toHaveLength(3);
```

---

## Coverage Goals

### Current Thresholds (70%)
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

### Recommended Targets
- **Unit Tests**: 80%+ coverage
- **Integration Tests**: Cover all critical paths
- **E2E Tests**: Cover top 5 user workflows

### Priority Areas (Must have >90% coverage)
1. ✅ DatabaseService (data persistence)
2. ✅ Conversation management
3. ✅ Command history
4. ✅ IPC communication
5. ✅ Tool execution

---

## Tools & Libraries Summary

### Already Installed ✅
- jest
- ts-jest
- @testing-library/react
- @testing-library/jest-dom
- @testing-library/user-event
- jest-environment-jsdom

### Recommended to Add ⚠️
```bash
# E2E Testing
npm install --save-dev playwright @playwright/test

# Better SQLite mocking (if needed)
npm install --save-dev sql.js

# API mocking
npm install --save-dev nock msw

# Test data generation
npm install --save-dev @faker-js/faker
```

---

## Conclusion

Your app already has a solid testing foundation. The key next steps are:

1. **Write unit tests for main process** (DatabaseService, AnthropicAgentManager, ToolExecutor)
2. **Add integration tests** for IPC and database operations
3. **Consider E2E tests** for critical user workflows using Playwright
4. **Focus on conversation and command history persistence** - the complex new features

The Electron-specific challenges are manageable with proper mocking and architectural patterns (dependency injection, service abstractions). The in-memory SQLite approach gives you real database testing without complexity.

Start with Phase 1 (core unit tests) and build up from there. Aim for 80%+ coverage on critical business logic.
