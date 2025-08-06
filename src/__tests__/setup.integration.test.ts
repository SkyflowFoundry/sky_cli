/**
 * Basic integration test to verify Jest setup and TypeScript compilation
 */

describe('Test Setup Integration', () => {
  it('should have Jest configured correctly', () => {
    expect(jest).toBeDefined();
    expect(typeof jest.fn).toBe('function');
  });

  it('should support TypeScript compilation', () => {
    interface TestInterface {
      name: string;
      value: number;
    }

    const testObj: TestInterface = {
      name: 'test',
      value: 42
    };

    expect(testObj.name).toBe('test');
    expect(testObj.value).toBe(42);
  });

  it('should have mocked console methods in setup', () => {
    // The setup.ts file should mock console methods
    expect(jest.isMockFunction(console.log)).toBe(true);
    expect(jest.isMockFunction(console.error)).toBe(true);
    expect(jest.isMockFunction(console.warn)).toBe(true);
  });

  it('should have process.exit mocked in setup', () => {
    expect(jest.isMockFunction(process.exit)).toBe(true);
  });
});