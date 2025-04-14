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
      return await window.electronAPI.secureStorage.hasApiKey(this.providerId);
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
      return await window.electronAPI.secureStorage.getApiKey(this.providerId);
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

  /**
   * Register a provider with the factory
   * @param type The provider type (e.g., 'openai', 'perplexity')
   * @param provider The provider instance
   */
  static registerProvider(type: string, provider: AIProvider): void {
    this.providers.set(type, provider);
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
    // This is a simple implementation, assuming integrationName is formatted as myOpenAI or myPerplexity
    // You might want to implement a more sophisticated lookup based on your integration naming system
    const type = integrationName.toLowerCase().includes('openai') ? 'openai' : 
                 integrationName.toLowerCase().includes('perplexity') ? 'perplexity' : 
                 undefined;
    
    return type ? this.getProvider(type) : undefined;
  }

  /**
   * Get all registered providers
   * @returns Array of provider instances
   */
  static getAllProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }
}
