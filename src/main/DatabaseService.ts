/**
 * Canvas AI - Database Service
 * SQLite-based persistence for workspaces, widgets, and conversations
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';
import { randomBytes } from 'crypto';
import type { AgentWidgetData, Position } from '../types/widget';
import type Anthropic from '@anthropic-ai/sdk';

interface WorkspaceRow {
  id: string;
  name: string;
  created_at: number;
  last_accessed: number;
  scale: number;
  pan_x: number;
  pan_y: number;
}

interface WidgetRow {
  id: string;
  workspace_id: string;
  name: string;
  type: string;
  status: string;
  state: string;
  position_x: number;
  position_y: number;
  size_width: number;
  size_height: number;
  z_index: number;
  content: string | null;
  path: string | null;
  widget_state: string | null;
  created_at: number;
  updated_at: number;
}

interface ConversationRow {
  id: number;
  widget_id: string;
  role: string;
  content: string;
  timestamp: number;
}

interface LogRow {
  id: number;
  widget_id: string;
  level: string;
  message: string;
  timestamp: number;
}

export class DatabaseService {
  private db: Database.Database;
  private dbPath: string;

  constructor() {
    // Store database in user data directory
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'canvas-ai.db');

    console.log('[DatabaseService] Opening database at:', this.dbPath);
    this.db = new Database(this.dbPath);

    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');

    this.initializeSchema();
  }

  private initializeSchema() {
    this.db.exec(`
      -- Workspaces table
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_accessed INTEGER NOT NULL,
        scale REAL DEFAULT 1.0,
        pan_x REAL DEFAULT 0,
        pan_y REAL DEFAULT 0
      );

      -- Widgets table
      CREATE TABLE IF NOT EXISTS widgets (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        state TEXT NOT NULL,
        position_x REAL NOT NULL,
        position_y REAL NOT NULL,
        size_width REAL NOT NULL,
        size_height REAL NOT NULL,
        z_index INTEGER NOT NULL,
        content TEXT,
        path TEXT,
        widget_state TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      );

      -- Conversations table (stores message history for agent widgets)
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        widget_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (widget_id) REFERENCES widgets(id) ON DELETE CASCADE
      );

      -- Logs table (stores log entries for widgets)
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        widget_id TEXT NOT NULL,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (widget_id) REFERENCES widgets(id) ON DELETE CASCADE
      );

      -- Command history table (stores user commands for searchable history)
      CREATE TABLE IF NOT EXISTS command_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        widget_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        command TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (widget_id) REFERENCES widgets(id) ON DELETE CASCADE,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      );

      -- Indexes for better query performance
      CREATE INDEX IF NOT EXISTS idx_widgets_workspace ON widgets(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_widget ON conversations(widget_id);
      CREATE INDEX IF NOT EXISTS idx_logs_widget ON logs(widget_id);
      CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_command_history_widget ON command_history(widget_id);
      CREATE INDEX IF NOT EXISTS idx_command_history_workspace ON command_history(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_command_history_timestamp ON command_history(timestamp);
    `);

    // Migration: Add widget_state column if it doesn't exist
    try {
      const tableInfo = this.db.pragma('table_info(widgets)') as Array<{ name: string }>;
      const hasWidgetState = tableInfo.some((col) => col.name === 'widget_state');

      if (!hasWidgetState) {
        console.log('[DatabaseService] Running migration: Adding widget_state column');
        this.db.exec('ALTER TABLE widgets ADD COLUMN widget_state TEXT');
        console.log('[DatabaseService] Migration completed');
      }
    } catch (error) {
      console.error('[DatabaseService] Migration failed:', error);
    }

    console.log('[DatabaseService] Schema initialized');
  }

  /**
   * Get or create the default workspace
   */
  getDefaultWorkspace(): WorkspaceRow {
    const workspace = this.db.prepare('SELECT * FROM workspaces ORDER BY last_accessed DESC LIMIT 1').get() as WorkspaceRow | undefined;

    if (workspace) {
      // Update last accessed time
      this.db.prepare('UPDATE workspaces SET last_accessed = ? WHERE id = ?').run(Date.now(), workspace.id);
      return workspace;
    }

    // Create default workspace
    const newWorkspace: WorkspaceRow = {
      id: randomBytes(4).toString('hex'),
      name: 'Default Workspace',
      created_at: Date.now(),
      last_accessed: Date.now(),
      scale: 1.0,
      pan_x: 0,
      pan_y: 0,
    };

    this.db.prepare(`
      INSERT INTO workspaces (id, name, created_at, last_accessed, scale, pan_x, pan_y)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      newWorkspace.id,
      newWorkspace.name,
      newWorkspace.created_at,
      newWorkspace.last_accessed,
      newWorkspace.scale,
      newWorkspace.pan_x,
      newWorkspace.pan_y
    );

    console.log('[DatabaseService] Created default workspace:', newWorkspace.id);
    return newWorkspace;
  }

  /**
   * Save workspace state (pan, zoom)
   */
  saveWorkspaceState(workspaceId: string, scale: number, pan: Position) {
    this.db.prepare(`
      UPDATE workspaces
      SET scale = ?, pan_x = ?, pan_y = ?, last_accessed = ?
      WHERE id = ?
    `).run(scale, pan.x, pan.y, Date.now(), workspaceId);
  }

  /**
   * Save widget to database
   */
  saveWidget(workspaceId: string, widget: AgentWidgetData) {
    const existing = this.db.prepare('SELECT id FROM widgets WHERE id = ?').get(widget.id);

    const widgetStateJson = widget.widgetState ? JSON.stringify(widget.widgetState) : null;

    if (existing) {
      // Update existing widget
      this.db.prepare(`
        UPDATE widgets
        SET name = ?, type = ?, status = ?, state = ?,
            position_x = ?, position_y = ?,
            size_width = ?, size_height = ?,
            z_index = ?, content = ?, path = ?, widget_state = ?,
            updated_at = ?
        WHERE id = ?
      `).run(
        widget.name,
        widget.type,
        widget.status,
        widget.state,
        widget.position.x,
        widget.position.y,
        widget.size.width,
        widget.size.height,
        widget.zIndex,
        widget.content || null,
        widget.path || null,
        widgetStateJson,
        Date.now(),
        widget.id
      );
    } else {
      // Insert new widget
      this.db.prepare(`
        INSERT INTO widgets (
          id, workspace_id, name, type, status, state,
          position_x, position_y, size_width, size_height,
          z_index, content, path, widget_state, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        widget.id,
        workspaceId,
        widget.name,
        widget.type,
        widget.status,
        widget.state,
        widget.position.x,
        widget.position.y,
        widget.size.width,
        widget.size.height,
        widget.zIndex,
        widget.content || null,
        widget.path || null,
        widgetStateJson,
        Date.now(),
        Date.now()
      );
    }

    // Save logs if present
    if (widget.logs && widget.logs.length > 0) {
      this.saveLogs(widget.id, widget.logs);
    }
  }

  /**
   * Delete widget from database
   */
  deleteWidget(widgetId: string) {
    this.db.prepare('DELETE FROM widgets WHERE id = ?').run(widgetId);
    console.log('[DatabaseService] Deleted widget:', widgetId);
  }

  /**
   * Load all widgets for a workspace
   */
  loadWidgets(workspaceId: string): AgentWidgetData[] {
    const rows = this.db.prepare('SELECT * FROM widgets WHERE workspace_id = ?').all(workspaceId) as WidgetRow[];

    return rows.map(row => {
      let widgetState;
      if (row.widget_state) {
        try {
          widgetState = JSON.parse(row.widget_state);
        } catch (e) {
          console.error('[DatabaseService] Failed to parse widget state:', e);
          widgetState = undefined;
        }
      }

      return {
        id: row.id,
        name: row.name,
        type: row.type as any,
        status: row.status as any,
        state: row.state as any,
        position: { x: row.position_x, y: row.position_y },
        size: { width: row.size_width, height: row.size_height },
        zIndex: row.z_index,
        content: row.content || undefined,
        path: row.path || undefined,
        widgetState: widgetState,
        logs: this.loadLogs(row.id),
        relationships: undefined,
      };
    });
  }

  /**
   * Save conversation history for a widget
   */
  saveConversation(widgetId: string, messages: Anthropic.MessageParam[]) {
    // Clear existing conversation
    this.db.prepare('DELETE FROM conversations WHERE widget_id = ?').run(widgetId);

    // Filter out messages with invalid content
    const validMessages = messages.filter(msg => {
      if (!msg.content) {
        console.warn(`[DatabaseService] Skipping message with undefined/null content for widget ${widgetId}`);
        return false;
      }
      if (typeof msg.content === 'string' && msg.content.trim() === '') {
        console.warn(`[DatabaseService] Skipping message with empty content for widget ${widgetId}`);
        return false;
      }
      // Arrays (tool results) are valid even if empty
      if (Array.isArray(msg.content)) {
        return true;
      }
      return true;
    });

    if (validMessages.length === 0) {
      console.log(`[DatabaseService] No valid messages to save for widget ${widgetId}`);
      return;
    }

    // Insert new messages
    const stmt = this.db.prepare(`
      INSERT INTO conversations (widget_id, role, content, timestamp)
      VALUES (?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((messages: Anthropic.MessageParam[]) => {
      for (const message of messages) {
        stmt.run(
          widgetId,
          message.role,
          JSON.stringify(message.content),
          Date.now()
        );
      }
    });

    transaction(validMessages);
  }

  /**
   * Load conversation history for a widget
   */
  loadConversation(widgetId: string): Anthropic.MessageParam[] {
    const rows = this.db.prepare('SELECT * FROM conversations WHERE widget_id = ? ORDER BY timestamp ASC').all(widgetId) as ConversationRow[];

    return rows
      .map(row => {
        try {
          const content = JSON.parse(row.content);
          // Validate that content is not null/undefined
          if (!content || (typeof content === 'string' && content.trim() === '')) {
            console.warn(`[DatabaseService] Skipping message with invalid content for widget ${widgetId}`);
            return null;
          }

          // If content is an array (tool results), validate each tool result
          if (Array.isArray(content)) {
            const validToolResults = content.filter(tr => {
              if (tr.type !== 'tool_result') return false;
              if (!tr.tool_use_id) return false;
              // Ensure content field exists - even empty string is valid
              if (tr.content === undefined || tr.content === null) {
                console.warn(`[DatabaseService] Tool result missing content field for widget ${widgetId}`);
                return false;
              }
              return true;
            });

            if (validToolResults.length === 0) {
              console.warn(`[DatabaseService] Skipping message with no valid tool results for widget ${widgetId}`);
              return null;
            }

            return {
              role: row.role as 'user' | 'assistant',
              content: validToolResults,
            };
          }

          return {
            role: row.role as 'user' | 'assistant',
            content,
          };
        } catch (error) {
          console.error(`[DatabaseService] Failed to parse conversation content for widget ${widgetId}:`, error);
          return null;
        }
      })
      .filter((msg): msg is Anthropic.MessageParam => msg !== null);
  }

  /**
   * Save log entries for a widget
   */
  saveLogs(widgetId: string, logs: Array<{ level: string; message: string; timestamp: number }>) {
    console.log(`[DatabaseService] Saving ${logs.length} logs for widget ${widgetId}`);

    // Delete existing logs for this widget
    this.db.prepare('DELETE FROM logs WHERE widget_id = ?').run(widgetId);

    // Insert all logs
    const stmt = this.db.prepare(`
      INSERT INTO logs (widget_id, level, message, timestamp)
      VALUES (?, ?, ?, ?)
    `);

    for (const log of logs) {
      stmt.run(widgetId, log.level, log.message, log.timestamp);
    }

    console.log(`[DatabaseService] Saved ${logs.length} logs for widget ${widgetId}`);
  }

  /**
   * Load logs for a widget
   */
  loadLogs(widgetId: string): Array<{ level: 'info' | 'success' | 'warn' | 'error'; message: string; timestamp: number }> {
    const rows = this.db.prepare('SELECT level, message, timestamp FROM logs WHERE widget_id = ? ORDER BY timestamp ASC LIMIT 1000').all(widgetId) as LogRow[];

    console.log(`[DatabaseService] Loaded ${rows.length} logs for widget ${widgetId}`);

    return rows.map(row => ({
      level: row.level as 'info' | 'success' | 'warn' | 'error',
      message: row.message,
      timestamp: row.timestamp,
    }));
  }

  /**
   * Clear all data for a workspace
   */
  clearWorkspace(workspaceId: string) {
    this.db.prepare('DELETE FROM widgets WHERE workspace_id = ?').run(workspaceId);
    console.log('[DatabaseService] Cleared workspace:', workspaceId);
  }

  /**
   * Close database connection
   */
  /**
   * Get all workspaces ordered by creation time (for stable ordering)
   */
  getAllWorkspaces(): WorkspaceRow[] {
    return this.db.prepare('SELECT * FROM workspaces ORDER BY created_at ASC').all() as WorkspaceRow[];
  }

  /**
   * Get workspace by ID
   */
  getWorkspace(workspaceId: string): WorkspaceRow | undefined {
    return this.db.prepare('SELECT * FROM workspaces WHERE id = ?').get(workspaceId) as WorkspaceRow | undefined;
  }

  /**
   * Create new workspace
   */
  createWorkspace(name: string): WorkspaceRow {
    const newWorkspace: WorkspaceRow = {
      id: randomBytes(4).toString('hex'),
      name,
      created_at: Date.now(),
      last_accessed: Date.now(),
      scale: 1.0,
      pan_x: 0,
      pan_y: 0,
    };

    this.db.prepare(`
      INSERT INTO workspaces (id, name, created_at, last_accessed, scale, pan_x, pan_y)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      newWorkspace.id,
      newWorkspace.name,
      newWorkspace.created_at,
      newWorkspace.last_accessed,
      newWorkspace.scale,
      newWorkspace.pan_x,
      newWorkspace.pan_y
    );

    console.log('[DatabaseService] Created workspace:', newWorkspace.id, newWorkspace.name);
    return newWorkspace;
  }

  /**
   * Rename workspace
   */
  renameWorkspace(workspaceId: string, name: string) {
    this.db.prepare('UPDATE workspaces SET name = ? WHERE id = ?').run(name, workspaceId);
    console.log('[DatabaseService] Renamed workspace:', workspaceId, name);
  }

  /**
   * Delete workspace and all its widgets
   */
  deleteWorkspace(workspaceId: string) {
    this.db.prepare('DELETE FROM workspaces WHERE id = ?').run(workspaceId);
    console.log('[DatabaseService] Deleted workspace:', workspaceId);
  }

  /**
   * Update last accessed time for workspace
   */
  updateLastAccessed(workspaceId: string) {
    this.db.prepare('UPDATE workspaces SET last_accessed = ? WHERE id = ?').run(Date.now(), workspaceId);
  }

  /**
   * Save command to history
   */
  saveCommand(widgetId: string, workspaceId: string, command: string) {
    this.db.prepare(`
      INSERT INTO command_history (widget_id, workspace_id, command, timestamp)
      VALUES (?, ?, ?, ?)
    `).run(widgetId, workspaceId, command, Date.now());
  }

  /**
   * Get command history for a widget (most recent first)
   */
  getWidgetCommandHistory(widgetId: string, limit: number = 50): string[] {
    const rows = this.db.prepare(`
      SELECT command FROM command_history
      WHERE widget_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(widgetId, limit) as Array<{ command: string }>;

    return rows.map(row => row.command);
  }

  /**
   * Search all commands across workspace (for new widgets)
   */
  searchCommands(workspaceId: string, searchTerm: string = '', limit: number = 50): string[] {
    const rows = this.db.prepare(`
      SELECT DISTINCT command FROM command_history
      WHERE workspace_id = ? AND command LIKE ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(workspaceId, `%${searchTerm}%`, limit) as Array<{ command: string }>;

    return rows.map(row => row.command);
  }

  close() {
    this.db.close();
    console.log('[DatabaseService] Database closed');
  }
}
