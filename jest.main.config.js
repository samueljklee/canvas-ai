/**
 * Jest configuration for main process tests (Node environment)
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/main'],
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup-main.ts'],
  collectCoverageFrom: [
    'src/main/**/*.{ts}',
    '!src/main/**/*.d.ts',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(nanoid|electron-store)/)',
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        outDir: './dist/main',
        module: 'commonjs',
        moduleResolution: 'node',
        target: 'ES2020',
        lib: ['ES2020'],
        types: ['node', 'jest'],
        skipLibCheck: true,
        esModuleInterop: true,
        resolveJsonModule: true,
        strict: true,
      },
    }],
  },
};
