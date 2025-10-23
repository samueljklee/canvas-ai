/**
 * E2E Test: Widget Lifecycle
 * Tests creating widgets, sending messages, and persistence
 */

import { test, expect, _electron as electron } from '@playwright/test';
import type { ElectronApplication, Page } from 'playwright';
import * as path from 'path';

test.describe('Widget Lifecycle E2E', () => {
  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    // Launch Electron app
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    });

    // Get the first window
    page = await electronApp.firstWindow();

    // Wait for app to be ready
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('should create a new agent widget', async () => {
    // Click the "New Agent" button
    await page.click('button:has-text("New Agent")');

    // Wait for widget to appear
    await page.waitForSelector('.agent-widget', { timeout: 5000 });

    // Verify widget is created
    const widgets = await page.locator('.agent-widget').count();
    expect(widgets).toBeGreaterThan(0);

    // Verify widget has a title
    const widgetTitle = await page.locator('.agent-widget .widget-header-title').first().textContent();
    expect(widgetTitle).toContain('Agent');
  });

  test('should send a message and receive response', async () => {
    // Create a widget if not already present
    const widgetCount = await page.locator('.agent-widget').count();
    if (widgetCount === 0) {
      await page.click('button:has-text("New Agent")');
      await page.waitForSelector('.agent-widget');
    }

    // Find the command input
    const commandInput = page.locator('.widget-command-field').first();

    // Type a message
    await commandInput.fill('Hello!');
    await commandInput.press('Enter');

    // Wait for response in logs
    await page.waitForSelector('.log-viewer .log-entry', { timeout: 15000 });

    // Verify at least one log entry exists
    const logEntries = await page.locator('.log-viewer .log-entry').count();
    expect(logEntries).toBeGreaterThan(0);
  });

  test('should navigate command history with arrow keys', async () => {
    // Create a widget and send commands
    await page.click('button:has-text("New Agent")');
    await page.waitForSelector('.agent-widget');

    const commandInput = page.locator('.widget-command-field').last();

    // Send first command
    await commandInput.fill('First command');
    await commandInput.press('Enter');
    await page.waitForTimeout(1000);

    // Send second command
    await commandInput.fill('Second command');
    await commandInput.press('Enter');
    await page.waitForTimeout(1000);

    // Press arrow up to navigate history
    await commandInput.focus();
    await commandInput.press('ArrowUp');

    // Verify previous command is loaded
    const inputValue = await commandInput.inputValue();
    expect(inputValue).toBe('Second command');

    // Press arrow up again
    await commandInput.press('ArrowUp');
    const inputValue2 = await commandInput.inputValue();
    expect(inputValue2).toBe('First command');
  });

  test('should minimize, compact, and expand widgets', async () => {
    // Create a widget
    await page.click('button:has-text("New Agent")');
    await page.waitForSelector('.agent-widget');

    const widget = page.locator('.agent-widget').last();

    // Click minimize button
    await widget.locator('button[title*="Minimize"]').click();
    await page.waitForTimeout(500);

    // Verify widget is minimized
    await expect(widget).toHaveClass(/agent-widget--minimized/);

    // Click widget to expand
    await widget.click();
    await page.waitForTimeout(500);

    // Verify widget is expanded
    await expect(widget).toHaveClass(/agent-widget--expanded/);
  });

  test('should drag and drop widget', async () => {
    // Create a widget
    await page.click('button:has-text("New Agent")');
    await page.waitForSelector('.agent-widget');

    const widget = page.locator('.agent-widget').last();

    // Get initial position
    const initialBox = await widget.boundingBox();
    expect(initialBox).not.toBeNull();

    // Drag widget header to move it
    const widgetHeader = widget.locator('.widget-header');
    await widgetHeader.hover();
    await page.mouse.down();
    await page.mouse.move(initialBox!.x + 200, initialBox!.y + 100);
    await page.mouse.up();

    // Wait for move to complete
    await page.waitForTimeout(500);

    // Get new position
    const newBox = await widget.boundingBox();
    expect(newBox).not.toBeNull();

    // Verify position changed
    expect(newBox!.x).not.toBe(initialBox!.x);
    expect(newBox!.y).not.toBe(initialBox!.y);
  });

  test('should persist widgets after restart', async () => {
    // Create a widget and send a message
    await page.click('button:has-text("New Agent")');
    await page.waitForSelector('.agent-widget');

    const commandInput = page.locator('.widget-command-field').last();
    await commandInput.fill('Test persistence');
    await commandInput.press('Enter');

    // Wait for response
    await page.waitForSelector('.log-viewer .log-entry', { timeout: 10000 });

    const widgetCountBefore = await page.locator('.agent-widget').count();

    // Close and reopen app
    await electronApp.close();

    // Relaunch
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    });

    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    // Wait for widgets to load
    await page.waitForSelector('.agent-widget', { timeout: 10000 });

    // Verify widgets persisted
    const widgetCountAfter = await page.locator('.agent-widget').count();
    expect(widgetCountAfter).toBeGreaterThanOrEqual(1);

    // Verify logs persisted
    const logEntries = await page.locator('.log-viewer .log-entry').count();
    expect(logEntries).toBeGreaterThan(0);
  });

  test('should create file browser widget', async () => {
    // Click file browser button (📁)
    await page.click('button[title*="File Browser"]');

    // Wait for file browser widget
    await page.waitForSelector('.agent-widget[data-widget-type="filebrowser"]', { timeout: 5000 });

    // Verify file browser is created
    const fileBrowserWidgets = await page.locator('.agent-widget[data-widget-type="filebrowser"]').count();
    expect(fileBrowserWidgets).toBeGreaterThan(0);
  });

  test('should create document editor widget', async () => {
    // Click document editor button (📝)
    await page.click('button[title*="Document"]');

    // Wait for document widget
    await page.waitForSelector('.agent-widget[data-widget-type="document"]', { timeout: 5000 });

    // Verify document editor is created
    const documentWidgets = await page.locator('.agent-widget[data-widget-type="document"]').count();
    expect(documentWidgets).toBeGreaterThan(0);
  });

  test('should delete widget', async () => {
    // Create a widget
    await page.click('button:has-text("New Agent")');
    await page.waitForSelector('.agent-widget');

    const initialCount = await page.locator('.agent-widget').count();

    // Click the widget to select it
    const widget = page.locator('.agent-widget').last();
    await widget.click();

    // Right-click to open context menu
    await widget.locator('.widget-header').click({ button: 'right' });

    // Click delete option
    await page.click('text=Delete');

    // Wait for widget to be removed
    await page.waitForTimeout(500);

    // Verify widget count decreased
    const finalCount = await page.locator('.agent-widget').count();
    expect(finalCount).toBe(initialCount - 1);
  });
});
