import logging
from typing import Any, Dict, Optional, Tuple
import json

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

from magicrowspy.config import OutputConfig, OutputType

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
        """Parses the raw response from the provider to extract the relevant content."""
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

                # Parse if JSON is expected
                if output_config.outputType == OutputType.JSON:
                    try:
                        return json.loads(message_content)
                    except json.JSONDecodeError as e:
                        logger.error(f"Failed to parse OpenAI JSON response: {e}\nContent: {message_content}", exc_info=True)
                        return {"error": f"JSON Decode Error: {e}", "raw_content": message_content}
                else:
                    # Return raw string content for TEXT output
                    return message_content

            except (AttributeError, IndexError, KeyError) as e:
                logger.error(f"Error parsing OpenAI response structure: {e}\nResponse: {response}", exc_info=True)
                return {"error": f"Response Parsing Error: {e}"}
        else:
            logger.error(f"Parsing not implemented for provider type '{self.provider_type}'.")
            return {"error": f"Parsing not implemented for {self.provider_type}"}

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
