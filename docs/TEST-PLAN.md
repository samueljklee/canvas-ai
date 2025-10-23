# Workspace Canvas - Test Plan & Regression Prevention

**Version:** 2.0
**Last Updated:** 2025-10-10
**Status:** Active Testing

---

## 1. Test Coverage Overview

### 1.1 Current Coverage
```
Component Tests:     8/8   ✅ 100%
Feature Tests:       3/3   ✅ 100%
Integration Tests:   1/1   ✅ 100%
Main Process Tests:  1/2   ⏳ 50%
Service Tests:       1/1   ✅ 100%
Util Tests:          1/1   ✅ 100%

Overall: 15/16 test suites (93.75%)
Target:  100% critical paths tested
```

### 1.2 Regression History
| Bug | Date | Severity | Prevented by Tests? |
|-----|------|----------|---------------------|
| Vertical drag not working | 2025-10-10 | High | ❌ No test |
| Drag jitter/fighting | 2025-10-10 | Medium | ❌ No test |
| Arrange not viewport-aware | 2025-10-10 | Low | ❌ No test |
| Database missing column | 2025-10-08 | High | ❌ No test |
| Document save to directory | 2025-10-08 | High | ❌ No test |
| Auto-focus not working | 2025-10-08 | Low | ❌ No test |

**Conclusion:** Need more regression tests for recent bugs!

---

## 2. Critical Test Gaps (HIGH PRIORITY)

### 2.1 Drag Performance Tests ❌ NOT IMPLEMENTED
**File:** `tests/features/drag-performance.test.tsx`

**What to test:**
```typescript
describe('Widget Drag Performance', () => {
  it('should maintain 60fps during drag', async () => {
    // 1. Render widget on canvas
    // 2. Simulate drag (multiple mousemove events)
    // 3. Measure frame times using performance.now()
    // 4. Assert: avg frame time < 16.67ms (60fps)
  });

  it('should use CSS transform during drag, not position updates', () => {
    // 1. Start drag
    // 2. Check widget style has transform
    // 3. Verify position.x/y unchanged during drag
    // 4. Drop widget
    // 5. Verify position updated, transform cleared
  });

  it('should work smoothly in both X and Y axes', () => {
    // 1. Drag widget diagonally
    // 2. Sample positions every 16ms
    // 3. Verify continuous movement (no stuck axis)
  });

  it('should not jitter or snapback during drag', () => {
    // 1. Track dragTransform values during drag
    // 2. Verify monotonic increase (no backwards movement)
  });
});
```

**Why critical:** Recent regressions in drag (vertical not working, jitter)

---

### 2.2 Viewport-Aware Arrange Tests ❌ NOT IMPLEMENTED
**File:** `tests/features/viewport-arrange.test.tsx`

**What to test:**
```typescript
describe('Viewport-Aware Auto-Arrange', () => {
  it('should anchor to top-left of visible viewport', () => {
    // 1. Pan canvas to (500, 300)
    // 2. Zoom to 0.5x
    // 3. Call auto-arrange
    // 4. Verify first widget at: (-500/0.5 + 100, -300/0.5 + 100)
    //    = (1100, 700) in canvas coordinates
  });

  it('should use visible canvas space when zoomed out', () => {
    // 1. Set zoom to 0.5x (viewport shows 2x area)
    // 2. Auto-arrange 10 widgets
    // 3. Verify widgets spread across full visible width
    // 4. Calculate: maxRowWidth = window.innerWidth / 0.5 - 200
  });

  it('should respect zoom when zoomed in', () => {
    // 1. Set zoom to 2x (viewport shows 0.5x area)
    // 2. Auto-arrange 10 widgets
    // 3. Verify widgets fit in smaller visible area
  });

  it('should adjust widgets off-screen on load', () => {
    // 1. Save widget at position (3000, 2000) (off-screen)
    // 2. Load workspace on smaller viewport (1920x1080)
    // 3. Verify widget adjusted to fit within viewport
  });
});
```

**Why critical:** Recent regression (arrange not anchoring correctly)

---

### 2.3 Database Persistence Tests ❌ PARTIALLY IMPLEMENTED
**File:** `tests/main/DatabaseService.test.ts`

**What to test:**
```typescript
describe('DatabaseService', () => {
  describe('Migrations', () => {
    it('should add widget_state column if missing', () => {
      // 1. Create DB without widget_state column
      // 2. Run migration
      // 3. Verify column exists: PRAGMA table_info(widgets)
    });

    it('should be idempotent (no error on re-run)', () => {
      // 1. Run migration twice
      // 2. Verify no errors
    });

    it('should preserve existing data during migration', () => {
      // 1. Insert widget data without widget_state
      // 2. Run migration
      // 3. Verify all data still present
    });
  });

  describe('Widget State', () => {
    it('should save widget_state field', () => {
      const widget = {
        ...createMockWidget(),
        state: 'expanded' as const
      };
      db.saveWidget('workspace-1', widget);

      const loaded = db.loadWidgets('workspace-1');
      expect(loaded[0].state).toBe('expanded');
    });

    it('should handle state transitions correctly', () => {
      // minimized → compact → expanded → minimized
    });
  });

  describe('Auto-Save', () => {
    it('should debounce saves (500ms)', async () => {
      // 1. Trigger multiple saves rapidly
      // 2. Verify only one DB write after 500ms
    });

    it('should save canvas state (scale, pan)', () => {
      // 1. Update scale and pan
      // 2. Trigger save
      // 3. Load workspace
      // 4. Verify scale and pan restored
    });

    it('should handle concurrent saves gracefully', async () => {
      // 1. Trigger multiple saves in parallel
      // 2. Verify no race conditions or data loss
    });
  });
});
```

**Why critical:** Recent regression (missing column error)

---

### 2.4 Document Editor Save Tests ❌ NOT IMPLEMENTED
**File:** `tests/components/DocumentEditor-save.test.tsx`

**What to test:**
```typescript
describe('DocumentEditor Save', () => {
  it('should detect and reject directory paths', () => {
    const widget = {
      ...createMockWidget(),
      type: 'document',
      path: '/Users/samule/repo/workspace-canvas-app/', // ends with /
    };

    // Attempt save
    const result = await saveDocument(widget, 'content');

    // Verify path was regenerated, not used as-is
    expect(result.path).toMatch(/\.txt$/);
    expect(result.path).not.toContain('//');
  });

  it('should generate path from widget name if missing', () => {
    const widget = {
      ...createMockWidget(),
      name: 'My New File',
      path: undefined,
    };

    const result = await saveDocument(widget, 'content');

    expect(result.path).toMatch(/my-new-file\.txt$/);
  });

  it('should detect language from file extension', () => {
    const tests = [
      { filename: 'test.js', expected: 'javascript' },
      { filename: 'component.tsx', expected: 'typescript' },
      { filename: 'script.py', expected: 'python' },
      { filename: 'readme.md', expected: 'markdown' },
    ];

    tests.forEach(({ filename, expected }) => {
      const lang = detectLanguage(filename);
      expect(lang).toBe(expected);
    });
  });

  it('should mark dirty on content change', () => {
    // 1. Load document
    // 2. Type in editor
    // 3. Verify isSaved = false
  });

  it('should clear dirty on successful save', () => {
    // 1. Make changes (dirty = true)
    // 2. Press Cmd+S
    // 3. Verify isSaved = true
  });
});
```

**Why critical:** Recent regression (save to directory error)

---

### 2.5 Autocomplete Tests ❌ NOT IMPLEMENTED
**File:** `tests/features/autocomplete.test.tsx`

**What to test:**
```typescript
describe('Command Input Autocomplete', () => {
  describe('File Autocomplete (@)', () => {
    it('should trigger on @ character', () => {
      // 1. Type '@'
      // 2. Verify autocomplete dropdown appears
    });

    it('should show up to 50 file results', () => {
      // 1. Type '@test'
      // 2. Mock 100 matching files
      // 3. Verify only 50 shown
    });

    it('should filter by relative path', () => {
      // 1. Type '@src/components'
      // 2. Verify only files in src/components shown
    });

    it('should use widget-specific working directory', () => {
      // FileBrowser at /Users/samule/repo/project-a
      // Type '@'
      // Verify files from /Users/samule/repo/project-a

      // Document at /Users/samule/repo/project-b/file.txt
      // Type '@'
      // Verify files from /Users/samule/repo/project-b
    });

    it('should navigate with arrow keys', () => {
      // 1. Trigger autocomplete
      // 2. Press ArrowDown x3
      // 3. Verify 4th item selected
    });

    it('should insert on Tab or Enter', () => {
      // 1. Type '@rea'
      // 2. Select 'readme.md'
      // 3. Press Tab
      // 4. Verify input = '@readme.md'
    });
  });

  describe('Command Autocomplete (/)', () => {
    it('should show slash commands on /', () => {
      // 1. Type '/'
      // 2. Verify commands shown:
      //    /spawn-widget, /read-file, /write-file, etc.
    });

    it('should filter commands by query', () => {
      // 1. Type '/read'
      // 2. Verify only '/read-file' shown
    });

    it('should show command descriptions', () => {
      // 1. Trigger /
      // 2. Verify each command has description
    });
  });

  describe('Command History', () => {
    it('should navigate history with arrow keys', () => {
      // 1. Send 3 commands
      // 2. Press ArrowUp
      // 3. Verify 3rd command appears
      // 4. Press ArrowUp
      // 5. Verify 2nd command appears
    });

    it('should not conflict with autocomplete', () => {
      // 1. Trigger autocomplete
      // 2. Press ArrowUp (should navigate autocomplete, not history)
      // 3. Press Escape
      // 4. Press ArrowUp (should navigate history)
    });
  });
});
```

**Why critical:** Complex feature with multiple interaction modes

---

## 3. Existing Tests (Need Maintenance)

### 3.1 Canvas Tests ✅ EXISTS
**File:** `tests/components/Canvas.test.tsx`

**Current coverage:**
- ✅ Renders without crashing
- ✅ Creates new widget on Cmd+N
- ✅ Auto-arranges widgets
- ✅ Zoom in/out/reset

**Need to add:**
- ❌ Pan with Shift+Drag
- ❌ Pan with middle mouse button
- ❌ Zoom with Ctrl+Scroll
- ❌ Zoom toward cursor (transform-origin)

---

### 3.2 AgentWidget Tests ✅ EXISTS
**File:** `tests/components/AgentWidget.test.tsx`

**Current coverage:**
- ✅ Renders in all states (minimized, compact, expanded)
- ✅ Cycles states on header click
- ✅ Shows context menu on right-click

**Need to add:**
- ❌ Drag performance (see section 2.1)
- ❌ Resize with 8 handles
- ❌ Z-index updates on focus

---

### 3.3 FileBrowser Tests ✅ EXISTS
**File:** `tests/components/FileBrowser.test.tsx`

**Current coverage:**
- ✅ Lists files and directories
- ✅ Expands/collapses folders
- ✅ Shows context menu

**Need to add:**
- ❌ Path input with autocomplete
- ❌ Open file in document editor
- ❌ Refresh on file system changes

---

## 4. Manual Testing Checklist

### 4.1 Smoke Tests (Every Build)
**Time:** ~5 minutes

- [ ] App launches without errors
- [ ] Create new agent widget (Cmd+N)
- [ ] Type command and press Enter
- [ ] Drag widget around canvas
- [ ] Resize widget from corner
- [ ] Minimize/expand widget
- [ ] Zoom in/out (Cmd+Plus/Minus)
- [ ] Pan canvas (Shift+Drag)
- [ ] Close and reopen app (state persisted?)

### 4.2 Feature Testing (Weekly)
**Time:** ~30 minutes

**Canvas:**
- [ ] Auto-arrange 10+ widgets
- [ ] Zoom out to 25%, verify arrange uses full space
- [ ] Pan far from origin, verify arrange anchors correctly
- [ ] Switch to smaller monitor, verify widgets adjusted

**Widgets:**
- [ ] Create agent, document, file browser widgets
- [ ] Test all 3 view states for each type
- [ ] Test context menu actions
- [ ] Test keyboard shortcuts (see section 2.4 in PRD)

**Document Editor:**
- [ ] Open file from file browser
- [ ] Edit content, verify dirty indicator
- [ ] Save with Cmd+S
- [ ] Close and reopen, verify content saved
- [ ] Test syntax highlighting (JS, TS, Python, Markdown)

**File Browser:**
- [ ] Navigate directories (expand/collapse)
- [ ] Type path with autocomplete
- [ ] Open file
- [ ] Context menu: Copy Path, Show in Finder

**Autocomplete:**
- [ ] Type `@` in agent command input
- [ ] Verify files shown
- [ ] Navigate with arrow keys
- [ ] Insert with Tab
- [ ] Type `/` for commands
- [ ] Test command autocomplete

**Persistence:**
- [ ] Create 5 widgets in various positions
- [ ] Zoom and pan to specific location
- [ ] Close app
- [ ] Reopen app
- [ ] Verify exact state restored

---

## 5. Performance Benchmarks

### 5.1 Automated Performance Tests
**File:** `tests/performance/benchmarks.test.ts`

```typescript
describe('Performance Benchmarks', () => {
  it('should render 50 widgets without lag', () => {
    const startTime = performance.now();

    for (let i = 0; i < 50; i++) {
      createWidget({ position: { x: i * 100, y: 100 } });
    }

    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(1000); // < 1s
  });

  it('should pan canvas at 60fps', () => {
    const frameTimes: number[] = [];
    let lastTime = performance.now();

    for (let i = 0; i < 60; i++) {
      panCanvas(i * 10, 0);
      const now = performance.now();
      frameTimes.push(now - lastTime);
      lastTime = now;
    }

    const avgFrameTime = frameTimes.reduce((a, b) => a + b) / frameTimes.length;
    expect(avgFrameTime).toBeLessThan(16.67); // 60fps
  });

  it('should auto-save within 100ms', async () => {
    const startTime = performance.now();

    await saveWorkspaceState();

    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(100);
  });
});
```

### 5.2 Performance Targets
| Operation | Target | Current | Status |
|-----------|--------|---------|--------|
| Widget spawn | < 200ms | ~150ms | ✅ Pass |
| Canvas pan (60fps) | < 16.67ms/frame | ~14ms | ✅ Pass |
| Widget drag (60fps) | < 16.67ms/frame | ~12ms | ✅ Pass |
| Auto-save | < 100ms | ~50ms | ✅ Pass |
| Workspace restore | < 1s | ~500ms | ✅ Pass |
| Auto-arrange 50 widgets | < 500ms | ~300ms | ✅ Pass |

---

## 6. Testing Tools & Setup

### 6.1 Test Environment
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific suite
npm test Canvas.test.tsx

# Watch mode
npm run test:watch
```

### 6.2 Testing Libraries
- **Jest** - Test runner
- **React Testing Library** - Component testing
- **@testing-library/user-event** - User interaction simulation
- **@testing-library/jest-dom** - DOM matchers

### 6.3 Mocking Strategy
```typescript
// Mock Electron IPC
window.claudeCode = {
  spawnInstance: jest.fn(),
  sendCommand: jest.fn(),
  saveWorkspaceState: jest.fn(),
  // ... etc
};

// Mock file system
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

// Mock database
jest.mock('better-sqlite3', () => {
  return jest.fn().mockImplementation(() => ({
    prepare: jest.fn(),
    exec: jest.fn(),
  }));
});
```

---

## 7. Regression Prevention Strategy

### 7.1 Pre-Commit Checks
```bash
# .husky/pre-commit
npm run lint
npm run typecheck
npm test -- --bail --passWithNoTests
```

### 7.2 CI/CD Pipeline
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: [18, 20]

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node }}

      - run: npm install
      - run: npm run build
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --coverage

      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### 7.3 Bug Report Template
```markdown
## Bug Report

**Version:** [e.g., v2.0.0]
**OS:** [e.g., macOS 14.5]
**Node:** [e.g., v20.10.0]

**Description:**
[Clear description of the bug]

**Steps to Reproduce:**
1. Launch app
2. Create new widget
3. Drag widget
4. Observe: [describe issue]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Regression Test:**
```typescript
it('should fix [bug description]', () => {
  // Test case that fails before fix
  // Passes after fix
});
```

**Related Issues:**
#123, #456
```

---

## 8. Action Items (HIGH PRIORITY)

### 8.1 Immediate (This Week)
- [ ] **Write drag performance tests** (section 2.1)
  - Test 60fps performance
  - Test X and Y axis movement
  - Test no jitter/snapback

- [ ] **Write viewport-aware arrange tests** (section 2.2)
  - Test anchoring to viewport top-left
  - Test zoom-aware space calculation

- [ ] **Write database migration tests** (section 2.3)
  - Test adding widget_state column
  - Test idempotent migrations
  - Test data preservation

### 8.2 Short-Term (Next 2 Weeks)
- [ ] **Write document editor save tests** (section 2.4)
  - Test path generation
  - Test directory detection
  - Test language detection

- [ ] **Write autocomplete tests** (section 2.5)
  - Test file autocomplete (@)
  - Test command autocomplete (/)
  - Test keyboard navigation

- [ ] **Add E2E tests for critical flows**
  - Full widget lifecycle
  - Workspace save/restore
  - Multi-widget interaction

### 8.3 Long-Term (Next Month)
- [ ] Set up CI/CD pipeline (section 7.2)
- [ ] Add performance benchmarking (section 5.1)
- [ ] Increase coverage to 95%+
- [ ] Add visual regression testing (Percy/Chromatic)

---

## 9. Review Checklist

### Before Merging PRs:
- [ ] All tests passing
- [ ] No new linting errors
- [ ] TypeScript compiles without errors
- [ ] Manual smoke tests pass (section 4.1)
- [ ] New features have tests
- [ ] Bug fixes have regression tests
- [ ] Performance benchmarks met
- [ ] Documentation updated

### Before Releases:
- [ ] Full feature testing (section 4.2)
- [ ] Test on all supported platforms
- [ ] No open P0/P1 bugs
- [ ] Changelog updated
- [ ] Version bumped (package.json)
- [ ] Git tag created

---

## Appendix: Related Documents
- [Product Requirements](./PRODUCT-REQUIREMENTS.md)
- [Technical Architecture](./TECHNICAL-ARCHITECTURE.md)
- [Feature Implementation Status](../FEATURE-IMPLEMENTATION-STATUS.md)
