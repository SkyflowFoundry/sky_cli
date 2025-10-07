"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertCommand = void 0;
const inquirer_1 = __importDefault(require("inquirer"));
const skyflow_node_1 = require("skyflow-node");
const skyflow_1 = require("../utils/skyflow");
const logger_1 = require("../utils/logger");
const insertCommand = (program) => {
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
        .action(async (options) => {
        var _a, _b;
        try {
            // Prompt for missing required options
            if (!options.table) {
                const answers = await inquirer_1.default.prompt([
                    {
                        type: 'input',
                        name: 'table',
                        message: 'Enter table name:',
                        validate: (input) => {
                            if (!input)
                                return 'Table name is required';
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
                    (0, logger_1.logVerbose)('Reading data from stdin...');
                    dataInput = await readStdin();
                }
                else {
                    // Prompt for data
                    const answers = await inquirer_1.default.prompt([
                        {
                            type: 'editor',
                            name: 'data',
                            message: 'Enter JSON data to insert:',
                            validate: (input) => {
                                if (!input)
                                    return 'Data is required';
                                try {
                                    JSON.parse(input);
                                    return true;
                                }
                                catch (_a) {
                                    return 'Invalid JSON format';
                                }
                            },
                        },
                    ]);
                    dataInput = answers.data;
                }
            }
            // Parse JSON data
            let insertData;
            try {
                const parsed = JSON.parse(dataInput);
                // Ensure data is an array
                insertData = Array.isArray(parsed) ? parsed : [parsed];
                (0, logger_1.logVerbose)(`Parsed ${insertData.length} record(s) to insert`);
            }
            catch (error) {
                throw new Error(`Invalid JSON data: ${error instanceof Error ? error.message : String(error)}`);
            }
            // Resolve vault ID
            const vaultId = (0, skyflow_1.resolveVaultId)(options.vaultId);
            (0, logger_1.logVerbose)(`Using vault ID: ${vaultId}`);
            // Initialize Skyflow client
            const verbose = program.opts().verbose || false;
            const skyflowClient = (0, skyflow_1.initializeSkyflowClient)(vaultId, options.clusterId, options.environment, verbose);
            // Create insert request
            const insertRequest = new skyflow_node_1.InsertRequest(options.table, insertData);
            (0, logger_1.logVerbose)(`Created insert request for table: ${options.table}`);
            // Configure insert options
            const insertOptions = new skyflow_node_1.InsertOptions();
            if (options.returnTokens) {
                insertOptions.setReturnTokens(true);
                (0, logger_1.logVerbose)('Configured to return tokens');
            }
            if (options.continueOnError) {
                insertOptions.setContinueOnError(true);
                (0, logger_1.logVerbose)('Configured to continue on error');
            }
            if (options.upsertColumn) {
                insertOptions.setUpsertColumn(options.upsertColumn);
                (0, logger_1.logVerbose)(`Configured upsert on column: ${options.upsertColumn}`);
            }
            // Execute insert
            (0, logger_1.logVerbose)('Executing insert operation...');
            const response = await skyflowClient
                .vault(vaultId)
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
            console.log(`Successful: ${((_a = response.insertedFields) === null || _a === void 0 ? void 0 : _a.length) || 0}`);
            console.log(`Failed: ${((_b = response.errors) === null || _b === void 0 ? void 0 : _b.length) || 0}`);
        }
        catch (error) {
            (0, skyflow_1.handleSkyflowError)(error);
        }
    });
};
exports.insertCommand = insertCommand;
/**
 * Read input from stdin
 */
const readStdin = () => {
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
