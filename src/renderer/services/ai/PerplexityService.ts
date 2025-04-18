import { AIEnrichmentBlockConfig, OutputConfig } from '../../../shared/schemas/AIEnrichmentBlockSchema';
import { AIModelResponse, BaseAIProvider, ProcessPromptOptions } from './AIProvider';

/**
 * Perplexity service implementation
 * Handles API interactions with the Perplexity platform
 */
export class PerplexityService extends BaseAIProvider {
  // Valid Perplexity models for enrichment tasks
  private static readonly SUPPORTED_MODELS = [
    'sonar',
    'sonar-pro',
    'sonar-reasoning',
    'sonar-reasoning-pro',
    'sonar-deep-research'
  ];

  /**
   * Create a new Perplexity service
   * @param providerId The provider ID to use for API key lookup (defaults to 'perplexity')
   */
  constructor(providerId: string = 'perplexity') {
    super(providerId);
    console.log(`PerplexityService created with providerId: ${providerId}`);
  }

  /**
   * Get list of available Perplexity models
   */
  async getModelList(): Promise<string[]> {
    // For now, return the static list of supported models
    // In a production app, you might want to fetch this from Perplexity's API
    return Promise.resolve([...PerplexityService.SUPPORTED_MODELS]);
  }

  /**
   * Process a prompt through Perplexity
   * @param prompt The prompt to send to Perplexity
   * @param options Processing options
   */
  async processPrompt(prompt: string, options: ProcessPromptOptions): Promise<AIModelResponse> {
    try {
      // Validate the required options
      if (!prompt || !options.model) {
        throw new Error('Invalid prompt or model');
      }

      // Get the API key
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        throw new Error('Perplexity API key not configured');
      }

      console.log(`Using Perplexity API key: ${apiKey.substring(0, 12)}...${apiKey.substring(apiKey.length - 4)}`);
      
      // Check for specific API key formats and provide hints
      if (apiKey.startsWith('pplx-')) {
        console.log('Using Perplexity API key format (pplx-...)');
      } else {
        console.warn('Warning: API key does not match expected Perplexity format (should start with pplx-)');
      }

      // Build the appropriate system message based on output type
      const systemMessage = this.buildSystemMessage(options);

      // Build messages array for the completion
      const messages = [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt }
      ];

      // For Perplexity API we need a clean API key without any whitespace
      const cleanApiKey = apiKey.trim();
      
      // Prepare headers - Perplexity requires specific headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      // According to Perplexity docs, the authorization format is "Bearer pplx-..."
      headers['Authorization'] = `Bearer ${cleanApiKey}`;
      
      console.log('Using authorization header format:', `Bearer ${cleanApiKey.substring(0, 8)}...`);

      // Use the specific API endpoint for Perplexity
      const apiEndpoint = 'https://api.perplexity.ai/chat/completions';
      
      console.log(`Using Perplexity API endpoint: ${apiEndpoint}`);

      // Create the request body according to Perplexity API specifications
      // https://docs.perplexity.ai/api-reference/chat-completions
      const requestBody = {
        model: options.model || 'sonar', // Default to sonar if not specified
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: 1000,
        top_p: 0.9,
        stream: false,
        presence_penalty: 0,
        frequency_penalty: 0
      };

      // Log the request details (excluding sensitive info)
      console.log('Perplexity API Request:', {
        url: apiEndpoint,
        method: 'POST',
        headers: {
          'Content-Type': headers['Content-Type'],
          'Accept': headers['Accept'],
          'Authorization': 'Bearer pplx-...' // Masked for security
        },
        body: {
          model: requestBody.model,
          messages: messages.map(m => ({ role: m.role, content: m.content.substring(0, 20) + '...' })),
          temperature: requestBody.temperature,
          max_tokens: requestBody.max_tokens,
          top_p: requestBody.top_p
        }
      });
      
      // Log the full request body for debugging
      console.log('Perplexity API Request Body:', JSON.stringify(requestBody, null, 2));
      console.log('Perplexity Messages Content:', JSON.stringify(messages, null, 2));
      
      try {
        // Make the external API call using the Electron bridge
        // This bypasses Content Security Policy restrictions by using the main process
        // @ts-ignore - The TypeScript definition doesn't match the actual implementation
        const response = await window.electronAPI.externalApi.call({
          url: apiEndpoint,
          method: 'POST',
          headers,
          body: requestBody
        });
        
        console.log('Received API response status:', response.status);
        
        // Add detailed logging of the full response
        console.log('Perplexity API Response Data:', JSON.stringify(response.data, null, 2));
        
        // Check if the response was successful
        if (!response.ok) {
          // Try to extract more detailed error information
          let errorMessage = response.statusText || response.error || 'Unknown error';
          if (response.data && typeof response.data === 'object') {
            errorMessage = JSON.stringify(response.data);
          }
          throw new Error(`Perplexity API error: ${errorMessage}`);
        }
        
        // Extract the response data
        const responseData = response.data;
        
        // Validate the response structure
        if (!responseData || !responseData.choices || !responseData.choices[0]) {
          throw new Error('Invalid response from Perplexity API: Missing choices');
        }
        
        // Extract the response content based on the output type
        switch (options.outputType) {
          case 'text':
            return {
              text: responseData.choices?.[0]?.message?.content || '',
              error: undefined
            };
          case 'categories':
            return this.processCategoriesResponse(responseData, options);
          case 'singleCategory':
            return this.processSingleCategoryResponse(responseData, options);
          case 'number':
            return this.processNumberResponse(responseData);
          default:
            return {
              text: responseData.choices?.[0]?.message?.content || '',
              error: undefined
            };
        }
      } catch (error) {
        console.error('Error processing prompt with Perplexity:', error);
        return {
          text: undefined,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    } catch (error) {
      console.error('Error processing prompt with Perplexity:', error);
      return {
        text: undefined,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Process response for categories output type
   */
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

  /**
   * Process response for single category output type
   */
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

  /**
   * Process response for number output type
   */
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

  /**
   * Validate if the configuration is valid for Perplexity
   * @param config The AI enrichment configuration to validate
   */
  validateConfig(config: AIEnrichmentBlockConfig): boolean {
    const baseValidation = super.validateConfig(config);
    if (!baseValidation) return false;

    // Check if the model is supported
    return PerplexityService.SUPPORTED_MODELS.includes(config.model);
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
   * Parse the response from Perplexity based on the expected output type
   * @param content The raw content from the API response
   * @param outputType The expected output type
   * @param outputCategories Optional categories for categorical outputs
   */
  private parseResponse(
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
}

// Register the Perplexity service with the factory
import { AIProviderFactory } from './AIProvider';
AIProviderFactory.registerProvider('perplexity', new PerplexityService());
