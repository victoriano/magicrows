#!/usr/bin/env python3

import json
import os
import logging
from openai import OpenAI

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger("openai_inspector")

# Sample schema with reasoning
example_schema = {
  "title": "novelty_rating",
  "description": "Generated output for novelty_rating",
  "type": "object",
  "properties": {
    "value": {
      "type": "object",
      "properties": {
        "novelty_rating": {
          "type": "string",
          "description": "Categorical output for novelty_rating",
          "enum": [
            "Very Novel",
            "Somewhat Novel",
            "Average Novelty",
            "Somewhat Unoriginal",
            "Not Original At All"
          ]
        }
      },
      "required": [
        "novelty_rating"
      ],
      "additionalProperties": False
    },
    "reasoning": {
      "type": "string",
      "description": "Explanation for why the value was chosen or generated."
    }
  },
  "required": [
    "value"
  ]
}

def inspect_openai_request():
    """Show exactly what is sent to OpenAI and what comes back"""
    
    # Print the schema we'll be sending
    print("\n=== SCHEMA WE'RE SENDING TO OPENAI ===")
    print(json.dumps(example_schema, indent=2))
    
    # Create a client
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    
    # Define tool with our schema
    tools = [{
        "type": "function",
        "function": {
            "name": "novelty_rating",
            "description": "Tool to generate output for novelty_rating",
            "parameters": example_schema,
        }
    }]
    
    # Define tool choice to force using our function
    tool_choice = {
        "type": "function", 
        "function": {"name": "novelty_rating"}
    }
    
    # Define messages (system and user prompts)
    system_prompt = (
        "You are an AI assistant that evaluates novelty of business concepts. "
        "When reasoning is requested, provide detailed justification for your rating."
    )
    
    user_prompt = (
        "Evaluate the novelty of Chief Executive tasks in sector J62 (IT Services). "
        "Consider factors like existing solutions, unique applications, and market trends."
    )
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    # Print the request payload
    request_payload = {
        "model": "gpt-4.1-nano-2025-04-14",
        "messages": messages,
        "tools": tools,
        "tool_choice": tool_choice,
        "temperature": 0.1
    }
    
    print("\n=== REQUEST PAYLOAD TO OPENAI ===")
    print(json.dumps(request_payload, indent=2))
    
    # Make the actual call
    print("\n=== MAKING API CALL ===")
    response = client.chat.completions.create(
        model="gpt-4.1-nano-2025-04-14",
        messages=messages,
        tools=tools,
        tool_choice=tool_choice,
        temperature=0.1
    )
    
    # Print the raw response
    print("\n=== RAW OPENAI RESPONSE ===")
    print(json.dumps(response.model_dump(), indent=2, default=str))
    
    # Extract the tool call arguments
    first_choice = response.choices[0]
    if hasattr(first_choice, "message") and hasattr(first_choice.message, "tool_calls"):
        tool_calls = first_choice.message.tool_calls
        if tool_calls and len(tool_calls) > 0:
            arguments_json = tool_calls[0].function.arguments
            arguments = json.loads(arguments_json)
            
            print("\n=== EXTRACTED ARGUMENTS ===")
            print(json.dumps(arguments, indent=2))

if __name__ == "__main__":
    print("=== OPENAI API REQUEST/RESPONSE INSPECTOR ===")
    inspect_openai_request()
    print("\nInspection complete!")
