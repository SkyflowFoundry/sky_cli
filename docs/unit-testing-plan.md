# Unit Testing Implementation Plan

## Overview

This document outlines a comprehensive unit testing strategy for the Skyflow CLI project. The project currently has no existing tests, so we'll establish a testing framework from scratch.

## Testing Stack Recommendation

### Core Testing Tools

1. **Jest** - Testing framework
   - Industry standard for TypeScript/Node.js projects
   - Built-in mocking, assertions, coverage reporting
   - Great TypeScript support

2. **ts-jest** - TypeScript preprocessor for Jest
   - Allows running tests directly on TypeScript files
   - Integrates seamlessly with Jest

3. **@types/jest** - TypeScript type definitions for Jest

4. **nock** - HTTP mocking library
   - Mock external API calls (Skyflow APIs)
   - No actual network requests during tests

### Installation Commands

```bash
npm install --save-dev jest ts-jest @types/jest nock @types/nock
```

## Project Structure

```
sky_cli/
├── src/
│   ├── commands/
│   ├── utils/
│   └── types.ts
├── tests/                          # NEW
│   ├── unit/
│   │   ├── commands/
│   │   │   ├── configure.test.ts
│   │   │   ├── createVault.test.ts
│   │   │   ├── createConnection.test.ts
│   │   │   ├── insert.test.ts
│   │   │   ├── deidentify.test.ts
│   │   │   └── reidentify.test.ts
│   │   └── utils/
│   │       ├── api.test.ts
│   │       ├── config.test.ts
│   │       ├── skyflow.test.ts
│   │       ├── entities.test.ts
│   │       ├── input.test.ts
│   │       ├── logger.test.ts
│   │       └── prompts.test.ts
│   ├── integration/                # FUTURE
│   │   └── e2e.test.ts
│   └── fixtures/
│       ├── connection-config.json
│       ├── vault-schema.json
│       └── sample-data.json
├── jest.config.js                  # NEW
└── package.json
```

## Phase 1: Setup & Configuration

### 1.1 Jest Configuration

Create `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/types.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  verbose: true,
};
```

### 1.2 Test Setup File

Create `tests/setup.ts`:

```typescript
// Global test setup
beforeAll(() => {
  // Suppress console logs during tests
  global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };
});

afterAll(() => {
  jest.restoreAllMocks();
});
```

### 1.3 Update package.json Scripts

Add to `scripts` section:

```json
{
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "test:unit": "jest tests/unit",
  "test:integration": "jest tests/integration"
}
```

## Phase 2: Utility Tests (Foundation)

Start with utility functions as they're the foundation for command tests.

### 2.1 Logger Tests (`tests/unit/utils/logger.test.ts`)

**Priority: HIGH**

Test cases:
- `setVerbose()` correctly sets verbose mode
- `isVerboseMode()` returns correct state
- `verboseLog()` logs when verbose is true
- `verboseLog()` doesn't log when verbose is false
- `errorLog()` always logs errors
- `logVerbose` and `logError` aliases work correctly

### 2.2 Config Tests (`tests/unit/utils/config.test.ts`)

**Priority: HIGH**

Test cases:
- `loadConfig()` reads from environment variables first
- `loadConfig()` reads from config file if no env vars
- `loadConfig()` throws error if no config found
- `loadConfig()` throws error if config is invalid
- `saveConfig()` creates config directory if missing
- `saveConfig()` writes config file correctly
- `saveConfig()` calls configure() with credentials

Mock requirements:
- File system operations (`fs.existsSync`, `fs.readFileSync`, `fs.writeFileSync`)
- Environment variables

### 2.3 Entities Tests (`tests/unit/utils/entities.test.ts`)

**Priority: MEDIUM**

Test cases:
- `ENTITY_MAP` contains all expected entity types
- `ENTITY_MAP` maps aliases correctly (CREDIT_CARD → DetectEntities.CREDIT_CARD)
- `AVAILABLE_ENTITIES` contains comma-separated string of all keys

### 2.4 Input Tests (`tests/unit/utils/input.test.ts`)

**Priority: MEDIUM**

Test cases:
- `readStdin()` reads data from stdin
- `readStdin()` trims whitespace
- `readStdin()` handles errors correctly
- `readStdin()` resolves with complete data

Mock requirements:
- `process.stdin` events (data, end, error)

### 2.5 Skyflow SDK Utilities Tests (`tests/unit/utils/skyflow.test.ts`)

**Priority: HIGH**

Test cases:
- `loadSkyflowCredentials()` returns API key from env
- `loadSkyflowCredentials()` returns credentials path from env
- `loadSkyflowCredentials()` returns credentials string from env
- `loadSkyflowCredentials()` falls back to bearer token
- `loadSkyflowCredentials()` throws error if no credentials
- `extractClusterIdFromUrl()` extracts cluster ID correctly
- `extractClusterIdFromUrl()` throws error for invalid URL
- `parseEnvironment()` maps PROD/PRODUCTION to Env.PROD
- `parseEnvironment()` maps SANDBOX to Env.SANDBOX
- `parseEnvironment()` defaults to PROD for unknown values
- `initializeSkyflowClient()` creates client with correct config
- `handleSkyflowError()` formats SkyflowError correctly
- `handleSkyflowError()` handles generic Error
- `resolveVaultId()` returns provided vault ID
- `resolveVaultId()` returns env var if no param
- `resolveVaultId()` throws error if none provided

Mock requirements:
- Environment variables
- `skyflow-node` module
- `loadConfig()` function

### 2.6 API Tests (`tests/unit/utils/api.test.ts`)

**Priority: HIGH**

Test cases:
- `configure()` sets axios defaults correctly
- `createVault()` makes POST request with correct payload
- `createServiceAccount()` makes POST request
- `assignRole()` makes POST request with role assignment
- `createConnection()` makes POST request with connection data
- API functions handle errors correctly
- API functions include verbose logging

Mock requirements:
- `axios` HTTP client (use `nock` or `jest.mock('axios')`)

### 2.7 Prompts Tests (`tests/unit/utils/prompts.test.ts`)

**Priority: LOW**

Test cases:
- `promptForVaultId()` prompts user for vault ID
- `promptForVaultId()` validates non-empty input
- Other prompt functions work correctly

Mock requirements:
- `inquirer` module

## Phase 3: Command Tests

Test each command's business logic independently of Commander.js.

### 3.1 Configure Command Tests (`tests/unit/commands/configure.test.ts`)

**Priority: HIGH**

Test cases:
- Prompts user for bearer token, account ID, workspace ID
- Validates required fields
- Saves configuration successfully
- Displays success message
- Handles errors gracefully

Mock requirements:
- `inquirer.prompt()`
- `saveConfig()`

### 3.2 Create Vault Command Tests (`tests/unit/commands/createVault.test.ts`)

**Priority: HIGH**

Test cases:
- Creates vault with provided options
- Prompts for missing options
- Creates service account when flag is true
- Assigns VAULT_OWNER role to service account
- Displays output correctly
- Handles vault creation errors
- Handles service account creation errors
- Validates schema file exists before reading
- Parses schema file correctly

Mock requirements:
- `loadConfig()`
- `createVault()`
- `createServiceAccount()`
- `assignRole()`
- File system operations

### 3.3 Create Connection Command Tests (`tests/unit/commands/createConnection.test.ts`)

**Priority: HIGH**

Test cases:
- Validates file path is provided
- Validates file exists
- Parses connection config file (array format)
- Parses connection config file (object with connections property)
- Validates required connection fields (name, vaultID, routes)
- Creates multiple connections from config
- Continues on error when one connection fails
- Displays summary with success/failure counts
- Exits with error code if any connection fails
- Uses vault ID from option/env/prompt

Mock requirements:
- File system operations
- `createConnection()`
- `promptForVaultId()`

### 3.4 Insert Command Tests (`tests/unit/commands/insert.test.ts`)

**Priority: HIGH**

Test cases:
- Prompts for table name if not provided
- Parses JSON data from `--data` option
- Reads data from stdin when piped
- Converts single object to array
- Validates JSON format
- Initializes Skyflow client correctly
- Creates InsertRequest with correct parameters
- Configures InsertOptions based on flags (returnTokens, continueOnError, upsertColumn)
- Executes insert operation
- Displays results (records, tokens, errors)
- Handles insert errors gracefully

Mock requirements:
- `inquirer.prompt()`
- `initializeSkyflowClient()`
- `resolveVaultId()`
- `readStdin()`
- Skyflow SDK (InsertRequest, InsertOptions)
- `process.stdin.isTTY`

### 3.5 Deidentify Command Tests (`tests/unit/commands/deidentify.test.ts`)

**Priority: HIGH**

Test cases:
- Reads text from `--text` option
- Reads text from stdin when piped
- Prompts for text if not provided
- Parses entity list from `--entities` option
- Uses default entities when not specified
- Maps entity aliases correctly (EMAIL → EMAIL_ADDRESS)
- Throws error for unknown entity types
- Parses token type correctly (vault_token, entity_only, entity_unique_counter)
- Defaults to vault_token
- Initializes Skyflow client correctly
- Creates DeidentifyTextRequest
- Configures DeidentifyTextOptions with entities and token format
- Executes deidentify operation
- Displays text output with entity details
- Displays JSON output when `--output json`
- Handles deidentify errors gracefully

Mock requirements:
- `inquirer.prompt()`
- `initializeSkyflowClient()`
- `resolveVaultId()`
- `readStdin()`
- Skyflow SDK (DeidentifyTextRequest, DeidentifyTextOptions)
- `process.stdin.isTTY`

### 3.6 Reidentify Command Tests (`tests/unit/commands/reidentify.test.ts`)

**Priority: HIGH**

Test cases:
- Reads text from `--text` option
- Reads text from stdin when piped
- Prompts for text if not provided
- Parses plain-text entities from option
- Parses masked entities from option
- Parses redacted entities from option
- Maps entity aliases correctly
- Throws error for unknown entity types
- Defaults to plain text for all when no options specified
- Initializes Skyflow client correctly
- Creates ReidentifyTextRequest
- Configures ReidentifyTextOptions with entity display options
- Executes reidentify operation
- Displays text output
- Displays JSON output when `--output json`
- Handles reidentify errors gracefully

Mock requirements:
- `inquirer.prompt()`
- `initializeSkyflowClient()`
- `resolveVaultId()`
- `readStdin()`
- Skyflow SDK (ReidentifyTextRequest, ReidentifyTextOptions)
- `process.stdin.isTTY`

## Phase 4: Integration Tests (Future)

### 4.1 End-to-End Command Tests

Test commands with real Commander.js integration:
- Parse command-line arguments correctly
- Execute commands end-to-end
- Handle pre-action hooks (authentication)
- Handle unknown commands

### 4.2 Full Workflow Tests

Test complete workflows:
- Configure → Create Vault → Insert Data
- Deidentify → Reidentify round-trip
- Create Connection from config file

## Testing Best Practices

### 1. Test Isolation

- Each test should be independent
- Use `beforeEach` and `afterEach` to reset state
- Mock external dependencies

### 2. Mock Strategy

```typescript
// Example: Mock Skyflow SDK
jest.mock('skyflow-node', () => ({
  Skyflow: jest.fn().mockImplementation(() => ({
    vault: jest.fn().mockReturnValue({
      insert: jest.fn().mockResolvedValue({ insertedFields: [] }),
    }),
    detect: jest.fn().mockReturnValue({
      deidentifyText: jest.fn().mockResolvedValue({ processedText: 'redacted' }),
      reidentifyText: jest.fn().mockResolvedValue({ processedText: 'original' }),
    }),
  })),
  Env: { PROD: 'PROD', SANDBOX: 'SANDBOX' },
  LogLevel: { ERROR: 'ERROR', INFO: 'INFO' },
  DetectEntities: { SSN: 'SSN', CREDIT_CARD: 'CREDIT_CARD' },
  TokenType: { VAULT_TOKEN: 'VAULT_TOKEN', ENTITY_ONLY: 'ENTITY_ONLY' },
}));
```

### 3. Test Data

- Store test fixtures in `tests/fixtures/`
- Use realistic but fake data (no real credentials)
- Examples:
  - `connection-config.json` - Sample connection configurations
  - `vault-schema.json` - Sample vault schema
  - `sample-data.json` - Sample insert data

### 4. Coverage Goals

- **Utilities**: 90%+ coverage (critical infrastructure)
- **Commands**: 80%+ coverage (business logic)
- **Types**: No coverage needed (type definitions)

### 5. Naming Conventions

- Test files: `*.test.ts`
- Test suites: `describe('ComponentName', () => {})`
- Test cases: `it('should do something when condition', () => {})`
- Mock setup: `beforeEach(() => { /* setup mocks */ })`

## Implementation Timeline

### Week 1: Foundation (16-20 hours)
- ✅ Setup Jest and configuration files
- ✅ Write utility tests (logger, config, entities, input)
- ✅ Establish testing patterns and examples

### Week 2: Core Commands (20-24 hours)
- ✅ Write tests for configure, createVault, createConnection commands
- ✅ Achieve 70%+ coverage on utils and core commands

### Week 3: Skyflow SDK Commands (16-20 hours)
- ✅ Write tests for insert, deidentify, reidentify commands
- ✅ Write tests for skyflow.ts utilities
- ✅ Achieve 80%+ overall coverage

### Week 4: Polish & Documentation (8-12 hours)
- ✅ Fix any failing tests
- ✅ Improve coverage for edge cases
- ✅ Document testing patterns for future contributors
- ✅ Add CI/CD integration (GitHub Actions)

## CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - uses: actions/checkout@v3

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test -- --coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
```

## Example Test File Template

```typescript
import { functionToTest } from '@/utils/module';

describe('FunctionName', () => {
  beforeEach(() => {
    // Setup mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup
    jest.restoreAllMocks();
  });

  describe('when condition A', () => {
    it('should do X', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = functionToTest(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('should handle errors', () => {
      // Arrange & Act & Assert
      expect(() => functionToTest('')).toThrow('error message');
    });
  });

  describe('when condition B', () => {
    it('should do Y', async () => {
      // Test async functions
      const result = await asyncFunctionToTest();
      expect(result).toEqual({ key: 'value' });
    });
  });
});
```

## Summary

This comprehensive testing plan provides:
- **Complete coverage** of all commands and utilities
- **Phased approach** from utilities → commands → integration
- **Best practices** for testing Node.js CLI applications
- **CI/CD integration** for automated testing
- **Clear timeline** for implementation (8-12 weeks part-time)

The testing infrastructure will ensure code quality, prevent regressions, and make future development more confident and efficient.
