import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { Connection, ConnectionConfigFile, CreateConnectionResult } from '../types';
import { createConnection } from '../utils/api';
import { verboseLog, errorLog } from '../utils/logger';
import { promptForVaultId } from '../utils/prompts';

export const createConnectionCommand = (program: Command): void => {
  program
    .command('create-connection')
  .description('Create connections from a configuration file')
  .option('--file-path <path>', 'Path to connection configuration file')
  .option('--vault-id <id>', 'ID of the vault (optional if SKYFLOW_VAULT_ID env var is set)')
  .option('--verbose', 'Enable detailed logging')
  .action(async (options) => {
    try {
      // Handle verbose flag
      if (options.verbose) {
        process.env.VERBOSE = 'true';
      }

      verboseLog('Starting create-connection command with options:', options);

      // Validate file path
      if (!options.filePath) {
        throw new Error('--file-path is required. Please provide the path to your connection configuration file.');
      }

      // Check if file exists
      if (!fs.existsSync(options.filePath)) {
        throw new Error(`Configuration file not found: ${options.filePath}`);
      }

      // Get vault ID from option or environment variable
      let vaultId = options.vaultId || process.env.SKYFLOW_VAULT_ID;
      
      if (!vaultId) {
        vaultId = await promptForVaultId();
      }

      verboseLog(`Using vault ID: ${vaultId}`);

      // Read and parse configuration file
      verboseLog(`Reading configuration file: ${options.filePath}`);
      const configContent = fs.readFileSync(options.filePath, 'utf8');
      
      let config: ConnectionConfigFile;
      try {
        config = JSON.parse(configContent);
      } catch (parseError) {
        throw new Error(`Invalid JSON in configuration file: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }

      // Extract connections array
      let connections: Connection[] = [];
      
      if (Array.isArray(config)) {
        // If the root is an array, use it directly
        connections = config as Connection[];
      } else if (config.connections && Array.isArray(config.connections)) {
        // If it's an object with a connections property
        connections = config.connections;
      } else {
        throw new Error('Configuration file must contain an array of connections or an object with a "connections" property');
      }

      if (connections.length === 0) {
        throw new Error('No connections found in configuration file');
      }

      verboseLog(`Found ${connections.length} connection(s) to create`);

      // Validate and set vault ID for each connection
      const validatedConnections: Connection[] = connections.map((conn, index) => {
        if (!conn.name) {
          throw new Error(`Connection at index ${index} is missing required field: name`);
        }
        if (!conn.baseURL) {
          throw new Error(`Connection "${conn.name}" is missing required field: baseURL`);
        }
        if (!conn.routes || !Array.isArray(conn.routes)) {
          throw new Error(`Connection "${conn.name}" is missing required field: routes (array)`);
        }

        // Set vault ID if not already specified
        return {
          ...conn,
          vaultID: conn.vaultID || vaultId,
          // Set defaults for optional fields
          authMode: conn.authMode || 'NOAUTH',
          description: conn.description || `Connection created with Sky CLI on ${new Date().toISOString()}`,
          denyPassThrough: conn.denyPassThrough !== undefined ? conn.denyPassThrough : false
        };
      });

      // Create connections
      const results: CreateConnectionResult[] = [];
      
      console.log(`\nCreating ${validatedConnections.length} connection(s)...`);
      
      for (let i = 0; i < validatedConnections.length; i++) {
        const connection = validatedConnections[i];
        
        try {
          console.log(`\n[${i + 1}/${validatedConnections.length}] Creating connection: ${connection.name}`);
          verboseLog(`Connection payload:`, connection);
          
          const connectionId = await createConnection(connection);
          
          const result: CreateConnectionResult = {
            connectionID: connectionId,
            name: connection.name,
            status: 'success'
          };
          
          results.push(result);
          console.log(`✅ Successfully created connection "${connection.name}" (ID: ${connectionId})`);
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          const result: CreateConnectionResult = {
            connectionID: '',
            name: connection.name,
            status: 'failed',
            error: errorMessage
          };
          
          results.push(result);
          console.log(`❌ Failed to create connection "${connection.name}": ${errorMessage}`);
          
          // Continue with next connection instead of failing completely
          errorLog(`Connection creation failed for "${connection.name}"`, error);
        }
      }

      // Summary
      const successful = results.filter(r => r.status === 'success');
      const failed = results.filter(r => r.status === 'failed');
      
      console.log(`\n📊 Summary:`);
      console.log(`   ✅ Successfully created: ${successful.length} connection(s)`);
      
      if (successful.length > 0) {
        successful.forEach(result => {
          console.log(`      - ${result.name} (ID: ${result.connectionID})`);
        });
      }
      
      if (failed.length > 0) {
        console.log(`   ❌ Failed to create: ${failed.length} connection(s)`);
        failed.forEach(result => {
          console.log(`      - ${result.name}: ${result.error}`);
        });
      }

      // Exit with error code if any connections failed
      if (failed.length > 0) {
        process.exit(1);
      }

    } catch (error) {
      errorLog('Create connection command failed', error);
      console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });
};