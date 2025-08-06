import { setVerbose, isVerboseMode, verboseLog, verboseWarn, errorLog } from '../../utils/logger';

describe('logger utility', () => {
  let originalConsoleLog: typeof console.log;
  let originalConsoleWarn: typeof console.warn;
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    // Store original console methods
    originalConsoleLog = console.log;
    originalConsoleWarn = console.warn;
    originalConsoleError = console.error;

    // Mock console methods
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();

    // Reset verbose mode
    setVerbose(false);
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  describe('setVerbose and isVerboseMode', () => {
    it('should set and get verbose mode correctly', () => {
      expect(isVerboseMode()).toBe(false);

      setVerbose(true);
      expect(isVerboseMode()).toBe(true);

      setVerbose(false);
      expect(isVerboseMode()).toBe(false);
    });
  });

  describe('verboseLog', () => {
    it('should not log when verbose mode is disabled', () => {
      setVerbose(false);
      verboseLog('test message', { data: 'test' });
      
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should log when verbose mode is enabled', () => {
      setVerbose(true);
      verboseLog('test message', { data: 'test' });
      
      expect(console.log).toHaveBeenCalledWith('test message', { data: 'test' });
    });

    it('should pass multiple arguments to console.log', () => {
      setVerbose(true);
      verboseLog('message1', 'message2', { data: 'test' }, 123);
      
      expect(console.log).toHaveBeenCalledWith('message1', 'message2', { data: 'test' }, 123);
    });
  });

  describe('verboseWarn', () => {
    it('should not warn when verbose mode is disabled', () => {
      setVerbose(false);
      verboseWarn('warning message', { warning: 'test' });
      
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should warn when verbose mode is enabled', () => {
      setVerbose(true);
      verboseWarn('warning message', { warning: 'test' });
      
      expect(console.warn).toHaveBeenCalledWith('warning message', { warning: 'test' });
    });

    it('should pass multiple arguments to console.warn', () => {
      setVerbose(true);
      verboseWarn('warn1', 'warn2', { data: 'test' });
      
      expect(console.warn).toHaveBeenCalledWith('warn1', 'warn2', { data: 'test' });
    });
  });

  describe('errorLog', () => {
    it('should always log errors regardless of verbose mode', () => {
      setVerbose(false);
      errorLog('error message');
      
      expect(console.error).toHaveBeenCalledWith('ERROR: error message');
    });

    it('should log errors with basic format when verbose mode is disabled', () => {
      setVerbose(false);
      errorLog('error message', { details: 'test' });
      
      expect(console.error).toHaveBeenCalledWith('ERROR: error message');
    });

    it('should log errors with details when verbose mode is enabled', () => {
      setVerbose(true);
      errorLog('error message', { details: 'test' });
      
      expect(console.error).toHaveBeenCalledWith('ERROR: error message', { details: 'test' });
    });

    it('should log errors without details in verbose mode when no details provided', () => {
      setVerbose(true);
      errorLog('error message');
      
      expect(console.error).toHaveBeenCalledWith('ERROR: error message');
    });
  });
});