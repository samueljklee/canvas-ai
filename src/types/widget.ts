/**
 * Canvas AI - Widget Type Definitions
 * Core types for agent widgets and their states
 */

export type WidgetState = 'expanded' | 'compact' | 'minimized';

export type AgentStatus = 'idle' | 'running' | 'paused' | 'error' | 'completed';

export type WidgetType = 'agent' | 'document' | 'filebrowser' | 'generated-app';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface AgentWidgetData {
  id: string;
  name: string;
  type?: WidgetType; // Default: 'agent'
  status: AgentStatus;
  state: WidgetState;
  position: Position;
  size: Size;
  zIndex: number;
  logs: LogEntry[];
  relationships?: string[]; // IDs of related widgets
  // For document widgets
  content?: string;
  // For filebrowser widgets
  path?: string;
  // Widget-specific state (e.g., scroll position, view mode, etc.)
  widgetState?: WidgetSpecificState;
}

export interface WidgetSpecificState {
  // Document editor state
  editorMode?: 'edit' | 'preview' | 'split';
  scrollPosition?: number;
  cursorPosition?: { line: number; column: number };
  // File browser state
  expandedFolders?: string[];
  selectedFile?: string;
  // Any widget can store custom state
  [key: string]: any;
}

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export interface ContextMenuAction {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  action: () => void;
}

export interface WidgetBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  velocity?: { vx: number; vy: number };
}

export interface ResizeState {
  isResizing: boolean;
  handle: ResizeHandle | null;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
}

export type ResizeHandle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

export interface CanvasState {
  widgets: Map<string, AgentWidgetData>;
  selectedWidgetId: string | null;
  maxZIndex: number;
  scale: number;
  pan: Position;
}

export interface WidgetConfig {
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  defaultWidth: number;
  defaultHeight: number;
  expandedWidth: number;
  expandedHeight: number;
  compactWidth: number;
  compactHeight: number;
  minimizedWidth: number;
  minimizedHeight: number;
}

export const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  minWidth: 200,
  minHeight: 100,
  maxWidth: 800,
  maxHeight: 600,
  defaultWidth: 400,
  defaultHeight: 300,
  expandedWidth: 600,
  expandedHeight: 500,
  compactWidth: 300,
  compactHeight: 150,
  minimizedWidth: 200,
  minimizedHeight: 60,
};

export const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: '#6B7280',      // Gray
  running: '#3B82F6',   // Blue
  paused: '#F59E0B',    // Amber
  error: '#EF4444',     // Red
  completed: '#10B981', // Green
};
