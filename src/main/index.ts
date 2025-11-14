/**
 * Canvas AI - Electron Main Process
 * Manages Claude Code instances and IPC communication
 */

// Load environment variables from .env file
import * as dotenv from 'dotenv';
import * as path from 'path';

// In development, .env is in project root; in production, it's relative to app path
const envPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: envPath });

import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { AnthropicAgentManager } from './AnthropicAgentManager';
import { DatabaseService } from './DatabaseService';
import { ConfigManager } from './ConfigManager';

let mainWindow: BrowserWindow | null = null;
let agentManager: AnthropicAgentManager | null = null;
let dbService: DatabaseService | null = null;
let configManager: ConfigManager | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Initialize database service
  dbService = new DatabaseService();

  // Initialize config manager
  configManager = new ConfigManager();

  // Create agent manager with window, database, and config manager references
  agentManager = new AnthropicAgentManager(mainWindow, dbService, configManager);

  // Load the app
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    // Don't open DevTools by default - use Cmd+Option+I to open manually
  } else {
    // In production, index.html is in dist/ folder
    // __dirname is dist/main/main, so go up two levels to dist/
    mainWindow.loadFile(path.join(__dirname, '../../index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (agentManager) {
    agentManager.killAll();
  }
  if (dbService) {
    dbService.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('claude:spawn', async (_event, config: { name: string; cwd?: string; widgetId?: string; workspaceId?: string }) => {
  try {
    if (!agentManager) throw new Error('Agent manager not initialized');
    const instanceId = await agentManager.spawn({
      name: config.name,
      widgetId: config.widgetId,
      workspaceId: config.workspaceId
    });
    return { success: true, instanceId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('claude:kill', async (_event, instanceId: string) => {
  try {
    if (!agentManager) throw new Error('Agent manager not initialized');
    await agentManager.kill(instanceId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('claude:send-command', async (_event, instanceId: string, command: string) => {
  try {
    if (!agentManager) throw new Error('Agent manager not initialized');
    await agentManager.sendMessage(instanceId, command);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('claude:cancel', async (_event, instanceId: string) => {
  try {
    if (!agentManager) throw new Error('Agent manager not initialized');
    await agentManager.cancel(instanceId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.on('claude:subscribe-output', (event, instanceId: string) => {
  if (!agentManager) return;
  agentManager.onOutput(instanceId, (data: string) => {
    event.sender.send(`claude:output:${instanceId}`, data);
  });
});

ipcMain.handle('claude:list-instances', async () => {
  if (!agentManager) return [];
  return agentManager.listAgents();
});

// File system operations
ipcMain.handle('fs:list-directory', async (_event, dirPath: string) => {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    return {
      success: true,
      files: entries.map(entry => ({
        name: entry.name,
        path: path.join(dirPath, entry.name),
        type: entry.isDirectory() ? 'directory' : 'file',
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:read-file', async (_event, filePath: string) => {
  try {
    const fs = await import('fs/promises');
    const content = await fs.readFile(filePath, 'utf-8');
    return { success: true, content };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:write-file', async (_event, filePath: string, content: string) => {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    // Ensure parent directory exists
    const dirPath = path.dirname(filePath);
    await fs.mkdir(dirPath, { recursive: true });

    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:create-directory', async (_event, dirPath: string) => {
  try {
    const fs = await import('fs/promises');
    await fs.mkdir(dirPath, { recursive: true });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:delete-file', async (_event, filePath: string) => {
  try {
    const fs = await import('fs/promises');
    const stat = await fs.stat(filePath);

    if (stat.isDirectory()) {
      await fs.rm(filePath, { recursive: true, force: true });
    } else {
      await fs.unlink(filePath);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:rename-file', async (_event, oldPath: string, newPath: string) => {
  try {
    const fs = await import('fs/promises');
    await fs.rename(oldPath, newPath);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:get-cwd', async () => {
  try {
    return { success: true, cwd: process.cwd() };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Database operations
ipcMain.handle('db:get-workspace', async () => {
  try {
    if (!dbService) throw new Error('Database not initialized');
    const workspace = dbService.getDefaultWorkspace();
    return { success: true, workspace };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:save-workspace-state', async (_event, workspaceId: string, scale: number, pan: { x: number; y: number }) => {
  try {
    if (!dbService) throw new Error('Database not initialized');
    dbService.saveWorkspaceState(workspaceId, scale, pan);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:load-widgets', async (_event, workspaceId: string) => {
  try {
    if (!dbService) throw new Error('Database not initialized');
    const widgets = dbService.loadWidgets(workspaceId);
    return { success: true, widgets };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:save-widget', async (_event, workspaceId: string, widget: any) => {
  try {
    if (!dbService) throw new Error('Database not initialized');
    dbService.saveWidget(workspaceId, widget);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:delete-widget', async (_event, widgetId: string) => {
  try {
    if (!dbService) throw new Error('Database not initialized');
    dbService.deleteWidget(widgetId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Workspace management API
ipcMain.handle('workspace:get-all', async () => {
  try {
    if (!dbService) throw new Error('Database not initialized');
    const workspaces = dbService.getAllWorkspaces();
    return { success: true, workspaces };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('workspace:get', async (_event, workspaceId: string) => {
  try {
    if (!dbService) throw new Error('Database not initialized');
    const workspace = dbService.getWorkspace(workspaceId);
    return { success: true, workspace };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('workspace:create', async (_event, name: string) => {
  try {
    if (!dbService) throw new Error('Database not initialized');
    const workspace = dbService.createWorkspace(name);
    return { success: true, workspace };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('workspace:rename', async (_event, workspaceId: string, name: string) => {
  try {
    if (!dbService) throw new Error('Database not initialized');
    dbService.renameWorkspace(workspaceId, name);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('workspace:delete', async (_event, workspaceId: string) => {
  try {
    if (!dbService) throw new Error('Database not initialized');
    dbService.deleteWorkspace(workspaceId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('workspace:update-last-accessed', async (_event, workspaceId: string) => {
  try {
    if (!dbService) throw new Error('Database not initialized');
    dbService.updateLastAccessed(workspaceId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Config Management API
ipcMain.handle('config:get-api-key', async () => {
  try {
    if (!configManager) throw new Error('Config manager not initialized');
    const hasKey = await configManager.hasApiKey();
    const keyPreview = await configManager.getApiKeyPreview();
    return { success: true, hasKey, keyPreview };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('config:set-api-key', async (_event, key: string) => {
  try {
    if (!configManager) throw new Error('Config manager not initialized');
    const isValid = await configManager.validateApiKey(key);
    if (!isValid) {
      return { success: false, error: 'Invalid API key' };
    }
    await configManager.setApiKey(key);

    // Refresh agent manager to pick up the new API key
    if (agentManager) {
      await agentManager.refreshApiKey();
      console.log('[Main] API key refreshed in agent manager');
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('config:validate-api-key', async (_event, key: string) => {
  try {
    if (!configManager) throw new Error('Config manager not initialized');
    const isValid = await configManager.validateApiKey(key);
    return { success: true, isValid };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('config:remove-api-key', async () => {
  try {
    if (!configManager) throw new Error('Config manager not initialized');
    await configManager.removeApiKey();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('config:should-show-onboarding', async () => {
  try {
    if (!configManager) throw new Error('Config manager not initialized');
    const shouldShow = configManager.shouldShowOnboarding();
    const hasApiKey = await configManager.hasApiKey();
    return { success: true, shouldShow, hasApiKey };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('config:get-onboarding-status', async () => {
  try {
    if (!configManager) throw new Error('Config manager not initialized');
    const status = configManager.getOnboardingStatus();
    return { success: true, status };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('config:complete-onboarding', async () => {
  try {
    if (!configManager) throw new Error('Config manager not initialized');
    configManager.markOnboardingComplete();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('config:skip-onboarding', async () => {
  try {
    if (!configManager) throw new Error('Config manager not initialized');
    configManager.skipOnboarding();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('config:dismiss-reminder', async () => {
  try {
    if (!configManager) throw new Error('Config manager not initialized');
    configManager.dismissSetupReminder();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('config:get', async (_event, key: string) => {
  try {
    if (!configManager) throw new Error('Config manager not initialized');
    const value = configManager.get(key as any);
    return { success: true, value };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('config:set', async (_event, key: string, value: any) => {
  try {
    if (!configManager) throw new Error('Config manager not initialized');
    configManager.set(key as any, value);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('config:reset', async (_event, options?: { includeOnboarding?: boolean }) => {
  try {
    if (!configManager) throw new Error('Config manager not initialized');
    configManager.reset(options);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Shell operations
ipcMain.handle('shell:open-external', async (_event, url: string) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Command history API
ipcMain.handle('command-history:get-widget', async (_event, widgetId: string, limit: number = 50) => {
  try {
    if (!dbService) throw new Error('Database not initialized');
    const commands = dbService.getWidgetCommandHistory(widgetId, limit);
    return { success: true, commands };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('command-history:search', async (_event, workspaceId: string, searchTerm: string = '', limit: number = 50) => {
  try {
    if (!dbService) throw new Error('Database not initialized');
    const commands = dbService.searchCommands(workspaceId, searchTerm, limit);
    return { success: true, commands };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Settings API
ipcMain.handle('settings:get-api-key', async () => {
  try {
    const fs = await import('fs/promises');
    const os = await import('os');
    const path = await import('path');

    // Store API key in user's config directory
    const configDir = path.join(os.homedir(), '.canvas-ai');
    const configFile = path.join(configDir, 'config.json');

    try {
      const data = await fs.readFile(configFile, 'utf-8');
      const config = JSON.parse(data);
      return config.apiKey || null;
    } catch {
      // File doesn't exist or invalid JSON
      return null;
    }
  } catch (error: any) {
    console.error('[Settings] Failed to get API key:', error);
    return null;
  }
});

ipcMain.handle('settings:save-api-key', async (_event, apiKey: string) => {
  try {
    const fs = await import('fs/promises');
    const os = await import('os');
    const path = await import('path');

    // Store API key in user's config directory
    const configDir = path.join(os.homedir(), '.canvas-ai');
    const configFile = path.join(configDir, 'config.json');

    // Ensure config directory exists
    await fs.mkdir(configDir, { recursive: true });

    // Save config
    const config = { apiKey };
    await fs.writeFile(configFile, JSON.stringify(config, null, 2), 'utf-8');

    console.log('[Settings] API key saved to', configFile);
  } catch (error: any) {
    console.error('[Settings] Failed to save API key:', error);
    throw error;
  }
});

ipcMain.handle('db:clear-workspace', async (_event, workspaceId: string) => {
  try {
    if (!dbService) throw new Error('Database not initialized');
    dbService.clearWorkspace(workspaceId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:list-directory-recursive', async (_event, dirPath: string) => {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    const files: Array<{ name: string; path: string; type: string; relativePath: string }> = [];

    async function walkDirectory(currentPath: string, basePath: string) {
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          // Skip hidden files and common ignore patterns
          if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build') {
            continue;
          }

          const fullPath = path.join(currentPath, entry.name);
          const relativePath = path.relative(basePath, fullPath);

          if (entry.isDirectory()) {
            files.push({
              name: entry.name,
              path: fullPath,
              type: 'directory',
              relativePath,
            });
            // Recursively walk subdirectories
            await walkDirectory(fullPath, basePath);
          } else {
            files.push({
              name: entry.name,
              path: fullPath,
              type: 'file',
              relativePath,
            });
          }
        }
      } catch (error) {
        // Skip directories we can't read
        console.error(`Failed to read directory ${currentPath}:`, error);
      }
    }

    await walkDirectory(dirPath, dirPath);

    return {
      success: true,
      files,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
