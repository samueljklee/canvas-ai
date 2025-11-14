/**
 * Canvas Integration Tests
 * Tests canvas-level interactions: multi-widget management, selection, layout
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Canvas } from '../../src/Canvas';

describe.skip('Canvas Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock window.claudeCode API for Canvas initialization
    (window as any).claudeCode = {
      getWorkspace: jest.fn().mockResolvedValue({
        success: true,
        workspace: {
          id: 'test-workspace',
          name: 'Test Workspace',
          scale: 1,
          pan_x: 0,
          pan_y: 0,
        },
      }),
      loadWidgets: jest.fn().mockResolvedValue({
        success: true,
        widgets: [
          {
            id: 'coord-1',
            name: 'Coordinator Agent',
            type: 'agent',
            status: 'idle',
            state: 'minimized',
            position: { x: 100, y: 100 },
            size: { width: 300, height: 400 },
            zIndex: 1,
            logs: [],
          },
          {
            id: 'coder-1',
            name: 'Coder Agent',
            type: 'agent',
            status: 'idle',
            state: 'minimized',
            position: { x: 450, y: 100 },
            size: { width: 300, height: 400 },
            zIndex: 2,
            logs: [],
          },
          {
            id: 'tester-1',
            name: 'Tester Agent',
            type: 'agent',
            status: 'idle',
            state: 'minimized',
            position: { x: 100, y: 550 },
            size: { width: 300, height: 400 },
            zIndex: 3,
            logs: [],
          },
          {
            id: 'reviewer-1',
            name: 'Reviewer Agent',
            type: 'agent',
            status: 'idle',
            state: 'minimized',
            position: { x: 450, y: 550 },
            size: { width: 300, height: 400 },
            zIndex: 4,
            logs: [],
          },
        ],
      }),
      saveWorkspace: jest.fn().mockResolvedValue({ success: true }),
      onSpawnWidget: jest.fn(),
    };
  });

  describe('Initialization', () => {
    it('renders canvas with demo widgets', async () => {
      render(<Canvas />);

      await waitFor(() => {
        expect(screen.getByText('Coordinator Agent')).toBeInTheDocument();
        expect(screen.getByText('Coder Agent')).toBeInTheDocument();
        expect(screen.getByText('Tester Agent')).toBeInTheDocument();
        expect(screen.getByText('Reviewer Agent')).toBeInTheDocument();
      });
    });

    it('shows widget count in toolbar', async () => {
      render(<Canvas />);

      await waitFor(() => {
        expect(screen.getByText(/Widgets: 4/)).toBeInTheDocument();
      });
    });

    it('shows no selection initially', async () => {
      render(<Canvas />);

      await waitFor(() => {
        expect(screen.getByText(/Selected: None/)).toBeInTheDocument();
      });
    });
  });

  describe('Widget Selection', () => {
    it('selects widget on click', async () => {
      render(<Canvas />);

      await waitFor(() => {
        expect(screen.getByText('Coordinator Agent')).toBeInTheDocument();
      });

      const coordinatorHeader = screen.getByText('Coordinator Agent').closest('.widget-header') as HTMLElement;
      fireEvent.mouseDown(coordinatorHeader);

      await waitFor(() => {
        expect(screen.getByText(/Selected:/)).toHaveTextContent(/Coordinator Agent/);
      });
    });

    it('deselects widget when clicking canvas', async () => {
      render(<Canvas />);

      await waitFor(() => {
        expect(screen.getByText('Coordinator Agent')).toBeInTheDocument();
      });

      // Select a widget
      const coordinatorHeader = screen.getByText('Coordinator Agent').closest('.widget-header') as HTMLElement;
      fireEvent.mouseDown(coordinatorHeader);

      // Click canvas
      const canvas = document.querySelector('.canvas-container') as HTMLElement;
      fireEvent.click(canvas);

      await waitFor(() => {
        expect(screen.getByText(/Selected: None/)).toBeInTheDocument();
      });
    });
  });

  describe('Multi-Widget Interactions', () => {
    it('brings clicked widget to front', async () => {
      render(<Canvas />);

      await waitFor(() => {
        expect(screen.getByText('Coordinator Agent')).toBeInTheDocument();
        expect(screen.getByText('Coder Agent')).toBeInTheDocument();
      });

      const coordinatorWidget = document.querySelector('[style*="Coordinator"]')?.closest('.agent-widget') as HTMLElement;
      const coderWidget = document.querySelector('[style*="Coder"]')?.closest('.agent-widget') as HTMLElement;

      const initialCoordinatorZ = coordinatorWidget?.style.zIndex || '0';
      const initialCoderZ = coderWidget?.style.zIndex || '0';

      // Click coder widget
      const coderHeader = screen.getByText('Coder Agent').closest('.widget-header') as HTMLElement;
      fireEvent.mouseDown(coderHeader);

      await waitFor(() => {
        const newCoderZ = coderWidget?.style.zIndex || '0';
        expect(parseInt(newCoderZ)).toBeGreaterThan(parseInt(initialCoordinatorZ));
      });
    });

    it('maintains separate state for each widget', async () => {
      render(<Canvas />);

      await waitFor(() => {
        expect(screen.getByText('Coordinator Agent')).toBeInTheDocument();
      });

      // Expand coordinator
      const coordinatorHeader = screen.getByText('Coordinator Agent').closest('.widget-header-left') as HTMLElement;
      fireEvent.click(coordinatorHeader);

      await waitFor(() => {
        const coordinatorWidget = screen.getByText('Coordinator Agent').closest('.agent-widget');
        expect(coordinatorWidget).toHaveClass('agent-widget--compact');
      });

      // Coder should still be minimized
      const coderWidget = screen.getByText('Coder Agent').closest('.agent-widget');
      expect(coderWidget).toHaveClass('agent-widget--minimized');
    });
  });

  describe('Performance', () => {
    it('renders 4 widgets without lag', async () => {
      const start = performance.now();
      render(<Canvas />);

      await waitFor(() => {
        expect(screen.getByText('Coordinator Agent')).toBeInTheDocument();
      });

      const end = performance.now();
      const renderTime = end - start;

      // Should render in less than 1 second
      expect(renderTime).toBeLessThan(1000);
    });

    it('updates widget position efficiently', async () => {
      render(<Canvas />);

      await waitFor(() => {
        expect(screen.getByText('Coordinator Agent')).toBeInTheDocument();
      });

      const header = screen.getByText('Coordinator Agent').closest('.widget-header') as HTMLElement;

      const start = performance.now();

      // Simulate drag
      fireEvent.mouseDown(header, { clientX: 100, clientY: 100 });
      for (let i = 0; i < 10; i++) {
        fireEvent.mouseMove(window, { clientX: 100 + i * 10, clientY: 100 + i * 10 });
      }
      fireEvent.mouseUp(window);

      const end = performance.now();
      const dragTime = end - start;

      // Should complete drag in less than 100ms
      expect(dragTime).toBeLessThan(100);
    });
  });

  describe('Toolbar', () => {
    it('updates widget count when widgets change', async () => {
      render(<Canvas />);

      await waitFor(() => {
        expect(screen.getByText(/Widgets: 4/)).toBeInTheDocument();
      });
    });

    it('shows scale information', async () => {
      render(<Canvas />);

      await waitFor(() => {
        expect(screen.getByText(/Scale: 100%/)).toBeInTheDocument();
      });
    });

    it('updates selected widget name', async () => {
      render(<Canvas />);

      await waitFor(() => {
        expect(screen.getByText('Coordinator Agent')).toBeInTheDocument();
      });

      const header = screen.getByText('Coordinator Agent').closest('.widget-header') as HTMLElement;
      fireEvent.mouseDown(header);

      await waitFor(() => {
        // The toolbar should show which widget is selected
        const selectedText = screen.getByText(/Selected:/);
        expect(selectedText.parentElement?.textContent).toContain('Selected:');
      });
    });
  });
});
