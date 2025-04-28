#!/usr/bin/env python3

import json
import os
import logging
from openai import OpenAI

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger("openai_text_format_test")

# Sample schema with reasoning - identical to the one in the ISCONovelty_preset.ts
schema = {
  "title": "novelty_and_country",
  "description": "Generated output for novelty rating and best country match",
  "type": "object",
  "properties": {
    "novelty_rating": {
      "type": "object",
      "properties": {
        "value": {
          "type": "string",
          "description": "The novelty rating of the profession's automation opportunities",
          "enum": [
            "Very Novel",
            "Somewhat Novel",
            "Average Novelty",
            "Somewhat Unoriginal",
            "Not Original At All"
          ]
        },
        "reasoning": {
          "type": "string",
          "description": "Explanation for the novelty rating"
        }
      },
      "required": ["value", "reasoning"]
    },
    "best_country_match": {
      "type": "object",
      "properties": {
        "value": {
          "type": "string",
          "description": "The country that best matches the automation opportunities",
          "enum": [
            "Germany",
            "France",
            "United Kingdom",
            "Italy",
            "Spain"
          ]
        },
        "reasoning": {
          "type": "string",
          "description": "Explanation for the country match"
        }
      },
      "required": ["value", "reasoning"]
    }
  },
  "required": ["novelty_rating", "best_country_match"]
}

def test_text_format():
    """Test the OpenAI API with text.format approach"""
    
    # Print the schema we'll be sending
    print("\n=== SCHEMA FOR STRUCTURED EXTRACTION ===")
    print(json.dumps(schema, indent=2))
    
    # Create a client
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    
    # Define text format with our schema
    text_format = {
        "type": "json_schema",
        "name": "novelty_and_country",
        "schema": schema,
        "strict": True
    }
    
    # Define system and user prompts
    system_prompt = (
        "You are a data analysis expert skilled in information extraction. "
        "Your task is to extract structured information from the provided data according to the specified format. "
        "When reasoning is requested, provide detailed and thoughtful explanations for your conclusions. "
        "Always format your response exactly according to the provided JSON schema."
    )
    
    user_prompt = (
        "Evaluate the novelty of Chief Executive tasks in sector J62 (IT Services) "
        "and determine which EU country would be the best match for implementing these automation opportunities. "
        "Consider factors like existing solutions, unique applications, and market trends."
    )
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    # Print the request payload
    request_payload = {
        "model": "gpt-4o-2024-08-06",
        "messages": messages,
        "text": {"format": text_format},
        "temperature": 0.1
    }
    
    print("\n=== REQUEST PAYLOAD TO OPENAI ===")
    print(json.dumps(request_payload, indent=2))
    
    # Make the actual call
    print("\n=== MAKING API CALL ===")
    response = client.chat.completions.create(
        model="gpt-4o-2024-08-06",
        messages=messages,
        text={"format": text_format},
        temperature=0.1
    )
    
    # Print the raw response
    print("\n=== RAW OPENAI RESPONSE ===")
    print(json.dumps(response.model_dump(), indent=2, default=str))
    
    # Extract the content
    if hasattr(response, "choices") and response.choices and hasattr(response.choices[0], "message"):
        message = response.choices[0].message
        if hasattr(message, "content") and message.content:
            try:
                # Parse the JSON content
                structured_data = json.loads(message.content)
                
                print("\n=== STRUCTURED DATA FROM RESPONSE ===")
                print(json.dumps(structured_data, indent=2))
                
                # Now let's verify we can access individual fields
                if "novelty_rating" in structured_data:
                    novelty = structured_data["novelty_rating"]
                    print("\n=== NOVELTY RATING ===")
                    print(f"Value: {novelty['value']}")
                    print(f"Reasoning: {novelty['reasoning']}")
                
                if "best_country_match" in structured_data:
                    country = structured_data["best_country_match"]
                    print("\n=== BEST COUNTRY MATCH ===")
                    print(f"Value: {country['value']}")
                    print(f"Reasoning: {country['reasoning']}")
                
            except json.JSONDecodeError as e:
                print(f"Error parsing OpenAI response: {e}")
                print(f"Raw content: {message.content}")

if __name__ == "__main__":
    print("=== OPENAI TEXT.FORMAT API TEST ===")
    test_text_format()
    print("\nTest complete!")
