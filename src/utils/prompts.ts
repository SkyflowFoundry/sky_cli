import inquirer from 'inquirer';
import fs from 'fs';
import { VaultOptions } from '../types';
import * as api from './api';
import { verboseLog } from './logger';

// Mapping of friendly template names to their display order
// This defines the order and names shown to users
const TEMPLATE_NAME_MAP: Record<string, number> = {
  'customer_identity': 1,
  'payment': 2,
  'pii_data': 3,
  'scratch-template': 4,
  'quickstart': 5,
  'plaid': 6,
  'payments_acceptance_sample': 7
};

// Helper function to resolve a template name to its ID
export const resolveTemplateNameToId = async (templateName: string): Promise<string> => {
  // If it's already an ID format (UUID-like), return as-is
  if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(templateName)) {
    verboseLog(`Template "${templateName}" appears to be an ID already`);
    return templateName;
  }

  try {
    const templates = await api.getVaultTemplates();
    verboseLog(`Resolving template name "${templateName}" from ${templates.length} available templates`);

    if (templates.length === 0) {
      throw new Error('No templates available from API');
    }

    // Try exact match first (case-insensitive with space/underscore normalization)
    const normalizedInput = templateName.toLowerCase().replace(/\s+/g, '_');
    const matchedTemplate = templates.find(t => {
      const normalizedApiName = t.name.toLowerCase().replace(/\s+/g, '_');
      return normalizedApiName === normalizedInput;
    });

    if (matchedTemplate) {
      verboseLog(`Resolved template "${templateName}" to ID: ${matchedTemplate.ID}`);
      return matchedTemplate.ID;
    }

    // Not found - throw error
    throw new Error(`Template "${templateName}" not found in available templates. Please use --schema option to provide a schema file.`);
  } catch (error) {
    // If API call fails or template not found, throw error
    const errorMessage = error instanceof Error ? error.message : String(error);
    verboseLog(`Failed to resolve template: ${errorMessage}`);
    throw new Error(`Failed to resolve template "${templateName}": ${errorMessage}`);
  }
};

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
    // Fetch available templates from API
    let templates: api.VaultTemplate[] = [];
    try {
      templates = await api.getVaultTemplates();
      verboseLog(`Fetched ${templates.length} templates from API`);
    } catch (error) {
      console.error('Error: Could not fetch templates from API.');
      console.error('Please provide a schema file instead.');
      verboseLog(`Template fetch error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to fetch templates from API. Please use --schema option to provide a schema file.');
    }

    if (templates.length === 0) {
      console.error('Error: No templates available from API.');
      console.error('Please provide a schema file instead.');
      throw new Error('No templates available. Please use --schema option to provide a schema file.');
    }

    // Build a map of template names to IDs for the known templates
    const nameToIdMap: Record<string, string> = {};
    const availableKnownTemplates: string[] = [];

    // Match fetched templates with our known template names
    for (const template of templates) {
      const templateNameLower = template.name.toLowerCase().replace(/\s+/g, '_');

      // Check if this template matches one of our known templates
      if (TEMPLATE_NAME_MAP[templateNameLower] !== undefined) {
        nameToIdMap[templateNameLower] = template.ID;
        availableKnownTemplates.push(templateNameLower);
      }
    }

    // Sort by the predefined order
    availableKnownTemplates.sort((a, b) => TEMPLATE_NAME_MAP[a] - TEMPLATE_NAME_MAP[b]);

    // Build choices for the prompt
    const choices: Array<{ name: string; value: string }> = [];

    // Add the known templates that were found
    for (const templateName of availableKnownTemplates) {
      choices.push({ name: templateName, value: templateName });
    }

    choices.push({ name: 'Enter custom template name', value: 'custom' });

    const { templateChoice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'templateChoice',
        message: 'Select a template:',
        choices
      }
    ]);

    if (templateChoice === 'custom') {
      const { template } = await inquirer.prompt([
        {
          type: 'input',
          name: 'template',
          message: 'Enter custom template name:',
          validate: (input: string) => {
            if (!input) return 'Please enter a template name or press Ctrl+C to cancel';
            if (/^[a-z0-9_-]+$/.test(input)) {
              return true;
            }
            return 'Template name must be lowercase alphanumeric with hyphens or underscores only';
          }
        }
      ]);

      // Try to find the template ID from fetched templates
      const matchedTemplate = templates.find(t =>
        t.name.toLowerCase().replace(/\s+/g, '_') === template.toLowerCase()
      );

      if (matchedTemplate) {
        verboseLog(`Matched custom template "${template}" to ID: ${matchedTemplate.ID}`);
        result.template = matchedTemplate.ID;
      } else {
        console.error(`Error: Template "${template}" not found in available templates.`);
        throw new Error(`Template "${template}" not found. Please choose from available templates or use --schema option.`);
      }
    } else {
      // Use the template ID
      result.template = nameToIdMap[templateChoice];
      verboseLog(`Selected template: ${templateChoice}, ID: ${result.template}`);
    }
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

  // If template was provided via CLI, resolve it to an ID
  if (options.template && !options.schema) {
    verboseLog(`Resolving template "${options.template}" provided via CLI`);
    result.template = await resolveTemplateNameToId(options.template);
  } else {
    // Prompt for template or schema
    const templateOrSchema = await promptForTemplateOrSchema({
      template: options.template,
      schema: options.schema
    });

    result.template = templateOrSchema.template;
    result.schema = templateOrSchema.schema;
  }

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
