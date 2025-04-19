import { AIEnrichmentBlockConfig, OutputConfig } from '../../../shared/schemas/AIEnrichmentBlockSchema';

// Type definitions for Electron API
interface SecureStorage {
  hasApiKey: (providerId: string) => Promise<boolean>;
  getApiKey: (providerId: string) => Promise<string>;
  setApiKey: (providerId: string, apiKey: string) => Promise<void>;
  removeApiKey: (providerId: string) => Promise<void>;
}

interface ElectronAPI {
  secureStorage: SecureStorage;
}

// Declare window.electronAPI for TypeScript
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

/**
 * Response from an AI model
 */
export interface AIModelResponse {
  text?: string;
  category?: string;
  categories?: string[];
  number?: number;
  url?: string;
  date?: string;
  error?: string;
  structuredData?: any; // For structured JSON responses
  reasoning?: string; // For storing the reasoning behind decisions in structured outputs
}

/**
 * Options for processing a prompt
 */
export interface ProcessPromptOptions {
  model: string;
  temperature?: number;
  outputType: OutputConfig['outputType'];
  outputCategories?: OutputConfig['outputCategories'];
  providerOptions?: Record<string, any>;
}

/**
 * Common interface for all AI providers
 */
export interface AIProvider {
  /**
   * Process a single prompt and return the response
   * @param prompt The prompt to send to the AI model
   * @param options Options for processing the prompt
   * @returns Promise with the AI model response
   */
  processPrompt(prompt: string, options: ProcessPromptOptions): Promise<AIModelResponse>;

  /**
   * Validate if a configuration is valid for this provider
   * @param config The AI enrichment configuration to validate
   * @returns True if the configuration is valid, false otherwise
   */
  validateConfig(config: AIEnrichmentBlockConfig): boolean;

  /**
   * Get a list of available models for this provider
   * @returns Promise with the list of available models
   */
  getModelList(): Promise<string[]>;

  /**
   * Check if the provider is properly configured (has API key, etc.)
   * @returns Promise resolving to true if provider is ready, false otherwise
   */
  isConfigured(): Promise<boolean>;
}

/**
 * Base abstract class for AI providers that implements common functionality
 */
export abstract class BaseAIProvider implements AIProvider {
  constructor(protected providerId: string) {}

  /**
   * Process a single prompt and return the response
   * Must be implemented by each provider
   */
  abstract processPrompt(prompt: string, options: ProcessPromptOptions): Promise<AIModelResponse>;

  /**
   * Get a list of available models for this provider
   * Must be implemented by each provider
   */
  abstract getModelList(): Promise<string[]>;

  /**
   * Validate if a configuration is valid for this provider
   * @param config The AI enrichment configuration to validate
   */
  validateConfig(config: AIEnrichmentBlockConfig): boolean {
    // Check if the model is available for this provider
    // This is a basic validation, providers can override for more specific checks
    return config && !!config.model;
  }

  /**
   * Check if the provider has an API key configured
   */
  async isConfigured(): Promise<boolean> {
    try {
      console.log(`Checking if provider ${this.providerId} is configured...`);
      
      // First try the exact provider ID
      const hasExactKey = await window.electronAPI.secureStorage.hasApiKey(this.providerId);
      if (hasExactKey) {
        console.log(`Provider ${this.providerId} has API key`);
        return true;
      }
      
      // If not found and this is a named integration (e.g. "myOpenai"), try the generic type
      const genericType = this.providerId.toLowerCase().includes('openai') ? 'openai' : 
                         this.providerId.toLowerCase().includes('perplexity') ? 'perplexity' : 
                         null;
      
      if (genericType && this.providerId !== genericType) {
        const hasGenericKey = await window.electronAPI.secureStorage.hasApiKey(genericType);
        if (hasGenericKey) {
          console.log(`Provider ${this.providerId} using fallback API key from ${genericType}`);
          return true;
        }
      }
      
      // Try with apiKeys. prefix (as used in some implementations)
      const prefixedKey = `apiKeys.${this.providerId}`;
      const hasPrefixedKey = await window.electronAPI.secureStorage.hasApiKey(prefixedKey);
      if (hasPrefixedKey) {
        console.log(`Provider ${this.providerId} has API key with prefix`);
        return true;
      }
      
      console.error(`No API key found for ${this.providerId}`);
      return false;
    } catch (error) {
      console.error(`Error checking if ${this.providerId} is configured:`, error);
      return false;
    }
  }

  /**
   * Get the API key for this provider
   * @returns Promise with the API key
   */
  protected async getApiKey(): Promise<string> {
    try {
      console.log(`Getting API key for provider: ${this.providerId}`);
      
      // Use the EXACT same approach as the UI - get key by the exact provider ID
      // No fancy fallbacks or conversions
      const apiKey = await window.electronAPI.secureStorage.getApiKey(this.providerId);
      
      if (!apiKey) {
        console.error(`No API key found for provider: ${this.providerId}`);
        throw new Error(`Failed to get API key for ${this.providerId}`);
      }
      
      console.log(`Successfully retrieved API key for ${this.providerId} (length: ${apiKey.length})`);
      return apiKey;
    } catch (error) {
      console.error(`Error getting API key for ${this.providerId}:`, error);
      throw new Error(`Failed to get API key for ${this.providerId}`);
    }
  }
}

/**
 * Factory for creating AI provider instances
 */
export class AIProviderFactory {
  private static providers: Map<string, AIProvider> = new Map();
  private static providersByIntegration: Map<string, AIProvider> = new Map();

  /**
   * Register a provider with the factory
   * @param type The provider type (e.g., 'openai', 'perplexity')
   * @param provider The provider instance
   */
  static registerProvider(type: string, provider: AIProvider): void {
    this.providers.set(type, provider);
  }

  /**
   * Register a specific named provider integration
   * @param integrationName The full integration name (e.g., 'myOpenai', 'myPerplexitypaco')
   * @param provider The provider instance
   */
  static registerProviderIntegration(integrationName: string, provider: AIProvider): void {
    this.providersByIntegration.set(integrationName, provider);
  }

  /**
   * Get a provider by type
   * @param type The provider type
   * @returns The provider instance
   */
  static getProvider(type: string): AIProvider | undefined {
    return this.providers.get(type);
  }

  /**
   * Get a provider by integration name
   * @param integrationName The integration name from the config
   * @returns The provider instance or undefined if not found
   */
  static getProviderByIntegration(integrationName: string): AIProvider | undefined {
    // First, look for an exact match in our integrations map
    const specificProvider = this.providersByIntegration.get(integrationName);
    if (specificProvider) {
      return specificProvider;
    }
    
    // If no specific integration found, check if it might be a custom variation of a known provider type
    const type = integrationName.toLowerCase().includes('openai') ? 'openai' : 
                 integrationName.toLowerCase().includes('perplexity') ? 'perplexity' : 
                 undefined;
    
    if (type) {
      console.log(`Looking for base provider with type "${type}" for "${integrationName}"`);
      
      // Get the base provider
      const baseProvider = this.getProvider(type);
      if (!baseProvider) {
        console.error(`No base provider found for type "${type}"`);
        return undefined;
      }
      
      // Use the base provider directly with the original integrationName
      // This avoids instantiating new provider instances, which would require imports
      // that could cause circular dependencies
      console.log(`Using base provider for type "${type}" with integration name "${integrationName}"`);
      
      // Store the original providerId for reference
      const originalProviderId = (baseProvider as any).providerId;
      console.log(`Original provider ID: ${originalProviderId}, using: ${integrationName}`);
      
      // Temporarily modify the provider ID to match the integrationName
      // This ensures API key lookup will use the correct ID
      (baseProvider as any).providerId = integrationName;
      
      return baseProvider;
    }
    
    console.error(`No provider found for integration "${integrationName}" and no fallback available`);
    return undefined;
  }

  /**
   * Get all registered providers
   * @returns Array of provider instances
   */
  static getAllProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }
  
  /**
   * Get all registered provider integrations
   * @returns Map of integration names to provider instances
   */
  static getAllProviderIntegrations(): Map<string, AIProvider> {
    return this.providersByIntegration;
  }
}
