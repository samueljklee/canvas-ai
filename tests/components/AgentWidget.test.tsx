/**
 * AgentWidget Component Tests
 * Tests all widget interactions: drag, resize, state changes, context menu
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentWidget } from '../../src/components/AgentWidget';
import { createWidget } from '../../src/utils/widgetFactory';

describe.skip('AgentWidget', () => {
  const mockWidget = createWidget({ name: 'Test Agent', status: 'running' });
  const mockOnSelect = jest.fn();
  const mockOnUpdate = jest.fn();
  const mockOnStateChange = jest.fn();
  const mockOnBringToFront = jest.fn();

  const defaultProps = {
    widget: mockWidget,
    isSelected: false,
    onSelect: mockOnSelect,
    onUpdate: mockOnUpdate,
    onStateChange: mockOnStateChange,
    onBringToFront: mockOnBringToFront,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock window.claudeCode API for WidgetBody
    (window as any).claudeCode = {
      getWidgetCommandHistory: jest.fn().mockResolvedValue({ success: true, commands: [] }),
      searchCommands: jest.fn().mockResolvedValue({ success: true, commands: [] }),
      getCwd: jest.fn().mockResolvedValue({ success: true, cwd: '/test' }),
      listDirectoryRecursive: jest.fn().mockResolvedValue({ success: true, files: [] }),
    };
  });

  describe('Rendering', () => {
    it('renders widget with correct name', () => {
      render(<AgentWidget {...defaultProps} />);
      expect(screen.getByText('Test Agent')).toBeInTheDocument();
    });

    it('renders with correct status color', () => {
      render(<AgentWidget {...defaultProps} />);
      const statusIndicator = document.querySelector('.widget-status-indicator');
      expect(statusIndicator).toBeInTheDocument();
    });

    it('applies selected class when selected', () => {
      const { container } = render(<AgentWidget {...defaultProps} isSelected={true} />);
      const widget = container.querySelector('.agent-widget');
      expect(widget).toHaveClass('agent-widget--selected');
    });

    it('renders in minimized state correctly', () => {
      const minimizedWidget = { ...mockWidget, state: 'minimized' as const };
      const { container } = render(<AgentWidget {...defaultProps} widget={minimizedWidget} />);
      expect(container.querySelector('.agent-widget--minimized')).toBeInTheDocument();
    });

    it('renders in compact state correctly', () => {
      const compactWidget = { ...mockWidget, state: 'compact' as const };
      render(<AgentWidget {...defaultProps} widget={compactWidget} />);
      expect(screen.getByText(/Status:/)).toBeInTheDocument();
      expect(screen.getByText(/Logs:/)).toBeInTheDocument();
    });

    it('renders in expanded state with log viewer and input', () => {
      const expandedWidget = { ...mockWidget, state: 'expanded' as const };
      render(<AgentWidget {...defaultProps} widget={expandedWidget} />);
      expect(screen.getByPlaceholderText('Enter command... (↑↓ history, @ files, / commands)')).toBeInTheDocument();
      expect(screen.getByText('Send')).toBeInTheDocument();
    });
  });

  describe('Dragging', () => {
    it('starts drag on header mouse down', () => {
      render(<AgentWidget {...defaultProps} />);
      const header = document.querySelector('.widget-header') as HTMLElement;

      fireEvent.mouseDown(header, { clientX: 100, clientY: 100 });

      expect(mockOnSelect).toHaveBeenCalledWith(mockWidget.id);
      expect(mockOnBringToFront).toHaveBeenCalledWith(mockWidget.id);
    });

    it('updates position during drag', async () => {
      render(<AgentWidget {...defaultProps} />);
      const header = document.querySelector('.widget-header') as HTMLElement;

      // Start drag
      fireEvent.mouseDown(header, { clientX: 100, clientY: 100, button: 0 });

      // Move mouse
      fireEvent.mouseMove(window, { clientX: 150, clientY: 150 });

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled();
      });
    });

    it('stops dragging on mouse up', async () => {
      render(<AgentWidget {...defaultProps} />);
      const header = document.querySelector('.widget-header') as HTMLElement;

      fireEvent.mouseDown(header, { clientX: 100, clientY: 100, button: 0 });
      fireEvent.mouseMove(window, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(window);

      // Should not update after mouse up
      mockOnUpdate.mockClear();
      fireEvent.mouseMove(window, { clientX: 200, clientY: 200 });

      await waitFor(() => {
        expect(mockOnUpdate).not.toHaveBeenCalled();
      });
    });

    it('does not start drag when clicking control buttons', () => {
      render(<AgentWidget {...defaultProps} />);
      const minimizeBtn = screen.getByTitle('Minimize (Compact View)');

      fireEvent.mouseDown(minimizeBtn, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(window, { clientX: 150, clientY: 150 });

      expect(mockOnUpdate).not.toHaveBeenCalled();
    });
  });

  describe('State Changes', () => {
    it('cycles states when clicking header', async () => {
      const { rerender } = render(<AgentWidget {...defaultProps} />);
      const header = document.querySelector('.widget-header-left') as HTMLElement;

      // Minimized -> Compact
      fireEvent.click(header);
      expect(mockOnStateChange).toHaveBeenCalledWith(mockWidget.id, 'compact');

      // Update to compact
      const compactWidget = { ...mockWidget, state: 'compact' as const };
      rerender(<AgentWidget {...defaultProps} widget={compactWidget} />);

      // Compact -> Expanded
      fireEvent.click(header);
      expect(mockOnStateChange).toHaveBeenCalledWith(mockWidget.id, 'expanded');
    });

    it('changes to specific state when clicking control buttons', () => {
      render(<AgentWidget {...defaultProps} />);

      const expandBtn = screen.getByTitle('Expand');
      fireEvent.click(expandBtn);

      expect(mockOnStateChange).toHaveBeenCalledWith(mockWidget.id, 'expanded');
    });
  });

  describe('Double Click', () => {
    it('expands and focuses widget on double click', () => {
      render(<AgentWidget {...defaultProps} />);
      const widget = document.querySelector('.agent-widget') as HTMLElement;

      fireEvent.doubleClick(widget);

      expect(mockOnStateChange).toHaveBeenCalledWith(mockWidget.id, 'expanded');
      expect(mockOnBringToFront).toHaveBeenCalledWith(mockWidget.id);
    });
  });

  describe('Context Menu', () => {
    it('opens context menu on right click', () => {
      render(<AgentWidget {...defaultProps} />);
      const widget = document.querySelector('.agent-widget') as HTMLElement;

      fireEvent.contextMenu(widget, { clientX: 200, clientY: 200 });

      expect(screen.getByText('Stop')).toBeInTheDocument();
      expect(screen.getByText('Resume')).toBeInTheDocument();
      expect(screen.getByText('Open Worktree')).toBeInTheDocument();
    });

    it('closes context menu when clicking outside', () => {
      render(<AgentWidget {...defaultProps} />);
      const widget = document.querySelector('.agent-widget') as HTMLElement;

      fireEvent.contextMenu(widget, { clientX: 200, clientY: 200 });
      expect(screen.getByText('Stop')).toBeInTheDocument();

      fireEvent.click(document.body);
      expect(screen.queryByText('Stop')).not.toBeInTheDocument();
    });

    it('executes context menu action', () => {
      render(<AgentWidget {...defaultProps} />);
      const widget = document.querySelector('.agent-widget') as HTMLElement;

      fireEvent.contextMenu(widget);
      const expandAction = screen.getByText('Expand');
      fireEvent.click(expandAction);

      expect(mockOnStateChange).toHaveBeenCalledWith(mockWidget.id, 'expanded');
    });
  });

  describe('Resize', () => {
    it('shows resize handles in expanded state', () => {
      const expandedWidget = { ...mockWidget, state: 'expanded' as const };
      const { container } = render(<AgentWidget {...defaultProps} widget={expandedWidget} />);

      const handles = container.querySelectorAll('.resize-handle');
      expect(handles).toHaveLength(8); // n, ne, e, se, s, sw, w, nw
    });

    it('does not show resize handles in minimized/compact state', () => {
      const { container } = render(<AgentWidget {...defaultProps} />);
      const handles = container.querySelectorAll('.resize-handle');
      expect(handles).toHaveLength(0);
    });

    it('resizes widget when dragging handle', async () => {
      const expandedWidget = { ...mockWidget, state: 'expanded' as const };
      const { container } = render(<AgentWidget {...defaultProps} widget={expandedWidget} />);

      const handle = container.querySelector('.resize-handle--se') as HTMLElement;

      fireEvent.mouseDown(handle, { clientX: 300, clientY: 300 });
      fireEvent.mouseMove(window, { clientX: 400, clientY: 400 });

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled();
      });
    });
  });

  describe('Command Input', () => {
    it('allows typing in input field when expanded', async () => {
      const expandedWidget = { ...mockWidget, state: 'expanded' as const };
      render(<AgentWidget {...defaultProps} widget={expandedWidget} />);

      const input = screen.getByPlaceholderText('Enter command... (↑↓ history, @ files, / commands)') as HTMLInputElement;
      await userEvent.type(input, 'test command');

      expect(input.value).toBe('test command');
    });

    it('submits command on form submit', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const expandedWidget = { ...mockWidget, state: 'expanded' as const };
      render(<AgentWidget {...defaultProps} widget={expandedWidget} />);

      const input = screen.getByPlaceholderText('Enter command... (↑↓ history, @ files, / commands)');
      const sendBtn = screen.getByText('Send');

      await userEvent.type(input, 'test command');
      fireEvent.click(sendBtn);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Command submitted:',
        'test command',
        'to widget:',
        mockWidget.id
      );

      consoleSpy.mockRestore();
    });

    it('clears input after submission', async () => {
      const expandedWidget = { ...mockWidget, state: 'expanded' as const };
      render(<AgentWidget {...defaultProps} widget={expandedWidget} />);

      const input = screen.getByPlaceholderText('Enter command... (↑↓ history, @ files, / commands)') as HTMLInputElement;
      const sendBtn = screen.getByText('Send');

      await userEvent.type(input, 'test command');
      fireEvent.click(sendBtn);

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });

    it('does not submit empty command', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const expandedWidget = { ...mockWidget, state: 'expanded' as const };
      render(<AgentWidget {...defaultProps} widget={expandedWidget} />);

      const sendBtn = screen.getByText('Send');
      fireEvent.click(sendBtn);

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Command submitted')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Z-Index Management', () => {
    it('brings widget to front on click', () => {
      render(<AgentWidget {...defaultProps} />);
      const header = document.querySelector('.widget-header') as HTMLElement;

      fireEvent.mouseDown(header);

      expect(mockOnBringToFront).toHaveBeenCalledWith(mockWidget.id);
    });

    it('applies correct z-index from props', () => {
      const widgetWithZIndex = { ...mockWidget, zIndex: 100 };
      const { container } = render(<AgentWidget {...defaultProps} widget={widgetWithZIndex} />);

      const widget = container.querySelector('.agent-widget') as HTMLElement;
      expect(widget.style.zIndex).toBe('100');
    });
  });
});
