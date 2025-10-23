/**
 * Workspace Canvas - FileBrowser Component Tests
 * Tests for file browser with real file system integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FileBrowser } from '../../src/components/FileBrowser';
import { AgentWidgetData } from '../../src/types/widget';

describe.skip('FileBrowser', () => {
  const mockWidget: AgentWidgetData = {
    id: 'test-1',
    name: 'File Browser',
    type: 'filebrowser',
    status: 'idle',
    state: 'expanded',
    position: { x: 100, y: 100 },
    size: { width: 600, height: 500 },
    zIndex: 1,
    logs: [],
    path: '/test/directory',
  };

  const mockOnPathChange = jest.fn();
  const mockOnFileOpen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock window.claudeCode API
    (window as any).claudeCode = {
      listDirectory: jest.fn().mockResolvedValue({
        success: true,
        files: [
          { name: 'folder1', path: '/test/directory/folder1', type: 'directory' },
          { name: 'file1.txt', path: '/test/directory/file1.txt', type: 'file' },
          { name: 'file2.md', path: '/test/directory/file2.md', type: 'file' },
        ],
      }),
    };
  });

  test('loads and displays directory contents', async () => {
    render(
      <FileBrowser
        widget={mockWidget}
        onPathChange={mockOnPathChange}
        onFileOpen={mockOnFileOpen}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('folder1')).toBeInTheDocument();
      expect(screen.getByText('file1.txt')).toBeInTheDocument();
      expect(screen.getByText('file2.md')).toBeInTheDocument();
    });
  });

  test('distinguishes between files and directories with icons', async () => {
    render(
      <FileBrowser
        widget={mockWidget}
        onPathChange={mockOnPathChange}
        onFileOpen={mockOnFileOpen}
      />
    );

    await waitFor(() => {
      const folderEntry = screen.getByText('folder1').parentElement;
      const fileEntry = screen.getByText('file1.txt').parentElement;

      expect(folderEntry).toHaveTextContent('📁');
      expect(fileEntry).toHaveTextContent('📄');
    });
  });

  test('navigates to folder on double-click', async () => {
    render(
      <FileBrowser
        widget={mockWidget}
        onPathChange={mockOnPathChange}
        onFileOpen={mockOnFileOpen}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('folder1')).toBeInTheDocument();
    });

    const folderEntry = screen.getByText('folder1').closest('.file-entry');
    fireEvent.doubleClick(folderEntry!);

    expect(mockOnPathChange).toHaveBeenCalledWith('/test/directory/folder1');
  });

  test('opens file in editor on double-click', async () => {
    render(
      <FileBrowser
        widget={mockWidget}
        onPathChange={mockOnPathChange}
        onFileOpen={mockOnFileOpen}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('file1.txt')).toBeInTheDocument();
    });

    const fileEntry = screen.getByText('file1.txt').closest('.file-entry');
    fireEvent.doubleClick(fileEntry!);

    expect(mockOnFileOpen).toHaveBeenCalledWith('/test/directory/file1.txt', 'file1.txt');
  });

  test('navigates up directory with parent button', async () => {
    render(
      <FileBrowser
        widget={mockWidget}
        onPathChange={mockOnPathChange}
        onFileOpen={mockOnFileOpen}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('folder1')).toBeInTheDocument();
    });

    const upButton = screen.getByText('↑ Parent');
    fireEvent.click(upButton);

    expect(mockOnPathChange).toHaveBeenCalled();
  });

  test('shows loading state while fetching directory', () => {
    (window as any).claudeCode.listDirectory = jest.fn(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(
      <FileBrowser
        widget={mockWidget}
        onPathChange={mockOnPathChange}
        onFileOpen={mockOnFileOpen}
      />
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('handles file system errors gracefully', async () => {
    (window as any).claudeCode.listDirectory = jest.fn().mockResolvedValue({
      success: false,
      error: 'Permission denied',
    });

    render(
      <FileBrowser
        widget={mockWidget}
        onPathChange={mockOnPathChange}
        onFileOpen={mockOnFileOpen}
      />
    );

    await waitFor(() => {
      // Should not crash and handle error gracefully
      expect(screen.queryByText('folder1')).not.toBeInTheDocument();
    });
  });

  test('displays current path', async () => {
    render(
      <FileBrowser
        widget={mockWidget}
        onPathChange={mockOnPathChange}
        onFileOpen={mockOnFileOpen}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/\/test\/directory/)).toBeInTheDocument();
    });
  });

  test('reloads directory when path changes', async () => {
    const { rerender } = render(
      <FileBrowser
        widget={mockWidget}
        onPathChange={mockOnPathChange}
        onFileOpen={mockOnFileOpen}
      />
    );

    const newWidget = { ...mockWidget, path: '/test/new-directory' };
    rerender(
      <FileBrowser
        widget={newWidget}
        onPathChange={mockOnPathChange}
        onFileOpen={mockOnFileOpen}
      />
    );

    await waitFor(() => {
      expect((window as any).claudeCode.listDirectory).toHaveBeenCalledWith(
        '/test/new-directory'
      );
    });
  });
});
