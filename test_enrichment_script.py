"""Basic script to test the magicrowspy enricher functionality."""

import os
import sys
import logging
from pathlib import Path
import pandas as pd
import asyncio
import json
import datetime

# --- Configuration --- 
# Adjust the path to your preset file if necessary
# Assumes the script is run from the project root
PRESET_FILE_PATH_TASKS = "src/shared/presets_library/ISCOTasks_preset.ts" 
PRESET_FILE_PATH_NOVELTY = "src/shared/presets_library/ISCONovelty_preset.ts" 
# The variable name holding the config object inside the TS file
CONFIG_VARIABLE_NAME_TASKS = "ISCOtasksConfig"
CONFIG_VARIABLE_NAME_NOVELTY = "ISCONoveltyConfig"

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(name)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("test_script")

# Make sure the magicrowspy logger is also set to INFO level to capture all API details
logging.getLogger("magicrowspy").setLevel(logging.INFO)
logging.getLogger("magicrowspy.core.enricher").setLevel(logging.INFO)

# --- Check Dependencies --- 
try:
    import pandas as pd
except ImportError:
    logger.error("Pandas not found. Please install it: pip install pandas or poetry add pandas")
    sys.exit(1)

try:
    from magicrowspy import Enricher, load_preset
    from magicrowspy.config import OpenAIProviderConfig
    from magicrowspy.config.models import RunMode, AIEnrichmentBlockConfig, OutputConfig
except ImportError as e:
    logger.error(f"Failed to import magicrowspy components: {e}. Ensure the package is installed or PYTHONPATH is set correctly.")
    sys.exit(1)

# --- Get API Key --- 
api_key = os.environ.get("OPENAI_API_KEY")
if not api_key:
    logger.error("OPENAI_API_KEY environment variable not set. Cannot run test.")
    sys.exit(1)

# --- Load Preset --- 
logger.info(f"Loading preset '{CONFIG_VARIABLE_NAME_TASKS}' from '{PRESET_FILE_PATH_TASKS}'...")
try:
    # Load the raw config dictionary
    raw_config_tasks_dict = load_preset(PRESET_FILE_PATH_TASKS, CONFIG_VARIABLE_NAME_TASKS)
    # Validate and parse into the Pydantic model
    enrichment_config_tasks = AIEnrichmentBlockConfig.model_validate(raw_config_tasks_dict)
    logger.info("Preset loaded and validated successfully.")
    # --- Optional: Override Configuration for Testing --- 
    # By default, the script uses the settings from the loaded preset.
    # Uncomment and modify the line below to change settings like mode or row count for testing.
    # Example: Run only the first 2 rows in PREVIEW mode.
    # enrichment_config_tasks = enrichment_config_tasks.model_copy(update={"mode": RunMode.PREVIEW, "previewRowCount": 2})
    # logger.info(f"OVERRIDE: Running Tasks in PREVIEW mode with {enrichment_config_tasks.previewRowCount} rows.")
except FileNotFoundError:
    logger.error(f"Preset file not found at: {PRESET_FILE_PATH_TASKS}")
    sys.exit(1)
except Exception as e:
    # Catch potential Pydantic validation errors too
    logger.error(f"Failed to load, parse, or validate preset '{CONFIG_VARIABLE_NAME_TASKS}': {e}")
    sys.exit(1)

logger.info(f"Loading preset '{CONFIG_VARIABLE_NAME_NOVELTY}' from '{PRESET_FILE_PATH_NOVELTY}'...")
try:
    enrichment_config_novelty = load_preset(PRESET_FILE_PATH_NOVELTY, CONFIG_VARIABLE_NAME_NOVELTY)
    logger.info("Successfully loaded, parsed and validated ISCONovelty config.")

    # Removed loop that manually modified includeReasoning. 
    # Reasoning is now enabled by default in the OutputConfig model.
    logger.info("Reasoning is enabled by default for all outputs.")

except FileNotFoundError:
    logger.error(f"Preset file not found at: {PRESET_FILE_PATH_NOVELTY}")
    sys.exit(1)
except Exception as e:
    # Catch potential Pydantic validation errors too
    logger.error(f"Failed to load, parse or validate preset '{CONFIG_VARIABLE_NAME_NOVELTY}': {e}")
    sys.exit(1)

# --- Create Sample Data --- 
logger.info("Loading data from CSV...")
csv_file_path_str = "/Users/victoriano/Desktop/MagicRows Data/Tasks EU15.csv"
csv_file_path = Path(csv_file_path_str)

try:
    if not csv_file_path.is_file():
        raise FileNotFoundError(f"CSV file not found at specified path: {csv_file_path_str}")

    input_df_tasks = pd.read_csv(csv_file_path)
    logger.info(f"Loaded {len(input_df_tasks)} rows from {csv_file_path_str}")
    # Log head for preview
    logger.info(f"Sample DataFrame (first 5 rows):\n{input_df_tasks.head()}") 

except FileNotFoundError as e:
    logger.error(e)
    sys.exit(1)
except Exception as e:
    logger.error(f"Failed to read or process CSV file: {e}")
    sys.exit(1)

# Create a sample DataFrame for the Novelty task
novelty_df = pd.DataFrame([
    {
        "isco": "1111",
        "ISCO_Name": "Chief Executives, Senior Officials and Legislators",
        "Task_Description": "Oversee and direct the overall operations of organizations.",
        "nace": "J62"
    },
    # {
    #     "isco": "2166",
    #     "ISCO_Name": "Computer Network and Systems Technicians",
    #     "Task_Description": "Analyze user requirements to design and develop system architecture.",
    #     "nace": "A01"
    # },
    # {
    #     "isco": "9629",
    #     "ISCO_Name": "Other Elementary Workers Not Elsewhere Classified",
    #     "Task_Description": "Perform routine tasks requiring little previous training.",
    #     "nace": "N81"
    # }
])

logger.info("\nISCO Novelty - Input DataFrame:")
logger.info(novelty_df)
input_df_novelty = novelty_df.copy()

# --- Define Async Main Function --- 
async def main():
    # --- Configure Provider & Enricher --- 
    logger.info("Configuring provider and enricher...")
    openai_provider = OpenAIProviderConfig(
        integrationName="myOpenAI", # Must match the name used in presets
        apiKey=api_key, # Already checked it exists
    )

    enricher = Enricher(providers=[openai_provider])
    logger.info("Enricher initialized.")

    # --- Run Enrichment --- 
    logger.info("Starting enrichment process...")
    try:
        # Removed loop enabling reasoning for 'automation_tasks'. Reasoning is default.
        # for output_conf in enrichment_config_tasks.outputs:
        #     if output_conf.name == 'automation_tasks':
        #         output_conf.includeReasoning = True
        #         logger.info(f"Enabled reasoning for: {output_conf.name}")
        #         break

        output_df_tasks = await enricher.enrich(input_df_tasks, enrichment_config_tasks)
        logger.info("Enrichment process completed for Tasks.")
        logger.info(f"Output DataFrame for Tasks:\n{output_df_tasks}")

        # --- DEBUG LOG --- 
        logger.debug(f"[test_script] Novelty config outputs BEFORE enrich call: {enrichment_config_novelty.outputs}")
        # --- END DEBUG LOG ---
        
        output_df_novelty = await enricher.enrich(input_df_novelty, enrichment_config_novelty)
        logger.info("Enrichment process completed for Novelty.")
        logger.info(f"Output DataFrame for Novelty:\n{output_df_novelty}")

        # --- Export Result --- 
        # Get Desktop path
        desktop_path = Path.home() / "Desktop"
        desktop_path.mkdir(parents=True, exist_ok=True) # Ensure Desktop exists

        # Create timestamp
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

        # --- Export Tasks --- 
        # Construct new filename with timestamp
        output_filename_tasks = f"{csv_file_path.stem}_enriched_tasks_{timestamp}{csv_file_path.suffix}"
        # Construct full path to Desktop
        output_path_tasks = desktop_path / output_filename_tasks 
        try:
            output_df_tasks.to_csv(output_path_tasks, index=False)
            logger.info(f"Successfully exported enriched data for Tasks to: {output_path_tasks}")
        except Exception as e:
            logger.error(f"Failed to export DataFrame for Tasks to CSV: {e}")

        # --- Export Novelty --- 
        # Construct new filename with timestamp
        output_filename_novelty = f"{csv_file_path.stem}_enriched_novelty_{timestamp}{csv_file_path.suffix}"
        # Construct full path to Desktop
        output_path_novelty = desktop_path / output_filename_novelty
        try:
            output_df_novelty.to_csv(output_path_novelty, index=False)
            logger.info(f"Successfully exported enriched data for Novelty to: {output_path_novelty}")
        except Exception as e:
            logger.error(f"Failed to export DataFrame for Novelty to CSV: {e}")

    except ValueError as e:
        logger.error(f"Configuration or Data Validation Error: {e}")
    except RuntimeError as e:
        logger.error(f"Runtime Error during enrichment (e.g., API failure after retries): {e}")
    except ImportError as e:
        logger.error(f"Import Error (likely missing dependency like 'openai'): {e}")
    except Exception as e:
        logger.exception(f"An unexpected error occurred during enrichment: {e}")

    logger.info("Test script finished.")

# --- Run the async main function --- 
if __name__ == "__main__":
    asyncio.run(main())

    # Add a special test to show the OpenAI request/response structure clearly
    print("\n\n=== TESTING OPENAI SCHEMA STRUCTURE ===\n")
    
    # Setup a simplified test to see OpenAI schema structure
    import logging
    import json
    from magicrowspy.core.enricher import Enricher
    # Corrected import paths
    from magicrowspy.config import OpenAIProviderConfig 
    from magicrowspy.config.models import OutputConfig, OutputType, OutputCategory, OutputCardinality
    
    # Set up minimal config for testing
    # Assuming OpenAIProviderConfig is defined elsewhere or use BaseProviderConfig if more generic
    provider_conf = OpenAIProviderConfig(
        integrationName="minimal_openai_test", # Use integrationName for consistency
        apiKey=os.environ.get("OPENAI_API_KEY"), # apiKey should be passed here
        # The fields below are not part of OpenAIProviderConfig 
        # modelName="gpt-4.1-nano", # Pass model during _call_provider
        # type="openai", # This is inferred or handled internally
        # temperature=0.1 # Pass temperature during _call_provider
    )
    
    # Set up a simple output config for novelty_rating.
    # includeReasoning defaults to True, so no need to specify it here.
    output_conf = OutputConfig(
        name="test_rating",
        prompt="Evaluate how novel this is: Chief Executive tasks in J62 sector",
        outputType=OutputType.CATEGORY,
        outputCardinality=OutputCardinality.SINGLE,
        outputCategories=[
            OutputCategory(name="High", description="Very novel"),
            OutputCategory(name="Medium", description="Somewhat novel"),
            OutputCategory(name="Low", description="Not novel")
        ],
        # includeReasoning=True # Removed, defaults to True
    )
    
    # Debug function to test direct provider call
    async def test_openai_schema():
        # Initialize enricher correctly with the provider config list
        enricher = Enricher(providers=[provider_conf])
        from magicrowspy.utils.schema_generator import generate_json_schema
        
        # Generate the schema
        schema = generate_json_schema(output_conf)
        print(f"Generated schema:\n{json.dumps(schema, indent=2)}")
        
        # Call the provider directly
        result = enricher._call_provider(
            provider_conf=provider_conf,
            model="gpt-4.1-nano",
            temperature=0.1,
            output_name=output_conf.name,
            output_schema=schema,
            prompt="Evaluate the novelty of Chief Executive tasks in sector J62 (IT Services)."
        )
        
        print(f"\nProvider result:\n{json.dumps(result, indent=2)}")
        
    # Run the direct test
    asyncio.run(test_openai_schema())
