"""Functions for loading configurations from files."""

import json
import re
from pathlib import Path
from typing import Dict, Any

from .models import AIEnrichmentBlockConfig

def load_preset(ts_file_path: str | Path, config_variable_name: str) -> AIEnrichmentBlockConfig:
    """Loads an AIEnrichmentBlockConfig from a TypeScript (.ts) preset file.

    Uses simple string/regex matching to find the variable assignment
    and extracts the object literal, assuming it's JSON-compatible.

    WARNING: This is fragile and sensitive to formatting changes in the .ts file.
             It is NOT a full TypeScript parser.

    Args:
        ts_file_path: Path to the .ts file.
        config_variable_name: The name of the exported config variable 
                                (e.g., 'ISCOtasksConfig').

    Returns:
        An instance of AIEnrichmentBlockConfig.

    Raises:
        FileNotFoundError: If the ts_file_path does not exist.
        ValueError: If the variable or a valid JSON object cannot be found/parsed.
        IOError: If the file cannot be read.
    """
    ts_path = Path(ts_file_path)
    if not ts_path.is_file():
        raise FileNotFoundError(f"TypeScript config file not found: {ts_path}")

    try:
        content = ts_path.read_text(encoding='utf-8')
    except Exception as e:
        raise IOError(f"Error reading TypeScript file {ts_path}: {e}") from e

    # Attempt to find the start of the object literal assignment
    # This regex looks for 'export const varName: Type = {' or 'varName = {' allowing whitespace
    # It's intentionally kept simple and might need adjustment if TS format varies.
    start_pattern = re.compile(rf"(?:export\s+const\s+)?{re.escape(config_variable_name)}(?:\s*:\s*\w+)?\s*=\s*\{{", re.MULTILINE)
    match = start_pattern.search(content)

    if not match:
        raise ValueError(f"Could not find start of assignment for '{config_variable_name} = {{' in {ts_path}")

    start_index = match.end() -1 # Index of the starting '{'

    # Find the matching closing '}' - basic brace counting
    brace_level = 1
    end_index = -1
    for i in range(start_index + 1, len(content)):
        if content[i] == '{':
            brace_level += 1
        elif content[i] == '}':
            brace_level -= 1
            if brace_level == 0:
                end_index = i
                break
    
    if end_index == -1:
        raise ValueError(f"Could not find matching closing brace '}}' for '{config_variable_name}' in {ts_path}")

    # Extract the object literal content
    object_literal = content[start_index : end_index + 1]

    # Basic cleaning: Attempt to remove trailing commas before '}' or ']'
    # This is a common difference between JS objects and strict JSON.
    # More sophisticated cleaning might be needed for other cases (e.g., comments).
    cleaned_literal = re.sub(r",(\s*[\]\}])", r"\1", object_literal)

    try:
        config_dict: Dict[str, Any] = json.loads(cleaned_literal)
    except json.JSONDecodeError as e:
        raise ValueError(
            f"Failed to parse the extracted content from {ts_path} as JSON. "
            f"Ensure the object literal for '{config_variable_name}' uses JSON-compatible syntax. "
            f"Error: {e}\nExtracted content snippet:\n{cleaned_literal[:500]}..."
        ) from e

    try:
        # Validate the dictionary using the Pydantic model
        return AIEnrichmentBlockConfig.model_validate(config_dict)
    except Exception as e:
        # Catch Pydantic validation errors or other issues
        raise ValueError(f"Validation failed for config loaded from {ts_path} for variable '{config_variable_name}': {e}") from e
