import { AIEnrichmentBlockConfig, OutputConfig } from '../../../shared/schemas/AIEnrichmentBlockSchema';
import { AIModelResponse, BaseAIProvider, ProcessPromptOptions } from './AIProvider';

/**
 * OpenAI service implementation
 * Handles API interactions with the OpenAI platform
 */
export class OpenAIService extends BaseAIProvider {
  // Valid OpenAI models for enrichment tasks
  private static readonly SUPPORTED_MODELS = [
    'gpt-4.1',
    'gpt-4.1-mini',
    'gpt-4.1-nano',
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-3.5-turbo',
    'o1',
    'o1-mini',
    'o1-pro',
    'o3',
    'o3-mini',
    'o4-mini'
  ];

  /**
   * Create a new OpenAI service
   * @param providerId The provider ID to use for API key lookup (defaults to 'openai')
   */
  constructor(providerId: string = 'openai') {
    super(providerId);
    console.log(`OpenAIService created with providerId: ${providerId}`);
  }

  /**
   * Get list of available OpenAI models
   */
  async getModelList(): Promise<string[]> {
    // For now, return the static list of supported models
    // In a production app, you might want to fetch this from OpenAI's API
    return Promise.resolve([...OpenAIService.SUPPORTED_MODELS]);
  }

  /**
   * Process a prompt with the OpenAI API
   * @param prompt The prompt to send to the model
   * @param options Options for processing the prompt
   * @returns Promise with the AI model response
   */
  async processPrompt(prompt: string, options: ProcessPromptOptions): Promise<AIModelResponse> {
    try {
      // Get the API key
      const apiKey = await this.getApiKey();
      console.log('Getting OpenAI API key:');
      console.log(`- Prefix: ${apiKey.substring(0, 12)}...`);
      console.log(`- Length: ${apiKey.length} characters`);
      console.log(`- Contains whitespace: ${apiKey.includes(' ')}`);
      console.log(`- Format appears to be: ${apiKey.startsWith('sk-proj-') ? 'Project key' : 'Standard key'}`);
      
      console.log(`Using OpenAI API key: ${apiKey.substring(0, 12)}...${apiKey.substring(apiKey.length - 4)}`);
      
      // For OpenAI API we need a clean API key without any whitespace
      const cleanApiKey = apiKey.trim();

      // Build the appropriate system message based on output type
      const systemMessage = this.buildSystemMessage(options);
      
      // Prepare the messages array - exactly like the working curl command
      const messages = [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt }
      ];

      // Use the proper API endpoint - exactly as in the curl command
      const apiEndpoint = 'https://api.openai.com/v1/chat/completions';
      console.log('Using OpenAI API endpoint:', apiEndpoint);

      // Prepare the request body - exactly like the working curl command
      const requestBody = JSON.stringify({
        model: options.model,
        messages: messages,
        temperature: options.temperature || 0.2,
        max_tokens: 1000,
        n: 1,
        stream: false
      });
      
      // Log the request details (with sensitive info masked)
      console.log('OpenAI API Request:', {
        url: apiEndpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-...' // Masked for security
        },
        body: {
          model: options.model,
          messages: messages.map(m => ({ 
            role: m.role, 
            content: m.content.length > 20 ? m.content.substring(0, 20) + '...' : m.content 
          })),
          temperature: options.temperature || 0.2,
          max_tokens: 1000,
          n: 1,
          stream: false
        }
      });

      // Make the fetch request - exactly like the working curl command
      let response;
      try {
        response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${cleanApiKey}`,
            'Content-Type': 'application/json'
          },
          body: requestBody
        });
      } catch (error) {
        console.error('Network error calling OpenAI API:', error);
        throw new Error(`OpenAI API network error: ${error.message}`);
      }

      // Log the full response details for debugging
      console.log(`OpenAI API Response Status: ${response?.status} ${response?.statusText}`);
      
      // Check if response headers exist and log them
      if (response?.headers) {
        try {
          const responseHeaders: Record<string, string> = {};
          if (typeof response.headers.forEach === 'function') {
            response.headers.forEach((value: string, key: string) => {
              responseHeaders[key] = value;
            });
            console.log('OpenAI API Response Headers:', responseHeaders);
          } else {
            console.warn('Response headers exist but forEach not available');
          }
        } catch (e) {
          console.warn('Error processing response headers:', e);
        }
      } else {
        console.warn('Response headers not available');
      }
      
      // Safely attempt to read the response body for logging
      let responseText = '';
      try {
        if (response && response.text && typeof response.text === 'function') {
          // Only try to clone if it's a standard fetch Response object
          if (typeof response.clone === 'function') {
            const responseClone = response.clone();
            responseText = await responseClone.text();
          } else {
            // For non-standard response objects, try to read directly if possible
            // Note: This might consume the body, making it unavailable for later processing
            if (response.bodyUsed !== true) {
              responseText = await response.text();
            }
          }
          
          if (responseText) {
            console.log('OpenAI API Response Body (first 500 chars):', responseText.substring(0, 500));
          }
        }
      } catch (e) {
        console.warn('Error reading response text:', e);
      }

      // Check if the response was successful
      if (!response?.ok) {
        throw new Error(`OpenAI API error: ${responseText || response?.statusText || 'Unknown error'}`);
      }

      // Parse the JSON response
      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        console.warn('Error parsing JSON response:', e);
        throw new Error(`OpenAI API error: Failed to parse JSON response - ${e}`);
      }

      // Check if the response data contains expected fields
      if (!responseData?.choices?.[0]?.message?.content) {
        console.warn('Unexpected response structure:', responseData);
        // Return a safe default
        return {
          error: 'Invalid response from OpenAI API'
        };
      }

      // Get the content from the response
      const content = responseData.choices[0].message.content;
      console.log('OpenAI API response content (truncated):', content.substring(0, 100) + (content.length > 100 ? '...' : ''));
      
      // Process the content based on the output type
      return this.processOutput(content, options.outputType, options.outputCategories);
    } catch (error) {
      console.error('Error processing prompt with OpenAI:', error);
      return {
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Validate if the configuration is valid for OpenAI
   * @param config The AI enrichment configuration to validate
   */
  validateConfig(config: AIEnrichmentBlockConfig): boolean {
    const baseValidation = super.validateConfig(config);
    if (!baseValidation) return false;

    // Check if the model is supported
    return OpenAIService.SUPPORTED_MODELS.includes(config.model);
  }

  /**
   * Build a system message based on the output type
   * @param options The processing options
   */
  private buildSystemMessage(options: ProcessPromptOptions): string {
    let systemMessage = 'You are a helpful AI assistant that generates structured data. ';

    switch (options.outputType) {
      case 'text':
        systemMessage += 'Provide a clear, concise text response.';
        break;
        
      case 'categories':
        systemMessage += `Choose multiple categories from the following options: ${
          options.outputCategories?.map(c => c.name).join(', ') || 'No categories provided'
        }. Format your response as a comma-separated list without any additional text.`;
        break;
        
      case 'singleCategory':
        systemMessage += `Choose exactly one category from the following options: ${
          options.outputCategories?.map(c => c.name).join(', ') || 'No categories provided'
        }. Respond with only the chosen category name, without any additional text.`;
        break;
        
      case 'number':
        systemMessage += 'Respond with only a single numerical value, without any additional text.';
        break;
        
      case 'url':
        systemMessage += 'Respond with only a valid URL, without any additional text.';
        break;
        
      case 'date':
        systemMessage += 'Respond with only a date in ISO format (YYYY-MM-DD), without any additional text.';
        break;
        
      default:
        systemMessage += 'Provide a clear, concise response.';
        break;
    }

    return systemMessage;
  }

  /**
   * Parse the response from OpenAI based on the expected output type
   * @param content The raw content from the API response
   * @param outputType The expected output type
   * @param outputCategories Optional categories for categorical outputs
   */
  private processOutput(
    content: string, 
    outputType: OutputConfig['outputType'],
    outputCategories?: OutputConfig['outputCategories']
  ): AIModelResponse {
    try {
      const cleanedContent = content.trim();
      
      switch (outputType) {
        case 'text':
          return { text: cleanedContent };
          
        case 'singleCategory': {
          // If categories are provided, validate the response
          if (outputCategories && outputCategories.length > 0) {
            const categoryNames = outputCategories.map(c => c.name);
            // Find the first matching category (case-insensitive)
            const matchedCategory = categoryNames.find(
              name => cleanedContent.toLowerCase() === name.toLowerCase()
            );
            
            if (matchedCategory) {
              return { category: matchedCategory };
            } else {
              // Best effort: try to find the category in the response
              for (const category of categoryNames) {
                if (cleanedContent.toLowerCase().includes(category.toLowerCase())) {
                  return { category };
                }
              }
              return { 
                category: categoryNames[0], 
                error: 'Could not match response to any category' 
              };
            }
          }
          return { category: cleanedContent };
        }
          
        case 'categories': {
          // Split by commas and clean up each item
          const categories = cleanedContent
            .split(',')
            .map(item => item.trim())
            .filter(Boolean);
            
          // If categories are provided, validate each response item
          if (outputCategories && outputCategories.length > 0) {
            const categoryNames = outputCategories.map(c => c.name);
            const validCategories = categories.filter(cat => 
              categoryNames.some(name => cat.toLowerCase() === name.toLowerCase())
            );
            
            if (validCategories.length > 0) {
              return { categories: validCategories };
            } else {
              return { 
                categories: [], 
                error: 'Could not match response to any categories' 
              };
            }
          }
          
          return { categories };
        }
          
        case 'number': {
          const numberMatch = cleanedContent.match(/-?\d+(\.\d+)?/);
          if (numberMatch) {
            return { number: parseFloat(numberMatch[0]) };
          }
          return { error: 'Could not extract a valid number from the response' };
        }
          
        case 'url': {
          // Simple URL validation
          const urlRegex = /https?:\/\/[^\s]+/i;
          const urlMatch = cleanedContent.match(urlRegex);
          if (urlMatch) {
            return { url: urlMatch[0] };
          }
          return { error: 'Could not extract a valid URL from the response' };
        }
          
        case 'date': {
          // ISO date format validation (YYYY-MM-DD)
          const dateRegex = /\d{4}-\d{2}-\d{2}/;
          const dateMatch = cleanedContent.match(dateRegex);
          if (dateMatch) {
            return { date: dateMatch[0] };
          }
          return { error: 'Could not extract a valid date from the response' };
        }
          
        default:
          return { text: cleanedContent };
      }
    } catch (error) {
      return { 
        error: `Error parsing response: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  private processCategoriesResponse(responseData: any, options: ProcessPromptOptions): AIModelResponse {
    // Implement processing for categories response
    const content = responseData.choices?.[0]?.message?.content || '';
    
    try {
      // Try to parse categories from the response
      const categories = content.split(',').map(cat => cat.trim());
      return {
        categories,
        error: undefined
      };
    } catch (error) {
      // If processing fails, return the raw text
      return {
        text: content,
        error: undefined
      };
    }
  }

  private processSingleCategoryResponse(responseData: any, options: ProcessPromptOptions): AIModelResponse {
    // Implement processing for single category response
    const content = responseData.choices?.[0]?.message?.content || '';
    
    try {
      // Try to extract a single category from the content
      const category = content.trim();
      return {
        category,
        error: undefined
      };
    } catch (error) {
      // If processing fails, return the raw text
      return {
        text: content,
        error: undefined
      };
    }
  }

  private processNumberResponse(responseData: any): AIModelResponse {
    // Implement processing for number response
    const content = responseData.choices?.[0]?.message?.content || '';
    
    try {
      // Try to extract a number from the content
      const match = content.match(/[-+]?[0-9]*\.?[0-9]+/);
      const number = match ? parseFloat(match[0]) : undefined;
      
      return {
        number,
        text: content,
        error: undefined
      };
    } catch (error) {
      // If processing fails, return the raw text
      return {
        text: content,
        error: undefined
      };
    }
  }
}

// Register the OpenAI service with the factory
import { AIProviderFactory } from './AIProvider';
AIProviderFactory.registerProvider('openai', new OpenAIService());
