/**
 * Workspace Canvas - Log Viewer Component
 * Auto-scrolling log viewer with responsive line heights
 */

import React, { useRef, useEffect, useState } from 'react';
import { LogEntry } from '../types/widget';
import '../styles/LogViewer.css';

interface LogViewerProps {
  logs: LogEntry[];
}

export const LogViewer: React.FC<LogViewerProps> = ({ logs }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;

    // Re-enable auto-scroll if user scrolls to bottom
    const isAtBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight < 10;
    setAutoScroll(isAtBottom);
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

  const getLevelClass = (level: LogEntry['level']) => {
    return `log-entry--${level}`;
  };

  return (
    <div
      ref={containerRef}
      className="log-viewer"
      onScroll={handleScroll}
    >
      <div className="log-entries">
        {logs.map((log, index) => (
          <div
            key={`${log.timestamp}-${index}`}
            className={`log-entry ${getLevelClass(log.level)}`}
          >
            <span className="log-timestamp">{formatTimestamp(log.timestamp)}</span>
            <span className="log-level">[{log.level.toUpperCase()}]</span>
            <span className="log-message">{log.message}</span>
          </div>
        ))}
      </div>

      {!autoScroll && (
        <button
          className="log-viewer-scroll-to-bottom"
          onClick={() => {
            if (containerRef.current) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight;
              setAutoScroll(true);
            }
          }}
        >
          ↓ Scroll to bottom
        </button>
      )}
    </div>
  );
};
