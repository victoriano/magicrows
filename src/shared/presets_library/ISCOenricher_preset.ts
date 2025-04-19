// src/shared/examples/llmProcessingExamples.ts
import { AIEnrichmentBlockConfig } from '../schemas/AIEnrichmentBlockSchema';

/**
 * Example of an LLM processing job that identifies automation tasks for professions
 * and rates their novelty based on NACE and ISCO codes
 */
export const ISCOenricherPreset: AIEnrichmentBlockConfig = {
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
    },
    {
      "name": "novelty_rating",
      "prompt": "Based on the automation tasks identified for the profession with NACE code {{nace}} and ISCO code {{isco}}, evaluate how novel these automation opportunities are in the current market. Consider factors like existing solutions, unique applications, and market saturation. Select the most appropriate rating category.",
      "outputType": "singleCategory",
      "outputCategories": [
        {
          "name": "Very Novel",
          "description": "Highly original ideas with minimal existing competition; represents a significant innovation in the field"
        },
        {
          "name": "Somewhat Novel",
          "description": "Contains original elements but some similar solutions exist; offers meaningful improvements over existing approaches"
        },
        {
          "name": "Average Novelty",
          "description": "Comparable to existing solutions but with some differentiating factors; moderately competitive space"
        },
        {
          "name": "Somewhat Unoriginal",
          "description": "Similar to many existing solutions with minor variations; highly competitive market"
        },
        {
          "name": "Not Original At All",
          "description": "Identical to widely available solutions; oversaturated market with numerous established competitors"
        }
      ]
    }
  ]
};

// You can add more examples here as needed

