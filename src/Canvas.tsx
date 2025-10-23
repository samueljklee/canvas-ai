/**
 * Workspace Canvas - Main Canvas Component
 * Example implementation showing how to use the widget system
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AgentWidget } from './components/AgentWidget';
import { ShortcutsModal } from './components/ShortcutsModal';
import { SettingsModal } from './components/SettingsModal';
import { WorkspaceTabs } from './components/WorkspaceTabs';
import OnboardingWizard from './components/OnboardingWizard';
import { SetupReminderBanner } from './components/SetupReminderBanner';
import { useCanvasState } from './hooks/useCanvasState';
import { useWorkspaceManager } from './hooks/useWorkspaceManager';
import { createWidget } from './utils/widgetFactory';
import './styles/Canvas.css';
import './styles/CommandPalette.css';

export const Canvas: React.FC = () => {
  const {
    workspaces,
    activeWorkspaceId,
    createWorkspace,
    renameWorkspace,
    deleteWorkspace,
    switchWorkspace,
  } = useWorkspaceManager();

  const {
    canvasState,
    addWidget,
    removeWidget,
    updateWidget,
    selectWidget,
    bringToFront,
    changeWidgetState,
    setCanvasPan,
    setCanvasScale,
  } = useCanvasState();

  const initializedRef = useRef(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [wheelPanTransform, setWheelPanTransform] = useState({ x: 0, y: 0 });
  const wheelPanTransformRef = useRef({ x: 0, y: 0 });
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<string | undefined>(undefined);

  // Debounced state persistence with idle detection
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastInteractionRef = useRef<number>(Date.now());
  const idleCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const SAVE_DEBOUNCE_MS = 500; // Debounce during active use
  const IDLE_THRESHOLD_MS = 2000; // Consider idle after 2s of no interaction
  const IDLE_CHECK_INTERVAL_MS = 1000; // Check for idle every 1s

  // Check onboarding status on mount
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!window.config) return;

      try {
        const result = await window.config.shouldShowOnboarding();
        console.log('[ONBOARDING] Check result:', result);

        if (result.success && result.shouldShow) {
          setShowOnboarding(true);
        } else if (result.success && !result.shouldShow && result.hasApiKey === false) {
          // Onboarding was completed but API key not configured
          // Show reminder if user skipped API key setup
          const onboardingState = await window.config.getOnboardingStatus();
          if (onboardingState.success && onboardingState.status?.skipped) {
            setShowReminder(true);
          }
        }
      } catch (error) {
        console.error('[ONBOARDING] Failed to check onboarding status:', error);
      }
    };

    checkOnboarding();
  }, []);

  // Load saved workspace state from SQLite on mount
  useEffect(() => {
    // Only initialize once (prevents StrictMode double-run)
    if (!initializedRef.current && window.claudeCode) {
      initializedRef.current = true;

      const loadWorkspace = async () => {
        try {
          console.log('[LOAD] Starting workspace load...');

          // Get workspace
          const workspaceResult = await window.claudeCode.getWorkspace();
          console.log('[LOAD] Workspace result:', workspaceResult);

          if (!workspaceResult.success || !workspaceResult.workspace) {
            throw new Error('Failed to get workspace');
          }

          const workspace = workspaceResult.workspace;
          setWorkspaceId(workspace.id);
          console.log('[LOAD] Workspace ID:', workspace.id);

          // Load widgets
          const widgetsResult = await window.claudeCode.loadWidgets(workspace.id);
          console.log('[LOAD] Widgets result:', widgetsResult);

          if (widgetsResult.success && widgetsResult.widgets && widgetsResult.widgets.length > 0) {
            // Get current viewport dimensions
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            console.log('[LOAD] Viewport dimensions:', viewportWidth, 'x', viewportHeight);

            // Restore widgets from database with bounds checking
            widgetsResult.widgets.forEach((widget: any) => {
              console.log('[LOAD] Restoring widget:', widget.id, widget.name, 'at position:', widget.position, 'logs:', widget.logs?.length || 0);

              // Check if widget is out of bounds
              let adjustedWidget = { ...widget };
              let needsAdjustment = false;

              // Check if widget is completely off-screen
              if (widget.position.x < 0 || widget.position.x > viewportWidth - 200) {
                adjustedWidget.position.x = Math.max(50, Math.min(widget.position.x, viewportWidth - widget.size.width - 50));
                needsAdjustment = true;
                console.log('[LOAD] ⚠️  Adjusted X position from', widget.position.x, 'to', adjustedWidget.position.x);
              }

              if (widget.position.y < 0 || widget.position.y > viewportHeight - 100) {
                adjustedWidget.position.y = Math.max(50, Math.min(widget.position.y, viewportHeight - widget.size.height - 50));
                needsAdjustment = true;
                console.log('[LOAD] ⚠️  Adjusted Y position from', widget.position.y, 'to', adjustedWidget.position.y);
              }

              if (needsAdjustment) {
                console.log('[LOAD] 🔧 Widget was off-screen, adjusted to:', adjustedWidget.position);
              }

              addWidget(adjustedWidget);
            });

            // Restore canvas state
            setCanvasScale(workspace.scale || 1);
            setCanvasPan({ x: workspace.pan_x || 0, y: workspace.pan_y || 0 });

            console.log(`[LOAD] ✅ Restored ${widgetsResult.widgets.length} widgets from database`);
          } else {
            // No saved widgets - don't create default widget yet if onboarding is active
            // The widget will be created after onboarding completes
            const onboardingResult = await window.config.shouldShowOnboarding();
            if (!onboardingResult.success || !onboardingResult.shouldShow) {
              // Onboarding is complete or not needed, create default widget
              const widget = createWidget({
                name: 'Agent 1',
                type: 'agent',
                status: 'idle',
                position: { x: 100, y: 100 },
              });
              addWidget(widget);
              console.log('[LOAD] ✅ Created default widget (onboarding complete)');
            } else {
              console.log('[LOAD] ⏸️  Skipping default widget creation (onboarding active)');
            }
          }
        } catch (error) {
          console.error('Failed to load workspace:', error);
          // Fallback: check if onboarding is active before creating default widget
          try {
            const onboardingResult = await window.config.shouldShowOnboarding();
            if (!onboardingResult.success || !onboardingResult.shouldShow) {
              const widget = createWidget({
                name: 'Agent 1',
                type: 'agent',
                status: 'idle',
                position: { x: 100, y: 100 },
              });
              addWidget(widget);
              console.log('[LOAD] ✅ Created fallback default widget');
            }
          } catch (err) {
            // If even onboarding check fails, just create the widget
            const widget = createWidget({
              name: 'Agent 1',
              type: 'agent',
              status: 'idle',
              position: { x: 100, y: 100 },
            });
            addWidget(widget);
            console.log('[LOAD] ✅ Created emergency fallback widget');
          }
        }
      };

      loadWorkspace();
    }
  }, [addWidget, setCanvasScale, setCanvasPan]);

  // Load widgets when active workspace changes
  useEffect(() => {
    if (!activeWorkspaceId || !window.claudeCode) return;

    const loadWorkspaceWidgets = async () => {
      try {
        console.log('[WORKSPACE_SWITCH] Loading workspace:', activeWorkspaceId);

        // Clear current widgets first
        const currentWidgets = Array.from(canvasState.widgets.keys());
        currentWidgets.forEach(id => removeWidget(id));

        // Load widgets for this workspace
        const widgetsResult = await window.claudeCode.loadWidgets(activeWorkspaceId);
        console.log('[WORKSPACE_SWITCH] Widgets loaded:', widgetsResult);

        if (widgetsResult.success && widgetsResult.widgets) {
          // Load workspace state (pan/scale)
          const workspaceResult = await window.claudeCode.getWorkspaceById?.(activeWorkspaceId);
          if (workspaceResult?.success && workspaceResult.workspace) {
            setCanvasScale(workspaceResult.workspace.scale || 1);
            setCanvasPan({
              x: workspaceResult.workspace.pan_x || 0,
              y: workspaceResult.workspace.pan_y || 0
            });
          }

          // Restore widgets
          widgetsResult.widgets.forEach((widget: any) => {
            addWidget(widget);
          });

          setWorkspaceId(activeWorkspaceId);
          console.log(`[WORKSPACE_SWITCH] ✅ Loaded ${widgetsResult.widgets.length} widgets`);
        }
      } catch (error) {
        console.error('[WORKSPACE_SWITCH] Failed to load workspace:', error);
      }
    };

    // Only load if this is different from current workspace
    if (activeWorkspaceId !== workspaceId) {
      loadWorkspaceWidgets();
    }
  }, [activeWorkspaceId]);

  // Save workspace state to SQLite with intelligent debouncing
  useEffect(() => {
    // Don't save on initial render or if workspace not loaded
    if (!initializedRef.current || !workspaceId || !window.claudeCode) return;

    const saveState = async () => {
      try {
        console.log('[SAVE] Starting save operation...');
        console.log('[SAVE] Workspace ID:', workspaceId);
        console.log('[SAVE] Canvas scale:', canvasState.scale);
        console.log('[SAVE] Canvas pan:', canvasState.pan);
        console.log('[SAVE] Number of widgets:', canvasState.widgets.size);

        // Save workspace state (pan, zoom)
        const saveWorkspaceResult = await window.claudeCode.saveWorkspaceState(workspaceId, canvasState.scale, canvasState.pan);
        console.log('[SAVE] Workspace state result:', saveWorkspaceResult);

        // Save each widget
        for (const widget of canvasState.widgets.values()) {
          console.log('[SAVE] Saving widget:', widget.id, widget.name, 'at position:', widget.position);
          const widgetResult = await window.claudeCode.saveWidget(workspaceId, widget);
          console.log('[SAVE] Widget save result:', widgetResult);
        }

        const syncTime = Date.now();
        setLastSyncTime(syncTime);
        console.log('[SAVE] ✅ Save complete at:', new Date(syncTime).toLocaleTimeString());
      } catch (error) {
        console.error('[SAVE] ❌ Failed to save workspace state:', error);
      }
    };

    // Update last interaction time
    lastInteractionRef.current = Date.now();

    console.log('[DEBOUNCE] State changed, scheduling debounced save...');
    console.log('[DEBOUNCE] Widgets count:', canvasState.widgets.size);

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      console.log('[DEBOUNCE] Clearing previous timeout');
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule debounced save
    saveTimeoutRef.current = setTimeout(() => {
      console.log('[DEBOUNCE] Timeout reached, executing save...');
      saveState();
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [canvasState, workspaceId]);

  // Idle detection - force save when user becomes idle
  useEffect(() => {
    if (!initializedRef.current || !workspaceId || !window.claudeCode) return;

    const checkIdle = async () => {
      const now = Date.now();
      const timeSinceLastInteraction = now - lastInteractionRef.current;

      // If idle and there's a pending save, execute it immediately
      if (timeSinceLastInteraction >= IDLE_THRESHOLD_MS && saveTimeoutRef.current) {
        console.log('[IDLE] User idle detected, forcing save...');
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;

        try {
          console.log('[IDLE] Starting idle save...');
          await window.claudeCode.saveWorkspaceState(workspaceId, canvasState.scale, canvasState.pan);
          for (const widget of canvasState.widgets.values()) {
            console.log('[IDLE] Saving widget:', widget.id, widget.name);
            await window.claudeCode.saveWidget(workspaceId, widget);
          }
          const syncTime = Date.now();
          setLastSyncTime(syncTime);
          console.log('[IDLE] ✅ Idle save completed at:', new Date(syncTime).toLocaleTimeString());
        } catch (error) {
          console.error('Failed to save workspace state:', error);
        }
      }
    };

    // Check for idle state periodically
    idleCheckIntervalRef.current = setInterval(checkIdle, IDLE_CHECK_INTERVAL_MS);

    return () => {
      if (idleCheckIntervalRef.current) {
        clearInterval(idleCheckIntervalRef.current);
      }
    };
  }, [canvasState, workspaceId]);

  // Listen for spawn-widget events from Electron
  useEffect(() => {
    if (!window.claudeCode) return;

    const cleanup = window.claudeCode.onSpawnWidget((data: { type: string; name: string; initialContent?: string; path?: string }) => {
      const widgetCount = canvasState.widgets.size;
      const newWidget = createWidget({
        name: data.name,
        type: data.type as 'agent' | 'document' | 'filebrowser',
        status: 'idle',
        position: {
          x: 100 + (widgetCount % 4) * 350,
          y: 100 + Math.floor(widgetCount / 4) * 220,
        },
        content: data.initialContent,
        path: data.path,
      });
      addWidget(newWidget);
    });

    return cleanup;
  }, [addWidget, canvasState.widgets.size]);

  // Listen for internal spawn-widget requests (e.g., from FileBrowser)
  useEffect(() => {
    const handleSpawnRequest = (event: CustomEvent) => {
      const data = event.detail;
      const widgetCount = canvasState.widgets.size;
      const newWidget = createWidget({
        name: data.name,
        type: data.type as 'agent' | 'document' | 'filebrowser',
        status: 'idle',
        position: {
          x: 100 + (widgetCount % 4) * 350,
          y: 100 + Math.floor(widgetCount / 4) * 220,
        },
        content: data.initialContent,
        path: data.path,
      });
      addWidget(newWidget);
    };

    window.addEventListener('spawn-widget-request', handleSpawnRequest as EventListener);

    return () => {
      window.removeEventListener('spawn-widget-request', handleSpawnRequest as EventListener);
    };
  }, [addWidget, canvasState.widgets.size]);

  // Handle creating new agent widget
  const handleCreateWidget = () => {
    const widgetCount = canvasState.widgets.size;
    const newWidget = createWidget({
      name: `Agent ${widgetCount + 1}`,
      type: 'agent',
      status: 'idle',
      position: {
        x: 100 + (widgetCount % 4) * 350,
        y: 100 + Math.floor(widgetCount / 4) * 220,
      },
    });
    addWidget(newWidget);
  };

  // Quick spawn file browser
  const handleSpawnFileBrowser = () => {
    const widgetCount = canvasState.widgets.size;
    const homeDir = typeof process !== 'undefined' && process.env?.HOME
      ? process.env.HOME
      : '/Users/samule';

    const newWidget = createWidget({
      name: 'File Browser',
      type: 'filebrowser',
      status: 'idle',
      position: {
        x: 100 + (widgetCount % 4) * 350,
        y: 100 + Math.floor(widgetCount / 4) * 220,
      },
      path: `${homeDir}/Documents`,
    });
    addWidget(newWidget);
  };

  // Quick spawn document editor
  const handleSpawnEditor = () => {
    const widgetCount = canvasState.widgets.size;
    const newWidget = createWidget({
      name: 'New Document',
      type: 'document',
      status: 'idle',
      position: {
        x: 100 + (widgetCount % 4) * 350,
        y: 100 + Math.floor(widgetCount / 4) * 220,
      },
      content: '// Start coding...\n',
    });
    addWidget(newWidget);
  };

  // Remove widget (also delete from database)
  const handleRemoveWidget = async (widgetId: string) => {
    // Remove from React state
    removeWidget(widgetId);

    // Delete from database
    if (window.claudeCode) {
      try {
        await window.claudeCode.deleteWidget(widgetId);
        console.log('[DELETE] Widget deleted from database:', widgetId);
      } catch (error) {
        console.error('[DELETE] Failed to delete widget from database:', error);
      }
    }
  };

  // Create new workspace
  const handleCreateWorkspace = async () => {
    const name = `Workspace ${workspaces.length + 1}`;
    const newWorkspace = await createWorkspace(name);
    if (newWorkspace) {
      switchWorkspace(newWorkspace.id);
    }
  };

  // Onboarding handlers
  const handleOnboardingComplete = () => {
    console.log('[ONBOARDING] Wizard completed');
    setShowOnboarding(false);

    // Create first widget now that onboarding is complete and API key is set
    if (canvasState.widgets.length === 0) {
      const widget = createWidget({
        name: 'Agent 1',
        type: 'agent',
        status: 'idle',
        position: { x: 100, y: 100 },
      });
      addWidget(widget);
      console.log('[ONBOARDING] ✅ Created first widget after onboarding');
    }
  };

  const handleOnboardingSkip = () => {
    console.log('[ONBOARDING] Wizard skipped');
    setShowOnboarding(false);
    setShowReminder(true);
  };

  // Reminder banner handlers
  const handleReminderConfigure = () => {
    console.log('[REMINDER] Opening settings to configure API key');
    setShowReminder(false);
    setSettingsInitialTab('api-keys');
    setShowSettingsModal(true);
  };

  const handleReminderDismiss = () => {
    console.log('[REMINDER] Banner dismissed');
    setShowReminder(false);
  };

  // Auto-arrange widgets using 2D bin-packing algorithm
  const handleAutoArrange = () => {
    const widgets = Array.from(canvasState.widgets.values());
    if (widgets.length === 0) return;

    // Sort by area (largest first) for better packing
    const sortedWidgets = [...widgets].sort((a, b) => {
      const areaA = a.size.width * a.size.height;
      const areaB = b.size.width * b.size.height;
      return areaB - areaA;
    });

    const padding = 20;

    // Calculate available space based on current zoom level
    // When zoomed out, the visible canvas space increases
    const visibleWidth = window.innerWidth / canvasState.scale;
    const visibleHeight = window.innerHeight / canvasState.scale;

    // Calculate starting position relative to viewport top-left
    // Account for current pan to anchor to top-left of visible area
    const startX = (-canvasState.pan.x / canvasState.scale) + 100;
    const startY = (-canvasState.pan.y / canvasState.scale) + 100;

    // Use visible space minus margins for better space utilization
    const maxRowWidth = visibleWidth - 200; // Leave 100px margin on each side (in canvas coordinates)

    console.log('[ARRANGE] Zoom level:', canvasState.scale);
    console.log('[ARRANGE] Pan offset:', canvasState.pan);
    console.log('[ARRANGE] Visible canvas space:', visibleWidth, 'x', visibleHeight);
    console.log('[ARRANGE] Starting position:', startX, startY);
    console.log('[ARRANGE] Max row width:', maxRowWidth);

    // Track occupied rectangles
    interface Rect {
      x: number;
      y: number;
      width: number;
      height: number;
    }
    const occupiedRects: Rect[] = [];

    // Helper: Check if a rectangle overlaps with any occupied rectangle
    const overlaps = (rect: Rect): boolean => {
      return occupiedRects.some(occupied => {
        return !(
          rect.x + rect.width + padding <= occupied.x ||
          rect.x >= occupied.x + occupied.width + padding ||
          rect.y + rect.height + padding <= occupied.y ||
          rect.y >= occupied.y + occupied.height + padding
        );
      });
    };

    // Helper: Find the best position for a widget
    const findBestPosition = (width: number, height: number): { x: number; y: number } => {
      // Try positions starting from top-left, moving right then down
      for (let y = startY; y < startY + 2000; y += 10) {
        for (let x = startX; x < startX + maxRowWidth; x += 10) {
          // Check if widget fits within canvas bounds
          if (x + width > startX + maxRowWidth) continue;

          const candidate: Rect = { x, y, width, height };
          if (!overlaps(candidate)) {
            return { x, y };
          }
        }
      }
      // Fallback: place at bottom
      const maxY = Math.max(...occupiedRects.map(r => r.y + r.height), startY);
      return { x: startX, y: maxY + padding };
    };

    // Place each widget
    sortedWidgets.forEach((widget) => {
      const position = findBestPosition(widget.size.width, widget.size.height);

      updateWidget(widget.id, { position });

      // Mark this space as occupied
      occupiedRects.push({
        x: position.x,
        y: position.y,
        width: widget.size.width,
        height: widget.size.height,
      });
    });
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      selectWidget(null);
    }
  };

  // Canvas panning
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Pan with middle mouse button or space+left click
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - canvasState.pan.x, y: e.clientY - canvasState.pan.y });
    }
  };

  useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Use requestAnimationFrame for smooth 60fps updates
      requestAnimationFrame(() => {
        setCanvasPan({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
      });
    };

    const handleMouseUp = () => {
      setIsPanning(false);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, panStart, setCanvasPan]);

  // Wheel zoom and 2-finger pan with throttling
  const wheelPanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleWheel = (e: React.WheelEvent) => {
    // Check if target is a widget (has agent-widget class in parents)
    const target = e.target as HTMLElement;
    const isOnWidget = target.closest('.agent-widget');

    // Zoom with Ctrl/Cmd + scroll
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newScale = Math.max(0.1, Math.min(3, canvasState.scale + delta));
      setCanvasScale(newScale);
      return;
    }

    // 2-finger trackpad pan (only when not on a widget)
    if (!isOnWidget && (Math.abs(e.deltaX) > 0 || Math.abs(e.deltaY) > 0)) {
      e.preventDefault();

      // Apply transform immediately for visual feedback
      const newTransformX = wheelPanTransformRef.current.x - e.deltaX;
      const newTransformY = wheelPanTransformRef.current.y - e.deltaY;

      wheelPanTransformRef.current = { x: newTransformX, y: newTransformY };
      setWheelPanTransform({ x: newTransformX, y: newTransformY });

      // Throttle state updates - commit transform to actual pan state
      if (wheelPanTimeoutRef.current) {
        clearTimeout(wheelPanTimeoutRef.current);
      }

      wheelPanTimeoutRef.current = setTimeout(() => {
        setCanvasPan({
          x: canvasState.pan.x + wheelPanTransformRef.current.x,
          y: canvasState.pan.y + wheelPanTransformRef.current.y,
        });
        wheelPanTransformRef.current = { x: 0, y: 0 };
        setWheelPanTransform({ x: 0, y: 0 });
      }, 50);
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    setCanvasScale(Math.min(3, canvasState.scale + 0.1));
  };

  const handleZoomOut = () => {
    setCanvasScale(Math.max(0.1, canvasState.scale - 0.1));
  };

  const handleZoomReset = () => {
    setCanvasScale(1);
    setCanvasPan({ x: 0, y: 0 });
  };

  const handleClearWorkspace = async () => {
    if (window.confirm('Clear workspace? This will remove all widgets and reset the canvas.')) {
      if (workspaceId && window.claudeCode) {
        await window.claudeCode.clearWorkspace(workspaceId);
      }
      window.location.reload();
    }
  };

  // Manual save function
  const handleManualSave = useCallback(async () => {
    console.log('[MANUAL] Manual save triggered (Cmd+S)');

    if (!workspaceId || !window.claudeCode) {
      console.log('[MANUAL] Cannot save - workspace ID or claudeCode not available');
      return;
    }

    try {
      // Clear any pending debounced save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }

      console.log('[MANUAL] Starting save...');
      console.log('[MANUAL] Workspace ID:', workspaceId);
      console.log('[MANUAL] Number of widgets:', canvasState.widgets.size);

      // Save immediately
      const workspaceResult = await window.claudeCode.saveWorkspaceState(workspaceId, canvasState.scale, canvasState.pan);
      console.log('[MANUAL] Workspace result:', workspaceResult);

      for (const widget of canvasState.widgets.values()) {
        console.log('[MANUAL] Saving widget:', widget.id, widget.name, 'at position:', widget.position);
        const widgetResult = await window.claudeCode.saveWidget(workspaceId, widget);
        console.log('[MANUAL] Widget result:', widgetResult);
      }

      const syncTime = Date.now();
      setLastSyncTime(syncTime);
      console.log('[MANUAL] ✅ Manual save completed at:', new Date(syncTime).toLocaleTimeString());

      // Show visual feedback (you could add a toast notification here)
    } catch (error) {
      console.error('[MANUAL] ❌ Manual save failed:', error);
    }
  }, [workspaceId, canvasState]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+S - Manual save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
        return;
      }

      // Cmd+K - Show command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
        return;
      }

      // Cmd+Shift+P - Show command palette (alternative)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        setShowCommandPalette(true);
        return;
      }

      // Cmd+N - Create new widget
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleCreateWidget();
        return;
      }

      // Cmd+W - Close focused widget
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault();
        if (canvasState.selectedWidgetId) {
          handleRemoveWidget(canvasState.selectedWidgetId);
        }
        return;
      }

      // Cmd+A - Auto-arrange
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        handleAutoArrange();
        return;
      }

      // Cmd+ + - Zoom in
      if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomIn();
        return;
      }

      // Cmd+ - - Zoom out
      if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault();
        handleZoomOut();
        return;
      }

      // Cmd+0 - Reset zoom
      if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault();
        handleZoomReset();
        return;
      }

      // Cmd+Up - Expand selected widget
      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowUp') {
        e.preventDefault();
        if (canvasState.selectedWidgetId) {
          changeWidgetState(canvasState.selectedWidgetId, 'expanded');
        }
        return;
      }

      // Cmd+Down - Minimize selected widget
      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowDown') {
        e.preventDefault();
        if (canvasState.selectedWidgetId) {
          changeWidgetState(canvasState.selectedWidgetId, 'minimized');
        }
        return;
      }

      // Cmd+Shift+C - Compact all widgets
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        Array.from(canvasState.widgets.keys()).forEach(id => {
          changeWidgetState(id, 'compact');
        });
        return;
      }

      // Cmd+, - Open settings
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setShowSettingsModal(true);
        return;
      }

      // Cmd+T - New workspace
      if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault();
        handleCreateWorkspace();
        return;
      }

      // Cmd+1-9 - Switch to workspace by index
      if ((e.metaKey || e.ctrlKey) && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (index < workspaces.length) {
          switchWorkspace(workspaces[index].id);
        }
        return;
      }

      // Escape - Deselect
      if (e.key === 'Escape') {
        selectWidget(null);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvasState.selectedWidgetId, handleCreateWidget, handleAutoArrange, handleZoomIn, handleZoomOut, handleZoomReset, handleManualSave, handleRemoveWidget, changeWidgetState, selectWidget]);

  return (
    <>
      {/* Onboarding Wizard */}
      {showOnboarding && (
        <OnboardingWizard
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}

      {/* Setup Reminder Banner */}
      {showReminder && !showOnboarding && (
        <SetupReminderBanner
          onConfigure={handleReminderConfigure}
          onDismiss={handleReminderDismiss}
        />
      )}

      <div
        className="canvas-container"
        onClick={handleCanvasClick}
        onMouseDown={handleCanvasMouseDown}
        onWheel={handleWheel}
        style={{ cursor: isPanning ? 'grabbing' : 'default' }}
      >
        {/* Workspace Tabs */}
        <WorkspaceTabs
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          onSwitch={switchWorkspace}
          onCreate={handleCreateWorkspace}
          onRename={renameWorkspace}
          onDelete={deleteWorkspace}
        />


      <div className="canvas-toolbar">
        <div className="toolbar-section">
          <button className="toolbar-button toolbar-button--primary" onClick={handleCreateWidget} title="Create a new AI agent with Claude">
            New
          </button>
          <button className="toolbar-button" onClick={handleSpawnFileBrowser} title="Open file system browser">
            📁 File
          </button>
          <button className="toolbar-button" onClick={handleSpawnEditor} title="Open a new text editor">
            📝 Editor
          </button>
        </div>

        <div className="toolbar-divider"></div>

        <div className="toolbar-section">
          <button className="toolbar-button" onClick={handleAutoArrange} title="Auto-arrange all widgets">
            ⚓ Arrange
          </button>
          <button className="toolbar-button" onClick={handleClearWorkspace} title="Clear workspace and reset">
            🗑️ Clear
          </button>
        </div>

        <div className="toolbar-divider"></div>

        <div className="toolbar-section">
          <button className="toolbar-button" onClick={handleZoomOut} title="Zoom out (Ctrl+Scroll)">
            🔍-
          </button>
          <span className="zoom-display">{(canvasState.scale * 100).toFixed(0)}%</span>
          <button className="toolbar-button" onClick={handleZoomIn} title="Zoom in (Ctrl+Scroll)">
            🔍+
          </button>
          <button className="toolbar-button" onClick={handleZoomReset} title="Reset zoom and pan">
            ⟲ Reset
          </button>
        </div>

        <div className="toolbar-divider"></div>

        <div className="toolbar-section">
          <button className="toolbar-button" onClick={() => setShowSettingsModal(true)} title="Open settings (Cmd+,)">
            ⚙️ Settings
          </button>
          <button
            className="toolbar-button"
            onClick={async () => {
              await window.shell?.openExternal(`mailto:samule@microsoft.com?subject=${encodeURIComponent('Workspace Canvas Feedback')}&body=${encodeURIComponent('Hi Samuel,\n\nI wanted to share some feedback about Workspace Canvas:\n\n')}`);
            }}
            title="Send feedback about Workspace Canvas"
          >
            📧 Feedback
          </button>
        </div>

        <div className="canvas-info">
          <span>Widgets: {canvasState.widgets.size}</span>
          <span>Selected: {canvasState.selectedWidgetId || 'None'}</span>
          <span className="canvas-info-hint" title="Last auto-save time">
            {lastSyncTime ? `💾 Synced ${new Date(lastSyncTime).toLocaleTimeString()}` : '💾 Not synced'}
          </span>
        </div>
      </div>

      <div
        ref={canvasRef}
        className={`canvas ${isPanning ? 'canvas--panning' : ''}`}
        style={{
          transform: `translate(${canvasState.pan.x + wheelPanTransform.x}px, ${canvasState.pan.y + wheelPanTransform.y}px) scale(${canvasState.scale})`,
        }}
      >
        {Array.from(canvasState.widgets.values()).map((widget) => (
          <AgentWidget
            key={widget.id}
            widget={widget}
            workspaceId={activeWorkspaceId || undefined}
            isSelected={canvasState.selectedWidgetId === widget.id}
            onSelect={selectWidget}
            onUpdate={updateWidget}
            onStateChange={changeWidgetState}
            onBringToFront={bringToFront}
            onClose={handleRemoveWidget}
          />
        ))}
      </div>

      {/* Command Palette */}
      {showCommandPalette && (
        <div className="command-palette-overlay" onClick={() => { setShowCommandPalette(false); setCommandSearch(''); }}>
          <div className="command-palette" onClick={(e) => e.stopPropagation()}>
            <div className="command-palette-header">
              <input
                type="text"
                className="command-palette-input"
                placeholder="Type to search commands..."
                value={commandSearch}
                onChange={(e) => setCommandSearch(e.target.value)}
                autoFocus
              />
              <button className="command-palette-close" onClick={() => { setShowCommandPalette(false); setCommandSearch(''); }}>×</button>
            </div>
            <div className="command-palette-content">
              {(() => {
                const search = commandSearch.toLowerCase();
                const matchCommand = (label: string) => label.toLowerCase().includes(search);

                // Create section
                const createCommands = [
                  { icon: '🤖', label: 'New', shortcut: '⌘N', action: handleCreateWidget },
                  { icon: '📝', label: 'New Editor', action: handleSpawnEditor },
                  { icon: '📁', label: 'File Browser', action: handleSpawnFileBrowser },
                ].filter(cmd => matchCommand(cmd.label));

                // View section
                const viewCommands = [
                  { icon: '⚓', label: 'Auto-arrange Widgets', shortcut: '⌘A', action: handleAutoArrange },
                  { icon: '🔍', label: 'Zoom In', shortcut: '⌘+', action: handleZoomIn },
                  { icon: '🔍', label: 'Zoom Out', shortcut: '⌘-', action: handleZoomOut },
                  { icon: '⟲', label: 'Reset Zoom', shortcut: '⌘0', action: handleZoomReset },
                ].filter(cmd => matchCommand(cmd.label));

                // Settings section
                const settingsCommands = [
                  { icon: '⚙️', label: 'Open Settings', action: () => { setShowCommandPalette(false); setShowSettingsModal(true); }, shortcut: '⌘,' },
                  { icon: '📧', label: 'Send Feedback', action: async () => {
                    setShowCommandPalette(false);
                    await window.shell?.openExternal(`mailto:samule@microsoft.com?subject=${encodeURIComponent('Workspace Canvas Feedback')}&body=${encodeURIComponent('Hi Samuel,\n\nI wanted to share some feedback about Workspace Canvas:\n\n')}`);
                  }, shortcut: undefined },
                  { icon: '⌨️', label: 'Keyboard Shortcuts', action: () => { setShowCommandPalette(false); setShowShortcutsModal(true); }, shortcut: undefined },
                  { icon: '🗑️', label: 'Clear Workspace', action: handleClearWorkspace, shortcut: undefined },
                ].filter(cmd => matchCommand(cmd.label));

                return (
                  <>
                    {createCommands.length > 0 && (
                      <div className="command-palette-section">
                        <div className="command-palette-section-title">Create</div>
                        {createCommands.map((cmd, i) => (
                          <button key={i} className="command-palette-item" onClick={() => { cmd.action(); setShowCommandPalette(false); setCommandSearch(''); }}>
                            <span className="command-palette-icon">{cmd.icon}</span>
                            <span className="command-palette-label">{cmd.label}</span>
                            {cmd.shortcut && <span className="command-palette-shortcut">{cmd.shortcut}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    {viewCommands.length > 0 && (
                      <div className="command-palette-section">
                        <div className="command-palette-section-title">View</div>
                        {viewCommands.map((cmd, i) => (
                          <button key={i} className="command-palette-item" onClick={() => { cmd.action(); setShowCommandPalette(false); setCommandSearch(''); }}>
                            <span className="command-palette-icon">{cmd.icon}</span>
                            <span className="command-palette-label">{cmd.label}</span>
                            {cmd.shortcut && <span className="command-palette-shortcut">{cmd.shortcut}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    {settingsCommands.length > 0 && (
                      <div className="command-palette-section">
                        <div className="command-palette-section-title">Settings</div>
                        {settingsCommands.map((cmd, i) => (
                          <button key={i} className="command-palette-item" onClick={() => { cmd.action(); setCommandSearch(''); }}>
                            <span className="command-palette-icon">{cmd.icon}</span>
                            <span className="command-palette-label">{cmd.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {createCommands.length === 0 && viewCommands.length === 0 && settingsCommands.length === 0 && (
                      <div className="command-palette-empty">
                        No commands found for "{commandSearch}"
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Shortcuts Modal (accessed via command palette) */}
      <ShortcutsModal isOpen={showShortcutsModal} onClose={() => setShowShortcutsModal(false)} />
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => {
          setShowSettingsModal(false);
          setSettingsInitialTab(undefined);
        }}
        initialTab={settingsInitialTab}
      />
    </div>
    </>
  );
};
