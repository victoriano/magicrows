# Magicrowspy Python Package – Product Requirements Document

## 1. Executive Summary
This package provides a workflow for **AI-driven data enrichment** within the Python ecosystem.  
It lets data scientists enrich a `pandas` or `polars` `DataFrame` with new columns or rows produced by LLM services (OpenAI, Perplexity, etc.) using declarative **Python object configurations**. The desired structured output is defined using **JSON Schema**.

## 2. Goals
1. Provide consistent enrichment behaviour based on the defined configuration schema (Python objects).
2. **Drop-in usability** inside notebooks, scripts, and pipelines.  
3. Support **multiple dataframe engines** (`pandas` & `polars`) without code changes for the user.  
4. Declarative, **Python object-driven provider configuration** making it easy to configure AI services programmatically.
5. **JSON Schema for Output Definition**: Use standard JSON Schema (as Python dicts) to define and validate structured LLM outputs.
6. Production-grade: async I/O, retries, rate-limiting, structured logging, and full typing.

## 3. Personas
* **Data Scientist**: enrichs a dataset in a Jupyter notebook.  
* **Data Engineer**: embeds enrichment step in an ETL job.  
* **ML Engineer**: experiments with prompt engineering quickly via Python objects.

## 4. Functional Requirements
### 4.1 Data Ingestion
* Accepts a `pandas.DataFrame` **or** `polars.DataFrame` as `input_df`.  
* Detects engine at runtime and returns the same type in `output_df`.

### 4.2 Enrichment Config (`AIEnrichmentBlockConfig`)
The enrichment process is configured using an instance of a Pydantic `BaseModel`, typically named `AIEnrichmentBlockConfig`. Nested within it are `OutputConfig` instances detailing each enrichment task. Required fields marked *★*.

**`AIEnrichmentBlockConfig` Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `integrationName`★ | `str` | AI provider id (must match a configured provider instance). |
| `budget` | `float` | Max spend ($); processors must respect this. |
| `model`★ | `str` | Model id to call. |
| `temperature` | `float` | 0-1 randomness. |
| `mode`★ | `str` | `preview` or `full`. |
| `previewRowCount` | `int` | Number of rows for `preview` mode (default 5). |
| `outputFormat`★ | `str` | `newColumns` or `newRows`. |
| `contextColumns`★ | `List[str]` | Default column names needed for prompt context across all outputs (can be overridden in `OutputConfig`). |
| `outputs`★ | `List[OutputConfig]` | List of enrichment tasks to perform. |

**`OutputConfig` Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `name`★ | `str` | Base name for output column(s) or the row key. |
| `prompt`★ | `str` | Jinja2 template for the LLM prompt. |
| `outputType`★ | `str` | The expected type of the output. Enum: `"text"`, `"category"`, `"number"`. |
| `outputCardinality`★ | `str` | Whether to expect a single value or multiple values. Enum: `"single"`, `"multiple"`. |
| `outputCategories` | `Optional[List[Dict[str, str]]]` | Required if `outputType` is `"category"`. A list of dictionaries, each with `"name"` (the category value) and `"description"` keys. |
| `contextColumns` | `Optional[List[str]]` | Optional: Specific context columns for *this* prompt, overriding the block-level setting. |
| `strict_validation` | `bool` | Default True. If True, apply strict checks during internal type/category validation. |

**Loading Configuration:**
Configuration can be defined directly as Python Pydantic objects OR loaded from external files:

1.  **Python Objects:** Define `AIEnrichmentBlockConfig` and nested `OutputConfig` instances directly in Python code.
2.  **JSON Files:** Load a JSON file containing the configuration structure into a dictionary and validate using `AIEnrichmentBlockConfig.model_validate(json_dict)`.
3.  **TypeScript (`.ts`) Files (Simple Parsing - Fragile):**
    *   A utility function `magicrowspy.config.load_preset(ts_file_path: str, config_variable_name: str) -> AIEnrichmentBlockConfig` will be provided.
    *   This function reads the `.ts` file as plain text.
    *   It uses **string manipulation and regular expressions** to locate the JavaScript object literal assigned to `config_variable_name` (e.g., finding `config_variable_name = { ... };`).
    *   It extracts the text content between the outer `{` and `}`.
    *   **Crucially, it assumes the content within the `{...}` block is already valid JSON or very close to it.** It might perform minimal cleaning (like handling trailing commas if feasible) but **it is NOT a full JavaScript/TypeScript parser.**
    *   It then attempts to parse this extracted text using Python's `json.loads()`.
    *   Finally, it validates the resulting dictionary using Pydantic.
    *   **WARNING:** This method is **highly sensitive to the exact formatting** of the `.ts` file. Changes like adding comments within the object, using single quotes, or complex JavaScript syntax will likely break the parsing. Use this only if the preset objects are kept in a strict, JSON-compatible format within the `.ts` file.

**Overriding Properties:**
Once a configuration object (`AIEnrichmentBlockConfig`) is loaded (from any source), its properties can be easily overridden at runtime using Pydantic's `model_copy` method:

```python
from magicrowspy.config import load_preset

# Load base config from TS preset file (using simple, fragile parsing)
try:
    isco_preset = load_preset(
        "presets/ISCOTasks_preset.ts", # Assuming presets are accessible
        "ISCOtasksConfig"
    )
except Exception as e:
    print(f"Error parsing TS config: {e}. Ensure the object format is JSON-compatible.")
    # Handle error appropriately
    raise

# Create a runtime version with overrides
runtime_config = isco_preset.model_copy(
    update={"mode": "full", "previewRowCount": None} # Switch to full mode
)
```

**Example Configuration using Custom Output Definitions:**

(Refer to the structure defined in TypeScript presets like `ISCONovelty_preset.ts` and `ISCOTasks_preset.ts` for examples of how these configurations look. They will be loaded using the `load_preset` function.)

### 4.3 Output Definition (`OutputConfig`)
The `outputs` field within `AIEnrichmentBlockConfig` is a list of `OutputConfig` objects. Each defines a specific piece of information to extract or generate. Required fields marked *★*.

{{ ... }}

### 4.4 Processing Engine
* Instantiate `Enricher(providers=[...], logger=...)`.
* Method `output_df = enricher.enrich(input_df, enrichment_config=...)`.
* Async variant `await enricher.aenrich(input_df, enrichment_config=...)`.
* For each `output_config` in `enrichment_config.outputs`:
    * Determine context columns (use `output_config.contextColumns` if present, else `enrichment_config.contextColumns`).
    * Perform row selection.
    * Render prompts using Jinja2 and `output_config.prompt`.
    * **Translate the custom `OutputConfig`** (using `outputType`, `outputCardinality`, `outputCategories`) **into a standard JSON Schema dictionary.** This internal schema will define the structure expected from the LLM (e.g., a string, an array of strings, an enum-constrained string, etc.).
        * *Example Translation (Category, Multiple):* `outputType="category", outputCardinality="multiple", outputCategories=[...]` becomes `{"type": "array", "items": {"type": "string", "enum": [cat['name'] for cat in outputCategories]}}` (potentially with min/maxItems if inferrable from prompt or future config).
        * The internal schema will always enforce `"additionalProperties": false` and make the single generated property `required`.
    * Pass the prompt and the **internally generated JSON schema** to the appropriate provider (if the provider supports schema-based output like OpenAI's tool use/JSON mode).
    * Receive JSON output from the provider.
    * **Validate the received JSON against the internally generated JSON schema** using the `jsonschema` library.
    * Perform basic type validation based on `outputType` if schema validation isn't possible or fails leniently.
    * Handle validation errors based on `strict_validation`.
    * Flatten the validated JSON object into dataframe columns, prefixed with `output_config.name`.
    * Perform dataframe mutation based on `outputFormat`.
* Respects `outputFormat` as before.
{{ ... }}
```bash
# Example concept (exact mechanism TBD)
magicrowspy data.csv \
    --enrichment-config-py magicrowspy.presets.analysis_config \
    --provider-configs-py magicrowspy.config.default_providers \
    --engine pandas --out enriched.csv --mode preview
```
Prints JSONL progress & metrics.

## 5. Public API (Draft)
```python
import os
import pandas as pd
from magicrowspy import Enricher
from magicrowspy.providers import OpenAIProviderConfig
from magicrowspy.config import load_preset # Import the preset loader

# --- Configuration Phase --- 

# 1. Configure Provider(s)
openai_provider = OpenAIProviderConfig(
    apiKey=os.environ.get("OPENAI_API_KEY"),
    integrationName="openai_prod"
)

# 2. Load Base Enrichment Configuration from a .ts Preset file
# Uses simple, potentially fragile parsing. Ensure TS object is JSON-compatible.
ts_preset_path = "presets/ISCOTasks_preset.ts" # Assuming presets are accessible
config_variable = "ISCOtasksConfig"
try:
    isco_preset = load_preset(ts_preset_path, config_variable)
except Exception as e:
    print(f"Failed to load/parse TS config '{config_variable}' from {ts_preset_path}: {e}")
    # Decide how to handle failure: default config, raise error, etc.
    raise SystemExit(1) # Example: Exit if config fails

# 3. Create Runtime Configuration with Overrides (Optional)
# Example: Switch the loaded preset to 'full' mode for this run
runtime_isco_tasks_config = isco_preset.model_copy(
    update={"mode": "full", "previewRowCount": None}
)

# --- Execution Phase --- 

# 4. Instantiate Enricher with Provider Config(s)
enricher = Enricher(providers=[openai_provider])

# 5. Load Data (Example assumes columns 'nace', 'isco' exist)
df = pd.read_csv("professions.csv")

# 6. Enrich Data using the runtime-modified config
# Note: ISCOTasks uses outputFormat='newRows'
result_df = enricher.enrich(df, enrichment_config=runtime_isco_tasks_config)

# Save results (will contain original columns + new rows for 'automation_tasks' and 'best_countries_match')
result_df.to_csv("professions_enriched_tasks.csv", index=False)

print(f"Enrichment complete. Results saved to professions_enriched_tasks.csv")
```

## 6. Internal Architecture
```
magicrowspy/
├─ core/
│  ├─ config.py        # Pydantic models for AIEnrichmentBlockConfig, OutputConfig
│  ├─ processor.py     # Row orchestration, budget mgr
│  ├─ parser.py        # JSON validation using jsonschema
│  └─ formatter.py     # Dataframe mutation utils (JSON flattening)
├─ providers/
│  ├─ base.py          # BaseProviderConfig, AIProvider ABC
│  ├─ openai.py        # OpenAIProviderConfig, OpenAIProvider impl (tool use)
│  └─ perplexity.py    # PerplexityProviderConfig, PerplexityProvider impl
├─ adapters/
│  ├─ pandas_adapter.py
│  └─ polars_adapter.py
├─ cli.py
└─ __init__.py
```
(Note: No dedicated `schemas/` directory needed for output definitions anymore)

## 7. Development Environment & Tooling
*   Language: Python 3.9+
*   Package Manager: `uv` (preferred, works with `requirements.txt` / `pyproject.toml`), `pip` with `requirements.txt` or `pyproject.toml` (using `pdm` or `poetry`).
*   Testing: `pytest`.
*   Linting: `ruff` / `flake8` + `black` + `isort`.
*   Typing: `mypy`.

## 8. Dependencies
| Package | Reason |
|---------|--------|
| `pydantic` | Configuration model validation |
| `jinja2` | Prompt templating |
| `httpx[async]` | Async HTTP calls |
| `pandas`, `polars` | Dataframe engines |
| `jsonschema` | **Validating LLM JSON output against schema** |
| `tenacity` | Retries |

## 9. Security & Compliance
{{ ... }}

## 10. Acceptance Criteria
1. Given a sample dataset and Python objects defining the `AIEnrichmentBlockConfig` (with an `OutputConfig` containing the paper extraction JSON schema) and an `OpenAIProviderConfig`, running `enricher.enrich` outputs a DataFrame with expected new columns (e.g., `paper_info_title`, `paper_info_authors`).
2. The LLM output is validated against the provided JSON schema; invalid outputs are handled according to `strict_validation`.
3. Switching `--engine polars` returns a `polars.DataFrame` with identical data.
{{ ... }}

## 11. Roadmap (Suggested)
| Milestone | Duration | Deliverables |
|-----------|----------|--------------|
| M1 – Scaffolding & Config | 1 week | Core package skeleton, Pydantic models for Enrichment/Provider/Output Configs, **JSON Schema examples** |
| M2 – OpenAI Provider (JSON mode) & Pandas Path | 1 week | Working enrichment for newColumns, blocking mode, using **JSON Schema validation**, OpenAI tool use/JSON mode integration |
| M3 – Async + Rate Limit + Polars | 1 week | Async pipeline, polars adapter, rate limiter |
{{ ... }}
