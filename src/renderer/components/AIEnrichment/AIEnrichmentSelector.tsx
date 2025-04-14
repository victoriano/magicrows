import React, { useState } from 'react';
import { useAIEnrichment } from '../../hooks/useAIEnrichment';
import { EnrichmentPreset } from '../../store/slices/aiEnrichmentSlice';

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
  
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSelectPreset = (preset: EnrichmentPreset) => {
    selectEnrichmentPreset(preset.id);
    setShowDropdown(false);
  };

  const handleProcess = () => {
    if (selectedPreset) {
      processDataWithAI();
    }
  };

  const isProcessing = status === 'processing';

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
        <div className="relative">
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
                    {preset.config.integrationName} • {preset.config.model}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {selectedPreset && (
          <div className="bg-white rounded-md p-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-500">Provider:</span>
                <span className="ml-1 font-medium">{selectedPreset.config.integrationName}</span>
              </div>
              <div>
                <span className="text-gray-500">Model:</span>
                <span className="ml-1 font-medium">{selectedPreset.config.model}</span>
              </div>
              <div>
                <span className="text-gray-500">Mode:</span>
                <span className="ml-1 font-medium capitalize">{selectedPreset.config.mode}</span>
              </div>
              <div>
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
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
            {error}
          </div>
        )}
        
        <div className="flex justify-end space-x-2">
          <button
            className="px-3 py-1.5 bg-base-300 text-gray-700 rounded-md text-sm"
            disabled={isProcessing}
          >
            Edit
          </button>
          <button
            className={`px-3 py-1.5 bg-primary text-white rounded-md text-sm flex items-center ${
              isProcessing ? 'opacity-75' : ''
            }`}
            onClick={handleProcess}
            disabled={!selectedPreset || isProcessing}
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              'Enrich Data'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIEnrichmentSelector;
