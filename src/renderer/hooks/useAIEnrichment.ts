import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  selectPreset,
  setActiveDataset,
  processDataWithAI,
  EnrichmentPreset
} from '../store/slices/aiEnrichmentSlice';

/**
 * Hook for accessing and manipulating AI Enrichment state
 */
export function useAIEnrichment() {
  const dispatch = useDispatch<AppDispatch>();
  const {
    presets,
    selectedPresetId,
    status,
    error,
    activeDataset,
    result
  } = useSelector((state: RootState) => state.aiEnrichment);

  // Derived state
  const selectedPreset = selectedPresetId 
    ? presets.find(preset => preset.id === selectedPresetId) || null 
    : null;
  
  const hasEnrichedData = !!result && 
    ((result.newRows && result.newRows.length > 0) || 
     (result.newHeaders && result.newHeaders.length > 0));
  
  const isShowingEnrichedData = activeDataset === 'enriched' && hasEnrichedData;

  // Processing metrics - mock from result since we don't have it in the interface
  const processingMetrics = result ? {
    processed: result.processedRowCount || 0,
    total: result.newRows?.length || 0,
    timeElapsed: 0 // This would need to be tracked elsewhere
  } : null;

  // Actions
  const selectEnrichmentPreset = (presetId: string) => {
    dispatch(selectPreset(presetId));
  };

  const processDataWithAIAction = () => {
    if (!selectedPresetId) return;
    dispatch(processDataWithAI());
  };

  const toggleEnrichedView = (showEnriched: boolean) => {
    dispatch(setActiveDataset(showEnriched ? 'enriched' : 'original'));
  };

  return {
    // State
    presets,
    selectedPreset,
    status,
    error,
    activeDataset,
    enrichmentResult: result,
    processingMetrics,
    
    // Derived state
    hasEnrichedData,
    isShowingEnrichedData,
    
    // Actions
    selectEnrichmentPreset,
    processDataWithAI: processDataWithAIAction,
    setActiveDataset: (dataset: 'original' | 'enriched') => dispatch(setActiveDataset(dataset)),
    toggleEnrichedView
  };
}

export default useAIEnrichment;
