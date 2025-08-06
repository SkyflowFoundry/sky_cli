import { Command } from 'commander';
import { createVaultCommand } from '../../commands/createVault';
import * as api from '../../utils/api';
import * as prompts from '../../utils/prompts';
import * as config from '../../utils/config';
import { VaultResponse, ServiceAccount, Role } from '../../types';
import fs from 'fs';

// Mock dependencies
jest.mock('../../utils/api');
jest.mock('../../utils/prompts');
jest.mock('../../utils/config');
jest.mock('fs');
jest.mock('inquirer');

const mockedApi = api as jest.Mocked<typeof api>;
const mockedPrompts = prompts as jest.Mocked<typeof prompts>;
const mockedConfig = config as jest.Mocked<typeof config>;
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('createVault command', () => {
  let program: Command;

  beforeEach(() => {
    program = new Command();
    createVaultCommand(program);

    // Mock default config
    mockedConfig.loadConfig.mockReturnValue({
      token: 'test-token',
      accountId: 'test-account',
      workspaceID: 'test-workspace'
    });

    // Reset all mocks
    jest.clearAllMocks();
  });

  const mockVaultResponse: VaultResponse = {
    vaultID: 'vault-123',
    name: 'test-vault',
    description: 'Test vault description',
    vaultURL: 'https://vault-url.com',
    clusterID: 'cluster-123',
    workspaceID: 'workspace-123'
  };

  const mockServiceAccount: ServiceAccount = {
    clientID: 'client-123',
    clientName: 'test-service-account',
    apiKeyID: 'api-key-123',
    apiKey: 'test-api-key'
  };

  const mockRole: Role = {
    ID: 'role-123',
    definition: {
      name: 'VAULT_OWNER',
      displayName: 'Vault Owner',
      description: 'Vault owner role'
    }
  };

  describe('successful vault creation', () => {
    it('should create vault with minimal options', async () => {
      const mockOptions = {
        name: 'test-vault',
        template: 'basic-template',
        workspaceID: 'workspace-123'
      };

      mockedPrompts.promptForMissingOptions.mockResolvedValue(mockOptions);
      mockedApi.createVault.mockResolvedValue(mockVaultResponse);

      await program.parseAsync(['node', 'test', 'create-vault', '--name', 'test-vault', '--template', 'basic-template']);

      expect(mockedApi.createVault).toHaveBeenCalledWith(mockOptions);
      expect(console.log).toHaveBeenCalledWith('Creating vault "test-vault"...');
      expect(console.log).toHaveBeenCalledWith('\n=== Vault Created Successfully ===\n');
    });

    it('should create vault with service account', async () => {
      const mockOptions = {
        name: 'test-vault',
        template: 'basic-template',
        createServiceAccount: true,
        workspaceID: 'workspace-123'
      };

      mockedPrompts.promptForMissingOptions.mockResolvedValue(mockOptions);
      mockedApi.createVault.mockResolvedValue(mockVaultResponse);
      mockedApi.createServiceAccount.mockResolvedValue(mockServiceAccount);
      mockedApi.getVaultRoles.mockResolvedValue([mockRole]);
      mockedApi.assignRoleToServiceAccount.mockResolvedValue('assignment-123');
      mockedApi.verifyVaultAccess.mockResolvedValue(true);

      await program.parseAsync([
        'node', 'test', 'create-vault',
        '--name', 'test-vault',
        '--template', 'basic-template',
        '--create-service-account', 'true'
      ]);

      expect(mockedApi.createVault).toHaveBeenCalledWith(mockOptions);
      expect(mockedApi.createServiceAccount).toHaveBeenCalledWith('test-vault-service-account');
      expect(mockedApi.getVaultRoles).toHaveBeenCalledWith('vault-123');
      expect(mockedApi.assignRoleToServiceAccount).toHaveBeenCalledWith('role-123', 'client-123');
      expect(mockedApi.verifyVaultAccess).toHaveBeenCalledWith('vault-123', 'test-api-key');
    });

    it('should handle schema file validation', async () => {
      const schemaPath = '/path/to/schema.json';
      const schemaContent = '{"table": "users", "fields": []}';

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(schemaContent);

      const mockOptions = {
        name: 'test-vault',
        schema: schemaPath,
        workspaceID: 'workspace-123'
      };

      mockedPrompts.promptForMissingOptions.mockResolvedValue(mockOptions);
      mockedApi.createVault.mockResolvedValue(mockVaultResponse);

      await program.parseAsync([
        'node', 'test', 'create-vault',
        '--name', 'test-vault',
        '--schema', schemaPath
      ]);

      expect(mockedFs.existsSync).toHaveBeenCalledWith(schemaPath);
      expect(mockedFs.readFileSync).toHaveBeenCalledWith(schemaPath, 'utf8');
      expect(mockedApi.createVault).toHaveBeenCalledWith(mockOptions);
    });
  });

  describe('error handling', () => {
    it('should exit with error for missing schema file', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      await program.parseAsync([
        'node', 'test', 'create-vault',
        '--name', 'test-vault',
        '--schema', '/nonexistent/schema.json'
      ]);

      expect(process.exit).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith(
        'Error: Schema file not found at path: /nonexistent/schema.json'
      );
    });

    it('should exit with error for invalid JSON schema', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('invalid json');

      await program.parseAsync([
        'node', 'test', 'create-vault',
        '--name', 'test-vault',
        '--schema', '/path/to/invalid-schema.json'
      ]);

      expect(process.exit).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error: Invalid JSON schema file:')
      );
    });

    it('should handle vault creation API error', async () => {
      const mockOptions = {
        name: 'test-vault',
        template: 'basic-template',
        workspaceID: 'workspace-123'
      };

      mockedPrompts.promptForMissingOptions.mockResolvedValue(mockOptions);
      mockedApi.createVault.mockRejectedValue(new Error('API Error: Vault creation failed'));

      await program.parseAsync([
        'node', 'test', 'create-vault',
        '--name', 'test-vault',
        '--template', 'basic-template'
      ]);

      expect(process.exit).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith('Error: API Error: Vault creation failed');
    });

    it('should handle service account creation failure', async () => {
      const mockOptions = {
        name: 'test-vault',
        template: 'basic-template',
        createServiceAccount: true,
        workspaceID: 'workspace-123'
      };

      mockedPrompts.promptForMissingOptions.mockResolvedValue(mockOptions);
      mockedApi.createVault.mockResolvedValue(mockVaultResponse);
      mockedApi.createServiceAccount.mockRejectedValue(new Error('Service account creation failed'));

      await program.parseAsync([
        'node', 'test', 'create-vault',
        '--name', 'test-vault',
        '--template', 'basic-template',
        '--create-service-account', 'true'
      ]);

      expect(process.exit).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith('Error: Service account creation failed');
    });

    it('should warn when VAULT_OWNER role not found', async () => {
      const mockOptions = {
        name: 'test-vault',
        template: 'basic-template',
        createServiceAccount: true,
        workspaceID: 'workspace-123'
      };

      const rolesWithoutVaultOwner = [{
        ID: 'role-456',
        definition: {
          name: 'OTHER_ROLE',
          displayName: 'Other Role',
          description: 'Some other role'
        }
      }];

      mockedPrompts.promptForMissingOptions.mockResolvedValue(mockOptions);
      mockedApi.createVault.mockResolvedValue(mockVaultResponse);
      mockedApi.createServiceAccount.mockResolvedValue(mockServiceAccount);
      mockedApi.getVaultRoles.mockResolvedValue(rolesWithoutVaultOwner);

      await program.parseAsync([
        'node', 'test', 'create-vault',
        '--name', 'test-vault',
        '--template', 'basic-template',
        '--create-service-account', 'true'
      ]);

      expect(console.warn).toHaveBeenCalledWith(
        'Warning: VAULT_OWNER role not found. Skipping role assignment.'
      );
    });

    it('should warn when service account access verification fails', async () => {
      const mockOptions = {
        name: 'test-vault',
        template: 'basic-template',
        createServiceAccount: true,
        workspaceID: 'workspace-123'
      };

      mockedPrompts.promptForMissingOptions.mockResolvedValue(mockOptions);
      mockedApi.createVault.mockResolvedValue(mockVaultResponse);
      mockedApi.createServiceAccount.mockResolvedValue(mockServiceAccount);
      mockedApi.getVaultRoles.mockResolvedValue([mockRole]);
      mockedApi.assignRoleToServiceAccount.mockResolvedValue('assignment-123');
      mockedApi.verifyVaultAccess.mockResolvedValue(false);

      await program.parseAsync([
        'node', 'test', 'create-vault',
        '--name', 'test-vault',
        '--template', 'basic-template',
        '--create-service-account', 'true'
      ]);

      expect(console.warn).toHaveBeenCalledWith(
        'Warning: Service account access could not be verified.'
      );
    });
  });

  describe('workspace ID handling', () => {
    it('should use workspace ID from config when not provided as option', async () => {
      const mockOptions = {
        name: 'test-vault',
        template: 'basic-template',
        workspaceID: 'test-workspace'
      };

      mockedPrompts.promptForMissingOptions.mockResolvedValue(mockOptions);
      mockedApi.createVault.mockResolvedValue(mockVaultResponse);

      await program.parseAsync([
        'node', 'test', 'create-vault',
        '--name', 'test-vault',
        '--template', 'basic-template'
      ]);

      expect(mockedApi.createVault).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceID: 'test-workspace' })
      );
    });

    it('should override config workspace ID with provided option', async () => {
      const mockOptions = {
        name: 'test-vault',
        template: 'basic-template',
        workspaceID: 'override-workspace'
      };

      mockedPrompts.promptForMissingOptions.mockResolvedValue(mockOptions);
      mockedApi.createVault.mockResolvedValue(mockVaultResponse);

      await program.parseAsync([
        'node', 'test', 'create-vault',
        '--name', 'test-vault',
        '--template', 'basic-template',
        '--workspace-id', 'override-workspace'
      ]);

      expect(mockedApi.createVault).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceID: 'override-workspace' })
      );
    });
  });
});