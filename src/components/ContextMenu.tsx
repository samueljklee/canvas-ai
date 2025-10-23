/**
 * Workspace Canvas - Context Menu Component
 * Right-click context menu with widget actions
 */

import React, { useEffect, useRef } from 'react';
import { AgentWidgetData, ContextMenuAction } from '../types/widget';
import '../styles/ContextMenu.css';

interface ContextMenuProps {
  x: number;
  y: number;
  widget: AgentWidgetData;
  onClose: () => void;
  onAction: (action: string) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  widget,
  onClose,
  onAction,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const actions: ContextMenuAction[] = [
    {
      id: 'stop',
      label: 'Stop',
      disabled: widget.status !== 'running',
      action: () => onAction('stop'),
    },
    {
      id: 'resume',
      label: 'Resume',
      disabled: widget.status !== 'paused',
      action: () => onAction('resume'),
    },
    {
      id: 'separator-1',
      label: '',
      action: () => {},
    },
    {
      id: 'worktree',
      label: 'Open Worktree',
      action: () => onAction('worktree'),
    },
    {
      id: 'separator-2',
      label: '',
      action: () => {},
    },
    {
      id: 'minimize',
      label: 'Minimize',
      disabled: widget.state === 'minimized',
      action: () => onAction('minimize'),
    },
    {
      id: 'compact',
      label: 'Compact',
      disabled: widget.state === 'compact',
      action: () => onAction('compact'),
    },
    {
      id: 'expand',
      label: 'Expand',
      disabled: widget.state === 'expanded',
      action: () => onAction('expand'),
    },
    {
      id: 'separator-3',
      label: '',
      action: () => {},
    },
    {
      id: 'close',
      label: 'Close Widget',
      icon: '✕',
      action: () => onAction('close'),
    },
  ];

  const handleActionClick = (action: ContextMenuAction) => {
    if (action.disabled || action.id.startsWith('separator')) return;
    action.action();
  };

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        position: 'fixed',
        left: x,
        top: y,
      }}
    >
      {actions.map((action) =>
        action.id.startsWith('separator') ? (
          <div key={action.id} className="context-menu-separator" />
        ) : (
          <button
            key={action.id}
            className={`context-menu-item ${action.disabled ? 'context-menu-item--disabled' : ''}`}
            onClick={() => handleActionClick(action)}
            disabled={action.disabled}
          >
            {action.icon && <span className="context-menu-icon">{action.icon}</span>}
            <span className="context-menu-label">{action.label}</span>
          </button>
        )
      )}
    </div>
  );
};
