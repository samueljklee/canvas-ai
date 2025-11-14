/**
 * AnthropicAgentManager Unit Tests
 * Tests conversation management, message handling, and tool execution
 */

import { AnthropicAgentManager } from '../../src/main/AnthropicAgentManager';
import { DatabaseService } from '../../src/main/DatabaseService';
import Anthropic from '@anthropic-ai/sdk';

// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk');

describe('AnthropicAgentManager', () => {
  let manager: AnthropicAgentManager;
  let mockDb: jest.Mocked<DatabaseService>;
  let mockAnthropicClient: any;
  let mockWindow: any;

  beforeEach(() => {
    // Mock DatabaseService
    mockDb = {
      saveConversation: jest.fn(),
      loadConversation: jest.fn(() => []),
      saveCommand: jest.fn(),
      close: jest.fn(),
    } as any;

    // Mock Electron window
    mockWindow = {
      webContents: {
        send: jest.fn(),
      },
    };

    // Mock Anthropic client
    mockAnthropicClient = {
      messages: {
        create: jest.fn(),
      },
    };

    // Create manager with mocks
    manager = new AnthropicAgentManager(mockWindow, mockDb);
    (manager as any).anthropic = mockAnthropicClient;
    (manager as any).apiKey = 'test-api-key';
  });

  afterEach(() => {
    manager.killAll();
    jest.clearAllMocks();
  });

  describe('Agent Spawning', () => {
    it('should spawn agent without widgetId', async () => {
      const instanceId = await manager.spawn({ name: 'Test Agent' });

      expect(instanceId).toBeDefined();
      expect(typeof instanceId).toBe('string');
      expect(mockDb.loadConversation).not.toHaveBeenCalled();
    });

    it('should spawn agent and load existing conversation', async () => {
      const existingConversation: Anthropic.MessageParam[] = [
        { role: 'user', content: 'Previous message' },
        { role: 'assistant', content: 'Previous response' },
      ];

      mockDb.loadConversation.mockReturnValue(existingConversation);

      const instanceId = await manager.spawn({
        name: 'Test Agent',
        widgetId: 'widget-123',
        workspaceId: 'workspace-456',
      });

      expect(mockDb.loadConversation).toHaveBeenCalledWith('widget-123');

      // Send a message and verify conversation includes history
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        stop_reason: 'end_turn',
      });

      await manager.sendMessage(instanceId, 'New message');

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            { role: 'user', content: 'Previous message' },
            { role: 'assistant', content: 'Previous response' },
            { role: 'user', content: 'New message' },
          ]),
        })
      );
    });

    it('should list all spawned agents', async () => {
      const id1 = await manager.spawn({ name: 'Agent 1' });
      const id2 = await manager.spawn({ name: 'Agent 2' });

      const agents = manager.listAgents();

      expect(agents).toHaveLength(2);
      expect(agents.find(a => a.id === id1)?.name).toBe('Agent 1');
      expect(agents.find(a => a.id === id2)?.name).toBe('Agent 2');
    });
  });

  describe('Message Handling', () => {
    let instanceId: string;

    beforeEach(async () => {
      instanceId = await manager.spawn({
        name: 'Test Agent',
        widgetId: 'widget-123',
        workspaceId: 'workspace-456',
      });
    });

    it('should send message and save conversation', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Test response' }],
        stop_reason: 'end_turn',
      });

      await manager.sendMessage(instanceId, 'Hello');

      // Should save after user message
      expect(mockDb.saveConversation).toHaveBeenCalledWith(
        'widget-123',
        expect.arrayContaining([
          { role: 'user', content: 'Hello' },
        ])
      );

      // Should save after assistant response
      expect(mockDb.saveConversation).toHaveBeenCalledWith(
        'widget-123',
        expect.arrayContaining([
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: expect.any(Array) },
        ])
      );
    });

    it('should save commands to history', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        stop_reason: 'end_turn',
      });

      await manager.sendMessage(instanceId, 'Test command');

      expect(mockDb.saveCommand).toHaveBeenCalledWith(
        'widget-123',
        'workspace-456',
        'Test command'
      );
    });

    it('should handle API errors gracefully', async () => {
      mockAnthropicClient.messages.create.mockRejectedValue(
        new Error('API Error')
      );

      // Should not throw
      await expect(
        manager.sendMessage(instanceId, 'Hello')
      ).resolves.not.toThrow();

      // Should still save conversation
      expect(mockDb.saveConversation).toHaveBeenCalled();
    });
  });

  describe('Tool Execution', () => {
    let instanceId: string;

    beforeEach(async () => {
      instanceId = await manager.spawn({
        name: 'Test Agent',
        widgetId: 'widget-123',
        workspaceId: 'workspace-456',
      });
    });

    it('should handle tool use requests', async () => {
      // First response: tool use
      mockAnthropicClient.messages.create.mockResolvedValueOnce({
        content: [
          { type: 'text', text: "I'll write a file" },
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'write_file',
            input: { path: 'test.txt', content: 'test content' },
          },
        ],
        stop_reason: 'tool_use',
      });

      // Second response: after tool execution
      mockAnthropicClient.messages.create.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'File written successfully' }],
        stop_reason: 'end_turn',
      });

      await manager.sendMessage(instanceId, 'Write a test file');

      // Should call API twice (once for tool use, once after tool execution)
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(2);

      // Should save conversation with tool results
      expect(mockDb.saveConversation).toHaveBeenCalledWith(
        'widget-123',
        expect.arrayContaining([
          { role: 'user', content: 'Write a test file' },
          {
            role: 'assistant',
            content: expect.arrayContaining([
              expect.objectContaining({ type: 'tool_use' }),
            ]),
          },
          {
            role: 'user',
            content: expect.arrayContaining([
              expect.objectContaining({ type: 'tool_result' }),
            ]),
          },
        ])
      );
    });

    it('should execute multiple tools in parallel', async () => {
      mockAnthropicClient.messages.create.mockResolvedValueOnce({
        content: [
          { type: 'text', text: "I'll do multiple things" },
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'write_file',
            input: { path: 'file1.txt', content: 'content1' },
          },
          {
            type: 'tool_use',
            id: 'tool-2',
            name: 'write_file',
            input: { path: 'file2.txt', content: 'content2' },
          },
        ],
        stop_reason: 'tool_use',
      });

      mockAnthropicClient.messages.create.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Done' }],
        stop_reason: 'end_turn',
      });

      await manager.sendMessage(instanceId, 'Write two files');

      // Should save tool results for both tools
      const lastCall = mockDb.saveConversation.mock.calls[mockDb.saveConversation.mock.calls.length - 2];
      const conversation = lastCall[1];
      const toolResultsMessage = conversation.find((msg: any) =>
        Array.isArray(msg.content) && msg.content[0]?.type === 'tool_result'
      );

      expect(toolResultsMessage).toBeDefined();
      expect(toolResultsMessage.content).toHaveLength(2);
    });

    it('should validate tool results have content', async () => {
      mockAnthropicClient.messages.create.mockResolvedValueOnce({
        content: [
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'write_file',
            input: { path: 'test.txt', content: undefined }, // Invalid input
          },
        ],
        stop_reason: 'tool_use',
      });

      mockAnthropicClient.messages.create.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Handled error' }],
        stop_reason: 'end_turn',
      });

      await manager.sendMessage(instanceId, 'Write file');

      // Should save tool result with error
      const lastCall = mockDb.saveConversation.mock.calls[mockDb.saveConversation.mock.calls.length - 2];
      const conversation = lastCall[1];
      const toolResultsMessage = conversation.find((msg: any) =>
        Array.isArray(msg.content) && msg.content[0]?.type === 'tool_result'
      );

      expect(toolResultsMessage.content[0]).toMatchObject({
        type: 'tool_result',
        tool_use_id: 'tool-1',
        content: expect.stringContaining('Content is required'),
        is_error: true,
      });
    });
  });

  describe('Cancellation', () => {
    let instanceId: string;

    beforeEach(async () => {
      instanceId = await manager.spawn({ name: 'Test Agent' });
    });

    it.skip('should cancel ongoing operation', async () => {
      // Simulate long-running API call
      mockAnthropicClient.messages.create.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10000))
      );

      const messagePromise = manager.sendMessage(instanceId, 'Long task');

      // Cancel immediately
      await manager.cancel(instanceId);

      // Should complete without error
      await expect(messagePromise).resolves.not.toThrow();
    }, 10000); // Increase timeout for this test

    it.skip('should cancel tool execution', async () => {
      mockAnthropicClient.messages.create.mockResolvedValueOnce({
        content: [
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'bash',
            input: { command: 'sleep 100' },
          },
        ],
        stop_reason: 'tool_use',
      });

      const messagePromise = manager.sendMessage(instanceId, 'Long task');

      // Cancel during tool execution
      setTimeout(() => manager.cancel(instanceId), 100);

      await expect(messagePromise).resolves.not.toThrow();
    }, 10000); // Increase timeout for this test
  });

  describe('Agent Lifecycle', () => {
    it('should kill specific agent', async () => {
      const id1 = await manager.spawn({ name: 'Agent 1' });
      const id2 = await manager.spawn({ name: 'Agent 2' });

      await manager.kill(id1);

      const agents = manager.listAgents();
      expect(agents).toHaveLength(1);
      expect(agents[0].id).toBe(id2);
    });

    it('should kill all agents', async () => {
      await manager.spawn({ name: 'Agent 1' });
      await manager.spawn({ name: 'Agent 2' });

      manager.killAll();

      const agents = manager.listAgents();
      expect(agents).toHaveLength(0);
    });
  });

  describe('Event Emission', () => {
    let instanceId: string;
    let outputEvents: string[] = [];

    beforeEach(async () => {
      instanceId = await manager.spawn({ name: 'Test Agent' });

      // Capture output events
      manager.onOutput(instanceId, (data: string) => {
        outputEvents.push(data);
      });
    });

    afterEach(() => {
      outputEvents = [];
    });

    it('should emit output events during message processing', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Test response' }],
        stop_reason: 'end_turn',
      });

      await manager.sendMessage(instanceId, 'Hello');

      expect(outputEvents.length).toBeGreaterThan(0);
      expect(outputEvents.some(e => e.includes('Test response'))).toBe(true);
    });

    it('should emit tool execution events', async () => {
      mockAnthropicClient.messages.create.mockResolvedValueOnce({
        content: [
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'write_file',
            input: { path: 'test.txt', content: 'test' },
          },
        ],
        stop_reason: 'tool_use',
      });

      mockAnthropicClient.messages.create.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Done' }],
        stop_reason: 'end_turn',
      });

      await manager.sendMessage(instanceId, 'Write file');

      expect(outputEvents.some(e => e.includes('[Tool: write_file]'))).toBe(true);
    });
  });
});
