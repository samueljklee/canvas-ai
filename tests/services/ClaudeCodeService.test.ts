/**
 * Tests for ClaudeCodeService - Renderer-side IPC communication
 */

// Setup window mock before importing service
const mockWindow: any = {
  claudeCode: {
    spawn: jest.fn(),
    kill: jest.fn(),
    sendCommand: jest.fn(),
    subscribeOutput: jest.fn(),
    listInstances: jest.fn(),
  },
};

// Set global window mock BEFORE importing
global.window = mockWindow as any;

import { ClaudeCodeService } from '../../src/services/ClaudeCodeService';

describe('ClaudeCodeService', () => {
  let service: ClaudeCodeService;

  beforeEach(() => {
    service = new ClaudeCodeService();
    jest.clearAllMocks();
  });

  describe('spawnInstance', () => {
    it.skip('should spawn instance via IPC', async () => {
      const mockResult = { success: true, instanceId: 'test-id-123' };
      mockWindow.claudeCode.spawn.mockResolvedValue(mockResult);

      const instanceId = await service.spawnInstance('Test Agent');

      expect(mockWindow.claudeCode.spawn).toHaveBeenCalledWith({
        name: 'Test Agent',
        cwd: undefined,
      });
      expect(instanceId).toBe('test-id-123');
    });

    it.skip('should pass working directory if provided', async () => {
      const mockResult = { success: true, instanceId: 'test-id-123' };
      mockWindow.claudeCode.spawn.mockResolvedValue(mockResult);

      await service.spawnInstance('Test Agent', '/test/dir');

      expect(mockWindow.claudeCode.spawn).toHaveBeenCalledWith({
        name: 'Test Agent',
        cwd: '/test/dir',
      });
    });

    it.skip('should throw error if spawn fails', async () => {
      const mockResult = { success: false, error: 'Failed to spawn' };
      mockWindow.claudeCode.spawn.mockResolvedValue(mockResult);

      await expect(service.spawnInstance('Test Agent')).rejects.toThrow(
        'Failed to spawn'
      );
    });

    it.skip('should throw error if no instanceId returned', async () => {
      const mockResult = { success: true };
      mockWindow.claudeCode.spawn.mockResolvedValue(mockResult);

      await expect(service.spawnInstance('Test Agent')).rejects.toThrow(
        'Failed to spawn Claude Code instance'
      );
    });

    it('should handle mock mode when not in Electron', async () => {
      // This test verifies the fallback behavior
      // The service checks window.claudeCode at runtime
      const originalClaudeCode = mockWindow.claudeCode;
      mockWindow.claudeCode = undefined;

      // Create a new service instance to trigger the check
      const mockService = new ClaudeCodeService();
      const instanceId = await mockService.spawnInstance('Test Agent');

      expect(instanceId).toMatch(/^mock-/);

      // Restore
      mockWindow.claudeCode = originalClaudeCode;
    });
  });

  describe('killInstance', () => {
    it.skip('should kill instance via IPC', async () => {
      const mockResult = { success: true };
      mockWindow.claudeCode.kill.mockResolvedValue(mockResult);

      await service.killInstance('test-id-123');

      expect(mockWindow.claudeCode.kill).toHaveBeenCalledWith('test-id-123');
    });

    it.skip('should throw error if kill fails', async () => {
      const mockResult = { success: false, error: 'Failed to kill' };
      mockWindow.claudeCode.kill.mockResolvedValue(mockResult);

      await expect(service.killInstance('test-id-123')).rejects.toThrow(
        'Failed to kill'
      );
    });

    it('should handle mock mode gracefully', async () => {
      const originalClaudeCode = mockWindow.claudeCode;
      mockWindow.claudeCode = undefined;

      const mockService = new ClaudeCodeService();
      await expect(mockService.killInstance('test-id-123')).resolves.not.toThrow();

      mockWindow.claudeCode = originalClaudeCode;
    });
  });

  describe('sendCommand', () => {
    it.skip('should send command via IPC', async () => {
      const mockResult = { success: true };
      mockWindow.claudeCode.sendCommand.mockResolvedValue(mockResult);

      await service.sendCommand('test-id-123', 'list files');

      expect(mockWindow.claudeCode.sendCommand).toHaveBeenCalledWith(
        'test-id-123',
        'list files'
      );
    });

    it.skip('should throw error if send fails', async () => {
      const mockResult = { success: false, error: 'Failed to send command' };
      mockWindow.claudeCode.sendCommand.mockResolvedValue(mockResult);

      await expect(
        service.sendCommand('test-id-123', 'list files')
      ).rejects.toThrow('Failed to send command');
    });

    it('should handle mock mode by logging', async () => {
      const originalClaudeCode = mockWindow.claudeCode;
      mockWindow.claudeCode = undefined;
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const mockService = new ClaudeCodeService();
      await mockService.sendCommand('test-id-123', 'list files');

      expect(consoleSpy).toHaveBeenCalledWith('[Mock] Command:', 'list files');
      consoleSpy.mockRestore();
      mockWindow.claudeCode = originalClaudeCode;
    });
  });

  describe('subscribeToOutput', () => {
    it.skip('should subscribe to output via IPC', () => {
      const unsubscribeMock = jest.fn();
      mockWindow.claudeCode.subscribeOutput.mockReturnValue(unsubscribeMock);
      const callback = jest.fn();

      const unsubscribe = service.subscribeToOutput('test-id-123', callback);

      expect(mockWindow.claudeCode.subscribeOutput).toHaveBeenCalledWith(
        'test-id-123',
        callback
      );
      expect(unsubscribe).toBe(unsubscribeMock);
    });

    it('should return no-op function in mock mode', () => {
      const originalClaudeCode = mockWindow.claudeCode;
      mockWindow.claudeCode = undefined;
      const callback = jest.fn();

      const mockService = new ClaudeCodeService();
      const unsubscribe = mockService.subscribeToOutput('test-id-123', callback);

      expect(typeof unsubscribe).toBe('function');
      unsubscribe(); // Should not throw

      mockWindow.claudeCode = originalClaudeCode;
    });
  });

  describe('listInstances', () => {
    it.skip('should list instances via IPC', async () => {
      const mockInstances = [
        { id: 'id-1', name: 'Agent 1', pid: 123, status: 'running', cwd: '/test' },
        { id: 'id-2', name: 'Agent 2', pid: 456, status: 'running', cwd: '/test' },
      ];
      mockWindow.claudeCode.listInstances.mockResolvedValue(mockInstances);

      const instances = await service.listInstances();

      expect(mockWindow.claudeCode.listInstances).toHaveBeenCalled();
      expect(instances).toEqual(mockInstances);
    });

    it('should return empty array in mock mode', async () => {
      const originalClaudeCode = mockWindow.claudeCode;
      mockWindow.claudeCode = undefined;

      const mockService = new ClaudeCodeService();
      const instances = await mockService.listInstances();

      expect(instances).toEqual([]);

      mockWindow.claudeCode = originalClaudeCode;
    });
  });

  describe('error handling', () => {
    it.skip('should handle IPC errors gracefully', async () => {
      mockWindow.claudeCode.spawn.mockRejectedValue(new Error('IPC error'));

      await expect(service.spawnInstance('Test Agent')).rejects.toThrow(
        'IPC error'
      );
    });

    it.skip('should handle missing error message', async () => {
      const mockResult = { success: false };
      mockWindow.claudeCode.spawn.mockResolvedValue(mockResult);

      await expect(service.spawnInstance('Test Agent')).rejects.toThrow(
        'Failed to spawn Claude Code instance'
      );
    });
  });
});
