/**
 * useWidgetInteractions Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useWidgetInteractions } from '../../src/hooks/useWidgetInteractions';
import { createWidget } from '../../src/utils/widgetFactory';

describe('useWidgetInteractions', () => {
  const mockWidget = createWidget({ name: 'Test Widget', status: 'running' });
  const mockOnSelect = jest.fn();
  const mockOnStateChange = jest.fn();
  const mockOnBringToFront = jest.fn();
  const mockSetContextMenuPos = jest.fn();
  const mockSetDragState = jest.fn();

  const defaultProps = {
    widget: mockWidget,
    onSelect: mockOnSelect,
    onStateChange: mockOnStateChange,
    onBringToFront: mockOnBringToFront,
    setContextMenuPos: mockSetContextMenuPos,
    setDragState: mockSetDragState,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleMouseDown', () => {
    it('initiates drag state on left click', () => {
      const { result } = renderHook(() => useWidgetInteractions(defaultProps));

      const event = {
        button: 0,
        clientX: 100,
        clientY: 200,
        target: document.createElement('div'),
      } as any;

      act(() => {
        result.current.handleMouseDown(event);
      });

      expect(mockOnSelect).toHaveBeenCalledWith(mockWidget.id);
      expect(mockOnBringToFront).toHaveBeenCalledWith(mockWidget.id);
      expect(mockSetDragState).toHaveBeenCalledWith({
        isDragging: true,
        startX: 100,
        startY: 200,
        offsetX: mockWidget.position.x,
        offsetY: mockWidget.position.y,
      });
    });

    it('ignores non-left clicks', () => {
      const { result } = renderHook(() => useWidgetInteractions(defaultProps));

      const event = {
        button: 1, // Middle click
        clientX: 100,
        clientY: 200,
        target: document.createElement('div'),
      } as any;

      act(() => {
        result.current.handleMouseDown(event);
      });

      expect(mockSetDragState).not.toHaveBeenCalled();
    });

    it('ignores clicks on controls', () => {
      const { result } = renderHook(() => useWidgetInteractions(defaultProps));

      const control = document.createElement('button');
      control.className = 'widget-header-controls';
      const div = document.createElement('div');
      div.appendChild(control);

      const event = {
        button: 0,
        clientX: 100,
        clientY: 200,
        target: control,
      } as any;

      // Mock closest
      control.closest = jest.fn(() => control);

      act(() => {
        result.current.handleMouseDown(event);
      });

      expect(mockSetDragState).not.toHaveBeenCalled();
    });
  });

  describe('handleDoubleClick', () => {
    it('expands and focuses widget', () => {
      const { result } = renderHook(() => useWidgetInteractions(defaultProps));

      const event = {
        stopPropagation: jest.fn(),
      } as any;

      act(() => {
        result.current.handleDoubleClick(event);
      });

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(mockOnStateChange).toHaveBeenCalledWith(mockWidget.id, 'expanded');
      expect(mockOnBringToFront).toHaveBeenCalledWith(mockWidget.id);
    });
  });

  describe('handleRightClick', () => {
    it('opens context menu', () => {
      const { result } = renderHook(() => useWidgetInteractions(defaultProps));

      const event = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        clientX: 300,
        clientY: 400,
      } as any;

      act(() => {
        result.current.handleRightClick(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(mockOnSelect).toHaveBeenCalledWith(mockWidget.id);
      expect(mockOnBringToFront).toHaveBeenCalledWith(mockWidget.id);
      expect(mockSetContextMenuPos).toHaveBeenCalledWith({
        x: 300,
        y: 400,
      });
    });
  });
});
