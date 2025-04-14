import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIProviderFactory } from '../AIProvider';
import { OpenAIService } from '../OpenAIService';
import { PerplexityService } from '../PerplexityService';

// Mock the Electron API for secure storage
const mockElectronAPI = {
  secureStorage: {
    getApiKey: vi.fn(),
    hasApiKey: vi.fn(),
    setApiKey: vi.fn(),
    removeApiKey: vi.fn()
  },
  app: {
    getPath: vi.fn()
  }
};

// Add the mock to the window object
vi.stubGlobal('electronAPI', mockElectronAPI);

// Mock the implementation-specific providers
vi.mock('../OpenAIService', () => ({
  OpenAIService: vi.fn().mockImplementation(() => ({
    processPrompt: vi.fn().mockResolvedValue({ text: 'OpenAI response' }),
    isConfigured: vi.fn().mockResolvedValue(true),
    getProviderId: vi.fn().mockReturnValue('openai')
  }))
}));

vi.mock('../PerplexityService', () => ({
  PerplexityService: vi.fn().mockImplementation(() => ({
    processPrompt: vi.fn().mockResolvedValue({ text: 'Perplexity response' }),
    isConfigured: vi.fn().mockResolvedValue(true),
    getProviderId: vi.fn().mockReturnValue('perplexity')
  }))
}));

describe('AIProviderFactory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockElectronAPI.secureStorage.hasApiKey.mockResolvedValue(true);
    mockElectronAPI.secureStorage.getApiKey.mockResolvedValue('test-api-key');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return null for unknown integration names', async () => {
    const provider = await AIProviderFactory.getProviderByIntegration('unknown-integration');
    expect(provider).toBeNull();
  });

  it('should return OpenAI provider for openai integration', async () => {
    const provider = await AIProviderFactory.getProviderByIntegration('openai');
    expect(provider).toBeDefined();
    expect(provider).toBeInstanceOf(OpenAIService);
  });

  it('should return OpenAI provider for myOpenAI integration', async () => {
    const provider = await AIProviderFactory.getProviderByIntegration('myOpenAI');
    expect(provider).toBeDefined();
    expect(provider).toBeInstanceOf(OpenAIService);
  });

  it('should return Perplexity provider for perplexity integration', async () => {
    const provider = await AIProviderFactory.getProviderByIntegration('perplexity');
    expect(provider).toBeDefined();
    expect(provider).toBeInstanceOf(PerplexityService);
  });

  it('should cache provider instances', async () => {
    // Get the same provider twice
    const provider1 = await AIProviderFactory.getProviderByIntegration('openai');
    const provider2 = await AIProviderFactory.getProviderByIntegration('openai');
    
    // Both calls should return the same instance
    expect(provider1).toBe(provider2);
  });

  it('should throw an error when processing with a non-existent provider', async () => {
    // Import the processor dynamically to ensure mocks are set up first
    const { AIEnrichmentProcessor } = await import('../AIEnrichmentProcessor');
    const processor = new AIEnrichmentProcessor();
    
    // Set up a configuration with non-existent provider
    const config = {
      integrationName: 'non-existent-provider',
      model: 'test-model',
      mode: 'preview' as const,
      outputFormat: 'newColumns' as const,
      outputs: [
        {
          name: 'test-output',
          prompt: 'Test prompt',
          outputType: 'text' as const
        }
      ]
    };
    
    try {
      await processor.processDataset(
        config,
        ['col1', 'col2'],
        [['data1', 'data2']]
      );
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect((error as Error).message).toContain('AI provider not found');
    }
  });
});

describe('Integration tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up mock implementations for API responses
    (OpenAIService as any).mockImplementation(() => ({
      processPrompt: vi.fn().mockResolvedValue({ text: 'OpenAI response' }),
      isConfigured: vi.fn().mockResolvedValue(true),
      getProviderId: vi.fn().mockReturnValue('openai')
    }));
    
    (PerplexityService as any).mockImplementation(() => ({
      processPrompt: vi.fn().mockResolvedValue({ text: 'Perplexity response' }),
      isConfigured: vi.fn().mockResolvedValue(true),
      getProviderId: vi.fn().mockReturnValue('perplexity')
    }));
  });

  it('should process data with a properly configured AI provider', async () => {
    // Import the processor dynamically to ensure mocks are set up first
    const { AIEnrichmentProcessor } = await import('../AIEnrichmentProcessor');
    const processor = new AIEnrichmentProcessor();
    
    // Set up a simple dataset and config
    const dataset = {
      headers: ['id', 'text'],
      rows: [
        ['1', 'Sample text for analysis']
      ]
    };
    
    const config = {
      integrationName: 'openai',
      model: 'gpt-3.5-turbo',
      mode: 'preview' as const,
      outputFormat: 'newColumns' as const,
      outputs: [
        {
          name: 'sentiment',
          prompt: 'Analyze sentiment of this text: {text}',
          outputType: 'text' as const
        }
      ]
    };
    
    // Process the dataset
    const result = await processor.processDataset(config, dataset.headers, dataset.rows);
    
    // Check that processing was successful
    expect(result).toBeDefined();
    expect(result.newHeaders).toContain('sentiment');
    expect(result.errors.length).toBe(0);
  });

  it('should handle errors when provider is not configured', async () => {
    // Mock that the provider is not configured
    (OpenAIService as any).mockImplementation(() => ({
      processPrompt: vi.fn(),
      isConfigured: vi.fn().mockResolvedValue(false),
      getProviderId: vi.fn().mockReturnValue('openai')
    }));
    
    // Import the processor dynamically to ensure mocks are set up first
    const { AIEnrichmentProcessor } = await import('../AIEnrichmentProcessor');
    const processor = new AIEnrichmentProcessor();
    
    // Set up a configuration with the unconfigured provider
    const config = {
      integrationName: 'openai',
      model: 'gpt-3.5-turbo',
      mode: 'preview' as const,
      outputFormat: 'newColumns' as const,
      outputs: [
        {
          name: 'test-output',
          prompt: 'Test prompt',
          outputType: 'text' as const
        }
      ]
    };
    
    try {
      await processor.processDataset(
        config,
        ['col1', 'col2'],
        [['data1', 'data2']]
      );
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect((error as Error).message).toContain('not configured');
    }
  });
});
