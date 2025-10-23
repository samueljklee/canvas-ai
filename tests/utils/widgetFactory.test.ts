/**
 * Widget Factory Tests
 */

import {
  createWidget,
  generateGridLayout,
  addLogToWidget,
  clearWidgetLogs,
  updateWidgetStatus,
} from '../../src/utils/widgetFactory';

describe('widgetFactory', () => {
  describe('createWidget', () => {
    it('creates widget with default values', () => {
      const widget = createWidget({ name: 'Test Agent' });

      expect(widget.name).toBe('Test Agent');
      expect(widget.status).toBe('idle');
      expect(widget.state).toBe('expanded');
      expect(widget.position).toEqual({ x: 100, y: 100 });
      expect(widget.logs).toHaveLength(1);
      expect(widget.logs[0].message).toContain('initialized');
    });

    it('creates widget with custom status', () => {
      const widget = createWidget({ name: 'Test Agent', status: 'running' });
      expect(widget.status).toBe('running');
    });

    it('creates widget with custom position', () => {
      const widget = createWidget({
        name: 'Test Agent',
        position: { x: 200, y: 300 },
      });

      expect(widget.position).toEqual({ x: 200, y: 300 });
    });

    it('generates unique IDs', () => {
      const widget1 = createWidget({ name: 'Agent 1' });
      const widget2 = createWidget({ name: 'Agent 2' });

      expect(widget1.id).not.toBe(widget2.id);
    });
  });

  describe('generateGridLayout', () => {
    it('generates layout for single widget', () => {
      const positions = generateGridLayout(1);
      expect(positions).toHaveLength(1);
      expect(positions[0]).toEqual({ x: 50, y: 80 });
    });

    it('generates 2x2 grid for 4 widgets', () => {
      const positions = generateGridLayout(4);
      expect(positions).toHaveLength(4);

      // First row
      expect(positions[0]).toEqual({ x: 50, y: 80 });
      expect(positions[1]).toEqual({ x: 400, y: 80 }); // 50 + 350

      // Second row
      expect(positions[2]).toEqual({ x: 50, y: 300 }); // 80 + 220
      expect(positions[3]).toEqual({ x: 400, y: 300 });
    });

    it('generates layout with custom starting position', () => {
      const positions = generateGridLayout(2, 100, 200);
      expect(positions[0]).toEqual({ x: 100, y: 200 });
    });

    it('generates layout with custom spacing', () => {
      const positions = generateGridLayout(2, 50, 80, 500, 300);
      expect(positions[0]).toEqual({ x: 50, y: 80 });
      expect(positions[1]).toEqual({ x: 550, y: 80 }); // 50 + 500
    });

    it('prevents widget overlap with proper spacing', () => {
      const positions = generateGridLayout(4);

      // Check that widgets have enough space (350px horizontal, 220px vertical)
      const dx = positions[1].x - positions[0].x;
      const dy = positions[2].y - positions[0].y;

      expect(dx).toBeGreaterThanOrEqual(300); // Enough for compact width (300px)
      expect(dy).toBeGreaterThanOrEqual(150); // Enough for compact height (150px)
    });
  });

  describe('addLogToWidget', () => {
    it('adds log entry to widget', () => {
      const widget = createWidget({ name: 'Test Agent' });
      const initialLogCount = widget.logs.length;

      const updated = addLogToWidget(widget, 'info', 'Test message');

      expect(updated.logs).toHaveLength(initialLogCount + 1);
      expect(updated.logs[updated.logs.length - 1]).toMatchObject({
        level: 'info',
        message: 'Test message',
      });
    });

    it('preserves existing logs', () => {
      const widget = createWidget({ name: 'Test Agent' });
      const firstMessage = widget.logs[0].message;

      const updated = addLogToWidget(widget, 'warn', 'Warning message');

      expect(updated.logs[0].message).toBe(firstMessage);
      expect(updated.logs[1].message).toBe('Warning message');
    });

    it('adds timestamp to log entry', () => {
      const widget = createWidget({ name: 'Test Agent' });
      const updated = addLogToWidget(widget, 'success', 'Success message');
      const lastLog = updated.logs[updated.logs.length - 1];

      expect(lastLog.timestamp).toBeDefined();
      expect(typeof lastLog.timestamp).toBe('number');
    });
  });

  describe('clearWidgetLogs', () => {
    it('clears all logs from widget', () => {
      const widget = createWidget({ name: 'Test Agent' });
      const withLogs = addLogToWidget(widget, 'info', 'Log 1');
      const withMoreLogs = addLogToWidget(withLogs, 'info', 'Log 2');

      const cleared = clearWidgetLogs(withMoreLogs);

      expect(cleared.logs).toHaveLength(0);
    });

    it('preserves other widget properties', () => {
      const widget = createWidget({ name: 'Test Agent', status: 'running' });
      const cleared = clearWidgetLogs(widget);

      expect(cleared.name).toBe('Test Agent');
      expect(cleared.status).toBe('running');
      expect(cleared.state).toBe('expanded');
    });
  });

  describe('updateWidgetStatus', () => {
    it('updates widget status', () => {
      const widget = createWidget({ name: 'Test Agent', status: 'idle' });
      const updated = updateWidgetStatus(widget, 'running');

      expect(updated.status).toBe('running');
    });

    it('adds status change log entry', () => {
      const widget = createWidget({ name: 'Test Agent' });
      const initialLogCount = widget.logs.length;

      const updated = updateWidgetStatus(widget, 'running');

      expect(updated.logs).toHaveLength(initialLogCount + 1);
      expect(updated.logs[updated.logs.length - 1].message).toContain('Status changed to: running');
    });

    it('uses error level for error status', () => {
      const widget = createWidget({ name: 'Test Agent' });
      const updated = updateWidgetStatus(widget, 'error');

      const lastLog = updated.logs[updated.logs.length - 1];
      expect(lastLog.level).toBe('error');
    });

    it('uses info level for non-error status', () => {
      const widget = createWidget({ name: 'Test Agent' });
      const updated = updateWidgetStatus(widget, 'running');

      const lastLog = updated.logs[updated.logs.length - 1];
      expect(lastLog.level).toBe('info');
    });
  });
});
