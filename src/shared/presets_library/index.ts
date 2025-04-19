/**
 * This file exports all preset configurations from the presets_library directory
 */

// Import all preset configurations
import { sentimentAnalysisPreset } from './sentiment_analysis_preset';
import { keywordExtractionPreset } from './keyword_extraction_preset';
import { dataEnrichmentPreset } from './data_enrichment_preset';
import { ISCONoveltyPreset } from './ISCONovelty_preset';
import { ISCOTasksPreset } from './ISCOTasks_preset';
import { EnrichmentPreset } from '../../renderer/store/slices/aiEnrichmentSlice';

/**
 * An array containing all preset configurations
 * This is used by the PresetLoaderService to load all presets
 */
export const allPresets: EnrichmentPreset[] = [
  sentimentAnalysisPreset,
  keywordExtractionPreset,
  dataEnrichmentPreset,
  ISCONoveltyPreset,
  ISCOTasksPreset
];

// Also individually export the presets for direct imports where needed
export { 
  sentimentAnalysisPreset, 
  keywordExtractionPreset, 
  dataEnrichmentPreset
};
