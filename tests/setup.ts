import '@testing-library/jest-dom';
import React from 'react';

// Mock nanoid to avoid ESM issues
jest.mock('nanoid', () => ({
  nanoid: jest.fn((size?: number) => {
    const length = size || 21;
    return Math.random().toString(36).substring(2, 2 + length);
  }),
}));

// Mock react-markdown (ESM module)
jest.mock('react-markdown', () => {
  return function ReactMarkdown({ children }: { children: string }) {
    return React.createElement('div', { className: 'mocked-markdown' }, children);
  };
});

// Mock remark-gfm (ESM module)
jest.mock('remark-gfm', () => {
  return () => {};
});

// Mermaid is mocked via jest.config.js moduleNameMapper

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock HTMLElement methods
HTMLElement.prototype.scrollIntoView = jest.fn();

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
