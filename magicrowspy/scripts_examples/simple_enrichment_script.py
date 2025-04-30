"""Simplified script to test the magicrowspy enricher functionality (no error handling)."""

import os
import sys
import asyncio
import datetime
from pathlib import Path
import pandas as pd

# Adjust the path if necessary if the script is run from outside the examples folder
# Or ensure the package is installed correctly
from magicrowspy import Enricher # load_preset is no longer needed here
from magicrowspy.config import OpenAIProviderConfig
# AIEnrichmentBlockConfig no longer needed here directly
# from magicrowspy.config.models import AIEnrichmentBlockConfig 

# --- Configuration --- 
# Relative paths to presets from this script's location
PRESET_FILE_PATH_TASKS = "../presets/ISCOTasks_preset.ts"
# PRESET_FILE_PATH_NOVELTY = "../presets/ISCONovelty_preset.ts"

# Path to input CSV (adjust as needed)
CSV_INPUT_PATH_STR = "/Users/victoriano/Desktop/MagicRows Data/Tasks EU15.csv"

# --- Get API Key --- 
api_key = os.environ.get("OPENAI_API_KEY")
if not api_key:
    # Exit directly if API key is missing
    print("ERROR: OPENAI_API_KEY environment variable not set.")
    sys.exit(1)

# --- Main Async Function --- 
async def main():
    # Presets are loaded inside enricher.enrich now

    # --- Load Input Data --- 
    csv_input_path = Path(CSV_INPUT_PATH_STR)
    # Assume file exists and is readable
    input_df = pd.read_csv(csv_input_path)
    print(f"Successfully read input CSV: {csv_input_path}")

    # --- Configure Provider & Enricher --- 
    openai_provider = OpenAIProviderConfig(
        integrationName="myOpenAI", # Matches integrationName in presets
        apiKey=api_key,
    )
    enricher = Enricher(providers=[openai_provider])

    # --- Run Enrichment --- 
    print("Starting enrichment for Tasks...")
    # Pass the preset file path directly
    output_df_tasks = await enricher.enrich(input_df.iloc[10:12], PRESET_FILE_PATH_TASKS, reasoning=False)
    print("Enrichment completed for Tasks.")

    # print("Starting enrichment for Novelty...")
    # # Pass the preset file path directly
    # # output_df_novelty = await enricher.enrich(input_df.copy(), PRESET_FILE_PATH_NOVELTY)
    # print("Enrichment completed for Novelty.")

    # --- Export Results --- 
    desktop_path = Path.home() / "Desktop"
    desktop_path.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

    # Export Tasks
    output_filename_tasks = f"{csv_input_path.stem}_enriched_tasks_{timestamp}{csv_input_path.suffix}"
    output_path_tasks = desktop_path / output_filename_tasks
    output_df_tasks.to_csv(output_path_tasks, index=False)
    print(f"Successfully wrote Tasks output CSV: {output_path_tasks}")

    # # Export Novelty
    # # output_filename_novelty = f"{csv_input_path.stem}_enriched_novelty_{timestamp}{csv_input_path.suffix}"
    # # output_path_novelty = desktop_path / output_filename_novelty
    # # output_df_novelty.to_csv(output_path_novelty, index=False)
    # # print(f"Successfully wrote Novelty output CSV: {output_path_novelty}")

# --- Run --- 
if __name__ == "__main__":
    asyncio.run(main()) 