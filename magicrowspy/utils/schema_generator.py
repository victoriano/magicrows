"""Generates standard JSON Schema from OutputConfig."""

from typing import Dict, Any, List

from magicrowspy.config.models import OutputConfig, OutputType, OutputCardinality, OutputCategory


def generate_json_schema(output_config: OutputConfig) -> Dict[str, Any]:
    """Translates an OutputConfig object into a JSON Schema dictionary.

    Args:
        output_config: The configuration for a single output.

    Returns:
        A dictionary representing the JSON Schema for the expected output.

    Raises:
        ValueError: If the configuration is invalid (e.g., category type 
                    without categories defined).
    """
    schema: Dict[str, Any] = {
        "type": "object",
        "properties": {},
        # Make the single property required by default
        "required": [output_config.name],
        # Disallow any additional properties not defined in the schema
        "additionalProperties": False 
    }
    properties = schema["properties"]

    prop_schema: Dict[str, Any] = {}

    # Determine base type based on OutputType
    if output_config.outputType == OutputType.TEXT:
        prop_schema["type"] = "string"
        prop_schema["description"] = f"Text output for {output_config.name}"
    elif output_config.outputType == OutputType.NUMBER:
        prop_schema["type"] = "number" # Could be 'integer' if needed, 'number' is more general
        prop_schema["description"] = f"Numeric output for {output_config.name}"
        # Potential enhancements: add min/max based on prompt/config?
    elif output_config.outputType == OutputType.CATEGORY:
        if not output_config.outputCategories:
            raise ValueError(
                f"Output '{output_config.name}' is type 'category' but has no outputCategories defined."
            )
        prop_schema["type"] = "string"
        prop_schema["description"] = f"Categorical output for {output_config.name}"
        prop_schema["enum"] = [cat.name for cat in output_config.outputCategories]
        # Could add category descriptions to the main schema description if helpful
        # schema["description"] = "Available categories:\n" + "\n".join([f"- {c.name}: {c.description}" for c in output_config.outputCategories])

    elif output_config.outputType == OutputType.JSON:
        # For JSON, we expect the LLM to return a string that *is* JSON.
        # Validation that the *content* of the string is valid JSON happens later.
        # The schema here just validates that the *output field itself* is a string.
        prop_schema["type"] = "string"
        prop_schema["description"] = f"JSON string output for {output_config.name}. The content should be valid JSON."
    else:
        # Should not happen with Enum validation, but good practice
        raise ValueError(f"Unsupported outputType: {output_config.outputType}")

    # Handle Cardinality
    if output_config.outputCardinality == OutputCardinality.MULTIPLE:
        # Wrap the determined prop_schema in an array definition
        properties[output_config.name] = {
            "type": "array",
            "description": f"List of {output_config.outputType.value} values for {output_config.name}",
            "items": prop_schema
            # Potential enhancements: add minItems/maxItems based on prompt/config?
            # e.g., if prompt says "list 5 items", add "minItems": 5, "maxItems": 5
        }
    else: # SINGLE cardinality
        properties[output_config.name] = prop_schema

    return schema
