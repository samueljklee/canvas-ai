/**
 * Workspace Canvas - Claude Code Process Manager
 * Spawns and manages Claude Code instances
 */

import { spawn, ChildProcess } from 'child_process';
import { randomBytes } from 'crypto';

interface ClaudeCodeInstance {
  id: string;
  name: string;
  process: ChildProcess;
  pid?: number;
  cwd: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  createdAt: number;
}

export class ClaudeCodeManager {
  private instances: Map<string, ClaudeCodeInstance> = new Map();

  async spawn(config: { name: string; cwd?: string }): Promise<string> {
    const instanceId = randomBytes(4).toString('hex');
    const cwd = config.cwd || process.cwd();

    console.log(`[ClaudeCodeManager] Spawning Claude Code instance: ${config.name}`);
    console.log(`[ClaudeCodeManager] Working directory: ${cwd}`);

    // Spawn Claude Code process
    // NOTE: claude-code is not available as an npm package
    // Using mock script for demonstration purposes
    // In production, this would connect to an actual AI API (OpenAI, Anthropic, local LLM, etc.)
    const mockScriptPath = require('path').join(__dirname, '../../../scripts/mock-claude-code.js');
    const childProcess = spawn('node', [mockScriptPath, config.name], {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
    });

    const instance: ClaudeCodeInstance = {
      id: instanceId,
      name: config.name,
      process: childProcess,
      pid: childProcess.pid,
      cwd,
      status: 'starting',
      createdAt: Date.now(),
    };

    this.instances.set(instanceId, instance);

    // Capture stderr to see what's failing
    let stderrData = '';
    childProcess.stderr?.on('data', (data: Buffer) => {
      stderrData += data.toString();
      console.error(`[ClaudeCodeManager] Instance ${instanceId} stderr:`, data.toString());
    });

    // Handle process events
    childProcess.on('spawn', () => {
      console.log(`[ClaudeCodeManager] Instance ${instanceId} spawned with PID ${childProcess.pid}`);
      instance.status = 'running';
    });

    childProcess.on('error', (error) => {
      console.error(`[ClaudeCodeManager] Instance ${instanceId} error:`, error);
      console.error(`[ClaudeCodeManager] stderr output:`, stderrData);
      instance.status = 'error';
    });

    childProcess.on('exit', (code, signal) => {
      if (code !== 0) {
        console.error(`[ClaudeCodeManager] Instance ${instanceId} exited with code ${code}, signal ${signal}`);
        console.error(`[ClaudeCodeManager] stderr output:`, stderrData);
      } else {
        console.log(`[ClaudeCodeManager] Instance ${instanceId} exited normally`);
      }
      instance.status = 'stopped';
      this.instances.delete(instanceId);
    });

    return instanceId;
  }

  async kill(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    console.log(`[ClaudeCodeManager] Killing instance ${instanceId}`);
    instance.process.kill();
    this.instances.delete(instanceId);
  }

  async killAll(): Promise<void> {
    console.log(`[ClaudeCodeManager] Killing all ${this.instances.size} instances`);
    for (const [_id, instance] of this.instances) {
      instance.process.kill();
    }
    this.instances.clear();
  }

  async sendCommand(instanceId: string, command: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    if (!instance.process.stdin) {
      throw new Error(`Instance ${instanceId} stdin not available`);
    }

    console.log(`[ClaudeCodeManager] Sending command to ${instanceId}: ${command}`);
    instance.process.stdin.write(`${command}\n`);
  }

  onOutput(instanceId: string, callback: (data: string) => void): void {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    // Listen to stdout
    instance.process.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      callback(text);
    });

    // Listen to stderr
    instance.process.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      callback(text);
    });
  }

  listInstances(): Array<{ id: string; name: string; pid?: number; status: string; cwd: string }> {
    return Array.from(this.instances.values()).map((instance) => ({
      id: instance.id,
      name: instance.name,
      pid: instance.pid,
      status: instance.status,
      cwd: instance.cwd,
    }));
  }

  getInstance(instanceId: string): ClaudeCodeInstance | undefined {
    return this.instances.get(instanceId);
  }
}
