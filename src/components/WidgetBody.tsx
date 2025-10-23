/**
 * Workspace Canvas - Widget Body Component
 * Adaptive content area based on widget state
 */

import React, { useState, useRef, useEffect } from 'react';
import { AgentWidgetData } from '../types/widget';
import { LogViewer } from './LogViewer';
import '../styles/WidgetBody.css';

interface WidgetBodyProps {
  widget: AgentWidgetData;
  workspaceId?: string;
  onCommand?: (command: string) => void;
  onStop?: () => void;
}

interface AutocompleteItem {
  type: 'file' | 'command';
  value: string;
  label: string;
  description?: string;
}

// Available slash commands
const SLASH_COMMANDS: AutocompleteItem[] = [
  { type: 'command', value: '/spawn-widget document', label: '/spawn-widget', description: 'Create a new widget' },
  { type: 'command', value: '/read-file ', label: '/read-file', description: 'Read a file' },
  { type: 'command', value: '/write-file ', label: '/write-file', description: 'Write to a file' },
  { type: 'command', value: '/list-files ', label: '/list-files', description: 'List directory contents' },
  { type: 'command', value: '/web-search ', label: '/web-search', description: 'Search the web' },
  { type: 'command', value: '/web-fetch ', label: '/web-fetch', description: 'Fetch URL content' },
  { type: 'command', value: '/bash ', label: '/bash', description: 'Execute shell command' },
];

// Helper function to get user-friendly status message
const getStatusMessage = (status: string, logs: any[]): string => {
  if (status === 'running') {
    return 'Processing...';
  }

  // Check last log for completion/waiting indicators
  if (logs.length > 0) {
    const lastLog = logs[logs.length - 1];
    const msg = lastLog.message.toLowerCase();

    // Check for completion indicators
    if (msg.includes('---') || msg.includes('done') || msg.includes('completed')) {
      return '✓ Done';
    }

    // Check for waiting/ready indicators
    if (msg.includes('waiting') || msg.includes('ready') || msg.includes('initialized')) {
      return '⏸ Ready';
    }
  }

  // Default based on status
  if (status === 'idle') {
    return '⏸ Idle - Waiting for input';
  }
  if (status === 'completed') {
    return '✓ Done';
  }
  if (status === 'paused') {
    return '⏸ Paused';
  }
  if (status === 'error') {
    return '⚠️ Error';
  }

  return status;
};

export const WidgetBody: React.FC<WidgetBodyProps> = ({ widget, workspaceId, onCommand, onStop }) => {
  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const isLoading = widget.status === 'running';
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Load command history on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (!window.claudeCode || historyLoaded) return;

      try {
        // Try to load widget-specific history first
        const widgetHistoryResult = await window.claudeCode.getWidgetCommandHistory(widget.id, 50);

        if (widgetHistoryResult.success && widgetHistoryResult.commands && widgetHistoryResult.commands.length > 0) {
          // Widget has its own history
          setCommandHistory(widgetHistoryResult.commands.reverse()); // Reverse to get oldest first
          console.log(`[WidgetBody] Loaded ${widgetHistoryResult.commands.length} commands for widget ${widget.id}`);
        } else if (workspaceId) {
          // New widget - load workspace-wide command search
          const workspaceHistoryResult = await window.claudeCode.searchCommands(workspaceId, '', 50);

          if (workspaceHistoryResult.success && workspaceHistoryResult.commands) {
            setCommandHistory(workspaceHistoryResult.commands.reverse());
            console.log(`[WidgetBody] Loaded ${workspaceHistoryResult.commands.length} workspace commands for new widget`);
          }
        }

        setHistoryLoaded(true);
      } catch (error) {
        console.error('[WidgetBody] Failed to load command history:', error);
        setHistoryLoaded(true);
      }
    };

    loadHistory();
  }, [widget.id, workspaceId, historyLoaded]);

  // Auto-focus input when widget is created (first render)
  useEffect(() => {
    // Focus after a short delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (inputRef.current) {
        console.log('[FOCUS] Attempting to focus input for widget:', widget.name);
        inputRef.current.focus();
        console.log('[FOCUS] Input focused, document.activeElement:', document.activeElement?.tagName);
      }
    }, 150); // Increased delay slightly

    return () => clearTimeout(timer);
  }, []); // Only run on mount

  // Autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteItems, setAutocompleteItems] = useState<AutocompleteItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [autocompleteType, setAutocompleteType] = useState<'file' | 'command' | null>(null);
  const [triggerPosition, setTriggerPosition] = useState(0);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    // Add to history
    setCommandHistory((prev) => [...prev, command]);
    setHistoryIndex(-1);

    // Send command via IPC hook
    if (onCommand) {
      onCommand(command);
    }

    setCommand('');
  };

  // Fetch files for @ autocomplete
  const fetchFiles = async (query: string) => {
    if (!window.claudeCode) return [];

    try {
      // Determine working directory based on widget type
      let workingDir: string;

      if (widget.type === 'filebrowser' && widget.path) {
        // Use file browser's current path
        workingDir = widget.path;
      } else if (widget.type === 'document' && widget.path) {
        // Use document's directory
        const lastSlash = widget.path.lastIndexOf('/');
        workingDir = lastSlash > 0 ? widget.path.substring(0, lastSlash) : widget.path;
      } else {
        // Default to current working directory where the app was launched
        const cwdResult = await window.claudeCode.getCwd();
        if (cwdResult.success && cwdResult.cwd) {
          workingDir = cwdResult.cwd;
        } else {
          // Fallback to Documents if getCwd fails
          const homeDir = '/Users/samule';
          workingDir = `${homeDir}/Documents`;
        }
      }

      // Use recursive listing to show all files in subdirectories
      const result = await window.claudeCode.listDirectoryRecursive(workingDir);

      if (result.success && result.files) {
        return result.files
          .filter(file => {
            // Filter by query - search in relative path
            const searchPath = file.relativePath.toLowerCase();
            const searchQuery = query.toLowerCase();
            return searchPath.includes(searchQuery);
          })
          .slice(0, 50) // Limit to 50 results for performance
          .map(file => ({
            type: 'file' as const,
            value: file.relativePath, // Use relative path
            label: file.relativePath,
            description: file.type === 'directory' ? '📁 Directory' : '📄 File',
          }));
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
    }
    return [];
  };

  // Handle input change with autocomplete detection
  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCommand(value);

    const cursorPos = e.target.selectionStart || 0;

    // Find last @ or / before cursor
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');
    const lastSlashPos = textBeforeCursor.lastIndexOf('/');

    // Check if @ is at start or after a space
    if (lastAtPos !== -1 && (lastAtPos === 0 || value[lastAtPos - 1] === ' ')) {
      const query = textBeforeCursor.substring(lastAtPos + 1);
      const items = await fetchFiles(query);

      setAutocompleteItems(items);
      setAutocompleteType('file');
      setTriggerPosition(lastAtPos);
      setShowAutocomplete(items.length > 0);
      setSelectedIndex(0);
      return;
    }

    // Check if / is at start or after a space
    if (lastSlashPos !== -1 && (lastSlashPos === 0 || value[lastSlashPos - 1] === ' ')) {
      const query = textBeforeCursor.substring(lastSlashPos + 1).toLowerCase();
      const items = SLASH_COMMANDS.filter(cmd =>
        cmd.label.toLowerCase().includes(query)
      );

      setAutocompleteItems(items);
      setAutocompleteType('command');
      setTriggerPosition(lastSlashPos);
      setShowAutocomplete(items.length > 0);
      setSelectedIndex(0);
      return;
    }

    // No trigger found, hide autocomplete
    setShowAutocomplete(false);
  };

  // Insert selected autocomplete item
  const insertAutocompleteItem = (item: AutocompleteItem) => {
    const beforeTrigger = command.substring(0, triggerPosition);
    const afterCursor = command.substring(inputRef.current?.selectionStart || command.length);

    let newCommand: string;
    if (autocompleteType === 'file') {
      newCommand = `${beforeTrigger}@${item.value}${afterCursor}`;
    } else {
      newCommand = `${beforeTrigger}${item.value}${afterCursor}`;
    }

    setCommand(newCommand);
    setShowAutocomplete(false);
    inputRef.current?.focus();
  };

  // Scroll selected item into view
  useEffect(() => {
    if (showAutocomplete && selectedIndex >= 0) {
      const selectedElement = document.querySelector('.autocomplete-item.selected');
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, showAutocomplete]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle autocomplete navigation
    if (showAutocomplete) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => {
          const newIndex = Math.min(prev + 1, autocompleteItems.length - 1);
          return newIndex;
        });
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => {
          const newIndex = Math.max(prev - 1, 0);
          return newIndex;
        });
        return;
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (autocompleteItems[selectedIndex]) {
          insertAutocompleteItem(autocompleteItems[selectedIndex]);
        }
        return;
      } else if (e.key === 'Escape') {
        setShowAutocomplete(false);
        return;
      }
    }

    // Handle command history (only if autocomplete is not shown)
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;

      const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      setCommand(commandHistory[newIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;

      const newIndex = historyIndex + 1;
      if (newIndex >= commandHistory.length) {
        setHistoryIndex(-1);
        setCommand('');
      } else {
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      }
    }
  };

  if (widget.state === 'minimized') {
    return (
      <div className="widget-body widget-body--minimized">
        <div className="widget-status-text">
          {getStatusMessage(widget.status, widget.logs)}
        </div>
      </div>
    );
  }

  if (widget.state === 'compact') {
    return (
      <div className="widget-body widget-body--compact">
        <div className="widget-summary">
          <div className="widget-summary-item">
            <span className="widget-summary-label">Status:</span>
            <span className="widget-summary-value">{getStatusMessage(widget.status, widget.logs)}</span>
          </div>
          <div className="widget-summary-item">
            <span className="widget-summary-label">Logs:</span>
            <span className="widget-summary-value">{widget.logs.length} entries</span>
          </div>
        </div>
        {widget.logs.length > 0 && (
          <div className="widget-last-log">
            {widget.logs[widget.logs.length - 1].message}
          </div>
        )}
      </div>
    );
  }

  // Expanded state
  return (
    <div className="widget-body widget-body--expanded">
      <LogViewer logs={widget.logs} />

      <form className="widget-command-input" onSubmit={handleCommandSubmit}>
        <div className="widget-command-input-container">
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Enter command... (↑↓ history, @ files, / commands)"
            className="widget-command-field"
          />

          {showAutocomplete && (
            <div className="autocomplete-dropdown">
              {autocompleteItems.map((item, index) => (
                <div
                  key={index}
                  className={`autocomplete-item ${index === selectedIndex ? 'selected' : ''}`}
                  onClick={() => insertAutocompleteItem(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="autocomplete-label">{item.label}</span>
                  {item.description && (
                    <span className="autocomplete-description">{item.description}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {isLoading ? (
          <button
            type="button"
            className="widget-command-stop"
            onClick={onStop}
            title="Stop processing"
          >
            ⏹ Stop
          </button>
        ) : (
          <button
            type="submit"
            className={`widget-command-submit ${isLoading ? 'loading' : ''}`}
            disabled={!command.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span> Sending...
              </>
            ) : (
              'Send'
            )}
          </button>
        )}
      </form>
    </div>
  );
};
