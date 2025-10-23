/**
 * Workspace Canvas - Generated App Component
 * Dynamically renders user-generated React applications
 */

import React, { useState, useMemo } from 'react';
import type { AgentWidgetData } from '../types/widget';
import '../styles/GeneratedApp.css';

interface GeneratedAppProps {
  widget: AgentWidgetData;
}

export const GeneratedApp: React.FC<GeneratedAppProps> = ({ widget }) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Extract code from widget content
  const appCode = widget.content || '';

  console.log('[GeneratedApp] Widget:', widget);
  console.log('[GeneratedApp] Widget type:', widget.type);
  console.log('[GeneratedApp] App code length:', appCode.length);
  console.log('[GeneratedApp] App code:', appCode.substring(0, 200));

  // Create the dynamic component
  const DynamicComponent = useMemo(() => {
    console.log('[GeneratedApp] useMemo running, appCode length:', appCode.length);

    if (!appCode) {
      console.error('[GeneratedApp] No app code provided');
      setError('No app code provided');
      setIsLoading(false);
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('[GeneratedApp] Creating component factory...');

      // Create a sandboxed function that returns a React component
      // Transform JSX to React.createElement calls by using a wrapper
      const wrappedCode = `
        'use strict';
        const { createElement: h } = React;

        ${appCode}

        // Return the App component
        if (typeof App !== 'undefined') {
          return App;
        } else {
          throw new Error('Generated code must define an "App" component');
        }
      `;

      console.log('[GeneratedApp] Wrapped code:', wrappedCode.substring(0, 300));

      const componentFactory = new Function(
        'React',
        'useState',
        'useEffect',
        'useMemo',
        'useCallback',
        'useRef',
        wrappedCode
      );

      // Import necessary hooks
      const { useState, useEffect, useMemo, useCallback, useRef } = React;

      console.log('[GeneratedApp] Executing factory...');

      // Execute the factory to get the component
      const Component = componentFactory(
        React,
        useState,
        useEffect,
        useMemo,
        useCallback,
        useRef
      );

      console.log('[GeneratedApp] Component created successfully:', Component);
      setIsLoading(false);
      return Component;
    } catch (err: any) {
      console.error('[GeneratedApp] Failed to create component:', err);
      console.error('[GeneratedApp] Error stack:', err.stack);
      setError(err.message || 'Failed to create app component');
      setIsLoading(false);
      return null;
    }
  }, [appCode]);

  // Render states
  if (isLoading) {
    return (
      <div className="generated-app">
        <div className="generated-app-loading">
          <div className="loading-spinner"></div>
          <p>Loading app...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="generated-app">
        <div className="generated-app-error">
          <h3>⚠️ App Error</h3>
          <p>{error}</p>
          <details>
            <summary>Generated Code</summary>
            <pre>{appCode}</pre>
          </details>
        </div>
      </div>
    );
  }

  if (!DynamicComponent) {
    return (
      <div className="generated-app">
        <div className="generated-app-empty">
          <p>No app to display</p>
        </div>
      </div>
    );
  }

  // Render the dynamic component in an error boundary wrapper
  return (
    <div className="generated-app">
      <ErrorBoundary>
        <DynamicComponent />
      </ErrorBoundary>
    </div>
  );
};

// Simple error boundary for generated apps
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[GeneratedApp] Runtime error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="generated-app-error">
          <h3>⚠️ Runtime Error</h3>
          <p>{this.state.error?.message || 'Something went wrong'}</p>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}
