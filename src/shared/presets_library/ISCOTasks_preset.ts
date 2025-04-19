// src/shared/examples/llmProcessingExamples.ts
import { AIEnrichmentBlockConfig } from '../schemas/AIEnrichmentBlockSchema';

/**
 * Example of an LLM processing job that identifies automation tasks for professions
 * and rates their novelty based on NACE and ISCO codes
 */
export const ISCOtasksConfig: AIEnrichmentBlockConfig = {
  "integrationName": "myOpenAI",
  "model": "gpt-4.1-nano",
  "temperature": 0.2,
  "mode": "preview",
  "previewRowCount": 2,
  "outputFormat": "newRows",
  "contextColumns": ["nace", "isco"],
  "outputs": [
    {
      "name": "automation_tasks",
      "prompt": "For the profession described by NACE code {{nace}} and ISCO code {{isco}}, identify 5 specific tasks currently performed that have high potential for automation using modern AI technologies (like LLMs, computer vision, etc.). Focus on tasks where AI could form the core of a potential startup idea. Please list only the tasks, one per line for a text output",
      "outputType": "text"
    }
  ]
};

/**
 * Metadata for the Data Enrichment preset
 */
export const ISCOTasksPreset = {
  id: 'isco-tasks',
  name: 'ISCO Tasks',
  description: 'Identify tasks with high automation potential based on NACE and ISCO codes',
  config: ISCOtasksConfig
};


