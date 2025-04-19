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

      // Determine if we need to use structured output mode
      const useStructuredOutput = this.shouldUseStructuredOutput(options);
      console.log('💡 Using structured output?', useStructuredOutput ? 'YES' : 'NO');
      
      // Create request body based on whether structured output is needed
      let requestBody: any = {
        model: options.model,
        messages,
        temperature: options.temperature || 0.2,
        max_tokens: 1000,
        n: 1,
        stream: false
      };
      
      // Add response format and tool call for structured output if needed
      if (useStructuredOutput) {
        const responseFormat = { type: "json_object" };
        const schema = this.generateOutputSchema(options);
        
        // Log the schema in detail
        console.log('📋 Generated JSON Schema for structured output:');
        console.log(JSON.stringify(schema, null, 2));
        
        // Log category details if applicable
        if (options.outputType === 'singleCategory' && options.outputCategories) {
          console.log('📝 Category options for structured output:');
          options.outputCategories.forEach(cat => {
            console.log(`  - "${cat.name}": ${cat.description || '(no description)'}`);
          });
        }
        
        requestBody = {
          ...requestBody,
          response_format: responseFormat,
          tools: [{
            type: "function",
            function: {
              name: "format_response",
              description: "Format the response according to the required schema",
              parameters: schema
            }
          }],
          tool_choice: {
            type: "function",
            function: { name: "format_response" }
          }
        };
      }
      
      // Log the full request for debugging (including all details)
      console.log('📤 FULL OpenAI API Request:');
      console.log(JSON.stringify(requestBody, null, 2));
      
      // Log the system message for debugging
      console.log('🧠 System message:');
      console.log(systemMessage);
      
      // Log the user prompt
      console.log('🔍 User prompt:');
      console.log(prompt);

      // Log detailed request information for debugging
      console.log('OpenAI API Request Body:', JSON.stringify({
        ...requestBody,
        messages: requestBody.messages.map(m => ({ 
          role: m.role, 
          content: m.content.length > 20 ? m.content.substring(0, 20) + '...' : m.content 
        }))
      }, null, 2));
      
      // Log the full messages for debugging
      console.log('OpenAI Messages Content:', JSON.stringify(messages, null, 2));

      // Log the request details (with sensitive info masked)
      console.log('OpenAI API Request:', {
        url: apiEndpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-...' // Masked for security
        },
        body: {
          ...requestBody,
          messages: requestBody.messages.map(m => ({ 
            role: m.role, 
            content: m.content.length > 20 ? m.content.substring(0, 20) + '...' : m.content 
          }))
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
          body: JSON.stringify(requestBody)
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
            // Log the full response body instead of just the first 500 characters
            console.log('OpenAI API Response Body (full):', responseText);
            
            // Also log the parsed JSON if it's valid JSON
            try {
              const parsedResponse = JSON.parse(responseText);
              console.log('OpenAI API Response (parsed):', parsedResponse);
            } catch (e) {
              // Not valid JSON or parsing error, just use the text version
              console.log('Response is not valid JSON or could not be parsed');
            }
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

      // Check if the response is a structured output (tool call)
      if (useStructuredOutput && responseData?.choices?.[0]?.message?.tool_calls) {
        const toolCall = responseData.choices[0].message.tool_calls[0];
        if (toolCall && toolCall.function && toolCall.function.name === 'format_response') {
          try {
            const structuredOutput = JSON.parse(toolCall.function.arguments);
            console.log('✅ Structured output received:', structuredOutput);
            
            // Process the structured output based on the output type
            return this.processStructuredOutput(structuredOutput, options);
          } catch (e) {
            console.warn('❌ Error parsing structured output:', e);
          }
        }
      }

      // Handle standard text output if not using structured output or if structured output failed
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
   * Determines if structured output should be used based on options
   * @param options The processing options
   */
  private shouldUseStructuredOutput(options: ProcessPromptOptions): boolean {
    // Use structured output for categorical responses
    return options.outputType === 'singleCategory' && 
           Array.isArray(options.outputCategories) && 
           options.outputCategories.length > 0;
  }

  /**
   * Generates a JSON schema for structured output based on options
   * @param options The processing options
   */
  private generateOutputSchema(options: ProcessPromptOptions): any {
    console.log('⚙️ Generating output schema for:', options.outputType);
    
    // Start with a default schema for text output
    let schema: any = {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The response text"
        }
      },
      required: ["text"]
    };

    // For single category output, create a schema with enum values
    if (options.outputType === 'singleCategory' && 
        Array.isArray(options.outputCategories) && 
        options.outputCategories.length > 0) {
      
      console.log('🔍 Generating schema for singleCategory output with', options.outputCategories.length, 'categories');
      
      const categoryNames = options.outputCategories.map(c => c.name);
      console.log('📋 Category names:', categoryNames);
      
      const categoryDescriptions = Object.fromEntries(
        options.outputCategories.map(c => [c.name, c.description || c.name])
      );
      console.log('📝 Category descriptions:', categoryDescriptions);
      
      schema = {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: categoryNames,
            description: "The selected category",
            enumDescriptions: categoryDescriptions
          },
          reasoning: {
            type: "string",
            description: "Optional reasoning for the selected category"
          }
        },
        required: ["category"]
      };
      
      console.log('✅ Generated singleCategory schema with', categoryNames.length, 'enum values');
    }
    
    // For multiple categories, create a schema for an array of values
    else if (options.outputType === 'categories' && 
             Array.isArray(options.outputCategories) && 
             options.outputCategories.length > 0) {
      
      console.log('🔍 Generating schema for multiple categories output with', options.outputCategories.length, 'possible categories');
      
      const categoryNames = options.outputCategories.map(c => c.name);
      console.log('📋 Available category names:', categoryNames);
      
      schema = {
        type: "object",
        properties: {
          categories: {
            type: "array",
            items: {
              type: "string",
              enum: categoryNames
            },
            description: "Selected categories from the provided options"
          },
          reasoning: {
            type: "string",
            description: "Optional reasoning for the selected categories"
          }
        },
        required: ["categories"]
      };
      
      console.log('✅ Generated multiple categories schema with array of', categoryNames.length, 'possible enum values');
    }
    else if (options.outputType === 'number') {
      console.log('🔍 Generating schema for number output');
      
      schema = {
        type: "object",
        properties: {
          number: {
            type: "number",
            description: "The numerical response"
          },
          reasoning: {
            type: "string",
            description: "Optional reasoning for the provided number"
          }
        },
        required: ["number"]
      };
      
      console.log('✅ Generated number schema');
    }
    else if (options.outputType === 'url') {
      console.log('🔍 Generating schema for URL output');
      
      schema = {
        type: "object",
        properties: {
          url: {
            type: "string",
            format: "uri",
            description: "The URL response"
          },
          reasoning: {
            type: "string",
            description: "Optional reasoning for the provided URL"
          }
        },
        required: ["url"]
      };
      
      console.log('✅ Generated URL schema');
    }
    else if (options.outputType === 'date') {
      console.log('🔍 Generating schema for date output');
      
      schema = {
        type: "object",
        properties: {
          date: {
            type: "string",
            format: "date",
            description: "The date response in YYYY-MM-DD format"
          },
          reasoning: {
            type: "string",
            description: "Optional reasoning for the provided date"
          }
        },
        required: ["date"]
      };
      
      console.log('✅ Generated date schema');
    }
    else {
      console.log('ℹ️ Using default text schema for output type:', options.outputType);
    }
    
    console.log('🔄 Final schema structure:', JSON.stringify(schema, null, 2));
    return schema;
  }

  /**
   * Process structured output from the OpenAI API
   * @param structuredOutput The structured output object
   * @param options The processing options
   */
  private processStructuredOutput(
    structuredOutput: any, 
    options: ProcessPromptOptions
  ): AIModelResponse {
    try {
      switch (options.outputType) {
        case 'singleCategory':
          if (structuredOutput.category) {
            return { 
              category: structuredOutput.category,
              text: structuredOutput.reasoning
            };
          }
          break;
          
        case 'categories':
          if (Array.isArray(structuredOutput.categories)) {
            return { categories: structuredOutput.categories };
          }
          break;
          
        case 'number':
          if (typeof structuredOutput.number === 'number') {
            return { number: structuredOutput.number };
          }
          break;
      }
      
      // If we couldn't process the structured output properly, return it as text
      return { 
        text: JSON.stringify(structuredOutput),
        structuredData: structuredOutput 
      };
    } catch (error) {
      console.error('Error processing structured output:', error);
      return { 
        error: `Error processing structured output: ${error.message}`,
        structuredData: structuredOutput
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
    
    // If we're using structured output via tool calls, provide different instructions
    if (this.shouldUseStructuredOutput(options)) {
      systemMessage = 'You are a helpful AI assistant that provides structured data in JSON format. ';
      
      if (options.outputType === 'singleCategory' && options.outputCategories) {
        systemMessage += `You will be asked to evaluate something and choose from specific categories: ${
          options.outputCategories.map(c => `"${c.name}" (${c.description || c.name})`).join(', ')
        }. Your response must be formatted according to the JSON schema provided, with the "category" field containing one of the exact category names mentioned.`;
      } else if (options.outputType === 'categories' && options.outputCategories) {
        systemMessage += `You will be asked to select multiple categories from the following options: ${
          options.outputCategories.map(c => `"${c.name}" (${c.description || c.name})`).join(', ')
        }. Your response must be formatted as a JSON array according to the schema provided.`;
      } else if (options.outputType === 'number') {
        systemMessage += 'You will provide a numerical response formatted as JSON according to the schema provided.';
      } else if (options.outputType === 'url') {
        systemMessage += 'You will provide a URL response formatted as JSON according to the schema provided.';
      } else if (options.outputType === 'date') {
        systemMessage += 'You will provide a date response formatted as JSON according to the schema provided.';
      } else {
        systemMessage += 'Please format your response as JSON according to the schema provided.';
      }
      
      return systemMessage;
    }

    // Otherwise use the original messages for text-based responses
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
    // Original implementation remains unchanged
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

// Register the OpenAI service with the factory
import { AIProviderFactory } from './AIProvider';
AIProviderFactory.registerProvider('openai', new OpenAIService());
