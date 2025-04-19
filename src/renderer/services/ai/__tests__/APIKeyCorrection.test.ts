import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PerplexityService } from '../PerplexityService';
import { OpenAIService } from '../OpenAIService';
import { automationTasksExample } from '../../../../shared/presets_library/AIEnrichmentBlock_example';

/**
 * This test demonstrates proper API key handling and provides a debugging/verification
 * utility to help resolve issues with API key storage and retrieval.
 */

// Mock the electronAPI interface for secure storage
const mockSecureStorage = {
  getApiKey: vi.fn(),
  hasApiKey: vi.fn(),
  setApiKey: vi.fn(),
  removeApiKey: vi.fn()
};

const mockElectronAPI = {
  secureStorage: mockSecureStorage,
  app: {
    getPath: vi.fn()
  }
};

// Add the mock to the window object
vi.stubGlobal('electronAPI', mockElectronAPI);

// If you don't want to mock, you can use these functions to test with real storage
// BE CAUTIOUS: This will interact with your actual secure storage
const useRealStorage = true;

describe('API Key Storage and Retrieval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up default mock responses
    mockSecureStorage.hasApiKey.mockResolvedValue(false);
    mockSecureStorage.getApiKey.mockResolvedValue(null);
    mockSecureStorage.setApiKey.mockImplementation((providerId, apiKey) => {
      console.log(`Mock storing API key for ${providerId}`);
      return Promise.resolve(true);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * This test verifies that keys are stored with the correct provider ID format
   */
  it('should store and retrieve API keys with consistent provider IDs', async () => {
    // We'll test with both Perplexity and OpenAI services
    const perplexityService = new PerplexityService();
    const openAIService = new OpenAIService();
    
    // Check provider IDs being used
    await perplexityService.isConfigured();
    await openAIService.isConfigured();
    
    // Extract what provider IDs were used in the hasApiKey calls
    const perplexityId = mockSecureStorage.hasApiKey.mock.calls[0][0];
    const openAIId = mockSecureStorage.hasApiKey.mock.calls[1][0];
    
    console.log('Perplexity provider ID used:', perplexityId);
    console.log('OpenAI provider ID used:', openAIId);
    
    // Now try setting keys with these IDs
    await window.electronAPI.secureStorage.setApiKey(perplexityId, 'pplx-test-key');
    await window.electronAPI.secureStorage.setApiKey(openAIId, 'sk-test-key');
    
    // Check what IDs were used for setting
    expect(mockSecureStorage.setApiKey).toHaveBeenCalledWith(perplexityId, 'pplx-test-key');
    expect(mockSecureStorage.setApiKey).toHaveBeenCalledWith(openAIId, 'sk-test-key');
    
    // Verify that the provider IDs are consistent and not using timestamps
    expect(perplexityId).not.toContain('.');
    expect(openAIId).not.toContain('.');
    expect(perplexityId).toContain('perplexity');
    expect(openAIId).toContain('openai');
  });

  /**
   * This test diagnoses the actual key storage in your app
   */
  it('should debug existing API key issues', async () => {
    if (useRealStorage) {
      console.log('Running diagnostic with real storage API');
      const realWindow = window;
      
      // We need to find the actual keys stored
      try {
        // Check for the most recently added key from logs
        const timestampId = 'apiKeys.1744668618479';
        console.log(`Checking for specific timestamp key: ${timestampId}`);
        const hasTimestampKey = await realWindow.electronAPI.secureStorage.hasApiKey(timestampId);
        console.log(`Key exists with timestamp ID "${timestampId}": ${hasTimestampKey}`);
        
        if (hasTimestampKey) {
          const key = await realWindow.electronAPI.secureStorage.getApiKey(timestampId);
          console.log(`Found key with timestamp: ${key ? key.substring(0, 10) + '...' : 'null'}`);
        }
        
        // Try to search for all possible keys with apiKeys. prefix
        // Since we might not know the exact timestamp, try to find any key that follows the pattern
        console.log('\nAttempting to search for timestamp-based keys:');
        
        // Try the most recent keys first (since you just added one)
        const currentTimestamp = Date.now();
        console.log('Current timestamp:', currentTimestamp);
        
        // Try a range of possible timestamps around the current time
        // We'll try timestamps going back 24 hours in 30-min increments
        const ONE_HOUR = 60 * 60 * 1000;
        let foundAnyKey = false;
        
        for (let i = 0; i < 48; i++) {
          const timestamp = currentTimestamp - (i * 30 * 60 * 1000); // 30 min decrements
          const testId = `apiKeys.${timestamp}`;
          const hasKey = await realWindow.electronAPI.secureStorage.hasApiKey(testId);
          
          if (hasKey) {
            foundAnyKey = true;
            console.log(`Found API key with timestamp ID: ${testId}`);
            const key = await realWindow.electronAPI.secureStorage.getApiKey(testId);
            console.log(`Key value: ${key ? key.substring(0, 10) + '...' : 'null'}`);
            
            // Remember this key for potential repair
            timestampIds.push(testId);
          }
        }
        
        if (!foundAnyKey) {
          console.log('No timestamp-based keys found in the search range');
        }
        
        // Also check standard key locations
        console.log('\nChecking standard key locations:');
        const standardIds = [
          'perplexity',
          'apiKeys.perplexity',
          'openai',
          'apiKeys.openai',
          'myOpenAI',
          'apiKeys.myOpenAI'
        ];
        
        for (const id of standardIds) {
          const hasKey = await realWindow.electronAPI.secureStorage.hasApiKey(id);
          console.log(`Key exists at "${id}": ${hasKey}`);
          
          if (hasKey) {
            const key = await realWindow.electronAPI.secureStorage.getApiKey(id);
            console.log(`Key value: ${key ? key.substring(0, 10) + '...' : 'null'}`);
          }
        }
        
      } catch (error) {
        console.error('Error accessing secure storage:', error);
      }
    } else {
      console.log('Set useRealStorage = true to run actual storage diagnostics');
    }
  });

  // Store found timestamp IDs from the debug test
  const timestampIds: string[] = [];

  /**
   * This test utility allows fixing keys if they were stored with the wrong format
   */
  it('API key storage repair utility', async () => {
    if (useRealStorage) {
      console.log('Running repair utility with real storage API');
      const realWindow = window;
      
      try {
        // Use the timestamp keys found in the debug test or try specific timestamps
        if (timestampIds.length === 0) {
          console.log('No timestamp keys were found in the debug test');
          
          // Check specific known timestamp from logs
          const timestampId = 'apiKeys.1744668618479';
          const hasTimestampKey = await realWindow.electronAPI.secureStorage.hasApiKey(timestampId);
          
          if (hasTimestampKey) {
            timestampIds.push(timestampId);
          } else {
            console.log(`No key found with timestamp ID: ${timestampId}`);
            
            // If we didn't find any keys yet, try to debug the storage format
            console.log('\nAttempting to debug storage format:');
            
            // Try to save a test key with a known format
            const testKey = 'test-api-key-' + Date.now();
            await realWindow.electronAPI.secureStorage.setApiKey('perplexity', testKey);
            console.log('Saved test key with ID: perplexity');
            
            // Now check if it was saved correctly
            const hasTestKey = await realWindow.electronAPI.secureStorage.hasApiKey('perplexity');
            console.log('Test key with ID "perplexity" exists:', hasTestKey);
            
            if (hasTestKey) {
              const retrievedKey = await realWindow.electronAPI.secureStorage.getApiKey('perplexity');
              console.log('Retrieved test key:', retrievedKey === testKey ? 'MATCHES' : 'DOES NOT MATCH');
              
              // Clean up test key
              await realWindow.electronAPI.secureStorage.removeApiKey('perplexity');
              console.log('Cleaned up test key');
            }
          }
        }
        
        console.log('\nRepairing API keys:');
        // Copy any found timestamp-based keys to the correct provider IDs
        for (const timestampId of timestampIds) {
          // Get the key stored with the timestamp
          const apiKey = await realWindow.electronAPI.secureStorage.getApiKey(timestampId);
          console.log(`Found API key with timestamp ${timestampId}: ${apiKey ? apiKey.substring(0, 10) + '...' : 'null'}`);
          
          if (apiKey) {
            let providerId = '';
            
            // Determine which provider this key belongs to based on the key format
            if (apiKey.startsWith('pplx-')) {
              providerId = 'perplexity';
              console.log('Detected Perplexity API key based on format');
            } else if (apiKey.startsWith('sk-')) {
              providerId = 'openai';
              console.log('Detected OpenAI API key based on format');
            } else {
              console.log('Unknown API key format, cannot determine provider ID');
              continue;
            }
            
            // Store with correct provider ID
            console.log(`Copying key from ${timestampId} to ${providerId}`);
            const success = await realWindow.electronAPI.secureStorage.setApiKey(providerId, apiKey);
            console.log(`Key copied to ${providerId}:`, success);
            
            // Check if it worked
            const hasCorrectKey = await realWindow.electronAPI.secureStorage.hasApiKey(providerId);
            console.log(`Key now exists at ${providerId}:`, hasCorrectKey);
            
            if (hasCorrectKey) {
              console.log('SUCCESSFULLY FIXED API KEY - Please restart the application to see it in the UI');
            }
          }
        }
      } catch (error) {
        console.error('Error repairing API keys:', error);
      }
    } else {
      console.log('Set useRealStorage = true to run the repair utility');
    }
  });
});
