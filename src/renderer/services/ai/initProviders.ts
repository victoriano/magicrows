/**
 * This file initializes all AI providers and registers them with the AIProviderFactory.
 * It must be imported at application startup to ensure providers are available.
 */

// Import all provider services 
import { OpenAIService } from './OpenAIService';
import { PerplexityService } from './PerplexityService';
import { AIProviderFactory } from './AIProvider';

// Import provider store to get existing provider configurations
import { store } from '../../store';

// Register provider types (for fallback)
// These use the generic type names like 'openai' and 'perplexity'
const openaiProvider = new OpenAIService();
AIProviderFactory.registerProvider('openai', openaiProvider);

const perplexityProvider = new PerplexityService();
AIProviderFactory.registerProvider('perplexity', perplexityProvider);

// Register specific named provider integrations from the Redux store
function registerNamedProviderIntegrations() {
  try {
    const state = store.getState();
    const providers = state.providers.providers;
    
    console.log('Registering named provider integrations:', providers.map(p => p.name));
    
    for (const provider of providers) {
      let specificProvider;
      
      // Create appropriate provider instance based on provider type
      // IMPORTANT: Pass the specific provider ID to the constructor!
      if (provider.type === 'openai') {
        // Use the specific provider.id, not the generic 'openai'
        specificProvider = new OpenAIService(provider.id);
      } else if (provider.type === 'perplexity') {
        // Use the specific provider.id, not the generic 'perplexity'
        specificProvider = new PerplexityService(provider.id);
      } else {
        console.warn(`Unknown provider type: ${provider.type}`);
        continue;
      }
      
      // Register this specific provider with its exact name/id
      AIProviderFactory.registerProviderIntegration(provider.id, specificProvider);
      console.log(`Registered provider integration: ${provider.id} (${provider.type})`);
    }
  } catch (error) {
    console.error('Error registering named provider integrations:', error);
  }
}

// Call the registration function
registerNamedProviderIntegrations();

// Export a function to get all registered provider names
export function getRegisteredProviderNames(): string[] {
  return Array.from(AIProviderFactory.getAllProviderIntegrations().keys());
}

// Export a function to verify initialization
export function getProviderInfo(): { types: string[], integrations: string[] } {
  return {
    types: Array.from(AIProviderFactory.getAllProviders()).map(provider => 
      // @ts-ignore - Accessing protected providerId property for debugging
      (provider as any).providerId || 'unknown'
    ),
    integrations: Array.from(AIProviderFactory.getAllProviderIntegrations().keys())
  };
}

// Log that providers have been registered
console.log('AI Providers initialized:', getProviderInfo());

// Initialize function that can be called to ensure providers are registered
export function ensureProvidersInitialized(): void {
  registerNamedProviderIntegrations();
  console.log('AI Providers verified:', getProviderInfo());
}
