# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Build**: `npm run build` - Compiles TypeScript to JavaScript in the `dist/` directory
- **Development**: `npm run dev` - Runs the CLI directly with ts-node for development
- **Start**: `npm run start` - Runs the compiled CLI from dist/index.js
- **Local installation**: `npm i -g .` - Installs the CLI globally from the current directory
- **Testing**: `npm test` - Runs the full test suite with Jest
- **Test Watch**: `npm run test:watch` - Runs tests in watch mode for development
- **Test Coverage**: `npm run test:coverage` - Runs tests and generates coverage report

## Architecture Overview

This is a Node.js CLI tool for managing Skyflow vaults and service accounts, built with TypeScript and Commander.js.

### Core Structure

- **Entry Point**: `src/index.ts` - Sets up Commander.js program with global options and command registration
- **Commands**: `src/commands/` - Individual command implementations (configure, createVault)
- **Utilities**: `src/utils/` - Shared functionality for API calls, config management, prompts, and logging
- **Types**: `src/types.ts` - TypeScript interfaces for vault operations and API responses

### Key Patterns

1. **Configuration Management**: Uses `~/.skyflow/config.json` for persistent config, with environment variable fallbacks
2. **Authentication Flow**: Pre-action hooks validate configuration before command execution (except for `configure` command)
3. **Interactive Prompts**: Uses inquirer.js to prompt for missing required options
4. **Error Handling**: Comprehensive error handling with user-friendly messages and proper exit codes
5. **Verbose Logging**: Global `--verbose` flag enables detailed debugging output throughout the application

### API Integration

The CLI interacts with Skyflow's REST APIs for:
- Vault creation and management
- Service account creation
- Role assignment (VAULT_OWNER role)
- Access verification

### Build System

- TypeScript compilation targets ES2018 with CommonJS modules
- Output goes to `dist/` directory
- Executable binary is `dist/index.js` with shebang for direct execution

## Testing

The project uses Jest as the testing framework with TypeScript support via ts-jest.

### Test Structure

- **Test Files**: Located in `src/__tests__/` directory
- **Test Naming**: Use `*.test.ts` extension for test files
- **Setup**: Global test setup in `src/__tests__/setup.ts`

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (useful during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Coverage

Coverage reports are generated in the `coverage/` directory with multiple formats:
- **HTML**: Open `coverage/index.html` in browser for interactive report
- **LCOV**: Machine-readable format for CI/CD integration
- **Text**: Console output during test runs
- **JSON Summary**: Programmatic access to coverage metrics

### Coverage Thresholds

The project maintains the following minimum coverage requirements:
- **Branches**: 70%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### Test Categories

1. **Command Tests**: Unit tests for CLI commands (`create-vault`, `create-connection`)
   - Mock external API calls
   - Test error handling and edge cases
   - Verify command argument parsing and validation

2. **Utility Tests**: Unit tests for utility functions
   - Logger functionality and verbosity levels
   - Prompt validation and user input handling
   - Configuration management

3. **Integration Tests**: End-to-end testing of command workflows
   - Full command execution paths
   - API integration points
   - Error scenarios and recovery

### Mocking Strategy

The test suite uses comprehensive mocking for:
- **External APIs**: All Skyflow API calls are mocked
- **File System**: File operations use jest mocks
- **User Input**: Inquirer prompts are mocked
- **Console Output**: Console methods are mocked to prevent test noise