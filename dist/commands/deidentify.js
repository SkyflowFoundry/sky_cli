"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deidentifyCommand = void 0;
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
const deidentifyCommand = (program) => {
    program
        .command('deidentify')
        .description('Detect and redact sensitive data from text using Skyflow Detect API')
        .option('--text <string>', 'Text to deidentify (or pipe from stdin)')
        .option('--entities <list>', `Comma-separated entity types to detect (e.g., SSN,CREDIT_CARD). Available: ${AVAILABLE_ENTITIES}`)
        .option('--token-type <type>', 'Token format: vault_token (stored), entity_only (labels), random_token (ephemeral)', 'vault_token')
        .option('--output <format>', 'Output format: text or json', 'text')
        .option('--vault-id <id>', 'Vault ID (or set SKYFLOW_VAULT_ID)')
        .option('--cluster-id <id>', 'Cluster ID (or set SKYFLOW_VAULT_URL)')
        .option('--environment <env>', 'Environment: PROD, SANDBOX, STAGE, DEV', 'PROD')
        .action(async (options) => {
        var _a;
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
                            message: 'Enter text to deidentify:',
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
            // Parse entities if provided
            let entityList;
            if (options.entities) {
                const rawEntities = options.entities.split(',').map((e) => e.trim().toUpperCase());
                entityList = rawEntities.map((entity) => {
                    const mapped = ENTITY_MAP[entity];
                    if (!mapped) {
                        throw new Error(`Unknown entity type: ${entity}\nAvailable entities: ${AVAILABLE_ENTITIES}`);
                    }
                    return mapped;
                });
                (0, logger_1.logVerbose)(`Detecting entities: ${entityList.join(', ')}`);
            }
            else {
                // Use common entities by default
                entityList = [
                    skyflow_node_1.DetectEntities.SSN,
                    skyflow_node_1.DetectEntities.CREDIT_CARD,
                    skyflow_node_1.DetectEntities.EMAIL_ADDRESS,
                    skyflow_node_1.DetectEntities.PHONE_NUMBER,
                    skyflow_node_1.DetectEntities.NAME,
                    skyflow_node_1.DetectEntities.DOB,
                ];
                (0, logger_1.logVerbose)('Using default entity detection (SSN, CREDIT_CARD, EMAIL_ADDRESS, PHONE_NUMBER, NAME, DOB)');
            }
            // Parse token type
            let tokenType;
            switch ((_a = options.tokenType) === null || _a === void 0 ? void 0 : _a.toLowerCase()) {
                case 'vault_token':
                    tokenType = skyflow_node_1.TokenType.VAULT_TOKEN;
                    break;
                case 'entity_only':
                    tokenType = skyflow_node_1.TokenType.ENTITY_ONLY;
                    break;
                case 'entity_unique_counter':
                    tokenType = skyflow_node_1.TokenType.ENTITY_UNIQUE_COUNTER;
                    break;
                default:
                    tokenType = skyflow_node_1.TokenType.VAULT_TOKEN;
                    (0, logger_1.logVerbose)(`Unknown token type '${options.tokenType}', using vault_token`);
            }
            (0, logger_1.logVerbose)(`Using token type: ${options.tokenType || 'vault_token'}`);
            // Resolve vault ID
            const vaultId = (0, skyflow_1.resolveVaultId)(options.vaultId);
            (0, logger_1.logVerbose)(`Using vault ID: ${vaultId}`);
            // Initialize Skyflow client
            const verbose = program.opts().verbose || false;
            const skyflowClient = (0, skyflow_1.initializeSkyflowClient)(vaultId, options.clusterId, options.environment, verbose);
            // Create deidentify request
            const deidentifyRequest = new skyflow_node_1.DeidentifyTextRequest(textInput);
            (0, logger_1.logVerbose)('Created deidentify request');
            // Configure options
            const deidentifyOptions = new skyflow_node_1.DeidentifyTextOptions();
            deidentifyOptions.setEntities(entityList);
            const tokenFormat = new skyflow_node_1.TokenFormat();
            tokenFormat.setDefault(tokenType);
            deidentifyOptions.setTokenFormat(tokenFormat);
            // Execute deidentify
            (0, logger_1.logVerbose)('Executing deidentify operation...');
            const response = await skyflowClient
                .detect(vaultId)
                .deidentifyText(deidentifyRequest, deidentifyOptions);
            // Display results
            if (options.output === 'json') {
                console.log(JSON.stringify(response, null, 2));
            }
            else {
                console.log('\nDeidentified Text:');
                console.log('─'.repeat(60));
                console.log(response.processedText);
                console.log('─'.repeat(60));
                if (response.entities && response.entities.length > 0) {
                    console.log(`\nDetected ${response.entities.length} sensitive entities:\n`);
                    response.entities.forEach((entity, index) => {
                        console.log(`${index + 1}. ${entity.entity}`);
                        console.log(`   Original: "${entity.value}"`);
                        console.log(`   Token: ${entity.token}`);
                        if (entity.textIndex) {
                            console.log(`   Position: ${entity.textIndex.start}-${entity.textIndex.end}`);
                        }
                        if (entity.scores) {
                            const confidence = Object.values(entity.scores)[0];
                            console.log(`   Confidence: ${(confidence * 100).toFixed(1)}%`);
                        }
                        console.log();
                    });
                }
                else {
                    console.log('\nNo sensitive entities detected.');
                }
                if (response.wordCount !== undefined) {
                    console.log(`Word count: ${response.wordCount}`);
                }
                if (response.charCount !== undefined) {
                    console.log(`Character count: ${response.charCount}`);
                }
            }
        }
        catch (error) {
            (0, skyflow_1.handleSkyflowError)(error);
        }
    });
};
exports.deidentifyCommand = deidentifyCommand;
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
