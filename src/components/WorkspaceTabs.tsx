/**
 * Canvas AI - Workspace Tabs Component
 * Browser-style tabs for switching between workspaces
 */

import React, { useState, useRef } from 'react';
import '../styles/WorkspaceTabs.css';

interface Workspace {
  id: string;
  name: string;
  created_at: number;
  last_accessed: number;
}

interface WorkspaceTabsProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onSwitch: (workspaceId: string) => void;
  onCreate: () => void;
  onRename: (workspaceId: string, name: string) => void;
  onDelete: (workspaceId: string) => void;
}

export const WorkspaceTabs: React.FC<WorkspaceTabsProps> = ({
  workspaces,
  activeWorkspaceId,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDoubleClick = (workspace: Workspace) => {
    setEditingId(workspace.id);
    setEditValue(workspace.name);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleRenameSubmit = () => {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  const handleCloseClick = (e: React.MouseEvent, workspaceId: string) => {
    e.stopPropagation();

    if (workspaces.length === 1) {
      alert('Cannot close the last workspace');
      return;
    }

    if (confirm('Close this workspace? All widgets will be saved.')) {
      onDelete(workspaceId);
    }
  };

  return (
    <div className="workspace-tabs">
      <div className="workspace-tabs-list">
        {workspaces.map((workspace, index) => (
          <div
            key={workspace.id}
            className={`workspace-tab ${activeWorkspaceId === workspace.id ? 'active' : ''}`}
            onClick={() => onSwitch(workspace.id)}
            onDoubleClick={() => handleDoubleClick(workspace)}
          >
            {editingId === workspace.id ? (
              <input
                ref={inputRef}
                type="text"
                className="workspace-tab-input"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={handleRenameKeyDown}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <span className="workspace-tab-name" title={workspace.name}>
                  {workspace.name}
                </span>
                <button
                  className="workspace-tab-close"
                  onClick={(e) => handleCloseClick(e, workspace.id)}
                  title="Close workspace"
                >
                  ×
                </button>
              </>
            )}
            {index < 9 && (
              <span className="workspace-tab-shortcut">⌘{index + 1}</span>
            )}
          </div>
        ))}

        <button
          className="workspace-tab-new"
          onClick={onCreate}
          title="New workspace (⌘T)"
        >
          +
        </button>
      </div>
    </div>
  );
};
