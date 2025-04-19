import { describe, it, expect } from 'vitest';
import { automationTasksExample } from '../AIEnrichmentBlock_example';
import { AIEnrichmentBlockConfig } from '../../schemas/AIEnrichmentBlockSchema';

describe('AIEnrichmentBlock_example', () => {
  it('should have valid configuration structure', () => {
    // Check that the example conforms to the AIEnrichmentBlockConfig schema
    const config: AIEnrichmentBlockConfig = automationTasksExample;
    
    // Check basic structure
    expect(config).toBeDefined();
    expect(config.integrationName).toBe('myOpenAI');
    expect(config.model).toBe('gpt4o');
    expect(config.mode).toBe('preview');
    expect(config.outputFormat).toBe('newRows');
    
    // Check temperature is valid
    expect(config.temperature).toBe(0.2);
    expect(config.temperature).toBeGreaterThanOrEqual(0);
    expect(config.temperature).toBeLessThanOrEqual(1);
    
    // Check preview row count
    expect(config.previewRowCount).toBe(3);
    
    // Check context columns
    expect(config.contextColumns).toContain('nace');
    expect(config.contextColumns).toContain('isco');
    
    // Check outputs array structure
    expect(Array.isArray(config.outputs)).toBe(true);
    expect(config.outputs.length).toBe(2);
    
    // Validate first output (automation_tasks)
    const firstOutput = config.outputs[0];
    expect(firstOutput.name).toBe('automation_tasks');
    expect(firstOutput.outputType).toBe('text');
    expect(firstOutput.prompt).toContain("identify 5 specific tasks");
    expect(firstOutput.prompt).toContain("{nace}");
    expect(firstOutput.prompt).toContain("{isco}");
    
    // Validate second output (novelty_rating)
    const secondOutput = config.outputs[1];
    expect(secondOutput.name).toBe('novelty_rating');
    expect(secondOutput.outputType).toBe('singleCategory');
    expect(secondOutput.prompt).toContain("evaluate how novel");
    expect(secondOutput.prompt).toContain("{nace}");
    expect(secondOutput.prompt).toContain("{isco}");
    
    // Validate categories for the second output
    expect(Array.isArray(secondOutput.outputCategories)).toBe(true);
    expect(secondOutput.outputCategories?.length).toBeGreaterThan(0);
    
    // Check first category
    if (secondOutput.outputCategories && secondOutput.outputCategories.length > 0) {
      const firstCategory = secondOutput.outputCategories[0];
      expect(firstCategory.name).toBe('Very Novel');
      expect(firstCategory.description).toContain('Highly original ideas');
    }
  });
  
  it('should have valid context substitution placeholders', () => {
    // Check that all context column placeholders in prompts are actually defined in contextColumns
    const config = automationTasksExample;
    const contextColumns = config.contextColumns || [];
    
    // Helper function to extract placeholders like {columnName} from a string
    const extractPlaceholders = (text: string): string[] => {
      const placeholderRegex = /{([^}]+)}/g;
      const matches = text.matchAll(placeholderRegex);
      return Array.from(matches).map(match => match[1]);
    };
    
    // Check each output's prompt for valid placeholders
    config.outputs.forEach(output => {
      const placeholders = extractPlaceholders(output.prompt);
      
      placeholders.forEach(placeholder => {
        expect(contextColumns).toContain(placeholder);
      });
    });
  });

  it('should have unique output names', () => {
    const config = automationTasksExample;
    const outputNames = config.outputs.map(output => output.name);
    
    // Create a Set from the array to get unique values
    const uniqueNames = new Set(outputNames);
    
    // If all names are unique, the Set size will equal the array length
    expect(uniqueNames.size).toBe(outputNames.length);
  });
  
  it('should have valid category setup for singleCategory outputs', () => {
    const config = automationTasksExample;
    
    config.outputs.forEach(output => {
      if (output.outputType === 'singleCategory') {
        // Categories should be defined and not empty
        expect(output.outputCategories).toBeDefined();
        expect(Array.isArray(output.outputCategories)).toBe(true);
        expect(output.outputCategories?.length).toBeGreaterThan(0);
        
        // Each category should have name and description
        output.outputCategories?.forEach(category => {
          expect(category.name).toBeDefined();
          expect(typeof category.name).toBe('string');
          expect(category.description).toBeDefined();
          expect(typeof category.description).toBe('string');
        });
      }
    });
  });
});
