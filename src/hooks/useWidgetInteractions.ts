/**
 * Canvas AI - Widget Interactions Hook
 * Handles click, double-click, right-click, and drag interactions
 */

import { useCallback } from 'react';
import { AgentWidgetData, WidgetState, DragState } from '../types/widget';

interface UseWidgetInteractionsProps {
  widget: AgentWidgetData;
  onSelect: (id: string) => void;
  onStateChange: (id: string, state: WidgetState) => void;
  onBringToFront: (id: string) => void;
  setContextMenuPos: (pos: { x: number; y: number } | null) => void;
  setDragState: React.Dispatch<React.SetStateAction<DragState>>;
}

export const useWidgetInteractions = ({
  widget,
  onSelect,
  onStateChange,
  onBringToFront,
  setContextMenuPos,
  setDragState,
}: UseWidgetInteractionsProps) => {
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return; // Only left mouse button

      // Don't start drag if clicking on controls or input elements
      const target = e.target as HTMLElement;
      if (
        target.closest('.widget-header-controls') ||
        target.closest('.widget-command-input') ||
        target.closest('.resize-handle')
      ) {
        return;
      }

      onSelect(widget.id);
      onBringToFront(widget.id);

      setDragState({
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: widget.position.x,
        offsetY: widget.position.y,
      });
    },
    [widget, onSelect, onBringToFront, setDragState]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      // Focus widget: center and expand
      onStateChange(widget.id, 'expanded');
      onBringToFront(widget.id);

      // Center widget in viewport
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const centerX = (viewportWidth - widget.size.width) / 2;
      const centerY = (viewportHeight - widget.size.height) / 2;

      // This would be handled by the parent component
      console.log('Focus widget:', widget.id, { x: centerX, y: centerY });
    },
    [widget, onStateChange, onBringToFront]
  );

  const handleRightClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      onSelect(widget.id);
      onBringToFront(widget.id);

      setContextMenuPos({
        x: e.clientX,
        y: e.clientY,
      });
    },
    [widget.id, onSelect, onBringToFront, setContextMenuPos]
  );

  return {
    handleMouseDown,
    handleDoubleClick,
    handleRightClick,
  };
};
