import inquirer from 'inquirer';
import fs from 'fs';
import { VaultOptions } from '../types';
import * as api from './api';
import { verboseLog } from './logger';

// Mapping of friendly template names to their display order
// This defines the priority order for common templates (others shown alphabetically after)
const TEMPLATE_NAME_MAP: Record<string, number> = {
  'customer_identity': 1,
  'payment': 2,
  'pii_data': 3,
  'scratch-template': 4,
  'quickstart': 5,
  'detect': 6,
  'plaid': 7,
  'payments_acceptance_sample': 8
};

// Helper function to truncate long descriptions for better readability
const truncateDescription = (description: string, maxLength: number = 100): string => {
  if (!description || description.length <= maxLength) {
    return description;
  }
  return description.substring(0, maxLength).trim() + '...';
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
// Note: If no name is provided, auto-generates one for non-interactive mode
export const promptForName = async (providedName?: string): Promise<string> => {
  if (providedName) return providedName;

  // Auto-generate a name for non-interactive mode
  const defaultName = generateRandomName();
  verboseLog(`No vault name provided, using auto-generated name: ${defaultName}`);

  return defaultName;
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

    // Build a map of template names to IDs and display names
    const nameToIdMap: Record<string, string> = {};
    const templateChoices: Array<{ name: string; value: string; order: number }> = [];

    // Build choices from all fetched templates
    for (const template of templates) {
      const templateNameLower = template.name.toLowerCase().replace(/\s+/g, '_');
      nameToIdMap[templateNameLower] = template.ID;

      // Use displayName if available, otherwise use the name
      const displayName = template.name;

      // Get sort order (known templates first, then alphabetically)
      const sortOrder = TEMPLATE_NAME_MAP[templateNameLower] || 999;

      templateChoices.push({
        name: `${displayName} - ${truncateDescription(template.description || 'No description')}`,
        value: templateNameLower,
        order: sortOrder
      });
    }

    // Sort by predefined order first, then alphabetically by name
    templateChoices.sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      return a.name.localeCompare(b.name);
    });

    // Build final choices list
    const choices: Array<{ name: string; value: string }> = templateChoices.map(({ name, value }) => ({
      name,
      value
    }));

    const { templateChoice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'templateChoice',
        message: 'Select a template:',
        choices
      }
    ]);

    // Use the template ID from the map
    result.template = nameToIdMap[templateChoice];
    verboseLog(`Selected template: ${templateChoice}, ID: ${result.template}`);
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
// Note: Description is truly optional - API provides a default if not specified
export const promptForDescription = async (providedDesc?: string): Promise<string | undefined> => {
  // If description is provided or not provided, return it as-is
  // This allows non-interactive mode to work without prompting
  return providedDesc;
};

// Prompt for master key if not provided
// Note: Master key is truly optional - vaults can be created without one
export const promptForMasterKey = async (providedKey?: string): Promise<string | undefined> => {
  // If master key is provided or not provided, return it as-is
  // This allows non-interactive mode to work without prompting
  return providedKey;
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
export const promptForVaultId = async (defaultVaultId?: string): Promise<string> => {
  const { vaultId } = await inquirer.prompt([
    {
      type: 'input',
      name: 'vaultId',
      message: 'Enter vault ID:',
      default: defaultVaultId,
      validate: (input: string) => {
        if (!input) return 'Vault ID is required';
        return true;
      }
    }
  ]);

  return vaultId;
};

// Prompt for cluster ID if not provided
export const promptForClusterId = async (defaultClusterId?: string): Promise<string> => {
  const { clusterId } = await inquirer.prompt([
    {
      type: 'input',
      name: 'clusterId',
      message: 'Enter cluster ID:',
      default: defaultClusterId,
      validate: (input: string) => {
        if (!input) return 'Cluster ID is required';
        return true;
      }
    }
  ]);

  return clusterId;
};
