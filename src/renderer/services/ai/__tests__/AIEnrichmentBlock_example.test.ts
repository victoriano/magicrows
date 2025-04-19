import { describe, it, expect, vi, beforeEach } from 'vitest';
import { automationTasksExample } from '../../../../shared/presets_library/AIEnrichmentBlock_example';
import { AIEnrichmentProcessor } from '../AIEnrichmentProcessor';
import { AIProviderFactory } from '../AIProvider';

// Mock the entire AIProvider module
vi.mock('../AIProvider', async () => {
  const actual = await vi.importActual('../AIProvider');
  return {
    ...actual,
    AIProviderFactory: {
      getProviderByIntegration: vi.fn()
    }
  };
});

// Sample data for testing
const sampleData = {
  headers: ['id', 'nace', 'isco', 'source_api', 'automatable_task'],
  rows: [
    ['1', '2. Forestry and logging', '11. Chief executives, senior officials and legislators', 'openai', 'Analyzing satellite imagery to monitor forest health and detect potential threats'],
    ['2', '85. Education', '23. Teaching professionals', 'openai', 'Creating personalized learning materials for students'],
    ['3', '62. Computer programming', '25. Information and communications technology professionals', 'openai', 'Automating routine code testing and debugging'],
  ]
};

describe('AIEnrichmentBlock_example', () => {
  let mockProvider: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create a mock LLM provider with all the methods needed by the processor
    mockProvider = {
      processPrompt: vi.fn(),
      isConfigured: vi.fn().mockResolvedValue(true),
      getModelOptions: vi.fn().mockReturnValue(['gpt4o']),
      getProviderId: vi.fn().mockReturnValue('myOpenAI')
    };
    
    // Setup mock responses for different prompts
    mockProvider.processPrompt.mockImplementation((prompt: string) => {
      if (prompt.includes('automation_tasks')) {
        return Promise.resolve(
          "1. Automated policy document analysis and summarization\n" +
          "2. Sentiment analysis of constituent communications\n" +
          "3. Real-time speech transcription and key point extraction\n" +
          "4. Environmental data monitoring and alert systems\n" +
          "5. Automated scheduling and priority management"
        );
      } else if (prompt.includes('novelty_rating')) {
        return Promise.resolve("Somewhat Novel");
      }
      return Promise.resolve("Default mock response");
    });
    
    // Mock the factory to return our mock provider
    vi.mocked(AIProviderFactory.getProviderByIntegration).mockResolvedValue(mockProvider);
  });

  it('should have a valid configuration structure', () => {
    // Check basic structure
    expect(automationTasksExample).toBeDefined();
    expect(automationTasksExample.integrationName).toBe('myOpenAI');
    expect(automationTasksExample.model).toBe('gpt4o');
    expect(automationTasksExample.mode).toBe('preview');
    expect(automationTasksExample.outputFormat).toBe('newRows');
    
    // Check outputs
    expect(automationTasksExample.outputs.length).toBe(2);
    expect(automationTasksExample.outputs[0].name).toBe('automation_tasks');
    expect(automationTasksExample.outputs[0].outputType).toBe('text');
    expect(automationTasksExample.outputs[1].name).toBe('novelty_rating');
    expect(automationTasksExample.outputs[1].outputType).toBe('singleCategory');
    
    // Check context columns
    expect(automationTasksExample.contextColumns).toContain('nace');
    expect(automationTasksExample.contextColumns).toContain('isco');
  });

  it('should process data correctly in preview mode', async () => {
    const processor = new AIEnrichmentProcessor();
    
    // Only process the preview rows (3 in this case)
    const result = await processor.processDataset(
      automationTasksExample,
      sampleData.headers,
      sampleData.rows
    );
    
    // Check that the processor called the LLM provider
    expect(AIProviderFactory.getProviderByIntegration).toHaveBeenCalledWith('myOpenAI');
    expect(mockProvider.processPrompt).toHaveBeenCalled();
    expect(mockProvider.isConfigured).toHaveBeenCalled();
    
    // Check the resulting headers and row count
    expect(result.newHeaders).toContain('automation_tasks');
    expect(result.newHeaders).toContain('novelty_rating');
    
    // Since we're using newRows format and processing rows, we should have new rows
    expect(result.newRows && result.newRows.length).toBeGreaterThan(0);
  });

  it('should substitute context columns in prompts', async () => {
    const processor = new AIEnrichmentProcessor();
    
    await processor.processDataset(
      automationTasksExample,
      sampleData.headers,
      sampleData.rows.slice(0, 1) // Just process the first row for this test
    );
    
    // Check that the provider was called with substituted values
    const callArgs = mockProvider.processPrompt.mock.calls[0][0];
    
    // The context column values should be substituted
    expect(callArgs).toContain('2. Forestry and logging'); // nace value
    expect(callArgs).toContain('11. Chief executives, senior officials and legislators'); // isco value
    
    // The original placeholder should not be present
    expect(callArgs).not.toContain('{nace}');
    expect(callArgs).not.toContain('{isco}');
  });

  it('should handle text output formatting correctly', async () => {
    const processor = new AIEnrichmentProcessor();
    
    const result = await processor.processDataset(
      automationTasksExample,
      sampleData.headers,
      sampleData.rows.slice(0, 1) // Just process the first row
    );
    
    // Find the enriched row in newRows
    expect(result.newRows).toBeDefined();
    const newRows = result.newRows as string[][];
    const newRowIndex = result.newHeaders!.indexOf('automation_tasks');
    
    // Find a row that contains automation tasks
    const enrichedRow = newRows.find(row => 
      row[newRowIndex] && row[newRowIndex].includes('Automated policy document analysis')
    );
    
    // Check the content of the automation_tasks column
    expect(enrichedRow).toBeDefined();
    expect(enrichedRow![newRowIndex]).toContain('Automated policy document analysis');
    expect(enrichedRow![newRowIndex]).toContain('Sentiment analysis of constituent communications');
    expect(enrichedRow![newRowIndex].split('\n').length).toBe(5); // Should have 5 tasks
  });

  it('should handle singleCategory output formatting correctly', async () => {
    const processor = new AIEnrichmentProcessor();
    
    const result = await processor.processDataset(
      automationTasksExample,
      sampleData.headers,
      sampleData.rows.slice(0, 1) // Just process the first row
    );
    
    // Find the enriched row in newRows
    expect(result.newRows).toBeDefined();
    const newRows = result.newRows as string[][];
    const ratingIndex = result.newHeaders!.indexOf('novelty_rating');
    
    // Find a row that contains novelty rating
    const enrichedRow = newRows.find(row => 
      row[ratingIndex] === 'Somewhat Novel'
    );
    
    // Check the content of the novelty_rating column
    expect(enrichedRow).toBeDefined();
    expect(enrichedRow![ratingIndex]).toBe('Somewhat Novel');
  });

  it('should preserve original data in newRows format', async () => {
    const processor = new AIEnrichmentProcessor();
    
    const result = await processor.processDataset(
      automationTasksExample,
      sampleData.headers,
      sampleData.rows.slice(0, 1) // Just process the first row
    );
    
    // Check that we have rows in the result
    expect(result.newRows).toBeDefined();
    const newRows = result.newRows as string[][];
    
    // Find the original column indices in the new headers
    const idIndex = result.newHeaders!.indexOf('id');
    const naceIndex = result.newHeaders!.indexOf('nace');
    const iscoIndex = result.newHeaders!.indexOf('isco');
    
    // Find the original row values in the new rows
    const originalData = sampleData.rows[0];
    const rowWithOriginalData = newRows.find(row => 
      row[idIndex] === originalData[0] && 
      row[naceIndex] === originalData[1] && 
      row[iscoIndex] === originalData[2]
    );
    
    // Verify the original data is preserved
    expect(rowWithOriginalData).toBeDefined();
  });

  it('should handle errors gracefully', async () => {
    // Make the mock provider throw an error for the first call
    mockProvider.processPrompt.mockRejectedValueOnce(new Error('API Error'));
    
    const processor = new AIEnrichmentProcessor();
    
    // This should not throw but handle the error
    const result = await processor.processDataset(
      automationTasksExample,
      sampleData.headers,
      sampleData.rows.slice(0, 1)
    );
    
    // We should still get a result, but with error information
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].error).toContain('API Error');
  });
});
