import { Command } from 'commander';
import inquirer from 'inquirer';
import { saveConfig } from '../utils/config';

export const configureCommand = (program: Command): void => {
  program
    .command('configure')
    .description('Configure Skyflow CLI authentication')
    .action(async () => {
      try {
        console.log('Please provide your Skyflow API credentials:');
        
        const answers = await inquirer.prompt([
          {
            type: 'password',
            name: 'bearerToken',
            message: 'Enter your Skyflow Bearer Token:',
            validate: (input: string) => {
              if (!input) return 'Bearer token is required';
              return true;
            }
          },
          {
            type: 'input',
            name: 'accountId',
            message: 'Enter your Skyflow Account ID:',
            validate: (input: string) => {
              if (!input) return 'Account ID is required';
              return true;
            }
          },
          {
            type: 'input',
            name: 'workspaceID',
            message: 'Enter your Skyflow Workspace ID:',
            validate: (input: string) => {
              if (!input) return 'Workspace ID is required';
              return true;
            }
          }
        ]);
        
        // Save the configuration
        saveConfig({
          bearerToken: answers.bearerToken,
          accountId: answers.accountId,
          workspaceID: answers.workspaceID
        });
        
        console.log('\nConfiguration saved successfully!');
        console.log('\nYou can now use the Skyflow CLI. Try running:');
        console.log('  sky create-vault --help');
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
};
