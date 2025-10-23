/**
 * ConfigManager - Secure configuration management for Workspace Canvas
 * Handles API keys with encryption, onboarding state, and user preferences
 */

import Store from 'electron-store';
import { safeStorage, app } from 'electron';
import Anthropic from '@anthropic-ai/sdk';

export interface AppConfig {
  selectedModel: 'claude-sonnet-4' | 'claude-opus-3' | 'claude-haiku';
  theme: 'dark' | 'light' | 'system';
  hasCompletedOnboarding: boolean;
  onboardingSkipped: boolean;
  lastOnboardingPrompt?: number;
  tourCompleted: boolean;
  autoUpdate: boolean;
  showSetupReminder: boolean;
  telemetryEnabled: boolean;
  firstLaunchDate: number;
  lastUsedVersion: string;
}

const DEFAULT_CONFIG: AppConfig = {
  selectedModel: 'claude-sonnet-4',
  theme: 'dark',
  hasCompletedOnboarding: false,
  onboardingSkipped: false,
  tourCompleted: false,
  autoUpdate: true,
  showSetupReminder: true,
  telemetryEnabled: false,
  firstLaunchDate: Date.now(),
  lastUsedVersion: '0.1.0', // Will be updated in constructor when app is ready
};

export class ConfigManager {
  private store: any; // Using any to avoid electron-store type issues
  private encryptedStore: any;
  private readonly VALIDATION_TIMEOUT_MS = 10000; // 10 seconds
  private readonly REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    // Main configuration store
    this.store = new Store<AppConfig>({
      name: 'config',
      defaults: DEFAULT_CONFIG,
    });

    // Separate store for encrypted API key
    this.encryptedStore = new Store<{ apiKeyEncrypted?: string }>({
      name: 'secrets',
      encryptionKey: 'workspace-canvas-encryption-key',
    });

    // Update version if app is available (safe to call after app is ready)
    if (app && app.getVersion) {
      try {
        const currentVersion = app.getVersion();
        if (currentVersion && currentVersion !== '0.1.0') {
          this.store.set('lastUsedVersion', currentVersion);
        }
      } catch (error) {
        // Ignore errors - version update is not critical
        console.warn('Could not update app version:', error);
      }
    }
  }

  // ==================== API Key Management ====================

  /**
   * Encrypts and stores the Anthropic API key
   */
  async setApiKey(apiKey: string): Promise<void> {
    const trimmedKey = apiKey.trim();

    if (!trimmedKey) {
      throw new Error('API key cannot be empty');
    }

    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption not available');
    }

    try {
      const encrypted = safeStorage.encryptString(trimmedKey);
      this.encryptedStore.set('apiKeyEncrypted', encrypted.toString('base64'));
    } catch (error) {
      throw new Error(`Failed to encrypt API key: ${error}`);
    }
  }

  /**
   * Retrieves and decrypts the stored API key
   * Falls back to .env in development mode
   */
  async getApiKey(): Promise<string | null> {
    try {
      const encryptedBase64 = this.encryptedStore.get('apiKeyEncrypted');

      if (encryptedBase64) {
        try {
          // Validate that it's a proper base64 string
          if (typeof encryptedBase64 !== 'string') {
            console.error('Stored API key is not a string - corrupted data');
            return null;
          }

          const encryptedBuffer = Buffer.from(encryptedBase64, 'base64');

          // Validate buffer is not empty
          if (encryptedBuffer.length === 0) {
            console.error('Encrypted API key buffer is empty - corrupted data');
            return null;
          }

          const decrypted = safeStorage.decryptString(encryptedBuffer);

          // Validate decrypted result
          if (!decrypted || typeof decrypted !== 'string') {
            console.error('Decrypted API key is invalid - corrupted data');
            return null;
          }

          return decrypted;
        } catch (decryptError) {
          // Decryption failed - corrupted data
          console.error('Failed to decrypt API key:', decryptError);
          return null;
        }
      }

      // Fallback to environment variable in development mode
      if (this.isDevelopment() && process.env.ANTHROPIC_API_KEY) {
        return process.env.ANTHROPIC_API_KEY;
      }

      return null;
    } catch (error) {
      console.error('Error retrieving API key:', error);
      return null;
    }
  }

  /**
   * Removes the stored API key
   */
  async removeApiKey(): Promise<void> {
    this.encryptedStore.delete('apiKeyEncrypted');
  }

  /**
   * Validates an API key by making a test call to Anthropic API
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    if (!apiKey || !apiKey.trim()) {
      return false;
    }

    try {
      const anthropic = new Anthropic({
        apiKey: apiKey.trim(),
      });

      // Create a promise that will timeout after VALIDATION_TIMEOUT_MS
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Validation timeout')), this.VALIDATION_TIMEOUT_MS);
      });

      // Make a minimal API call to validate the key
      const validationPromise = anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      });

      // Race between validation and timeout
      await Promise.race([validationPromise, timeoutPromise]);

      return true;
    } catch (error) {
      // Any error (network, auth, timeout) means invalid key
      return false;
    }
  }

  /**
   * Checks if an API key is configured
   */
  async hasApiKey(): Promise<boolean> {
    const key = await this.getApiKey();
    return key !== null && key.length > 0;
  }

  /**
   * Returns a masked preview of the API key
   */
  async getApiKeyPreview(): Promise<string | null> {
    const key = await this.getApiKey();

    if (!key) {
      return null;
    }

    // Show first 7 chars and last 4 chars for long keys
    if (key.length > 15) {
      const prefix = key.substring(0, 7);
      const suffix = key.substring(key.length - 4);
      return `${prefix}...${suffix}`;
    }

    // For short keys, just mask everything
    return '***';
  }

  // ==================== Onboarding State Management ====================

  /**
   * Determines if onboarding should be shown
   */
  shouldShowOnboarding(): boolean {
    const hasCompleted = this.get('hasCompletedOnboarding');
    const hasSkipped = this.get('onboardingSkipped');

    return !hasCompleted && !hasSkipped;
  }

  /**
   * Gets the current onboarding status
   */
  getOnboardingStatus(): { completed: boolean; skipped: boolean; timestamp: number } {
    const completed = this.get('hasCompletedOnboarding');
    const skipped = this.get('onboardingSkipped');
    const timestamp = this.get('lastOnboardingPrompt') || this.get('firstLaunchDate');

    return {
      completed,
      skipped,
      timestamp,
    };
  }

  /**
   * Marks onboarding as completed
   */
  markOnboardingComplete(): void {
    this.set('hasCompletedOnboarding', true);
    this.set('tourCompleted', true);
  }

  /**
   * Marks onboarding as skipped
   */
  skipOnboarding(): void {
    this.set('onboardingSkipped', true);
    this.set('lastOnboardingPrompt', Date.now());
  }

  /**
   * Determines if setup reminder should be shown
   * (24 hours after skipping onboarding)
   */
  shouldShowSetupReminder(): boolean {
    const hasCompleted = this.get('hasCompletedOnboarding');
    const hasSkipped = this.get('onboardingSkipped');

    if (hasCompleted || !hasSkipped) {
      return false;
    }

    const lastPrompt = this.get('lastOnboardingPrompt');
    if (!lastPrompt) {
      return false;
    }

    const timeSinceLastPrompt = Date.now() - lastPrompt;
    return timeSinceLastPrompt >= this.REMINDER_COOLDOWN_MS;
  }

  /**
   * Dismisses setup reminder (resets cooldown)
   */
  dismissSetupReminder(): void {
    this.set('lastOnboardingPrompt', Date.now());
  }

  /**
   * Checks if this is the first launch
   */
  isFirstLaunch(): boolean {
    return this.shouldShowOnboarding();
  }

  // ==================== General Configuration ====================

  /**
   * Gets a configuration value
   */
  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.store.get(key);
  }

  /**
   * Sets a configuration value
   */
  set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    this.store.set(key, value);
  }

  /**
   * Resets configuration to defaults
   */
  reset(options?: { includeOnboarding?: boolean }): void {
    const currentOnboarding = {
      hasCompletedOnboarding: this.get('hasCompletedOnboarding'),
      onboardingSkipped: this.get('onboardingSkipped'),
      lastOnboardingPrompt: this.get('lastOnboardingPrompt'),
      tourCompleted: this.get('tourCompleted'),
      firstLaunchDate: this.get('firstLaunchDate'),
    };

    // Clear all config
    this.store.clear();

    // Restore onboarding state unless explicitly requested to reset
    if (!options?.includeOnboarding) {
      this.set('hasCompletedOnboarding', currentOnboarding.hasCompletedOnboarding);
      this.set('onboardingSkipped', currentOnboarding.onboardingSkipped);
      this.set('lastOnboardingPrompt', currentOnboarding.lastOnboardingPrompt);
      this.set('tourCompleted', currentOnboarding.tourCompleted);
      this.set('firstLaunchDate', currentOnboarding.firstLaunchDate);
    }
  }

  // ==================== Model Configuration ====================

  /**
   * Gets the selected model
   */
  getModel(): AppConfig['selectedModel'] {
    return this.get('selectedModel');
  }

  /**
   * Sets the selected model
   */
  setModel(model: AppConfig['selectedModel']): void {
    const validModels: AppConfig['selectedModel'][] = [
      'claude-sonnet-4',
      'claude-opus-3',
      'claude-haiku',
    ];

    if (!validModels.includes(model)) {
      throw new Error('Invalid model');
    }

    this.set('selectedModel', model);
  }

  // ==================== Export/Import ====================

  /**
   * Exports configuration (without sensitive data)
   */
  exportConfig(): Partial<AppConfig> {
    const config = { ...this.store.store };

    // Remove any sensitive data
    delete (config as any).anthropicApiKey;

    return config;
  }

  /**
   * Imports configuration values
   */
  importConfig(config: Partial<AppConfig>): void {
    // Never import API key from external source
    const safeConfig = { ...config };
    delete (safeConfig as any).anthropicApiKey;

    // Import each valid key
    Object.keys(safeConfig).forEach((key) => {
      if (key in DEFAULT_CONFIG) {
        this.set(key as keyof AppConfig, safeConfig[key as keyof AppConfig]!);
      }
    });
  }

  // ==================== Utility Methods ====================

  /**
   * Checks if running in development mode
   */
  private isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }
}
