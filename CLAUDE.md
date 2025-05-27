# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Build**: `npm run build` - Compiles TypeScript to JavaScript in the `dist/` directory
- **Development**: `npm run dev` - Runs the CLI directly with ts-node for development
- **Start**: `npm run start` - Runs the compiled CLI from dist/index.js
- **Local installation**: `npm i -g .` - Installs the CLI globally from the current directory

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