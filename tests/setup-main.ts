// Mock nanoid to avoid ESM issues in main process tests
jest.mock('nanoid', () => ({
  nanoid: jest.fn((size?: number) => {
    const length = size || 21;
    return Math.random().toString(36).substring(2, 2 + length);
  }),
}));

// Mock electron-store to avoid ESM issues
// Use a shared storage across instances for persistence testing
jest.mock('electron-store', () => {
  const globalStores = new Map<string, Map<string, any>>();

  class MockStore {
    private storeName: string;
    private defaults: any;

    constructor(options?: { name?: string; defaults?: any; encryptionKey?: string }) {
      this.storeName = options?.name || 'default';
      this.defaults = options?.defaults || {};

      // Create store if it doesn't exist
      if (!globalStores.has(this.storeName)) {
        const newStore = new Map();
        // Initialize with defaults
        Object.keys(this.defaults).forEach(key => {
          newStore.set(key, this.defaults[key]);
        });
        globalStores.set(this.storeName, newStore);
      }
    }

    private getData(): Map<string, any> {
      return globalStores.get(this.storeName)!;
    }

    get(key: string) {
      const data = this.getData();
      return data.has(key) ? data.get(key) : this.defaults[key];
    }

    set(key: string, value: any) {
      this.getData().set(key, value);
    }

    delete(key: string) {
      this.getData().delete(key);
    }

    clear() {
      const data = this.getData();
      const defaultKeys = Object.keys(this.defaults);
      data.clear();
      // Restore defaults
      defaultKeys.forEach(key => {
        data.set(key, this.defaults[key]);
      });
    }

    get store() {
      const obj: any = {};
      this.getData().forEach((value, key) => {
        obj[key] = value;
      });
      return obj;
    }
  }

  return MockStore;
});

// Mock Anthropic SDK to avoid making real API calls
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation((config: { apiKey: string }) => {
    const apiKey = config.apiKey;

    return {
      messages: {
        create: jest.fn().mockImplementation(async () => {
          // Valid keys start with sk-ant-valid-
          if (apiKey && apiKey.startsWith('sk-ant-valid-')) {
            return { id: 'msg_123', content: 'test response' };
          }

          // Simulate errors for specific test cases
          if (apiKey && apiKey.includes('network-error')) {
            throw new Error('Network error');
          }

          if (apiKey && apiKey.includes('slow-key')) {
            // Simulate timeout - delay longer than validation timeout
            await new Promise(resolve => setTimeout(resolve, 15000));
            return { id: 'msg_123' };
          }

          // Invalid keys throw auth error
          throw new Error('Invalid API key');
        }),
      },
    };
  });
});

// Reset stores and environment before each test
beforeEach(() => {
  // Clear environment to avoid test pollution
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.NODE_ENV;
});
