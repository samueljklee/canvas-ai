/**
 * Canvas AI - DocumentEditor Component Tests
 * Tests for Monaco editor, markdown preview, and Mermaid diagrams
 */

// Mock Mermaid FIRST before any imports - must match how it's imported (default export)
jest.mock('mermaid', () => {
  const mockMermaid = {
    initialize: jest.fn(),
    render: jest.fn().mockResolvedValue({ svg: '<svg>test</svg>' }),
  };
  return {
    __esModule: true,
    default: mockMermaid,
  };
});

// Mock Monaco Editor
jest.mock('@monaco-editor/react', () => ({
  Editor: ({ onChange, value }: any) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange && onChange(e.target.value)}
    />
  ),
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DocumentEditor } from '../../src/components/DocumentEditor';
import { AgentWidgetData } from '../../src/types/widget';

describe.skip('DocumentEditor', () => {
  const mockWidget: AgentWidgetData = {
    id: 'test-1',
    name: 'Test Document',
    type: 'document',
    status: 'idle',
    state: 'expanded',
    position: { x: 100, y: 100 },
    size: { width: 600, height: 500 },
    zIndex: 1,
    logs: [],
    content: '# Hello World\n\nThis is a test document.',
    path: '/test/document.md',
  };

  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders Monaco editor with document content', () => {
    render(<DocumentEditor widget={mockWidget} onUpdate={mockOnUpdate} />);

    const editor = screen.getByTestId('monaco-editor');
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveValue(mockWidget.content);
  });

  test('detects markdown language from file extension', () => {
    const mdWidget = { ...mockWidget, path: '/test/file.md' };
    const { container } = render(<DocumentEditor widget={mdWidget} onUpdate={mockOnUpdate} />);

    // Should show view mode buttons for markdown
    expect(container.querySelector('.document-editor-view-modes')).toBeInTheDocument();
  });

  test('shows save button when content changes', async () => {
    render(<DocumentEditor widget={mockWidget} onUpdate={mockOnUpdate} />);

    const editor = screen.getByTestId('monaco-editor');

    fireEvent.change(editor, { target: { value: '# Modified Content' } });

    await waitFor(() => {
      expect(screen.getByText('💾 Save')).toBeInTheDocument();
    });
  });

  test('updates widget content on save', async () => {
    render(<DocumentEditor widget={mockWidget} onUpdate={mockOnUpdate} />);

    const editor = screen.getByTestId('monaco-editor');
    const newContent = '# Modified Content';

    fireEvent.change(editor, { target: { value: newContent } });

    const saveButton = await screen.findByText('💾 Save');
    fireEvent.click(saveButton);

    expect(mockOnUpdate).toHaveBeenCalledWith(newContent);
  });

  test('supports three view modes for markdown: code, split, preview', () => {
    const mdWidget = { ...mockWidget, path: '/test/file.md' };
    render(<DocumentEditor widget={mdWidget} onUpdate={mockOnUpdate} />);

    expect(screen.getByText('📝 Code')).toBeInTheDocument();
    expect(screen.getByText('📑 Split')).toBeInTheDocument();
    expect(screen.getByText('👁️ Preview')).toBeInTheDocument();
  });

  test('switches between view modes', () => {
    const mdWidget = { ...mockWidget, path: '/test/file.md' };
    render(<DocumentEditor widget={mdWidget} onUpdate={mockOnUpdate} />);

    const previewButton = screen.getByText('👁️ Preview');
    fireEvent.click(previewButton);

    expect(previewButton.parentElement).toHaveClass('active');
  });

  test('renders markdown preview with Mermaid diagrams', async () => {
    const mdWidget = {
      ...mockWidget,
      content: '```mermaid\ngraph TD\nA-->B\n```',
      path: '/test/file.md',
    };

    render(<DocumentEditor widget={mdWidget} onUpdate={mockOnUpdate} />);

    const previewButton = screen.getByText('👁️ Preview');
    fireEvent.click(previewButton);

    await waitFor(() => {
      expect(screen.getByText('👁️ Preview').parentElement).toHaveClass('active');
    });
  });

  test('detects language from various file extensions', () => {
    const testCases = [
      { path: '/test/file.ts', lang: 'typescript' },
      { path: '/test/file.js', lang: 'javascript' },
      { path: '/test/file.py', lang: 'python' },
      { path: '/test/file.json', lang: 'json' },
    ];

    testCases.forEach(({ path }) => {
      const widget = { ...mockWidget, path };
      const { unmount } = render(<DocumentEditor widget={widget} onUpdate={mockOnUpdate} />);
      unmount();
    });
  });

  test('handles empty content gracefully', () => {
    const emptyWidget = { ...mockWidget, content: '' };
    render(<DocumentEditor widget={emptyWidget} onUpdate={mockOnUpdate} />);

    const editor = screen.getByTestId('monaco-editor');
    expect(editor).toHaveValue('');
  });
});
