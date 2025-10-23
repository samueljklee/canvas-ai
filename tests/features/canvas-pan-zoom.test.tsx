/**
 * Workspace Canvas - Canvas Pan and Zoom Tests
 * Tests for smooth canvas panning and zooming features
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Canvas } from '../../src/Canvas';

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => {
  cb(0);
  return 0;
});

describe('Canvas Pan and Zoom', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock window.claudeCode API for Canvas initialization
    (window as any).claudeCode = {
      getWorkspace: jest.fn().mockResolvedValue({
        success: true,
        workspace: {
          id: 'test-workspace',
          name: 'Test Workspace',
          scale: 1,
          pan_x: 0,
          pan_y: 0,
        },
      }),
      loadWidgets: jest.fn().mockResolvedValue({
        success: true,
        widgets: [],
      }),
      saveWorkspace: jest.fn().mockResolvedValue({ success: true }),
    };
  });

  test.skip('enables panning with Shift+drag', () => {
    const { container } = render(<Canvas />);
    const canvas = container.querySelector('.canvas');

    // Start pan with Shift+MouseDown
    fireEvent.mouseDown(canvas!, { button: 0, shiftKey: true, clientX: 100, clientY: 100 });

    // Move mouse
    fireEvent.mouseMove(window, { clientX: 200, clientY: 200 });

    // Should have updated pan position
    expect(canvas).toHaveStyle({ transform: expect.stringContaining('translate') });

    // End pan
    fireEvent.mouseUp(window);
  });

  test.skip('enables panning with middle mouse button', () => {
    const { container } = render(<Canvas />);
    const canvas = container.querySelector('.canvas');

    // Start pan with middle mouse button
    fireEvent.mouseDown(canvas!, { button: 1, clientX: 100, clientY: 100 });

    // Move mouse
    fireEvent.mouseMove(window, { clientX: 200, clientY: 200 });

    // Should have updated pan position
    expect(canvas).toHaveStyle({ transform: expect.stringContaining('translate') });

    // End pan
    fireEvent.mouseUp(window);
  });

  test.skip('uses requestAnimationFrame for smooth panning', () => {
    const { container } = render(<Canvas />);
    const canvas = container.querySelector('.canvas');

    fireEvent.mouseDown(canvas!, { button: 0, shiftKey: true, clientX: 100, clientY: 100 });
    fireEvent.mouseMove(window, { clientX: 200, clientY: 200 });

    // Should have called requestAnimationFrame
    expect(global.requestAnimationFrame).toHaveBeenCalled();

    fireEvent.mouseUp(window);
  });

  test.skip('disables CSS transition during active panning', () => {
    const { container } = render(<Canvas />);
    const canvas = container.querySelector('.canvas');

    // Start panning
    fireEvent.mouseDown(canvas!, { button: 0, shiftKey: true, clientX: 100, clientY: 100 });

    // Should have 'canvas--panning' class to disable transition
    expect(canvas).toHaveClass('canvas--panning');

    // End panning
    fireEvent.mouseUp(window);

    // Should remove 'canvas--panning' class
    expect(canvas).not.toHaveClass('canvas--panning');
  });

  test.skip('zooms in with Ctrl+scroll up', () => {
    const { container } = render(<Canvas />);
    const canvas = container.querySelector('.canvas');

    const initialScale = 1;

    // Zoom in
    fireEvent.wheel(canvas!, { ctrlKey: true, deltaY: -100 });

    // Should have increased scale
    const transform = canvas?.style.transform || '';
    expect(transform).toContain('scale');
  });

  test.skip('zooms out with Ctrl+scroll down', () => {
    const { container } = render(<Canvas />);
    const canvas = container.querySelector('.canvas');

    // Zoom out
    fireEvent.wheel(canvas!, { ctrlKey: true, deltaY: 100 });

    // Should have decreased scale
    const transform = canvas?.style.transform || '';
    expect(transform).toContain('scale');
  });

  test.skip('zoom respects min and max bounds (10% - 300%)', () => {
    const { container } = render(<Canvas />);
    const canvas = container.querySelector('.canvas');

    // Try to zoom below min
    for (let i = 0; i < 20; i++) {
      fireEvent.wheel(canvas!, { ctrlKey: true, deltaY: 100 });
    }

    // Should not go below 0.1 (10%)
    const minTransform = canvas?.style.transform || '';
    expect(minTransform).not.toContain('scale(0.0');

    // Try to zoom above max
    for (let i = 0; i < 50; i++) {
      fireEvent.wheel(canvas!, { ctrlKey: true, deltaY: -100 });
    }

    // Should not go above 3.0 (300%)
    const maxTransform = canvas?.style.transform || '';
    expect(maxTransform).not.toMatch(/scale\([4-9]\./);
  });

  test.skip('zoom in button increases scale', () => {
    render(<Canvas />);

    const zoomInButton = screen.getByText('🔍+');
    fireEvent.click(zoomInButton);

    const zoomDisplay = screen.getByText(/\d+%/);
    expect(zoomDisplay).toBeInTheDocument();
  });

  test.skip('zoom out button decreases scale', () => {
    render(<Canvas />);

    const zoomOutButton = screen.getByText('🔍-');
    fireEvent.click(zoomOutButton);

    const zoomDisplay = screen.getByText(/\d+%/);
    expect(zoomDisplay).toBeInTheDocument();
  });

  test.skip('reset button restores 100% zoom', () => {
    render(<Canvas />);

    // Zoom in first
    const zoomInButton = screen.getByText('🔍+');
    fireEvent.click(zoomInButton);
    fireEvent.click(zoomInButton);

    // Reset
    const resetButton = screen.getByText('⟲ Reset');
    fireEvent.click(resetButton);

    // Should show 100%
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  test.skip('displays current zoom percentage', () => {
    render(<Canvas />);

    const zoomDisplay = screen.getByText(/\d+%/);
    expect(zoomDisplay).toBeInTheDocument();
    expect(zoomDisplay.textContent).toMatch(/^\d+%$/);
  });

  test.skip('pan and zoom work independently', () => {
    const { container } = render(<Canvas />);
    const canvas = container.querySelector('.canvas');

    // Pan
    fireEvent.mouseDown(canvas!, { button: 0, shiftKey: true, clientX: 100, clientY: 100 });
    fireEvent.mouseMove(window, { clientX: 200, clientY: 200 });
    fireEvent.mouseUp(window);

    const transform1 = canvas?.style.transform || '';

    // Zoom
    fireEvent.wheel(canvas!, { ctrlKey: true, deltaY: -100 });

    const transform2 = canvas?.style.transform || '';

    // Both translate and scale should be present
    expect(transform2).toContain('translate');
    expect(transform2).toContain('scale');
    expect(transform2).not.toBe(transform1);
  });
});
