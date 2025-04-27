"""Core data enrichment orchestrator."""

import logging
from typing import List, Union, Dict, Any, Optional
from jinja2 import Environment, Template
import jsonschema # For validation after getting result
import json # For parsing JSON string from OpenAI
import os # To potentially read API keys from environment
import itertools # Added for Cartesian product

from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

# Configuration Models
from magicrowspy.config import (
    AIEnrichmentBlockConfig,
    BaseProviderConfig,
    OpenAIProviderConfig, # Example
    OutputFormat,
)
from magicrowspy.config.models import (
    RunMode,
    OutputCardinality,
    OutputConfig,
)
from magicrowspy.utils.schema_generator import generate_json_schema

# Type Hinting for DataFrames (requires optional deps installed)
try:
    import pandas as pd
    PandasDataFrame = pd.DataFrame
except ImportError:
    pd = None
    PandasDataFrame = Any

try:
    import polars as pl
    PolarsDataFrame = pl.DataFrame
except ImportError:
    pl = None
    PolarsDataFrame = Any

DataFrameType = Union[PandasDataFrame, PolarsDataFrame]

# Setup basic logging *before* potential import errors that use it
logger = logging.getLogger(__name__)

# Attempt to import OpenAI client and exceptions *before* class definition
try:
    # Attempt to import OpenAI client
    import openai
    from openai import OpenAI, APIError, RateLimitError, APITimeoutError
except ImportError:
    openai = None
    OpenAI = None
    APIError = Exception
    RateLimitError = Exception
    APITimeoutError = Exception
    logger.warning("OpenAI client not installed. `pip install openai` or `poetry add openai`")

class Enricher:
    """Orchestrates the AI enrichment process for dataframes."""

    def __init__(self, providers: List[BaseProviderConfig]):
        """Initializes the Enricher with configured AI providers.

        Args:
            providers: A list of provider configuration objects 
                       (e.g., OpenAIProviderConfig).
        """
        if not providers:
            raise ValueError("At least one provider configuration must be supplied.")
        
        self.providers: Dict[str, BaseProviderConfig] = {}
        for provider_config in providers:
            if provider_config.integrationName in self.providers:
                logger.warning(
                    f"Duplicate integrationName '{provider_config.integrationName}' found. "
                    f"Overwriting previous provider configuration."
                )
            self.providers[provider_config.integrationName] = provider_config
            logger.info(f"Initialized provider: {provider_config.integrationName}")

    def enrich(
        self,
        input_df: DataFrameType,
        enrichment_config: AIEnrichmentBlockConfig
    ) -> DataFrameType:
        """Enriches the input dataframe based on the provided configuration.

        Args:
            input_df: The pandas or polars DataFrame to enrich.
            enrichment_config: The configuration block detailing the enrichment tasks.

        Returns:
            A new DataFrame (same type as input) with enriched data.

        Raises:
            ValueError: If configuration is invalid or required columns are missing.
            RuntimeError: If AI provider calls fail after retries.
            TypeError: If the input is not a supported DataFrame type.
        """
        logger.info(f"Starting enrichment process with mode: {enrichment_config.mode}")

        # 1. Validate input and config
        provider_name = enrichment_config.integrationName
        if provider_name not in self.providers:
            raise ValueError(
                f"Provider '{provider_name}' specified in enrichment config "
                f"was not found in the initialized providers: {list(self.providers.keys())}"
            )
        provider_conf = self.providers[provider_name]
        # TODO: Add more validation (e.g., check context columns exist in df)

        # 2. Determine DataFrame type and select appropriate processing strategy
        is_pandas = pd is not None and isinstance(input_df, pd.DataFrame)
        is_polars = pl is not None and isinstance(input_df, pl.DataFrame)

        if not is_pandas and not is_polars:
            raise TypeError("Input must be a pandas or polars DataFrame.")

        if is_pandas:
            logger.debug("Processing with pandas backend.")
            return self._enrich_pandas(input_df, enrichment_config, provider_conf)
        elif is_polars:
            logger.debug("Processing with polars backend.")
            return self._enrich_polars(input_df, enrichment_config, provider_conf)
        else:
            # Should be unreachable due to the earlier check
            raise TypeError("Unsupported DataFrame type.") 

    def _enrich_pandas(
        self,
        df: PandasDataFrame,
        config: AIEnrichmentBlockConfig,
        provider_conf: BaseProviderConfig
    ) -> PandasDataFrame:
        """Handles enrichment specifically for pandas DataFrames."""
        logger.info(f"Processing {len(df)} rows with pandas.")

        # Handle preview mode
        if config.mode == RunMode.PREVIEW:
            rows_to_process = config.previewRowCount or 5 # Default preview rows if not set
            logger.info(f"Processing {rows_to_process} rows (mode: RunMode.PREVIEW).")
            process_df = df.head(rows_to_process)
        elif config.mode == RunMode.FULL:
            rows_to_process = len(df)
            logger.info(f"Processing {rows_to_process} rows (mode: RunMode.FULL).")
            process_df = df
        else:
            # Should not happen with Pydantic validation, but safeguard
            raise ValueError(f"Unsupported mode: {config.mode}")

        # Prepare Jinja environment (could be cached)
        jinja_env = Environment()

        # --- Data Collection --- 
        # Store results temporarily. List of dictionaries, one per row.
        all_row_results: List[Dict[str, Any]] = [] 

        for index, row in process_df.iterrows():
            row_results: Dict[str, Any] = {} # Results for this specific row
            logger.debug(f"Processing row index: {index}")

            for output_conf in config.outputs:
                # 1. Determine Context
                context_cols = output_conf.contextColumns or config.contextColumns
                missing_cols = [col for col in context_cols if col not in df.columns]
                if missing_cols:
                    raise ValueError(f"Missing required context columns in DataFrame: {missing_cols}")
                
                prompt_context = row[context_cols].to_dict()

                # 2. Render Prompt
                try:
                    template = jinja_env.from_string(output_conf.prompt)
                    rendered_prompt = template.render(prompt_context)
                except Exception as e:
                    logger.error(f"Jinja prompt rendering failed for output '{output_conf.name}' at index {index}: {e}")
                    # Decide how to handle: skip row, raise error, use default? 
                    # For now, skip this output for this row
                    row_results[output_conf.name] = None # Or some error indicator 
                    continue

                # 3. Generate Schema
                try:
                    output_schema = generate_json_schema(output_conf)
                except ValueError as e:
                     logger.error(f"Failed to generate schema for output '{output_conf.name}': {e}")
                     row_results[output_conf.name] = None
                     continue

                # 4. Call Provider (using placeholder)
                try:
                    provider_result = self._call_provider(
                        provider_conf=provider_conf,
                        model=config.model,
                        temperature=config.temperature,
                        output_schema=output_schema,
                        prompt=rendered_prompt # Use keyword arg now
                    )
                    
                    # 5. Basic Validation (Placeholder - real validation in _call_provider)
                    # jsonschema.validate(instance=provider_result, schema=output_schema)
                    
                    # Store the primary result value (assumes schema has one top-level key)
                    result_key = list(provider_result.keys())[0]
                    row_results[output_conf.name] = provider_result[result_key]

                except Exception as e:
                    logger.error(f"Provider call or validation failed for output '{output_conf.name}' at index {index}: {e}")
                    row_results[output_conf.name] = None # Error indicator

            all_row_results.append(row_results)

        # --- Result Merging --- 
        if not all_row_results:
             logger.warning("No results were generated.")
             if config.outputFormat == OutputFormat.NEW_COLUMNS:
                 output_df = df.copy()
                 for output_conf in config.outputs:
                      output_df[output_conf.name] = pd.NA
                 return output_df
             elif config.outputFormat == OutputFormat.NEW_ROWS:
                 output_columns = config.contextColumns + [o.name for o in config.outputs]
                 return pd.DataFrame(columns=output_columns)
             else:
                 return df.copy() # Fallback for unknown format
        
        if config.outputFormat == OutputFormat.NEW_COLUMNS:
            logger.info("Merging results as new columns.")
            # Join results back to the original df based on index
            # Ensure results_df columns don't clash with original df or handle appropriately
            results_df = pd.DataFrame(all_row_results, index=process_df.index)
            output_df = pd.concat([df, results_df], axis=1)
            return output_df
        elif config.outputFormat == OutputFormat.NEW_ROWS:
            logger.info("Generating new rows from results.")
            new_rows_list = []
            processed_rows_count = len(all_row_results)
            processed_input_df = df.head(processed_rows_count)
            output_column_names = [o.name for o in config.outputs]

            for i, row_result in enumerate(all_row_results):
                original_row = processed_input_df.iloc[i] # Get the original input row
                context_data = original_row[config.contextColumns].to_dict()

                # --- Prepare lists of values for Cartesian product --- 
                output_values_for_product = []
                output_names_in_product_order = []

                # Iterate through each output defined in the config
                for output_conf in config.outputs:
                    output_name = output_conf.name
                    result_value = row_result.get(output_name)

                    if result_value is None:
                        # If an output is missing, use [None] for the product 
                        # so combinations are still generated
                        values_to_process = [None] 
                    elif output_conf.outputCardinality == OutputCardinality.MULTIPLE and isinstance(result_value, list):
                        values_to_process = result_value if result_value else [None] # Use [None] if list is empty
                    elif output_conf.outputCardinality == OutputCardinality.SINGLE:
                        values_to_process = [result_value]
                    elif result_value is not None: # MULTIPLE but not a list, or unexpected type
                        logger.warning(
                            f"Output '{output_name}' is MULTIPLE but result is not a list (value: {result_value}). Treating as single."
                        )
                        values_to_process = [result_value]
                    else: # Should not happen (result_value is None handled above)
                       values_to_process = [None]

                    output_values_for_product.append(values_to_process)
                    output_names_in_product_order.append(output_name)

                # --- Generate rows using Cartesian product --- 
                if not output_values_for_product: # Should not happen if config has outputs
                   continue 

                combinations = itertools.product(*output_values_for_product)

                for combo in combinations:
                    new_row = context_data.copy() # Start with context
                    # Add the results for this specific combination
                    for name, value in zip(output_names_in_product_order, combo):
                         # Use pd.NA for None values coming from the product
                        new_row[name] = value if value is not None else pd.NA 
                    new_rows_list.append(new_row)

            if not new_rows_list:
                logger.warning("No new rows were generated from the results.")
                output_columns = config.contextColumns + output_column_names
                output_df = pd.DataFrame(columns=output_columns)
            else:
                output_df = pd.DataFrame(new_rows_list)
                # Ensure correct column order: context columns first, then output columns
                # Make sure context columns are present before adding output cols
                ordered_columns = [col for col in config.contextColumns if col in output_df.columns] # Start with existing context cols
                for name in output_column_names:
                     if name in output_df.columns and name not in ordered_columns:
                           ordered_columns.append(name)
                # Reindex DataFrame with the desired column order
                output_df = output_df.reindex(columns=ordered_columns)
            return output_df
        else:
             # Should be unreachable
             raise ValueError(f"Unsupported output format: {config.outputFormat}")

    async def _enrich_polars(
        self,
        df: 'pl.DataFrame',
        config: AIEnrichmentBlockConfig,
        provider_conf: BaseProviderConfig
    ) -> 'pl.DataFrame':
        """Enrichment logic specifically for Polars DataFrames."""
        import polars as pl # Dynamic import
        from jinja2 import Environment

        logger.info(f"Processing {len(df)} rows with polars.")

        if pl is None:
            raise ImportError("Polars is required but not installed.")

        # Handle preview mode
        if config.mode == RunMode.PREVIEW:
            rows_to_process = config.previewRowCount or 5 # Default preview rows if not set
            logger.info(f"Processing {rows_to_process} rows (mode: RunMode.PREVIEW).")
            process_df = df.head(rows_to_process)
        elif config.mode == RunMode.FULL:
            rows_to_process = len(df)
            logger.info(f"Processing {rows_to_process} rows (mode: RunMode.FULL).")
            process_df = df
        else:
            # Should not happen with Pydantic validation, but safeguard
            raise ValueError(f"Unsupported mode: {config.mode}")

        # Prepare Jinja environment
        jinja_env = Environment()

        # --- Data Collection using map_rows --- 
        # We need to process each row individually to call the API
        all_row_results: List[Dict[str, Any]] = [] 

        # Polars map_rows expects a function that takes a tuple of row values
        # It's often easier to convert the row to a dict inside the function
        # Alternatively, iterate using df.iter_rows(named=True)

        # Using iter_rows for simplicity in accessing columns by name
        for row_dict in process_df.iter_rows(named=True):
            row_results: Dict[str, Any] = {} # Results for this specific row
            logger.debug(f"Processing row: {row_dict}") # Log subset for brevity

            for output_conf in config.outputs:
                # 1. Determine Context
                context_cols = output_conf.contextColumns or config.contextColumns
                missing_cols = [col for col in context_cols if col not in df.columns]
                if missing_cols:
                    raise ValueError(f"Missing required context columns in DataFrame: {missing_cols}")
                
                prompt_context = {col: row_dict[col] for col in context_cols}

                # 2. Render Prompt
                try:
                    template = jinja_env.from_string(output_conf.prompt)
                    rendered_prompt = template.render(prompt_context)
                except Exception as e:
                    logger.error(f"Jinja prompt rendering failed for output '{output_conf.name}': {e}")
                    row_results[output_conf.name] = None
                    continue

                # 3. Generate Schema
                try:
                    output_schema = generate_json_schema(output_conf)
                except ValueError as e:
                    logger.error(f"Failed to generate schema for output '{output_conf.name}': {e}")
                    row_results[output_conf.name] = None
                    continue

                # 4. Call Provider
                try:
                    provider_result = self._call_provider(
                        provider_conf=provider_conf,
                        model=config.model,
                        temperature=config.temperature,
                        output_schema=output_schema,
                        prompt=rendered_prompt
                    )
                    result_key = list(provider_result.keys())[0]
                    row_results[output_conf.name] = provider_result[result_key]
                except Exception as e:
                    logger.error(f"Provider call or validation failed for output '{output_conf.name}': {e}")
                    row_results[output_conf.name] = None

            all_row_results.append(row_results)

        # --- Result Merging --- 
        if not all_row_results:
             logger.warning("No results were generated.")
             return df.clone() # Return original if no rows processed/succeeded
        
        output_column_names = [o.name for o in config.outputs]

        if config.outputFormat == OutputFormat.NEW_COLUMNS:
            logger.info("Merging results as new columns (Polars).")
            # Check if we only processed a preview
            if config.mode == RunMode.PREVIEW:
                 # Create null columns for the rest of the DataFrame
                 null_columns = {col: pl.lit(None).cast(pl.DataFrame(all_row_results).schema[col].dtype) for col in pl.DataFrame(all_row_results).columns}
                 # Combine results with nulls for the tail
                 results_aligned_df = pl.concat([
                      pl.DataFrame(all_row_results),
                      pl.DataFrame(null_columns).lazy().fetch(len(df) - len(process_df))
                 ])
                 output_df = df.hstack(results_aligned_df) # Horizontal stack
            else:
                 # Full processing, results_df matches length of df
                 output_df = df.hstack(pl.DataFrame(all_row_results))
                 
            return output_df
        elif config.outputFormat == OutputFormat.NEW_ROWS:
            logger.info("Generating new rows from results (Polars).")
            new_rows_list = []

            processed_input_df = df.head(len(all_row_results)) # Get the part of the df that was processed

            for i, row_result in enumerate(all_row_results):
                original_row = processed_input_df.row(i, named=True) # Get original row as dict
                context_data = {col: original_row[col] for col in config.contextColumns}

                # --- Prepare lists of values for Cartesian product --- 
                output_values_for_product = []
                output_names_in_product_order = []

                for output_conf in config.outputs:
                    output_name = output_conf.name
                    result_value = row_result.get(output_name)
                    values_to_process = [] # List to hold values for this output for the product
                    if result_value is None:
                        values_to_process = [None]
                    elif output_conf.outputCardinality == OutputCardinality.MULTIPLE and isinstance(result_value, list):
                        values_to_process = result_value if result_value else [None]
                    elif output_conf.outputCardinality == OutputCardinality.SINGLE:
                        values_to_process = [result_value]
                    elif result_value is not None: # MULTIPLE but not a list
                        logger.warning(
                            f"Output '{output_name}' is MULTIPLE but result is not a list (Polars) (value: {result_value}). Treating as single."
                        )
                        values_to_process = [result_value]
                    else:
                       values_to_process = [None]

                    output_values_for_product.append(values_to_process)
                    output_names_in_product_order.append(output_name)

                # --- Generate rows using Cartesian product --- 
                if not output_values_for_product:
                   continue 

                combinations = itertools.product(*output_values_for_product)

                for combo in combinations:
                    new_row = context_data.copy()
                    for name, value in zip(output_names_in_product_order, combo):
                        new_row[name] = value # Polars handles None correctly
                    new_rows_list.append(new_row)

            if not new_rows_list:
                logger.warning("No new rows were generated from the results (Polars).")
                ordered_columns = config.contextColumns + output_column_names
                return pl.DataFrame({col: [] for col in ordered_columns}) # Empty DF with schema

            output_df = pl.from_dicts(new_rows_list) # Create DataFrame from list of dicts
            # Ensure correct column order
            ordered_columns = config.contextColumns + output_column_names
            # Select columns in the desired order, handling potential missing columns
            existing_ordered_columns = [col for col in ordered_columns if col in output_df.columns]
            output_df = output_df.select(existing_ordered_columns)
            return output_df
        else:
             raise ValueError(f"Unsupported output format: {config.outputFormat}")

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=10),
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type((RateLimitError, APITimeoutError, APIError)),
        reraise=True # Reraise the exception if all retries fail
    )
    def _call_provider_with_retry(
        self,
        client: Any, # OpenAI client instance
        model: str,
        messages: List[Dict[str, str]],
        tools: List[Dict[str, Any]],
        tool_choice: Dict[str, Any],
        temperature: float,
    ) -> Any:
        """Wraps the OpenAI API call with tenacity retry logic."""
        logger.debug(f"Calling OpenAI API. Model: {model}, Temp: {temperature}, ToolChoice: {tool_choice['function']['name']}")
        try:
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                tools=tools,
                tool_choice=tool_choice, # Force model to use the specified tool
                temperature=temperature,
                response_format={"type": "json_object"} # If we didn't use tools, could use this
            )
            return response
        except APIError as e:
            logger.error(f"OpenAI API Error: {e.status_code} - {e.message}")
            raise
        except RateLimitError as e:
            logger.warning(f"OpenAI Rate Limit Error: {e.message}. Retrying...")
            raise
        except APITimeoutError as e:
            logger.warning(f"OpenAI API Timeout Error: {e.message}. Retrying...")
            raise
        except Exception as e:
            logger.exception(f"An unexpected error occurred during OpenAI API call: {e}")
            raise # Re-raise unexpected errors

    def _call_provider(
        self,
        provider_conf: BaseProviderConfig,
        model: str,
        temperature: float,
        output_schema: Dict[str, Any],
        prompt: Optional[str] = None, # Prompt might become optional if using structured inputs later
    ) -> Dict[str, Any]:
        """Placeholder for making the actual call to the AI provider.

        This method will need to:
        - Select the correct API client based on provider_conf type.
        - Format the request according to the provider's API (e.g., tool calls for OpenAI).
        - Implement retries using Tenacity.
        - Handle API errors.
        - Parse the response.
        - Validate the response structure against output_schema (using jsonschema).
        """
        if not isinstance(provider_conf, OpenAIProviderConfig):
            raise NotImplementedError(f"Provider type {type(provider_conf).__name__} is not yet supported.")

        if not openai or not OpenAI:
             raise ImportError("OpenAI client is required but not installed. Please install it.")

        # --- Get API Key --- 
        api_key = provider_conf.apiKey or os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OpenAI API key not found in config or OPENAI_API_KEY environment variable.")

        # --- Initialize Client ---
        client = OpenAI(api_key=api_key)

        # --- Prepare Request for OpenAI Tool Usage --- 
        if not prompt:
             raise ValueError("Prompt cannot be empty for OpenAI provider call.")

        # Construct the 'function' part of the tool definition from the schema
        # We expect the schema to have one top-level property defining the output structure.
        if len(output_schema.get("properties", {})) != 1:
             raise ValueError("Output schema must define exactly one top-level property for OpenAI tool usage.")
        
        function_name = list(output_schema["properties"].keys())[0]
        function_description = output_schema.get("description", f"Extract information for {function_name}")
        function_parameters = output_schema # The schema itself defines the parameters

        tools = [
            {
                "type": "function",
                "function": {
                    "name": function_name,
                    "description": function_description,
                    "parameters": function_parameters,
                },
            }
        ]
        tool_choice = {"type": "function", "function": {"name": function_name}}

        messages = [
            {"role": "system", "content": f"You are an AI assistant. Ensure your response is a valid JSON object matching the following JSON schema: \n{json.dumps(output_schema, indent=2)}"},
            {"role": "user", "content": prompt}
        ]

        # --- Call Provider with Retry --- 
        try:
            response = self._call_provider_with_retry(
                client=client,
                model=model,
                messages=messages,
                tools=tools,
                tool_choice=tool_choice,
                temperature=temperature
            )
        except Exception as e:
             logger.error(f"OpenAI API call failed after retries: {e}")
             raise RuntimeError("Failed to get response from OpenAI after multiple attempts.") from e

        # --- Parse Response --- 
        try:
            tool_calls = response.choices[0].message.tool_calls
            if not tool_calls or len(tool_calls) == 0:
                 logger.error(f"OpenAI response did not contain expected tool calls. Response: {response}")
                 raise ValueError("OpenAI response missing tool calls.")
            
            # Assuming only one tool call was requested and made
            arguments_str = tool_calls[0].function.arguments
            parsed_arguments = json.loads(arguments_str)
            logger.info(f"Received and parsed arguments from OpenAI: {parsed_arguments}")

        except (json.JSONDecodeError, IndexError, AttributeError, KeyError) as e:
             logger.exception(f"Failed to parse tool call arguments from OpenAI response: {response}. Error: {e}")
             raise ValueError("Failed to parse valid JSON arguments from OpenAI tool call.") from e

        # --- Validate Response --- 
        try:
            jsonschema.validate(instance=parsed_arguments, schema=output_schema)
            logger.debug(f"OpenAI response validated successfully against schema.")
        except jsonschema.ValidationError as e:
            logger.error(f"OpenAI response FAILED validation: {e}")
            # In a real scenario, this might trigger a retry or return an error indicator
            raise ValueError("Provider response failed schema validation") from e
            
        return parsed_arguments
