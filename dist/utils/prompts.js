"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptForMissingOptions = exports.promptForMasterKey = exports.promptForDescription = exports.promptForTemplateOrSchema = exports.promptForName = exports.generateRandomName = void 0;
const inquirer_1 = __importDefault(require("inquirer"));
const fs_1 = __importDefault(require("fs"));
// Function to generate a random name for a vault
const generateRandomName = () => {
    const adjectives = ['swift', 'secure', 'silent', 'dynamic', 'cosmic', 'rapid', 'stellar', 'hidden'];
    const nouns = ['vault', 'fortress', 'bunker', 'archive', 'cache', 'chamber', 'keep', 'locker'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adj}-${noun}-${Math.floor(Math.random() * 1000)}`;
};
exports.generateRandomName = generateRandomName;
// Prompt for vault name if not provided
const promptForName = async (providedName) => {
    if (providedName)
        return providedName;
    const defaultName = (0, exports.generateRandomName)();
    const { name } = await inquirer_1.default.prompt([
        {
            type: 'input',
            name: 'name',
            message: 'Enter vault name (lowercase, no special chars):',
            default: defaultName,
            validate: (input) => {
                if (/^[a-z0-9-]+$/.test(input)) {
                    return true;
                }
                return 'Name must be lowercase alphanumeric with hyphens only';
            }
        }
    ]);
    return name;
};
exports.promptForName = promptForName;
// Prompt for template or schema
const promptForTemplateOrSchema = async (options) => {
    const result = { ...options };
    // If either is already provided, just return those values
    if (options.template || options.schema) {
        return result;
    }
    // Ask user which method they want to use for vault creation
    const { method } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'method',
            message: 'How would you like to create the vault?',
            choices: [
                { name: 'Use a template', value: 'template' },
                { name: 'Provide a schema file', value: 'schema' }
            ]
        }
    ]);
    if (method === 'template') {
        const { template } = await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'template',
                message: 'Enter template name:',
                validate: (input) => {
                    if (!input)
                        return 'Please enter a template name or press Ctrl+C to cancel';
                    if (/^[a-z0-9-]+$/.test(input)) {
                        return true;
                    }
                    return 'Template name must be lowercase alphanumeric with hyphens only';
                }
            }
        ]);
        result.template = template;
    }
    else {
        const { schema } = await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'schema',
                message: 'Enter path to schema JSON file:',
                validate: (input) => {
                    if (!input)
                        return 'Please enter a file path or press Ctrl+C to cancel';
                    try {
                        if (!fs_1.default.existsSync(input)) {
                            return 'File does not exist, please enter a valid path';
                        }
                        const content = fs_1.default.readFileSync(input, 'utf8');
                        JSON.parse(content); // Check if valid JSON
                        return true;
                    }
                    catch (error) {
                        return `Invalid JSON file: ${error instanceof Error ? error.message : String(error)}`;
                    }
                }
            }
        ]);
        result.schema = schema;
    }
    return result;
};
exports.promptForTemplateOrSchema = promptForTemplateOrSchema;
// Prompt for description if not provided
const promptForDescription = async (providedDesc) => {
    if (providedDesc)
        return providedDesc;
    const { useDesc } = await inquirer_1.default.prompt([
        {
            type: 'confirm',
            name: 'useDesc',
            message: 'Would you like to add a description?',
            default: false
        }
    ]);
    if (!useDesc)
        return undefined;
    const { description } = await inquirer_1.default.prompt([
        {
            type: 'input',
            name: 'description',
            message: 'Enter vault description:',
            validate: (input) => {
                if (!input)
                    return 'Please enter a description or press Ctrl+C to cancel';
                return true;
            }
        }
    ]);
    return description;
};
exports.promptForDescription = promptForDescription;
// Prompt for master key if not provided
const promptForMasterKey = async (providedKey) => {
    if (providedKey)
        return providedKey;
    const { useMasterKey } = await inquirer_1.default.prompt([
        {
            type: 'confirm',
            name: 'useMasterKey',
            message: 'Would you like to specify a master encryption key?',
            default: false
        }
    ]);
    if (!useMasterKey)
        return undefined;
    const { masterKey } = await inquirer_1.default.prompt([
        {
            type: 'password',
            name: 'masterKey',
            message: 'Enter master encryption key:',
            validate: (input) => {
                if (!input)
                    return 'Please enter a key or press Ctrl+C to cancel';
                return true;
            }
        }
    ]);
    return masterKey;
};
exports.promptForMasterKey = promptForMasterKey;
// Handle all prompts for vault creation
const promptForMissingOptions = async (options) => {
    const result = { ...options };
    // Prompt for name if not provided
    result.name = await (0, exports.promptForName)(options.name);
    // Prompt for template or schema
    const templateOrSchema = await (0, exports.promptForTemplateOrSchema)({
        template: options.template,
        schema: options.schema
    });
    result.template = templateOrSchema.template;
    result.schema = templateOrSchema.schema;
    // Prompt for description if not provided
    result.description = await (0, exports.promptForDescription)(options.description);
    // Prompt for master key if not provided
    result.masterKey = await (0, exports.promptForMasterKey)(options.masterKey);
    // Handle create-service-account option
    if (options.createServiceAccount === undefined) {
        const { createServiceAccount } = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'createServiceAccount',
                message: 'Create a service account for this vault?',
                default: true
            }
        ]);
        result.createServiceAccount = createServiceAccount;
    }
    return result;
};
exports.promptForMissingOptions = promptForMissingOptions;
