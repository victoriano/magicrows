/**
 * AI Enrichment Block Configuration Schema
 * 
 * Defines the schema and TypeScript types for configuring LLM processing jobs.
 * This schema supports multiple model providers, various output types,
 * and both preview and full processing modes.
 */

// JSON Schema definition
export const AIEnrichmentBlockSchema = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "AI Enrichment Block Configuration",
    "type": "object",
    "required": ["integrationName", "model", "mode", "outputFormat", "outputs"],
    "properties": {
      "integrationName": {
        "type": "string",
        "description": "Name of the integration"
      },
      "budget": {
        "type": "number",
        "description": "Maximum amount the user is willing to spend",
        "default": 5
      },
      "model": {
        "type": "string",
        "description": "The LLM model to use",
        "examples": ["gpt-4.1", "o3-mini", "sonar", "claude-3.7-sonnet", "gemini-2.5-pro"]
      },
      "temperature": {
        "type": "number",
        "description": "Controls randomness of outputs (0-1, higher is more random)",
        "minimum": 0,
        "maximum": 1,
        "default": 0.2
      },
      "mode": {
        "type": "string",
        "description": "Processing mode: preview (few rows) or full dataset",
        "enum": ["preview", "full"]
      },
      "previewRowCount": {
        "type": "integer",
        "description": "Number of rows to process in preview mode",
        "default": 3
      },
      "outputFormat": {
        "type": "string",
        "description": "How to structure output: as new columns or new rows",
        "enum": ["newColumns", "newRows"]
      },
      "combineOutputs": {
        "type": "boolean",
        "description": "If true, combine all outputs for a row into a single provider request using a merged JSON schema",
        "default": true
      },
      "contextColumns": {
        "type": "array",
        "description": "Dataset columns to include as context",
        "items": {
          "type": "string"
        }
      },
      "outputs": {
        "type": "array",
        "description": "Array of output column configurations",
        "items": {
          "type": "object",
          "required": ["name", "prompt", "outputType"],
          "properties": {
            "name": {
              "type": "string",
              "description": "Name for this output column"
            },
            "prompt": {
              "type": "string",
              "description": "The prompt text to send to the LLM for this output"
            },
            "outputType": {
              "type": "string",
              "description": "The type of output expected from the LLM for this column",
              "enum": ["category", "number", "url", "text", "date"]
            },
            "outputCardinality": {
              "type": "string",
              "enum": ["single", "multiple"],
              "default": "single",
              "description": "Expect a single value or an array of values"
            },
            "outputCategories": {
              "type": "array",
              "description": "Structured output categories (required when outputType is 'category')",
              "items": {
                "type": "object",
                "properties": {
                  "name": {
                    "type": "string",
                    "description": "Name of the output category"
                  },
                  "description": {
                    "type": "string",
                    "description": "Explanation of what this category means"
                  }
                },
                "required": ["name"]
              }
            }
          }
        },
        "minItems": 1
      }
    }
  };
  
  /**
   * Output category item for categorical outputs
   */
  export interface OutputCategory {
    /** Name of the category */
    name: string;
    /** Optional description explaining what this category means */
    description?: string;
  }
  
  /**
   * Single output configuration
   */
  export interface OutputConfig {
    /** Name for the output column */
    name: string;
    /** Prompt text to send to the LLM */
    prompt: string;
    /** Type of expected output from the LLM */
    outputType: "category" | "number" | "url" | "text" | "date";
    /** Cardinality: single (default) or multiple values */
    outputCardinality?: "single" | "multiple";
    /** Categories for structured categorical outputs (required when outputType is 'category') */
    outputCategories?: OutputCategory[];
  }
  
  /**
   * Complete AIEnrichmentBlock Configuration
   */
  export interface AIEnrichmentBlockConfig {
    /** Name of the integration */
    integrationName: string;
    /** Maximum budget the user is willing to spend */
    budget?: number;
    /** The LLM model to use */
    model: string;
    /** Randomness control (0-1, higher is more random) */
    temperature?: number;
    /** Processing mode */
    mode: "preview" | "full";
    /** Number of rows to process in preview mode */
    previewRowCount?: number;
    /** How to structure the output */
    outputFormat: "newColumns" | "newRows";
    /** If true, combine all outputs for a row into a single provider request using a merged JSON schema */
    combineOutputs?: boolean;
    /** Dataset columns to include as context */
    contextColumns?: string[];
    /** Output column configurations */
    outputs: OutputConfig[];
  }
  
  /**
   * Validate if the configuration requires outputCategories but doesn't provide them
   */
  export function validateOutputCategories(config: AIEnrichmentBlockConfig): boolean {
    return config.outputs.every(output => {
      if (output.outputType === "category") {
        return Array.isArray(output.outputCategories) && output.outputCategories.length > 0;
      }
      return true;
    });
  }
  