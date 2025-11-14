/**
 * Canvas AI - Preload Script
 * Exposes safe IPC API to renderer process
 */

import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use ipcRenderer
contextBridge.exposeInMainWorld('claudeCode', {
  // Spawn a new Claude Code instance
  spawn: (config: { name: string; cwd?: string; widgetId?: string; workspaceId?: string }) => {
    return ipcRenderer.invoke('claude:spawn', config);
  },

  // Kill a Claude Code instance
  kill: (instanceId: string) => {
    return ipcRenderer.invoke('claude:kill', instanceId);
  },

  // Cancel current operation (but keep session alive)
  cancel: (instanceId: string) => {
    return ipcRenderer.invoke('claude:cancel', instanceId);
  },

  // Send command to Claude Code instance
  sendCommand: (instanceId: string, command: string) => {
    return ipcRenderer.invoke('claude:send-command', instanceId, command);
  },

  // Subscribe to output from Claude Code instance
  subscribeOutput: (instanceId: string, callback: (data: string) => void) => {
    const listener = (_event: any, data: string) => callback(data);
    ipcRenderer.on(`claude:output:${instanceId}`, listener);

    // Tell main process to start streaming
    ipcRenderer.send('claude:subscribe-output', instanceId);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(`claude:output:${instanceId}`, listener);
    };
  },

  // List all running instances
  listInstances: () => {
    return ipcRenderer.invoke('claude:list-instances');
  },

  // Listen for spawn-widget events
  onSpawnWidget: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('spawn-widget', listener);
    return () => {
      ipcRenderer.removeListener('spawn-widget', listener);
    };
  },

  // File system operations
  listDirectory: (dirPath: string) => {
    return ipcRenderer.invoke('fs:list-directory', dirPath);
  },

  readFile: (filePath: string) => {
    return ipcRenderer.invoke('fs:read-file', filePath);
  },

  writeFile: (filePath: string, content: string) => {
    return ipcRenderer.invoke('fs:write-file', filePath, content);
  },

  createDirectory: (dirPath: string) => {
    return ipcRenderer.invoke('fs:create-directory', dirPath);
  },

  deleteFile: (filePath: string) => {
    return ipcRenderer.invoke('fs:delete-file', filePath);
  },

  renameFile: (oldPath: string, newPath: string) => {
    return ipcRenderer.invoke('fs:rename-file', oldPath, newPath);
  },

  getCwd: () => {
    return ipcRenderer.invoke('fs:get-cwd');
  },

  listDirectoryRecursive: (dirPath: string) => {
    return ipcRenderer.invoke('fs:list-directory-recursive', dirPath);
  },

  // Database operations
  getWorkspace: () => {
    return ipcRenderer.invoke('db:get-workspace');
  },

  saveWorkspaceState: (workspaceId: string, scale: number, pan: { x: number; y: number }) => {
    return ipcRenderer.invoke('db:save-workspace-state', workspaceId, scale, pan);
  },

  loadWidgets: (workspaceId: string) => {
    return ipcRenderer.invoke('db:load-widgets', workspaceId);
  },

  saveWidget: (workspaceId: string, widget: any) => {
    return ipcRenderer.invoke('db:save-widget', workspaceId, widget);
  },

  deleteWidget: (widgetId: string) => {
    return ipcRenderer.invoke('db:delete-widget', widgetId);
  },

  clearWorkspace: (workspaceId: string) => {
    return ipcRenderer.invoke('db:clear-workspace', workspaceId);
  },

  // Settings
  getApiKey: () => {
    return ipcRenderer.invoke('settings:get-api-key');
  },

  saveApiKey: (apiKey: string) => {
    return ipcRenderer.invoke('settings:save-api-key', apiKey);
  },

  // Workspace management
  getAllWorkspaces: () => {
    return ipcRenderer.invoke('workspace:get-all');
  },

  getWorkspaceById: (workspaceId: string) => {
    return ipcRenderer.invoke('workspace:get', workspaceId);
  },

  createWorkspace: (name: string) => {
    return ipcRenderer.invoke('workspace:create', name);
  },

  renameWorkspace: (workspaceId: string, name: string) => {
    return ipcRenderer.invoke('workspace:rename', workspaceId, name);
  },

  deleteWorkspace: (workspaceId: string) => {
    return ipcRenderer.invoke('workspace:delete', workspaceId);
  },

  updateWorkspaceLastAccessed: (workspaceId: string) => {
    return ipcRenderer.invoke('workspace:update-last-accessed', workspaceId);
  },

  // Command history
  getWidgetCommandHistory: (widgetId: string, limit?: number) => {
    return ipcRenderer.invoke('command-history:get-widget', widgetId, limit);
  },

  searchCommands: (workspaceId: string, searchTerm?: string, limit?: number) => {
    return ipcRenderer.invoke('command-history:search', workspaceId, searchTerm, limit);
  },
});

// Expose config API
contextBridge.exposeInMainWorld('config', {
  // API Key Management
  getApiKey: () => ipcRenderer.invoke('config:get-api-key'),
  setApiKey: (key: string) => ipcRenderer.invoke('config:set-api-key', key),
  validateApiKey: (key: string) => ipcRenderer.invoke('config:validate-api-key', key),
  removeApiKey: () => ipcRenderer.invoke('config:remove-api-key'),

  // Onboarding
  shouldShowOnboarding: () => ipcRenderer.invoke('config:should-show-onboarding'),
  getOnboardingStatus: () => ipcRenderer.invoke('config:get-onboarding-status'),
  completeOnboarding: () => ipcRenderer.invoke('config:complete-onboarding'),
  skipOnboarding: () => ipcRenderer.invoke('config:skip-onboarding'),
  dismissReminder: () => ipcRenderer.invoke('config:dismiss-reminder'),

  // General Config
  get: (key: string) => ipcRenderer.invoke('config:get', key),
  set: (key: string, value: any) => ipcRenderer.invoke('config:set', key, value),
  reset: (options?: any) => ipcRenderer.invoke('config:reset', options),
});

// Expose shell API
contextBridge.exposeInMainWorld('shell', {
  openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url),
});

// TypeScript declaration for the exposed API
declare global {
  interface Window {
    shell: {
      openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
    };
    config: {
      // API Key Management
      getApiKey: () => Promise<{ success: boolean; hasKey: boolean; keyPreview: string | null; error?: string }>;
      setApiKey: (key: string) => Promise<{ success: boolean; error?: string }>;
      validateApiKey: (key: string) => Promise<{ valid: boolean; error?: string }>;
      removeApiKey: () => Promise<{ success: boolean; error?: string }>;
      // Onboarding
      shouldShowOnboarding: () => Promise<{ success: boolean; shouldShow: boolean; hasApiKey?: boolean; error?: string }>;
      getOnboardingStatus: () => Promise<{ success: boolean; status?: { completed: boolean; skipped: boolean; timestamp: number }; error?: string }>;
      completeOnboarding: () => Promise<{ success: boolean; error?: string }>;
      skipOnboarding: () => Promise<{ success: boolean; error?: string }>;
      dismissReminder: () => Promise<{ success: boolean; error?: string }>;
      // General Config
      get: (key: string) => Promise<{ success: boolean; value: any; error?: string }>;
      set: (key: string, value: any) => Promise<{ success: boolean; error?: string }>;
      reset: (options?: any) => Promise<{ success: boolean; error?: string }>;
    };
    claudeCode: {
      spawn: (config: { name: string; cwd?: string; widgetId?: string; workspaceId?: string }) => Promise<{ success: boolean; instanceId?: string; error?: string }>;
      kill: (instanceId: string) => Promise<{ success: boolean; error?: string }>;
      cancel: (instanceId: string) => Promise<{ success: boolean; error?: string }>;
      sendCommand: (instanceId: string, command: string) => Promise<{ success: boolean; error?: string }>;
      subscribeOutput: (instanceId: string, callback: (data: string) => void) => () => void;
      listInstances: () => Promise<Array<{ id: string; name: string; pid?: number; status: string; cwd: string }>>;
      onSpawnWidget: (callback: (data: { type: string; name: string; initialContent?: string; path?: string }) => void) => () => void;
      listDirectory: (dirPath: string) => Promise<{ success: boolean; files?: Array<{ name: string; path: string; type: string }>; error?: string }>;
      readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
      writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
      createDirectory: (dirPath: string) => Promise<{ success: boolean; error?: string }>;
      deleteFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
      renameFile: (oldPath: string, newPath: string) => Promise<{ success: boolean; error?: string }>;
      getCwd: () => Promise<{ success: boolean; cwd?: string; error?: string }>;
      listDirectoryRecursive: (dirPath: string) => Promise<{ success: boolean; files?: Array<{ name: string; path: string; type: string; relativePath: string }>; error?: string }>;
      getWorkspace: () => Promise<{ success: boolean; workspace?: any; error?: string }>;
      saveWorkspaceState: (workspaceId: string, scale: number, pan: { x: number; y: number }) => Promise<{ success: boolean; error?: string }>;
      loadWidgets: (workspaceId: string) => Promise<{ success: boolean; widgets?: any[]; error?: string }>;
      saveWidget: (workspaceId: string, widget: any) => Promise<{ success: boolean; error?: string }>;
      deleteWidget: (widgetId: string) => Promise<{ success: boolean; error?: string }>;
      clearWorkspace: (workspaceId: string) => Promise<{ success: boolean; error?: string }>;
      getApiKey: () => Promise<string | null>;
      saveApiKey: (apiKey: string) => Promise<void>;
      getAllWorkspaces: () => Promise<{ success: boolean; workspaces?: any[]; error?: string }>;
      getWorkspaceById: (workspaceId: string) => Promise<{ success: boolean; workspace?: any; error?: string }>;
      createWorkspace: (name: string) => Promise<{ success: boolean; workspace?: any; error?: string }>;
      renameWorkspace: (workspaceId: string, name: string) => Promise<{ success: boolean; error?: string }>;
      deleteWorkspace: (workspaceId: string) => Promise<{ success: boolean; error?: string }>;
      updateWorkspaceLastAccessed: (workspaceId: string) => Promise<{ success: boolean; error?: string }>;
      getWidgetCommandHistory: (widgetId: string, limit?: number) => Promise<{ success: boolean; commands?: string[]; error?: string }>;
      searchCommands: (workspaceId: string, searchTerm?: string, limit?: number) => Promise<{ success: boolean; commands?: string[]; error?: string }>;
    };
  }
}
