/**
 * Keyboard Shortcuts Configuration System
 * Allows users to customize keyboard shortcuts
 */

export interface ShortcutConfig {
  id: string;
  keys: string[];
  description: string;
  category: string;
  action: string; // Action identifier
  modifiers: {
    cmd?: boolean;
    shift?: boolean;
    alt?: boolean;
    ctrl?: boolean;
  };
  key: string; // The main key (letter, number, or special key)
}

export const DEFAULT_SHORTCUTS: Record<string, ShortcutConfig> = {
  'show-shortcuts': {
    id: 'show-shortcuts',
    keys: ['⌘', 'K'],
    description: 'Show keyboard shortcuts',
    category: 'Workspace',
    action: 'show-shortcuts',
    modifiers: { cmd: true },
    key: 'k',
  },
  'create-widget': {
    id: 'create-widget',
    keys: ['⌘', 'N'],
    description: 'Create new widget',
    category: 'Workspace',
    action: 'create-widget',
    modifiers: { cmd: true },
    key: 'n',
  },
  'close-widget': {
    id: 'close-widget',
    keys: ['⌘', 'W'],
    description: 'Close focused widget',
    category: 'Workspace',
    action: 'close-widget',
    modifiers: { cmd: true },
    key: 'w',
  },
  'save-document': {
    id: 'save-document',
    keys: ['⌘', 'S'],
    description: 'Save current document',
    category: 'Workspace',
    action: 'save-document',
    modifiers: { cmd: true },
    key: 's',
  },
  'expand-widget': {
    id: 'expand-widget',
    keys: ['⌘', '↑'],
    description: 'Expand widget',
    category: 'Navigation',
    action: 'expand-widget',
    modifiers: { cmd: true },
    key: 'ArrowUp',
  },
  'minimize-widget': {
    id: 'minimize-widget',
    keys: ['⌘', '↓'],
    description: 'Minimize widget',
    category: 'Navigation',
    action: 'minimize-widget',
    modifiers: { cmd: true },
    key: 'ArrowDown',
  },
  'zoom-in': {
    id: 'zoom-in',
    keys: ['⌘', '+'],
    description: 'Zoom in',
    category: 'Canvas',
    action: 'zoom-in',
    modifiers: { cmd: true },
    key: '=',
  },
  'zoom-out': {
    id: 'zoom-out',
    keys: ['⌘', '-'],
    description: 'Zoom out',
    category: 'Canvas',
    action: 'zoom-out',
    modifiers: { cmd: true },
    key: '-',
  },
  'reset-zoom': {
    id: 'reset-zoom',
    keys: ['⌘', '0'],
    description: 'Reset zoom',
    category: 'Canvas',
    action: 'reset-zoom',
    modifiers: { cmd: true },
    key: '0',
  },
  'auto-arrange': {
    id: 'auto-arrange',
    keys: ['⌘', 'Shift', 'A'],
    description: 'Auto-arrange widgets',
    category: 'Canvas',
    action: 'auto-arrange',
    modifiers: { cmd: true, shift: true },
    key: 'a',
  },
};

const STORAGE_KEY = 'workspace-keyboard-shortcuts';

export class KeyboardShortcutsManager {
  private shortcuts: Record<string, ShortcutConfig>;

  constructor() {
    this.shortcuts = this.loadShortcuts();
  }

  private loadShortcuts(): Record<string, ShortcutConfig> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load shortcuts:', e);
    }
    return { ...DEFAULT_SHORTCUTS };
  }

  saveShortcuts() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.shortcuts));
    } catch (e) {
      console.error('Failed to save shortcuts:', e);
    }
  }

  getShortcut(id: string): ShortcutConfig | undefined {
    return this.shortcuts[id];
  }

  getAllShortcuts(): ShortcutConfig[] {
    return Object.values(this.shortcuts);
  }

  updateShortcut(id: string, config: Partial<ShortcutConfig>) {
    if (this.shortcuts[id]) {
      this.shortcuts[id] = { ...this.shortcuts[id], ...config };
      this.saveShortcuts();
    }
  }

  resetToDefaults() {
    this.shortcuts = { ...DEFAULT_SHORTCUTS };
    this.saveShortcuts();
  }

  matchesEvent(shortcutId: string, event: KeyboardEvent): boolean {
    const config = this.shortcuts[shortcutId];
    if (!config) return false;

    const cmd = event.metaKey || event.ctrlKey;
    const shift = event.shiftKey;
    const alt = event.altKey;

    return (
      event.key.toLowerCase() === config.key.toLowerCase() &&
      (config.modifiers.cmd === cmd || (!config.modifiers.cmd && !cmd)) &&
      (config.modifiers.shift === shift || (!config.modifiers.shift && !shift)) &&
      (config.modifiers.alt === alt || (!config.modifiers.alt && !alt))
    );
  }

  // Format shortcut for display
  formatKeys(config: ShortcutConfig): string[] {
    const keys: string[] = [];

    if (config.modifiers.cmd) keys.push('⌘');
    if (config.modifiers.shift) keys.push('Shift');
    if (config.modifiers.alt) keys.push('Alt');

    // Format the main key
    const keyMap: Record<string, string> = {
      'ArrowUp': '↑',
      'ArrowDown': '↓',
      'ArrowLeft': '←',
      'ArrowRight': '→',
      '=': '+',
    };

    keys.push(keyMap[config.key] || config.key.toUpperCase());

    return keys;
  }
}

export const shortcutsManager = new KeyboardShortcutsManager();
