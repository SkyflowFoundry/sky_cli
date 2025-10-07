/**
 * Global test setup
 * This file runs before all tests
 */

// Suppress console output during tests to keep test output clean
beforeAll(() => {
  global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
});

// Restore all mocks after all tests
afterAll(() => {
  jest.restoreAllMocks();
});
