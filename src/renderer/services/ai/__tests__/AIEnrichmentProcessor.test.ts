import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIEnrichmentProcessor } from '../AIEnrichmentProcessor';
import { AIProviderFactory } from '../AIProvider';
import { AIEnrichmentBlockConfig } from '../../../../shared/schemas/AIEnrichmentBlockSchema';

// Mock the AIProviderFactory and its methods
vi.mock('../AIProvider', () => {
  const mockProcessPrompt = vi.fn().mockImplementation(async (prompt, options) => {
    // Return different responses based on output type
    switch (options.outputType) {
      case 'text':
        return { text: `Mock response for: ${prompt}` };
      case 'number':
        return { number: 42 };
      case 'singleCategory':
        return { category: 'Category A' };
      case 'categories':
        return { categories: ['Category A', 'Category B'] };
      case 'url':
        return { url: 'https://example.com' };
      case 'date':
        return { date: '2025-04-15' };
      default:
        return { text: 'Default response' };
    }
  });

  const mockIsConfigured = vi.fn().mockResolvedValue(true);
  
  const mockProvider = {
    processPrompt: mockProcessPrompt,
    isConfigured: mockIsConfigured
  };

  return {
    AIProviderFactory: vi.fn().mockImplementation(() => {
      return {
        getProviderByIntegration: vi.fn().mockImplementation((integrationName) => {
          if (integrationName === 'error-provider') {
            return {
              isConfigured: vi.fn().mockResolvedValue(false),
              processPrompt: vi.fn()
            };
          }
          return mockProvider;
        })
      };
    })
  };
});

describe('AIEnrichmentProcessor', () => {
  let processor: AIEnrichmentProcessor;
  let mockConfig: AIEnrichmentBlockConfig;
  let headers: string[];
  let rows: string[][];

  beforeEach(() => {
    processor = new AIEnrichmentProcessor();
    
    headers = ['id', 'name', 'description'];
    rows = [
      ['1', 'Product A', 'This is product A'],
      ['2', 'Product B', 'This is product B'],
      ['3', 'Product C', 'This is product C'],
      ['4', 'Product D', 'This is product D'],
      ['5', 'Product E', 'This is product E'],
    ];
    
    mockConfig = {
      integrationName: 'openai',
      model: 'gpt-3.5-turbo',
      mode: 'preview',
      previewRowCount: 2,
      outputFormat: 'newColumns',
      outputs: [
        {
          name: 'Summary',
          prompt: 'Summarize: {{description}}',
          outputType: 'text'
        },
        {
          name: 'Price',
          prompt: 'Suggest a price for: {{name}}',
          outputType: 'number'
        }
      ]
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should process data in preview mode with newColumns format', async () => {
    const result = await processor.processDataset(mockConfig, headers, rows);
    
    // Check that only the first 2 rows were processed (preview mode)
    expect(result.processedRowCount).toBe(2);
    
    // Check new headers format
    expect(result.newHeaders).toEqual([...headers, 'Summary', 'Price']);
    
    // Check that all original rows are preserved with new columns added
    expect(result.newRows?.length).toBe(rows.length);
    
    // First two rows should have AI-generated content
    expect(result.newRows?.[0][3]).toContain('Mock response for: Summarize:');
    expect(result.newRows?.[0][4]).toBe('42');
    
    // Rows beyond preview count should have empty values in new columns
    expect(result.newRows?.[2][3]).toBe('');
    expect(result.newRows?.[2][4]).toBe('');
  });

  it('should process data in full mode', async () => {
    mockConfig.mode = 'full';
    
    const result = await processor.processDataset(mockConfig, headers, rows);
    
    // Check that all rows were processed (full mode)
    expect(result.processedRowCount).toBe(rows.length);
    
    // All rows should have AI-generated content
    for (let i = 0; i < rows.length; i++) {
      expect(result.newRows?.[i][3]).toContain('Mock response for:');
      expect(result.newRows?.[i][4]).toBe('42');
    }
  });

  it('should process data with newRows format', async () => {
    mockConfig.outputFormat = 'newRows';
    mockConfig.previewRowCount = 1; // Only process 1 row for simplicity
    
    const result = await processor.processDataset(mockConfig, headers, rows);
    
    // Check new headers format
    expect(result.newHeaders).toEqual([...headers, 'output_name', 'output_value']);
    
    // Check that we have 2 new rows for the 1 processed row (1 processed row * 2 outputs)
    expect(result.newRows?.length).toBe(2);
    
    // Each output gets its own row
    expect(result.newRows?.[0][3]).toBe('Summary');
    expect(result.newRows?.[0][4]).toContain('Mock response for:');
    
    expect(result.newRows?.[1][3]).toBe('Price');
    expect(result.newRows?.[1][4]).toBe('42');
  });

  it('should handle context column substitutions', async () => {
    // Add context columns
    mockConfig.contextColumns = ['name'];
    mockConfig.outputs[0].prompt = 'Summarize {{name}}: {{description}}';
    
    const result = await processor.processDataset(mockConfig, headers, rows);
    
    // Check that context columns are properly substituted in the prompt
    expect(result.newRows?.[0][3]).toContain('Mock response for: Summarize Product A:');
  });

  it('should handle errors when provider is not configured', async () => {
    mockConfig.integrationName = 'error-provider';
    
    await expect(processor.processDataset(mockConfig, headers, rows))
      .rejects.toThrow('AI provider error-provider is not configured');
  });
});
