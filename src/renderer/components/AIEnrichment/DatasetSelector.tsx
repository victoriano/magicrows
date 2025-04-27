import React from 'react';
import { useAIEnrichment } from '../../hooks/useAIEnrichment';

// Add props to allow passing handler from parent
interface DatasetSelectorProps {
  rowCount?: number;
  columnCount?: number;
}

/**
 * Component for switching between original and enriched datasets
 */
const DatasetSelector: React.FC<DatasetSelectorProps> = ({ rowCount = 0, columnCount = 0 }) => {
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
      </div>
    </div>
  );
};

export default DatasetSelector;
