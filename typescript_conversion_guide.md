# NACE/ISCO Task Generator: TypeScript Conversion Guide

This document provides a detailed explanation of the `main.py` script functionality to assist in converting it to TypeScript for an Electron application.

## Overview

The script generates AI-automatable tasks for combinations of NACE (industry) and ISCO (occupation) codes. It reads input data from a CSV file, processes unique NACE/ISCO pairs, queries AI models via API (OpenAI and/or Perplexity), and outputs task suggestions to a CSV file.

## Core Components and Features

### 1. Configuration Management

#### Configuration Loading
```python
def load_config(config_path='config.yaml'):
    """Loads configuration from YAML file."""
```

- **Input**: Path to YAML configuration file (defaults to 'config.yaml')
- **Output**: Dictionary with configuration settings
- **Features**:
  - Loads and parses YAML configuration
  - Handles file not found and parsing errors
  - Returns structured configuration data

#### Command-line Argument Parsing
```python
def parse_arguments(defaults):
    """Parses command-line arguments."""
```

- **Input**: Dictionary of default values from configuration
- **Output**: Parsed arguments object
- **Features**:
  - Defines arguments with help text and default values
  - Supports multiple filter arguments
  - Options for input/output files, API choice, task count, etc.
  - Provides testing options (max rows, max raw rows)

#### Key Parameters:
- `input_file`: Path to input CSV file
- `output_file`: Path for output CSV file
- `n_tasks`: Number of tasks to generate per NACE/ISCO combination
- `api_choice`: Which API to use ('openai', 'perplexity', or 'both')
- `filter`: Filter expressions for numerical columns
- `max_rows`: Limit for processing unique NACE/ISCO combinations
- `max_raw_rows`: Limit for initial CSV row reading
- `delay`: Seconds between API calls to avoid rate limiting

### 2. Data Loading and Filtering

```python
def load_and_filter_data(filepath, filters_str, header_rows=2, skip_rows=2, max_raw_rows=None):
    """Loads CSV data using Polars, handles multi-line headers, and applies filters."""
```

- **Input**: 
  - CSV filepath
  - Filter expressions list
  - Header/skip row configuration
  - Optional row limit
- **Output**: DataFrame with unique NACE/ISCO combinations
- **Features**:
  - Uses Polars for efficient data processing
  - Handles complex multi-line headers (reads first two lines)
  - Combines and cleans header names
  - Parses and applies dynamic filter expressions (>, <, >=, <=, ==, !=)
  - Extracts unique NACE/ISCO combinations after filtering
  - Detailed logging of the filtering process

#### Filter Expression Format:
Filters are in the format `"column operator value"` (e.g., `"physical > 5.0"`)

### 3. API Interaction

#### OpenAI API Interaction
```python
def get_openai_tasks(client, nace, isco, n_tasks, prompt_template, model="gpt-3.5-turbo"):
    """Gets automatable tasks from OpenAI API."""
```

- **Input**:
  - OpenAI client object
  - NACE and ISCO codes
  - Number of tasks
  - Prompt template
  - Model name
- **Output**: List of generated tasks as strings
- **Features**:
  - Formats prompt with NACE/ISCO data
  - Calls OpenAI Chat Completions API
  - Parses and cleans response (removes numbering, empty lines)
  - Error handling with fallback task message

#### Perplexity API Interaction
```python
def get_perplexity_tasks(api_key, nace, isco, n_tasks, prompt_template, model="sonar-medium-online"):
    """Gets automatable tasks from Perplexity API."""
```

- **Input**:
  - API key
  - NACE and ISCO codes
  - Number of tasks
  - Prompt template
  - Model name
- **Output**: List of generated tasks as strings
- **Features**:
  - Formats prompt with NACE/ISCO data
  - Calls Perplexity API using HTTP requests
  - Parses and cleans response
  - Detailed error handling with response status and body logging

### 4. Task Generation Process

The main execution flow:

1. Load environment variables (API keys) from `.env` file
2. Load configuration and parse arguments
3. Initialize API clients based on configuration
4. Load and filter data to get unique NACE/ISCO combinations
5. For each NACE/ISCO pair:
   - Call selected API(s) to generate tasks
   - Apply rate limiting between calls
   - Collect results
6. Combine all results into a DataFrame
7. Write results to output CSV file

#### Rate Limiting
The script implements a configurable delay between API calls using `time.sleep(args.delay)` to avoid hitting API rate limits.

#### Error Handling
The script includes comprehensive error handling:
- For configuration loading errors
- For data loading and parsing errors
- For API request errors (with response status and body logging)
- For output file writing errors

### 5. Output Generation

The final output format is a CSV file with columns:
- `nace`: NACE code from input
- `isco`: ISCO code from input
- `source_api`: Which API generated the task ('openai' or 'perplexity')
- `automatable_task`: The generated task text

## TypeScript Conversion Considerations

### Key Dependencies to Replace
- **Polars**: For data loading and manipulation (consider using a TypeScript-compatible library like Papa Parse for CSV parsing and array operations for filtering)
- **yaml**: For configuration loading (consider using js-yaml)
- **dotenv**: For environment variable loading (use dotenv-webpack or similar for Electron)
- **argparse**: For command-line arguments (not needed in Electron UI, replace with form controls or settings)
- **requests**: For HTTP requests (use fetch or axios)
- **OpenAI SDK**: Replace with OpenAI TypeScript SDK

### UI Components to Create
1. **Configuration Panel**:
   - Input/output file selection (use Electron dialog)
   - API selection (OpenAI, Perplexity, both)
   - Number of tasks per combination
   - Rate limiting controls
   - Filter expression builder

2. **Data Preview**:
   - Show input data with NACE/ISCO combinations
   - Allow filtering and selection

3. **Processing Panel**:
   - Progress indicators
   - Log output
   - Cancel button

4. **Results View**:
   - Table with generated tasks
   - Export options

### State Management with Redux
Consider storing these in Redux state:
- Configuration settings
- Input data
- Processing status
- Generated tasks
- Error messages

### Electron Implementation Notes
- Use Electron's file system API for reading/writing files
- Consider using worker processes for CPU-intensive operations
- Implement proper API key storage (use Electron's secure storage)

### TypeScript Types
Create interfaces for:
- Configuration settings
- Command-line arguments
- NACE/ISCO data
- Filter expressions
- API responses
- Task results

## Example Redux State Structure

```typescript
interface AppState {
  config: {
    inputFile: string;
    outputFile: string;
    apiChoice: 'openai' | 'perplexity' | 'both';
    numTasks: number;
    delay: number;
    filters: string[];
    maxRows: number | null;
    promptTemplate: string;
  };
  data: {
    isLoading: boolean;
    rawData: any[] | null;
    uniqueCombinations: { nace: string; isco: string }[] | null;
    filteredCount: number;
  };
  processing: {
    isProcessing: boolean;
    currentItem: number;
    totalItems: number;
    log: string[];
  };
  results: {
    tasks: {
      nace: string;
      isco: string;
      source_api: string;
      automatable_task: string;
    }[];
  };
  errors: {
    configError: string | null;
    dataError: string | null;
    apiError: string | null;
    outputError: string | null;
  };
  auth: {
    openaiApiKey: string | null;
    perplexityApiKey: string | null;
  };
}
```

## Project Structure Recommendation

```
src/
├── main/
│   ├── index.ts                  # Electron main process
│   ├── preload.ts                # Preload script
│   └── utils/
│       └── secureStorage.ts      # API key storage
├── renderer/
│   ├── App.tsx                   # Main app component
│   ├── index.tsx                 # Entry point
│   ├── components/
│   │   ├── ConfigPanel.tsx       # Configuration UI
│   │   ├── DataPreview.tsx       # Data display
│   │   ├── ProcessingPanel.tsx   # Processing UI
│   │   ├── ResultsView.tsx       # Results display
│   │   └── FilterBuilder.tsx     # Filter UI
│   ├── store/
│   │   ├── index.ts              # Redux store setup
│   │   ├── slices/
│   │   │   ├── configSlice.ts    # Configuration state
│   │   │   ├── dataSlice.ts      # Data state
│   │   │   ├── processingSlice.ts # Processing state
│   │   │   └── resultsSlice.ts   # Results state
│   │   └── selectors/
│   │       └── index.ts          # Redux selectors
│   ├── services/
│   │   ├── fileService.ts        # File I/O operations
│   │   ├── openaiService.ts      # OpenAI API
│   │   ├── perplexityService.ts  # Perplexity API
│   │   └── dataService.ts        # Data processing
│   └── utils/
│       ├── csvUtils.ts           # CSV parsing/filtering
│       ├── filterParser.ts       # Filter expression parser
│       └── types.ts              # TypeScript types
└── shared/
    ├── config.ts                 # Config types
    └── constants.ts              # Shared constants
```

## Implementation Strategy

1. **Setup the Electron project**:
   - Use Electron Forge with Vite template
   - Configure TypeScript, React, Tailwind, DaisyUI

2. **Implement core services**:
   - File I/O using Electron's APIs
   - CSV parsing with PapaParse
   - API clients for OpenAI and Perplexity

3. **Create UI components**:
   - Start with configuration panel and file selection
   - Add data preview with filtering capabilities
   - Implement processing and results views

4. **Setup Redux state**:
   - Define all necessary slices
   - Create action creators and reducers
   - Implement async thunks for API calls

5. **Build the processing pipeline**:
   - Load and parse CSV data
   - Apply filters
   - Process NACE/ISCO combinations
   - Handle API requests with proper rate limiting
   - Collect and display results

This documentation should provide a solid foundation for converting the Python script to a TypeScript-based Electron application with React, Tailwind, DaisyUI, Redux, Vite, Electron Forge, and Electron Builder. 