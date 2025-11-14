/**
 * Canvas AI - Widget Factory Utilities
 * Helper functions for creating and managing widgets
 */

import { AgentWidgetData, AgentStatus, Position, LogEntry, WidgetType } from '../types/widget';
import { DEFAULT_WIDGET_CONFIG } from '../types/widget';
import { nanoid } from 'nanoid';

export interface CreateWidgetOptions {
  name: string;
  type?: WidgetType;
  status?: AgentStatus;
  position?: Position;
  relationships?: string[];
  content?: string; // For document widgets
  path?: string; // For filebrowser widgets
}

export const createWidget = (options: CreateWidgetOptions): Omit<AgentWidgetData, 'zIndex'> => {
  const { name, type = 'agent', status = 'idle', position, relationships, content, path } = options;

  // All widgets default to expanded state - minimize is a user action
  const defaultState = 'expanded';
  const defaultSize = {
    width: DEFAULT_WIDGET_CONFIG.expandedWidth,
    height: DEFAULT_WIDGET_CONFIG.expandedHeight
  };

  return {
    id: nanoid(8),
    name,
    type,
    status,
    state: defaultState,
    position: position || { x: 100, y: 100 },
    size: defaultSize,
    logs: [
      {
        timestamp: Date.now(),
        level: 'info',
        message: `${name} initialized`,
      },
    ],
    relationships,
    content,
    path,
  };
};

export const generateGridLayout = (
  count: number,
  startX: number = 50,
  startY: number = 80,
  spacingX: number = 350,
  spacingY: number = 220
): Position[] => {
  const positions: Position[] = [];
  const cols = Math.ceil(Math.sqrt(count));

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;

    positions.push({
      x: startX + col * spacingX,
      y: startY + row * spacingY,
    });
  }

  return positions;
};

export const addLogToWidget = (
  widget: AgentWidgetData,
  level: LogEntry['level'],
  message: string
): AgentWidgetData => {
  return {
    ...widget,
    logs: [
      ...widget.logs,
      {
        timestamp: Date.now(),
        level,
        message,
      },
    ],
  };
};

export const clearWidgetLogs = (widget: AgentWidgetData): AgentWidgetData => {
  return {
    ...widget,
    logs: [],
  };
};

export const updateWidgetStatus = (
  widget: AgentWidgetData,
  status: AgentStatus
): AgentWidgetData => {
  const statusLog: LogEntry = {
    timestamp: Date.now(),
    level: status === 'error' ? 'error' : 'info',
    message: `Status changed to: ${status}`,
  };

  return {
    ...widget,
    status,
    logs: [...widget.logs, statusLog],
  };
};
