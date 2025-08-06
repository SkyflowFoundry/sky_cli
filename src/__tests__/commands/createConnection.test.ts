import { Command } from 'commander';
import { createConnectionCommand } from '../../commands/createConnection';
import * as api from '../../utils/api';
import * as prompts from '../../utils/prompts';
import { ConnectionConfig, CreateConnectionResponse } from '../../types';
import fs from 'fs';

// Mock dependencies
jest.mock('../../utils/api');
jest.mock('../../utils/prompts');
jest.mock('fs');

const mockedApi = api as jest.Mocked<typeof api>;
const mockedPrompts = prompts as jest.Mocked<typeof prompts>;
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('createConnection command', () => {
  let program: Command;

  beforeEach(() => {
    program = new Command();
    createConnectionCommand(program);

    // Reset environment variables
    delete process.env.SKYFLOW_VAULT_ID;
    delete process.env.VERBOSE;

    // Reset all mocks
    jest.clearAllMocks();
  });

  const mockConnectionConfig: ConnectionConfig = {
    name: 'test-connection',
    mode: 'INGRESS',
    baseURL: 'https://api.example.com',
    vaultID: 'vault-123',
    routes: [{
      path: '/users',
      method: 'POST',
      contentType: 'JSON',
      url: [],
      requestBody: [],
      responseBody: [],
      responseHeader: [],
      queryParams: [],
      requestHeader: [],
      name: 'create-user',
      description: 'Create user route',
      soapAction: '',
      mleType: 'NOT_REQUIRED',
      preFieldRequestMessageActions: [],
      postFieldRequestMessageActions: [],
      preFieldResponseMessageActions: [],
      postFieldResponseMessageActions: [],
      tableUpsertInfo: []
    }],
    authMode: 'NOAUTH',
    description: 'Test connection'
  };

  const mockConnectionResponse: CreateConnectionResponse = {
    ID: 'connection-123',
    connectionURL: 'https://connection-url.com',
    name: 'test-connection',
    status: 'success'
  };

  describe('successful connection creation', () => {
    it('should create connections from array configuration file', async () => {
      const filePath = '/path/to/connections.json';
      const configContent = JSON.stringify([mockConnectionConfig]);

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(configContent);
      mockedApi.createConnection.mockResolvedValue(mockConnectionResponse);

      await program.parseAsync([
        'node', 'test', 'create-connection',
        '--file-path', filePath,
        '--vault-id', 'vault-123'
      ]);

      expect(mockedFs.existsSync).toHaveBeenCalledWith(filePath);
      expect(mockedFs.readFileSync).toHaveBeenCalledWith(filePath, 'utf8');
      expect(mockedApi.createConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test-connection',
          vaultID: 'vault-123'
        })
      );
      expect(console.log).toHaveBeenCalledWith('\nCreating 1 connection(s)...');
      expect(console.log).toHaveBeenCalledWith('Successfully created connections.');
    });

    it('should create connections from object configuration file', async () => {
      const filePath = '/path/to/connections.json';
      const configContent = JSON.stringify({ connections: [mockConnectionConfig] });

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(configContent);
      mockedApi.createConnection.mockResolvedValue(mockConnectionResponse);

      await program.parseAsync([
        'node', 'test', 'create-connection',
        '--file-path', filePath,
        '--vault-id', 'vault-123'
      ]);

      expect(mockedApi.createConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test-connection',
          vaultID: 'vault-123'
        })
      );
    });

    it('should use vault ID from environment variable', async () => {
      process.env.SKYFLOW_VAULT_ID = 'env-vault-123';
      const filePath = '/path/to/connections.json';
      const configContent = JSON.stringify([mockConnectionConfig]);

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(configContent);
      mockedApi.createConnection.mockResolvedValue(mockConnectionResponse);

      await program.parseAsync([
        'node', 'test', 'create-connection',
        '--file-path', filePath
      ]);

      expect(mockedApi.createConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          vaultID: 'env-vault-123'
        })
      );
    });

    it('should prompt for vault ID when not provided', async () => {
      const filePath = '/path/to/connections.json';
      const configContent = JSON.stringify([mockConnectionConfig]);

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(configContent);
      mockedPrompts.promptForVaultId.mockResolvedValue('prompted-vault-123');
      mockedApi.createConnection.mockResolvedValue(mockConnectionResponse);

      await program.parseAsync([
        'node', 'test', 'create-connection',
        '--file-path', filePath
      ]);

      expect(mockedPrompts.promptForVaultId).toHaveBeenCalled();
      expect(mockedApi.createConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          vaultID: 'prompted-vault-123'
        })
      );
    });

    it('should handle multiple connections with mixed success/failure', async () => {
      const filePath = '/path/to/connections.json';
      const connection1 = { ...mockConnectionConfig, name: 'connection-1' };
      const connection2 = { ...mockConnectionConfig, name: 'connection-2' };
      const configContent = JSON.stringify([connection1, connection2]);

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(configContent);
      
      // First connection succeeds, second fails
      mockedApi.createConnection
        .mockResolvedValueOnce({ ...mockConnectionResponse, name: 'connection-1' })
        .mockRejectedValueOnce(new Error('API Error'));

      await program.parseAsync([
        'node', 'test', 'create-connection',
        '--file-path', filePath,
        '--vault-id', 'vault-123'
      ]);

      expect(mockedApi.createConnection).toHaveBeenCalledTimes(2);
      expect(console.log).toHaveBeenCalledWith('Successfully created: 1 connection(s)');
      expect(console.log).toHaveBeenCalledWith('Failed to create: 1 connection(s)');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should enable verbose logging when flag is set', async () => {
      const filePath = '/path/to/connections.json';
      const configContent = JSON.stringify([mockConnectionConfig]);

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(configContent);
      mockedApi.createConnection.mockResolvedValue(mockConnectionResponse);

      await program.parseAsync([
        'node', 'test', 'create-connection',
        '--file-path', filePath,
        '--vault-id', 'vault-123',
        '--verbose'
      ]);

      expect(process.env.VERBOSE).toBe('true');
    });
  });

  describe('error handling', () => {
    it('should exit with error when file-path is not provided', async () => {
      await program.parseAsync([
        'node', 'test', 'create-connection',
        '--vault-id', 'vault-123'
      ]);

      expect(process.exit).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith(
        'Error: --file-path is required. Please provide the path to your connection configuration file.'
      );
    });

    it('should exit with error when configuration file does not exist', async () => {
      const filePath = '/nonexistent/connections.json';
      mockedFs.existsSync.mockReturnValue(false);

      await program.parseAsync([
        'node', 'test', 'create-connection',
        '--file-path', filePath,
        '--vault-id', 'vault-123'
      ]);

      expect(process.exit).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith(
        `Error: Configuration file not found: ${filePath}`
      );
    });

    it('should exit with error for invalid JSON in configuration file', async () => {
      const filePath = '/path/to/invalid.json';
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('invalid json');

      await program.parseAsync([
        'node', 'test', 'create-connection',
        '--file-path', filePath,
        '--vault-id', 'vault-123'
      ]);

      expect(process.exit).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error: Invalid JSON in configuration file:')
      );
    });

    it('should exit with error for empty connections array', async () => {
      const filePath = '/path/to/empty.json';
      const configContent = JSON.stringify([]);

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(configContent);

      await program.parseAsync([
        'node', 'test', 'create-connection',
        '--file-path', filePath,
        '--vault-id', 'vault-123'
      ]);

      expect(process.exit).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith(
        'Error: No connections found in configuration file'
      );
    });

    it('should exit with error for connection missing required fields', async () => {
      const filePath = '/path/to/invalid-connection.json';
      const invalidConnection = { description: 'Missing required fields' };
      const configContent = JSON.stringify([invalidConnection]);

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(configContent);

      await program.parseAsync([
        'node', 'test', 'create-connection',
        '--file-path', filePath,
        '--vault-id', 'vault-123'
      ]);

      expect(process.exit).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error: Connection at index 0 is missing required field: name')
      );
    });

    it('should exit with error for connection missing vault ID', async () => {
      const filePath = '/path/to/connection.json';
      const connectionWithoutVaultId = { ...mockConnectionConfig, vaultID: undefined };
      const configContent = JSON.stringify([connectionWithoutVaultId]);

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(configContent);

      await program.parseAsync([
        'node', 'test', 'create-connection',
        '--file-path', filePath,
        '--vault-id', 'vault-123'
      ]);

      expect(process.exit).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error: Connection "test-connection" is missing required field: vault ID')
      );
    });

    it('should exit with error for connection missing routes', async () => {
      const filePath = '/path/to/connection.json';
      const connectionWithoutRoutes = { ...mockConnectionConfig, routes: undefined };
      const configContent = JSON.stringify([connectionWithoutRoutes]);

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(configContent);

      await program.parseAsync([
        'node', 'test', 'create-connection',
        '--file-path', filePath,
        '--vault-id', 'vault-123'
      ]);

      expect(process.exit).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error: Connection "test-connection" is missing required field: routes (array)')
      );
    });

    it('should handle unsupported configuration file format', async () => {
      const filePath = '/path/to/unsupported.json';
      const unsupportedConfig = { someOtherProperty: 'value' };
      const configContent = JSON.stringify(unsupportedConfig);

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(configContent);

      await program.parseAsync([
        'node', 'test', 'create-connection',
        '--file-path', filePath,
        '--vault-id', 'vault-123'
      ]);

      expect(process.exit).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith(
        'Error: Configuration file must contain an array of connections or an object with a "connections" property'
      );
    });
  });

  describe('route processing', () => {
    it('should remove invocationURL from routes when processing connection config', async () => {
      const filePath = '/path/to/connections.json';
      const connectionWithInvocationURL = {
        ...mockConnectionConfig,
        routes: [{
          ...mockConnectionConfig.routes[0],
          invocationURL: 'https://should-be-removed.com'
        }]
      };
      const configContent = JSON.stringify([connectionWithInvocationURL]);

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(configContent);
      mockedApi.createConnection.mockResolvedValue(mockConnectionResponse);

      await program.parseAsync([
        'node', 'test', 'create-connection',
        '--file-path', filePath,
        '--vault-id', 'vault-123'
      ]);

      const callArg = mockedApi.createConnection.mock.calls[0][0];
      expect(callArg.routes[0]).not.toHaveProperty('invocationURL');
    });
  });

  describe('summary reporting', () => {
    it('should display summary with successful connections', async () => {
      const filePath = '/path/to/connections.json';
      const configContent = JSON.stringify([mockConnectionConfig]);

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(configContent);
      mockedApi.createConnection.mockResolvedValue(mockConnectionResponse);

      await program.parseAsync([
        'node', 'test', 'create-connection',
        '--file-path', filePath,
        '--vault-id', 'vault-123'
      ]);

      expect(console.log).toHaveBeenCalledWith('\nSummary:');
      expect(console.log).toHaveBeenCalledWith('Successfully created: 1 connection(s)');
      expect(console.log).toHaveBeenCalledWith('      - test-connection (ID: connection-123)');
    });
  });
});