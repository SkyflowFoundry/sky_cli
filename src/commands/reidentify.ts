import { Command } from 'commander';
import inquirer from 'inquirer';
import {
  ReidentifyTextRequest,
  ReidentifyTextOptions,
  ReidentifyTextResponse,
  DetectEntities,
} from 'skyflow-node';
import { ReidentifyCommandOptions } from '../types';
import {
  initializeSkyflowClient,
  handleSkyflowError,
  resolveVaultId,
  extractClusterIdFromUrl,
} from '../utils/skyflow';
import { logVerbose } from '../utils/logger';
import { readStdin } from '../utils/input';
import { ENTITY_MAP, AVAILABLE_ENTITIES } from '../utils/entities';
import { promptForVaultId, promptForClusterId } from '../utils/prompts';
import { loadConfig, updateLastVaultDetails } from '../utils/config';


export const reidentifyCommand = (program: Command): void => {
  program
    .command('reidentify')
    .description('Restore original values from tokenized text using Skyflow Detect API')
    .option('--text <string>', 'Tokenized text to reidentify (or pipe from stdin)')
    .option(
      '--plain-text <list>',
      `Comma-separated entities to return as plain text (e.g., SSN,CREDIT_CARD). Available: ${AVAILABLE_ENTITIES}`
    )
    .option(
      '--masked <list>',
      'Comma-separated entities to return masked'
    )
    .option(
      '--redacted <list>',
      'Comma-separated entities to keep redacted'
    )
    .option('--output <format>', 'Output format: text or json', 'text')
    .option('--vault-id <id>', 'Vault ID (or set SKYFLOW_VAULT_ID)')
    .option('--cluster-id <id>', 'Cluster ID (or set SKYFLOW_VAULT_URL)')
    .option('--environment <env>', 'Environment: PROD, SANDBOX, STAGE, DEV', 'PROD')
    .action(async (options: ReidentifyCommandOptions) => {
      try {
        // Get text from option or stdin
        let textInput = options.text;
        if (!textInput) {
          // Check if stdin is being piped
          if (!process.stdin.isTTY) {
            logVerbose('Reading text from stdin...');
            textInput = await readStdin();
          } else {
            // Prompt for text
            const answers = await inquirer.prompt([
              {
                type: 'editor',
                name: 'text',
                message: 'Enter tokenized text to reidentify:',
                validate: (input: string) => {
                  if (!input) return 'Text is required';
                  return true;
                },
              },
            ]);
            textInput = answers.text;
          }
        }

        // Parse entity options
        const parseEntities = (entityString?: string): DetectEntities[] | undefined => {
          if (!entityString) return undefined;
          const rawEntities = entityString.split(',').map((e) => e.trim().toUpperCase());
          return rawEntities.map((entity) => {
            const mapped = ENTITY_MAP[entity];
            if (!mapped) {
              throw new Error(
                `Unknown entity type: ${entity}\nAvailable entities: ${AVAILABLE_ENTITIES}`
              );
            }
            return mapped;
          });
        };

        const plainTextEntities = parseEntities(options.plainText);
        const maskedEntities = parseEntities(options.masked);
        const redactedEntities = parseEntities(options.redacted);

        if (plainTextEntities) {
          logVerbose(`Plain text entities: ${plainTextEntities.join(', ')}`);
        }
        if (maskedEntities) {
          logVerbose(`Masked entities: ${maskedEntities.join(', ')}`);
        }
        if (redactedEntities) {
          logVerbose(`Redacted entities: ${redactedEntities.join(', ')}`);
        }

        // If no options specified, default to plain text for all entities
        const hasEntityOptions = plainTextEntities || maskedEntities || redactedEntities;
        if (!hasEntityOptions) {
          logVerbose('No entity options specified, returning all as plain text');
        }

        // Resolve vault ID - prompt if not provided
        let vaultId = options.vaultId || process.env.SKYFLOW_VAULT_ID;
        if (!vaultId) {
          // Try to get last used vault ID from config
          try {
            const config = loadConfig();
            vaultId = await promptForVaultId(config.lastVaultId);
          } catch {
            vaultId = await promptForVaultId();
          }
        }
        logVerbose(`Using vault ID: ${vaultId}`);

        // Resolve cluster ID - prompt if not provided
        let clusterId = options.clusterId;
        if (!clusterId) {
          const vaultUrl = process.env.SKYFLOW_VAULT_URL;
          if (vaultUrl) {
            clusterId = extractClusterIdFromUrl(vaultUrl);
            logVerbose(`Cluster ID extracted from vault URL: ${clusterId}`);
          } else {
            // Try to get last used cluster ID from config
            try {
              const config = loadConfig();
              clusterId = await promptForClusterId(config.lastClusterId);
            } catch {
              clusterId = await promptForClusterId();
            }
          }
        }
        logVerbose(`Using cluster ID: ${clusterId}`);

        // Save vault details for next time
        updateLastVaultDetails(vaultId, clusterId);

        // Initialize Skyflow client
        const verbose = program.opts().verbose || false;
        const skyflowClient = initializeSkyflowClient(
          vaultId,
          clusterId,
          options.environment,
          verbose
        );

        // Create reidentify request
        const reidentifyRequest = new ReidentifyTextRequest(textInput!);
        logVerbose('Created reidentify request');

        // Configure options
        const reidentifyOptions = new ReidentifyTextOptions();
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
        logVerbose('Executing reidentify operation...');
        const response: ReidentifyTextResponse = await skyflowClient
          .detect(vaultId!)
          .reidentifyText(reidentifyRequest, reidentifyOptions);

        // Display results
        if (options.output === 'json') {
          console.log(JSON.stringify(response, null, 2));
        } else {
          console.log('\nReidentified Text:');
          console.log('─'.repeat(60));
          console.log(response.processedText);
          console.log('─'.repeat(60));
          console.log('\nOriginal sensitive data has been restored.');
        }
      } catch (error) {
        handleSkyflowError(error);
      }
    });
};

