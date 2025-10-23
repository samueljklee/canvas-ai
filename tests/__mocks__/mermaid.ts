/**
 * Manual mock for mermaid library
 */

export default {
  initialize: jest.fn(),
  render: jest.fn((id: string, text: string) => Promise.resolve({
    svg: `<svg>${text}</svg>`,
    bindFunctions: jest.fn(),
  })),
};
