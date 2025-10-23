/**
 * Workspace Canvas - Tool Executor
 * Handles execution of various tools for Claude agents
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
}

export class ToolExecutor {
  private workingDirectory: string;
  private ipcSender?: any; // Reference to IPC sender for spawning widgets

  constructor(workingDirectory?: string, ipcSender?: any) {
    this.workingDirectory = workingDirectory || process.cwd();
    this.ipcSender = ipcSender;
  }

  /**
   * Execute a bash command
   */
  async executeBash(command: string): Promise<ToolResult> {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.workingDirectory,
        maxBuffer: 1024 * 1024, // 1MB buffer
        timeout: 30000, // 30 second timeout
      });

      return {
        success: true,
        output: stdout + (stderr ? `\nSTDERR:\n${stderr}` : ''),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        output: error.stdout || error.stderr,
      };
    }
  }

  /**
   * Read a file
   */
  async readFile(filePath: string): Promise<ToolResult> {
    try {
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(this.workingDirectory, filePath);

      const content = await fs.readFile(absolutePath, 'utf-8');

      return {
        success: true,
        output: content,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to read file: ${error.message}`,
      };
    }
  }

  /**
   * Write to a file
   */
  async writeFile(filePath: string, content: string): Promise<ToolResult> {
    try {
      // Validate inputs
      if (!filePath) {
        return {
          success: false,
          error: 'File path is required',
        };
      }

      if (content === undefined || content === null) {
        return {
          success: false,
          error: 'Content is required (cannot be undefined or null)',
        };
      }

      // Convert content to string if it's not already
      const contentStr = typeof content === 'string' ? content : String(content);

      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(this.workingDirectory, filePath);

      // Create directory if it doesn't exist
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });

      await fs.writeFile(absolutePath, contentStr, 'utf-8');

      return {
        success: true,
        output: `Successfully wrote to ${filePath}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to write file: ${error.message}`,
      };
    }
  }

  /**
   * List files in a directory
   */
  async listFiles(dirPath: string = '.'): Promise<ToolResult> {
    try {
      const absolutePath = path.isAbsolute(dirPath)
        ? dirPath
        : path.join(this.workingDirectory, dirPath);

      const entries = await fs.readdir(absolutePath, { withFileTypes: true });

      const fileList = entries.map((entry) => {
        const type = entry.isDirectory() ? 'dir' : 'file';
        return `[${type}] ${entry.name}`;
      });

      return {
        success: true,
        output: fileList.join('\n'),
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to list files: ${error.message}`,
      };
    }
  }

  /**
   * Edit a file (search and replace)
   */
  async editFile(filePath: string, oldString: string, newString: string): Promise<ToolResult> {
    try {
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(this.workingDirectory, filePath);

      // Read current content
      const content = await fs.readFile(absolutePath, 'utf-8');

      // Check if old string exists
      if (!content.includes(oldString)) {
        return {
          success: false,
          error: `String not found in file: "${oldString.substring(0, 50)}..."`,
        };
      }

      // Perform replacement
      const newContent = content.replace(oldString, newString);

      // Write back
      await fs.writeFile(absolutePath, newContent, 'utf-8');

      return {
        success: true,
        output: `Successfully edited ${filePath}\nReplaced: "${oldString.substring(0, 50)}..."\nWith: "${newString.substring(0, 50)}..."`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to edit file: ${error.message}`,
      };
    }
  }

  /**
   * Search the web (using DuckDuckGo HTML parsing)
   */
  async webSearch(query: string): Promise<ToolResult> {
    try {
      // First try the Instant Answer API with timeout
      const instantUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`;
      const instantController = new AbortController();
      const instantTimeout = setTimeout(() => instantController.abort(), 5000); // 5s timeout

      const instantResponse = await fetch(instantUrl, {
        signal: instantController.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Workspace/1.0)' }
      });
      clearTimeout(instantTimeout);

      const instantData: any = await instantResponse.json();

      let results = '';

      if (instantData.AbstractText) {
        results += `Summary: ${instantData.AbstractText}\n`;
        if (instantData.AbstractSource) {
          results += `Source: ${instantData.AbstractSource}\n`;
        }
        results += '\n';
      }

      // If no instant answers, fetch actual search results page
      if (!results || results.trim() === '') {
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const searchController = new AbortController();
        const searchTimeout = setTimeout(() => searchController.abort(), 8000); // 8s timeout

        const searchResponse = await fetch(searchUrl, {
          signal: searchController.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          },
        });
        clearTimeout(searchTimeout);

        if (!searchResponse.ok) {
          return {
            success: false,
            error: `DuckDuckGo returned ${searchResponse.status}: ${searchResponse.statusText}. Try a different query or use web_fetch with specific URLs.`
          };
        }

        const html = await searchResponse.text();

        // Parse search results (basic extraction)
        results = `Search results for: "${query}"\n\n`;

        // Extract result snippets (very basic HTML parsing)
        const resultMatches = html.matchAll(/<a class="result__a" href="([^"]+)">([^<]+)<\/a>/g);
        const snippetMatches = html.matchAll(/<a class="result__snippet"[^>]*>([^<]+)<\/a>/g);

        const links: string[] = [];
        const titles: string[] = [];
        const snippets: string[] = [];

        for (const match of resultMatches) {
          links.push(match[1]);
          titles.push(match[2]);
        }

        for (const match of snippetMatches) {
          snippets.push(match[1].trim());
        }

        const resultCount = Math.min(5, links.length);

        if (resultCount > 0) {
          for (let i = 0; i < resultCount; i++) {
            results += `${i + 1}. ${titles[i] || 'Result'}\n`;
            if (snippets[i]) {
              results += `   ${snippets[i].substring(0, 150)}...\n`;
            }
            if (links[i]) {
              results += `   ${links[i]}\n`;
            }
            results += '\n';
          }
        } else {
          results += 'No results found. Try different keywords or use web_fetch for specific URLs.\n';
        }
      }

      return {
        success: true,
        output: results,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Web search failed: ${error.message}`,
      };
    }
  }

  /**
   * Fetch content from a URL
   */
  async webFetch(url: string): Promise<ToolResult> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Workspace/1.0)',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const json = await response.json();
        return {
          success: true,
          output: JSON.stringify(json, null, 2),
        };
      } else {
        const text = await response.text();
        // Limit to first 5000 characters to avoid overwhelming output
        const truncated = text.length > 5000 ? text.substring(0, 5000) + '\n... (truncated)' : text;
        return {
          success: true,
          output: truncated,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to fetch URL: ${error.message}`,
      };
    }
  }

  /**
   * Spawn a new widget
   */
  async spawnWidget(type: string, name: string, options?: Record<string, any>): Promise<ToolResult> {
    try {
      if (!this.ipcSender) {
        return {
          success: false,
          error: 'Widget spawning not available (no IPC sender)',
        };
      }

      // Send IPC message to renderer to spawn widget
      this.ipcSender.send('spawn-widget', {
        type,
        name,
        initialContent: options?.initialContent,
        path: options?.path || this.workingDirectory,
      });

      return {
        success: true,
        output: `Created new ${type} widget: "${name}"`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to spawn widget: ${error.message}`,
      };
    }
  }

  /**
   * Execute a tool by name
   */
  async executeTool(toolName: string, args: Record<string, any>): Promise<ToolResult> {
    switch (toolName) {
      case 'bash':
        return this.executeBash(args.command);

      case 'read_file':
        return this.readFile(args.path);

      case 'write_file':
        return this.writeFile(args.path, args.content);

      case 'list_files':
        return this.listFiles(args.path);

      case 'edit_file':
        return this.editFile(args.path, args.old_string, args.new_string);

      case 'web_search':
        return this.webSearch(args.query);

      case 'web_fetch':
        return this.webFetch(args.url);

      case 'spawn_widget':
        return this.spawnWidget(args.type, args.name, args);

      default:
        return {
          success: false,
          error: `Unknown tool: ${toolName}`,
        };
    }
  }
}
