"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureCommand = void 0;
const inquirer_1 = __importDefault(require("inquirer"));
const config_1 = require("../utils/config");
const configureCommand = (program) => {
    program
        .command('configure')
        .description('Configure Skyflow CLI authentication')
        .action(async () => {
        try {
            console.log('Please provide your Skyflow API credentials:');
            const answers = await inquirer_1.default.prompt([
                {
                    type: 'password',
                    name: 'bearerToken',
                    message: 'Enter your Skyflow Bearer Token:',
                    validate: (input) => {
                        if (!input)
                            return 'Bearer token is required';
                        return true;
                    }
                },
                {
                    type: 'input',
                    name: 'accountId',
                    message: 'Enter your Skyflow Account ID:',
                    validate: (input) => {
                        if (!input)
                            return 'Account ID is required';
                        return true;
                    }
                },
                {
                    type: 'input',
                    name: 'workspaceID',
                    message: 'Enter your Skyflow Workspace ID:',
                    validate: (input) => {
                        if (!input)
                            return 'Workspace ID is required';
                        return true;
                    }
                }
            ]);
            // Save the configuration
            (0, config_1.saveConfig)({
                bearerToken: answers.bearerToken,
                accountId: answers.accountId,
                workspaceID: answers.workspaceID
            });
            console.log('\nConfiguration saved successfully!');
            console.log('\nYou can now use the Skyflow CLI. Try running:');
            console.log('  sky create-vault --help');
        }
        catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
        }
    });
};
exports.configureCommand = configureCommand;
