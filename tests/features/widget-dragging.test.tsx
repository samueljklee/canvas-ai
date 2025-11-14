/**
 * Canvas AI - Widget Dragging Performance Tests
 * Tests for smooth widget dragging with requestAnimationFrame
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AgentWidget } from '../../src/components/AgentWidget';
import { AgentWidgetData } from '../../src/types/widget';

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => {
  cb(0);
  return 0;
});

describe('Widget Dragging Performance', () => {
  const mockWidget: AgentWidgetData = {
    id: 'test-1',
    name: 'Test Widget',
    type: 'agent',
    status: 'idle',
    state: 'expanded',
    position: { x: 100, y: 100 },
    size: { width: 600, height: 500 },
    zIndex: 1,
    logs: [],
  };

  const mockOnSelect = jest.fn();
  const mockOnUpdate = jest.fn();
  const mockOnStateChange = jest.fn();
  const mockOnBringToFront = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test.skip('initiates drag on header mousedown', () => {
    const { container } = render(
      <AgentWidget
        widget={mockWidget}
        isSelected={true}
        onSelect={mockOnSelect}
        onUpdate={mockOnUpdate}
        onStateChange={mockOnStateChange}
        onBringToFront={mockOnBringToFront}
        onClose={mockOnClose}
      />
    );

    const header = container.querySelector('.widget-header');
    fireEvent.mouseDown(header!, { clientX: 100, clientY: 100 });

    // Should add dragging class
    const widget = container.querySelector('.agent-widget');
    expect(widget).toHaveClass('agent-widget--dragging');
  });

  test.skip('uses requestAnimationFrame for smooth drag updates', () => {
    const { container } = render(
      <AgentWidget
        widget={mockWidget}
        isSelected={true}
        onSelect={mockOnSelect}
        onUpdate={mockOnUpdate}
        onStateChange={mockOnStateChange}
        onBringToFront={mockOnBringToFront}
        onClose={mockOnClose}
      />
    );

    const header = container.querySelector('.widget-header');

    // Start drag
    fireEvent.mouseDown(header!, { clientX: 100, clientY: 100 });

    // Move mouse
    fireEvent.mouseMove(window, { clientX: 200, clientY: 200 });

    // Should use requestAnimationFrame for smooth updates
    expect(global.requestAnimationFrame).toHaveBeenCalled();
  });

  test.skip('disables CSS transition during drag', () => {
    const { container } = render(
      <AgentWidget
        widget={mockWidget}
        isSelected={true}
        onSelect={mockOnSelect}
        onUpdate={mockOnUpdate}
        onStateChange={mockOnStateChange}
        onBringToFront={mockOnBringToFront}
        onClose={mockOnClose}
      />
    );

    const header = container.querySelector('.widget-header');
    const widget = container.querySelector('.agent-widget');

    // Start drag
    fireEvent.mouseDown(header!, { clientX: 100, clientY: 100 });

    // Should have agent-widget--dragging class which disables transition
    expect(widget).toHaveClass('agent-widget--dragging');

    // End drag
    fireEvent.mouseUp(window);

    // Should remove dragging class
    expect(widget).not.toHaveClass('agent-widget--dragging');
  });

  test.skip('updates widget position during drag', () => {
    const { container } = render(
      <AgentWidget
        widget={mockWidget}
        isSelected={true}
        onSelect={mockOnSelect}
        onUpdate={mockOnUpdate}
        onStateChange={mockOnStateChange}
        onBringToFront={mockOnBringToFront}
        onClose={mockOnClose}
      />
    );

    const header = container.querySelector('.widget-header');

    // Start drag at (100, 100)
    fireEvent.mouseDown(header!, { clientX: 100, clientY: 100 });

    // Move to (200, 200) - delta of (100, 100)
    fireEvent.mouseMove(window, { clientX: 200, clientY: 200 });

    // Should call onUpdate with new position
    expect(mockOnUpdate).toHaveBeenCalledWith(mockWidget.id, {
      position: expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number),
      }),
    });
  });

  test.skip('ends drag on mouse up', () => {
    const { container } = render(
      <AgentWidget
        widget={mockWidget}
        isSelected={true}
        onSelect={mockOnSelect}
        onUpdate={mockOnUpdate}
        onStateChange={mockOnStateChange}
        onBringToFront={mockOnBringToFront}
        onClose={mockOnClose}
      />
    );

    const header = container.querySelector('.widget-header');
    const widget = container.querySelector('.agent-widget');

    // Start drag
    fireEvent.mouseDown(header!, { clientX: 100, clientY: 100 });
    expect(widget).toHaveClass('agent-widget--dragging');

    // Move
    fireEvent.mouseMove(window, { clientX: 150, clientY: 150 });

    // End drag
    fireEvent.mouseUp(window);

    // Should remove dragging class
    expect(widget).not.toHaveClass('agent-widget--dragging');
  });

  test.skip('mousemove listener is passive for better performance', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

    const { container } = render(
      <AgentWidget
        widget={mockWidget}
        isSelected={true}
        onSelect={mockOnSelect}
        onUpdate={mockOnUpdate}
        onStateChange={mockOnStateChange}
        onBringToFront={mockOnBringToFront}
        onClose={mockOnClose}
      />
    );

    const header = container.querySelector('.widget-header');
    fireEvent.mouseDown(header!, { clientX: 100, clientY: 100 });

    // Check that mousemove listener was added with passive option
    const mousemoveCall = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === 'mousemove'
    );

    expect(mousemoveCall).toBeDefined();
    expect(mousemoveCall![2]).toEqual({ passive: true });

    addEventListenerSpy.mockRestore();
  });

  test.skip('widget has will-change CSS hint during drag', () => {
    const { container } = render(
      <AgentWidget
        widget={mockWidget}
        isSelected={true}
        onSelect={mockOnSelect}
        onUpdate={mockOnUpdate}
        onStateChange={mockOnStateChange}
        onBringToFront={mockOnBringToFront}
        onClose={mockOnClose}
      />
    );

    const header = container.querySelector('.widget-header');
    const widget = container.querySelector('.agent-widget');

    // Start drag
    fireEvent.mouseDown(header!, { clientX: 100, clientY: 100 });

    // Check that dragging class is applied (which has will-change in CSS)
    expect(widget).toHaveClass('agent-widget--dragging');
  });

  test.skip('does not drag when clicking widget controls', () => {
    const { container } = render(
      <AgentWidget
        widget={mockWidget}
        isSelected={true}
        onSelect={mockOnSelect}
        onUpdate={mockOnUpdate}
        onStateChange={mockOnStateChange}
        onBringToFront={mockOnBringToFront}
        onClose={mockOnClose}
      />
    );

    const minimizeButton = container.querySelector('.widget-header-controls button');
    fireEvent.mouseDown(minimizeButton!, { clientX: 100, clientY: 100 });

    const widget = container.querySelector('.agent-widget');

    // Should NOT have dragging class when clicking controls
    expect(widget).not.toHaveClass('agent-widget--dragging');
  });
});
