import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { Provider } from '../../store/slices/providerSlice';

interface AIProviderSelectorProps {
  selectedProviderId: string | null;
  onSelectProvider: (providerId: string) => void;
  className?: string;
  label?: string;
  enrichmentFunctionId?: string; // Optional - to filter providers specific to an enrichment function
}

/**
 * Component for selecting a specific AI provider integration
 * Shows named instances like "myOpenai" and "myPerplexitypaco" rather than just provider types
 */
const AIProviderSelector: React.FC<AIProviderSelectorProps> = ({
  selectedProviderId,
  onSelectProvider,
  className = '',
  label = 'AI Provider',
  enrichmentFunctionId
}) => {
  const { providers, isLoading } = useSelector((state: RootState) => state.providers);
  const [showDropdown, setShowDropdown] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<Record<string, boolean>>({});

  // Check API key status for each provider
  useEffect(() => {
    const checkApiKeys = async () => {
      const statuses: Record<string, boolean> = {};
      
      for (const provider of providers) {
        try {
          const hasKey = await window.electronAPI.secureStorage.hasApiKey(provider.id);
          statuses[provider.id] = hasKey;
        } catch (error) {
          console.error(`Error checking API key for ${provider.id}:`, error);
          statuses[provider.id] = false;
        }
      }
      
      setApiKeyStatus(statuses);
    };
    
    checkApiKeys();
  }, [providers]);

  // Get selected provider object
  const selectedProvider = selectedProviderId 
    ? providers.find(p => p.id === selectedProviderId) 
    : null;

  // Handle provider selection
  const handleSelectProvider = (providerId: string) => {
    onSelectProvider(providerId);
    setShowDropdown(false);
  };

  // Get provider status - active and has API key
  const getProviderStatus = (provider: Provider): { isActive: boolean, hasApiKey: boolean } => {
    return {
      isActive: provider.isActive,
      hasApiKey: apiKeyStatus[provider.id] || false
    };
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        <button
          type="button"
          className="w-full px-4 py-2 bg-white border rounded-md flex justify-between items-center"
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={isLoading || providers.length === 0}
        >
          <div className="flex items-center">
            {selectedProvider ? (
              <>
                <span className="font-medium">{selectedProvider.name}</span>
                <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-md">
                  {selectedProvider.type === 'openai' ? 'OpenAI' : 'Perplexity'}
                </span>
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  selectedProvider.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {selectedProvider.isActive ? 'Active' : 'Inactive'}
                </span>
              </>
            ) : (
              <span className="text-gray-500">
                {isLoading 
                  ? 'Loading providers...' 
                  : providers.length > 0 
                    ? 'Select a provider' 
                    : 'No providers available'}
              </span>
            )}
          </div>
          
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDropdown && providers.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
            {providers.map((provider) => {
              const status = getProviderStatus(provider);
              return (
                <button
                  key={provider.uniqueId || `provider-${provider.id}`}
                  className={`w-full px-4 py-2 text-left hover:bg-base-200 ${
                    selectedProviderId === provider.id ? 'bg-base-200' : ''
                  }`}
                  onClick={() => handleSelectProvider(provider.id)}
                  disabled={!status.hasApiKey}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{provider.name}</span>
                      <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-md">
                        {provider.type === 'openai' ? 'OpenAI' : 'Perplexity'}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        provider.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {provider.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="text-xs mt-1 text-gray-500">
                      {status.hasApiKey 
                        ? 'API key is set and the integration is active.' 
                        : 'No API key set. Click Edit to add your key.'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Warning message if no providers are available */}
      {!isLoading && providers.length === 0 && (
        <div className="mt-2 text-sm text-red-600">
          No AI providers available. Add a provider in Settings.
        </div>
      )}
      
      {/* Warning if selected provider has no API key */}
      {selectedProvider && !apiKeyStatus[selectedProvider.id] && (
        <div className="mt-2 text-sm text-yellow-600">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {selectedProvider.name} is missing an API key. Go to Settings to configure it.
          </div>
        </div>
      )}
    </div>
  );
};

export default AIProviderSelector;
