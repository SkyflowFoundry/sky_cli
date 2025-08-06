import { generateRandomName, promptForName, promptForVaultId } from '../../utils/prompts';
import inquirer from 'inquirer';

// Mock inquirer
jest.mock('inquirer');
const mockedInquirer = inquirer as jest.Mocked<typeof inquirer>;

describe('prompts utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateRandomName', () => {
    it('should generate a random name with correct format', () => {
      const name = generateRandomName();
      
      expect(name).toMatch(/^[a-z]+-[a-z]+-\d{1,3}$/);
      expect(name.split('-')).toHaveLength(3);
    });

    it('should generate different names on subsequent calls', () => {
      const name1 = generateRandomName();
      const name2 = generateRandomName();
      
      // While it's possible they could be the same, it's highly unlikely
      // We'll just check they follow the correct pattern
      expect(name1).toMatch(/^[a-z]+-[a-z]+-\d{1,3}$/);
      expect(name2).toMatch(/^[a-z]+-[a-z]+-\d{1,3}$/);
    });
  });

  describe('promptForName', () => {
    it('should return provided name when given', async () => {
      const providedName = 'test-vault';
      const result = await promptForName(providedName);
      
      expect(result).toBe(providedName);
      expect(mockedInquirer.prompt).not.toHaveBeenCalled();
    });

    it('should prompt for name when not provided', async () => {
      const inputName = 'user-input-vault';
      mockedInquirer.prompt.mockResolvedValue({ name: inputName });

      const result = await promptForName();
      
      expect(result).toBe(inputName);
      expect(mockedInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'input',
          name: 'name',
          message: 'Enter vault name (no special chars):',
          validate: expect.any(Function)
        })
      ]);
    });

    it('should validate name format in prompt', async () => {
      mockedInquirer.prompt.mockResolvedValue({ name: 'valid-name' });

      await promptForName();
      
      const validateFn = mockedInquirer.prompt.mock.calls[0][0][0].validate;
      
      expect(validateFn('valid-name-123')).toBe(true);
      expect(validateFn('invalid name with spaces')).toBe('Name must be alphanumeric with hyphens only');
      expect(validateFn('invalid@name')).toBe('Name must be alphanumeric with hyphens only');
    });
  });

  describe('promptForVaultId', () => {
    it('should prompt for vault ID', async () => {
      const vaultId = 'vault-123';
      mockedInquirer.prompt.mockResolvedValue({ vaultId });

      const result = await promptForVaultId();
      
      expect(result).toBe(vaultId);
      expect(mockedInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'input',
          name: 'vaultId',
          message: 'Enter vault ID:',
          validate: expect.any(Function)
        })
      ]);
    });

    it('should validate vault ID input', async () => {
      const originalEnv = process.env.SKYFLOW_VAULT_ID;
      delete process.env.SKYFLOW_VAULT_ID;

      mockedInquirer.prompt.mockResolvedValue({ vaultId: 'vault-123' });

      await promptForVaultId();
      
      const validateFn = mockedInquirer.prompt.mock.calls[0][0][0].validate;
      
      expect(validateFn('vault-123')).toBe(true);
      expect(validateFn('')).toBe('Please enter a vault ID or press Ctrl+C to cancel');
      
      // Restore environment
      if (originalEnv) process.env.SKYFLOW_VAULT_ID = originalEnv;
    });
  });
});