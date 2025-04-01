"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVaultCommand = void 0;
const api = __importStar(require("../utils/api"));
const prompts = __importStar(require("../utils/prompts"));
const config_1 = require("../utils/config");
const logger_1 = require("../utils/logger");
const inquirer_1 = __importDefault(require("inquirer"));
const fs_1 = __importDefault(require("fs"));
// Add the create-vault command to the CLI
const createVaultCommand = (program) => {
    program
        .command('create-vault')
        .description('Create a new Skyflow vault')
        .option('--name <name>', 'Name for the vault (lowercase, no special characters)')
        .option('--template <template>', 'Template to use for the vault')
        .option('--description <description>', 'Description for the vault')
        .option('--master-key <key>', 'Master encryption key for the vault')
        .option('--create-service-account [boolean]', 'Create a service account for the vault', true)
        .option('--schema <path>', 'Path to JSON schema file for the vault')
        .option('--workspace-id <id>', 'Workspace ID for the vault')
        .option('--verbose', 'Enable verbose logging for debugging')
        .action(async (options) => {
        try {
            // Set verbose mode if requested
            (0, logger_1.setVerbose)(!!options.verbose);
            // Convert create-service-account string option to boolean
            if (typeof options.createServiceAccount === 'string') {
                options.createServiceAccount = options.createServiceAccount.toLowerCase() === 'true';
            }
            // Validate schema file if provided
            if (options.schema) {
                if (!fs_1.default.existsSync(options.schema)) {
                    console.error(`Error: Schema file not found at path: ${options.schema}`);
                    process.exit(1);
                }
                try {
                    const schemaContent = fs_1.default.readFileSync(options.schema, 'utf8');
                    JSON.parse(schemaContent); // Validate JSON is parseable
                }
                catch (error) {
                    console.error(`Error: Invalid JSON schema file: ${error instanceof Error ? error.message : String(error)}`);
                    process.exit(1);
                }
            }
            // Load configuration to get workspaceID if not provided
            const config = (0, config_1.loadConfig)();
            // If workspaceId is not provided as an option, use from config
            if (!options.workspaceId && config.workspaceID) {
                options.workspaceId = config.workspaceID;
            }
            // Convert workspace-id to workspaceID for consistency with our interface
            if (options.workspaceId) {
                options.workspaceID = options.workspaceId;
                delete options.workspaceId;
            }
            // If still no workspaceID, prompt for it
            if (!options.workspaceID) {
                const { workspaceID } = await inquirer_1.default.prompt([{
                        type: 'input',
                        name: 'workspaceID',
                        message: 'Enter your Skyflow Workspace ID:',
                        validate: (input) => {
                            if (!input)
                                return 'Workspace ID is required';
                            return true;
                        }
                    }]);
                options.workspaceID = workspaceID;
            }
            // Prompt for any missing options
            const completeOptions = await prompts.promptForMissingOptions(options);
            // Create the vault
            console.log(`Creating vault "${completeOptions.name}"...`);
            (0, logger_1.verboseLog)('Vault creation options:', JSON.stringify(completeOptions, null, 2));
            const vault = await api.createVault(completeOptions);
            (0, logger_1.verboseLog)('Returned vault data:');
            (0, logger_1.verboseLog)(JSON.stringify(vault, null, 2));
            // Result object
            const result = {
                vault: vault
            };
            (0, logger_1.verboseLog)('Result object:');
            (0, logger_1.verboseLog)(JSON.stringify(result, null, 2));
            // Create service account if requested
            if (completeOptions.createServiceAccount) {
                console.log('Creating service account...');
                const serviceAccount = await api.createServiceAccount(`${completeOptions.name}-service-account`);
                (0, logger_1.verboseLog)('Service account created:');
                (0, logger_1.verboseLog)(JSON.stringify(serviceAccount, null, 2));
                // Get roles for the vault
                console.log('Retrieving roles...');
                (0, logger_1.verboseLog)('Retrieving roles for vault ID:', vault.vaultID);
                const roles = await api.getVaultRoles(vault.vaultID);
                (0, logger_1.verboseLog)('Retrieved roles:');
                (0, logger_1.verboseLog)(JSON.stringify(roles, null, 2));
                // Find Vault Owner role
                const vaultOwnerRole = roles.find(role => role.definition.name === 'VAULT_OWNER');
                if (!vaultOwnerRole) {
                    console.warn('Warning: VAULT_OWNER role not found. Skipping role assignment.');
                }
                else {
                    // Assign Vault Owner role to service account
                    console.log('Assigning VAULT_OWNER role to service account...');
                    await api.assignRoleToServiceAccount(vaultOwnerRole.ID, serviceAccount.clientID);
                    // Verify service account has access
                    console.log('Verifying service account access...');
                    const hasAccess = await api.verifyVaultAccess(vault.vaultID, serviceAccount.apiKey);
                    if (!hasAccess) {
                        console.warn('Warning: Service account access could not be verified.');
                    }
                    else {
                        console.log('Service account access verified successfully.');
                    }
                }
                result.serviceAccount = serviceAccount;
                result.serviceAccountID = serviceAccount.clientID;
                result.serviceAccountApiKey = serviceAccount.apiKey;
            }
            // Display the result
            console.log('\n=== Vault Created Successfully ===\n');
            console.log(`Name: ${result.vault.name}`);
            console.log(`Description: ${result.vault.description}`);
            console.log(`Vault URL: ${result.vault.vaultURL}`);
            console.log(`Cluster ID: ${result.vault.clusterID}`);
            console.log(`Vault ID: ${result.vault.vaultID}`);
            if (result.serviceAccountID) {
                console.log(`Service Account ID: ${result.serviceAccountID}`);
                console.log(`Service Account API Key: ${result.serviceAccountApiKey}`);
            }
            console.log('\nEnvironment Variables:');
            console.log(`export SKYFLOW_VAULT_ID=${result.vault.vaultID}`);
            console.log(`export SKYFLOW_CLUSTER_ID=${result.vault.clusterID}`);
            console.log(`export SKYFLOW_VAULT_URL=${result.vault.vaultURL}`);
            console.log(`export SKYFLOW_WORKSPACE_ID=${result.vault.workspaceID}`);
            if (result.serviceAccountApiKey) {
                console.log(`export SKYFLOW_SERVICE_ACCOUNT_ID=${result.serviceAccountID}`);
                console.log(`export SKYFLOW_API_KEY=${result.serviceAccountApiKey}`);
            }
        }
        catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
        }
    });
};
exports.createVaultCommand = createVaultCommand;
