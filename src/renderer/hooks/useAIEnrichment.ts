import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import {
  selectPreset,
  clearSelection,
  setActiveDataset,
  resetEnrichmentState,
  processDataWithAI,
  selectAIEnrichmentState,
  selectPresets,
  selectSelectedPreset,
  selectEnrichmentStatus,
  selectActiveDataset,
  selectEnrichmentResult,
  selectEnrichmentError,
  EnrichmentPreset,
  EnrichmentStatus
} from '../store/slices/aiEnrichmentSlice';

/**
 * Custom hook for AI Enrichment functionality
 * Provides access to AI enrichment state and actions
 */
export const useAIEnrichment = () => {
  const dispatch = useDispatch();
  
  // Select state using selectors
  const presets = useSelector(selectPresets);
  const selectedPreset = useSelector(selectSelectedPreset);
  const status = useSelector(selectEnrichmentStatus);
  const activeDataset = useSelector(selectActiveDataset);
  const result = useSelector(selectEnrichmentResult);
  const error = useSelector(selectEnrichmentError);
  const enrichmentState = useSelector(selectAIEnrichmentState);
  
  // Action creators wrapped in dispatch
  const selectEnrichmentPreset = useCallback(
    (presetId: string) => dispatch(selectPreset(presetId)), 
    [dispatch]
  );
  
  const clearEnrichmentSelection = useCallback(
    () => dispatch(clearSelection()), 
    [dispatch]
  );
  
  const switchActiveDataset = useCallback(
    (dataset: 'original' | 'enriched') => dispatch(setActiveDataset(dataset)), 
    [dispatch]
  );
  
  const resetEnrichment = useCallback(
    () => dispatch(resetEnrichmentState()), 
    [dispatch]
  );
  
  const processData = useCallback(
    () => dispatch(processDataWithAI()), 
    [dispatch]
  );
  
  // Processing status helper methods
  const isProcessing = status === 'processing';
  const isSuccess = status === 'success';
  const isError = status === 'error';
  const isIdle = status === 'idle';
  
  // Dataset selection helper methods
  const hasEnrichedData = result !== null && result.newRows !== undefined && result.newRows.length > 0;
  const isShowingOriginalData = activeDataset === 'original';
  const isShowingEnrichedData = activeDataset === 'enriched';
  
  return {
    // State selectors
    presets,
    selectedPreset,
    status,
    activeDataset,
    result,
    error,
    enrichmentState,
    
    // Action dispatchers
    selectEnrichmentPreset,
    clearEnrichmentSelection,
    switchActiveDataset,
    resetEnrichment,
    processData,
    
    // Helper methods
    isProcessing,
    isSuccess,
    isError,
    isIdle,
    hasEnrichedData,
    isShowingOriginalData,
    isShowingEnrichedData
  };
};

export default useAIEnrichment;
