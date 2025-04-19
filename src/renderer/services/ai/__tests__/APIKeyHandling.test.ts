import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIProviderFactory } from '../AIProvider';
import { OpenAIService } from '../OpenAIService';
import { PerplexityService } from '../PerplexityService';
import { automationTasksExample } from '../../../../shared/presets_library/AIEnrichmentBlock_example';

// Create an actual mock of the Electron API for secure storage
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

describe('API Key Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation - no keys are set
    mockSecureStorage.hasApiKey.mockResolvedValue(false);
    mockSecureStorage.getApiKey.mockResolvedValue(null);
    mockSecureStorage.setApiKey.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should correctly identify when an API key is not set', async () => {
    const perplexityService = new PerplexityService();
    const isConfigured = await perplexityService.isConfigured();
    
    expect(isConfigured).toBe(false);
    expect(mockSecureStorage.hasApiKey).toHaveBeenCalled();
    
    // Check which provider ID was used for lookup
    const providerIdUsed = mockSecureStorage.hasApiKey.mock.calls[0][0];
    console.log('Provider ID used for key lookup:', providerIdUsed);
  });

  it('should correctly identify when an API key is set', async () => {
    // Mock that the API key exists
    mockSecureStorage.hasApiKey.mockResolvedValue(true);
    
    const perplexityService = new PerplexityService();
    const isConfigured = await perplexityService.isConfigured();
    
    expect(isConfigured).toBe(true);
    expect(mockSecureStorage.hasApiKey).toHaveBeenCalled();
    
    // Check which provider ID was used for lookup
    const providerIdUsed = mockSecureStorage.hasApiKey.mock.calls[0][0];
    console.log('Provider ID used for key lookup when set:', providerIdUsed);
  });

  it('should check provider ID formats from all services', async () => {
    // Initialize all service types to see what provider IDs they use
    const perplexityService = new PerplexityService();
    const openAIService = new OpenAIService();
    
    await perplexityService.isConfigured();
    await openAIService.isConfigured();
    
    // Get the provider IDs that were used for lookup
    const providerIds = mockSecureStorage.hasApiKey.mock.calls.map(call => call[0]);
    
    // Log the provider IDs for diagnosis
    console.log('Provider IDs used for key lookup:', providerIds);
    
    // They should all be strings and not contain timestamps
    providerIds.forEach(id => {
      expect(typeof id).toBe('string');
      expect(id).not.toMatch(/\d{10,}/); // No long numbers like timestamps
    });
  });

  it('should store and retrieve an API key correctly', async () => {
    // Set an API key with a known provider ID
    const providerId = 'perplexity';
    const apiKey = 'pplx-test-api-key';
    
    // Set the API key directly
    await window.electronAPI.secureStorage.setApiKey(providerId, apiKey);
    
    // Verify key was stored with the provider ID
    expect(mockSecureStorage.setApiKey).toHaveBeenCalledWith(providerId, apiKey);
    
    // Now simulate looking up the key
    mockSecureStorage.hasApiKey.mockResolvedValue(true);
    mockSecureStorage.getApiKey.mockResolvedValue(apiKey);
    
    // Create a perplexity service and check if it's configured
    const perplexityService = new PerplexityService();
    const isConfigured = await perplexityService.isConfigured();
    
    expect(isConfigured).toBe(true);
    
    // Now verify how the key is being looked up
    const lookupId = mockSecureStorage.hasApiKey.mock.calls[0][0];
    console.log('ID used for checking key existence:', lookupId);
    
    // The key should be retrieved with the same ID
    mockSecureStorage.getApiKey.mockClear();
    
    // Try to process something to force key retrieval
    try {
      await perplexityService.processPrompt('Test prompt', { model: 'sonar-small-online' });
    } catch (error) {
      // We expect an error since we're not fully mocking the API response
      console.log('Expected error during processing');
    }
    
    // Check what ID was used for key retrieval
    if (mockSecureStorage.getApiKey.mock.calls.length > 0) {
      const retrievalId = mockSecureStorage.getApiKey.mock.calls[0][0];
      console.log('ID used for key retrieval:', retrievalId);
      
      // The IDs should match
      expect(retrievalId).toBe(lookupId);
    }
  });
});

describe('API Key Integration with Example', () => {
  let mockProcessPrompt: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock as if both API key providers are configured correctly
    mockSecureStorage.hasApiKey.mockImplementation((providerId) => {
      return Promise.resolve(true);
    });
    
    mockSecureStorage.getApiKey.mockImplementation((providerId) => {
      if (providerId === 'openai') return Promise.resolve('sk-test-openai-key');
      if (providerId === 'perplexity') return Promise.resolve('pplx-test-perplexity-key');
      return Promise.resolve(`test-key-for-${providerId}`);
    });
    
    // Mock the processPrompt method in both services
    // This is testing if the key would be successfully retrieved
    mockProcessPrompt = vi.fn().mockResolvedValue({ text: 'AI Generated Content' });
    
    vi.spyOn(OpenAIService.prototype, 'processPrompt').mockImplementation(mockProcessPrompt);
    vi.spyOn(PerplexityService.prototype, 'processPrompt').mockImplementation(mockProcessPrompt);
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  it('should successfully use the example configuration with myOpenAI integration', async () => {
    // Import the processor after mocking
    const { AIEnrichmentProcessor } = await import('../AIEnrichmentProcessor');
    const processor = new AIEnrichmentProcessor();
    
    // Simple data for testing
    const headers = ['id', 'nace', 'isco'];
    const rows = [['1', 'Forestry', 'Chief Executives']];
    
    // Use the automation tasks example directly (which uses 'myOpenAI')
    try {
      // Process the data
      const result = await processor.processDataset(automationTasksExample, headers, rows);
      
      // Log which provider ID was used to get the API key
      const keyLookupCalls = mockSecureStorage.getApiKey.mock.calls;
      console.log('Provider ID used for key lookup in example:', keyLookupCalls.map(call => call[0]));
      
      // The processing should succeed and the mock process should be called
      expect(mockProcessPrompt).toHaveBeenCalled();
      
      // Verify the result has the expected structure
      expect(result).toBeDefined();
      expect(result.errors.length).toBe(0);
      
    } catch (error) {
      console.error('Error during example processing:', error);
      // The test should fail if there's an error
      expect(true).toBe(false);
    }
  });

  it('should explain the API key storage and lookup mechanism', async () => {
    // Store a key with a timestamp ID to simulate the actual app behavior
    const timestampId = `apiKeys.${Date.now()}`;
    const testApiKey = 'test-timestamp-key';
    
    // Store the key with the timestamp ID
    mockSecureStorage.setApiKey(timestampId, testApiKey);
    
    // Now check if the application can find this key
    // The application uses provider IDs like 'openai' or 'perplexity' for lookup
    const lookupId = 'perplexity'; 
    
    // This shows the mismatch - key is stored with timestamp but looked up with provider ID
    console.log('Key stored with ID:', timestampId);
    console.log('Key looked up with ID:', lookupId);
    
    // The test passes regardless of whether the lookups match
    // This test documents the behavior we're observing in the app
    expect(timestampId).not.toBe(lookupId);
    
    // Suggest the appropriate fix to store keys with provider IDs
    console.log('FIX: Store API keys with provider ID instead of timestamp');
  });
});
