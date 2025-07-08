import inquirer from 'inquirer';
import fs from 'fs';
import { VaultOptions } from '../types';

// Function to generate a random name for a vault
export const generateRandomName = (): string => {
  const adjectives = ['swift', 'secure', 'silent', 'dynamic', 'cosmic', 'rapid', 'stellar', 'hidden'];
  const nouns = ['vault', 'fortress', 'bunker', 'archive', 'cache', 'chamber', 'keep', 'locker'];
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  
  return `${adj}-${noun}-${Math.floor(Math.random() * 1000)}`;
};

// Prompt for vault name if not provided
export const promptForName = async (providedName?: string): Promise<string> => {
  if (providedName) return providedName;
  
  const defaultName = generateRandomName();
  
  const { name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Enter vault name (no special chars):',
      default: defaultName,
      validate: (input: string) => {
        if (/^[a-zA-Z0-9-]+$/.test(input)) {
          return true;
        }
        return 'Name must be alphanumeric with hyphens only';
      }
    }
  ]);
  
  return name;
};

// Prompt for template or schema
export const promptForTemplateOrSchema = async (options: { template?: string, schema?: string }): Promise<{ template?: string, schema?: string }> => {
  const result: { template?: string, schema?: string } = { ...options };
  
  // If either is already provided, just return those values
  if (options.template || options.schema) {
    return result;
  }
  
  // Ask user which method they want to use for vault creation
  const { method } = await inquirer.prompt([
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
    const { template } = await inquirer.prompt([
      {
        type: 'input',
        name: 'template',
        message: 'Enter template name:',
        validate: (input: string) => {
          if (!input) return 'Please enter a template name or press Ctrl+C to cancel';
          if (/^[a-z0-9-]+$/.test(input)) {
            return true;
          }
          return 'Template name must be lowercase alphanumeric with hyphens only';
        }
      }
    ]);
    
    result.template = template;
  } else {
    const { schema } = await inquirer.prompt([
      {
        type: 'input',
        name: 'schema',
        message: 'Enter path to schema JSON file:',
        validate: (input: string) => {
          if (!input) return 'Please enter a file path or press Ctrl+C to cancel';
          
          try {
            if (!fs.existsSync(input)) {
              return 'File does not exist, please enter a valid path';
            }
            
            const content = fs.readFileSync(input, 'utf8');
            JSON.parse(content); // Check if valid JSON
            return true;
          } catch (error) {
            return `Invalid JSON file: ${error instanceof Error ? error.message : String(error)}`;
          }
        }
      }
    ]);
    
    result.schema = schema;
  }
  
  return result;
};

// Prompt for description if not provided
export const promptForDescription = async (providedDesc?: string): Promise<string | undefined> => {
  if (providedDesc) return providedDesc;
  
  const { useDesc } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'useDesc',
      message: 'Would you like to add a description?',
      default: false
    }
  ]);
  
  if (!useDesc) return undefined;
  
  const { description } = await inquirer.prompt([
    {
      type: 'input',
      name: 'description',
      message: 'Enter vault description:',
      validate: (input: string) => {
        if (!input) return 'Please enter a description or press Ctrl+C to cancel';
        return true;
      }
    }
  ]);
  
  return description;
};

// Prompt for master key if not provided
export const promptForMasterKey = async (providedKey?: string): Promise<string | undefined> => {
  if (providedKey) return providedKey;
  
  const { useMasterKey } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'useMasterKey',
      message: 'Would you like to specify a master encryption key?',
      default: false
    }
  ]);
  
  if (!useMasterKey) return undefined;
  
  const { masterKey } = await inquirer.prompt([
    {
      type: 'password',
      name: 'masterKey',
      message: 'Enter master encryption key:',
      validate: (input: string) => {
        if (!input) return 'Please enter a key or press Ctrl+C to cancel';
        return true;
      }
    }
  ]);
  
  return masterKey;
};

// Handle all prompts for vault creation
export const promptForMissingOptions = async (options: VaultOptions): Promise<VaultOptions> => {
  const result: VaultOptions = { ...options };

  // Prompt for name if not provided
  result.name = await promptForName(options.name);
  
  // Prompt for template or schema
  const templateOrSchema = await promptForTemplateOrSchema({
    template: options.template,
    schema: options.schema
  });
  
  result.template = templateOrSchema.template;
  result.schema = templateOrSchema.schema;
  
  // Prompt for description if not provided
  result.description = await promptForDescription(options.description);
  
  // Prompt for master key if not provided
  result.masterKey = await promptForMasterKey(options.masterKey);
  
  // Handle create-service-account option
  if (options.createServiceAccount === undefined) {
    const { createServiceAccount } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'createServiceAccount',
        message: 'Create a service account for this vault?',
        default: false
      }
    ]);
    
    result.createServiceAccount = createServiceAccount;
  }
  
  return result;
};

// Prompt for vault ID if not provided
export const promptForVaultId = async (): Promise<string> => {
  const { vaultId } = await inquirer.prompt([
    {
      type: 'input',
      name: 'vaultId',
      message: 'Enter vault ID:',
      validate: (input: string) => {
        if (!input || !process.env.SKYFLOW_VAULT_ID) return 'Please enter a vault ID or press Ctrl+C to cancel';
        return true;
      }
    }
  ]);
  
  return vaultId;
};
