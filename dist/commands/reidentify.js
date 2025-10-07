"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reidentifyCommand = void 0;
const inquirer_1 = __importDefault(require("inquirer"));
const skyflow_node_1 = require("skyflow-node");
const skyflow_1 = require("../utils/skyflow");
const logger_1 = require("../utils/logger");
// Map of entity aliases to DetectEntities enum values
const ENTITY_MAP = {
    SSN: skyflow_node_1.DetectEntities.SSN,
    CREDIT_CARD: skyflow_node_1.DetectEntities.CREDIT_CARD,
    CREDIT_CARD_NUMBER: skyflow_node_1.DetectEntities.CREDIT_CARD,
    EMAIL: skyflow_node_1.DetectEntities.EMAIL_ADDRESS,
    EMAIL_ADDRESS: skyflow_node_1.DetectEntities.EMAIL_ADDRESS,
    PHONE_NUMBER: skyflow_node_1.DetectEntities.PHONE_NUMBER,
    PHONE: skyflow_node_1.DetectEntities.PHONE_NUMBER,
    NAME: skyflow_node_1.DetectEntities.NAME,
    DOB: skyflow_node_1.DetectEntities.DOB,
    DATE_OF_BIRTH: skyflow_node_1.DetectEntities.DOB,
    ACCOUNT_NUMBER: skyflow_node_1.DetectEntities.ACCOUNT_NUMBER,
    DRIVER_LICENSE: skyflow_node_1.DetectEntities.DRIVER_LICENSE,
    PASSPORT_NUMBER: skyflow_node_1.DetectEntities.PASSPORT_NUMBER,
    PASSPORT: skyflow_node_1.DetectEntities.PASSPORT_NUMBER,
};
const AVAILABLE_ENTITIES = Object.keys(ENTITY_MAP).join(', ');
const reidentifyCommand = (program) => {
    program
        .command('reidentify')
        .description('Restore original values from tokenized text using Skyflow Detect API')
        .option('--text <string>', 'Tokenized text to reidentify (or pipe from stdin)')
        .option('--plain-text <list>', `Comma-separated entities to return as plain text (e.g., SSN,CREDIT_CARD). Available: ${AVAILABLE_ENTITIES}`)
        .option('--masked <list>', 'Comma-separated entities to return masked')
        .option('--redacted <list>', 'Comma-separated entities to keep redacted')
        .option('--output <format>', 'Output format: text or json', 'text')
        .option('--vault-id <id>', 'Vault ID (or set SKYFLOW_VAULT_ID)')
        .option('--cluster-id <id>', 'Cluster ID (or set SKYFLOW_VAULT_URL)')
        .option('--environment <env>', 'Environment: PROD, SANDBOX, STAGE, DEV', 'PROD')
        .action(async (options) => {
        try {
            // Get text from option or stdin
            let textInput = options.text;
            if (!textInput) {
                // Check if stdin is being piped
                if (!process.stdin.isTTY) {
                    (0, logger_1.logVerbose)('Reading text from stdin...');
                    textInput = await readStdin();
                }
                else {
                    // Prompt for text
                    const answers = await inquirer_1.default.prompt([
                        {
                            type: 'editor',
                            name: 'text',
                            message: 'Enter tokenized text to reidentify:',
                            validate: (input) => {
                                if (!input)
                                    return 'Text is required';
                                return true;
                            },
                        },
                    ]);
                    textInput = answers.text;
                }
            }
            // Parse entity options
            const parseEntities = (entityString) => {
                if (!entityString)
                    return undefined;
                const rawEntities = entityString.split(',').map((e) => e.trim().toUpperCase());
                return rawEntities.map((entity) => {
                    const mapped = ENTITY_MAP[entity];
                    if (!mapped) {
                        throw new Error(`Unknown entity type: ${entity}\nAvailable entities: ${AVAILABLE_ENTITIES}`);
                    }
                    return mapped;
                });
            };
            const plainTextEntities = parseEntities(options.plainText);
            const maskedEntities = parseEntities(options.masked);
            const redactedEntities = parseEntities(options.redacted);
            if (plainTextEntities) {
                (0, logger_1.logVerbose)(`Plain text entities: ${plainTextEntities.join(', ')}`);
            }
            if (maskedEntities) {
                (0, logger_1.logVerbose)(`Masked entities: ${maskedEntities.join(', ')}`);
            }
            if (redactedEntities) {
                (0, logger_1.logVerbose)(`Redacted entities: ${redactedEntities.join(', ')}`);
            }
            // If no options specified, default to plain text for all entities
            const hasEntityOptions = plainTextEntities || maskedEntities || redactedEntities;
            if (!hasEntityOptions) {
                (0, logger_1.logVerbose)('No entity options specified, returning all as plain text');
            }
            // Resolve vault ID
            const vaultId = (0, skyflow_1.resolveVaultId)(options.vaultId);
            (0, logger_1.logVerbose)(`Using vault ID: ${vaultId}`);
            // Initialize Skyflow client
            const verbose = program.opts().verbose || false;
            const skyflowClient = (0, skyflow_1.initializeSkyflowClient)(vaultId, options.clusterId, options.environment, verbose);
            // Create reidentify request
            const reidentifyRequest = new skyflow_node_1.ReidentifyTextRequest(textInput);
            (0, logger_1.logVerbose)('Created reidentify request');
            // Configure options
            const reidentifyOptions = new skyflow_node_1.ReidentifyTextOptions();
            if (plainTextEntities) {
                reidentifyOptions.setPlainTextEntities(plainTextEntities);
            }
            if (maskedEntities) {
                reidentifyOptions.setMaskedEntities(maskedEntities);
            }
            if (redactedEntities) {
                reidentifyOptions.setRedactedEntities(redactedEntities);
            }
            // Execute reidentify
            (0, logger_1.logVerbose)('Executing reidentify operation...');
            const response = await skyflowClient
                .detect(vaultId)
                .reidentifyText(reidentifyRequest, reidentifyOptions);
            // Display results
            if (options.output === 'json') {
                console.log(JSON.stringify(response, null, 2));
            }
            else {
                console.log('\nReidentified Text:');
                console.log('─'.repeat(60));
                console.log(response.processedText);
                console.log('─'.repeat(60));
                console.log('\nOriginal sensitive data has been restored.');
            }
        }
        catch (error) {
            (0, skyflow_1.handleSkyflowError)(error);
        }
    });
};
exports.reidentifyCommand = reidentifyCommand;
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
