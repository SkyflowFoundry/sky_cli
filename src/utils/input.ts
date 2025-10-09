/**
 * Utilities for handling user input from various sources
 */

/**
 * Read input from stdin
 * @returns Promise that resolves with the stdin content as a string
 */
export const readStdin = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (chunk) => {
      data += chunk;
    });

    process.stdin.on('end', () => {
      resolve(data.trim());
    });

    process.stdin.on('error', (error) => {
      reject(error);
    });
  });
};