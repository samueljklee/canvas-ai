/**
 * Workspace Canvas - Tool Definitions
 * Anthropic API tool definitions for Claude agents
 */

export const CORE_TOOLS = [
  {
    name: 'bash',
    description: 'Execute a bash command in the terminal. Returns stdout and stderr.',
    input_schema: {
      type: 'object' as const,
      properties: {
        command: {
          type: 'string' as const,
          description: 'The bash command to execute',
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'read_file',
    description: 'Read the contents of a file. Use absolute paths or relative to working directory.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string' as const,
          description: 'Path to the file to read',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write content to a file. Creates directories if needed. Overwrites existing files.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string' as const,
          description: 'Path where to write the file',
        },
        content: {
          type: 'string' as const,
          description: 'Content to write to the file',
        },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'list_files',
    description: 'List files and directories in a given path. Shows [dir] or [file] prefix.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string' as const,
          description: 'Directory path to list (defaults to current directory)',
        },
      },
      required: [],
    },
  },
  {
    name: 'edit_file',
    description: 'Edit a file by replacing old_string with new_string. Use for precise search-and-replace operations.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string' as const,
          description: 'Path to the file to edit',
        },
        old_string: {
          type: 'string' as const,
          description: 'Exact string to search for and replace',
        },
        new_string: {
          type: 'string' as const,
          description: 'New string to replace with',
        },
      },
      required: ['path', 'old_string', 'new_string'],
    },
  },
  {
    name: 'web_search',
    description: 'Search the web using DuckDuckGo. Returns instant answers and related topics.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string' as const,
          description: 'Search query',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'web_fetch',
    description: 'Fetch content from a URL. Supports both HTML and JSON responses.',
    input_schema: {
      type: 'object' as const,
      properties: {
        url: {
          type: 'string' as const,
          description: 'URL to fetch content from',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'spawn_widget',
    description: 'Create a new widget on the canvas. Use this when the user asks for a UI like "show me files", "create a document", "generate an app", etc. Available types: agent (default), document (text editor), filebrowser (file tree), generated-app (dynamic React app).',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string' as const,
          description: 'Widget type: agent, document, filebrowser, or generated-app',
        },
        name: {
          type: 'string' as const,
          description: 'Name/title for the new widget',
        },
        initialContent: {
          type: 'string' as const,
          description: 'Initial content for document widgets OR complete React component code for generated-app widgets. For generated-app, must define an "App" component.',
        },
        path: {
          type: 'string' as const,
          description: 'Initial path for filebrowser widgets',
        },
      },
      required: ['type', 'name'],
    },
  },
] as const;
