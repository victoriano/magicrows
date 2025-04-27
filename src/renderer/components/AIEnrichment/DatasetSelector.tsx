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

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-3">
        <div className="badge badge-outline text-xs font-normal py-3">
          {rowCount} rows × {columnCount} columns
        </div>
        {/* Export Button - was previously in separate component */}
        {onExport && (
          <button 
            onClick={onExport}
            className="btn btn-sm btn-outline flex items-center space-x-1 ml-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export CSV</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default DatasetSelector;
