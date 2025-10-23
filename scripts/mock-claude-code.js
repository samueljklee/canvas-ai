#!/usr/bin/env node

/**
 * Mock Claude Code CLI - Simulates Claude Code behavior for demo purposes
 *
 * This simulates what a real Claude Code process would do:
 * - Reads commands from stdin
 * - Outputs responses to stdout
 * - Simulates thinking/working
 */

const readline = require('readline');

const AGENT_NAME = process.argv[2] || 'Agent';

// Simulated responses for common commands
const responses = {
  'list files': [
    'Searching for files in current directory...',
    'Found 15 files:',
    '  src/index.tsx',
    '  src/App.tsx',
    '  src/components/Canvas.tsx',
    '  package.json',
    '  README.md',
    '  ...',
  ],
  'read package.json': [
    'Reading package.json...',
    '{',
    '  "name": "fleetcode-canvas-mvp",',
    '  "version": "0.1.0",',
    '  "description": "Multi-Instance Claude Code Orchestrator"',
    '}',
  ],
  'help': [
    'Available commands:',
    '  list files - List all files in directory',
    '  read <file> - Read file contents',
    '  write <file> - Write to file',
    '  run <command> - Execute command',
  ],
};

// Startup message
console.log(`${AGENT_NAME} initialized and ready!`);
console.log('Type commands or "help" for available commands.');
console.log('---');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

// Handle commands
rl.on('line', (line) => {
  const command = line.trim().toLowerCase();

  if (!command) return;

  console.log(`> ${line}`);

  // Check for known commands
  let response = responses[command];

  if (!response) {
    // Generate a generic response
    if (command.startsWith('read ')) {
      const file = command.substring(5);
      response = [
        `Reading ${file}...`,
        'File contents would appear here',
        '(Mock response)',
      ];
    } else if (command.startsWith('list ')) {
      response = [
        `Listing ${command.substring(5)}...`,
        'Results would appear here',
        '(Mock response)',
      ];
    } else if (command.startsWith('run ')) {
      response = [
        `Executing: ${command.substring(4)}`,
        'Command output would appear here',
        '(Mock response)',
      ];
    } else {
      response = [
        `Processing: ${line}`,
        'I would analyze this request and provide a helpful response.',
        '(This is a mock Claude Code instance for demo purposes)',
      ];
    }
  }

  // Simulate processing time and output response
  setTimeout(() => {
    response.forEach((msg, i) => {
      setTimeout(() => console.log(msg), i * 100);
    });

    setTimeout(() => {
      console.log('---');
      console.log('Ready for next command.');
    }, response.length * 100 + 200);
  }, 500);
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log(`\n${AGENT_NAME} shutting down...`);
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log(`\n${AGENT_NAME} interrupted.`);
  process.exit(0);
});

// Keep process alive
process.stdin.resume();
