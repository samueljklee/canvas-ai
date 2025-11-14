/**
 * Canvas AI - Widget Header Component
 * Header with title, status indicator, and controls
 */

import React, { useState, useRef, useEffect } from 'react';
import { AgentWidgetData, WidgetState, STATUS_COLORS } from '../types/widget';
import '../styles/WidgetHeader.css';

interface WidgetHeaderProps {
  widget: AgentWidgetData;
  isSelected: boolean;
  onStateChange: (state: WidgetState) => void;
  onRename?: (newName: string) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onClose?: () => void;
}

export const WidgetHeader: React.FC<WidgetHeaderProps> = ({
  widget,
  isSelected,
  onStateChange,
  onRename,
  onMouseDown,
  onClose,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(widget.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleNameDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditedName(widget.name);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedName(e.target.value);
  };

  const handleNameBlur = () => {
    if (editedName.trim() && editedName !== widget.name) {
      onRename?.(editedName.trim());
    }
    setIsEditing(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (editedName.trim() && editedName !== widget.name) {
        onRename?.(editedName.trim());
      }
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditedName(widget.name);
    }
  };
  const handleControlClick = (e: React.MouseEvent, state: WidgetState) => {
    e.stopPropagation();
    onStateChange(state);
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose?.();
  };

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    // Don't start drag if clicking on control buttons or editing input
    const target = e.target as HTMLElement;
    if (target.closest('.widget-header-controls') || target.closest('.widget-title-input')) {
      return;
    }
    onMouseDown?.(e);
  };

  return (
    <div
      className="widget-header"
      onMouseDown={handleHeaderMouseDown}
    >
      <div className="widget-header-left">
        <div
          className="widget-status-indicator"
          style={{
            backgroundColor: STATUS_COLORS[widget.status],
            boxShadow: isSelected
              ? `0 0 8px ${STATUS_COLORS[widget.status]}`
              : 'none',
          }}
          title={widget.status}
        />
        {/* Widget type icon */}
        {widget.type && widget.type !== 'agent' && (
          <span className="widget-type-icon" title={widget.type}>
            {widget.type === 'document' ? '📄' : widget.type === 'filebrowser' ? '📁' : '🤖'}
          </span>
        )}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className="widget-title-input"
            value={editedName}
            onChange={handleNameChange}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : (
          <h3 className="widget-title" onDoubleClick={handleNameDoubleClick} title="Double-click to rename">
            {widget.name}
          </h3>
        )}
      </div>

      <div className="widget-header-controls">
        {widget.state !== 'compact' && (
          <button
            className="widget-control-btn"
            onClick={(e) => handleControlClick(e, 'compact')}
            title="Minimize (Compact View)"
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        )}

        {widget.state !== 'expanded' && (
          <button
            className="widget-control-btn"
            onClick={(e) => handleControlClick(e, 'expanded')}
            title="Maximize (Full View)"
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect x="1" y="1" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <line x1="1" y1="4" x2="11" y2="4" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        )}

        <button
          className="widget-control-btn widget-control-btn--close"
          onClick={handleCloseClick}
          title="Close Widget"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <line x1="3" y1="3" x2="9" y2="9" stroke="currentColor" strokeWidth="2" />
            <line x1="9" y1="3" x2="3" y2="9" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </div>
    </div>
  );
};
