/**
 * This file initializes all AI providers and registers them with the AIProviderFactory.
 * It must be imported at application startup to ensure providers are available.
 */

// Import all provider services 
import { OpenAIService } from './OpenAIService';
import { PerplexityService } from './PerplexityService';
import { AIProviderFactory } from './AIProvider';

// Register OpenAI provider
const openaiProvider = new OpenAIService();
AIProviderFactory.registerProvider('openai', openaiProvider);

// Register Perplexity provider
const perplexityProvider = new PerplexityService();
AIProviderFactory.registerProvider('perplexity', perplexityProvider);

// Export a function to verify initialization
export function getRegisteredProviderNames(): string[] {
  return AIProviderFactory.getAllProviders().map(provider => 
    // @ts-ignore - Accessing protected providerId property for debugging
    (provider as any).providerId || 'unknown'
  );
}

// Log that providers have been registered
console.log('AI Providers initialized:', getRegisteredProviderNames());

// Initialize function that can be called to ensure providers are registered
export function ensureProvidersInitialized(): void {
  console.log('AI Providers verified:', getRegisteredProviderNames());
}
