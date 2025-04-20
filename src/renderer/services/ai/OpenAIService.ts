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
      const useStructuredOutput = options.responseSchema !== undefined
        || (options.outputType === 'category' && Array.isArray(options.outputCategories) && options.outputCategories.length > 0);
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
      
      // Attach response_format for structured output if needed
      if (useStructuredOutput) {
        const schema = options.responseSchema || this.generateOutputSchema(options);

        // Ensure strict schema disallows extraneous keys
        if (schema && schema.type === 'object' && schema.additionalProperties === undefined) {
          schema.additionalProperties = false;
        }

        const responseFormat = {
          type: "json_schema",
          json_schema: {
            name: options.providerOptions?.schemaName || 'structured_output',
            schema,
            strict: true
          }
        } as const;

        console.log('📋 Using JSON Schema response format:', JSON.stringify(responseFormat, null, 2));
        requestBody.response_format = responseFormat;
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

      // Handle structured output from JSON response
      if (useStructuredOutput && responseData?.choices?.[0]?.message?.content) {
        try {
          const structuredOutput = JSON.parse(responseData.choices[0].message.content);
          console.log('✅ Structured output received:', structuredOutput);
          return this.processStructuredOutput(structuredOutput, options);
        } catch (e) {
          console.warn('❌ Error parsing structured JSON output:', e);
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
    // Use structured output when a JSON schema is provided or for categorical outputs
    return options.responseSchema !== undefined
      || (options.outputType === 'category' && 
          Array.isArray(options.outputCategories) && options.outputCategories.length > 0);
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
        },
        reasoning: {
          type: "string",
          description: "Explanation of your thought process"
        }
      },
      required: ["text", "reasoning"]
    };

    // For single category output, create a schema with enum values
    if (options.outputType === 'category' && options.outputCardinality !== 'multiple' && 
        Array.isArray(options.outputCategories) && 
        options.outputCategories.length > 0) {
      
      console.log('🔍 Generating schema for single category output with', options.outputCategories.length, 'categories');
      
      const categoryNames = options.outputCategories.map(c => c.name);
      console.log('📋 Category names:', categoryNames);
      
      const categoryDescriptions = Object.fromEntries(
        options.outputCategories.map(c => [c.name, c.description || c.name])
      );
      console.log('📝 Category descriptions:', categoryDescriptions);
      
      schema = {
        type: "object",
        properties: {
          reasoning: {
            type: "string",
            description: "Explanation of your decision process and rationale"
          },
          category: {
            type: "string",
            enum: categoryNames,
            description: "The selected category",
            enumDescriptions: categoryDescriptions
          }
        },
        required: ["reasoning", "category"]
      };
      
      console.log('✅ Generated single category schema with', categoryNames.length, 'enum values');
    }
    
    // For multiple categories, create a schema for an array of values
    else if (options.outputType === 'category' && options.outputCardinality === 'multiple' && 
             Array.isArray(options.outputCategories) && 
             options.outputCategories.length > 0) {
      
      console.log('🔍 Generating schema for multiple category output with', options.outputCategories.length, 'possible categories');
      
      const categoryNames = options.outputCategories.map(c => c.name);
      console.log('📋 Available category names:', categoryNames);
      
      schema = {
        type: "object",
        properties: {
          reasoning: {
            type: "string",
            description: "Explanation of your decision process and rationale"
          },
          categories: {
            type: "array",
            items: {
              type: "string",
              enum: categoryNames
            },
            description: "Selected categories from the provided options"
          }
        },
        required: ["reasoning", "categories"]
      };
      
      console.log('✅ Generated multiple category schema with array of', categoryNames.length, 'possible enum values');
    }
    else if (options.outputType === 'number') {
      console.log('🔍 Generating schema for number output');
      
      schema = {
        type: "object",
        properties: {
          reasoning: {
            type: "string",
            description: "Explanation of your calculation or estimation process"
          },
          number: {
            type: "number",
            description: "The numerical response"
          }
        },
        required: ["reasoning", "number"]
      };
      
      console.log('✅ Generated number schema');
    }
    else if (options.outputType === 'url') {
      console.log('🔍 Generating schema for URL output');
      
      schema = {
        type: "object",
        properties: {
          reasoning: {
            type: "string",
            description: "Explanation of why this URL was selected"
          },
          url: {
            type: "string",
            format: "uri",
            description: "The URL response"
          }
        },
        required: ["reasoning", "url"]
      };
      
      console.log('✅ Generated URL schema');
    }
    else if (options.outputType === 'date') {
      console.log('🔍 Generating schema for date output');
      
      schema = {
        type: "object",
        properties: {
          reasoning: {
            type: "string",
            description: "Explanation of why this date was selected"
          },
          date: {
            type: "string",
            format: "date",
            description: "The date response in ISO format (YYYY-MM-DD)"
          }
        },
        required: ["reasoning", "date"]
      };
      
      console.log('✅ Generated date schema');
    }
    else if (options.outputType === 'text' && options.outputCardinality === 'multiple') {
      console.log('🔍 Generating schema for multiple text items WITH reasoning');

      // Wrap list in object so we can attach reasoning as sibling field
      schema = {
        type: "object",
        properties: {
          reasoning: {
            type: "string",
            description: "Explanation of why these items were selected or generated"
          },
          items: {
            type: "array",
            items: { type: "string" },
            description: "Array of text items"
          }
        },
        required: ["reasoning", "items"],
        additionalProperties: false
      };

      console.log('✅ Generated multiple text items schema (object with items + reasoning)');
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
      // Special case for text with multiple cardinality - we expect a direct array
      if (options.outputType === 'text' && options.outputCardinality === 'multiple') {
        if (Array.isArray(structuredOutput)) {
          return {
            items: structuredOutput.map(item => String(item))
          };
        }
      }

      // Always include the full structured data for reference
      const baseResponse: AIModelResponse = {
        structuredData: structuredOutput
      };
      
      // Add reasoning as a separate field whenever it's available
      if (structuredOutput.reasoning) {
        baseResponse.reasoning = structuredOutput.reasoning;
      }
      
      // Process based on output type
      switch (options.outputType) {
        case 'category':
          if (options.outputCardinality !== 'multiple' && structuredOutput.category) {
            return { 
              ...baseResponse,
              category: structuredOutput.category,
              // Don't include reasoning in the text field - this will be handled separately
              // by the AIEnrichmentProcessor
            };
          } else if (options.outputCardinality === 'multiple' && Array.isArray(structuredOutput.categories)) {
            return { 
              ...baseResponse,
              categories: structuredOutput.categories
            };
          }
          break;
          
        case 'number':
          if (typeof structuredOutput.number === 'number') {
            return { 
              ...baseResponse,
              number: structuredOutput.number
            };
          }
          break;
          
        case 'url':
          if (structuredOutput.url) {
            return { 
              ...baseResponse,
              url: structuredOutput.url
            };
          }
          break;
          
        case 'date':
          if (structuredOutput.date) {
            return { 
              ...baseResponse,
              date: structuredOutput.date
            };
          }
          break;
          
        case 'text':
          if (options.outputCardinality === 'multiple') {
            return { 
              ...baseResponse,
              items: structuredOutput.items
            };
          } else {
            return { 
              ...baseResponse,
              text: JSON.stringify(structuredOutput)
            };
          }
          break;
      }
      
      // If we couldn't process the structured output properly, return it as text
      return { 
        ...baseResponse,
        text: JSON.stringify(structuredOutput)
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
    let systemMessage = 'You are a helpful AI assistant that generates structured data in the exact format requested. ';
    
    // If we're using structured output via tool calls, provide different instructions
    if (this.shouldUseStructuredOutput(options)) {
      systemMessage = 'You are a data extraction assistant that provides structured data in the EXACT format specified. Always include your reasoning for any decision or classification you make. ';
      
      if (options.outputType === 'category' && options.outputCardinality !== 'multiple' && options.outputCategories) {
        systemMessage += `First provide your reasoning, then select exactly ONE category from this list: ${
          options.outputCategories.map(c => `"${c.name}" (${c.description || c.name})`).join(', ')
        }. Your response MUST be formatted as a simple JSON object with a "reasoning" field explaining your decision process, and a "category" field containing one of the exact category names listed. Do not nest the response or add any other fields.`;
      } else if (options.outputType === 'category' && options.outputCardinality === 'multiple' && options.outputCategories) {
        systemMessage += `First provide your reasoning, then select one or more categories from this list: ${
          options.outputCategories.map(c => `"${c.name}" (${c.description || c.name})`).join(', ')
        }. Your response MUST be formatted as a simple JSON object with a "reasoning" field explaining your decision process, and a "categories" array field containing the exact category names. Do not nest the response or add any other fields.`;
      } else if (options.outputType === 'number') {
        systemMessage += 'First provide your reasoning, then provide a numerical response as a simple JSON object with a "reasoning" field explaining your calculation or estimation, and a "number" field. Do not nest the response or add any other fields.';
      } else if (options.outputType === 'url') {
        systemMessage += 'First provide your reasoning, then provide a URL response as a simple JSON object with a "reasoning" field explaining your choice, and a "url" field. Do not nest the response or add any other fields.';
      } else if (options.outputType === 'date') {
        systemMessage += 'First provide your reasoning, then provide a date response as a simple JSON object with a "reasoning" field explaining your choice, and a "date" field in ISO format (YYYY-MM-DD). Do not nest the response or add any other fields.';
      } else if (options.outputType === 'text') {
        if (options.outputCardinality === 'multiple') {
          systemMessage += 'First provide your reasoning, then provide an array of text items in JSON format as the "items" field of an object, with the "reasoning" field explaining your choices. Respond exactly as a JSON object with keys "reasoning" and "items" and no other fields.';
        } else {
          systemMessage += 'First provide your reasoning, then provide a text response as a simple JSON object with a "reasoning" field explaining your response, and a "text" field. Do not nest the response or add any other fields.';
        }
      } else {
        systemMessage += 'You must format your response as a simple JSON object according to the schema provided, always including a "reasoning" field explaining your choices, without any nesting or additional fields.';
      }
      
      return systemMessage;
    }

    // Otherwise use the original messages for text-based responses
    switch (options.outputType) {
      case 'text':
        systemMessage += 'Provide a clear, concise text response.';
        break;
        
      case 'category':
        if (options.outputCardinality !== 'multiple') {
          systemMessage += `Choose exactly one category from the following options: ${
            options.outputCategories?.map(c => c.name).join(', ') || 'No categories provided'
          }. Respond with only the chosen category name, without any additional text.`;
        } else {
          systemMessage += `Choose multiple categories from the following options: ${
            options.outputCategories?.map(c => c.name).join(', ') || 'No categories provided'
          }. Format your response as a comma-separated list without any additional text.`;
        }
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
    outputType: OutputConfig['outputType'] | 'categories',
    outputCategories?: OutputConfig['outputCategories']
  ): AIModelResponse {
    try {
      // Clean up the content
      const cleanedContent = content.trim();
      
      switch (outputType) {
        case 'text':
          return { text: cleanedContent };
          
        case 'category':
          // If categories are provided, validate the response
          if (outputCategories && outputCategories.length > 0) {
            const categoryNames = outputCategories.map(c => c.name);
            // Find the first matching category (case-insensitive)
            const matchedCategory = categoryNames.find(name => 
              cleanedContent.toLowerCase().includes(name.toLowerCase())
            );
            
            if (matchedCategory) {
              return { category: matchedCategory };
            }
            
            // If no exact match, try to find the closest match
            const words = cleanedContent.toLowerCase().split(/\s+/);
            for (const word of words) {
              const closestCategory = categoryNames.find(name => 
                name.toLowerCase().includes(word) || word.includes(name.toLowerCase())
              );
              if (closestCategory) {
                return { category: closestCategory };
              }
            }
          }
          return { category: cleanedContent };
        
        // This is a legacy case that should be removed once all presets are updated
        case 'categories':
          // Split by commas and clean up each item
          const categories = cleanedContent
            .split(',')
            .map(item => item.trim())
            .filter(item => item.length > 0);
          
          // If categories are provided, validate the response
          if (outputCategories && outputCategories.length > 0) {
            const categoryNames = outputCategories.map(c => c.name);
            const validCategories = categories.filter(cat => 
              categoryNames.some(name => 
                cat.toLowerCase().includes(name.toLowerCase()) || 
                name.toLowerCase().includes(cat.toLowerCase())
              )
            );
            
            if (validCategories.length > 0) {
              return { categories: validCategories };
            }
          }
          
          return { categories };
        
        case 'number':
          const numberMatch = cleanedContent.match(/-?\d+(\.\d+)?/);
          if (numberMatch) {
            return { number: parseFloat(numberMatch[0]) };
          }
          return { error: 'Could not extract a valid number from the response' };
        
        case 'url':
          // Simple URL validation
          const urlRegex = /https?:\/\/[^\s]+/i;
          const urlMatch = cleanedContent.match(urlRegex);
          if (urlMatch) {
            return { url: urlMatch[0] };
          }
          return { error: 'Could not extract a valid URL from the response' };
        
        case 'date':
          // ISO date format validation (YYYY-MM-DD)
          const dateRegex = /\d{4}-\d{2}-\d{2}/;
          const dateMatch = cleanedContent.match(dateRegex);
          if (dateMatch) {
            return { date: dateMatch[0] };
          }
          return { error: 'Could not extract a valid date from the response' };
        
        default:
          return { text: cleanedContent };
      }
    } catch (error) {
      console.error('Error processing output:', error);
      return { error: `Error processing output: ${error.message}` };
    }
  }
}

// Register the OpenAI service with the factory
import { AIProviderFactory } from './AIProvider';
AIProviderFactory.registerProvider('openai', new OpenAIService());
