/**
 * TypeScript declarations for Electron IPC API
 */

interface ConfigAPI {
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
  reset: (options?: { includeOnboarding?: boolean }) => Promise<{ success: boolean; error?: string }>;
}

interface ClaudeCodeAPI {
  spawn: (config: { name: string; cwd?: string; widgetId?: string; workspaceId?: string }) => Promise<{ success: boolean; instanceId?: string; error?: string }>;
  kill: (instanceId: string) => Promise<{ success: boolean; error?: string }>;
  cancel: (instanceId: string) => Promise<{ success: boolean; error?: string }>;
  sendCommand: (instanceId: string, command: string) => Promise<{ success: boolean; error?: string }>;
  subscribeOutput: (instanceId: string, callback: (data: string) => void) => () => void;
  listInstances: () => Promise<Array<{ id: string; name: string; pid?: number; status: string; cwd: string }>>;

  // Settings
  getApiKey?: () => Promise<string | null>;
  saveApiKey?: (apiKey: string) => Promise<void>;

  // Widget persistence
  saveWidget?: (widget: any) => Promise<void>;
  deleteWidget?: (widgetId: string) => Promise<void>;
  getWorkspace?: () => Promise<any>;

  // Workspace management
  getAllWorkspaces?: () => Promise<{ success: boolean; workspaces?: any[]; error?: string }>;
  getWorkspaceById?: (workspaceId: string) => Promise<{ success: boolean; workspace?: any; error?: string }>;
  createWorkspace?: (name: string) => Promise<{ success: boolean; workspace?: any; error?: string }>;
  renameWorkspace?: (workspaceId: string, name: string) => Promise<{ success: boolean; error?: string }>;
  deleteWorkspace?: (workspaceId: string) => Promise<{ success: boolean; error?: string }>;
  updateWorkspaceLastAccessed?: (workspaceId: string) => Promise<{ success: boolean; error?: string }>;

  // Command history
  getWidgetCommandHistory?: (widgetId: string, limit?: number) => Promise<{ success: boolean; commands?: string[]; error?: string }>;
  searchCommands?: (workspaceId: string, searchTerm?: string, limit?: number) => Promise<{ success: boolean; commands?: string[]; error?: string }>;
}

declare global {
  interface Window {
    config: ConfigAPI;
    claudeCode: ClaudeCodeAPI;
  }
}

export {};
