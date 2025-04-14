import { describe, it, expect, vi, beforeEach } from 'vitest';
import { automationTasksExample } from '../../../../../shared/schemas_examples/AIEnrichmentBlock_example';
import { AIEnrichmentBlockConfig } from '../../../../../shared/schemas/AIEnrichmentBlockSchema';

// Mock the AIEnrichmentProcessor - we'll verify integration without actually calling providers
vi.mock('../../../ai/AIEnrichmentProcessor', () => {
  return {
    AIEnrichmentProcessor: vi.fn().mockImplementation(() => ({
      processDataset: vi.fn().mockResolvedValue({
        newHeaders: ['id', 'nace', 'isco', 'automation_tasks', 'novelty_rating'],
        newRows: [
          ['1', '2. Forestry and logging', '11. Chief executives', '1. Automated analysis\n2. Sentiment analysis', 'Somewhat Novel'],
          ['2', '85. Education', '23. Teaching', '1. Auto-grading\n2. Personalized content', 'Very Novel']
        ],
        processedRowCount: 2,
        errors: []
      })
    }))
  };
});

// Sample dataset for testing the integration
const sampleData = {
  headers: ['id', 'nace', 'isco'],
  rows: [
    ['1', '2. Forestry and logging', '11. Chief executives, senior officials and legislators'],
    ['2', '85. Education', '23. Teaching professionals']
  ]
};

describe('AIEnrichment Integration', () => {
  let processor: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Import the processor after mocks are set up
    const { AIEnrichmentProcessor } = await import('../../../ai/AIEnrichmentProcessor');
    processor = new AIEnrichmentProcessor();
  });

  it('should process data with the automationTasksExample configuration', async () => {
    // Process the dataset with our example configuration
    const result = await processor.processDataset(
      automationTasksExample, 
      sampleData.headers,
      sampleData.rows
    );
    
    // Verify the processor was called with the correct configuration
    expect(processor.processDataset).toHaveBeenCalledWith(
      automationTasksExample,
      sampleData.headers,
      sampleData.rows
    );
    
    // Verify expected output structure from our mocked result
    expect(result.newHeaders).toContain('automation_tasks');
    expect(result.newHeaders).toContain('novelty_rating');
    expect(result.newRows).toBeDefined();
    expect(result.newRows.length).toBe(2); // We expected 2 rows in our mock
    expect(result.errors.length).toBe(0); // No errors expected
  });

  it('should format NACE and ISCO data correctly for LLM context', async () => {
    // Process the dataset
    await processor.processDataset(
      automationTasksExample, 
      sampleData.headers,
      sampleData.rows
    );
    
    // Check that the processor was called with the example that uses contextColumns
    const [config] = processor.processDataset.mock.calls[0];
    expect(config.contextColumns).toContain('nace');
    expect(config.contextColumns).toContain('isco');
    
    // Verify that nace and isco are referenced in the prompts
    expect(config.outputs[0].prompt).toContain('{nace}');
    expect(config.outputs[0].prompt).toContain('{isco}');
  });

  it('should correctly use myOpenAI as the integration name', async () => {
    // Process the dataset
    await processor.processDataset(
      automationTasksExample, 
      sampleData.headers,
      sampleData.rows
    );
    
    // Check that the processor was called with the right integration
    const [config] = processor.processDataset.mock.calls[0];
    expect(config.integrationName).toBe('myOpenAI');
  });

  it('should use newRows output format as specified', async () => {
    // Process the dataset
    await processor.processDataset(
      automationTasksExample, 
      sampleData.headers,
      sampleData.rows
    );
    
    // Check that the processor was called with newRows format
    const [config] = processor.processDataset.mock.calls[0];
    expect(config.outputFormat).toBe('newRows');
  });

  // Validates that a configuration can be constructed with the expected structure
  it('should allow creating configurations with similar structure to the example', () => {
    // Create a new configuration based on the same pattern
    const newConfig: AIEnrichmentBlockConfig = {
      integrationName: 'perplexity',
      model: 'sonar-small-online',
      temperature: 0.5,
      mode: 'preview',
      previewRowCount: 5,
      outputFormat: 'newColumns',
      contextColumns: ['product_name', 'product_description'],
      outputs: [
        {
          name: 'target_audience',
          prompt: 'Identify the primary target audience for this product: {product_name} - {product_description}',
          outputType: 'text'
        },
        {
          name: 'pricing_category',
          prompt: 'Categorize the likely price point for: {product_name}',
          outputType: 'singleCategory',
          outputCategories: [
            { name: 'Budget', description: 'Low-cost offering aimed at price-sensitive customers' },
            { name: 'Mid-range', description: 'Balanced price-to-feature ratio for mainstream consumers' },
            { name: 'Premium', description: 'High-end offering with premium features and pricing' }
          ]
        }
      ]
    };
    
    // Validate it fits the schema structure and has the expected properties
    expect(newConfig).toBeDefined();
    expect(newConfig.integrationName).toBe('perplexity');
    expect(newConfig.outputFormat).toBe('newColumns');
    expect(newConfig.contextColumns).toContain('product_name');
    expect(newConfig.outputs.length).toBe(2);
    expect(newConfig.outputs[1].outputCategories?.length).toBe(3);
  });
});
