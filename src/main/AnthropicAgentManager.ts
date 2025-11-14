/**
 * Canvas AI - Real Anthropic Agent Manager
 * Manages multiple Claude API conversation streams
 */

import Anthropic from '@anthropic-ai/sdk';
import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';
import { ToolExecutor } from './tools/ToolExecutor';
import { CORE_TOOLS } from './tools/toolDefinitions';
import type { DatabaseService } from './DatabaseService';
import type { ConfigManager } from './ConfigManager';

interface AgentInstance {
  id: string;
  name: string;
  model: string;
  conversationHistory: Anthropic.MessageParam[];
  status: 'idle' | 'thinking' | 'responding' | 'error';
  createdAt: number;
  toolExecutor: ToolExecutor;
  workingDirectory?: string;
  cancelRequested: boolean;
  widgetId?: string; // Link to widget for persistence
  workspaceId?: string; // Link to workspace for command history
}

export class AnthropicAgentManager extends EventEmitter {
  private agents: Map<string, AgentInstance> = new Map();
  private anthropic: Anthropic;
  private apiKey: string | undefined;
  private apiKeyInitialized: boolean = false;
  private mainWindow: any; // Reference to main window for IPC
  private dbService: DatabaseService | null = null;
  private configManager: ConfigManager | null = null;

  constructor(mainWindow?: any, dbService?: DatabaseService, configManager?: ConfigManager) {
    super();
    this.mainWindow = mainWindow;
    this.dbService = dbService || null;
    this.configManager = configManager || null;

    // Initialize Anthropic client with dummy key - will be updated on first use
    this.anthropic = new Anthropic({
      apiKey: 'dummy-key-for-initialization',
    });
  }

  /**
   * Initializes the API key from ConfigManager or environment variable
   * This is called lazily on first agent spawn
   */
  private async initializeApiKey(): Promise<void> {
    if (this.apiKeyInitialized) {
      return;
    }

    try {
      // Try ConfigManager first (production)
      if (this.configManager) {
        const key = await this.configManager.getApiKey();
        if (key) {
          this.apiKey = key;
          this.anthropic = new Anthropic({ apiKey: key });
          console.log('[AnthropicAgentManager] Using API key from ConfigManager');
          this.apiKeyInitialized = true;
          return;
        }
      }

      // Fallback to environment variable (development)
      if (process.env.ANTHROPIC_API_KEY) {
        this.apiKey = process.env.ANTHROPIC_API_KEY;
        this.anthropic = new Anthropic({ apiKey: this.apiKey });
        console.log('[AnthropicAgentManager] Using API key from environment variable (.env)');
        this.apiKeyInitialized = true;
        return;
      }

      // No API key found
      console.warn('[AnthropicAgentManager] No ANTHROPIC_API_KEY found in ConfigManager or environment.');
      console.warn('[AnthropicAgentManager] Set it via Settings or export ANTHROPIC_API_KEY="sk-ant-..."');
      this.apiKeyInitialized = true;
    } catch (error) {
      console.error('[AnthropicAgentManager] Error initializing API key:', error);
      this.apiKeyInitialized = true;
    }
  }

  /**
   * Refreshes the API key from ConfigManager (call this after user updates key in settings)
   * This allows hot-reloading of API key without restart
   */
  async refreshApiKey(): Promise<boolean> {
    this.apiKeyInitialized = false;
    await this.initializeApiKey();
    return this.apiKey !== undefined;
  }

  /**
   * Create a new agent (conversation session)
   */
  async spawn(config: { name: string; systemPrompt?: string; workingDirectory?: string; widgetId?: string; workspaceId?: string }): Promise<string> {
    // Initialize API key on first spawn
    await this.initializeApiKey();
    const instanceId = randomBytes(4).toString('hex');

    // Load existing conversation if widgetId provided
    let conversationHistory: Anthropic.MessageParam[] = [];
    if (config.widgetId && this.dbService) {
      try {
        conversationHistory = this.dbService.loadConversation(config.widgetId);
        console.log(`[AnthropicAgentManager] Loaded ${conversationHistory.length} messages for widget ${config.widgetId}`);
      } catch (error) {
        console.error('[AnthropicAgentManager] Failed to load conversation:', error);
      }
    }

    const agent: AgentInstance = {
      id: instanceId,
      name: config.name,
      model: 'claude-sonnet-4-5-20250929',
      conversationHistory,
      status: 'idle',
      createdAt: Date.now(),
      toolExecutor: new ToolExecutor(config.workingDirectory, this.mainWindow?.webContents),
      workingDirectory: config.workingDirectory,
      cancelRequested: false,
      widgetId: config.widgetId,
      workspaceId: config.workspaceId,
    };

    // Add system prompt if provided
    if (config.systemPrompt) {
      // System prompts are handled in the API call, not in history
      // Store it separately if needed
    }

    this.agents.set(instanceId, agent);

    console.log(`[AnthropicAgentManager] Created agent: ${config.name} (${instanceId})`);

    // Send initial greeting
    this.emitOutput(instanceId, `${config.name} initialized and ready!`);
    this.emitOutput(instanceId, '');
    this.emitOutput(instanceId, '🛠️  Available Tools:');
    this.emitOutput(instanceId, '  • bash - Execute terminal commands');
    this.emitOutput(instanceId, '  • read_file, write_file, edit_file - File operations');
    this.emitOutput(instanceId, '  • list_files - Browse directories');
    this.emitOutput(instanceId, '  • web_search - Search the web');
    this.emitOutput(instanceId, '  • web_fetch - Fetch URLs');
    this.emitOutput(instanceId, '  • spawn_widget - Create new UI widgets (document, filebrowser, agent)');
    this.emitOutput(instanceId, '');
    this.emitOutput(instanceId, `📁 Working directory: ${config.workingDirectory || process.cwd()}`);
    this.emitOutput(instanceId, '---');

    return instanceId;
  }

  /**
   * Save conversation to database (helper method)
   */
  private saveConversation(agent: AgentInstance): void {
    if (agent.widgetId && this.dbService) {
      try {
        this.dbService.saveConversation(agent.widgetId, agent.conversationHistory);
        console.log(`[AnthropicAgentManager] Saved conversation for widget ${agent.widgetId} (${agent.conversationHistory.length} messages)`);
      } catch (error) {
        console.error('[AnthropicAgentManager] Failed to save conversation:', error);
      }
    }
  }

  /**
   * Send a message to an agent (with tool support)
   */
  async sendMessage(instanceId: string, message: string): Promise<void> {
    const agent = this.agents.get(instanceId);
    if (!agent) {
      throw new Error(`Agent ${instanceId} not found`);
    }

    // Ensure API key is initialized
    await this.initializeApiKey();

    if (!this.apiKey) {
      // Fallback to mock response if no API key
      this.emitOutput(instanceId, `> ${message}`);
      this.emitOutput(instanceId, '');
      this.emitOutput(instanceId, '[No ANTHROPIC_API_KEY set]');
      this.emitOutput(instanceId, 'To use real Claude API:');
      this.emitOutput(instanceId, '1. Get API key from https://console.anthropic.com/');
      this.emitOutput(instanceId, '2. Go to Settings and enter your API key');
      this.emitOutput(instanceId, '3. Or set: export ANTHROPIC_API_KEY="sk-ant-..." in development');
      this.emitOutput(instanceId, '---');
      return;
    }

    try {
      agent.status = 'thinking';
      agent.cancelRequested = false; // Reset cancel flag

      // Add user message to history
      agent.conversationHistory.push({
        role: 'user',
        content: message,
      });

      // Save conversation after user message
      this.saveConversation(agent);

      // Save command to history
      if (agent.widgetId && agent.workspaceId && this.dbService) {
        try {
          this.dbService.saveCommand(agent.widgetId, agent.workspaceId, message);
        } catch (error) {
          console.error('[AnthropicAgentManager] Failed to save command:', error);
        }
      }

      // Echo the command
      this.emitOutput(instanceId, `> ${message}`);
      this.emitOutput(instanceId, '');

      // Tool use loop - continue until Claude stops using tools
      let continueLoop = true;
      let loopCount = 0;
      const MAX_LOOPS = 10; // Prevent infinite loops

      while (continueLoop && loopCount < MAX_LOOPS && !agent.cancelRequested) {
        loopCount++;
        agent.status = 'responding';

        // Check for cancellation before making API call
        if (agent.cancelRequested) {
          this.emitOutput(instanceId, '');
          this.emitOutput(instanceId, '[Operation cancelled by user]');
          this.emitOutput(instanceId, '---');
          agent.status = 'idle';
          return;
        }

        // Make API call with tools
        const response = await this.anthropic.messages.create({
          model: agent.model,
          max_tokens: 4096,
          messages: agent.conversationHistory,
          tools: CORE_TOOLS as any,
          system: `You are ${agent.name}, a helpful AI assistant with access to powerful tools.

Available tools:
- bash: Execute terminal commands
- read_file, write_file, edit_file: File operations
- list_files: Browse directories
- web_search: Search the web using DuckDuckGo
- web_fetch: Fetch content from URLs
- spawn_widget: Create new UI widgets on the canvas

IMPORTANT: When users ask for visual interfaces, use spawn_widget:
- type: "document" for text editors
- type: "filebrowser" for file trees
- type: "agent" for new AI agents
- type: "generated-app" for dynamic React applications

## 🎨 GENERATED APP BEST PRACTICES

When creating generated-app widgets (e.g., "generate-app tic-tac-toe"), follow these principles:

**UX Excellence:**
- Clean, minimalist design - avoid clutter
- Intuitive interactions - users should understand immediately
- Responsive layout - works at any widget size
- Clear visual feedback - button states, hover effects
- Accessible - proper contrast, keyboard navigation

**Code Structure:**
- MUST define a component named "App"
- Use React hooks: useState, useEffect, useMemo, useCallback
- Keep component self-contained - no external dependencies
- CRITICAL: Use React.createElement (NOT JSX) - JSX won't work!
- Use inline styles or style objects - no external CSS

**Event Handling (CRITICAL):**
- NEVER use global keyboard event listeners (window.addEventListener)
- ONLY attach keyboard events to specific elements (onKeyDown, onKeyPress)
- Use tabIndex={0} on containers that need keyboard focus
- This prevents stealing keyboard events from other widgets
- Example: React.createElement('div', { tabIndex: 0, onKeyDown: handleKey })

**Styling Guidelines:**
- Dark theme to match canvas (#1e1e1e background, #d4d4d4 text)
- Modern, rounded corners (4-8px)
- Smooth transitions (0.2s)
- Button styles: padding 8-12px, cursor pointer, hover effects
- Use colors: primary #3b82f6, success #10b981, error #ef4444

**Example Template (IMPORTANT - use React.createElement, not JSX):**
\`\`\`javascript
const App = () => {
  const [count, setCount] = useState(0);

  const styles = {
    container: {
      padding: '20px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui',
      color: '#d4d4d4',
      boxSizing: 'border-box'
    },
    button: {
      padding: '10px 20px',
      background: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'background 0.2s'
    }
  };

  // CORRECT: Use element-level keyboard events with tabIndex
  const handleKeyDown = (e) => {
    if (e.key === ' ') {
      e.preventDefault();
      setCount(count + 1);
    }
  };

  return React.createElement('div', {
    style: styles.container,
    tabIndex: 0,  // Makes div focusable
    onKeyDown: handleKeyDown  // Element-level event, NOT window.addEventListener
  },
    React.createElement('h2', null, 'My App'),
    React.createElement('p', null, 'Count: ' + count + ' (Press Space)'),
    React.createElement('button', {
      style: styles.button,
      onClick: () => setCount(count + 1)
    }, 'Increment')
  );
};
\`\`\`

**Helper tip:** Use this pattern:
- React.createElement(type, props, ...children)
- Example: React.createElement('div', {className: 'box'}, 'Hello')

Be creative and build delightful experiences!`,
        });

        // Extract text and tool uses from response
        const textBlocks: string[] = [];
        const toolUses: any[] = [];

        for (const block of response.content) {
          if (block.type === 'text') {
            textBlocks.push(block.text);
            this.emitStreamChunk(instanceId, block.text);
          } else if (block.type === 'tool_use') {
            toolUses.push(block);
          }
        }

        // Add assistant response to history
        agent.conversationHistory.push({
          role: 'assistant',
          content: response.content,
        });

        // Save conversation after assistant response
        this.saveConversation(agent);

        // If there are tool uses, execute them in parallel
        if (toolUses.length > 0) {
          this.emitOutput(instanceId, '');

          // Check for cancellation before executing tools
          if (agent.cancelRequested) {
            this.emitOutput(instanceId, '[Operation cancelled by user]');
            this.emitOutput(instanceId, '---');
            agent.status = 'idle';
            return;
          }

          if (toolUses.length > 1) {
            this.emitOutput(instanceId, `[Executing ${toolUses.length} tools in parallel...]`);
          }

          // Execute all tools in parallel using Promise.all
          const toolExecutionPromises = toolUses.map(async (toolUse) => {
            // Check cancellation flag during tool execution
            if (agent.cancelRequested) {
              return {
                type: 'tool_result' as const,
                tool_use_id: toolUse.id,
                content: 'Operation cancelled by user',
                is_error: true,
              };
            }
            this.emitOutput(instanceId, `[Tool: ${toolUse.name}]`);

            try {
              const result = await agent.toolExecutor.executeTool(toolUse.name, toolUse.input);

              // ALWAYS add a tool_result for every tool_use to satisfy API requirements
              if (result.success && result.output) {
                this.emitOutput(instanceId, result.output);
                return {
                  type: 'tool_result' as const,
                  tool_use_id: toolUse.id,
                  content: result.output,
                };
              } else if (result.error) {
                this.emitOutput(instanceId, `[Error: ${result.error}]`);
                return {
                  type: 'tool_result' as const,
                  tool_use_id: toolUse.id,
                  content: result.error,
                  is_error: true,
                };
              } else {
                // No output and no error - still need to send a tool_result
                this.emitOutput(instanceId, '[No output]');
                return {
                  type: 'tool_result' as const,
                  tool_use_id: toolUse.id,
                  content: 'Tool executed successfully with no output',
                };
              }
            } catch (error: any) {
              // Handle any unexpected errors during tool execution
              this.emitOutput(instanceId, `[Error: ${error.message}]`);
              return {
                type: 'tool_result' as const,
                tool_use_id: toolUse.id,
                content: `Tool execution failed: ${error.message}`,
                is_error: true,
              };
            }
          });

          // Wait for all tools to complete in parallel
          const toolResults = await Promise.all(toolExecutionPromises);

          // Add tool results to conversation
          agent.conversationHistory.push({
            role: 'user',
            content: toolResults,
          });

          // Save conversation after tool results
          this.saveConversation(agent);

          // Continue loop to get Claude's response to tool results
          this.emitOutput(instanceId, '');
        } else {
          // No tool uses, we're done
          continueLoop = false;
        }
      }

      agent.status = 'idle';
      this.emitOutput(instanceId, '\n---');
      this.emitOutput(instanceId, '');

    } catch (error: any) {
      console.error(`[AnthropicAgentManager] Error for ${instanceId}:`, error);
      agent.status = 'error';

      if (error.status === 401) {
        this.emitOutput(instanceId, '[Error: Invalid API key]');
        this.emitOutput(instanceId, 'Check your ANTHROPIC_API_KEY');
      } else if (error.status === 429) {
        this.emitOutput(instanceId, '[Error: Rate limit exceeded]');
        this.emitOutput(instanceId, 'Please wait a moment and try again');
      } else {
        this.emitOutput(instanceId, `[Error: ${error.message}]`);
      }
      this.emitOutput(instanceId, '---');
    }
  }

  /**
   * Cancel current operation (but keep agent alive)
   */
  async cancel(instanceId: string): Promise<void> {
    const agent = this.agents.get(instanceId);
    if (!agent) {
      throw new Error(`Agent ${instanceId} not found`);
    }

    console.log(`[AnthropicAgentManager] Cancelling operation for agent ${instanceId}`);
    agent.cancelRequested = true;
  }

  /**
   * Kill an agent (clear conversation)
   */
  async kill(instanceId: string): Promise<void> {
    const agent = this.agents.get(instanceId);
    if (!agent) {
      throw new Error(`Agent ${instanceId} not found`);
    }

    console.log(`[AnthropicAgentManager] Killing agent ${instanceId}`);
    this.agents.delete(instanceId);
  }

  /**
   * Kill all agents
   */
  async killAll(): Promise<void> {
    console.log(`[AnthropicAgentManager] Killing all ${this.agents.size} agents`);
    this.agents.clear();
  }

  /**
   * List all agents
   */
  listAgents(): Array<{ id: string; name: string; status: string; messageCount: number }> {
    return Array.from(this.agents.values()).map((agent) => ({
      id: agent.id,
      name: agent.name,
      status: agent.status,
      messageCount: agent.conversationHistory.length,
    }));
  }

  /**
   * Get agent details
   */
  getAgent(instanceId: string): AgentInstance | undefined {
    return this.agents.get(instanceId);
  }

  /**
   * Register output callback
   */
  onOutput(instanceId: string, callback: (data: string) => void): void {
    this.on(`output:${instanceId}`, callback);
  }

  /**
   * Emit output to agent (for complete lines)
   */
  private emitOutput(instanceId: string, text: string): void {
    this.emit(`output:${instanceId}`, text + '\n');
  }

  /**
   * Emit streaming chunk (no newline added)
   */
  private emitStreamChunk(instanceId: string, text: string): void {
    this.emit(`output:${instanceId}`, text);
  }
}
