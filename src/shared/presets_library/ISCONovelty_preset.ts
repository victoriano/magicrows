// src/shared/examples/llmProcessingExamples.ts
import { AIEnrichmentBlockConfig } from '../schemas/AIEnrichmentBlockSchema';

/**
 * Example of an LLM processing job that identifies automation tasks for professions
 * and rates their novelty based on NACE and ISCO codes
 */
export const ISCONoveltyConfig: AIEnrichmentBlockConfig = {
  "integrationName": "myOpenAI",
  "model": "gpt-4.1-nano",
  "temperature": 0.2,
  "mode": "preview",
  "previewRowCount": 2,
  "outputFormat": "newColumns",
  "combineOutputs": true,
  "contextColumns": ["nace", "isco"],
  "outputs": [
    {
      "name": "novelty_rating",
      "prompt": "Based on the automation tasks identified for the profession with NACE code {{nace}} and ISCO code {{isco}}, evaluate how novel these automation opportunities are in the current market. Consider factors like existing solutions, unique applications, and market saturation. Select the most appropriate rating category.",
      "outputType": "category",
      "outputCardinality": "single",
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
    },
    {
      "name": "best_country_match",
      "prompt": "Based on the industry sector with NACE code {{nace}} and occupation with ISCO code {{isco}}, analyze which of the following European countries has the strongest and most advanced industry in this specific sector and occupation. Consider factors like technological advancement, market leadership, innovation, workforce expertise, and industry presence. Select the most appropriate country and reason base on specific companies names that are strong for that country in tha industry",
      "outputType": "category",
      "outputCardinality": "single",
      "outputCategories": [
        {
          "name": "Germany",
          "description": "Businesses based in Germany"
        },
        {
          "name": "France",
          "description": "Businesses based in France"
        },
        {
          "name": "United Kingdom",
          "description": "Businesses based in the United Kingdom"
        },
        {
          "name": "Italy",
          "description": "Businesses based in Italy"
        },
        {
          "name": "Spain",
          "description": "Businesses based in Spain"
        }
      ]
    }
  ]
};

/**
 * Metadata for the Data Enrichment preset
 */
export const ISCONoveltyPreset = {
  id: 'isco-novelty',
  name: 'ISCO Novelty',
  description: 'Identify tasks with high automation potential based on NACE and ISCO codes',
  config: ISCONoveltyConfig
};
