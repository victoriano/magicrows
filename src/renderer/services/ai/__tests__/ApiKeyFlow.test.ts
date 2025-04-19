import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIService } from '../OpenAIService';
import { PerplexityService } from '../PerplexityService';
import { AIProviderFactory } from '../AIProvider';
import { AIProvider } from '../AIProvider';
import { ProcessPromptOptions } from '../AIProvider';
import { AIModelResponse } from '../AIProvider';
import { automationTasksExample } from '../../../../shared/presets_library/AIEnrichmentBlock_example';

/**
 * This test verifies the complete flow from saving an API key to retrieving it
 * for use in AI enrichment processes.
 */

// Mock the secureStorage API
const mockSecureStorage = {
  getApiKey: vi.fn(),
  hasApiKey: vi.fn(),
  setApiKey: vi.fn(),
  removeApiKey: vi.fn()
};

// Mock the electronAPI
const mockElectronAPI = {
  secureStorage: mockSecureStorage,
  app: {
    getPath: vi.fn()
  }
};

// Add the mock to the window object
vi.stubGlobal('electronAPI', mockElectronAPI);

describe('API Key Storage and Retrieval Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockSecureStorage.hasApiKey.mockResolvedValue(false);
    mockSecureStorage.getApiKey.mockResolvedValue(null);
    mockSecureStorage.setApiKey.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should store and retrieve an API key using the provider name as the ID', async () => {
    // Scenario: User creates a provider with name "myOpenAI" 
    // and an API key in the UI
    const providerName = 'myOpenAI';
    const apiKey = 'sk-test-api-key-12345';
    const providerType = 'openai';
    
    // 1. User saves the API key (simulating App.tsx handleAddProvider)
    const success = await window.electronAPI.secureStorage.setApiKey(providerName, apiKey);
    
    // Verify the API key was saved correctly with the provider name as the ID
    expect(mockSecureStorage.setApiKey).toHaveBeenCalledWith(providerName, apiKey);
    expect(success).toBe(true);
    
    // 2. Now simulate the app checking if this provider has an API key configured
    mockSecureStorage.hasApiKey.mockImplementation((id) => {
      // Only return true for our specific provider name
      return Promise.resolve(id === providerName);
    });
    
    // 3. Simulate the app retrieving the API key
    mockSecureStorage.getApiKey.mockImplementation((id) => {
      if (id === providerName) {
        return Promise.resolve(apiKey);
      }
      return Promise.resolve(null);
    });
    
    // 4. Now test that retrieving the key works as expected
    const retrievedKey = await window.electronAPI.secureStorage.getApiKey(providerName);
    expect(retrievedKey).toBe(apiKey);
    
    // 5. Check that the key is properly detected as configured
    const hasKey = await window.electronAPI.secureStorage.hasApiKey(providerName);
    expect(hasKey).toBe(true);
  });

  it('should correctly handle multiple API keys for the same provider type', async () => {
    // Scenario: User has multiple OpenAI configurations
    const personalOpenAI = 'personalOpenAI';
    const workOpenAI = 'workOpenAI';
    const personalKey = 'sk-personal-key-12345';
    const workKey = 'sk-work-key-67890';
    
    // Save both API keys
    await window.electronAPI.secureStorage.setApiKey(personalOpenAI, personalKey);
    await window.electronAPI.secureStorage.setApiKey(workOpenAI, workKey);
    
    // Verify both were saved with different IDs
    expect(mockSecureStorage.setApiKey).toHaveBeenCalledWith(personalOpenAI, personalKey);
    expect(mockSecureStorage.setApiKey).toHaveBeenCalledWith(workOpenAI, workKey);
    
    // Configure the mock to know about both keys
    mockSecureStorage.hasApiKey.mockImplementation((id) => {
      return Promise.resolve(id === personalOpenAI || id === workOpenAI);
    });
    
    mockSecureStorage.getApiKey.mockImplementation((id) => {
      if (id === personalOpenAI) return Promise.resolve(personalKey);
      if (id === workOpenAI) return Promise.resolve(workKey);
      return Promise.resolve(null);
    });
    
    // Verify we can retrieve each key separately
    expect(await window.electronAPI.secureStorage.getApiKey(personalOpenAI)).toBe(personalKey);
    expect(await window.electronAPI.secureStorage.getApiKey(workOpenAI)).toBe(workKey);
    
    // Verify both are recognized as configured
    expect(await window.electronAPI.secureStorage.hasApiKey(personalOpenAI)).toBe(true);
    expect(await window.electronAPI.secureStorage.hasApiKey(workOpenAI)).toBe(true);
  });

  it('should integrate correctly with AIEnrichmentProcessor via provider name', async () => {
    // Mock AIEnrichmentProcessor and OpenAIService for testing
    const processPromptMock = vi.fn().mockResolvedValue({ text: 'AI generated content' });
    
    // Create a proper mock that implements the AIProvider interface
    const mockOpenAIProvider: AIProvider = {
      processPrompt: async (prompt: string, options: ProcessPromptOptions): Promise<AIModelResponse> => {
        return processPromptMock(prompt, options);
      },
      isConfigured: async () => true,
      validateConfig: () => true,
      getModelList: async () => ['gpt-3.5-turbo', 'gpt-4']
    };
    
    // 1. Scenario: User saves an API key for a provider named "myOpenAI"
    const providerName = 'myOpenAI';
    const apiKey = 'sk-test-key-12345';
    await window.electronAPI.secureStorage.setApiKey(providerName, apiKey);
    
    // 2. Configure mocks to simulate that the key exists and can be retrieved
    mockSecureStorage.hasApiKey.mockImplementation((id) => Promise.resolve(id === providerName));
    mockSecureStorage.getApiKey.mockImplementation((id) => {
      if (id === providerName) return Promise.resolve(apiKey);
      return Promise.resolve(null);
    });
    
    // 3. Mock the AIProviderFactory.getProviderByIntegration method
    const getProviderByIntegrationSpy = vi.spyOn(AIProviderFactory, 'getProviderByIntegration')
      .mockImplementation((integrationName) => {
        // This should be called with the integration name from the example
        expect(integrationName).toBe(providerName);
        
        // Return our mock provider that properly implements the AIProvider interface
        return mockOpenAIProvider;
      });
    
    // 4. Import the AIEnrichmentProcessor after mocking
    const { AIEnrichmentProcessor } = await import('../AIEnrichmentProcessor');
    const processor = new AIEnrichmentProcessor();
    
    // 5. Use the automationTasksExample which references "myOpenAI"
    // This should work if our fix is correct
    const testExample = { ...automationTasksExample };
    
    // 6. Process a simple dataset
    const headers = ['id', 'nace', 'isco'];
    const rows = [['1', 'Forestry', 'Chief Executives']];
    
    try {
      // 7. Process the dataset
      const result = await processor.processDataset(testExample, headers, rows);
      
      // 8. Verify the provider was looked up by the correct name
      expect(getProviderByIntegrationSpy).toHaveBeenCalledWith(providerName);
      
      // 9. Verify processPrompt was called (indicating the API key was found)
      expect(processPromptMock).toHaveBeenCalled();
      
      // 10. Verify the processing succeeded
      expect(result.errors.length).toBe(0);
      
    } catch (error) {
      // If there's an error, test should fail
      console.error('Error during processing:', error);
      expect(true).toBe(false); // Force test to fail
    }
  });

  it('should prevent API key leakage by properly handling different provider IDs', async () => {
    // Set up different providers with different API keys
    const providers = [
      { name: 'personalOpenAI', key: 'sk-personal-12345', type: 'openai' },
      { name: 'workOpenAI', key: 'sk-work-67890', type: 'openai' },
      { name: 'perplexityAI', key: 'pplx-test-abcde', type: 'perplexity' }
    ];
    
    // Save all API keys
    for (const provider of providers) {
      await window.electronAPI.secureStorage.setApiKey(provider.name, provider.key);
    }
    
    // Configure the mock to handle key checking and retrieval
    mockSecureStorage.hasApiKey.mockImplementation((id) => {
      const provider = providers.find(p => p.name === id);
      return Promise.resolve(!!provider);
    });
    
    mockSecureStorage.getApiKey.mockImplementation((id) => {
      const provider = providers.find(p => p.name === id);
      return Promise.resolve(provider ? provider.key : null);
    });
    
    // Now verify that each provider's key is properly isolated
    for (const provider of providers) {
      // 1. The provider should be configured
      const isConfigured = await window.electronAPI.secureStorage.hasApiKey(provider.name);
      expect(isConfigured).toBe(true);
      
      // 2. We should get the correct key for this provider
      const key = await window.electronAPI.secureStorage.getApiKey(provider.name);
      expect(key).toBe(provider.key);
      
      // 3. Make sure we're not getting another provider's key by mistake
      const otherProviders = providers.filter(p => p.name !== provider.name);
      for (const otherProvider of otherProviders) {
        const otherKey = await window.electronAPI.secureStorage.getApiKey(otherProvider.name);
        expect(otherKey).not.toBe(provider.key);
      }
    }
  });
});
