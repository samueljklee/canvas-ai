/**
 * Workspace Canvas - File Browser Component
 * Interactive file/directory browser with tree view
 */

import React, { useState, useEffect } from 'react';
import { AgentWidgetData } from '../types/widget';
import '../styles/FileBrowser.css';

interface FileBrowserProps {
  widget: AgentWidgetData;
  onPathChange?: (path: string) => void;
  onFileOpen?: (filePath: string, fileName: string) => void;
  onStateUpdate?: (state: any) => void;
}

interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileEntry[];
  expanded?: boolean;
}

type ViewMode = 'list' | 'tile';

export const FileBrowser: React.FC<FileBrowserProps> = ({ widget, onPathChange, onFileOpen, onStateUpdate }) => {
  const [currentPath, setCurrentPath] = useState(widget.path || '/');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState<'file' | 'folder' | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; entry: FileEntry } | null>(null);
  const [renamingEntry, setRenamingEntry] = useState<FileEntry | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isEditingPath, setIsEditingPath] = useState(false);
  const [pathInputValue, setPathInputValue] = useState(currentPath);
  const [pathSuggestions, setPathSuggestions] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(
    (widget.widgetState?.fileBrowserViewMode as ViewMode) || 'list'
  );

  // Persist view mode changes
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    onStateUpdate?.({
      ...widget.widgetState,
      fileBrowserViewMode: mode,
    });
  };

  // Load directory contents from real file system
  useEffect(() => {
    const loadDirectory = async () => {
      if (!window.claudeCode) {
        console.error('claudeCode API not available');
        return;
      }

      setLoading(true);
      try {
        const result = await window.claudeCode.listDirectory(currentPath);

        if (result.success && result.files) {
          const fileEntries: FileEntry[] = result.files.map(file => ({
            name: file.name,
            path: file.path,
            type: file.type as 'file' | 'directory',
            expanded: false,
          }));
          setFiles(fileEntries);
        } else {
          console.error('Failed to list directory:', result.error);
          setFiles([]);
        }
      } catch (error) {
        console.error('Failed to load directory:', error);
        setFiles([]);
      } finally {
        setLoading(false);
      }
    };

    loadDirectory();
  }, [currentPath, refreshKey]);

  const handleEntryClick = (entry: FileEntry) => {
    if (entry.type === 'directory') {
      setCurrentPath(entry.path);
      onPathChange?.(entry.path);
    } else {
      setSelectedPath(entry.path);
    }
  };

  const handleEntryDoubleClick = (entry: FileEntry) => {
    if (entry.type === 'directory') {
      setCurrentPath(entry.path);
      onPathChange?.(entry.path);
    } else {
      // Open file in Monaco editor
      onFileOpen?.(entry.path, entry.name);
    }
  };

  const handleBack = () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    setCurrentPath(parentPath);
    onPathChange?.(parentPath);
  };

  const handleCreateFile = async () => {
    if (!newItemName.trim() || !window.claudeCode) return;

    try {
      const filePath = `${currentPath}/${newItemName}`;
      const result = await window.claudeCode.writeFile(filePath, '');

      if (result.success) {
        // Refresh directory by incrementing refresh key
        setRefreshKey(prev => prev + 1);
        setIsCreating(null);
        setNewItemName('');

        // Open the new file in editor
        onFileOpen?.(filePath, newItemName);
      } else {
        alert(`Failed to create file: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to create file:', error);
      alert(`Error creating file: ${error}`);
    }
  };

  const handleCreateFolder = async () => {
    if (!newItemName.trim() || !window.claudeCode) return;

    try {
      const folderPath = `${currentPath}/${newItemName}`;
      const result = await window.claudeCode.createDirectory(folderPath);

      if (result.success) {
        // Refresh directory by incrementing refresh key
        setRefreshKey(prev => prev + 1);
        setIsCreating(null);
        setNewItemName('');
      } else {
        alert(`Failed to create folder: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
      alert(`Error creating folder: ${error}`);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating === 'file') {
      handleCreateFile();
    } else if (isCreating === 'folder') {
      handleCreateFolder();
    }
  };

  const handleContextMenu = (e: React.MouseEvent, entry: FileEntry) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, entry });
  };

  const handleRename = async () => {
    if (!contextMenu || !window.claudeCode) return;

    setRenamingEntry(contextMenu.entry);
    setRenameValue(contextMenu.entry.name);
    setContextMenu(null);
  };

  const handleRenameSubmit = async () => {
    if (!renamingEntry || !renameValue.trim() || !window.claudeCode) return;

    // Don't rename if name hasn't changed
    if (renameValue === renamingEntry.name) {
      setRenamingEntry(null);
      setRenameValue('');
      return;
    }

    try {
      const oldPath = renamingEntry.path;
      const newPath = `${currentPath}/${renameValue}`;

      // Use the rename IPC handler
      const result = await window.claudeCode.renameFile(oldPath, newPath);

      if (result.success) {
        setRenamingEntry(null);
        setRenameValue('');
        setRefreshKey(prev => prev + 1);
      } else {
        alert(`Failed to rename: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to rename:', error);
      alert(`Error renaming: ${error}`);
    }
  };

  const handleDelete = async () => {
    if (!contextMenu || !window.claudeCode) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${contextMenu.entry.name}"?`
    );

    if (!confirmDelete) {
      setContextMenu(null);
      return;
    }

    try {
      const result = await window.claudeCode.deleteFile(contextMenu.entry.path);

      if (result.success) {
        setContextMenu(null);
        setRefreshKey(prev => prev + 1);
      } else {
        alert(`Failed to delete: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      alert(`Error deleting: ${error}`);
    }
  };

  const handleNewFile = () => {
    setContextMenu(null);
    setIsCreating('file');
    setNewItemName('');
  };

  const handleNewFolder = () => {
    setContextMenu(null);
    setIsCreating('folder');
    setNewItemName('');
  };

  const handlePathEdit = () => {
    setIsEditingPath(true);
    setPathInputValue(currentPath);
    setPathSuggestions([]);
  };

  const handlePathSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!window.claudeCode || !pathInputValue.trim()) {
      setIsEditingPath(false);
      return;
    }

    try {
      // Check if path exists and is a directory
      const result = await window.claudeCode.listDirectory(pathInputValue.trim());

      if (result.success) {
        setCurrentPath(pathInputValue.trim());
        onPathChange?.(pathInputValue.trim());
        setIsEditingPath(false);
        setPathSuggestions([]);
      } else {
        alert(`Invalid path: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to navigate to path:', error);
      alert(`Failed to navigate: ${error}`);
    }
  };

  const handlePathInputChange = async (value: string) => {
    setPathInputValue(value);

    // Generate autocomplete suggestions
    if (!window.claudeCode || !value.trim()) {
      setPathSuggestions([]);
      return;
    }

    try {
      // Get the directory part of the path
      const lastSlash = value.lastIndexOf('/');
      const dirPath = lastSlash > 0 ? value.substring(0, lastSlash) : '/';
      const partial = lastSlash >= 0 ? value.substring(lastSlash + 1) : value;

      // List directory
      const result = await window.claudeCode.listDirectory(dirPath);

      if (result.success && result.files) {
        // Filter directories that match the partial input
        const suggestions = result.files
          .filter(file =>
            file.type === 'directory' &&
            file.name.toLowerCase().startsWith(partial.toLowerCase())
          )
          .map(file => `${dirPath}${dirPath.endsWith('/') ? '' : '/'}${file.name}`)
          .slice(0, 5); // Limit to 5 suggestions

        setPathSuggestions(suggestions);
      }
    } catch (error) {
      console.error('Failed to get autocomplete suggestions:', error);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPathInputValue(suggestion);
    setPathSuggestions([]);
  };

  if (widget.state === 'minimized') {
    return (
      <div className="file-browser file-browser--minimized">
        <span className="file-browser-path-mini">📁 {currentPath}</span>
      </div>
    );
  }

  return (
    <div className="file-browser">
      <div className="file-browser-toolbar">
        <button
          className="file-browser-back-btn"
          onClick={handleBack}
          disabled={currentPath === '/'}
        >
          ← Back
        </button>
        {isEditingPath ? (
          <form className="file-browser-path-form" onSubmit={handlePathSubmit}>
            <input
              type="text"
              className="file-browser-path-input"
              value={pathInputValue}
              onChange={(e) => handlePathInputChange(e.target.value)}
              onBlur={() => {
                // Delay to allow suggestion click
                setTimeout(() => {
                  if (pathSuggestions.length === 0) {
                    setIsEditingPath(false);
                  }
                }, 200);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsEditingPath(false);
                  setPathSuggestions([]);
                }
              }}
              autoFocus
              placeholder="Enter directory path..."
            />
            {pathSuggestions.length > 0 && (
              <div className="file-browser-path-suggestions">
                {pathSuggestions.map((suggestion, i) => (
                  <div
                    key={i}
                    className="file-browser-path-suggestion"
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent blur
                      handleSuggestionClick(suggestion);
                    }}
                  >
                    📁 {suggestion}
                  </div>
                ))}
              </div>
            )}
          </form>
        ) : (
          <div
            className="file-browser-path"
            title={`${currentPath}\n\nClick to edit path`}
            onClick={handlePathEdit}
          >
            📁 {currentPath}
          </div>
        )}
        <div className="file-browser-actions">
          <button
            className={`file-browser-view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => handleViewModeChange('list')}
            title="List view"
          >
            ☰
          </button>
          <button
            className={`file-browser-view-btn ${viewMode === 'tile' ? 'active' : ''}`}
            onClick={() => handleViewModeChange('tile')}
            title="Tile view"
          >
            ▦
          </button>
          <div className="file-browser-actions-divider" />
          <button
            className="file-browser-action-btn"
            onClick={() => {
              setIsCreating('file');
              setNewItemName('');
            }}
            title="Create new file"
          >
            📄+
          </button>
          <button
            className="file-browser-action-btn"
            onClick={() => {
              setIsCreating('folder');
              setNewItemName('');
            }}
            title="Create new folder"
          >
            📁+
          </button>
          <button className="file-browser-refresh-btn" onClick={() => setRefreshKey(prev => prev + 1)}>
            ↻
          </button>
        </div>
      </div>

      {isCreating && (
        <form className="file-browser-create-form" onSubmit={handleCreateSubmit}>
          <input
            type="text"
            className="file-browser-create-input"
            placeholder={`Enter ${isCreating} name...`}
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            autoFocus
          />
          <button type="submit" className="file-browser-create-submit" disabled={!newItemName.trim()}>
            Create
          </button>
          <button
            type="button"
            className="file-browser-create-cancel"
            onClick={() => {
              setIsCreating(null);
              setNewItemName('');
            }}
          >
            Cancel
          </button>
        </form>
      )}

      <div className="file-browser-content">
        {loading ? (
          <div className="file-browser-loading">Loading...</div>
        ) : files.length === 0 ? (
          <div className="file-browser-empty">Empty directory</div>
        ) : viewMode === 'list' ? (
          <div className="file-browser-list">
            {files.map((entry) => (
              <div
                key={entry.path}
                className={`file-browser-item ${
                  selectedPath === entry.path ? 'file-browser-item--selected' : ''
                } ${entry.type === 'directory' ? 'file-browser-item--directory' : ''}`}
                onClick={() => handleEntryClick(entry)}
                onDoubleClick={() => handleEntryDoubleClick(entry)}
                onContextMenu={(e) => handleContextMenu(e, entry)}
              >
                <span className="file-browser-item-icon">
                  {entry.type === 'directory' ? '📁' : '📄'}
                </span>
                {renamingEntry?.path === entry.path ? (
                  <input
                    type="text"
                    className="file-browser-rename-input"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={handleRenameSubmit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameSubmit();
                      if (e.key === 'Escape') {
                        setRenamingEntry(null);
                        setRenameValue('');
                      }
                    }}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="file-browser-item-name">{entry.name.replace(/^📁 |^📄 /, '')}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="file-browser-tiles">
            {files.map((entry) => (
              <div
                key={entry.path}
                className={`file-browser-tile ${
                  selectedPath === entry.path ? 'file-browser-tile--selected' : ''
                } ${entry.type === 'directory' ? 'file-browser-tile--directory' : ''}`}
                onClick={() => handleEntryClick(entry)}
                onDoubleClick={() => handleEntryDoubleClick(entry)}
                onContextMenu={(e) => handleContextMenu(e, entry)}
              >
                <div className="file-browser-tile-icon">
                  {entry.type === 'directory' ? '📁' : '📄'}
                </div>
                {renamingEntry?.path === entry.path ? (
                  <input
                    type="text"
                    className="file-browser-rename-input"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={handleRenameSubmit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameSubmit();
                      if (e.key === 'Escape') {
                        setRenamingEntry(null);
                        setRenameValue('');
                      }
                    }}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="file-browser-tile-name" title={entry.name}>
                    {entry.name.replace(/^📁 |^📄 /, '')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedPath && (
        <div className="file-browser-footer">
          <span className="file-browser-selected">{selectedPath}</span>
        </div>
      )}

      {contextMenu && (
        <>
          <div
            className="file-browser-context-menu-overlay"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="file-browser-context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {contextMenu.entry.type === 'file' && (
              <>
                <div
                  className="file-browser-context-menu-item"
                  onClick={() => {
                    onFileOpen?.(contextMenu.entry.path, contextMenu.entry.name);
                    setContextMenu(null);
                  }}
                >
                  📂 Open
                </div>
                <div className="file-browser-context-menu-divider" />
              </>
            )}
            <div className="file-browser-context-menu-item" onClick={handleRename}>
              ✏️ Rename
            </div>
            <div className="file-browser-context-menu-item" onClick={handleDelete}>
              🗑️ Delete
            </div>
            <div className="file-browser-context-menu-divider" />
            <div className="file-browser-context-menu-item" onClick={handleNewFile}>
              📄 New File
            </div>
            <div className="file-browser-context-menu-item" onClick={handleNewFolder}>
              📁 New Folder
            </div>
          </div>
        </>
      )}
    </div>
  );
};
