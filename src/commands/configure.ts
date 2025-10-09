import { Command } from 'commander';
import inquirer from 'inquirer';
import { saveConfig } from '../utils/config';
import { getWorkspaces, Workspace } from '../utils/api';

export const configureCommand = (program: Command): void => {
  program
    .command('configure')
    .description('Configure Skyflow CLI authentication')
    .action(async () => {
      try {
        console.log('Please provide your Skyflow API credentials:');

        const credentials = await inquirer.prompt([
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
          }
        ]);

        // Fetch available workspaces
        console.log('\nFetching available workspaces...');
        let workspaceID: string;

        try {
          const workspaces = await getWorkspaces(credentials.bearerToken, credentials.accountId);

          if (workspaces.length === 0) {
            console.error('No workspaces found for this account.');
            console.log('Please verify your credentials and try again.');
            process.exit(1);
          } else if (workspaces.length === 1) {
            // Auto-select the single workspace
            workspaceID = workspaces[0].ID;
            console.log(`\nFound one workspace: ${workspaces[0].displayName} (${workspaces[0].name})`);
            console.log(`Using workspace ID: ${workspaceID}`);
          } else {
            // Prompt user to select from multiple workspaces
            const choices = workspaces.map(ws => ({
              name: `${ws.displayName} - ${ws.name} (${ws.type})`,
              value: ws.ID
            }));

            const workspaceAnswer = await inquirer.prompt([
              {
                type: 'list',
                name: 'workspaceID',
                message: 'Select a workspace:',
                choices
              }
            ]);

            workspaceID = workspaceAnswer.workspaceID;
          }
        } catch (error) {
          console.error('\nFailed to fetch workspaces. Please enter workspace ID manually:');
          const manualAnswer = await inquirer.prompt([
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
          workspaceID = manualAnswer.workspaceID;
        }

        // Save the configuration
        saveConfig({
          bearerToken: credentials.bearerToken,
          accountId: credentials.accountId,
          workspaceID
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
