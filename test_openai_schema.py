#!/usr/bin/env python3

import json
import logging
import asyncio
import os
from typing import Dict, Any, List

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(name)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("openai_schema_test")

# Import necessary classes
from magicrowspy.core.enricher import Enricher
from magicrowspy.models.configs import AIProviderConfig
from magicrowspy.utils.schema_generator import generate_json_schema

# Helper class to emulate OutputConfig structure
class SimpleOutputConfig:
    def __init__(self, name, includeReasoning=True):
        self.name = name
        self.includeReasoning = includeReasoning
        self.outputType = "category"
        self.outputCardinality = "single"
        self.outputCategories = [
            {"name": "High", "description": "Very novel"},
            {"name": "Medium", "description": "Somewhat novel"},
            {"name": "Low", "description": "Not novel"}
        ]
        self.contextColumns = None

async def test_openai_schema():
    """Test direct OpenAI API request/response with schema including reasoning."""
    # Create provider config
    provider_conf = AIProviderConfig(
        name="test_openai",
        type="openai",
        configs={
            "model": "gpt-4.1-nano",
            "temperature": 0.1,
            "api_key": os.environ.get("OPENAI_API_KEY")
        }
    )
    
    # Initialize enricher with provider
    enricher = Enricher(providers=[provider_conf])
    
    # Setup test output config with reasoning
    output_conf = SimpleOutputConfig(name="test_rating", includeReasoning=True)
    
    # Generate schema
    schema = generate_json_schema(output_conf)
    print("\nGenerated JSON Schema:")
    print(json.dumps(schema, indent=2))
    
    # Make direct provider call
    print("\nCalling OpenAI API directly...")
    result = enricher._call_provider(
        provider_conf=provider_conf,
        model=provider_conf.configs["model"],
        temperature=0.1,
        output_name=output_conf.name,
        output_schema=schema,
        prompt="Evaluate the novelty of Chief Executive tasks in sector J62 (IT Services)."
    )
    
    print("\nRaw provider result:")
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    print("=== TESTING OPENAI SCHEMA STRUCTURE ===")
    asyncio.run(test_openai_schema())
