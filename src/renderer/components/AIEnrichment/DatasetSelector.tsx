import React from 'react';
import { useAIEnrichment } from '../../hooks/useAIEnrichment';

// Add props to allow passing handler from parent
interface DatasetSelectorProps {
  onExport?: () => void;
}

/**
 * Component for switching between original and enriched datasets
 */
const DatasetSelector: React.FC<DatasetSelectorProps> = ({ onExport }) => {
  const {
    hasEnrichedData,
    isShowingEnrichedData,
    setActiveDataset,
    status
  } = useAIEnrichment();

  const isProcessing = status === 'processing';

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-3">
        <span className="text-sm font-medium">Dataset view:</span>
        <div className="tabs tabs-lifted ml-2">
          <button
            className={`tab tab-lifted min-w-[6rem] px-4 ${!isShowingEnrichedData ? 'tab-active bg-white shadow-sm' : 'bg-base-200'} transition-all duration-200 ${(isProcessing || !hasEnrichedData) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-base-300'}`}
            onClick={() => !isProcessing && hasEnrichedData ? setActiveDataset('original') : null}
            disabled={isProcessing || !hasEnrichedData}
          >
            Original
          </button>
          <button
            className={`tab tab-lifted min-w-[6rem] px-4 ${isShowingEnrichedData ? 'tab-active bg-white shadow-sm' : 'bg-base-200'} transition-all duration-200 ${(isProcessing || !hasEnrichedData) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-base-300'}`}
            onClick={() => !isProcessing && hasEnrichedData ? setActiveDataset('enriched') : null}
            disabled={isProcessing || !hasEnrichedData}
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
      
      {/* Export button always shown */}
      {onExport && (
        <button 
          className="btn btn-ghost border border-base-300 hover:bg-base-200 gap-2 transition-all"
          onClick={onExport}
          disabled={isProcessing}
          title="Export data as CSV file"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 text-primary" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
            />
          </svg>
          Export CSV
        </button>
      )}
    </div>
  );
};

export default DatasetSelector;
