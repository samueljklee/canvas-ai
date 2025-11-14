/**
 * DatabaseService Unit Tests
 * Tests SQLite database operations with in-memory database
 */

import { DatabaseService } from '../../src/main/DatabaseService';
import { createWidget } from '../../src/utils/widgetFactory';
import Anthropic from '@anthropic-ai/sdk';

describe.skip('DatabaseService', () => {
  let db: DatabaseService;

  beforeEach(() => {
    // Use in-memory SQLite for fast, isolated tests
    // Pass a mock app object
    const mockApp = {
      getPath: () => '/tmp/test-canvas-ai',
    };
    (global as any).app = mockApp;
    db = new DatabaseService(':memory:');
  });

  afterEach(() => {
    if (db) db.close();
  });

  describe('Workspace Management', () => {
    it('should create a new workspace', () => {
      const workspace = db.createWorkspace('Test Workspace');

      expect(workspace.id).toBeDefined();
      expect(workspace.name).toBe('Test Workspace');
      expect(workspace.created_at).toBeDefined();
    });

    it('should get all workspaces', () => {
      db.createWorkspace('Workspace 1');
      db.createWorkspace('Workspace 2');

      const workspaces = db.getAllWorkspaces();

      expect(workspaces).toHaveLength(2);
      expect(workspaces[0].name).toBe('Workspace 1');
      expect(workspaces[1].name).toBe('Workspace 2');
    });

    it('should get workspace by id', () => {
      const created = db.createWorkspace('Test');
      const retrieved = db.getWorkspace(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should rename workspace', () => {
      const workspace = db.createWorkspace('Old Name');
      db.renameWorkspace(workspace.id, 'New Name');

      const updated = db.getWorkspace(workspace.id);
      expect(updated.name).toBe('New Name');
    });

    it('should delete workspace', () => {
      const workspace = db.createWorkspace('To Delete');
      db.deleteWorkspace(workspace.id);

      const retrieved = db.getWorkspace(workspace.id);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Widget Persistence', () => {
    let workspaceId: string;

    beforeEach(() => {
      const workspace = db.createWorkspace('Test Workspace');
      workspaceId = workspace.id;
    });

    it('should save and load widgets', () => {
      const widget = createWidget({ name: 'Test Widget' });
      db.saveWidget(workspaceId, widget);

      const widgets = db.loadWidgets(workspaceId);
      expect(widgets).toHaveLength(1);
      expect(widgets[0].name).toBe('Test Widget');
      expect(widgets[0].id).toBe(widget.id);
    });

    it('should update existing widget', () => {
      const widget = createWidget({ name: 'Original' });
      db.saveWidget(workspaceId, widget);

      widget.name = 'Updated';
      db.saveWidget(workspaceId, widget);

      const widgets = db.loadWidgets(workspaceId);
      expect(widgets).toHaveLength(1);
      expect(widgets[0].name).toBe('Updated');
    });

    it('should save widget with logs', () => {
      const widget = createWidget({ name: 'Test Widget' });
      widget.logs = [
        { level: 'info', message: 'Log 1', timestamp: Date.now() },
        { level: 'success', message: 'Log 2', timestamp: Date.now() + 1 },
      ];

      db.saveWidget(workspaceId, widget);

      const widgets = db.loadWidgets(workspaceId);
      expect(widgets[0].logs).toHaveLength(2);
      expect(widgets[0].logs[0].message).toBe('Log 1');
      expect(widgets[0].logs[1].message).toBe('Log 2');
    });

    it('should delete widget', () => {
      const widget = createWidget({ name: 'Test Widget' });
      db.saveWidget(workspaceId, widget);
      db.deleteWidget(widget.id);

      const widgets = db.loadWidgets(workspaceId);
      expect(widgets).toHaveLength(0);
    });

    it('should CASCADE delete widgets when workspace deleted', () => {
      const widget = createWidget({ name: 'Test Widget' });
      db.saveWidget(workspaceId, widget);

      db.deleteWorkspace(workspaceId);

      const widgets = db.loadWidgets(workspaceId);
      expect(widgets).toHaveLength(0);
    });
  });

  describe('Conversation Persistence', () => {
    let widgetId: string;

    beforeEach(() => {
      const workspace = db.createWorkspace('Test Workspace');
      const widget = createWidget({ name: 'Test Widget' });
      widgetId = widget.id;
      db.saveWidget(workspace.id, widget);
    });

    it('should save conversation history', () => {
      const messages: Anthropic.MessageParam[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ];

      db.saveConversation(widgetId, messages);

      const loaded = db.loadConversation(widgetId);
      expect(loaded).toHaveLength(2);
      expect(loaded[0].role).toBe('user');
      expect(loaded[0].content).toBe('Hello');
      expect(loaded[1].role).toBe('assistant');
      expect(loaded[1].content).toBe('Hi there!');
    });

    it('should replace existing conversation on save', () => {
      db.saveConversation(widgetId, [{ role: 'user', content: 'First' }]);
      db.saveConversation(widgetId, [{ role: 'user', content: 'Second' }]);

      const loaded = db.loadConversation(widgetId);
      expect(loaded).toHaveLength(1);
      expect(loaded[0].content).toBe('Second');
    });

    it('should filter out messages with null content', () => {
      const messages: any[] = [
        { role: 'user', content: 'Valid' },
        { role: 'user', content: null },
        { role: 'assistant', content: 'Also valid' },
      ];

      db.saveConversation(widgetId, messages);

      const loaded = db.loadConversation(widgetId);
      expect(loaded).toHaveLength(2);
      expect(loaded[0].content).toBe('Valid');
      expect(loaded[1].content).toBe('Also valid');
    });

    it('should filter out messages with empty string content', () => {
      const messages: any[] = [
        { role: 'user', content: 'Valid' },
        { role: 'user', content: '' },
        { role: 'user', content: '   ' },
      ];

      db.saveConversation(widgetId, messages);

      const loaded = db.loadConversation(widgetId);
      expect(loaded).toHaveLength(1);
    });

    it('should handle tool results in conversation', () => {
      const messages: Anthropic.MessageParam[] = [
        { role: 'user', content: 'Write a file' },
        {
          role: 'assistant',
          content: [
            { type: 'text', text: "I'll write it" },
            { type: 'tool_use', id: 'tool-1', name: 'write_file', input: { path: 'test.txt', content: 'test' } },
          ],
        },
        {
          role: 'user',
          content: [
            { type: 'tool_result', tool_use_id: 'tool-1', content: 'Success' },
          ],
        },
      ];

      db.saveConversation(widgetId, messages);

      const loaded = db.loadConversation(widgetId);
      expect(loaded).toHaveLength(3);
      expect(Array.isArray(loaded[1].content)).toBe(true);
      expect(Array.isArray(loaded[2].content)).toBe(true);
    });

    it('should filter out tool results with null content', () => {
      const messages: any[] = [
        {
          role: 'user',
          content: [
            { type: 'tool_result', tool_use_id: 'tool-1', content: 'Valid' },
            { type: 'tool_result', tool_use_id: 'tool-2', content: null },
          ],
        },
      ];

      db.saveConversation(widgetId, messages);

      const loaded = db.loadConversation(widgetId);
      expect(loaded).toHaveLength(1);
      expect(Array.isArray(loaded[0].content)).toBe(true);
      expect((loaded[0].content as any[]).length).toBe(1);
    });

    it('should CASCADE delete conversations when widget deleted', () => {
      db.saveConversation(widgetId, [{ role: 'user', content: 'Test' }]);
      db.deleteWidget(widgetId);

      const loaded = db.loadConversation(widgetId);
      expect(loaded).toHaveLength(0);
    });
  });

  describe('Log Persistence', () => {
    let widgetId: string;

    beforeEach(() => {
      const workspace = db.createWorkspace('Test Workspace');
      const widget = createWidget({ name: 'Test Widget' });
      widgetId = widget.id;
      db.saveWidget(workspace.id, widget);
    });

    it('should save and load logs', () => {
      const logs = [
        { level: 'info', message: 'Log 1', timestamp: 1000 },
        { level: 'success', message: 'Log 2', timestamp: 2000 },
        { level: 'error', message: 'Log 3', timestamp: 3000 },
      ];

      db.saveLogs(widgetId, logs);

      const loaded = db.loadLogs(widgetId);
      expect(loaded).toHaveLength(3);
      expect(loaded[0].message).toBe('Log 1');
      expect(loaded[1].message).toBe('Log 2');
      expect(loaded[2].message).toBe('Log 3');
    });

    it('should load logs in chronological order', () => {
      const logs = [
        { level: 'info', message: 'Third', timestamp: 3000 },
        { level: 'info', message: 'First', timestamp: 1000 },
        { level: 'info', message: 'Second', timestamp: 2000 },
      ];

      db.saveLogs(widgetId, logs);

      const loaded = db.loadLogs(widgetId);
      expect(loaded[0].message).toBe('First');
      expect(loaded[1].message).toBe('Second');
      expect(loaded[2].message).toBe('Third');
    });

    it('should replace existing logs on save', () => {
      db.saveLogs(widgetId, [{ level: 'info', message: 'First', timestamp: 1000 }]);
      db.saveLogs(widgetId, [{ level: 'info', message: 'Second', timestamp: 2000 }]);

      const loaded = db.loadLogs(widgetId);
      expect(loaded).toHaveLength(1);
      expect(loaded[0].message).toBe('Second');
    });

    it('should CASCADE delete logs when widget deleted', () => {
      db.saveLogs(widgetId, [{ level: 'info', message: 'Test', timestamp: 1000 }]);
      db.deleteWidget(widgetId);

      const loaded = db.loadLogs(widgetId);
      expect(loaded).toHaveLength(0);
    });
  });

  describe('Command History', () => {
    let workspaceId: string;
    let widgetId: string;

    beforeEach(() => {
      const workspace = db.createWorkspace('Test Workspace');
      workspaceId = workspace.id;
      const widget = createWidget({ name: 'Test Widget' });
      widgetId = widget.id;
      db.saveWidget(workspaceId, widget);
    });

    it('should save command history', () => {
      db.saveCommand(widgetId, workspaceId, 'echo hello');
      db.saveCommand(widgetId, workspaceId, 'ls -la');

      const history = db.getWidgetCommandHistory(widgetId);
      expect(history).toHaveLength(2);
      expect(history[0]).toBe('ls -la'); // Most recent first
      expect(history[1]).toBe('echo hello');
    });

    it('should load widget-specific command history', () => {
      const widget2 = createWidget({ name: 'Widget 2' });
      db.saveWidget(workspaceId, widget2);

      db.saveCommand(widgetId, workspaceId, 'widget 1 command');
      db.saveCommand(widget2.id, workspaceId, 'widget 2 command');

      const history = db.getWidgetCommandHistory(widgetId);
      expect(history).toHaveLength(1);
      expect(history[0]).toBe('widget 1 command');
    });

    it('should search workspace-wide commands', () => {
      const widget2 = createWidget({ name: 'Widget 2' });
      db.saveWidget(workspaceId, widget2);

      db.saveCommand(widgetId, workspaceId, 'echo hello');
      db.saveCommand(widget2.id, workspaceId, 'echo world');
      db.saveCommand(widget2.id, workspaceId, 'ls -la');

      const results = db.searchCommands(workspaceId, 'echo');
      expect(results).toHaveLength(2);
      expect(results).toContain('echo hello');
      expect(results).toContain('echo world');
    });

    it('should limit command history results', () => {
      for (let i = 0; i < 100; i++) {
        db.saveCommand(widgetId, workspaceId, `command ${i}`);
      }

      const history = db.getWidgetCommandHistory(widgetId, 10);
      expect(history).toHaveLength(10);
    });

    it('should CASCADE delete commands when widget deleted', () => {
      db.saveCommand(widgetId, workspaceId, 'test command');
      db.deleteWidget(widgetId);

      const history = db.getWidgetCommandHistory(widgetId);
      expect(history).toHaveLength(0);
    });
  });
});
