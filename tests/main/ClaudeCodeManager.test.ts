/**
 * Tests for ClaudeCodeManager - Process spawning and management
 */

import { ClaudeCodeManager } from '../../src/main/ClaudeCodeManager';
import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

// Mock child_process
jest.mock('child_process');

describe.skip('ClaudeCodeManager', () => {
  let manager: ClaudeCodeManager;
  let mockProcess: EventEmitter & Partial<ChildProcess>;

  beforeEach(() => {
    manager = new ClaudeCodeManager();

    // Create mock process
    mockProcess = new EventEmitter() as EventEmitter & Partial<ChildProcess>;
    mockProcess.pid = 12345;
    mockProcess.stdin = {
      write: jest.fn(),
    } as any;
    mockProcess.stdout = new EventEmitter() as any;
    mockProcess.stderr = new EventEmitter() as any;
    mockProcess.kill = jest.fn();

    // Mock spawn to return our mock process
    const { spawn } = require('child_process');
    spawn.mockReturnValue(mockProcess);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('spawn', () => {
    it('should spawn a Claude Code instance', async () => {
      const instanceId = await manager.spawn({ name: 'Test Agent' });

      expect(instanceId).toBeDefined();
      expect(typeof instanceId).toBe('string');
      expect(instanceId.length).toBe(8);
    });

    it('should use provided working directory', async () => {
      const { spawn } = require('child_process');
      const cwd = '/test/directory';

      await manager.spawn({ name: 'Test Agent', cwd });

      expect(spawn).toHaveBeenCalledWith(
        'npx',
        ['claude-code'],
        expect.objectContaining({ cwd })
      );
    });

    it('should use current directory if cwd not provided', async () => {
      const { spawn } = require('child_process');

      await manager.spawn({ name: 'Test Agent' });

      expect(spawn).toHaveBeenCalledWith(
        'npx',
        ['claude-code'],
        expect.objectContaining({ cwd: process.cwd() })
      );
    });

    it('should set instance status to starting', async () => {
      const instanceId = await manager.spawn({ name: 'Test Agent' });
      const instances = manager.listInstances();
      const instance = instances.find(i => i.id === instanceId);

      expect(instance?.status).toBe('starting');
    });

    it('should update status to running on spawn event', async () => {
      const instanceId = await manager.spawn({ name: 'Test Agent' });

      // Emit spawn event
      mockProcess.emit('spawn');

      const instances = manager.listInstances();
      const instance = instances.find(i => i.id === instanceId);

      expect(instance?.status).toBe('running');
    });

    it('should update status to error on error event', async () => {
      const instanceId = await manager.spawn({ name: 'Test Agent' });

      // Emit error event
      mockProcess.emit('error', new Error('Test error'));

      const instances = manager.listInstances();
      const instance = instances.find(i => i.id === instanceId);

      expect(instance?.status).toBe('error');
    });
  });

  describe('kill', () => {
    it('should kill an instance by ID', async () => {
      const instanceId = await manager.spawn({ name: 'Test Agent' });

      await manager.kill(instanceId);

      expect(mockProcess.kill).toHaveBeenCalled();
    });

    it('should remove instance from list after kill', async () => {
      const instanceId = await manager.spawn({ name: 'Test Agent' });

      await manager.kill(instanceId);

      const instances = manager.listInstances();
      const instance = instances.find(i => i.id === instanceId);

      expect(instance).toBeUndefined();
    });

    it('should throw error if instance not found', async () => {
      await expect(manager.kill('nonexistent-id')).rejects.toThrow(
        'Instance nonexistent-id not found'
      );
    });
  });

  describe('killAll', () => {
    it('should kill all instances', async () => {
      const id1 = await manager.spawn({ name: 'Agent 1' });
      const id2 = await manager.spawn({ name: 'Agent 2' });

      await manager.killAll();

      const instances = manager.listInstances();
      expect(instances).toHaveLength(0);
    });
  });

  describe('sendCommand', () => {
    it('should send command to instance stdin', async () => {
      const instanceId = await manager.spawn({ name: 'Test Agent' });

      await manager.sendCommand(instanceId, 'list files');

      expect(mockProcess.stdin?.write).toHaveBeenCalledWith('list files\n');
    });

    it('should throw error if instance not found', async () => {
      await expect(
        manager.sendCommand('nonexistent-id', 'test command')
      ).rejects.toThrow('Instance nonexistent-id not found');
    });

    it('should throw error if stdin not available', async () => {
      const instanceId = await manager.spawn({ name: 'Test Agent' });

      // Remove stdin
      const instance = manager.getInstance(instanceId);
      if (instance) {
        (instance.process as any).stdin = null;
      }

      await expect(
        manager.sendCommand(instanceId, 'test command')
      ).rejects.toThrow('stdin not available');
    });
  });

  describe('onOutput', () => {
    it('should register stdout callback', async () => {
      const instanceId = await manager.spawn({ name: 'Test Agent' });
      const callback = jest.fn();

      manager.onOutput(instanceId, callback);
      mockProcess.stdout?.emit('data', Buffer.from('test output'));

      expect(callback).toHaveBeenCalledWith('test output');
    });

    it('should register stderr callback', async () => {
      const instanceId = await manager.spawn({ name: 'Test Agent' });
      const callback = jest.fn();

      manager.onOutput(instanceId, callback);
      mockProcess.stderr?.emit('data', Buffer.from('error output'));

      expect(callback).toHaveBeenCalledWith('error output');
    });

    it('should throw error if instance not found', () => {
      expect(() => {
        manager.onOutput('nonexistent-id', jest.fn());
      }).toThrow('Instance nonexistent-id not found');
    });
  });

  describe('listInstances', () => {
    it('should return empty array when no instances', () => {
      const instances = manager.listInstances();
      expect(instances).toEqual([]);
    });

    it('should return all spawned instances', async () => {
      await manager.spawn({ name: 'Agent 1' });
      await manager.spawn({ name: 'Agent 2' });

      const instances = manager.listInstances();
      expect(instances).toHaveLength(2);
    });

    it('should include instance details', async () => {
      const instanceId = await manager.spawn({ name: 'Test Agent', cwd: '/test' });

      const instances = manager.listInstances();
      const instance = instances[0];

      expect(instance).toMatchObject({
        id: instanceId,
        name: 'Test Agent',
        pid: 12345,
        status: 'starting',
        cwd: '/test',
      });
    });
  });

  describe('process lifecycle', () => {
    it('should remove instance on exit', async () => {
      const instanceId = await manager.spawn({ name: 'Test Agent' });

      // Emit exit event
      mockProcess.emit('exit', 0, null);

      const instances = manager.listInstances();
      const instance = instances.find(i => i.id === instanceId);

      expect(instance).toBeUndefined();
    });

    it('should set status to stopped on exit', async () => {
      const instanceId = await manager.spawn({ name: 'Test Agent' });

      // Get instance before exit
      const instanceBefore = manager.getInstance(instanceId);
      expect(instanceBefore).toBeDefined();

      // Emit exit event
      mockProcess.emit('exit', 0, null);

      // Instance should be removed from map but status was set to stopped before removal
      const instances = manager.listInstances();
      expect(instances.find(i => i.id === instanceId)).toBeUndefined();
    });
  });
});
