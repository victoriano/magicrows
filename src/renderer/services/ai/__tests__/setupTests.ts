/**
 * Test setup for AI services
 */
import { vi, afterAll, afterEach } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Enhanced environment variable loading and debugging
const envPath = path.resolve(process.cwd(), '.env');
console.log(`Loading .env file from: ${envPath}`);
console.log(`File exists: ${fs.existsSync(envPath)}`);

// Read the raw file content for debugging (masking sensitive data)
try {
  const rawEnvContent = fs.readFileSync(envPath, 'utf8');
  const maskedContent = rawEnvContent
    .replace(/(OPENAI_API_KEY=)([^\n]+)/, '$1sk-****')
    .replace(/(PERPLEXITY_API_KEY=)([^\n]+)/, '$1pplx-****');
  console.log('Raw .env file structure:');
  console.log(maskedContent);
} catch (error) {
  console.error('Error reading .env file:', error);
}

// Load environment variables with proper error reporting
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('Error loading .env file:', result.error);
} else {
  console.log('Dotenv config result: Config loaded successfully');
}

// Log available environment variables (without revealing values)
const availableEnvVars = Object.keys(process.env)
  .filter(key => key.includes('API_KEY') || key.includes('TEST'))
  .join(', ');
console.log('Environment variables available:', availableEnvVars);

// Check the first few characters of each key to verify format
const openaiKey = process.env.OPENAI_API_KEY || '';
const perplexityKey = process.env.PERPLEXITY_API_KEY || '';
console.log(`OpenAI API key format check: ${openaiKey.substring(0, 10)}...`);
console.log(`OpenAI API key length: ${openaiKey.length} characters`);
console.log(`Perplexity API key format check: ${perplexityKey.substring(0, 10)}...`);
console.log(`Perplexity API key length: ${perplexityKey.length} characters`);

// Determine if we should use real API keys or mocks
const useRealApi = process.env.USE_REAL_API_IN_TESTS === 'true';
console.log('Test mode:', useRealApi ? 'Using REAL API KEYS' : 'Using MOCK API');

// Mock the electron API for tests
vi.stubGlobal('window', {
  electronAPI: {
    secureStorage: {
      getApiKey: vi.fn().mockImplementation(async (providerId: string) => {
        if (useRealApi) {
          if (providerId === 'openai') {
            const key = process.env.OPENAI_API_KEY;
            if (key) {
              // Log detailed key information for debugging
              console.log('Getting OpenAI API key:');
              console.log(`- Prefix: ${key.substring(0, 10)}...`);
              console.log(`- Length: ${key.length} characters`);
              console.log(`- Contains whitespace: ${/\s/.test(key)}`);
              console.log(`- Format appears to be: ${key.startsWith('sk-proj-') ? 'Project key' : key.startsWith('sk-') ? 'Standard key' : 'Unknown format'}`);
              
              return key;
            } else {
              console.log('WARNING: OpenAI API key is not configured');
              return null;
            }
          } else if (providerId === 'perplexity') {
            const key = process.env.PERPLEXITY_API_KEY;
            if (key) {
              // Log detailed key information for debugging
              console.log('Getting Perplexity API key:');
              console.log(`- Prefix: ${key.substring(0, 10)}...`);
              console.log(`- Length: ${key.length} characters`);
              console.log(`- Contains whitespace: ${/\s/.test(key)}`);
              console.log(`- Format appears to be: ${key.startsWith('pplx-') ? 'Standard key' : 'Unknown format'}`);
              
              return key;
            } else {
              console.log('WARNING: Perplexity API key is not configured');
              return null;
            }
          }
        } else {
          // Mock keys for testing
          if (providerId === 'openai') return 'sk-mock-openai-key';
          if (providerId === 'perplexity') return 'pplx-mock-perplexity-key';
        }
        return null;
      }),
      
      hasApiKey: vi.fn().mockImplementation(async (providerId: string) => {
        if (useRealApi) {
          if (providerId === 'openai') {
            const hasKey = !!process.env.OPENAI_API_KEY;
            console.log('OpenAI API Key:', hasKey ? 'Configured' : 'Not configured');
            return hasKey;
          } else if (providerId === 'perplexity') {
            const hasKey = !!process.env.PERPLEXITY_API_KEY;
            console.log('Perplexity API Key:', hasKey ? 'Configured' : 'Not configured');
            return hasKey;
          }
        } else {
          // Always return true for mocked tests
          return true;
        }
        return false;
      })
    }
  }
});

// Global fetch mock for AI APIs
const originalFetch = global.fetch;

// Conditionally mock fetch based on environment
if (!useRealApi) {
  global.fetch = vi.fn().mockImplementation(async (url: string, options: any) => {
    // Mock OpenAI API responses
    if (url.includes('openai.com')) {
      const body = JSON.parse(options.body);
      const model = body.model;
      const prompt = body.messages[1].content;
      
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'This is a test response'
              }
            }
          ]
        })
      });
    }
    
    // Mock Perplexity API responses
    if (url.includes('perplexity.ai')) {
      const body = JSON.parse(options.body);
      const model = body.model;
      const prompt = body.messages[1].content;
      
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'This is a test response from Perplexity'
              }
            }
          ]
        })
      });
    }
    
    // Pass through other requests
    return originalFetch(url, options);
  });
} else {
  // In real API mode, we need special handling
  // Wrap the original fetch to log API requests
  const originalFetchWrapped = global.fetch;
  global.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    // Get the URL string
    const url = input instanceof Request ? input.url : input.toString();
    
    // Log requests to AI APIs
    if (url.includes('openai.com') || url.includes('perplexity.ai')) {
      const apiName = url.includes('openai.com') ? 'OpenAI' : 'Perplexity';
      console.log(`${apiName} API Request URL: ${url}`);
      
      if (init?.headers) {
        // Clone the headers to avoid modifying the original
        const headers = init.headers as Record<string, string>;
        const safeHeaders = { ...headers };
        
        // Mask authorization but show format
        if (safeHeaders.Authorization) {
          const authParts = safeHeaders.Authorization.split(' ');
          const authPrefix = authParts[0] || '';
          const authValue = authParts[1] || '';
          console.log(`${apiName} Authorization Header Format: ${authPrefix} ${authValue.substring(0, 10)}...`);
          safeHeaders.Authorization = `${authPrefix} ****`;
        }
        
        console.log(`${apiName} Request Headers:`, safeHeaders);
      }
      
      // Parse and log body without sensitive data
      if (init?.body) {
        try {
          const bodyObj = JSON.parse(init.body.toString());
          const safeBody = {
            ...bodyObj,
            messages: bodyObj.messages ? bodyObj.messages.map((m: any) => ({
              role: m.role,
              content: m.content.substring(0, 30) + '...' // Truncate content
            })) : []
          };
          console.log(`${apiName} Request Body:`, safeBody);
        } catch (e) {
          console.log(`${apiName} Request Body: [Could not parse]`);
        }
      }
    }
    
    // Call the original fetch
    return originalFetchWrapped(input, init);
  };
  
  console.log('Using real API calls with enhanced logging');
}

// Reset all mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Cleanup after all tests
afterAll(() => {
  if (!useRealApi) {
    global.fetch = originalFetch;
  }
});

// Export for use in tests
export { useRealApi };
