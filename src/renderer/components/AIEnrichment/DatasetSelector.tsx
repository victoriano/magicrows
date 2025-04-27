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

  // Empty component - functionality moved to App.tsx
  return null;
};

export default DatasetSelector;
export { useAIEnrichment };
