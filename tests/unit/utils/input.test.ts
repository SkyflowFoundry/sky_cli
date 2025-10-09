import { readStdin } from '../../../src/utils/input';
import { Readable } from 'stream';

describe('Input Utility', () => {
  describe('readStdin', () => {
    let mockStdin: Readable;

    beforeEach(() => {
      // Create a mock stdin stream
      mockStdin = new Readable({
        read() {},
      });

      // Replace process.stdin with our mock
      Object.defineProperty(process, 'stdin', {
        value: mockStdin,
        writable: true,
        configurable: true,
      });
    });

    afterEach(() => {
      // Clean up
      mockStdin.removeAllListeners();
    });

    it('should read data from stdin', async () => {
      const promise = readStdin();

      // Simulate data coming in
      mockStdin.push('test data');
      mockStdin.push(null); // Signal end of stream

      const result = await promise;
      expect(result).toBe('test data');
    });

    it('should read multiple chunks of data from stdin', async () => {
      const promise = readStdin();

      // Simulate multiple data chunks
      mockStdin.push('first chunk ');
      mockStdin.push('second chunk ');
      mockStdin.push('third chunk');
      mockStdin.push(null); // Signal end of stream

      const result = await promise;
      expect(result).toBe('first chunk second chunk third chunk');
    });

    it('should trim whitespace from result', async () => {
      const promise = readStdin();

      // Simulate data with whitespace
      mockStdin.push('  \n  test data  \n  ');
      mockStdin.push(null);

      const result = await promise;
      expect(result).toBe('test data');
    });

    it('should handle empty input', async () => {
      const promise = readStdin();

      // Simulate empty stream
      mockStdin.push(null);

      const result = await promise;
      expect(result).toBe('');
    });

    it('should handle JSON data', async () => {
      const promise = readStdin();
      const jsonData = '{"key":"value","number":123}';

      mockStdin.push(jsonData);
      mockStdin.push(null);

      const result = await promise;
      expect(result).toBe(jsonData);

      // Verify it's valid JSON
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should reject on error', async () => {
      const promise = readStdin();
      const error = new Error('Read error');

      // Simulate error
      mockStdin.emit('error', error);

      await expect(promise).rejects.toThrow('Read error');
    });

    it('should handle multi-line input', async () => {
      const promise = readStdin();

      mockStdin.push('line 1\n');
      mockStdin.push('line 2\n');
      mockStdin.push('line 3');
      mockStdin.push(null);

      const result = await promise;
      expect(result).toBe('line 1\nline 2\nline 3');
    });

    it('should set encoding to utf8', async () => {
      const setEncodingSpy = jest.spyOn(mockStdin, 'setEncoding');

      const promise = readStdin();
      mockStdin.push('test');
      mockStdin.push(null);

      await promise;

      expect(setEncodingSpy).toHaveBeenCalledWith('utf8');
    });
  });
});
