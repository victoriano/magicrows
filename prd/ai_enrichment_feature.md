# AI Enrichment Feature - Product Requirements Document

## Overview
The AI Enrichment feature allows users to process datasets using pre-configured AI models to generate new data insights. Initially, the feature will use hardcoded examples, with plans to support user-created configurations in the future.

## Goals
- Provide a way to easily select from predefined AI enrichment configurations
- Process dataset rows using AI providers (OpenAI, Perplexity)
- Generate new datasets with AI-produced columns
- Allow switching between original and enriched datasets
- Integrate with existing Provider configurations

## Feature Scope

### In Scope
- Converting the "Process" button to a dropdown with predefined enrichment options
- Creating service classes for API integration
- Implementing dataset transformation logic
- Adding dataset switching functionality
- Support for both "newColumns" and "newRows" output formats

### Out of Scope (Future Implementations)
- UI for creating custom enrichment configurations
- Advanced filtering or sorting of enriched data
- Bulk processing beyond the preview mode
- Exporting enriched datasets

## Detailed Requirements

### 1. User Interface Components

#### 1.1 Enrichment Selector Dropdown
- **Location**: Replace current "Process" button in Data component
- **Functionality**: Displays list of available enrichment configurations
- **Default State**: No selection (with placeholder text "Select Enrichment")
- **Testing Checkpoint**: UI appearance and dropdown functionality

#### 1.2 Dataset Selector Dropdown
- **Appears**: After enrichment processing is complete
- **Options**: "Original Dataset" and "Enriched Dataset"
- **Default**: "Enriched Dataset" (after processing)
- **Testing Checkpoint**: Confirm switching works correctly

#### 1.3 Processing Status Indicator
- **Type**: Loading spinner + text
- **States**: Idle, Processing, Success, Error
- **Testing Checkpoint**: Visibility and state transitions

### 2. Service Integration

#### 2.1 AI Provider Interface
- **Purpose**: Common contract for different AI providers
- **Methods**:
  - `processPrompt(prompt, options)`
  - `validateConfig(config)`
  - `getModelList()`
- **Testing Checkpoint**: Interface implementation

#### 2.2 OpenAI Service
- **Integration**: With existing Provider settings
- **Capabilities**: Process text and category outputs
- **Testing Checkpoint**: API connection and response handling

#### 2.3 Perplexity Service
- **Integration**: With existing Provider settings
- **Capabilities**: Process text and category outputs
- **Testing Checkpoint**: API connection and response handling

### 3. Data Processing Logic

#### 3.1 AIEnrichmentProcessor
- **Input**: Dataset + AIEnrichmentBlockConfig
- **Processing**: Apply selected model to generate outputs
- **Output**: New dataset with enriched data
- **Testing Checkpoint**: Processing logic and output format

#### 3.2 Preview Mode Processing
- **Rows**: First 3 rows as per config
- **Context**: Use specified context columns
- **Testing Checkpoint**: Row selection and context application

#### 3.3 Output Formatting
- **newColumns Mode**: Add columns to existing dataset
- **newRows Mode**: Create new rows based on AI outputs
- **Testing Checkpoint**: Both formatting options

### 4. State Management (Redux)

#### 4.1 AIEnrichment Slice
- **State**:
  - `availableExamples`: List of predefined examples
  - `selectedExample`: Currently selected example
  - `originalDataset`: The unmodified dataset
  - `enrichedDataset`: The processed dataset
  - `activeDatasetView`: Which dataset is currently displayed
  - `processingStatus`: Current status of enrichment processing
  - `error`: Any error messages
- **Actions**:
  - `setSelectedExample`
  - `startProcessing`
  - `processingComplete`
  - `processingError`
  - `setActiveDatasetView`
- **Testing Checkpoint**: State updates and action triggers

## Implementation Tasks and Timeline

### Phase 1: Core Services (Review Point 1)
1. Create AI Provider Interface
2. Implement OpenAI Service
3. Implement Perplexity Service

### Phase 2: Processing Logic (Review Point 2)
4. Create AIEnrichmentProcessor class
5. Implement preview mode processing
6. Add output formatting (columns/rows)

### Phase 3: State Management (Review Point 3)
7. Create AIEnrichment Redux slice
8. Connect services with Redux

### Phase 4: UI Components (Review Point 4)
9. Create AIEnrichmentSelector component
10. Create DatasetSelector component
11. Update Data component
12. Add loading indicators

### Phase 5: Integration (Final Review)
13. Connect all components
14. Test end-to-end flow
15. Fix any issues
16. Documentation

## Testing Checkpoints

1. **Service Integration Test**
   - Check if OpenAI and Perplexity services are correctly connecting
   - Verify proper error handling

2. **Processing Logic Test**
   - Test with sample data
   - Verify both output formats work correctly

3. **UI Interaction Test**
   - Check dropdown functionality
   - Verify dataset switching

4. **End-to-End Test**
   - Complete flow from selection to display of results
   - Error handling and edge cases

## Future Enhancements

1. UI for creating custom enrichment configurations
2. Support for additional output types
3. Bulk processing capabilities
4. Enhanced visualization of enriched data
5. Save/export enriched datasets
