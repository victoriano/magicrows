import { AIEnrichmentBlockConfig, OutputConfig } from '../../../shared/schemas/AIEnrichmentBlockSchema';
import { AIModelResponse, ProcessPromptOptions } from './AIProvider';
import { AIProviderFactory } from './AIProvider';
import { ensureProvidersInitialized } from './initProviders';

/**
 * Interface representing a row of data with its context
 */
interface DataRowContext {
  rowIndex: number;
  headers: string[];
  rowData: string[];
  contextData?: Record<string, string>;
}

/**
 * Result of processing a single output through AI
 */
interface OutputProcessingResult {
  outputName: string;
  outputType: OutputConfig['outputType'];
  outputCardinality?: OutputConfig['outputCardinality'];
  response: AIModelResponse;
}

/**
 * Complete result for a single row's processing
 */
interface RowProcessingResult {
  rowIndex: number;
  outputs: OutputProcessingResult[];
  error?: string;
}

/**
 * Final result after processing a dataset
 */
export interface EnrichmentProcessingResult {
  newHeaders?: string[];
  newRows?: string[][];
  processedRowCount: number;
  errors: {
    rowIndex: number;
    error: string;
  }[];
}

/**
 * Processor for AI enrichment operations
 * Handles dataset processing through AI services according to configuration
 */
export class AIEnrichmentProcessor {
  constructor() {
    // No need to create an instance of the factory anymore
  }

  /**
   * Process a dataset using AI according to the configuration
   * @param config The AI enrichment configuration
   * @param headers The headers of the dataset
   * @param rows The rows of the dataset
   * @returns The processing result with new data
   */
  async processDataset(
    config: AIEnrichmentBlockConfig, 
    headers: string[], 
    rows: string[][]
  ): Promise<EnrichmentProcessingResult> {
    // Ensure that all provider integrations are registered with the latest Redux state.
    // This is important because initProviders.ts may run before the Redux state is rehydrated,
    // causing named integrations (e.g. "myOpenai") to be missing. Calling this function here
    // guarantees that the most up‑to‑date provider list is (re)registered before we attempt
    // to fetch a provider.
    ensureProvidersInitialized();

    // Validate inputs
    if (!config || !headers || !rows || rows.length === 0) {
      throw new Error('Invalid input: configuration, headers, and rows are required');
    }

    console.log(`Starting AI enrichment processing with ${config.integrationName}`);
    
    // DETAILED DEBUGGING
    console.log('PROVIDER DEBUG: All registered provider integrations:', 
      Array.from(AIProviderFactory.getAllProviderIntegrations().keys()));
    console.log('PROVIDER DEBUG: All registered provider types:', 
      Array.from(AIProviderFactory.getAllProviders()).keys());
    
    // Get the AI provider using the static method
    const provider = AIProviderFactory.getProviderByIntegration(config.integrationName);
    
    if (!provider) {
      console.error(`PROVIDER DEBUG: Provider not found for integration: ${config.integrationName}`);
      throw new Error(`AI provider not found for integration: ${config.integrationName}`);
    }
    
    console.log(`PROVIDER DEBUG: Provider found for integration: ${config.integrationName}`);
    console.log(`PROVIDER DEBUG: Provider ID:`, (provider as any).providerId || 'unknown');
    
    // Check if the provider is configured
    const isConfigured = await provider.isConfigured();
    console.log(`PROVIDER DEBUG: Provider ${config.integrationName} configured:`, isConfigured);
    
    if (!isConfigured) {
      try {
        const hasKey = await window.electronAPI.secureStorage.hasApiKey(config.integrationName);
        console.log(`PROVIDER DEBUG: Direct storage check for ${config.integrationName}:`, hasKey);
        
        // Try also with different variations
        const hasGenericKey = await window.electronAPI.secureStorage.hasApiKey(
          config.integrationName.toLowerCase().includes('openai') ? 'openai' : 
          config.integrationName.toLowerCase().includes('perplexity') ? 'perplexity' : 
          'unknown'
        );
        console.log(`PROVIDER DEBUG: Direct storage check for generic key:`, hasGenericKey);
        
        // Show available keys in storage
        console.log(`PROVIDER DEBUG: Available provider IDs in Redux store:`, 
          'Cannot list all keys - API doesn\'t support this');
      } catch (error) {
        console.error('PROVIDER DEBUG: Error checking API keys:', error);
      }
      
      throw new Error(`AI provider ${config.integrationName} is not configured`);
    }

    // Determine which rows to process based on mode
    const rowsToProcess = this.getRowsToProcess(rows, config);
    console.log(`Processing ${rowsToProcess.length} rows`);

    // Create context data for each row if context columns are specified
    const contextColumnIndices = this.getContextColumnIndices(headers, config.contextColumns);
    
    // Process each row
    const rowResults: RowProcessingResult[] = [];
    for (const rowIndex of rowsToProcess) {
      try {
        const rowContext = this.createRowContext(rowIndex, headers, rows[rowIndex], contextColumnIndices);
        const rowResult = await this.processRow(rowContext, config, provider);
        rowResults.push(rowResult);
      } catch (error) {
        console.error(`Error processing row ${rowIndex}:`, error);
        rowResults.push({
          rowIndex,
          outputs: [],
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Format results according to outputFormat
    return this.formatResults(rowResults, config, headers, rows);
  }

  /**
   * Process a single row using AI
   * @param rowContext Context for the current row
   * @param config The AI enrichment configuration
   * @param provider The AI provider to use
   * @returns The processing result for this row
   */
  private async processRow(
    rowContext: DataRowContext,
    config: AIEnrichmentBlockConfig,
    provider: any
  ): Promise<RowProcessingResult> {
    if (config.combineOutputs !== false) {
      return this.processRowCombined(rowContext, config, provider);
    }

    const outputs: OutputProcessingResult[] = [];
    
    // Process each output configuration
    for (const outputConfig of config.outputs) {
      try {
        const prompt = this.generatePrompt(outputConfig.prompt, rowContext);
        
        const options: ProcessPromptOptions = {
          model: config.model,
          temperature: config.temperature || 0.2,
          outputType: outputConfig.outputType,
          outputCategories: outputConfig.outputCategories,
          outputCardinality: outputConfig.outputCardinality
        };
        
        if (outputConfig.outputCardinality === 'multiple') {
          if (outputConfig.outputType === 'number') {
            options.responseSchema = { type: 'array', items: { type: 'number' } };
          } else if (
            outputConfig.outputType === 'category' &&
            Array.isArray(outputConfig.outputCategories)
          ) {
            options.responseSchema = {
              type: 'array',
              items: { type: 'string', enum: outputConfig.outputCategories.map(cat => cat.name) }
            };
          } else if (outputConfig.outputType === 'text') {
            options.responseSchema = {
              type: 'object',
              properties: {
                reasoning: { type: 'string' },
                items: { type: 'array', items: { type: 'string' } }
              },
              required: ['reasoning', 'items'],
              additionalProperties: false
            };
          } else {
            options.responseSchema = { type: 'array', items: { type: 'string' } };
          }
        }
        
        const response = await provider.processPrompt(prompt, options);
        
        outputs.push({
          outputName: outputConfig.name,
          outputType: outputConfig.outputType,
          outputCardinality: outputConfig.outputCardinality,
          response
        });
      } catch (error) {
        console.error(`Error processing output ${outputConfig.name}:`, error);
      }
    }
    
    return {
      rowIndex: rowContext.rowIndex,
      outputs
    };
  }

  /**
   * Generate a prompt by substituting column references with actual data
   * @param promptTemplate The prompt template with column references
   * @param rowContext The row context with data
   * @returns The generated prompt
   */
  private generatePrompt(promptTemplate: string, rowContext: DataRowContext): string {
    let prompt = promptTemplate;
    
    // Replace column references with actual data, format: {{columnName}}
    const columnRegex = /\{\{([^}]+)\}\}/g;
    prompt = prompt.replace(columnRegex, (match, columnName) => {
      const columnIndex = rowContext.headers.findIndex(header => header === columnName);
      if (columnIndex >= 0 && columnIndex < rowContext.rowData.length) {
        return rowContext.rowData[columnIndex];
      }
      // If column name not found in headers, check context data
      if (rowContext.contextData && rowContext.contextData[columnName]) {
        return rowContext.contextData[columnName];
      }
      // If not found, leave the original reference
      return match;
    });
    
    return prompt;
  }

  /**
   * Determine which rows to process based on mode
   * @param rows All rows in the dataset
   * @param config The AI enrichment configuration
   * @returns Array of row indices to process
   */
  private getRowsToProcess(rows: string[][], config: AIEnrichmentBlockConfig): number[] {
    if (config.mode === 'full') {
      // Process all rows in full mode
      return Array.from({ length: rows.length }, (_, i) => i);
    } else {
      // Process only a subset in preview mode
      const previewCount = config.previewRowCount || 3; // Default to 3 rows if not specified
      const rowCount = Math.min(previewCount, rows.length);
      return Array.from({ length: rowCount }, (_, i) => i);
    }
  }

  /**
   * Get indices of context columns
   * @param headers Headers of the dataset
   * @param contextColumns Names of context columns
   * @returns Map of column names to their indices
   */
  private getContextColumnIndices(headers: string[], contextColumns?: string[]): Record<string, number> {
    if (!contextColumns || contextColumns.length === 0) {
      return {};
    }
    
    const indices: Record<string, number> = {};
    contextColumns.forEach(columnName => {
      const index = headers.findIndex(header => header === columnName);
      if (index >= 0) {
        indices[columnName] = index;
      }
    });
    
    return indices;
  }

  /**
   * Create a context object for a row
   * @param rowIndex Index of the row
   * @param headers Headers of the dataset
   * @param rowData Data of the row
   * @param contextColumnIndices Indices of context columns
   * @returns Row context object
   */
  private createRowContext(
    rowIndex: number,
    headers: string[],
    rowData: string[],
    contextColumnIndices: Record<string, number>
  ): DataRowContext {
    const context: DataRowContext = {
      rowIndex,
      headers,
      rowData
    };
    
    // Add contextData if context columns are specified
    if (Object.keys(contextColumnIndices).length > 0) {
      context.contextData = {};
      for (const [columnName, columnIndex] of Object.entries(contextColumnIndices)) {
        if (columnIndex >= 0 && columnIndex < rowData.length) {
          context.contextData[columnName] = rowData[columnIndex];
        }
      }
    }
    
    return context;
  }

  /**
   * Format the processing results according to the output format
   * @param rowResults Results for each processed row
   * @param config The AI enrichment configuration
   * @param originalHeaders Original headers of the dataset
   * @param originalRows Original rows of the dataset
   * @returns The formatted results
   */
  private formatResults(
    rowResults: RowProcessingResult[],
    config: AIEnrichmentBlockConfig,
    originalHeaders: string[],
    originalRows: string[][]
  ): EnrichmentProcessingResult {
    const errors = rowResults
      .filter(result => result.error)
      .map(result => ({
        rowIndex: result.rowIndex,
        error: result.error as string
      }));
      
    if (config.outputFormat === 'newColumns') {
      return this.formatAsNewColumns(rowResults, config, originalHeaders, originalRows, errors);
    } else {
      return this.formatAsNewRows(rowResults, config, originalHeaders, originalRows, errors);
    }
  }

  /**
   * Format results as new columns in the original dataset
   * @param rowResults Results for each processed row
   * @param config The AI enrichment configuration
   * @param originalHeaders Original headers of the dataset
   * @param originalRows Original rows of the dataset
   * @param errors Processing errors
   * @returns The formatted results
   */
  private formatAsNewColumns(
    rowResults: RowProcessingResult[],
    config: AIEnrichmentBlockConfig,
    originalHeaders: string[],
    originalRows: string[][],
    errors: { rowIndex: number; error: string }[]
  ): EnrichmentProcessingResult {
    // --- Build headers: original + output columns + reasoning columns (if any) ---
    const newHeaders = [...originalHeaders];
    // Keep an ordered list of output names for later lookup
    const outputNames: string[] = [];
    config.outputs.forEach(output => {
      newHeaders.push(output.name);
      outputNames.push(output.name);
    });

    // Detect which outputs actually provide reasoning so we can add *_reasoning columns
    const outputReasoningFields = new Set<string>();
    rowResults.forEach(rowResult => {
      rowResult.outputs.forEach(output => {
        if (
          output.response.reasoning !== undefined ||
          (output.outputType === 'category' && output.response.category !== undefined) ||
          (output.response.structuredData && output.response.structuredData.reasoning !== undefined) ||
          (output.outputType === 'text' && output.outputCardinality === 'multiple')
        ) {
          outputReasoningFields.add(`${output.outputName}_reasoning`);
        }
      });
    });

    const reasoningHeaders = Array.from(outputReasoningFields);
    newHeaders.push(...reasoningHeaders);

    // --- Build rows ---
    const newRows = originalRows.map((originalRow, rowIndex) => {
      const rowResult = rowResults.find(result => result.rowIndex === rowIndex);

      // Placeholders for each section
      const emptyOutputs = outputNames.map(() => '');
      const emptyReasonings = reasoningHeaders.map(() => '');

      // Skip rows that failed or were not processed
      if (!rowResult || rowResult.error) {
        return [...originalRow, ...emptyOutputs, ...emptyReasonings];
      }

      // Map outputs by name for quick lookup
      const outputsByName = new Map<string, OutputProcessingResult>();
      rowResult.outputs.forEach(o => outputsByName.set(o.outputName, o));

      // Output columns
      const outputValues = outputNames.map(name => {
        const out = outputsByName.get(name);
        return out ? this.formatOutputValue(out.response) : '';
      });

      // Reasoning columns
      const reasoningValues = reasoningHeaders.map(reasoningHeader => {
        const baseName = reasoningHeader.replace('_reasoning', '');
        const output = outputsByName.get(baseName);

        if (!output) return '';

        const resp = output.response;
        if (resp.reasoning) return resp.reasoning;
        if (resp.structuredData && resp.structuredData.reasoning) return resp.structuredData.reasoning;
        if (
          resp.structuredData &&
          output.outputType === 'text' &&
          output.outputCardinality === 'multiple' &&
          resp.structuredData.reasoning
        ) {
          return resp.structuredData.reasoning;
        }
        return '';
      });

      return [...originalRow, ...outputValues, ...reasoningValues];
    });

    return {
      newHeaders,
      newRows,
      processedRowCount: rowResults.length,
      errors
    };
  }

  /**
   * Format results as new rows in the dataset
   * @param rowResults Results for each processed row
   * @param config The AI enrichment configuration
   * @param originalHeaders Original headers of the dataset
   * @param originalRows Original rows of the dataset
   * @param errors Processing errors
   * @returns The formatted results
   */
  private formatAsNewRows(
    rowResults: RowProcessingResult[],
    config: AIEnrichmentBlockConfig,
    originalHeaders: string[],
    originalRows: string[][],
    errors: { rowIndex: number; error: string }[]
  ): EnrichmentProcessingResult {
    // First collect all unique output names to create our header structure
    const outputFields = new Set<string>();
    const outputReasoningFields = new Set<string>();
    
    rowResults.forEach(rowResult => {
      rowResult.outputs.forEach(output => {
        // Add the output field name
        outputFields.add(output.outputName);
        
        // Check for reasoning in various places
        if (output.response.reasoning !== undefined || 
           (output.outputType === 'category' && output.response.category !== undefined) ||
           (output.response.structuredData && output.response.structuredData.reasoning !== undefined) ||
           (output.outputType === 'text' && output.outputCardinality === 'multiple')) {
          outputReasoningFields.add(`${output.outputName}_reasoning`);
        }
      });
    });
    
    // Create the new headers by adding all unique output fields and reasoning fields
    const newHeaders = [
      ...originalHeaders,
      ...Array.from(outputFields),
      ...Array.from(outputReasoningFields)
    ];
    
    const newRows: string[][] = [];
    
    // Process each result row
    rowResults.forEach(rowResult => {
      if (rowResult.error) return; // Skip rows with errors
      
      const originalRow = originalRows[rowResult.rowIndex];
      
      // For each output field, create a new row in the result
      const outputsByName = new Map<string, OutputProcessingResult>();
      rowResult.outputs.forEach(output => {
        outputsByName.set(output.outputName, output);
      });
      
      // Determine how many sub‑rows we need (max length across multi outputs)
      let subRowCount = 1;
      outputsByName.forEach(o => {
        if (o.outputCardinality === 'multiple' && Array.isArray(o.response.items)) {
          subRowCount = Math.max(subRowCount, o.response.items.length);
        }
      });

      for (let idx = 0; idx < subRowCount; idx++) {
        const newRow: string[] = [...originalRow];

        // Add values for each output field
        outputFields.forEach(fieldName => {
          const output = outputsByName.get(fieldName);
          if (!output) {
            newRow.push('');
            return;
          }

          if (output.outputCardinality === 'multiple' && Array.isArray(output.response.items)) {
            newRow.push(output.response.items[idx] !== undefined ? String(output.response.items[idx]) : '');
          } else {
            // single value – repeat across all sub‑rows for consistency
            newRow.push(this.formatOutputValue(output.response));
          }
        });

        // Add reasoning columns (repeat reasoning even for sub‑rows)
        outputReasoningFields.forEach(reasoningField => {
          const fieldName = reasoningField.replace('_reasoning', '');
          const output = outputsByName.get(fieldName);
          if (!output) {
            newRow.push('');
            return;
          }
          const reasoning = output.response.reasoning ?? output.response.structuredData?.reasoning ?? '';
          newRow.push(reasoning);
        });

        newRows.push(newRow);
      }
    });

    return {
      newHeaders,
      newRows,
      processedRowCount: rowResults.length,
      errors
    };
  }

  private formatOutputValue(response: AIModelResponse): string {
    if (response.error) {
      return `Error: ${response.error}`;
    }

    if (response.category !== undefined) {
      return response.category;
    }

    if (response.text !== undefined) {
      return response.text;
    }

    if (response.items !== undefined) {
      return Array.isArray(response.items) ? JSON.stringify(response.items) : String(response.items);
    }

    if (response.structuredData) {
      if (response.structuredData.text && Array.isArray(response.structuredData.text)) {
        return JSON.stringify(response.structuredData.text);
      }
      if (response.structuredData.tasks && Array.isArray(response.structuredData.tasks)) {
        return JSON.stringify(response.structuredData.tasks);
      }
      if (response.structuredData.response) {
        return String(response.structuredData.response);
      }
      try {
        const jsonStr = JSON.stringify(response.structuredData);
        return jsonStr.length > 80 ? jsonStr.substring(0, 77) + '…' : jsonStr;
      } catch {
        return String(response.structuredData);
      }
    }

    if (response.number !== undefined) {
      return response.number.toString();
    }

    if (response.categories !== undefined) {
      return response.categories.join(', ');
    }

    if (response.url !== undefined) {
      return response.url;
    }

    if (response.date !== undefined) {
      return response.date;
    }

    return '';
  }

  // ----- Combined‑outputs branch -----

  private async processRowCombined(
    rowContext: DataRowContext,
    config: AIEnrichmentBlockConfig,
    provider: any
  ): Promise<RowProcessingResult> {
    const combinedPrompt = this.buildCombinedPrompt(rowContext, config);
    const combinedSchema = this.buildCombinedSchema(config);

    const options: ProcessPromptOptions = {
      model: config.model,
      temperature: config.temperature || 0.2,
      outputType: 'text', // placeholder; combined schema defines exact types
      responseSchema: combinedSchema
    };

    let aiResp: AIModelResponse;
    try {
      aiResp = await provider.processPrompt(combinedPrompt, options);
    } catch (err) {
      return { rowIndex: rowContext.rowIndex, outputs: [], error: String(err) };
    }

    const structured = (aiResp.structuredData ?? {}) as Record<string, any>;

    const outputs: OutputProcessingResult[] = config.outputs.map(outputConfig => {
      const chunk = structured[outputConfig.name] ?? {};

      const resp: AIModelResponse = {
        structuredData: chunk,
        reasoning: chunk.reasoning,
        category: chunk.category,
        text: chunk.text,
        items: chunk.items,
        number: chunk.number,
        url: chunk.url,
        date: chunk.date
      };

      return {
        outputName: outputConfig.name,
        outputType: outputConfig.outputType,
        outputCardinality: outputConfig.outputCardinality,
        response: resp
      };
    });

    return { rowIndex: rowContext.rowIndex, outputs };
  }

  private buildCombinedPrompt(rowContext: DataRowContext, config: AIEnrichmentBlockConfig): string {
    const sections = config.outputs.map(o => {
      const p = this.generatePrompt(o.prompt, rowContext);
      return `### ${o.name}\n${p}`;
    });
    return sections.join('\n\n');
  }

  private buildCombinedSchema(config: AIEnrichmentBlockConfig): any {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    config.outputs.forEach(o => {
      required.push(o.name);

      if (o.outputType === 'category') {
        const enumVals = o.outputCategories?.map(c => c.name);
        properties[o.name] = {
          type: 'object',
          properties: {
            reasoning: { type: 'string' },
            category: enumVals ? { type: 'string', enum: enumVals } : { type: 'string' }
          },
          required: ['reasoning', 'category'],
          additionalProperties: false
        };
      } else if (o.outputType === 'number') {
        if (o.outputCardinality === 'multiple') {
          properties[o.name] = {
            type: 'object',
            properties: {
              reasoning: { type: 'string' },
              items: { type: 'array', items: { type: 'number' } }
            },
            required: ['reasoning', 'items'],
            additionalProperties: false
          };
        } else {
          properties[o.name] = {
            type: 'object',
            properties: {
              reasoning: { type: 'string' },
              number: { type: 'number' }
            },
            required: ['reasoning', 'number'],
            additionalProperties: false
          };
        }
      } else if (o.outputType === 'text') {
        if (o.outputCardinality === 'multiple') {
          properties[o.name] = {
            type: 'object',
            properties: {
              reasoning: { type: 'string' },
              items: { type: 'array', items: { type: 'string' } }
            },
            required: ['reasoning', 'items'],
            additionalProperties: false
          };
        } else {
          properties[o.name] = {
            type: 'object',
            properties: {
              reasoning: { type: 'string' },
              text: { type: 'string' }
            },
            required: ['reasoning', 'text'],
            additionalProperties: false
          };
        }
      } else if (o.outputType === 'url') {
        properties[o.name] = {
          type: 'object',
          properties: {
            reasoning: { type: 'string' },
            url: { type: 'string', format: 'uri' }
          },
          required: ['reasoning', 'url'],
          additionalProperties: false
        };
      } else if (o.outputType === 'date') {
        properties[o.name] = {
          type: 'object',
          properties: {
            reasoning: { type: 'string' },
            date: { type: 'string', format: 'date' }
          },
          required: ['reasoning', 'date'],
          additionalProperties: false
        };
      } else {
        properties[o.name] = { type: 'object', additionalProperties: true };
      }
    });

    return {
      type: 'object',
      properties,
      required,
      additionalProperties: false
    };
  }
}