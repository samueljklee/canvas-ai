/**
 * Canvas AI - Markdown Preview Component
 * Renders markdown with Mermaid diagram support
 */

import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import '../styles/MarkdownPreview.css';

interface MarkdownPreviewProps {
  content: string;
}

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'monospace',
});

// Mermaid code block component
const MermaidDiagram: React.FC<{ children: string }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = React.useState<string>('');

  useEffect(() => {
    const renderDiagram = async () => {
      if (ref.current && children) {
        try {
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          const { svg } = await mermaid.render(id, children);
          setSvg(svg);
        } catch (error) {
          console.error('Mermaid rendering error:', error);
          setSvg(`<pre>Error rendering diagram: ${error}</pre>`);
        }
      }
    };

    renderDiagram();
  }, [children]);

  return <div ref={ref} className="mermaid-diagram" dangerouslySetInnerHTML={{ __html: svg }} />;
};

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content }) => {
  return (
    <div className="markdown-preview">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const inline = !node?.position;

            // Render Mermaid diagrams
            if (!inline && language === 'mermaid') {
              return <MermaidDiagram>{String(children).replace(/\n$/, '')}</MermaidDiagram>;
            }

            // Regular code blocks
            if (!inline) {
              return (
                <pre className={`code-block ${className || ''}`}>
                  <code {...props}>{children}</code>
                </pre>
              );
            }

            // Inline code
            return (
              <code className="inline-code" {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
