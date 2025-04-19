/**
 * This file exports all preset configurations from the schemas_examples directory
 */

// Import the example configuration from the example file
import { automationTasksExample } from './AIEnrichmentBlock_example';

// Export individual preset configurations
export { sentimentAnalysisPreset } from './sentiment_analysis_preset';
export { keywordExtractionPreset } from './keyword_extraction_preset';
export { dataEnrichmentPreset } from './data_enrichment_preset';
export { automationTasksExample };

// If you prefer to use a consolidated array of all presets:
import { sentimentAnalysisPreset } from './sentiment_analysis_preset';
import { keywordExtractionPreset } from './keyword_extraction_preset';
import { dataEnrichmentPreset } from './data_enrichment_preset';
import { EnrichmentPreset } from '../../renderer/store/slices/aiEnrichmentSlice';

/**
 * An array containing all preset configurations
 */
export const allPresets: EnrichmentPreset[] = [
  sentimentAnalysisPreset,
  keywordExtractionPreset,
  dataEnrichmentPreset,
  // Convert the automation tasks example to a proper preset
  {
    id: 'automation-tasks',
    name: 'Automation Tasks',
    description: 'Identify tasks with high automation potential based on NACE and ISCO codes',
    config: automationTasksExample
  }
];
