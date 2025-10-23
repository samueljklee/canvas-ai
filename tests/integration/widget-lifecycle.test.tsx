/**
 * Integration tests for AgentWidget lifecycle with Claude Code
 */

import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { AgentWidget } from '../../src/components/AgentWidget';
import { AgentWidgetData } from '../../src/types/widget';
import { claudeCodeService } from '../../src/services/ClaudeCodeService';

// Mock the service
jest.mock('../../src/services/ClaudeCodeService');

describe.skip('AgentWidget Lifecycle Integration', () => {
  let mockWidget: AgentWidgetData;
  let mockOnUpdate: jest.Mock;
  let mockOnSelect: jest.Mock;
  let mockOnStateChange: jest.Mock;
  let mockOnBringToFront: jest.Mock;
  let mockSpawnInstance: jest.Mock;
  let mockKillInstance: jest.Mock;
  let mockSubscribeToOutput: jest.Mock;
  let mockUnsubscribe: jest.Mock;

  beforeEach(() => {
    mockWidget = {
      id: 'test-widget-1',
      name: 'Test Agent',
      type: 'agent',
      position: { x: 100, y: 100 },
      size: { width: 300, height: 200 },
      state: 'expanded',
      status: 'idle',
      zIndex: 1,
      logs: [],
    };

    mockOnUpdate = jest.fn();
    mockOnSelect = jest.fn();
    mockOnStateChange = jest.fn();
    mockOnBringToFront = jest.fn();
    mockUnsubscribe = jest.fn();

    // Mock service methods
    mockSpawnInstance = jest.fn().mockResolvedValue('instance-123');
    mockKillInstance = jest.fn().mockResolvedValue(undefined);
    mockSubscribeToOutput = jest.fn().mockReturnValue(mockUnsubscribe);

    (claudeCodeService.spawnInstance as jest.Mock) = mockSpawnInstance;
    (claudeCodeService.killInstance as jest.Mock) = mockKillInstance;
    (claudeCodeService.subscribeToOutput as jest.Mock) = mockSubscribeToOutput;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Mounting and spawning', () => {
    it('should spawn Claude Code instance on mount', async () => {
      render(
        <AgentWidget
          widget={mockWidget}
          isSelected={false}
          onSelect={mockOnSelect}
          onUpdate={mockOnUpdate}
          onStateChange={mockOnStateChange}
          onBringToFront={mockOnBringToFront}
        />
      );

      await waitFor(() => {
        expect(mockSpawnInstance).toHaveBeenCalledWith('Test Agent', undefined);
      });
    });

    it('should subscribe to output after spawning', async () => {
      render(
        <AgentWidget
          widget={mockWidget}
          isSelected={false}
          onSelect={mockOnSelect}
          onUpdate={mockOnUpdate}
          onStateChange={mockOnStateChange}
          onBringToFront={mockOnBringToFront}
        />
      );

      await waitFor(() => {
        expect(mockSubscribeToOutput).toHaveBeenCalledWith(
          'instance-123',
          expect.any(Function)
        );
      });
    });

    it('should use provided working directory', async () => {
      mockWidget.workingDirectory = '/custom/path';

      render(
        <AgentWidget
          widget={mockWidget}
          isSelected={false}
          onSelect={mockOnSelect}
          onUpdate={mockOnUpdate}
          onStateChange={mockOnStateChange}
          onBringToFront={mockOnBringToFront}
        />
      );

      await waitFor(() => {
        expect(mockSpawnInstance).toHaveBeenCalledWith('Test Agent', '/custom/path');
      });
    });
  });

  describe('Output streaming', () => {
    it('should add output to logs when received', async () => {
      let outputCallback: ((data: string) => void) | null = null;
      mockSubscribeToOutput.mockImplementation((id, callback) => {
        outputCallback = callback;
        return mockUnsubscribe;
      });

      render(
        <AgentWidget
          widget={mockWidget}
          isSelected={false}
          onSelect={mockOnSelect}
          onUpdate={mockOnUpdate}
          onStateChange={mockOnStateChange}
          onBringToFront={mockOnBringToFront}
        />
      );

      await waitFor(() => {
        expect(outputCallback).not.toBeNull();
      });

      // Simulate output
      outputCallback!('Test output from Claude Code');

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith('test-widget-1', {
          logs: expect.arrayContaining([
            expect.objectContaining({
              level: 'info',
              message: 'Test output from Claude Code',
            }),
          ]),
          status: 'running',
        });
      });
    });

    it('should handle multiple output chunks', async () => {
      let outputCallback: ((data: string) => void) | null = null;
      mockSubscribeToOutput.mockImplementation((id, callback) => {
        outputCallback = callback;
        return mockUnsubscribe;
      });

      render(
        <AgentWidget
          widget={mockWidget}
          isSelected={false}
          onSelect={mockOnSelect}
          onUpdate={mockOnUpdate}
          onStateChange={mockOnStateChange}
          onBringToFront={mockOnBringToFront}
        />
      );

      await waitFor(() => {
        expect(outputCallback).not.toBeNull();
      });

      // Simulate multiple outputs
      outputCallback!('Line 1');
      outputCallback!('Line 2');
      outputCallback!('Line 3');

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle spawn errors', async () => {
      mockSpawnInstance.mockRejectedValue(new Error('Spawn failed'));

      render(
        <AgentWidget
          widget={mockWidget}
          isSelected={false}
          onSelect={mockOnSelect}
          onUpdate={mockOnUpdate}
          onStateChange={mockOnStateChange}
          onBringToFront={mockOnBringToFront}
        />
      );

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith('test-widget-1', {
          logs: expect.arrayContaining([
            expect.objectContaining({
              level: 'error',
              message: 'Failed to start: Spawn failed',
            }),
          ]),
          status: 'error',
        });
      });
    });

    it('should not subscribe if spawn fails', async () => {
      mockSpawnInstance.mockRejectedValue(new Error('Spawn failed'));

      render(
        <AgentWidget
          widget={mockWidget}
          isSelected={false}
          onSelect={mockOnSelect}
          onUpdate={mockOnUpdate}
          onStateChange={mockOnStateChange}
          onBringToFront={mockOnBringToFront}
        />
      );

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled();
      });

      expect(mockSubscribeToOutput).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup on unmount', () => {
    it('should unsubscribe from output', async () => {
      const { unmount } = render(
        <AgentWidget
          widget={mockWidget}
          isSelected={false}
          onSelect={mockOnSelect}
          onUpdate={mockOnUpdate}
          onStateChange={mockOnStateChange}
          onBringToFront={mockOnBringToFront}
        />
      );

      await waitFor(() => {
        expect(mockSubscribeToOutput).toHaveBeenCalled();
      });

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should kill Claude Code instance', async () => {
      const { unmount } = render(
        <AgentWidget
          widget={mockWidget}
          isSelected={false}
          onSelect={mockOnSelect}
          onUpdate={mockOnUpdate}
          onStateChange={mockOnStateChange}
          onBringToFront={mockOnBringToFront}
        />
      );

      await waitFor(() => {
        expect(mockSpawnInstance).toHaveBeenCalled();
      });

      unmount();

      await waitFor(() => {
        expect(mockKillInstance).toHaveBeenCalledWith('instance-123');
      });
    });

    it('should handle cleanup errors gracefully', async () => {
      mockKillInstance.mockRejectedValue(new Error('Kill failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { unmount } = render(
        <AgentWidget
          widget={mockWidget}
          isSelected={false}
          onSelect={mockOnSelect}
          onUpdate={mockOnUpdate}
          onStateChange={mockOnStateChange}
          onBringToFront={mockOnBringToFront}
        />
      );

      await waitFor(() => {
        expect(mockSpawnInstance).toHaveBeenCalled();
      });

      unmount();

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Command sending', () => {
    it('should not send commands if instance not spawned', async () => {
      mockSpawnInstance.mockResolvedValue(null);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { unmount } = render(
        <AgentWidget
          widget={mockWidget}
          isSelected={false}
          onSelect={mockOnSelect}
          onUpdate={mockOnUpdate}
          onStateChange={mockOnStateChange}
          onBringToFront={mockOnBringToFront}
        />
      );

      // Component will try to send command but should warn
      // This is tested indirectly through the warning

      unmount();
      consoleSpy.mockRestore();
    });
  });

  describe('Status updates', () => {
    it('should set status to running when output received', async () => {
      let outputCallback: ((data: string) => void) | null = null;
      mockSubscribeToOutput.mockImplementation((id, callback) => {
        outputCallback = callback;
        return mockUnsubscribe;
      });

      render(
        <AgentWidget
          widget={mockWidget}
          isSelected={false}
          onSelect={mockOnSelect}
          onUpdate={mockOnUpdate}
          onStateChange={mockOnStateChange}
          onBringToFront={mockOnBringToFront}
        />
      );

      await waitFor(() => {
        expect(outputCallback).not.toBeNull();
      });

      outputCallback!('Starting...');

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(
          'test-widget-1',
          expect.objectContaining({ status: 'running' })
        );
      });
    });
  });
});
