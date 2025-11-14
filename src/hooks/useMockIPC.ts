/**
 * Canvas AI - Mock IPC Hook
 * Simulates real-time log streaming from agents
 */

import { useEffect, useCallback } from 'react';
import { LogEntry, AgentStatus } from '../types/widget';

const MOCK_MESSAGES = [
  'Initializing agent...',
  'Loading configuration...',
  'Connecting to services...',
  'Processing task queue...',
  'Executing command...',
  'Analyzing results...',
  'Updating state...',
  'Task completed successfully',
  'Waiting for next command...',
];

const MOCK_LEVELS: Array<LogEntry['level']> = ['info', 'info', 'info', 'success', 'warn', 'error'];

interface UseMockIPCProps {
  widgetId: string;
  status: AgentStatus;
  onLogReceived: (log: LogEntry) => void;
}

export const useMockIPC = ({ widgetId, status, onLogReceived }: UseMockIPCProps) => {
  const generateMockLog = useCallback((): LogEntry => {
    const level = MOCK_LEVELS[Math.floor(Math.random() * MOCK_LEVELS.length)];
    const message = MOCK_MESSAGES[Math.floor(Math.random() * MOCK_MESSAGES.length)];

    return {
      timestamp: Date.now(),
      level,
      message: `[${widgetId}] ${message}`,
    };
  }, [widgetId]);

  useEffect(() => {
    if (status !== 'running') return;

    // Generate logs at random intervals
    const interval = setInterval(
      () => {
        const log = generateMockLog();
        onLogReceived(log);
      },
      Math.random() * 3000 + 1000
    ); // 1-4 seconds

    return () => clearInterval(interval);
  }, [status, generateMockLog, onLogReceived]);

  const sendCommand = useCallback(
    (command: string) => {
      // Mock command execution
      const log: LogEntry = {
        timestamp: Date.now(),
        level: 'info',
        message: `> ${command}`,
      };
      onLogReceived(log);

      // Mock response after delay
      setTimeout(() => {
        const response: LogEntry = {
          timestamp: Date.now(),
          level: 'success',
          message: `Command executed: ${command}`,
        };
        onLogReceived(response);
      }, 500);
    },
    [onLogReceived]
  );

  return {
    sendCommand,
  };
};
