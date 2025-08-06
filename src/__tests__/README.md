# Test Suite

This directory contains the comprehensive test suite for the Skyflow CLI.

## Structure

```
__tests__/
├── setup.ts                 # Global test setup and mocks
├── setup.integration.test.ts # Basic setup verification tests
├── commands/                 # Command-specific tests
│   ├── createVault.test.ts  # Tests for create-vault command
│   └── createConnection.test.ts # Tests for create-connection command
└── utils/                   # Utility function tests
    ├── logger.test.ts       # Logger utility tests
    └── prompts.test.ts      # Prompt utility tests
```

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode (for development)
npm run test:watch

# Run specific test file
npx jest createVault.test.ts

# Run tests matching a pattern
npx jest --testNamePattern="vault creation"
```

## Test Categories

### Command Tests

These test the main CLI commands:
- **create-vault**: Tests vault creation with various options, service account creation, role assignment
- **create-connection**: Tests connection creation from configuration files

### Utility Tests

These test shared utility functions:
- **Logger**: Tests verbosity levels and output formatting
- **Prompts**: Tests user input validation and prompt logic

## Mocking Strategy

All tests use extensive mocking to isolate units under test:

- **API calls**: All Skyflow API interactions are mocked
- **File system**: `fs` module is mocked for file operations
- **User input**: `inquirer` is mocked for user prompts
- **Console output**: All console methods are mocked to prevent noise
- **Process exit**: `process.exit` is mocked to prevent test termination

## Coverage

The test suite maintains high coverage standards:
- Lines: 80%+
- Functions: 80%+
- Branches: 70%+
- Statements: 80%+

Coverage reports are available in multiple formats after running `npm run test:coverage`:
- HTML report: `coverage/index.html`
- LCOV format: `coverage/lcov.info`
- JSON summary: `coverage/coverage-summary.json`

## Writing New Tests

When adding new functionality:

1. Create test file alongside the feature (e.g., `newFeature.test.ts`)
2. Mock external dependencies
3. Test both success and error cases
4. Verify proper error handling
5. Include edge cases and boundary conditions
6. Update this README if new test patterns are introduced

## Test Patterns

### Command Testing Pattern

```typescript
describe('command name', () => {
  let program: Command;
  
  beforeEach(() => {
    program = new Command();
    commandFunction(program);
    // Setup mocks
  });
  
  it('should handle success case', async () => {
    // Setup mocks for success
    await program.parseAsync(['node', 'test', 'command', ...args]);
    // Verify expectations
  });
  
  it('should handle error case', async () => {
    // Setup mocks for error
    await program.parseAsync(['node', 'test', 'command', ...args]);
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
```

### Utility Testing Pattern

```typescript
describe('utility function', () => {
  beforeEach(() => {
    // Reset mocks
  });
  
  it('should handle normal case', () => {
    const result = utilityFunction(input);
    expect(result).toBe(expected);
  });
});
```