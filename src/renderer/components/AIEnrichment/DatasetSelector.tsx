import React from 'react';
import { useAIEnrichment } from '../../hooks/useAIEnrichment';

/**
 * Component for switching between original and enriched datasets
 */
const DatasetSelector: React.FC = () => {
  const {
    hasEnrichedData,
    isShowingEnrichedData,
    setActiveDataset,
    status
  } = useAIEnrichment();

  if (!hasEnrichedData) {
    return null;
  }

  const isProcessing = status === 'processing';

  return (
    <div className="flex items-center space-x-3 mb-4">
      <span className="text-sm font-medium">Dataset view:</span>
      <div className="btn-group">
        <button
          className={`btn btn-sm ${!isShowingEnrichedData ? 'btn-active' : ''}`}
          onClick={() => setActiveDataset('original')}
          disabled={isProcessing}
        >
          Original
        </button>
        <button
          className={`btn btn-sm ${isShowingEnrichedData ? 'btn-active' : ''}`}
          onClick={() => setActiveDataset('enriched')}
          disabled={isProcessing}
        >
          Enriched
        </button>
      </div>

      {isProcessing && (
        <div className="flex items-center">
          <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="ml-2 text-sm text-gray-600">Processing...</span>
        </div>
      )}
    </div>
  );
};

export default DatasetSelector;
