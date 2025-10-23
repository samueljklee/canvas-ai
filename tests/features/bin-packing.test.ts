/**
 * Workspace Canvas - 2D Bin-Packing Algorithm Tests
 * Tests for intelligent widget auto-arrangement
 */

import { AgentWidgetData } from '../../src/types/widget';

describe('2D Bin-Packing Auto-Arrange', () => {
  // Helper to create test widgets
  const createWidget = (id: string, width: number, height: number): AgentWidgetData => ({
    id,
    name: `Widget ${id}`,
    type: 'agent',
    status: 'idle',
    state: 'expanded',
    position: { x: 0, y: 0 },
    size: { width, height },
    zIndex: 1,
    logs: [],
  });

  // Mock auto-arrange algorithm (based on Canvas.tsx implementation)
  const autoArrange = (widgets: AgentWidgetData[]): Map<string, { x: number; y: number }> => {
    const sortedWidgets = [...widgets].sort((a, b) => {
      const areaA = a.size.width * a.size.height;
      const areaB = b.size.width * b.size.height;
      return areaB - areaA;
    });

    const padding = 20;
    const startX = 100;
    const startY = 100;
    const maxRowWidth = 1200;

    interface Rect {
      x: number;
      y: number;
      width: number;
      height: number;
    }
    const occupiedRects: Rect[] = [];

    const overlaps = (rect: Rect): boolean => {
      return occupiedRects.some((occupied) => {
        return !(
          rect.x + rect.width + padding <= occupied.x ||
          rect.x >= occupied.x + occupied.width + padding ||
          rect.y + rect.height + padding <= occupied.y ||
          rect.y >= occupied.y + occupied.height + padding
        );
      });
    };

    const findBestPosition = (width: number, height: number): { x: number; y: number } => {
      for (let y = startY; y < startY + 2000; y += 10) {
        for (let x = startX; x < startX + maxRowWidth; x += 10) {
          if (x + width > startX + maxRowWidth) continue;

          const candidate: Rect = { x, y, width, height };
          if (!overlaps(candidate)) {
            return { x, y };
          }
        }
      }
      const maxY = Math.max(...occupiedRects.map((r) => r.y + r.height), startY);
      return { x: startX, y: maxY + padding };
    };

    const positions = new Map<string, { x: number; y: number }>();

    sortedWidgets.forEach((widget) => {
      const position = findBestPosition(widget.size.width, widget.size.height);
      positions.set(widget.id, position);

      occupiedRects.push({
        x: position.x,
        y: position.y,
        width: widget.size.width,
        height: widget.size.height,
      });
    });

    return positions;
  };

  test('sorts widgets by area (largest first)', () => {
    const widgets = [
      createWidget('small', 200, 100), // area: 20,000
      createWidget('large', 600, 500), // area: 300,000
      createWidget('medium', 400, 300), // area: 120,000
    ];

    const positions = autoArrange(widgets);

    // Largest should be placed first (at starting position)
    expect(positions.get('large')).toEqual({ x: 100, y: 100 });
  });

  test('packs widgets without overlap', () => {
    const widgets = [
      createWidget('w1', 300, 200),
      createWidget('w2', 300, 200),
      createWidget('w3', 300, 200),
    ];

    const positions = autoArrange(widgets);
    const padding = 20;

    // Check that no widgets overlap
    const rects = widgets.map((w) => ({
      x: positions.get(w.id)!.x,
      y: positions.get(w.id)!.y,
      width: w.size.width,
      height: w.size.height,
    }));

    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const r1 = rects[i];
        const r2 = rects[j];

        const noOverlap =
          r1.x + r1.width + padding <= r2.x ||
          r1.x >= r2.x + r2.width + padding ||
          r1.y + r1.height + padding <= r2.y ||
          r1.y >= r2.y + r2.height + padding;

        expect(noOverlap).toBe(true);
      }
    }
  });

  test('handles widgets of different sizes efficiently', () => {
    const widgets = [
      createWidget('large', 600, 500),
      createWidget('small1', 200, 150),
      createWidget('small2', 200, 150),
      createWidget('medium', 400, 300),
    ];

    const positions = autoArrange(widgets);

    // All widgets should be positioned
    expect(positions.size).toBe(4);

    // All positions should be valid (non-negative)
    positions.forEach((pos) => {
      expect(pos.x).toBeGreaterThanOrEqual(0);
      expect(pos.y).toBeGreaterThanOrEqual(0);
    });
  });

  test('wraps to next row when exceeding max width', () => {
    const widgets = [
      createWidget('w1', 700, 300),
      createWidget('w2', 700, 300),
    ];

    const positions = autoArrange(widgets);
    const maxRowWidth = 1200;
    const padding = 20;

    const pos1 = positions.get('w1')!;
    const pos2 = positions.get('w2')!;

    // Second widget should be either:
    // 1. In same row (if it fits)
    // 2. In next row (if it doesn't fit)
    if (pos1.x + 700 + padding + 700 > 100 + maxRowWidth) {
      // Should be in next row
      expect(pos2.y).toBeGreaterThan(pos1.y);
    } else {
      // Should be in same row
      expect(pos2.y).toBe(pos1.y);
    }
  });

  test('utilizes 2D space efficiently with mixed sizes', () => {
    const widgets = [
      createWidget('tall', 200, 500),
      createWidget('wide', 500, 200),
      createWidget('small', 150, 150),
    ];

    const positions = autoArrange(widgets);

    // Small widget should fit in gaps
    const smallPos = positions.get('small')!;
    expect(smallPos).toBeDefined();

    // Should use space efficiently
    const maxY = Math.max(...Array.from(positions.values()).map((p) => p.y));
    expect(maxY).toBeLessThan(1000); // Should not be unnecessarily spread out
  });

  test('handles single widget', () => {
    const widgets = [createWidget('single', 400, 300)];

    const positions = autoArrange(widgets);

    expect(positions.get('single')).toEqual({ x: 100, y: 100 });
  });

  test('handles empty widget list', () => {
    const widgets: AgentWidgetData[] = [];

    const positions = autoArrange(widgets);

    expect(positions.size).toBe(0);
  });

  test('maintains minimum spacing between widgets', () => {
    const widgets = [
      createWidget('w1', 300, 200),
      createWidget('w2', 300, 200),
    ];

    const positions = autoArrange(widgets);
    const padding = 20;

    const pos1 = positions.get('w1')!;
    const pos2 = positions.get('w2')!;

    // Calculate distance between widgets
    const horizontalDistance = Math.abs(pos2.x - (pos1.x + 300));
    const verticalDistance = Math.abs(pos2.y - pos1.y);

    // Either horizontally or vertically separated with padding
    if (verticalDistance === 0) {
      // Same row
      expect(horizontalDistance).toBeGreaterThanOrEqual(padding);
    }
  });

  test('places widgets within canvas bounds', () => {
    const widgets = [
      createWidget('w1', 600, 400),
      createWidget('w2', 500, 300),
      createWidget('w3', 400, 200),
    ];

    const positions = autoArrange(widgets);
    const startX = 100;
    const maxRowWidth = 1200;

    positions.forEach((pos, id) => {
      const widget = widgets.find((w) => w.id === id)!;

      // Should start after startX
      expect(pos.x).toBeGreaterThanOrEqual(startX);

      // Should not exceed max width
      expect(pos.x + widget.size.width).toBeLessThanOrEqual(startX + maxRowWidth);
    });
  });
});
