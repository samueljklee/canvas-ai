/**
 * Canvas AI - Canvas State Management Hook
 * Manages all widgets, selection, and z-index
 */

import { useState, useCallback } from 'react';
import { AgentWidgetData, CanvasState, WidgetState, Position, Size } from '../types/widget';
import { DEFAULT_WIDGET_CONFIG } from '../types/widget';

export const useCanvasState = () => {
  const [canvasState, setCanvasState] = useState<CanvasState>({
    widgets: new Map(),
    selectedWidgetId: null,
    maxZIndex: 1,
    scale: 1,
    pan: { x: 0, y: 0 },
  });

  const addWidget = useCallback((widget: Omit<AgentWidgetData, 'zIndex'>) => {
    setCanvasState((prev) => {
      const newZIndex = prev.maxZIndex + 1;
      const newWidget: AgentWidgetData = {
        ...widget,
        zIndex: newZIndex,
      };

      const newWidgets = new Map(prev.widgets);
      newWidgets.set(widget.id, newWidget);

      return {
        ...prev,
        widgets: newWidgets,
        maxZIndex: newZIndex,
      };
    });
  }, []);

  const removeWidget = useCallback((id: string) => {
    setCanvasState((prev) => {
      const newWidgets = new Map(prev.widgets);
      newWidgets.delete(id);

      return {
        ...prev,
        widgets: newWidgets,
        selectedWidgetId: prev.selectedWidgetId === id ? null : prev.selectedWidgetId,
      };
    });
  }, []);

  const updateWidget = useCallback((id: string, updates: Partial<AgentWidgetData>) => {
    console.log('[UPDATE] Widget update requested:', id, updates);

    setCanvasState((prev) => {
      const widget = prev.widgets.get(id);
      if (!widget) {
        console.log('[UPDATE] Widget not found:', id);
        return prev;
      }

      const updatedWidget = { ...widget, ...updates };
      const newWidgets = new Map(prev.widgets);
      newWidgets.set(id, updatedWidget);

      console.log('[UPDATE] Widget updated:', id, 'new state:', updatedWidget);

      return {
        ...prev,
        widgets: newWidgets,
      };
    });
  }, []);

  const selectWidget = useCallback((id: string | null) => {
    setCanvasState((prev) => ({
      ...prev,
      selectedWidgetId: id,
    }));
  }, []);

  const bringToFront = useCallback((id: string) => {
    setCanvasState((prev) => {
      const widget = prev.widgets.get(id);
      if (!widget) return prev;

      const newZIndex = prev.maxZIndex + 1;
      const updatedWidget = { ...widget, zIndex: newZIndex };
      const newWidgets = new Map(prev.widgets);
      newWidgets.set(id, updatedWidget);

      return {
        ...prev,
        widgets: newWidgets,
        maxZIndex: newZIndex,
      };
    });
  }, []);

  const changeWidgetState = useCallback((id: string, state: WidgetState) => {
    setCanvasState((prev) => {
      const widget = prev.widgets.get(id);
      if (!widget) return prev;

      let newSize: Size;
      switch (state) {
        case 'expanded':
          newSize = {
            width: DEFAULT_WIDGET_CONFIG.expandedWidth,
            height: DEFAULT_WIDGET_CONFIG.expandedHeight,
          };
          break;
        case 'compact':
          newSize = {
            width: DEFAULT_WIDGET_CONFIG.compactWidth,
            height: DEFAULT_WIDGET_CONFIG.compactHeight,
          };
          break;
        case 'minimized':
          newSize = {
            width: DEFAULT_WIDGET_CONFIG.minimizedWidth,
            height: DEFAULT_WIDGET_CONFIG.minimizedHeight,
          };
          break;
      }

      const updatedWidget = {
        ...widget,
        state,
        size: newSize,
      };

      const newWidgets = new Map(prev.widgets);
      newWidgets.set(id, updatedWidget);

      return {
        ...prev,
        widgets: newWidgets,
      };
    });
  }, []);

  const setCanvasPan = useCallback((pan: Position) => {
    setCanvasState((prev) => ({
      ...prev,
      pan,
    }));
  }, []);

  const setCanvasScale = useCallback((scale: number) => {
    setCanvasState((prev) => ({
      ...prev,
      scale: Math.max(0.1, Math.min(3, scale)),
    }));
  }, []);

  const serializeLayout = useCallback((): string => {
    const layoutData = {
      widgets: Array.from(canvasState.widgets.values()).map((widget) => ({
        id: widget.id,
        name: widget.name,
        type: widget.type,
        status: widget.status,
        state: widget.state,
        position: widget.position,
        size: widget.size,
        relationships: widget.relationships,
        content: widget.content,
        path: widget.path,
      })),
      scale: canvasState.scale,
      pan: canvasState.pan,
    };

    return JSON.stringify(layoutData, null, 2);
  }, [canvasState]);

  const deserializeLayout = useCallback((layoutJson: string) => {
    try {
      const layoutData = JSON.parse(layoutJson);

      const newWidgets = new Map<string, AgentWidgetData>();
      let maxZ = 0;

      layoutData.widgets.forEach((widget: any, index: number) => {
        const zIndex = index + 1;
        maxZ = Math.max(maxZ, zIndex);

        newWidgets.set(widget.id, {
          ...widget,
          zIndex,
          logs: [],
        });
      });

      setCanvasState({
        widgets: newWidgets,
        selectedWidgetId: null,
        maxZIndex: maxZ,
        scale: layoutData.scale || 1,
        pan: layoutData.pan || { x: 0, y: 0 },
      });
    } catch (error) {
      console.error('Failed to deserialize layout:', error);
    }
  }, []);

  return {
    canvasState,
    addWidget,
    removeWidget,
    updateWidget,
    selectWidget,
    bringToFront,
    changeWidgetState,
    setCanvasPan,
    setCanvasScale,
    serializeLayout,
    deserializeLayout,
  };
};
