import { Command } from 'commander';
import * as api from '../utils/api';
import { ConnectionConfig, ConnectionOptions, CreateConnectionResult } from '../types';
import { loadConfig } from '../utils/config';
import { setVerbose, verboseLog } from '../utils/logger';
import fs from 'fs';
import path from 'path';

export const createConnectionCommand = (program: Command): void => {
  program
    .command('create-connection')
    .description('Create connections in a Skyflow vault from a configuration file')
    .option('--file-path <path>', 'Path to connection configuration file')
    .option('--vault-id <id>', 'ID of the vault (if not provided, uses SKYFLOW_VAULT_ID env variable)')
    .option('--verbose', 'Enable verbose logging for debugging')
    .action(async (options: ConnectionOptions) => {
      try {
        // Set verbose mode if requested
        setVerbose(!!options.verbose);
        
        verboseLog('Create connection command started with options:', JSON.stringify(options, null, 2));
        
        // Validate required file path
        if (!options.filePath) {
          console.error('Error: --file-path is required');
          console.log('Usage: sky create-connection --file-path <path> [--vault-id <id>] [--verbose]');
          process.exit(1);
        }
        
        // Check if config file exists
        if (!fs.existsSync(options.filePath)) {
          console.error(`Error: Configuration file not found at path: ${options.filePath}`);
          process.exit(1);
        }
        
        // Load and validate configuration file
        let connectionsConfig: ConnectionConfig[];
        try {
          const configContent = fs.readFileSync(options.filePath, 'utf8');
          const parsedConfig = JSON.parse(configContent);
          
          // Handle both array format and object with connections property
          if (Array.isArray(parsedConfig)) {
            connectionsConfig = parsedConfig;
          } else if (parsedConfig.connections && Array.isArray(parsedConfig.connections)) {
            connectionsConfig = parsedConfig.connections;
          } else {
            throw new Error('Configuration file must contain an array of connections or an object with a "connections" array property');
          }
          
          if (connectionsConfig.length === 0) {
            console.log('No connections found in configuration file.');
            process.exit(0);
          }
          
          verboseLog(`Loaded ${connectionsConfig.length} connection(s) from configuration file`);
        } catch (error) {
          console.error(`Error reading configuration file: ${error instanceof Error ? error.message : String(error)}`);
          process.exit(1);
        }
        
        // Validate connection configurations
        for (let i = 0; i < connectionsConfig.length; i++) {
          const conn = connectionsConfig[i];
          if (!conn.name) {
            console.error(`Error: Connection at index ${i} is missing required "name" field`);
            process.exit(1);
          }
          if (!conn.type) {
            console.error(`Error: Connection "${conn.name}" is missing required "type" field`);
            process.exit(1);
          }
        }
        
        // Load configuration to ensure we're authenticated
        const config = loadConfig();
        
        // Determine vault ID
        let vaultId = options.vaultId;
        if (!vaultId) {
          vaultId = process.env.SKYFLOW_VAULT_ID;
          if (!vaultId) {
            console.error('Error: Vault ID is required. Provide it via --vault-id option or set SKYFLOW_VAULT_ID environment variable');
            process.exit(1);
          }
        }
        
        verboseLog(`Using vault ID: ${vaultId}`);
        
        // Create connections
        console.log(`Creating ${connectionsConfig.length} connection(s) in vault ${vaultId}...`);
        
        const result: CreateConnectionResult = {
          connections: [],
          successCount: 0,
          errorCount: 0,
          errors: []
        };
        
        for (const connectionConfig of connectionsConfig) {
          try {
            console.log(`Creating connection "${connectionConfig.name}" (${connectionConfig.type})...`);
            
            const connection = await api.createConnection(vaultId, connectionConfig);
            result.connections.push(connection);
            result.successCount++;
            
            console.log(`✓ Successfully created connection "${connectionConfig.name}"`);
          } catch (error) {
            const errorMessage = `Failed to create connection "${connectionConfig.name}": ${error instanceof Error ? error.message : String(error)}`;
            console.error(`✗ ${errorMessage}`);
            
            result.errorCount++;
            if (!result.errors) {
              result.errors = [];
            }
            result.errors.push(errorMessage);
          }
        }
        
        // Display results summary
        console.log('\n=== Connection Creation Summary ===');
        console.log(`Total connections: ${connectionsConfig.length}`);
        console.log(`Successfully created: ${result.successCount}`);
        console.log(`Failed: ${result.errorCount}`);
        
        if (result.successCount > 0) {
          console.log('\n=== Successfully Created Connections ===');
          result.connections.forEach(conn => {
            console.log(`- ${conn.name} (${conn.type}): ${conn.connectionID}`);
          });
        }
        
        if (result.errors && result.errors.length > 0) {
          console.log('\n=== Errors ===');
          result.errors.forEach(error => {
            console.log(`- ${error}`);
          });
          process.exit(1);
        }
        
        console.log('\nAll connections created successfully!');
        
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
};