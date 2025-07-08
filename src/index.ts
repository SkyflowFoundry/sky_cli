#!/usr/bin/env node

import { Command } from 'commander';
import { createVaultCommand } from './commands/createVault';
import { configureCommand } from './commands/configure';
import { createConnectionCommand } from './commands/createConnection';
import { loadConfig } from './utils/config';
import { setVerbose } from './utils/logger';

// Create the CLI program
const program = new Command();

// Configure the CLI
program
  .name('sky')
  .description('Skyflow CLI for managing vaults and service accounts')
  .version('1.0.0')
  .option('--verbose', 'Enable detailed logging for debugging purposes')
  .hook('preAction', (thisCommand) => {
    // Set global verbose mode if specified at the top level
    const verbose = thisCommand.opts().verbose === true;
    setVerbose(verbose);
  });

// Register commands
configureCommand(program);
createVaultCommand(program);
createConnectionCommand(program);

// Error handler for authentication
program.hook('preAction', async (thisCommand, actionCommand) => {
  // Skip authentication for configure command
  if (actionCommand.name() === 'configure') {
    return;
  }

  try {
    // Load and validate configuration
    loadConfig();
  } catch (error) {
    console.error(`Authentication Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
});

// Handle unknown commands
program.on('command:*', () => {
  console.error(`Error: unknown command '${program.args.join(' ')}'`);
  console.log(`See 'sky --help' for available commands.`);
  process.exit(1);
});

// Parse command line arguments
program.parse(process.argv);

// Show help if no arguments provided
if (process.argv.length <= 2) {
  program.help();
}
