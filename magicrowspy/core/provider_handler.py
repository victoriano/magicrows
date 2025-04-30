import logging
from typing import Any, Dict, Optional, Tuple
import json
import re

# Attempt to import OpenAI
try:
    from openai import OpenAI, AsyncOpenAI
    from openai.types.chat import ChatCompletion
    OPENAI_AVAILABLE = True
except ImportError:
    OpenAI = None
    AsyncOpenAI = None
    ChatCompletion = None # Placeholder type
    OPENAI_AVAILABLE = False

from magicrowspy.config import OutputConfig, OutputType, OutputCardinality

logger = logging.getLogger('magicrowspy')

class ProviderHandler:
    """Handles interaction with a specific AI provider (e.g., OpenAI)."""

    def __init__(self, client: Any, provider_type: str):
        """
        Initializes the handler with the provider client.

        Args:
            client: The instantiated client for the provider (e.g., OpenAI client).
            provider_type: A string identifier for the provider (e.g., 'openai').
        """
        if provider_type == 'openai' and not OPENAI_AVAILABLE:
            raise ImportError("OpenAI client is required but not installed. Please run `pip install openai`.")
        
        self.client = client
        self.provider_type = provider_type
        logger.debug(f"ProviderHandler initialized for type: {provider_type}")

    async def generate_completion(self, model: str, prompt: str, temperature: float, output_config: OutputConfig) -> Any:
        """Generates a completion using the configured provider."""
        if self.provider_type == 'openai':
            if not isinstance(self.client, AsyncOpenAI):
                 raise TypeError("Invalid client type provided for async OpenAI handler. Expected AsyncOpenAI.")
            
            messages = [{"role": "user", "content": prompt}]
            
            completion_kwargs = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
            }
            
            # Add response format constraint if output type is JSON
            if output_config.outputType == OutputType.JSON:
                completion_kwargs["response_format"] = {"type": "json_object"}
            
            logger.debug(f"Calling OpenAI API with kwargs: {completion_kwargs}")
            response = await self.client.chat.completions.create(**completion_kwargs)
            logger.debug(f"Received OpenAI response: {response}")
            return response
        else:
            # Placeholder for other providers
            logger.error(f"Provider type '{self.provider_type}' not yet supported.")
            raise NotImplementedError(f"Provider type '{self.provider_type}' not supported.")

    def parse_response(self, response: Any, output_config: OutputConfig) -> Optional[Any]:
        """Parses the raw response from the provider to extract the relevant content.
        
        Args:
            response: The raw response from the provider
            output_config: Configuration for the output being processed
            
        Returns:
            Extracted and structured content based on output type
        """
        if self.provider_type == 'openai':
            if not isinstance(response, ChatCompletion):
                logger.error(f"Expected OpenAI ChatCompletion object, got {type(response)}")
                return {"error": f"Unexpected response type: {type(response)}"}
            try:
                choice = response.choices[0]
                message_content = choice.message.content
                finish_reason = choice.finish_reason

                if finish_reason == 'length':
                    logger.warning("OpenAI completion truncated due to max_tokens limit.")
                elif finish_reason != 'stop':
                     logger.warning(f"OpenAI completion finished with reason: {finish_reason}")

                if not message_content:
                    logger.warning("Received empty message content from OpenAI.")
                    return None

                # Process response based on output type
                if output_config.outputType == OutputType.JSON:
                    try:
                        return json.loads(message_content)
                    except json.JSONDecodeError as e:
                        logger.error(f"Failed to parse OpenAI JSON response: {e}\nContent: {message_content}", exc_info=True)
                        return {"error": f"JSON Decode Error: {e}", "raw_content": message_content}
                
                elif output_config.outputType == OutputType.TEXT:
                    # Clean text response
                    return self._extract_text_response(message_content, output_config)
                
                elif output_config.outputType == OutputType.CATEGORY:
                    # Extract category from response
                    return self._extract_category_response(message_content, output_config)
                
                else:
                    logger.warning(f"Unhandled output type: {output_config.outputType}. Returning raw content.")
                    return message_content
                
            except Exception as e:
                logger.error(f"Error parsing OpenAI response: {e}", exc_info=True)
                return {"error": f"Parsing error: {e}", "raw_content": message_content if 'message_content' in locals() else None}
        else:
            # Placeholder for other providers
            logger.error(f"Provider type '{self.provider_type}' parsing not implemented.")
            return None
            
    def _extract_text_response(self, content: str, output_config: OutputConfig) -> str:
        """Extract clean text response from AI message content.
        
        Args:
            content: The raw message content from the AI
            output_config: Configuration for the output being processed
            
        Returns:
            Cleaned text response
        """
        # If content contains numbered list entries, extract them
        import re
        
        # Check if the output is a numbered list (common for task lists)
        numbered_items = re.findall(r'(?:\d+\.\s*\*\*)(.*?)(?:\*\*\s*(?:\n|$))', content)
        if numbered_items and len(numbered_items) > 0:
            # Found numbered items with bold formatting (e.g., "1. **Task Description**")
            return [item.strip() for item in numbered_items]
            
        # Check for bullet point list
        bullet_items = re.findall(r'(?:•|\*|-)\s*(.*?)(?:\n|$)', content)
        if bullet_items and len(bullet_items) > 0:
            return [item.strip() for item in bullet_items]
            
        # If multiple output items expected but no clear list formatting found
        if output_config.outputCardinality == OutputCardinality.MULTIPLE:
            # Split by newlines and filter empty lines
            lines = [line.strip() for line in content.split('\n') if line.strip()]
            if len(lines) > 1:
                return lines
                
        # If no structured format detected or single output expected, clean the text
        # Remove markdown formatting, extra whitespace, etc.
        clean_text = re.sub(r'\*\*|\*|_', '', content)  # Remove bold, italic markers
        clean_text = re.sub(r'^```.*?```$', '', clean_text, flags=re.DOTALL)  # Remove code blocks
        clean_text = re.sub(r'\n\n+', '\n\n', clean_text)  # Normalize newlines
        
        return clean_text.strip()
        
    def _extract_category_response(self, content: str, output_config: OutputConfig) -> Any:
        """Extract category selection(s) from AI message content.
        
        Args:
            content: The raw message content from the AI
            output_config: Configuration for the output being processed
            
        Returns:
            Selected category or categories
        """
        # Check if we have defined categories to match against
        if not hasattr(output_config, 'outputCategories') or not output_config.outputCategories:
            logger.warning("No outputCategories defined for category output type.")
            return content
            
        category_names = [cat.name for cat in output_config.outputCategories]
        
        # Look for direct mentions of the categories
        found_categories = []
        
        for category in category_names:
            # Check if the category is explicitly mentioned
            if category in content:
                found_categories.append(category)
                
        # If we found categories, return them based on cardinality
        if found_categories:
            if output_config.outputCardinality == OutputCardinality.SINGLE:
                # Return the first found category for single cardinality
                return found_categories[0]
            else:
                # Return all found categories for multiple cardinality
                return found_categories
                
        # If no categories were clearly identified, return the raw content
        logger.warning(f"Could not extract specific categories from response. Categories: {category_names}")
        return content

    def extract_usage(self, response: Any) -> Optional[Dict[str, int]]:
        """Extracts token usage information from the provider's response."""
        if self.provider_type == 'openai':
            if not isinstance(response, ChatCompletion):
                logger.error(f"Cannot extract usage from non-ChatCompletion object: {type(response)}")
                return None
            try:
                usage_data = response.usage
                if usage_data:
                    return {
                        'prompt_tokens': usage_data.prompt_tokens,
                        'completion_tokens': usage_data.completion_tokens,
                        'total_tokens': usage_data.total_tokens
                    }
                else:
                    logger.warning("No usage data found in OpenAI response.")
                    return None
            except AttributeError:
                logger.warning("Could not find 'usage' attribute in OpenAI response.", exc_info=False)
                return None
        else:
            logger.warning(f"Usage extraction not implemented for provider type '{self.provider_type}'.")
            return None
