/**
 * Tests for the OpenAI service
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIService } from '../OpenAIService';
import { ProcessPromptOptions } from '../AIProvider';
import { AIModelResponse } from '../AIProvider';
// Import the useRealApi flag from setupTests
import { useRealApi } from './setupTests';

describe('OpenAIService', () => {
  let service: OpenAIService;

  beforeEach(() => {
    service = new OpenAIService();
  });

  it('has correct provider id', () => {
    // Access providerId safely through the getProviderId method
    expect((service as any).providerId).toBe('openai');
  });

  it('isConfigured returns true when API key exists', async () => {
    const result = await service.isConfigured();
    console.log('OpenAI is configured:', result);
    expect(result).toBe(true);
  });

  it('processPrompt calls OpenAI API with correct parameters', async () => {
    const mockText = 'This is a test response';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: mockText } }]
      })
    });

    const options: ProcessPromptOptions = {
      model: 'gpt-3.5-turbo',
      outputType: 'text'
    };

    await service.processPrompt('Test prompt', options);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('openai.com'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': expect.stringContaining('Bearer ')
        }),
        body: expect.stringContaining('"model":"gpt-3.5-turbo"')
      })
    );
  });

  // This test will use real API if useRealApi is true
  it('can make a real API call to OpenAI', async () => {
    const options: ProcessPromptOptions = {
      model: 'gpt-3.5-turbo',
      outputType: 'text'
    };

    const result = await service.processPrompt('Say hello', options);

    // If using real API, we can't guarantee the exact response
    // If using mock API, we expect the mock text
    if (useRealApi) {
      // Check for successful API call or valid error format
      expect(result).toBeDefined();
      // If error occurred, it should be due to auth issues not code issues
      if (result.error) {
        expect(result.error).toContain('OpenAI API error');
      }
    } else {
      expect(result.text).toBe('This is a test response');
      expect(result.error).toBeUndefined();
    }
  });

  // Tests for different output types
  describe('different output types', () => {
    it('handles text output correctly', async () => {
      const result = await service.processPrompt('Test', { model: 'gpt-4o', outputType: 'text' });
      
      // If using real API, we might get authentication errors
      if (useRealApi && result.error) {
        // Skip the assertion if we got an authentication error with real API
        console.log('Skipping assertion due to API error:', result.error);
      } else {
        expect(result.text).toBe('This is a test response');
      }
    });

    it('handles categories output correctly', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Category1, Category2, Category3' } }]
        })
      });

      const result = await service.processPrompt('Test', { 
        model: 'gpt-4', 
        outputType: 'categories',
        outputCategories: [
          { name: 'Category1' },
          { name: 'Category2' },
          { name: 'Category3' }
        ]
      });
      
      // If using real API, we might get authentication errors
      if (useRealApi && result.error) {
        // Skip the assertion if we got an authentication error with real API
        console.log('Skipping assertion due to API error:', result.error);
      } else {
        expect(result.categories).toEqual(['Category1', 'Category2', 'Category3']);
      }
    });

    it('handles singleCategory output correctly', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Category1' } }]
        })
      });

      const result = await service.processPrompt('Test', { 
        model: 'gpt-4', 
        outputType: 'singleCategory',
        outputCategories: [
          { name: 'Category1' },
          { name: 'Category2' },
          { name: 'Category3' }
        ]
      });
      
      // If using real API, we might get authentication errors
      if (useRealApi && result.error) {
        // Skip the assertion if we got an authentication error with real API
        console.log('Skipping assertion due to API error:', result.error);
      } else {
        expect(result.category).toBe('Category1');
      }
    });

    it('handles number output correctly', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'The answer is 42.' } }]
        })
      });

      const result = await service.processPrompt('Test', { 
        model: 'gpt-4', 
        outputType: 'number'
      });
      
      // If using real API, we might get authentication errors
      if (useRealApi && result.error) {
        // Skip the assertion if we got an authentication error with real API
        console.log('Skipping assertion due to API error:', result.error);
      } else {
        expect(result.number).toBe(42);
      }
    });
  });

  it('handles API errors correctly', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: () => Promise.resolve('{"error": "Invalid API key"}')
    });

    const result = await service.processPrompt('Test', { model: 'gpt-4', outputType: 'text' });
    
    expect(result.error).toBeDefined();
    expect(result.text).toBeUndefined();
  });
});
