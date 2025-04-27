"""Basic script to test the magicrowspy enricher functionality."""

import os
import sys
import logging
from pathlib import Path

# --- Configuration --- 
# Adjust the path to your preset file if necessary
# Assumes the script is run from the project root
PRESET_FILE_PATH = "src/shared/presets_library/ISCOTasks_preset.ts" 
# The variable name holding the config object inside the TS file
CONFIG_VARIABLE_NAME = "ISCOtasksConfig"

# --- Setup Logging --- 
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(name)s - %(message)s')
logger = logging.getLogger("test_script")

# --- Check Dependencies --- 
try:
    import pandas as pd
except ImportError:
    logger.error("Pandas not found. Please install it: pip install pandas or poetry add pandas")
    sys.exit(1)

try:
    from magicrowspy import Enricher, load_preset
    from magicrowspy.config import OpenAIProviderConfig
    from magicrowspy.config.models import RunMode
except ImportError as e:
    logger.error(f"Failed to import magicrowspy components: {e}. Ensure the package is installed or PYTHONPATH is set correctly.")
    sys.exit(1)

# --- Get API Key --- 
api_key = os.environ.get("OPENAI_API_KEY")
if not api_key:
    logger.error("OPENAI_API_KEY environment variable not set. Cannot run test.")
    sys.exit(1)

# --- Load Preset --- 
logger.info(f"Loading preset '{CONFIG_VARIABLE_NAME}' from '{PRESET_FILE_PATH}'...")
try:
    enrichment_config = load_preset(PRESET_FILE_PATH, CONFIG_VARIABLE_NAME)
    logger.info("Preset loaded successfully.")
    # --- Optional: Override Configuration for Testing --- 
    # By default, the script uses the settings from the loaded preset.
    # Uncomment one of the following lines to override the mode:
    # >> To run on ALL rows:
    # enrichment_config = enrichment_config.model_copy(update={"mode": RunMode.FULL})
    # logger.info(f"OVERRIDE: Running in FULL mode.")
    # >> To run in PREVIEW mode with a specific number of rows (e.g., 2):
    # enrichment_config = enrichment_config.model_copy(update={"mode": RunMode.PREVIEW, "previewRowCount": 2})
    # logger.info(f"OVERRIDE: Running in PREVIEW mode with {enrichment_config.previewRowCount} rows.")
except FileNotFoundError:
    logger.error(f"Preset file not found at: {PRESET_FILE_PATH}")
    sys.exit(1)
except Exception as e:
    logger.error(f"Failed to load or parse preset: {e}")
    sys.exit(1)

# --- Create Sample Data --- 
logger.info("Loading data from CSV...")
csv_file_path_str = "/Users/victoriano/Desktop/MagicRows Data/Tasks EU15.csv"
csv_file_path = Path(csv_file_path_str)

try:
    if not csv_file_path.is_file():
        raise FileNotFoundError(f"CSV file not found at specified path: {csv_file_path_str}")

    input_df = pd.read_csv(csv_file_path)
    logger.info(f"Loaded {len(input_df)} rows from {csv_file_path_str}")
    # Log head for preview
    logger.info(f"Sample DataFrame (first 5 rows):\n{input_df.head()}") 

except FileNotFoundError as e:
    logger.error(e)
    sys.exit(1)
except Exception as e:
    logger.error(f"Failed to read or process CSV file: {e}")
    sys.exit(1)

# --- Configure Provider & Enricher --- 
logger.info("Configuring provider and enricher...")
openai_provider = OpenAIProviderConfig(
    apiKey=api_key, # Already checked it exists
    integrationName="openai_test"
)

enricher = Enricher(providers=[openai_provider])
logger.info("Enricher initialized.")

# --- Run Enrichment --- 
logger.info("Starting enrichment process...")
try:
    # Ensure the loaded config uses the correct provider name
    enrichment_config.integrationName = openai_provider.integrationName 
    
    output_df = enricher.enrich(input_df, enrichment_config)
    logger.info("Enrichment process completed.")
    logger.info(f"Output DataFrame:\n{output_df}")

    # --- Export Result --- 
    output_filename = f"{csv_file_path.stem}_enriched{csv_file_path.suffix}"
    output_path = csv_file_path.parent / output_filename
    try:
        output_df.to_csv(output_path, index=False)
        logger.info(f"Successfully exported enriched data to: {output_path}")
    except Exception as e:
        logger.error(f"Failed to export DataFrame to CSV: {e}")

except ValueError as e:
    logger.error(f"Configuration or Data Validation Error: {e}")
except RuntimeError as e:
    logger.error(f"Runtime Error during enrichment (e.g., API failure after retries): {e}")
except ImportError as e:
    logger.error(f"Import Error (likely missing dependency like 'openai'): {e}")
except Exception as e:
    logger.exception(f"An unexpected error occurred during enrichment: {e}")

logger.info("Test script finished.")
