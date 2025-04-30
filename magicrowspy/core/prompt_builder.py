import logging
from typing import List, Dict, Any

from jinja2 import Environment, Template, TemplateError, UndefinedError

from magicrowspy.config import OutputConfig

logger = logging.getLogger('magicrowspy')

class PromptBuilder:
    """Builds prompts using Jinja templates based on configuration and row data."""

    def __init__(self, output_config: OutputConfig, context_columns: List[str]):
        """
        Initializes the PromptBuilder.

        Args:
            output_config: The configuration for the specific output task.
            context_columns: A list of column names to be included in the prompt context.
        """
        self.output_config = output_config
        self.context_columns = context_columns
        self.jinja_env = Environment() # Basic Jinja environment
        
        # Pre-compile the template for efficiency if possible
        try:
            self.template = self.jinja_env.from_string(self.output_config.prompt)
            logger.debug(f"Successfully compiled Jinja template for output: {output_config.name}")
        except TemplateError as e:
            logger.error(f"Invalid Jinja template for output '{output_config.name}': {e}", exc_info=True)
            # Store the error to raise it during build_prompt
            self.template_error = e 
            self.template = None # Ensure template is None if compilation failed

    def build_prompt(self, row_data: Dict[str, Any]) -> str:
        """
        Builds the final prompt string for a given row.

        Args:
            row_data: A dictionary representing the data for a single row.

        Returns:
            The formatted prompt string.
            
        Raises:
            ValueError: If the template is invalid or rendering fails.
        """
        if hasattr(self, 'template_error') and self.template_error:
            raise ValueError(f"Invalid Jinja template configured: {self.template_error}")
            
        if not self.template:
            # This case might occur if initialization failed silently, add safeguard
             raise ValueError("Jinja template was not compiled successfully during initialization.")

        # Prepare context data for the template
        context = {}
        for col in self.context_columns:
            if col in row_data:
                context[col] = row_data[col]
            else:
                logger.warning(f"Context column '{col}' not found in row data: {list(row_data.keys())}. Using None.")
                context[col] = None # Or raise error, or skip?
        
        # Add target column name (often useful in prompts)
        context['target_column_name'] = self.output_config.name 
        # Add output type for context
        context['output_type'] = self.output_config.outputType.value
            
        # Include reasoning flag if needed
        context['include_reasoning'] = self.output_config.includeReasoning

        # Render the template
        try:
            rendered_prompt = self.template.render(context)
            logger.debug(f"Rendered prompt for output '{self.output_config.name}': {rendered_prompt[:200]}...") # Log snippet
            return rendered_prompt
        except UndefinedError as e:
             logger.error(f"Error rendering Jinja template: {e}. Missing variable in context? Context keys: {list(context.keys())}", exc_info=True)
             raise ValueError(f"Template rendering error: {e}. Check template variables and context columns.")
        except TemplateError as e:
            logger.error(f"Unexpected Jinja template error during rendering: {e}", exc_info=True)
            raise ValueError(f"Template rendering error: {e}")
        except Exception as e:
            logger.error(f"Unexpected error during prompt building: {e}", exc_info=True)
            raise ValueError(f"Unexpected error building prompt: {e}")
