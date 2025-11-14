/**
 * ConfigManager Unit Tests
 * TDD approach - Tests written first
 */

import { ConfigManager } from '../../src/main/ConfigManager';
import { safeStorage } from 'electron';

// Mock electron safeStorage
jest.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: jest.fn(() => true),
    encryptString: jest.fn((str: string) => Buffer.from(`encrypted:${str}`, 'utf8')),
    decryptString: jest.fn((buffer: Buffer) => {
      const str = buffer.toString('utf8');
      return str.replace('encrypted:', '');
    }),
  },
  app: {
    getPath: jest.fn(() => '/tmp/test-canvas-ai'),
    getVersion: jest.fn(() => '0.1.0'),
  },
}));

// Mock electron-store
jest.mock('electron-store');

describe('ConfigManager', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    jest.clearAllMocks();

    // Restore safeStorage mock implementations after clearAllMocks
    (safeStorage.isEncryptionAvailable as jest.Mock).mockReturnValue(true);
    (safeStorage.encryptString as jest.Mock).mockImplementation((str: string) =>
      Buffer.from(`encrypted:${str}`, 'utf8')
    );
    (safeStorage.decryptString as jest.Mock).mockImplementation((buffer: Buffer) => {
      const str = buffer.toString('utf8');
      // If data doesn't start with 'encrypted:', it's corrupted
      if (!str.startsWith('encrypted:')) {
        throw new Error('Invalid encrypted data format');
      }
      return str.replace('encrypted:', '');
    });

    configManager = new ConfigManager();
  });

  afterEach(() => {
    // Cleanup stores between tests to avoid cross-test pollution
    (configManager as any).store.clear();
    (configManager as any).encryptedStore.delete('apiKeyEncrypted');
  });

  describe('API Key Management', () => {
    describe('setApiKey', () => {
      it('should encrypt and store API key', async () => {
        const testKey = 'sk-ant-test-key-123';

        await configManager.setApiKey(testKey);

        expect(safeStorage.isEncryptionAvailable).toHaveBeenCalled();
        expect(safeStorage.encryptString).toHaveBeenCalledWith(testKey);
      });

      it('should throw error if encryption is not available', async () => {
        (safeStorage.isEncryptionAvailable as jest.Mock).mockReturnValue(false);

        await expect(configManager.setApiKey('test-key')).rejects.toThrow(
          'Encryption not available'
        );
      });

      it('should handle empty API key', async () => {
        await expect(configManager.setApiKey('')).rejects.toThrow(
          'API key cannot be empty'
        );
      });

      it('should trim whitespace from API key', async () => {
        const testKey = '  sk-ant-test-key-123  ';
        await configManager.setApiKey(testKey);

        expect(safeStorage.encryptString).toHaveBeenCalledWith('sk-ant-test-key-123');
      });
    });

    describe('getApiKey', () => {
      it('should decrypt and return stored API key', async () => {
        const testKey = 'sk-ant-test-key-123';
        await configManager.setApiKey(testKey);

        const retrievedKey = await configManager.getApiKey();

        expect(retrievedKey).toBe(testKey);
        expect(safeStorage.decryptString).toHaveBeenCalled();
      });

      it('should return null if no API key is stored', async () => {
        const key = await configManager.getApiKey();

        expect(key).toBeNull();
      });

      it('should handle decryption errors gracefully', async () => {
        (safeStorage.decryptString as jest.Mock).mockImplementation(() => {
          throw new Error('Decryption failed');
        });

        // Set a key first
        await configManager.setApiKey('test-key');

        const key = await configManager.getApiKey();

        expect(key).toBeNull();
      });

      it('should return .env fallback in development mode', async () => {
        process.env.NODE_ENV = 'development';
        process.env.ANTHROPIC_API_KEY = 'sk-ant-env-key';

        const key = await configManager.getApiKey();

        expect(key).toBe('sk-ant-env-key');
      });
    });

    describe('removeApiKey', () => {
      it('should delete stored API key', async () => {
        await configManager.setApiKey('test-key');
        await configManager.removeApiKey();

        const key = await configManager.getApiKey();
        expect(key).toBeNull();
      });

      it('should not throw error if no key exists', async () => {
        await expect(configManager.removeApiKey()).resolves.not.toThrow();
      });
    });

    describe('validateApiKey', () => {
      it('should return true for valid API key', async () => {
        const mockAnthropicClient = {
          messages: {
            create: jest.fn().mockResolvedValue({ id: 'msg_123' }),
          },
        };

        // We'll need to mock Anthropic SDK
        const isValid = await configManager.validateApiKey('sk-ant-valid-key');

        // This will fail until we implement - that's expected in TDD
        expect(isValid).toBe(true);
      });

      it('should return false for invalid API key', async () => {
        const isValid = await configManager.validateApiKey('invalid-key');

        expect(isValid).toBe(false);
      });

      it('should return false for empty API key', async () => {
        const isValid = await configManager.validateApiKey('');

        expect(isValid).toBe(false);
      });

      it('should handle network errors gracefully', async () => {
        // Mock network failure
        const isValid = await configManager.validateApiKey('sk-ant-network-error');

        expect(isValid).toBe(false);
      });

      it('should timeout after 10 seconds', async () => {
        const startTime = Date.now();
        const isValid = await configManager.validateApiKey('sk-ant-slow-key');
        const duration = Date.now() - startTime;

        expect(isValid).toBe(false);
        expect(duration).toBeLessThan(11000); // Should timeout before 11s
      }, 15000); // Increase test timeout to 15 seconds
    });

    describe('hasApiKey', () => {
      it('should return true when API key is configured', async () => {
        await configManager.setApiKey('test-key');

        const hasKey = await configManager.hasApiKey();
        expect(hasKey).toBe(true);
      });

      it('should return false when no API key is configured', async () => {
        const hasKey = await configManager.hasApiKey();
        expect(hasKey).toBe(false);
      });

      it('should return true if .env key exists in dev mode', async () => {
        process.env.NODE_ENV = 'development';
        process.env.ANTHROPIC_API_KEY = 'sk-ant-env-key';

        const hasKey = await configManager.hasApiKey();
        expect(hasKey).toBe(true);
      });
    });

    describe('getApiKeyPreview', () => {
      it('should return masked API key', async () => {
        await configManager.setApiKey('sk-ant-test-key-123456');

        const preview = await configManager.getApiKeyPreview();
        expect(preview).toBe('sk-ant-...3456');
      });

      it('should return null if no key is stored', async () => {
        const preview = await configManager.getApiKeyPreview();
        expect(preview).toBeNull();
      });

      it('should mask short keys appropriately', async () => {
        await configManager.setApiKey('sk-ant-123');

        const preview = await configManager.getApiKeyPreview();
        expect(preview).toBe('***');
      });
    });
  });

  describe('Onboarding State Management', () => {
    describe('shouldShowOnboarding', () => {
      it('should return true on first launch', () => {
        const shouldShow = configManager.shouldShowOnboarding();
        expect(shouldShow).toBe(true);
      });

      it('should return false after onboarding is completed', () => {
        configManager.markOnboardingComplete();

        const shouldShow = configManager.shouldShowOnboarding();
        expect(shouldShow).toBe(false);
      });

      it('should return false after onboarding is skipped', () => {
        configManager.skipOnboarding();

        const shouldShow = configManager.shouldShowOnboarding();
        expect(shouldShow).toBe(false);
      });
    });

    describe('markOnboardingComplete', () => {
      it('should set hasCompletedOnboarding to true', () => {
        configManager.markOnboardingComplete();

        expect(configManager.get('hasCompletedOnboarding')).toBe(true);
      });

      it('should set tourCompleted to true', () => {
        configManager.markOnboardingComplete();

        expect(configManager.get('tourCompleted')).toBe(true);
      });
    });

    describe('skipOnboarding', () => {
      it('should set onboardingSkipped to true', () => {
        configManager.skipOnboarding();

        expect(configManager.get('onboardingSkipped')).toBe(true);
      });

      it('should record lastOnboardingPrompt timestamp', () => {
        const before = Date.now();
        configManager.skipOnboarding();
        const after = Date.now();

        const timestamp = configManager.get('lastOnboardingPrompt');
        expect(timestamp).toBeGreaterThanOrEqual(before);
        expect(timestamp).toBeLessThanOrEqual(after);
      });
    });

    describe('shouldShowSetupReminder', () => {
      it('should return false if onboarding completed', () => {
        configManager.markOnboardingComplete();

        const shouldShow = configManager.shouldShowSetupReminder();
        expect(shouldShow).toBe(false);
      });

      it('should return false if onboarding not skipped', () => {
        const shouldShow = configManager.shouldShowSetupReminder();
        expect(shouldShow).toBe(false);
      });

      it('should return false immediately after skipping', () => {
        configManager.skipOnboarding();

        const shouldShow = configManager.shouldShowSetupReminder();
        expect(shouldShow).toBe(false);
      });

      it('should return true 1 day after skipping', () => {
        // Manually set old timestamp
        configManager.set('onboardingSkipped', true);
        const oneDayAgo = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
        configManager.set('lastOnboardingPrompt', oneDayAgo);

        const shouldShow = configManager.shouldShowSetupReminder();
        expect(shouldShow).toBe(true);
      });
    });

    describe('dismissSetupReminder', () => {
      it('should update lastOnboardingPrompt timestamp', () => {
        configManager.skipOnboarding();
        const oldTimestamp = configManager.get('lastOnboardingPrompt');

        // Wait a bit
        jest.advanceTimersByTime(100);

        configManager.dismissSetupReminder();
        const newTimestamp = configManager.get('lastOnboardingPrompt');

        expect(newTimestamp).toBeGreaterThan(oldTimestamp!);
      });
    });
  });

  describe('General Configuration', () => {
    describe('get', () => {
      it('should return default values for unset keys', () => {
        expect(configManager.get('selectedModel')).toBe('claude-sonnet-4');
        expect(configManager.get('theme')).toBe('dark');
        expect(configManager.get('autoUpdate')).toBe(true);
      });

      it('should return set values', () => {
        configManager.set('selectedModel', 'claude-opus-3');

        expect(configManager.get('selectedModel')).toBe('claude-opus-3');
      });
    });

    describe('set', () => {
      it('should persist configuration values', () => {
        configManager.set('theme', 'light');

        expect(configManager.get('theme')).toBe('light');
      });

      it('should update existing values', () => {
        configManager.set('autoUpdate', false);
        configManager.set('autoUpdate', true);

        expect(configManager.get('autoUpdate')).toBe(true);
      });
    });

    describe('reset', () => {
      it('should reset all config to defaults', () => {
        configManager.set('theme', 'light');
        configManager.set('selectedModel', 'claude-opus-3');

        configManager.reset();

        expect(configManager.get('theme')).toBe('dark');
        expect(configManager.get('selectedModel')).toBe('claude-sonnet-4');
      });

      it('should not reset onboarding state by default', () => {
        configManager.markOnboardingComplete();
        configManager.reset();

        expect(configManager.get('hasCompletedOnboarding')).toBe(true);
      });

      it('should reset onboarding state if includeOnboarding is true', () => {
        configManager.markOnboardingComplete();
        configManager.reset({ includeOnboarding: true });

        expect(configManager.get('hasCompletedOnboarding')).toBe(false);
      });
    });
  });

  describe('Model Configuration', () => {
    describe('setModel', () => {
      it('should set selected model', () => {
        configManager.setModel('claude-opus-3');

        expect(configManager.get('selectedModel')).toBe('claude-opus-3');
      });

      it('should reject invalid model names', () => {
        expect(() => configManager.setModel('invalid-model' as any)).toThrow(
          'Invalid model'
        );
      });
    });

    describe('getModel', () => {
      it('should return default model', () => {
        expect(configManager.getModel()).toBe('claude-sonnet-4');
      });

      it('should return configured model', () => {
        configManager.setModel('claude-haiku');

        expect(configManager.getModel()).toBe('claude-haiku');
      });
    });
  });

  describe('Development Mode', () => {
    it('should detect development mode from NODE_ENV', () => {
      process.env.NODE_ENV = 'development';
      const isDev = (configManager as any).isDevelopment();

      expect(isDev).toBe(true);
    });

    it('should detect production mode', () => {
      process.env.NODE_ENV = 'production';
      const isDev = (configManager as any).isDevelopment();

      expect(isDev).toBe(false);
    });

    it('should use .env fallback in development', async () => {
      process.env.NODE_ENV = 'development';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-dev-key';

      const key = await configManager.getApiKey();

      expect(key).toBe('sk-ant-dev-key');
    });

    it('should not use .env fallback in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-should-not-use';

      const key = await configManager.getApiKey();

      expect(key).toBeNull(); // Should not use env var
    });
  });

  describe('Config Persistence', () => {
    it('should persist config across instances', () => {
      configManager.set('theme', 'light');

      // Create new instance
      const newConfigManager = new ConfigManager();

      expect(newConfigManager.get('theme')).toBe('light');
    });

    it('should persist API key across instances', async () => {
      await configManager.setApiKey('sk-ant-persist-test');

      // Create new instance
      const newConfigManager = new ConfigManager();
      const key = await newConfigManager.getApiKey();

      expect(key).toBe('sk-ant-persist-test');
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted encrypted data', async () => {
      // Manually corrupt the encrypted data
      (configManager as any).encryptedStore.set('apiKeyEncrypted', 'corrupted-data');

      const key = await configManager.getApiKey();

      expect(key).toBeNull();
    });

    it('should handle storage write failures', async () => {
      const storeMock = (configManager as any).store;
      storeMock.set = jest.fn(() => {
        throw new Error('Storage write failed');
      });

      expect(() => configManager.set('theme', 'light')).toThrow('Storage write failed');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate selectedModel values', () => {
      const validModels = ['claude-sonnet-4', 'claude-opus-3', 'claude-haiku'];

      validModels.forEach(model => {
        expect(() => configManager.setModel(model as any)).not.toThrow();
      });
    });

    it('should validate theme values', () => {
      const validThemes = ['dark', 'light', 'system'];

      validThemes.forEach(theme => {
        expect(() => configManager.set('theme', theme as any)).not.toThrow();
      });
    });
  });

  describe('First Launch Detection', () => {
    it('should detect first launch', () => {
      const isFirstLaunch = configManager.isFirstLaunch();

      expect(isFirstLaunch).toBe(true);
    });

    it('should not be first launch after onboarding', () => {
      configManager.markOnboardingComplete();

      const isFirstLaunch = configManager.isFirstLaunch();

      expect(isFirstLaunch).toBe(false);
    });

    it('should not be first launch after skip', () => {
      configManager.skipOnboarding();

      const isFirstLaunch = configManager.isFirstLaunch();

      expect(isFirstLaunch).toBe(false);
    });
  });

  describe('Configuration Export/Import', () => {
    it('should export config without sensitive data', () => {
      configManager.set('theme', 'light');
      configManager.set('selectedModel', 'claude-opus-3');

      const exported = configManager.exportConfig();

      expect(exported.theme).toBe('light');
      expect(exported.selectedModel).toBe('claude-opus-3');
      expect(exported).not.toHaveProperty('anthropicApiKey');
    });

    it('should import config values', () => {
      const config = {
        theme: 'light' as const,
        selectedModel: 'claude-haiku' as const,
        autoUpdate: false,
      };

      configManager.importConfig(config);

      expect(configManager.get('theme')).toBe('light');
      expect(configManager.get('selectedModel')).toBe('claude-haiku');
      expect(configManager.get('autoUpdate')).toBe(false);
    });

    it('should not import API key from unsafe source', () => {
      const config = {
        anthropicApiKey: 'sk-ant-should-not-import',
        theme: 'light' as const,
      };

      configManager.importConfig(config as any);

      // API key should not be imported
      expect(configManager.getApiKey()).resolves.toBeNull();
    });
  });
});
