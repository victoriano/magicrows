import React from 'react';
import { useAIEnrichment } from '../../hooks/useAIEnrichment';

// Add props to allow passing handler from parent
interface DatasetSelectorProps {
  onExport?: () => void;
  rowCount?: number;
  columnCount?: number;
}

/**
 * Component for switching between original and enriched datasets
 */
const DatasetSelector: React.FC<DatasetSelectorProps> = ({ onExport, rowCount = 0, columnCount = 0 }) => {
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
        <div className="badge badge-outline text-xs font-normal py-3">
          {rowCount} rows × {columnCount} columns
        </div>
        <div className="tabs ml-2 border-b-0">
          <button
            className={`tab min-w-[6rem] px-4 ${!isShowingEnrichedData ? 'tab-active bg-white shadow-sm' : 'bg-base-200'} transition-all duration-200 ${(isProcessing || !hasEnrichedData) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-base-300'}`}
            onClick={() => !isProcessing && hasEnrichedData ? setActiveDataset('original') : null}
            disabled={isProcessing || !hasEnrichedData}
          >
            Original
          </button>
          <button
            className={`tab min-w-[6rem] px-4 ${isShowingEnrichedData ? 'tab-active bg-white shadow-sm' : 'bg-base-200'} transition-all duration-200 ${(isProcessing || !hasEnrichedData) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-base-300'}`}
            onClick={() => !isProcessing && hasEnrichedData ? setActiveDataset('enriched') : null}
            disabled={isProcessing || !hasEnrichedData}
          >
            Enriched
          </button>
        </div>
      </div>
      
      {/* Export button always shown */}
      {onExport && (
        <button 
          className="btn btn-ghost hover:bg-base-200 gap-2 transition-all"
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
