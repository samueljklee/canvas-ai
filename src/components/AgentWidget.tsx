/**
 * Workspace Canvas - AgentWidget Component
 * Main widget component with all interaction modes
 */

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { AgentWidgetData, WidgetState, DragState, ResizeState, ResizeHandle, LogEntry } from '../types/widget';
import { WidgetHeader } from './WidgetHeader';
import { WidgetBody } from './WidgetBody';
import { DocumentEditor } from './DocumentEditor';
import { FileBrowser } from './FileBrowser';
import { GeneratedApp } from './GeneratedApp';
import { ContextMenu } from './ContextMenu';
import { useWidgetInteractions } from '../hooks/useWidgetInteractions';
import { claudeCodeService } from '../services/ClaudeCodeService';
import '../styles/AgentWidget.css';

interface AgentWidgetProps {
  widget: AgentWidgetData;
  workspaceId?: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<AgentWidgetData>) => void;
  onStateChange: (id: string, state: WidgetState) => void;
  onBringToFront: (id: string) => void;
  onClose: (id: string) => void;
}

export const AgentWidget: React.FC<AgentWidgetProps> = ({
  widget,
  workspaceId,
  isSelected,
  onSelect,
  onUpdate,
  onStateChange,
  onBringToFront,
  onClose,
}) => {
  const widgetRef = useRef<HTMLDivElement>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
  });
  const [dragTransform, setDragTransform] = useState({ x: 0, y: 0 });
  const dragTransformRef = useRef({ x: 0, y: 0 });
  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    handle: null,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
  });
  const resizeStartPosRef = useRef({ x: 0, y: 0 });

  const {
    handleMouseDown,
    handleDoubleClick,
    handleRightClick,
  } = useWidgetInteractions({
    widget,
    onSelect,
    onStateChange,
    onBringToFront,
    setContextMenuPos,
    setDragState,
  });

  // Real Claude Code instance management
  const [claudeInstanceId, setClaudeInstanceId] = useState<string | null>(null);
  const [localLogs, setLocalLogs] = useState<LogEntry[]>([]);
  const streamingLogIndexRef = useRef<number>(-1);

  // Sync local logs to parent
  useEffect(() => {
    if (localLogs.length > 0 && localLogs !== widget.logs) {
      onUpdate(widget.id, { logs: localLogs });
    }
  }, [localLogs]);

  // Initialize local logs from widget
  useEffect(() => {
    console.log(`[AgentWidget] Initializing logs for widget ${widget.id}:`, widget.logs.length, 'logs');
    setLocalLogs(widget.logs);
  }, [widget.id]);

  // Spawn Claude Code instance on mount
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const spawnInstance = async () => {
      try {
        const instanceId = await claudeCodeService.spawnInstance(widget.name, undefined, widget.id, workspaceId);
        setClaudeInstanceId(instanceId);

        // Subscribe to output
        unsubscribe = claudeCodeService.subscribeToOutput(instanceId, (data: string) => {
          setLocalLogs((currentLogs) => {
            const logs = [...currentLogs];

            // Check if this is an end marker (---) or just empty/whitespace
            const isEndMarker = data.trim() === '---';
            const isEmpty = data.trim() === '';

            // Check if we're currently streaming (updating last entry)
            if (streamingLogIndexRef.current >= 0 && streamingLogIndexRef.current < logs.length && !isEndMarker && !isEmpty) {
              // Update the existing streaming log entry - append all data (including newlines)
              logs[streamingLogIndexRef.current] = {
                ...logs[streamingLogIndexRef.current],
                message: logs[streamingLogIndexRef.current].message + data,
              };
            } else if (!isEndMarker && !isEmpty) {
              // Start a new log entry for streaming
              const newLog: LogEntry = {
                timestamp: Date.now(),
                level: 'info',
                message: data,
              };
              logs.push(newLog);
              streamingLogIndexRef.current = logs.length - 1;
            } else if (isEndMarker) {
              // End marker detected - finalize current stream
              streamingLogIndexRef.current = -1;
            }

            return logs;
          });

          // Only update status if data is meaningful (not just whitespace)
          const trimmedData = data.trim();
          if (trimmedData === '---') {
            // End marker - set to idle
            onUpdate(widget.id, { status: 'idle' });
          } else if (trimmedData !== '') {
            // Actual content - set to running
            onUpdate(widget.id, { status: 'running' });
          }
          // Ignore empty/whitespace-only chunks for status updates
        });
      } catch (error: any) {
        console.error('Failed to spawn Claude Code instance:', error);
        const errorLog: LogEntry = {
          timestamp: Date.now(),
          level: 'error',
          message: `Failed to start: ${error.message}`,
        };
        setLocalLogs((logs) => [...logs, errorLog]);
        onUpdate(widget.id, { status: 'error' });
      }
    };

    spawnInstance();

    // Cleanup on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      if (claudeInstanceId) {
        claudeCodeService.killInstance(claudeInstanceId).catch(console.error);
      }
    };
  }, []); // Only run on mount

  const handleSendCommand = useCallback(async (command: string) => {
    if (!claudeInstanceId) {
      console.warn('No Claude Code instance available');
      return;
    }

    try {
      // Reset streaming state for new command
      streamingLogIndexRef.current = -1;

      // Set status to running
      onUpdate(widget.id, { status: 'running' });

      // Send to Claude Code instance (it will echo the command)
      await claudeCodeService.sendCommand(claudeInstanceId, command);
    } catch (error: any) {
      const errorLog: LogEntry = {
        timestamp: Date.now(),
        level: 'error',
        message: `Command failed: ${error.message}`,
      };
      setLocalLogs((logs) => [...logs, errorLog]);
      onUpdate(widget.id, { status: 'error' });
    }
  }, [claudeInstanceId, widget.id, onUpdate]);

  const handleStop = useCallback(async () => {
    if (!claudeInstanceId) return;

    try {
      await claudeCodeService.cancelInstance(claudeInstanceId);
      setLocalLogs((logs) => [
        ...logs,
        {
          timestamp: Date.now(),
          level: 'info',
          message: 'Cancelling operation...',
        },
      ]);
      // Status will be updated by the output stream when cancellation completes
    } catch (error: any) {
      console.error('Failed to cancel operation:', error);
      setLocalLogs((logs) => [
        ...logs,
        {
          timestamp: Date.now(),
          level: 'error',
          message: `Cancel failed: ${error.message}`,
        },
      ]);
    }
  }, [claudeInstanceId, widget.id, onUpdate]);

  // Handle drag
  useEffect(() => {
    if (!dragState.isDragging) return;

    let rafId: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      // Cancel previous RAF if it hasn't executed yet
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;

        // Calculate new position (no boundary constraints for infinite canvas)
        const newX = dragState.offsetX + dx;
        const newY = dragState.offsetY + dy;

        // Update transform for smooth visual updates (no state updates during drag)
        const transformX = newX - widget.position.x;
        const transformY = newY - widget.position.y;
        dragTransformRef.current = { x: transformX, y: transformY };
        setDragTransform({ x: transformX, y: transformY });

        rafId = null;
      });
    };

    const handleMouseUp = () => {
      // Final position update on mouse up using ref for latest values
      const dx = dragTransformRef.current.x;
      const dy = dragTransformRef.current.y;

      if (dx !== 0 || dy !== 0) {
        onUpdate(widget.id, {
          position: {
            x: widget.position.x + dx,
            y: widget.position.y + dy,
          },
        });
      }

      setDragState((prev) => ({ ...prev, isDragging: false }));
      setDragTransform({ x: 0, y: 0 });
      dragTransformRef.current = { x: 0, y: 0 };
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, widget.id, widget.position, widget.size, onUpdate]);

  // Handle resize
  useEffect(() => {
    if (!resizeState.isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeState.startX;
      const dy = e.clientY - resizeState.startY;

      let newWidth = resizeState.startWidth;
      let newHeight = resizeState.startHeight;
      let newX = resizeStartPosRef.current.x;  // Use stored start position
      let newY = resizeStartPosRef.current.y;  // Use stored start position

      const handle = resizeState.handle;
      if (handle?.includes('e')) newWidth += dx;
      if (handle?.includes('w')) {
        newWidth -= dx;
        newX += dx;  // Offset from start position
      }
      if (handle?.includes('s')) newHeight += dy;
      if (handle?.includes('n')) {
        newHeight -= dy;
        newY += dy;  // Offset from start position
      }

      // Only update position if it changed (for w/n handles)
      const updates: Partial<AgentWidgetData> = {
        size: { width: Math.max(200, newWidth), height: Math.max(100, newHeight) },
      };

      if (newX !== resizeStartPosRef.current.x || newY !== resizeStartPosRef.current.y) {
        updates.position = { x: newX, y: newY };
      }

      onUpdate(widget.id, updates);
    };

    const handleMouseUp = () => {
      setResizeState((prev) => ({ ...prev, isResizing: false, handle: null }));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizeState, widget.id, onUpdate]);

  const handleResizeStart = useCallback(
    (handle: ResizeHandle, e: React.MouseEvent) => {
      e.stopPropagation();
      // Store the starting position
      resizeStartPosRef.current = { x: widget.position.x, y: widget.position.y };
      setResizeState({
        isResizing: true,
        handle,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: widget.size.width,
        startHeight: widget.size.height,
      });
      onBringToFront(widget.id);
    },
    [widget, onBringToFront]
  );

  const handleRename = useCallback(
    (newName: string) => {
      const updates: Partial<AgentWidgetData> = { name: newName };

      // If this is a document widget without a path, generate path from name
      if (widget.type === 'document' && !widget.path) {
        const ext = newName.includes('.') ? '' : '.txt';
        const fileName = newName.replace(/[^a-zA-Z0-9-_.]/g, '-').toLowerCase();
        const homeDir = typeof process !== 'undefined' && process.env?.HOME
          ? process.env.HOME
          : '/Users/samule';
        const workingDir = `${homeDir}/Documents`;
        updates.path = `${workingDir}/${fileName}${ext}`;
        console.log('Generated path for renamed document:', updates.path);
      }

      onUpdate(widget.id, updates);
    },
    [widget.id, widget.type, widget.path, onUpdate]
  );

  const handleContextMenuAction = useCallback(
    (action: string) => {
      setContextMenuPos(null);

      switch (action) {
        case 'minimize':
          onStateChange(widget.id, 'minimized');
          break;
        case 'compact':
          onStateChange(widget.id, 'compact');
          break;
        case 'expand':
          onStateChange(widget.id, 'expanded');
          break;
        case 'stop':
          // Stub: Would send stop command via IPC
          console.log('Stop action:', widget.id);
          break;
        case 'resume':
          // Stub: Would send resume command via IPC
          console.log('Resume action:', widget.id);
          break;
        case 'worktree':
          // Stub: Would open worktree
          console.log('Open worktree:', widget.id);
          break;
        case 'close':
          onClose(widget.id);
          break;
      }
    },
    [widget.id, onStateChange, onClose]
  );

  const handleWidgetClick = useCallback((e: React.MouseEvent) => {
    // Only select on direct clicks, not when clicking header or inputs
    const target = e.target as HTMLElement;
    if (
      target.closest('.widget-header') ||
      target.closest('.widget-command-input') ||
      target.closest('.resize-handle')
    ) {
      return;
    }
    onSelect(widget.id);
  }, [widget.id, onSelect]);

  // Handle content updates for document widgets
  const handleContentUpdate = useCallback((content: string) => {
    onUpdate(widget.id, { content });
  }, [widget.id, onUpdate]);

  // Handle path updates for document widgets (when file is first saved)
  const handlePathUpdate = useCallback((path: string) => {
    onUpdate(widget.id, { path });
  }, [widget.id, onUpdate]);

  // Handle path changes for filebrowser widgets
  const handlePathChange = useCallback((path: string) => {
    onUpdate(widget.id, { path });
  }, [widget.id, onUpdate]);

  // Handle file open from filebrowser - spawn a document widget
  const handleFileOpen = useCallback(async (filePath: string, fileName: string) => {
    if (!window.claudeCode) {
      console.error('claudeCode API not available');
      return;
    }

    try {
      // Read the actual file content from the file system
      const result = await window.claudeCode.readFile(filePath);

      let content = '';
      if (result.success && result.content !== undefined) {
        content = result.content;
      } else {
        console.error('Failed to read file:', result.error);
        content = `// Error loading file: ${result.error}\n`;
      }

      // Send spawn-widget event to create a new document widget
      const event = new CustomEvent('spawn-widget-request', {
        detail: {
          type: 'document',
          name: fileName,
          initialContent: content,
          path: filePath,
        }
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  }, []);

  // Handle widget state updates
  const handleStateUpdate = useCallback((newState: any) => {
    onUpdate(widget.id, { widgetState: newState });
  }, [widget.id, onUpdate]);

  // Render appropriate widget body based on type
  const renderWidgetBody = () => {
    const widgetType = widget.type || 'agent';

    switch (widgetType) {
      case 'document':
        return <DocumentEditor
          widget={widget}
          onUpdate={handleContentUpdate}
          onPathUpdate={handlePathUpdate}
          onStateUpdate={handleStateUpdate}
        />;
      case 'filebrowser':
        return <FileBrowser widget={widget} onPathChange={handlePathChange} onFileOpen={handleFileOpen} onStateUpdate={handleStateUpdate} />;
      case 'generated-app':
        return <GeneratedApp widget={widget} />;
      case 'agent':
      default:
        return <WidgetBody widget={widget} workspaceId={workspaceId} onCommand={handleSendCommand} onStop={handleStop} />;
    }
  };

  const widgetClasses = [
    'agent-widget',
    `agent-widget--${widget.state}`,
    `agent-widget--${widget.status}`,
    isSelected ? 'agent-widget--selected' : '',
    dragState.isDragging ? 'agent-widget--dragging' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <div
        ref={widgetRef}
        className={widgetClasses}
        style={{
          position: 'absolute',
          left: widget.position.x,
          top: widget.position.y,
          width: widget.size.width,
          height: widget.size.height,
          zIndex: widget.zIndex,
          transform: dragState.isDragging ? `translate(${dragTransform.x}px, ${dragTransform.y}px)` : undefined,
          willChange: dragState.isDragging ? 'transform' : undefined,
        }}
        onClick={handleWidgetClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleRightClick}
      >
        <WidgetHeader
          widget={widget}
          isSelected={isSelected}
          onStateChange={(state) => onStateChange(widget.id, state)}
          onRename={handleRename}
          onMouseDown={handleMouseDown}
          onClose={() => onClose(widget.id)}
        />

        {renderWidgetBody()}

        {widget.state === 'expanded' && (
          <div className="widget-resize-handles">
            {(['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as ResizeHandle[]).map(
              (handle) => (
                <div
                  key={handle}
                  className={`resize-handle resize-handle--${handle}`}
                  onMouseDown={(e) => handleResizeStart(handle, e)}
                />
              )
            )}
          </div>
        )}

        {isSelected && widget.relationships && widget.relationships.length > 0 && (
          <div className="widget-relationships-indicator" />
        )}
      </div>

      {contextMenuPos && (
        <ContextMenu
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          widget={widget}
          onClose={() => setContextMenuPos(null)}
          onAction={handleContextMenuAction}
        />
      )}
    </>
  );
};
