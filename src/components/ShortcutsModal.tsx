/**
 * Workspace Canvas - Keyboard Shortcuts Modal
 * Shows all available keyboard shortcuts
 */

import React, { useEffect } from 'react';
import '../styles/ShortcutsModal.css';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Static shortcuts list (no longer editable)
  const staticShortcuts = [
    { category: 'General', description: 'Command Palette', keys: ['⌘', 'K'] },
    { category: 'General', description: 'Command Palette (Alt)', keys: ['⌘', '⇧', 'P'] },
    { category: 'General', description: 'Save Workspace', keys: ['⌘', 'S'] },

    { category: 'Widget Actions', description: 'New Agent', keys: ['⌘', 'N'] },
    { category: 'Widget Actions', description: 'Close Widget', keys: ['⌘', 'W'] },
    { category: 'Widget Actions', description: 'Expand Widget', keys: ['⌘', '↑'] },
    { category: 'Widget Actions', description: 'Minimize Widget', keys: ['⌘', '↓'] },

    { category: 'View', description: 'Auto-arrange Widgets', keys: ['⌘', 'A'] },
    { category: 'View', description: 'Zoom In', keys: ['⌘', '+'] },
    { category: 'View', description: 'Zoom Out', keys: ['⌘', '-'] },
    { category: 'View', description: 'Reset Zoom', keys: ['⌘', '0'] },

    { category: 'Navigation', description: 'Deselect Widget', keys: ['Esc'] },
  ];

  const categories = Array.from(new Set(staticShortcuts.map(s => s.category)));

  return (
    <>
      <div className="shortcuts-modal-overlay" onClick={onClose} />
      <div className="shortcuts-modal">
        <div className="shortcuts-modal-header">
          <h2>Keyboard Shortcuts</h2>
          <button className="shortcuts-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="shortcuts-modal-content">
          {categories.map(category => (
            <div key={category} className="shortcuts-category">
              <h3 className="shortcuts-category-title">{category}</h3>
              <div className="shortcuts-list">
                {staticShortcuts.filter(s => s.category === category).map((shortcut, idx) => (
                  <div key={idx} className="shortcut-item">
                    <div className="shortcut-description">{shortcut.description}</div>
                    <div className="shortcut-keys">
                      {shortcut.keys.map((key, i) => (
                        <React.Fragment key={i}>
                          <kbd className="shortcut-key">{key}</kbd>
                          {i < shortcut.keys.length - 1 && <span className="shortcut-plus">+</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="shortcuts-modal-footer">
          <p>Press <kbd>Esc</kbd> to close • Access via Command Palette (⌘K)</p>
        </div>
      </div>
    </>
  );
};
