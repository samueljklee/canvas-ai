/**
 * Workspace Canvas - Workspace Manager Hook
 * Manages multiple workspaces with instant switching and instance lifecycle
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AgentWidgetData } from '../types/widget';

interface Workspace {
  id: string;
  name: string;
  created_at: number;
  last_accessed: number;
  scale: number;
  pan_x: number;
  pan_y: number;
}

interface WorkspaceState {
  widgets: Map<string, AgentWidgetData>;
  selectedWidgetId: string | null;
  pan: { x: number; y: number };
  scale: number;
}

export function useWorkspaceManager() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Store workspace states in memory for instant switching
  const workspaceStatesRef = useRef<Map<string, WorkspaceState>>(new Map());

  // Load all workspaces on mount
  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = useCallback(async () => {
    if (!window.claudeCode) return;

    try {
      const result = await window.claudeCode.getAllWorkspaces?.();
      if (result?.success && result.workspaces) {
        setWorkspaces(result.workspaces);

        // Set active workspace to most recently accessed (sorted by creation, so find max last_accessed)
        if (result.workspaces.length > 0 && !activeWorkspaceId) {
          const mostRecent = result.workspaces.reduce((prev, current) =>
            current.last_accessed > prev.last_accessed ? current : prev
          );
          setActiveWorkspaceId(mostRecent.id);
        }
      }
    } catch (error) {
      console.error('[WorkspaceManager] Failed to load workspaces:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspaceId]);

  const createWorkspace = useCallback(async (name: string) => {
    if (!window.claudeCode?.createWorkspace) return null;

    try {
      const result = await window.claudeCode.createWorkspace(name);
      if (result.success && result.workspace) {
        // Append new workspace to the end of the list
        setWorkspaces(prev => [...prev, result.workspace!]);

        // Initialize empty state for new workspace
        workspaceStatesRef.current.set(result.workspace!.id, {
          widgets: new Map(),
          selectedWidgetId: null,
          pan: { x: 0, y: 0 },
          scale: 1.0,
        });

        return result.workspace;
      }
    } catch (error) {
      console.error('[WorkspaceManager] Failed to create workspace:', error);
    }
    return null;
  }, []);

  const renameWorkspace = useCallback(async (workspaceId: string, name: string) => {
    if (!window.claudeCode?.renameWorkspace) return;

    try {
      const result = await window.claudeCode.renameWorkspace(workspaceId, name);
      if (result.success) {
        setWorkspaces(prev =>
          prev.map(ws => ws.id === workspaceId ? { ...ws, name } : ws)
        );
      }
    } catch (error) {
      console.error('[WorkspaceManager] Failed to rename workspace:', error);
    }
  }, []);

  const deleteWorkspace = useCallback(async (workspaceId: string) => {
    if (!window.claudeCode?.deleteWorkspace) return;

    try {
      const result = await window.claudeCode.deleteWorkspace(workspaceId);
      if (result.success) {
        setWorkspaces(prev => prev.filter(ws => ws.id !== workspaceId));
        workspaceStatesRef.current.delete(workspaceId);

        // Switch to another workspace if deleting active one
        if (activeWorkspaceId === workspaceId) {
          const remaining = workspaces.filter(ws => ws.id !== workspaceId);
          if (remaining.length > 0) {
            setActiveWorkspaceId(remaining[0].id);
          } else {
            // Create new default workspace if all deleted
            const newWorkspace = await createWorkspace('Workspace 1');
            if (newWorkspace) {
              setActiveWorkspaceId(newWorkspace.id);
            }
          }
        }
      }
    } catch (error) {
      console.error('[WorkspaceManager] Failed to delete workspace:', error);
    }
  }, [activeWorkspaceId, workspaces, createWorkspace]);

  const switchWorkspace = useCallback((workspaceId: string) => {
    if (workspaceId === activeWorkspaceId) return;

    // Update last accessed time
    if (window.claudeCode?.updateWorkspaceLastAccessed) {
      window.claudeCode.updateWorkspaceLastAccessed(workspaceId);
    }

    // Just update the last_accessed time, don't reorder
    setWorkspaces(prev =>
      prev.map(ws => ws.id === workspaceId
        ? { ...ws, last_accessed: Date.now() }
        : ws
      )
    );

    setActiveWorkspaceId(workspaceId);
    console.log('[WorkspaceManager] Switched to workspace:', workspaceId);
  }, [activeWorkspaceId]);

  const getWorkspaceState = useCallback((workspaceId: string): WorkspaceState | null => {
    return workspaceStatesRef.current.get(workspaceId) || null;
  }, []);

  const setWorkspaceState = useCallback((workspaceId: string, state: WorkspaceState) => {
    workspaceStatesRef.current.set(workspaceId, state);
  }, []);

  const getActiveWorkspace = useCallback(() => {
    return workspaces.find(ws => ws.id === activeWorkspaceId);
  }, [workspaces, activeWorkspaceId]);

  return {
    workspaces,
    activeWorkspaceId,
    isLoading,
    createWorkspace,
    renameWorkspace,
    deleteWorkspace,
    switchWorkspace,
    getWorkspaceState,
    setWorkspaceState,
    getActiveWorkspace,
  };
}
