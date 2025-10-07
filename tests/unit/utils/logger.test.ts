import { setVerbose, isVerboseMode, verboseLog, verboseWarn, errorLog, logVerbose, logError } from '../../../src/utils/logger';

describe('Logger Utility', () => {
  beforeEach(() => {
    // Reset verbose mode before each test
    setVerbose(false);
    jest.clearAllMocks();
  });

  describe('setVerbose', () => {
    it('should set verbose mode to true', () => {
      setVerbose(true);
      expect(isVerboseMode()).toBe(true);
    });

    it('should set verbose mode to false', () => {
      setVerbose(false);
      expect(isVerboseMode()).toBe(false);
    });
  });

  describe('isVerboseMode', () => {
    it('should return false by default', () => {
      expect(isVerboseMode()).toBe(false);
    });

    it('should return true after setting verbose to true', () => {
      setVerbose(true);
      expect(isVerboseMode()).toBe(true);
    });

    it('should return false after setting verbose to false', () => {
      setVerbose(true);
      setVerbose(false);
      expect(isVerboseMode()).toBe(false);
    });
  });

  describe('verboseLog', () => {
    it('should log when verbose mode is enabled', () => {
      setVerbose(true);
      const consoleSpy = jest.spyOn(console, 'log');

      verboseLog('test message');

      expect(consoleSpy).toHaveBeenCalledWith('test message');
    });

    it('should not log when verbose mode is disabled', () => {
      setVerbose(false);
      const consoleSpy = jest.spyOn(console, 'log');

      verboseLog('test message');

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should log multiple arguments when verbose mode is enabled', () => {
      setVerbose(true);
      const consoleSpy = jest.spyOn(console, 'log');

      verboseLog('message', 123, { key: 'value' });

      expect(consoleSpy).toHaveBeenCalledWith('message', 123, { key: 'value' });
    });
  });

  describe('verboseWarn', () => {
    it('should warn when verbose mode is enabled', () => {
      setVerbose(true);
      const consoleSpy = jest.spyOn(console, 'warn');

      verboseWarn('warning message');

      expect(consoleSpy).toHaveBeenCalledWith('warning message');
    });

    it('should not warn when verbose mode is disabled', () => {
      setVerbose(false);
      const consoleSpy = jest.spyOn(console, 'warn');

      verboseWarn('warning message');

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('errorLog', () => {
    it('should always log errors regardless of verbose mode', () => {
      setVerbose(false);
      const consoleSpy = jest.spyOn(console, 'error');

      errorLog('error message');

      expect(consoleSpy).toHaveBeenCalledWith('ERROR: error message');
    });

    it('should log error with details when verbose mode is enabled', () => {
      setVerbose(true);
      const consoleSpy = jest.spyOn(console, 'error');
      const details = { code: 500, reason: 'Internal error' };

      errorLog('error message', details);

      expect(consoleSpy).toHaveBeenCalledWith('ERROR: error message', details);
    });

    it('should log error without details when verbose mode is disabled', () => {
      setVerbose(false);
      const consoleSpy = jest.spyOn(console, 'error');
      const details = { code: 500, reason: 'Internal error' };

      errorLog('error message', details);

      expect(consoleSpy).toHaveBeenCalledWith('ERROR: error message');
    });
  });

  describe('Aliases', () => {
    describe('logVerbose', () => {
      it('should be an alias for verboseLog', () => {
        expect(logVerbose).toBe(verboseLog);
      });

      it('should work the same as verboseLog', () => {
        setVerbose(true);
        const consoleSpy = jest.spyOn(console, 'log');

        logVerbose('test message');

        expect(consoleSpy).toHaveBeenCalledWith('test message');
      });
    });

    describe('logError', () => {
      it('should be an alias for errorLog', () => {
        expect(logError).toBe(errorLog);
      });

      it('should work the same as errorLog', () => {
        const consoleSpy = jest.spyOn(console, 'error');

        logError('error message');

        expect(consoleSpy).toHaveBeenCalledWith('ERROR: error message');
      });
    });
  });
});
