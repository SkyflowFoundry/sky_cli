#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const createVault_1 = require("./commands/createVault");
const configure_1 = require("./commands/configure");
const insert_1 = require("./commands/insert");
const deidentify_1 = require("./commands/deidentify");
const reidentify_1 = require("./commands/reidentify");
const config_1 = require("./utils/config");
const logger_1 = require("./utils/logger");
// Create the CLI program
const program = new commander_1.Command();
// Configure the CLI
program
    .name('sky')
    .description('Skyflow CLI for managing vaults and service accounts')
    .version('1.0.0')
    .option('--verbose', 'Enable detailed logging for debugging purposes')
    .hook('preAction', (thisCommand) => {
    // Set global verbose mode if specified at the top level
    const verbose = thisCommand.opts().verbose === true;
    (0, logger_1.setVerbose)(verbose);
});
// Register commands
(0, configure_1.configureCommand)(program);
(0, createVault_1.createVaultCommand)(program);
(0, insert_1.insertCommand)(program);
(0, deidentify_1.deidentifyCommand)(program);
(0, reidentify_1.reidentifyCommand)(program);
// Error handler for authentication
program.hook('preAction', async (thisCommand, actionCommand) => {
    const commandName = actionCommand.name();
    // Skip authentication for configure command
    if (commandName === 'configure') {
        return;
    }
    // Skip authentication for SDK commands (they handle their own auth)
    const sdkCommands = ['insert', 'deidentify', 'reidentify'];
    if (sdkCommands.includes(commandName)) {
        return;
    }
    try {
        // Load and validate configuration for API commands
        (0, config_1.loadConfig)();
    }
    catch (error) {
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
