/**
 * Workspace Canvas - Claude Code Service
 * Renderer-side service for interacting with Claude Code instances
 */

export class ClaudeCodeService {
  // Check if running in Electron (dynamic check)
  private get isElectron(): boolean {
    return typeof window !== 'undefined' && !!(window as any).claudeCode;
  }

  async spawnInstance(name: string, cwd?: string, widgetId?: string, workspaceId?: string): Promise<string> {
    if (!this.isElectron) {
      // Fallback for web development
      console.warn('[ClaudeCodeService] Not running in Electron, using mock mode');
      return 'mock-' + Math.random().toString(36).substring(7);
    }

    const result = await window.claudeCode.spawn({ name, cwd, widgetId, workspaceId });

    if (!result.success || !result.instanceId) {
      throw new Error(result.error || 'Failed to spawn Claude Code instance');
    }

    console.log(`[ClaudeCodeService] Spawned instance: ${result.instanceId} for widget: ${widgetId} in workspace: ${workspaceId}`);
    return result.instanceId;
  }

  async killInstance(instanceId: string): Promise<void> {
    if (!this.isElectron) return;
    const result = await window.claudeCode.kill(instanceId);

    if (!result.success) {
      throw new Error(result.error || 'Failed to kill Claude Code instance');
    }

    console.log(`[ClaudeCodeService] Killed instance: ${instanceId}`);
  }

  async cancelInstance(instanceId: string): Promise<void> {
    if (!this.isElectron) return;
    const result = await window.claudeCode.cancel(instanceId);

    if (!result.success) {
      throw new Error(result.error || 'Failed to cancel operation');
    }

    console.log(`[ClaudeCodeService] Cancelled operation for instance: ${instanceId}`);
  }

  async sendCommand(instanceId: string, command: string): Promise<void> {
    if (!this.isElectron) {
      console.log('[Mock] Command:', command);
      return;
    }
    const result = await window.claudeCode.sendCommand(instanceId, command);

    if (!result.success) {
      throw new Error(result.error || 'Failed to send command');
    }

    console.log(`[ClaudeCodeService] Sent command to ${instanceId}: ${command}`);
  }

  subscribeToOutput(instanceId: string, callback: (data: string) => void): () => void {
    if (!this.isElectron) {
      console.log(`[Mock] Subscribed to output from ${instanceId}`);
      return () => {}; // No-op cleanup
    }
    console.log(`[ClaudeCodeService] Subscribing to output from ${instanceId}`);
    return window.claudeCode.subscribeOutput(instanceId, callback);
  }

  async listInstances(): Promise<Array<{ id: string; name: string; pid?: number; status: string; cwd: string }>> {
    if (!this.isElectron) return [];
    return await window.claudeCode.listInstances();
  }
}

// Singleton instance
export const claudeCodeService = new ClaudeCodeService();
