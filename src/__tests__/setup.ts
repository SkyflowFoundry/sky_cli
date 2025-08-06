// Test setup file
// This file is executed before each test file

// Mock console methods to avoid noise in test output
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

// Mock process.exit to prevent tests from actually exiting
const originalExit = process.exit;
beforeEach(() => {
  process.exit = jest.fn() as any;
});

afterEach(() => {
  process.exit = originalExit;
  jest.clearAllMocks();
});