/**
 * AI Services index file
 * Exports all AI provider services and utilities
 */

// Export interfaces and base classes
export * from './AIProvider';

// Export concrete service implementations
export * from './OpenAIService';
export * from './PerplexityService';

// Re-export factory for convenient access
import { AIProviderFactory } from './AIProvider';
export { AIProviderFactory };

/**
 * Initialize all AI providers
 * This ensures all providers are registered with the factory
 */
export function initializeAIProviders(): void {
  // The import statements in each provider file will register them with the factory
  // So simply importing them is enough to register them
  
  // Optionally add any initialization logic here
  console.log('AI Providers initialized successfully');
}
