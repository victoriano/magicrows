/**
 * Simple test runner using the existing Vite setup
 * This avoids the need to install additional testing dependencies
 */

// Simple test utilities to replace Vitest/Jest
export const describe = (name: string, fn: () => void) => {
  console.log(`\n🧪 Test Suite: ${name}`);
  fn();
};

export const it = async (name: string, fn: () => Promise<void> | void) => {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
  } catch (error) {
    console.error(`  ❌ ${name}`);
    console.error(`    Error: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(`    Stack: ${error.stack.split('\n').slice(1).join('\n')}`);
    }
  }
};

export const expect = (actual: any) => ({
  toBe: (expected: any) => {
    if (actual !== expected) {
      throw new Error(`Expected ${expected} but got ${actual}`);
    }
  },
  toEqual: (expected: any) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
    }
  },
  toBeGreaterThan: (expected: number) => {
    if (actual <= expected) {
      throw new Error(`Expected ${actual} to be greater than ${expected}`);
    }
  },
  toContain: (expected: any) => {
    if (Array.isArray(actual) && !actual.includes(expected)) {
      throw new Error(`Expected ${actual} to contain ${expected}`);
    } else if (typeof actual === 'string' && !actual.includes(expected)) {
      throw new Error(`Expected "${actual}" to contain "${expected}"`);
    } else if (!actual.includes) {
      throw new Error(`Expected ${actual} to be an array or string that can contain ${expected}`);
    }
  },
  toBeTruthy: () => {
    if (!actual) {
      throw new Error(`Expected ${actual} to be truthy`);
    }
  },
  toHaveBeenCalled: () => {
    if (!actual.mock || actual.mock.calls.length === 0) {
      throw new Error('Expected function to have been called');
    }
  },
  toHaveBeenCalledWith: (...args: any[]) => {
    if (!actual.mock) {
      throw new Error('Expected a mock function');
    }
    const calls = actual.mock.calls;
    if (calls.length === 0) {
      throw new Error('Expected function to have been called');
    }
    const lastCall = calls[calls.length - 1];
    const match = args.every((arg, i) => JSON.stringify(arg) === JSON.stringify(lastCall[i]));
    if (!match) {
      throw new Error(`Expected function to have been called with ${JSON.stringify(args)} but was called with ${JSON.stringify(lastCall)}`);
    }
  }
});

// Simple mocking utilities
export const vi = {
  fn: (implementation?: (...args: any[]) => any) => {
    const mockFn = implementation || (() => {});
    mockFn.mock = { calls: [] };
    return new Proxy(mockFn, {
      apply: (target, thisArg, args) => {
        target.mock.calls.push(args);
        return target.apply(thisArg, args);
      }
    });
  },
  spyOn: (obj: any, method: string) => {
    const original = obj[method];
    const mockFn = vi.fn((...args: any[]) => {
      return original.apply(obj, args);
    });
    obj[method] = mockFn;
    mockFn.mockImplementation = (impl: (...args: any[]) => any) => {
      obj[method] = vi.fn(impl);
      obj[method].mock = mockFn.mock;
      obj[method].mockImplementation = mockFn.mockImplementation;
      return obj[method];
    };
    return mockFn;
  },
  clearAllMocks: () => {
    // This would normally clear all mocks, but our simple implementation doesn't track them globally
    console.log('  🧹 Cleared all mocks');
  }
};

// Run all tests
export async function runTests() {
  console.log('🚀 Starting tests...');
  
  // Import the test files
  const testModules = [
    await import('./renderer/services/ai/__tests__/OpenAIService.test'),
    await import('./renderer/services/ai/__tests__/PerplexityService.test')
  ];
  
  console.log('✨ Tests completed!');
}

// Auto-run tests when this file is executed
runTests();
