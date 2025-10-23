/**
 * Workspace Canvas - Document Editor Component
 * Monaco-based code editor for document widgets
 */

import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { AgentWidgetData } from '../types/widget';
import { MarkdownPreview } from './MarkdownPreview';
import '../styles/DocumentEditor.css';

interface DocumentEditorProps {
  widget: AgentWidgetData;
  onUpdate?: (content: string) => void;
  onPathUpdate?: (path: string) => void;
  onStateUpdate?: (state: any) => void;
}

// Detect language from filename or content
const detectLanguage = (name: string, _content: string): string => {
  const ext = name.split('.').pop()?.toLowerCase();

  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cs': 'csharp',
    'php': 'php',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'sql': 'sql',
    'sh': 'shell',
    'bash': 'shell',
  };

  if (ext && languageMap[ext]) {
    return languageMap[ext];
  }

  // Fallback to plaintext
  return 'plaintext';
};

type ViewMode = 'code' | 'preview' | 'split';

export const DocumentEditor: React.FC<DocumentEditorProps> = ({ widget, onUpdate, onPathUpdate, onStateUpdate }) => {
  const [content, setContent] = useState(widget.content || '');
  const [isSaved, setIsSaved] = useState(true);
  const [language, setLanguage] = useState('plaintext');
  const [viewMode, setViewMode] = useState<ViewMode>(
    (widget.widgetState?.editorMode as ViewMode) || 'code'
  );
  const editorRef = useRef<any>(null);

  useEffect(() => {
    setContent(widget.content || '');
    setLanguage(detectLanguage(widget.name, widget.content || ''));
  }, [widget.content, widget.name]);

  // Restore scroll position when widget loads
  useEffect(() => {
    if (editorRef.current && widget.widgetState?.scrollPosition !== undefined) {
      editorRef.current.setScrollTop(widget.widgetState.scrollPosition);
    }
  }, []);

  // Save view mode changes
  useEffect(() => {
    if (onStateUpdate) {
      onStateUpdate({
        ...widget.widgetState,
        editorMode: viewMode,
      });
    }
  }, [viewMode]);

  const handleEditorChange = (value: string | undefined) => {
    setContent(value || '');
    setIsSaved(false);
  };

  const handleSave = async () => {
    if (!window.claudeCode) {
      // Fallback: just update in memory
      onUpdate?.(content);
      setIsSaved(true);
      return;
    }

    try {
      console.log('[EDITOR] Save requested for widget:', widget.name);
      console.log('[EDITOR] Widget path:', widget.path);

      // Generate path if widget doesn't have one or if path is a directory
      let filePath = widget.path;

      // Check if path is a directory (ends with slash or doesn't have extension)
      const isDirectory = filePath && (filePath.endsWith('/') || !filePath.includes('.'));

      if (!filePath || isDirectory) {
        console.log('[EDITOR] Invalid or missing path, generating new path...');

        // Create default path from widget name in home directory
        const homeDir = typeof process !== 'undefined' && process.env?.HOME
          ? process.env.HOME
          : '/Users/samule';
        const workingDir = `${homeDir}/Documents`;

        // Add file extension based on language or default to .txt
        const ext = language === 'plaintext' ? 'txt' : (language === 'markdown' ? 'md' : language);
        const fileName = widget.name.replace(/[^a-zA-Z0-9-_.]/g, '-').toLowerCase();

        // Remove any extension from the name first
        const baseName = fileName.replace(/\.(txt|md|js|ts|tsx|jsx|py|java|cpp|c|h|css|html|json)$/i, '');

        filePath = `${workingDir}/${baseName}.${ext}`;

        console.log('[EDITOR] Generated new file path:', filePath);

        // Update widget path so it persists
        if (onPathUpdate) {
          onPathUpdate(filePath);
        }
      }

      console.log('[EDITOR] Writing to file:', filePath);
      const result = await window.claudeCode.writeFile(filePath, content);

      if (result.success) {
        setIsSaved(true);
        // Update widget content state so it persists correctly
        onUpdate?.(content);
        console.log('[EDITOR] ✅ File saved successfully:', filePath);
      } else {
        console.error('[EDITOR] ❌ Failed to save file:', result.error);
        alert(`Failed to save file: ${result.error}`);
      }
    } catch (error) {
      console.error('[EDITOR] ❌ Error saving file:', error);
      alert(`Error saving file: ${error}`);
    }
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Add Cmd/Ctrl+S save shortcut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });

    // Save scroll position periodically
    editor.onDidScrollChange(() => {
      if (onStateUpdate) {
        const scrollTop = editor.getScrollTop();
        onStateUpdate({
          ...widget.widgetState,
          editorMode: viewMode,
          scrollPosition: scrollTop,
        });
      }
    });
  };

  if (widget.state === 'minimized') {
    return (
      <div className="document-editor document-editor--minimized">
        <span className="document-editor-preview">
          {content ? content.substring(0, 30) + '...' : 'Empty document'}
        </span>
      </div>
    );
  }

  const isMarkdown = language === 'markdown';
  const canPreview = isMarkdown;

  return (
    <div className="document-editor">
      <div className="document-editor-toolbar">
        <div className="document-editor-toolbar-left">
          <button
            className="document-editor-save-btn"
            onClick={handleSave}
            disabled={isSaved}
          >
            {isSaved ? '✓ Saved' : '💾 Save'}
          </button>

          {canPreview && (
            <div className="document-editor-view-modes">
              <button
                className={`view-mode-btn ${viewMode === 'code' ? 'active' : ''}`}
                onClick={() => setViewMode('code')}
                title="Code view"
              >
                📝 Code
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'split' ? 'active' : ''}`}
                onClick={() => setViewMode('split')}
                title="Split view"
              >
                📑 Split
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'preview' ? 'active' : ''}`}
                onClick={() => setViewMode('preview')}
                title="Preview"
              >
                👁️ Preview
              </button>
            </div>
          )}
        </div>

        <div className="document-editor-toolbar-right">
          {widget.path && (
            <span className="document-editor-path" title={widget.path}>
              📁 {widget.path}
            </span>
          )}
          {!widget.path && (
            <span className="document-editor-path document-editor-path--unsaved" title="Not saved yet">
              💾 Not saved - will save to ~/Documents when you press Save
            </span>
          )}
          <span className="document-editor-info">
            {language} • {content.length} chars • {content.split('\n').length} lines
          </span>
        </div>
      </div>

      <div className={`document-editor-content document-editor-content--${viewMode}`}>
        {(viewMode === 'code' || viewMode === 'split') && (
          <div className="document-editor-monaco">
            <Editor
              height="100%"
              language={language}
              value={content}
              onChange={handleEditorChange}
              onMount={handleEditorDidMount}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
              }}
            />
          </div>
        )}

        {(viewMode === 'preview' || viewMode === 'split') && canPreview && (
          <div className="document-editor-preview">
            <MarkdownPreview content={content} />
          </div>
        )}
      </div>
    </div>
  );
};
