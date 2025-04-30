"""Core data enrichment orchestrator."""

import logging
from typing import List, Union, Dict, Any, Optional, Tuple, Type
from pathlib import Path 
from jinja2 import Environment, Template
import jsonschema 
import json 
import os 
import itertools 
import time 
import asyncio 
import math
import sys

# Import pandas and polars safely
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False
    pd = None

try:
    import polars as pl
    POLARS_AVAILABLE = True
except ImportError:
    POLARS_AVAILABLE = False
    pl = None

# Define DataFrameType based on available libraries
if PANDAS_AVAILABLE and POLARS_AVAILABLE:
    DataFrameType = Union[pd.DataFrame, pl.DataFrame]
    SeriesType = Union[pd.Series, pl.Series]
elif PANDAS_AVAILABLE:
    DataFrameType = pd.DataFrame
    SeriesType = pd.Series
elif POLARS_AVAILABLE:
    DataFrameType = pl.DataFrame
    SeriesType = pl.Series
else:
    DataFrameType = Any
    SeriesType = Any

from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

# Attempt to import OpenAI client and exceptions
try:
    import openai
    from openai import OpenAI, AsyncOpenAI, APIError, RateLimitError, APITimeoutError, BadRequestError
    OPENAI_AVAILABLE = True
except ImportError:
    openai = None
    OpenAI = None
    AsyncOpenAI = None
    APIError = Exception
    RateLimitError = Exception
    APITimeoutError = Exception
    BadRequestError = Exception 
    OPENAI_AVAILABLE = False
    logger = logging.getLogger('magicrowspy')
    logger.warning("OpenAI client not installed. `pip install openai` or `poetry add openai`")

# Configuration Models
from magicrowspy.config import (
    AIEnrichmentBlockConfig,
    BaseProviderConfig, 
    # ProviderConfig,     # Removed as it's not directly exported/needed here
    OpenAIProviderConfig, 
    OutputFormat,
    OutputType,         # Ensure OutputType is imported here
    load_preset 
)
from magicrowspy.config.models import (
    RunMode,
    OutputCardinality,
    OutputConfig,
)
from magicrowspy.utils.schema_generator import generate_json_schema

from magicrowspy.core.provider_handler import ProviderHandler 
from magicrowspy.core.prompt_builder import PromptBuilder 

# Use a logger specific to the library
logger = logging.getLogger('magicrowspy')

# --- Helper Functions --- #

def _get_dataframe_type(df: Any) -> str:
    """Checks if the input is a pandas or polars DataFrame."""
    if PANDAS_AVAILABLE and isinstance(df, pd.DataFrame):
        return "pandas"
    elif POLARS_AVAILABLE and isinstance(df, pl.DataFrame):
        return "polars"
    else:
        return "unsupported"

# --- Main Enricher Class --- #

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

    async def enrich(
        self,
        input_df: DataFrameType,
        config_source: Union[str, Path, AIEnrichmentBlockConfig],
        log_requests: bool = False,
        log_summary: bool = False 
    ) -> DataFrameType:
        """Enriches the input dataframe based on the provided configuration, with options for logging requests and a final summary."""
        start_total_time = time.perf_counter()
        total_aggregated_usage = {
            'prompt_tokens': 0,
            'completion_tokens': 0,
            'total_tokens': 0,
            'successful_calls': 0
        }
        total_api_duration_across_batches = 0.0
        total_rows_processed = 0
        total_batches = 0

        # Determine DataFrame type and load configuration
        df_type = _get_dataframe_type(input_df)
        if df_type == "unsupported":
            raise ValueError("Input data must be a pandas or polars DataFrame.")

        # Load configuration (handling bundled vs. external paths)
        config = load_preset(config_source)

        # --- Batch Processing --- #
        batch_size = 10 
        num_batches = math.ceil(len(input_df) / batch_size)
        results_list = []

        # Display progress bar
        logger.info(f"Starting enrichment process for {len(input_df)} rows in {num_batches} batches.")
        try:
            from tqdm.asyncio import tqdm_asyncio
            progress_bar = tqdm_asyncio
        except ImportError:
            try:
                from tqdm.notebook import tqdm as tqdm_notebook
                if 'ipykernel' in sys.modules:
                    logger.warning("Using tqdm.notebook for progress; behavior in pure async environments may vary.")
                    progress_bar = lambda iterable, **kwargs: tqdm_notebook(iterable, **kwargs)
                else:
                    logger.warning("tqdm not found. Progress bar disabled. Install tqdm for progress updates.")
                    progress_bar = lambda iterable, **kwargs: iterable
            except ImportError:
                logger.warning("tqdm not found. Progress bar disabled. Install tqdm for progress updates.")
                progress_bar = lambda iterable, **kwargs: iterable

        for i in progress_bar(range(num_batches), total=num_batches, desc="Enriching Batches"):
            batch_start_index = i * batch_size
            batch_end_index = min((i + 1) * batch_size, len(input_df))
            batch_df = input_df[batch_start_index:batch_end_index]

            if not batch_df.empty:
                total_batches += 1
                
                # Determine the correct gather function based on tqdm availability
                gather_func = progress_bar.gather if hasattr(progress_bar, 'gather') else asyncio.gather
                
                batch_results, batch_usage, batch_api_duration = await self._process_batch(
                    batch_df,
                    config,
                    log_requests,
                    gather_func # Pass the gather function
                )
                results_list.extend(batch_results)
                total_api_duration_across_batches += batch_api_duration
                total_rows_processed += len(batch_df)

                if batch_usage:
                    total_aggregated_usage['prompt_tokens'] += batch_usage.get('prompt_tokens', 0)
                    total_aggregated_usage['completion_tokens'] += batch_usage.get('completion_tokens', 0)
                    total_aggregated_usage['total_tokens'] += batch_usage.get('total_tokens', 0)
                    total_aggregated_usage['successful_calls'] += batch_usage.get('successful_calls', 0)

        # --- Post-processing --- #
        output_df = self._convert_to_dataframe(results_list, df_type)

        end_total_time = time.perf_counter()
        total_duration_seconds = end_total_time - start_total_time
        processing_duration_seconds = total_duration_seconds - total_api_duration_across_batches

        if log_summary:
            COST_PER_MILLION_INPUT_TOKENS = 5.00
            COST_PER_MILLION_OUTPUT_TOKENS = 15.00

            input_cost = (total_aggregated_usage['prompt_tokens'] / 1_000_000) * COST_PER_MILLION_INPUT_TOKENS
            output_cost = (total_aggregated_usage['completion_tokens'] / 1_000_000) * COST_PER_MILLION_OUTPUT_TOKENS
            total_cost = input_cost + output_cost

            avg_api_time_per_call = (
                total_api_duration_across_batches / total_aggregated_usage['successful_calls']
                if total_aggregated_usage['successful_calls'] > 0 else 0.0
            )
            avg_total_time_per_row = total_duration_seconds / total_rows_processed if total_rows_processed > 0 else 0.0

            print("\n========== Enrichment Summary ==========", flush=True)
            print(f"Total Rows Processed: {total_rows_processed}", flush=True)
            print(f"Total Batches:        {total_batches}", flush=True)
            print(f"Successful API Calls: {total_aggregated_usage['successful_calls']}", flush=True)
            print("------------------------------------", flush=True)
            print(f"Total Time Elapsed:   {total_duration_seconds:.4f} s", flush=True)
            print(f"Total API Time:       {total_api_duration_across_batches:.4f} s", flush=True)
            print(f"Total Processing Time:{processing_duration_seconds:.4f} s (Total - API)", flush=True)
            print(f"Avg. API Time/Call:   {avg_api_time_per_call:.4f} s", flush=True)
            print(f"Avg. Total Time/Row:  {avg_total_time_per_row:.4f} s", flush=True)
            print("------------------------------------", flush=True)
            print(f"Input Tokens:         {total_aggregated_usage['prompt_tokens']}", flush=True)
            print(f"Output Tokens:        {total_aggregated_usage['completion_tokens']}", flush=True)
            print(f"Total Tokens:         {total_aggregated_usage['total_tokens']}", flush=True)
            print("------------------------------------", flush=True)
            print(f"Estimated Input Cost: ${input_cost:.6f} (@ ${COST_PER_MILLION_INPUT_TOKENS}/M)", flush=True)
            print(f"Estimated Output Cost:${output_cost:.6f} (@ ${COST_PER_MILLION_OUTPUT_TOKENS}/M)", flush=True)
            print(f"Estimated Total Cost: ${total_cost:.6f}", flush=True)
            print("======================================\n", flush=True)

        logger.info("Enrichment process completed.")
        return output_df

    def _convert_to_dataframe(self, data: List[Dict[str, Any]], df_type: str) -> DataFrameType:
        if df_type == "pandas":
            return pd.DataFrame(data)
        elif df_type == "polars":
            return pl.DataFrame(data)
        else:
            raise ValueError("Unsupported DataFrame type.")

    @retry(stop=stop_after_attempt(3), 
           wait=wait_exponential(multiplier=1, min=4, max=10),
           retry=retry_if_exception_type((APIError, RateLimitError, APITimeoutError)))
    async def _call_provider(
        self,
        provider_handler: ProviderHandler,
        prompt: str,
        output_config: OutputConfig,
        config: AIEnrichmentBlockConfig,
        row_data: Dict[str, Any],
        log_requests: bool
    ) -> Tuple[Optional[Any], Optional[Dict[str, int]], float]:
        start_api_time = time.perf_counter()
        usage_stats = None
        parsed_content = None
        response = None
        
        try:
            if log_requests:
                logger.info(f"\n--- Request ---\nRow: {row_data.get('<row_index>', 'N/A')}\nOutput: {output_config.name}\nPrompt:\n{prompt}\n---------------")

            response = await provider_handler.generate_completion(
                model=config.model,
                prompt=prompt,
                temperature=config.temperature,
                output_config=output_config
            )

            parsed_content = provider_handler.parse_response(response, output_config)
            usage_stats = provider_handler.extract_usage(response) 
            if usage_stats: 
                 usage_stats['successful_calls'] = 1
                 
            if output_config.outputType == OutputType.JSON and output_config.outputSchema:
                try:
                    jsonschema.validate(instance=parsed_content, schema=output_config.outputSchema)
                except jsonschema.ValidationError as e:
                    logger.error(f"Schema validation failed for row {row_data.get('<row_index>', 'N/A')}, output '{output_config.name}': {e}")
                    parsed_content = {"error": f"Schema validation failed: {e.message}"} 
                    if usage_stats: usage_stats['successful_calls'] = 0 
                    
            if log_requests:
                 logger.info(f"\n--- Response ---\nRow: {row_data.get('<row_index>', 'N/A')}\nOutput: {output_config.name}\nContent: {parsed_content}\nUsage: {usage_stats}\n----------------")

        except BadRequestError as e:
            logger.error(f"Bad Request Error (likely prompt issue) for row {row_data.get('<row_index>', 'N/A')}, output '{output_config.name}': {e}", exc_info=True)
            parsed_content = {"error": f"API Bad Request: {e}"}
        except APIError as e:
            logger.error(f"API Error during enrichment for row {row_data.get('<row_index>', 'N/A')}, output '{output_config.name}': {e}", exc_info=True)
            parsed_content = {"error": f"API Error: {e}"} 
            raise 
        except (RateLimitError, APITimeoutError) as e:
            logger.warning(f"{type(e).__name__} encountered for row {row_data.get('<row_index>', 'N/A')}, output '{output_config.name}'. Retrying...", exc_info=False)
            parsed_content = {"error": f"{type(e).__name__}: {e}"} 
            raise 
        except Exception as e:
            logger.error(f"Unexpected error during enrichment for row {row_data.get('<row_index>', 'N/A')}, output '{output_config.name}': {e}", exc_info=True)
            parsed_content = {"error": f"Unexpected error: {e}"}

        finally:
            end_api_time = time.perf_counter()
            api_duration = end_api_time - start_api_time

        return parsed_content, usage_stats, api_duration

    async def _process_row_item(
        self,
        row_tuple: Tuple[int, Any], 
        config: AIEnrichmentBlockConfig,
        log_requests: bool,
    ) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, int]], float]:
        row_index, row_data = row_tuple
        row_data['<row_index>'] = row_index 
        
        provider_config = self.providers.get(config.integrationName)
        if not provider_config:
            logger.error(f"Provider '{config.integrationName}' not found for row {row_index}.")
            return {"error": f"Provider '{config.integrationName}' not found"}, None, 0.0
        
        if isinstance(provider_config, OpenAIProviderConfig) and OPENAI_AVAILABLE:
             try:
                 # Instantiate the ASYNC client
                 client = AsyncOpenAI(api_key=provider_config.apiKey) 
                 provider_handler = ProviderHandler(client=client, provider_type='openai') 
             except Exception as e:
                 logger.error(f"Failed to initialize OpenAI client: {e}", exc_info=True)
                 return {"error": f"Failed to initialize provider: {e}"}, None, 0.0
        else:
             logger.error(f"Unsupported provider type or OpenAI not available for '{config.integrationName}'.")
             return {"error": f"Unsupported provider '{config.integrationName}'"}, None, 0.0

        processed_row_data = {} 
        aggregated_row_usage = {'prompt_tokens': 0, 'completion_tokens': 0, 'total_tokens': 0, 'successful_calls': 0}
        total_row_api_duration = 0.0

        for output_config in config.outputs:
            prompt_builder = PromptBuilder(output_config, config.contextColumns)
            try:
                prompt = prompt_builder.build_prompt(row_data) 
            except Exception as e:
                logger.error(f"Failed to build prompt for row {row_index}, output '{output_config.name}': {e}", exc_info=True)
                if config.outputFormat == OutputFormat.NEW_COLUMNS:
                    processed_row_data[output_config.name] = {"error": f"Prompt build failed: {e}"}
                    if output_config.includeReasoning:
                         processed_row_data[f"{output_config.name}_reasoning"] = "N/A (Prompt Error)"
                continue 

            parsed_content, usage_stats, api_duration = await self._call_provider(
                provider_handler=provider_handler,
                prompt=prompt,
                output_config=output_config,
                config=config,
                row_data=row_data, 
                log_requests=log_requests
            )
            
            total_row_api_duration += api_duration
            if usage_stats:
                aggregated_row_usage['prompt_tokens'] += usage_stats.get('prompt_tokens', 0)
                aggregated_row_usage['completion_tokens'] += usage_stats.get('completion_tokens', 0)
                aggregated_row_usage['total_tokens'] += usage_stats.get('total_tokens', 0)
                aggregated_row_usage['successful_calls'] += usage_stats.get('successful_calls', 0)

            if config.outputFormat == OutputFormat.NEW_COLUMNS:
                reasoning_content = "N/A"
                final_content = parsed_content
                
                if isinstance(parsed_content, dict) and 'reasoning' in parsed_content and 'answer' in parsed_content:
                    reasoning_content = parsed_content.get('reasoning', 'Error extracting reasoning')
                    final_content = parsed_content.get('answer', {'error': 'Error extracting answer'})
                    
                processed_row_data[output_config.name] = final_content
                if output_config.includeReasoning:
                    processed_row_data[f"{output_config.name}_reasoning"] = reasoning_content

            elif config.outputFormat == OutputFormat.NEW_ROWS:
                 processed_row_data[output_config.name] = parsed_content 

        if config.outputFormat == OutputFormat.NEW_COLUMNS:
            original_data = {k: v for k, v in row_data.items() if k != '<row_index>'}
            final_row_output = {**original_data, **processed_row_data}
        elif config.outputFormat == OutputFormat.NEW_ROWS:
            original_keys = {k: v for k, v in row_data.items() if k in config.contextColumns or k == '<row_index>'}
            final_row_output = {**original_keys, **processed_row_data}
        else: 
             final_row_output = {"error": "Invalid outputFormat"}
             
        return final_row_output, aggregated_row_usage, total_row_api_duration

    async def _process_batch(
        self,
        batch_df: DataFrameType,
        config: AIEnrichmentBlockConfig,
        log_requests: bool,
        gather_func: callable # Accept the gather function as argument
    ) -> Tuple[List[Dict[str, Any]], Optional[Dict[str, int]], float]:
        """Processes a batch of rows concurrently and aggregates results, usage, and duration."""
        tasks = []
        if PANDAS_AVAILABLE and isinstance(batch_df, pd.DataFrame):
            row_items = list(batch_df.iterrows())
        elif POLARS_AVAILABLE and isinstance(batch_df, pl.DataFrame):
             rows_as_dicts = batch_df.to_dicts()
             row_items = list(enumerate(rows_as_dicts)) 
        else:
             logger.error("Unsupported DataFrame type in _process_batch")
             return [], {'successful_calls': 0}, 0.0

        for row_tuple in row_items:
            tasks.append(
                self._process_row_item(
                    row_tuple=row_tuple,
                    config=config,
                    log_requests=log_requests,
                )
            )
        
        # Run tasks concurrently with the provided gather function
        results_tuples = await gather_func(*tasks, desc="Processing Rows in Batch", leave=False)
        
        # Aggregate results, usage, and duration from the batch
        batch_results_list = []
        aggregated_batch_usage = {'prompt_tokens': 0, 'completion_tokens': 0, 'total_tokens': 0, 'successful_calls': 0}
        total_batch_api_duration = 0.0
        
        for result_data, usage_stats, api_duration in results_tuples:
            if result_data:
                result_data.pop('<row_index>', None)
                batch_results_list.append(result_data)
                
            if usage_stats:
                aggregated_batch_usage['prompt_tokens'] += usage_stats.get('prompt_tokens', 0)
                aggregated_batch_usage['completion_tokens'] += usage_stats.get('completion_tokens', 0)
                aggregated_batch_usage['total_tokens'] += usage_stats.get('total_tokens', 0)
                aggregated_batch_usage['successful_calls'] += usage_stats.get('successful_calls', 0)
            total_batch_api_duration += api_duration
            
        return batch_results_list, aggregated_batch_usage, total_batch_api_duration
