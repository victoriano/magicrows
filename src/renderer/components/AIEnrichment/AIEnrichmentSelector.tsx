import React, { useState, useEffect } from 'react';
import { useAIEnrichment } from '../../hooks/useAIEnrichment';
import { EnrichmentPreset } from '../../store/slices/aiEnrichmentSlice';
import AIProviderSelector from './AIProviderSelector';
import { getRegisteredProviderNames } from '../../services/ai/initProviders';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

/**
 * Component for selecting AI enrichment presets and managing enrichment options
 */
const AIEnrichmentSelector: React.FC = () => {
  const { 
    presets, 
    selectedPreset, 
    selectEnrichmentPreset,
    status,
    processDataWithAI,
    error
  } = useAIEnrichment();
  
  const providerState = useSelector((state: RootState) => state.providers || { providers: [] });
  const { providers = [] } = providerState;
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [providerError, setProviderError] = useState<string | null>(null);
  // Added loading state to improve UX
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);

  // Get the provider type (openai, perplexity) from the integration name in the preset
  const getProviderTypeFromIntegration = (integrationName: string): string | null => {
    if (!integrationName) return null;
    if (integrationName.toLowerCase().includes('openai')) return 'openai';
    if (integrationName.toLowerCase().includes('perplexity')) return 'perplexity';
    return null;
  };

  // Initialize selected provider from preset if available
  // Or select the first available provider as default, prioritizing by type
  useEffect(() => {
    if (selectedPreset) {
      setIsLoadingProviders(true);
      
      // First try to find the exact provider specified in the preset
      if (selectedPreset.config?.integrationName) {
        const exactMatch = providers.find(p => 
          p.id === selectedPreset.config.integrationName || 
          p.name === selectedPreset.config.integrationName
        );
        
        if (exactMatch) {
          setSelectedProviderId(exactMatch.id);
          setProviderError(null);
          setIsLoadingProviders(false);
          return;
        }
        
        // If no exact match, try to find a provider of the same type
        const providerType = getProviderTypeFromIntegration(selectedPreset.config.integrationName);
        if (providerType) {
          // Find any provider matching the type
          const matchingTypeProvider = providers.find(p => p.type === providerType);
          
          if (matchingTypeProvider) {
            setSelectedProviderId(matchingTypeProvider.id);
            setProviderError(null);
            setIsLoadingProviders(false);
            return;
          }
        }
      }
      
      // If no matching provider or no integration name specified,
      // select the first available provider as default
      if (providers.length > 0) {
        setSelectedProviderId(providers[0].id);
          setProviderError(null);
      } else {
        setProviderError("No AI providers available. Add a provider in Settings.");
        setSelectedProviderId(null);
      }
      
      setIsLoadingProviders(false);
    }
  }, [selectedPreset, providers]);

  const handleSelectPreset = (preset: EnrichmentPreset) => {
    selectEnrichmentPreset(preset.id);
    setShowDropdown(false);
    
    // Provider selection will be handled by the useEffect above
    // Show loading state while finding the best provider
    setIsLoadingProviders(true);
  };

  const handleSelectProvider = (providerId: string) => {
    setSelectedProviderId(providerId);
    setProviderError(null);
  };

  const handleProcess = () => {
    if (selectedPreset) {
      // Ensure we have a valid provider before processing
      if (!selectedProviderId) {
        setProviderError("Please select a valid AI provider before processing");
        return;
      }
      
      // Get the original configuration
      const originalConfig = {...selectedPreset.config};
      
      // Override the integration name with the selected provider ID
      // This is the key fix: use the selected provider ID from our dropdown
      // instead of whatever was stored in the preset
      const updatedConfig = {
        ...originalConfig,
        integrationName: selectedProviderId
      };
      
      // Process with the updated configuration
      processDataWithAI(updatedConfig);
    }
  };

  const isProcessing = status === 'processing';

  // Get provider type from selected preset for filtering
  const presetProviderType = selectedPreset?.config?.integrationName
    ? getProviderTypeFromIntegration(selectedPreset.config.integrationName)
    : null;

  if (!presets || presets.length === 0) {
    return (
      <div className="bg-base-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-gray-600">No AI enrichment presets available.</p>
        <button className="mt-2 px-3 py-1 text-sm bg-primary text-white rounded-md">
          Create Preset
        </button>
      </div>
    );
  }

  return (
    <div className="bg-base-200 rounded-lg p-4 mb-4">
      <h3 className="font-medium mb-3">AI Enrichment</h3>
      
      <div className="flex flex-col space-y-3">
        {/* AI Enrichment Preset Selector */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Enrichment Task
          </label>
          <button 
            className="w-full px-4 py-2 bg-white border rounded-md flex justify-between items-center"
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={isProcessing}
          >
            <span>{selectedPreset ? selectedPreset.name : 'Select an enrichment preset'}</span>
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
          
          {showDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  className={`w-full px-4 py-2 text-left hover:bg-base-200 ${
                    selectedPreset?.id === preset.id ? 'bg-base-200' : ''
                  }`}
                  onClick={() => handleSelectPreset(preset)}
                >
                  <div className="font-medium">{preset.name}</div>
                  <div className="text-xs text-gray-500">
                    {preset.config.model} • {preset.config.mode === 'preview' ? 'Preview Mode' : 'Full Processing'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Only show provider selection when a preset is selected */}
        {selectedPreset && (
          <>
            {/* AI Provider Selector - With appropriate provider type filtering */}
            <AIProviderSelector
              selectedProviderId={selectedProviderId}
              onSelectProvider={handleSelectProvider}
              className="mb-2"
              label="Provider Integration"
              providerType={presetProviderType || undefined}
              isLoading={isLoadingProviders}
            />

            {providerError && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-2 rounded-md text-sm">
                {providerError}
              </div>
            )}

            {/* Enrichment details section */}
            <div className="bg-white rounded-md p-3 text-sm">
              <div> 
                <div className="mb-1"> 
                  <span className="text-gray-500">Provider:</span>
                  <span className="ml-1 font-medium">
                    {selectedProviderId ? 
                      providers.find(p => p.id === selectedProviderId)?.name || "Unknown" : 
                      isLoadingProviders ? "Loading..." : "Not selected"}
                  </span>
                </div>
                <div className="mb-1"> 
                  <span className="text-gray-500">Model:</span>
                  <span className="ml-1 font-medium">{selectedPreset.config.model}</span>
                </div>
                <div className="mb-1"> 
                  <span className="text-gray-500">Mode:</span>
                  <span className="ml-1 font-medium capitalize">{selectedPreset.config.mode}</span>
                </div>
                <div className="mb-1"> 
                  <span className="text-gray-500">Output Format:</span>
                  <span className="ml-1 font-medium">
                    {selectedPreset.config.outputFormat === 'newColumns' ? 'New Columns' : 'New Rows'}
                  </span>
                </div>
              </div>
              
              <div className="mt-2">
                <span className="text-gray-500">Outputs:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedPreset.config.outputs.map((output, index) => (
                    <span 
                      key={index} 
                      className="px-2 py-0.5 bg-base-200 rounded-full text-xs"
                    >
                      {output.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
            {error}
          </div>
        )}
        
        <div className="flex justify-end space-x-2">
          <button
            className={`px-3 py-1.5 bg-primary text-white rounded-md text-sm flex items-center ${
              isProcessing ? 'opacity-75' : ''
            }`}
            onClick={handleProcess}
            disabled={!selectedPreset || !selectedProviderId || isProcessing}
          >
            Enrich Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIEnrichmentSelector;
