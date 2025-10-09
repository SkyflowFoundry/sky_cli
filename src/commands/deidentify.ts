import { Command } from 'commander';
import inquirer from 'inquirer';
import {
  DeidentifyTextRequest,
  DeidentifyTextOptions,
  DeidentifyTextResponse,
  DetectEntities,
  TokenFormat,
  TokenType,
} from 'skyflow-node';
import { DeidentifyCommandOptions } from '../types';
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


export const deidentifyCommand = (program: Command): void => {
  program
    .command('deidentify')
    .description('Detect and redact sensitive data from text using Skyflow Detect API')
    .option('--text <string>', 'Text to deidentify (or pipe from stdin)')
    .option(
      '--entities <list>',
      `Comma-separated entity types to detect (e.g., SSN,CREDIT_CARD). Available: ${AVAILABLE_ENTITIES}`
    )
    .option(
      '--token-type <type>',
      'Token format: vault_token (stored), entity_only (labels), random_token (ephemeral)',
      'vault_token'
    )
    .option('--output <format>', 'Output format: text or json', 'text')
    .option('--vault-id <id>', 'Vault ID (or set SKYFLOW_VAULT_ID)')
    .option('--cluster-id <id>', 'Cluster ID (or set SKYFLOW_VAULT_URL)')
    .option('--environment <env>', 'Environment: PROD, SANDBOX, STAGE, DEV', 'PROD')
    .action(async (options: DeidentifyCommandOptions) => {
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
                message: 'Enter text to deidentify:',
                validate: (input: string) => {
                  if (!input) return 'Text is required';
                  return true;
                },
              },
            ]);
            textInput = answers.text;
          }
        }

        // Parse entities if provided
        let entityList: DetectEntities[] | undefined;
        if (options.entities) {
          const rawEntities = options.entities.split(',').map((e) => e.trim().toUpperCase());
          entityList = rawEntities.map((entity) => {
            const mapped = ENTITY_MAP[entity];
            if (!mapped) {
              throw new Error(
                `Unknown entity type: ${entity}\nAvailable entities: ${AVAILABLE_ENTITIES}`
              );
            }
            return mapped;
          });
          logVerbose(`Detecting entities: ${entityList.join(', ')}`);
        } else {
          // Use common entities by default
          entityList = [
            DetectEntities.SSN,
            DetectEntities.CREDIT_CARD,
            DetectEntities.EMAIL_ADDRESS,
            DetectEntities.PHONE_NUMBER,
            DetectEntities.NAME,
            DetectEntities.DOB,
          ];
          logVerbose('Using default entity detection (SSN, CREDIT_CARD, EMAIL_ADDRESS, PHONE_NUMBER, NAME, DOB)');
        }

        // Parse token type
        let tokenType: TokenType;
        switch (options.tokenType?.toLowerCase()) {
          case 'vault_token':
            tokenType = TokenType.VAULT_TOKEN;
            break;
          case 'entity_only':
            tokenType = TokenType.ENTITY_ONLY;
            break;
          case 'entity_unique_counter':
            tokenType = TokenType.ENTITY_UNIQUE_COUNTER;
            break;
          default:
            tokenType = TokenType.VAULT_TOKEN;
            logVerbose(`Unknown token type '${options.tokenType}', using vault_token`);
        }
        logVerbose(`Using token type: ${options.tokenType || 'vault_token'}`);

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

        // Create deidentify request
        const deidentifyRequest = new DeidentifyTextRequest(textInput!);
        logVerbose('Created deidentify request');

        // Configure options
        const deidentifyOptions = new DeidentifyTextOptions();
        deidentifyOptions.setEntities(entityList);

        const tokenFormat = new TokenFormat();
        tokenFormat.setDefault(tokenType);
        deidentifyOptions.setTokenFormat(tokenFormat);

        // Execute deidentify
        logVerbose('Executing deidentify operation...');
        const response: DeidentifyTextResponse = await skyflowClient
          .detect(vaultId!)
          .deidentifyText(deidentifyRequest, deidentifyOptions);

        // Display results
        if (options.output === 'json') {
          console.log(JSON.stringify(response, null, 2));
        } else {
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
          } else {
            console.log('\nNo sensitive entities detected.');
          }

          if (response.wordCount !== undefined) {
            console.log(`Word count: ${response.wordCount}`);
          }
          if (response.charCount !== undefined) {
            console.log(`Character count: ${response.charCount}`);
          }
        }
      } catch (error) {
        handleSkyflowError(error);
      }
    });
};

