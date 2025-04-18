import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { REHYDRATE } from 'redux-persist';
import { AIEnrichmentBlockConfig } from '../../../shared/schemas/AIEnrichmentBlockSchema';
import { AIEnrichmentProcessor, EnrichmentProcessingResult } from '../../services/ai/AIEnrichmentProcessor';
import { RootState } from '../index';

// Define the structure of a preset enrichment configuration
export interface EnrichmentPreset {
  id: string;
  name: string;
  description: string;
  config: AIEnrichmentBlockConfig;
}

// Status of the enrichment process
export type EnrichmentStatus = 'idle' | 'processing' | 'success' | 'error';

// Interface for the AI enrichment state
export interface AIEnrichmentState {
  presets: EnrichmentPreset[];
  selectedPresetId: string | null;
  activeDataset: 'original' | 'enriched';
  status: EnrichmentStatus;
  error: string | null;
  result: EnrichmentProcessingResult | null;
  _initialized?: boolean; // Track if state has been properly initialized
}

// Initial state
const initialState: AIEnrichmentState = {
  presets: [
    {
      id: 'sentiment-analysis',
      name: 'Sentiment Analysis',
      description: 'Analyze text sentiment and categorize as positive, negative, or neutral',
      config: {
        integrationName: 'openai',
        model: 'gpt-3.5-turbo',
        mode: 'preview',
        previewRowCount: 2,
        outputFormat: 'newColumns',
        outputs: [
          {
            name: 'Sentiment',
            prompt: 'Analyze the sentiment of the following text and respond with exactly one of: "positive", "negative", or "neutral". Text: {{description}}',
            outputType: 'singleCategory',
            outputCategories: [
              { name: 'positive', description: 'Text has overall positive sentiment' },
              { name: 'negative', description: 'Text has overall negative sentiment' },
              { name: 'neutral', description: 'Text has neutral or mixed sentiment' }
            ]
          },
          {
            name: 'Sentiment Score',
            prompt: 'On a scale from 1 to 10, where 1 is extremely negative and 10 is extremely positive, rate the sentiment of the following text. Respond with just the number. Text: {{description}}',
            outputType: 'number'
          }
        ]
      }
    },
    {
      id: 'keyword-extraction',
      name: 'Keyword Extraction',
      description: 'Extract key topics and entities from text',
      config: {
        integrationName: 'openai',
        model: 'gpt-3.5-turbo',
        mode: 'preview',
        previewRowCount: 2,
        outputFormat: 'newColumns',
        outputs: [
          {
            name: 'Keywords',
            prompt: 'Extract the most important keywords from this text. Respond with up to 5 keywords separated by commas: {{description}}',
            outputType: 'categories'
          },
          {
            name: 'Main Topic',
            prompt: 'What is the main topic of this text? Respond with a single word or short phrase: {{description}}',
            outputType: 'text'
          }
        ]
      }
    },
    {
      id: 'data-enrichment',
      name: 'Data Enrichment',
      description: 'Generate additional insights and details from existing data',
      config: {
        integrationName: 'perplexity',
        model: 'sonar-small-online',
        mode: 'preview',
        previewRowCount: 2,
        outputFormat: 'newRows',
        contextColumns: ['name', 'description'],
        outputs: [
          {
            name: 'Additional Details',
            prompt: 'Based on this product information, generate additional details that might be helpful for customers. Product name: {{name}}, Description: {{description}}',
            outputType: 'text'
          },
          {
            name: 'Related Product',
            prompt: 'Suggest a possible related product to {{name}} with this description: {{description}}',
            outputType: 'text'
          }
        ]
      }
    }
  ],
  selectedPresetId: null,
  activeDataset: 'original',
  status: 'idle',
  error: null,
  result: null,
  _initialized: false
};

// Create async thunk for processing data with AI enrichment
export const processDataWithAI = createAsyncThunk<
  EnrichmentProcessingResult,
  AIEnrichmentBlockConfig | undefined,
  { state: RootState }
>(
  'aiEnrichment/processData',
  async (overrideConfig, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const { selectedPresetId, presets } = state.aiEnrichment;
      const { csvData } = state.data;
      
      // Validate requirements
      if (!selectedPresetId && !overrideConfig) {
        return rejectWithValue('No enrichment preset selected');
      }
      
      if (!csvData || !csvData.headers || !csvData.rows || csvData.rows.length === 0) {
        return rejectWithValue('No data available for processing');
      }
      
      // Determine which configuration to use
      let configToUse: AIEnrichmentBlockConfig;
      
      if (overrideConfig) {
        // Use the override configuration if provided
        console.log('Using override configuration with integration:', overrideConfig.integrationName);
        configToUse = overrideConfig;
      } else {
        // Otherwise find the selected preset
        const selectedPreset = presets.find(preset => preset.id === selectedPresetId);
        if (!selectedPreset) {
          return rejectWithValue(`Selected preset ${selectedPresetId} not found`);
        }
        configToUse = selectedPreset.config;
      }
      
      // Process the data
      const processor = new AIEnrichmentProcessor();
      const result = await processor.processDataset(
        configToUse,
        csvData.headers,
        csvData.rows
      );
      
      return result;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  }
);

// Create the AI enrichment slice
const aiEnrichmentSlice = createSlice({
  name: 'aiEnrichment',
  initialState,
  reducers: {
    selectPreset: (state, action: PayloadAction<string>) => {
      state.selectedPresetId = action.payload;
      state.status = 'idle';
      state.error = null;
    },
    
    clearSelection: (state) => {
      state.selectedPresetId = null;
      state.status = 'idle';
      state.error = null;
    },
    
    setActiveDataset: (state, action: PayloadAction<'original' | 'enriched'>) => {
      state.activeDataset = action.payload;
    },
    
    resetEnrichmentState: (state) => {
      // Force-reset all processing-related state
      state.status = 'idle';
      state.error = null;
      state.result = null;
      state.activeDataset = 'original';
      state._initialized = true;
      
      // If there was any selected preset, keep the selection but clear any runtime data
      if (state.selectedPresetId) {
        // We keep the selection for user convenience, but reset any processing state
        console.log('Resetting AI enrichment state but preserving preset selection');
      } else {
        console.log('Resetting AI enrichment state completely');
      }
    },
    
    addPreset: (state, action: PayloadAction<EnrichmentPreset>) => {
      state.presets.push(action.payload);
    },
    
    updatePreset: (state, action: PayloadAction<{ id: string; preset: Partial<EnrichmentPreset> }>) => {
      const index = state.presets.findIndex(preset => preset.id === action.payload.id);
      if (index !== -1) {
        state.presets[index] = { ...state.presets[index], ...action.payload.preset };
      }
    },
    
    removePreset: (state, action: PayloadAction<string>) => {
      state.presets = state.presets.filter(preset => preset.id !== action.payload);
      if (state.selectedPresetId === action.payload) {
        state.selectedPresetId = null;
      }
    }
  },
  extraReducers: (builder) => {
    // Handle rehydration explicitly to reset any processing state
    builder.addCase(REHYDRATE, (state, action: any) => {
      // This ensures we reset processing state on application restart
      if (action.key === 'root' || action.key === 'aiEnrichment') {
        console.log('Rehydration detected: Explicitly resetting AI processing state');
        state.status = 'idle';
        state.error = null;
        state.result = null;
        state._initialized = true;
      }
    });

    builder.addCase(processDataWithAI.pending, (state) => {
      state.status = 'processing';
      state.error = null;
    })
    .addCase(processDataWithAI.fulfilled, (state, action) => {
      state.status = 'success';
      state.result = action.payload;
      state.activeDataset = 'enriched';
    })
    .addCase(processDataWithAI.rejected, (state, action) => {
      state.status = 'error';
      state.error = action.payload as string;
    });
  }
});

// Export actions
export const {
  selectPreset,
  clearSelection,
  setActiveDataset,
  resetEnrichmentState,
  addPreset,
  updatePreset,
  removePreset
} = aiEnrichmentSlice.actions;

// Export selectors
export const selectAIEnrichmentState = (state: RootState) => state.aiEnrichment;
export const selectPresets = (state: RootState) => state.aiEnrichment.presets;
export const selectSelectedPreset = (state: RootState) => {
  const { selectedPresetId, presets } = state.aiEnrichment;
  if (!selectedPresetId) return null;
  return presets.find(preset => preset.id === selectedPresetId) || null;
};
export const selectEnrichmentStatus = (state: RootState) => state.aiEnrichment.status;
export const selectActiveDataset = (state: RootState) => state.aiEnrichment.activeDataset;
export const selectEnrichmentResult = (state: RootState) => state.aiEnrichment.result;
export const selectEnrichmentError = (state: RootState) => state.aiEnrichment.error;

// Export reducer
export default aiEnrichmentSlice.reducer;
