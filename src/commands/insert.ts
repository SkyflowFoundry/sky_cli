import { Command } from 'commander';
import inquirer from 'inquirer';
import { InsertRequest, InsertOptions, InsertResponse } from 'skyflow-node';
import { InsertCommandOptions, InsertData } from '../types';
import {
  initializeSkyflowClient,
  handleSkyflowError,
  resolveVaultId,
} from '../utils/skyflow';
import { logVerbose } from '../utils/logger';

export const insertCommand = (program: Command): void => {
  program
    .command('insert')
    .description('Insert sensitive data into a Skyflow vault table')
    .option('--table <name>', 'Table name to insert data into')
    .option('--data <json>', 'JSON data to insert (or pipe from stdin)')
    .option('--return-tokens', 'Return tokens for inserted data', false)
    .option('--continue-on-error', 'Continue if some records fail', false)
    .option('--upsert-column <name>', 'Column name for upsert operations')
    .option('--vault-id <id>', 'Vault ID (or set SKYFLOW_VAULT_ID)')
    .option('--cluster-id <id>', 'Cluster ID (or set SKYFLOW_VAULT_URL)')
    .option('--environment <env>', 'Environment: PROD, SANDBOX, STAGE, DEV', 'PROD')
    .action(async (options: InsertCommandOptions) => {
      try {
        // Prompt for missing required options
        if (!options.table) {
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'table',
              message: 'Enter table name:',
              validate: (input: string) => {
                if (!input) return 'Table name is required';
                return true;
              },
            },
          ]);
          options.table = answers.table;
        }

        // Get data from option or stdin
        let dataInput = options.data;
        if (!dataInput) {
          // Check if stdin is being piped
          if (!process.stdin.isTTY) {
            logVerbose('Reading data from stdin...');
            dataInput = await readStdin();
          } else {
            // Prompt for data
            const answers = await inquirer.prompt([
              {
                type: 'editor',
                name: 'data',
                message: 'Enter JSON data to insert:',
                validate: (input: string) => {
                  if (!input) return 'Data is required';
                  try {
                    JSON.parse(input);
                    return true;
                  } catch {
                    return 'Invalid JSON format';
                  }
                },
              },
            ]);
            dataInput = answers.data;
          }
        }

        // Parse JSON data
        let insertData: InsertData[];
        try {
          const parsed = JSON.parse(dataInput!);
          // Ensure data is an array
          insertData = Array.isArray(parsed) ? parsed : [parsed];
          logVerbose(`Parsed ${insertData.length} record(s) to insert`);
        } catch (error) {
          throw new Error(`Invalid JSON data: ${error instanceof Error ? error.message : String(error)}`);
        }

        // Resolve vault ID
        const vaultId = resolveVaultId(options.vaultId);
        logVerbose(`Using vault ID: ${vaultId}`);

        // Initialize Skyflow client
        const verbose = program.opts().verbose || false;
        const skyflowClient = initializeSkyflowClient(
          vaultId,
          options.clusterId,
          options.environment,
          verbose
        );

        // Create insert request
        const insertRequest = new InsertRequest(options.table, insertData);
        logVerbose(`Created insert request for table: ${options.table}`);

        // Configure insert options
        const insertOptions = new InsertOptions();
        if (options.returnTokens) {
          insertOptions.setReturnTokens(true);
          logVerbose('Configured to return tokens');
        }
        if (options.continueOnError) {
          insertOptions.setContinueOnError(true);
          logVerbose('Configured to continue on error');
        }
        if (options.upsertColumn) {
          insertOptions.setUpsertColumn(options.upsertColumn);
          logVerbose(`Configured upsert on column: ${options.upsertColumn}`);
        }

        // Execute insert
        logVerbose('Executing insert operation...');
        const response: InsertResponse = await skyflowClient
          .vault(vaultId!)
          .insert(insertRequest, insertOptions);

        // Display results
        console.log('\nInsert completed successfully!\n');

        if (response.insertedFields && response.insertedFields.length > 0) {
          console.log('Inserted records:');
          response.insertedFields.forEach((record, index) => {
            console.log(`\nRecord ${index + 1}:`);
            if (record.skyflowId) {
              console.log(`  Skyflow ID: ${record.skyflowId}`);
            }
            if (options.returnTokens) {
              Object.keys(record).forEach((key) => {
                if (key !== 'skyflowId') {
                  console.log(`  ${key}: ${record[key]}`);
                }
              });
            }
          });
        }

        if (response.errors && response.errors.length > 0) {
          console.log('\nErrors:');
          response.errors.forEach((error, index) => {
            console.log(`\nError ${index + 1}:`);
            console.log(`  ${JSON.stringify(error, null, 2)}`);
          });
        }

        console.log(`\nTotal records processed: ${insertData.length}`);
        console.log(`Successful: ${response.insertedFields?.length || 0}`);
        console.log(`Failed: ${response.errors?.length || 0}`);
      } catch (error) {
        handleSkyflowError(error);
      }
    });
};

/**
 * Read input from stdin
 */
const readStdin = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (chunk) => {
      data += chunk;
    });

    process.stdin.on('end', () => {
      resolve(data.trim());
    });

    process.stdin.on('error', (error) => {
      reject(error);
    });
  });
};
