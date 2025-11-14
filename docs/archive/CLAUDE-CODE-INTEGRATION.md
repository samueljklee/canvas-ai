# Workspace Canvas - Claude Code Integration Architecture

## 🎯 Critical Requirement

**Each widget = One running Claude Code instance**

The canvas is a visual orchestrator where each `AgentWidget` represents and controls a real, running Claude Code process.

## 🏗️ Current Status

### ✅ Completed (MVP UI)
- Canvas with drag/drop/resize
- Widget states (Minimized/Compact/Expanded)
- Mock IPC and log streaming
- Command input UI
- All visual interactions working

### 🔄 Next Phase: Real Claude Code Integration

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Workspace Canvas (Electron Main Process)                   │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Claude Code  │  │ Claude Code  │  │ Claude Code  │    │
│  │ Instance 1   │  │ Instance 2   │  │ Instance 3   │    │
│  │ (Process)    │  │ (Process)    │  │ (Process)    │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                  │                  │             │
│         └──────────────────┴──────────────────┘             │
│                            │                                │
│                    ┌───────▼────────┐                       │
│                    │  IPC Manager   │                       │
│                    │  (Orchestrator)│                       │
│                    └───────┬────────┘                       │
│                            │                                │
└────────────────────────────┼────────────────────────────────┘
                             │
                    ┌────────▼─────────┐
                    │  Electron        │
                    │  Renderer (UI)   │
                    │                  │
                    │  ┌────────────┐  │
                    │  │  Widget 1  │  │
                    │  ├────────────┤  │
                    │  │  Widget 2  │  │
                    │  ├────────────┤  │
                    │  │  Widget 3  │  │
                    │  └────────────┘  │
                    └──────────────────┘
```

## 📋 Implementation Plan

### Phase 1: Process Management (Main Process)

#### 1.1 Claude Code Process Spawner
```typescript
// src/main/ClaudeCodeManager.ts

class ClaudeCodeManager {
  private instances: Map<string, ClaudeCodeInstance>;

  async spawn(config: InstanceConfig): Promise<string> {
    // Spawn: npx claude-code
    // Return instance ID
  }

  async kill(instanceId: string): Promise<void> {
    // Terminate process
  }

  async sendCommand(instanceId: string, command: string): Promise<void> {
    // Send to stdin
  }

  onOutput(instanceId: string, callback: (data: string) => void): void {
    // Listen to stdout/stderr
  }
}
```

#### 1.2 Instance Configuration
```typescript
interface InstanceConfig {
  name: string;
  workingDirectory?: string;
  environment?: Record<string, string>;
  initialCommand?: string;
}

interface ClaudeCodeInstance {
  id: string;
  pid: number;
  process: ChildProcess;
  config: InstanceConfig;
  status: 'starting' | 'running' | 'paused' | 'stopped' | 'error';
  createdAt: number;
}
```

### Phase 2: IPC Communication Layer

#### 2.1 Main Process IPC Handlers
```typescript
// src/main/ipc-handlers.ts

ipcMain.handle('widget:spawn', async (event, config: InstanceConfig) => {
  const instanceId = await claudeCodeManager.spawn(config);
  return instanceId;
});

ipcMain.handle('widget:kill', async (event, instanceId: string) => {
  await claudeCodeManager.kill(instanceId);
});

ipcMain.handle('widget:send-command', async (event, instanceId: string, command: string) => {
  await claudeCodeManager.sendCommand(instanceId, command);
});

ipcMain.on('widget:subscribe-output', (event, instanceId: string) => {
  claudeCodeManager.onOutput(instanceId, (data) => {
    event.sender.send(`widget:output:${instanceId}`, data);
  });
});
```

#### 2.2 Renderer IPC Client
```typescript
// src/renderer/services/ClaudeCodeService.ts

class ClaudeCodeService {
  async spawnInstance(name: string, config?: Partial<InstanceConfig>): Promise<string> {
    const instanceId = await ipcRenderer.invoke('widget:spawn', { name, ...config });
    return instanceId;
  }

  async killInstance(instanceId: string): Promise<void> {
    await ipcRenderer.invoke('widget:kill', instanceId);
  }

  async sendCommand(instanceId: string, command: string): Promise<void> {
    await ipcRenderer.invoke('widget:send-command', instanceId, command);
  }

  subscribeToOutput(instanceId: string, callback: (data: string) => void): () => void {
    const listener = (_event: any, data: string) => callback(data);
    ipcRenderer.on(`widget:output:${instanceId}`, listener);

    // Cleanup function
    return () => {
      ipcRenderer.removeListener(`widget:output:${instanceId}`, listener);
    };
  }
}
```

### Phase 3: Widget Integration

#### 3.1 Update Widget Data Model
```typescript
// Add to src/types/widget.ts

interface AgentWidgetData {
  // ... existing fields ...

  // NEW: Claude Code instance metadata
  claudeCodeInstanceId: string;
  pid?: number;
  workingDirectory?: string;
  isProcessRunning: boolean;
}
```

#### 3.2 Widget Lifecycle Hooks
```typescript
// In AgentWidget component

useEffect(() => {
  // Spawn Claude Code instance when widget mounts
  const spawnInstance = async () => {
    const instanceId = await claudeCodeService.spawnInstance(widget.name, {
      workingDirectory: widget.workingDirectory,
    });

    onUpdate(widget.id, {
      claudeCodeInstanceId: instanceId,
      isProcessRunning: true,
    });

    // Subscribe to output
    const unsubscribe = claudeCodeService.subscribeToOutput(instanceId, (data) => {
      // Add to logs
      const logEntry: LogEntry = {
        timestamp: Date.now(),
        level: 'info',
        message: data,
      };

      onUpdate(widget.id, {
        logs: [...widget.logs, logEntry],
      });
    });

    return () => {
      unsubscribe();
    };
  };

  spawnInstance();
}, []);

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (widget.claudeCodeInstanceId) {
      claudeCodeService.killInstance(widget.claudeCodeInstanceId);
    }
  };
}, [widget.claudeCodeInstanceId]);
```

#### 3.3 Real Command Execution
```typescript
// Update handleCommandSubmit in WidgetBody

const handleCommandSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!command.trim() || !widget.claudeCodeInstanceId) return;

  // Send to actual Claude Code instance
  await claudeCodeService.sendCommand(widget.claudeCodeInstanceId, command);

  // Add to logs
  addLogToWidget(widget, 'info', `> ${command}`);

  setCommand('');
};
```

### Phase 4: Context Menu Actions (Real Implementation)

```typescript
// Update handleContextMenuAction in AgentWidget

const handleContextMenuAction = async (action: string) => {
  setContextMenuPos(null);

  switch (action) {
    case 'stop':
      // Send SIGTERM to pause execution
      await claudeCodeService.sendSignal(widget.claudeCodeInstanceId, 'SIGSTOP');
      onUpdate(widget.id, { status: 'paused' });
      break;

    case 'resume':
      // Resume execution
      await claudeCodeService.sendSignal(widget.claudeCodeInstanceId, 'SIGCONT');
      onUpdate(widget.id, { status: 'running' });
      break;

    case 'worktree':
      // Open working directory in system file explorer
      await shell.openPath(widget.workingDirectory || process.cwd());
      break;

    case 'terminate':
      // Kill the process
      await claudeCodeService.killInstance(widget.claudeCodeInstanceId);
      onUpdate(widget.id, { status: 'stopped', isProcessRunning: false });
      break;
  }
};
```

## 🚀 Implementation Steps

### Step 1: Set Up Electron Main Process
1. Create `src/main/index.ts` - Electron main entry
2. Create `src/main/ClaudeCodeManager.ts` - Process manager
3. Create `src/main/ipc-handlers.ts` - IPC communication
4. Update `package.json` with Electron scripts

### Step 2: Create Service Layer
1. Create `src/renderer/services/ClaudeCodeService.ts`
2. Update `src/types/widget.ts` with instance metadata
3. Create preload script for secure IPC

### Step 3: Integrate with Widgets
1. Update `AgentWidget` lifecycle for process spawning
2. Update `WidgetBody` command submission
3. Update `ContextMenu` actions
4. Update `useCanvasState` for process tracking

### Step 4: Status Monitoring
1. Add process health checks
2. Auto-restart on crash (optional)
3. Memory/CPU monitoring per instance
4. Connection status indicators

## 📦 Dependencies to Add

```json
{
  "dependencies": {
    "electron": "^28.0.0",
    "electron-store": "^8.1.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "electron-builder": "^24.0.0",
    "concurrently": "^8.2.0"
  }
}
```

## 🔒 Security Considerations

1. **Preload Script**: Use context isolation for IPC
2. **Process Sandboxing**: Run Claude Code instances with limited permissions
3. **Command Validation**: Sanitize commands before sending to processes
4. **Resource Limits**: Set max memory/CPU per instance
5. **Path Validation**: Verify working directories exist and are accessible

## 🎯 User Workflows

### Workflow 1: Spawn New Agent
```
1. Click "Add Widget" button
2. Enter agent name and working directory
3. Widget appears on canvas
4. Claude Code instance spawns automatically
5. Terminal output streams to log viewer
6. Ready to receive commands
```

### Workflow 2: Execute Commands
```
1. Expand widget to see CLI
2. Type command in input box
3. Press Enter or click "Send"
4. Command sent to Claude Code instance
5. Output streams back to log viewer in real-time
```

### Workflow 3: Stop/Resume Agent
```
1. Right-click widget
2. Select "Stop" from context menu
3. Process pauses (SIGSTOP)
4. Right-click again, select "Resume"
5. Process continues (SIGCONT)
```

### Workflow 4: Open Worktree
```
1. Right-click widget
2. Select "Open Worktree"
3. System file explorer opens working directory
4. Can edit files, view outputs, etc.
```

## 🧪 Testing Real Integration

### Manual Testing Checklist
- [ ] Spawn single Claude Code instance
- [ ] Verify PID and process status
- [ ] Send simple command (e.g., "list files")
- [ ] Verify output appears in log viewer
- [ ] Test Stop/Resume functionality
- [ ] Test process cleanup on widget close
- [ ] Test multiple concurrent instances (3-5)
- [ ] Verify memory doesn't leak
- [ ] Test crash recovery

### Integration Tests
```typescript
describe('Claude Code Integration', () => {
  it('spawns process and returns instance ID', async () => {
    const service = new ClaudeCodeService();
    const instanceId = await service.spawnInstance('Test Agent');
    expect(instanceId).toBeDefined();

    // Cleanup
    await service.killInstance(instanceId);
  });

  it('sends command and receives output', async () => {
    const service = new ClaudeCodeService();
    const instanceId = await service.spawnInstance('Test Agent');

    const output = await new Promise((resolve) => {
      const unsubscribe = service.subscribeToOutput(instanceId, (data) => {
        resolve(data);
        unsubscribe();
      });

      service.sendCommand(instanceId, 'echo "test"');
    });

    expect(output).toContain('test');

    // Cleanup
    await service.killInstance(instanceId);
  });
});
```

## 📝 Next Steps

1. **Convert to Electron App**: Update build configuration
2. **Implement Process Manager**: Core spawning logic
3. **Wire Up IPC**: Connect UI to real processes
4. **Test with Real Claude Code**: Validate integration
5. **Add Error Handling**: Graceful failures and recovery
6. **Performance Tuning**: Optimize for 10+ concurrent instances

## 🎨 Current MVP vs. Full Integration

| Feature | MVP (Current) | Full Integration |
|---------|---------------|------------------|
| Widget UI | ✅ Working | ✅ Reuse as-is |
| Drag/Drop | ✅ Working | ✅ Keep |
| States | ✅ Working | ✅ Keep |
| Logs | 🔄 Mock data | ✅ Real stdout/stderr |
| Commands | 🔄 Console.log | ✅ Real stdin |
| Stop/Resume | 🔄 Stubs | ✅ Process signals |
| Worktree | 🔄 Stub | ✅ Open in explorer |

---

**Current Status**: MVP UI Complete ✅
**Next Milestone**: Electron + Real Process Integration 🚀
**Estimated Effort**: 2-3 days for full integration
