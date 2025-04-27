import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { REHYDRATE } from 'redux-persist';
import { AIEnrichmentBlockConfig } from '../../../shared/schemas/AIEnrichmentBlockSchema';
import { AIEnrichmentProcessor, EnrichmentProcessingResult } from '../../services/ai/AIEnrichmentProcessor';
import { RootState } from '../index';
import { PresetLoaderService } from '../../services/presets/PresetLoaderService';

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
  presets: [], // We'll load presets from the PresetLoaderService
  selectedPresetId: null,
  activeDataset: 'original',
  status: 'idle',
  error: null,
  result: null,
  _initialized: false
};

// Create an async thunk to load presets from the PresetLoaderService
export const loadExternalPresets = createAsyncThunk<
  EnrichmentPreset[],
  void,
  { state: RootState }
>(
  'aiEnrichment/loadExternalPresets',
  async (_, { rejectWithValue }) => {
    try {
      // Get the singleton instance of PresetLoaderService
      const presetService = PresetLoaderService.getInstance();
      
      // Load all presets
      const presets = await presetService.loadAllPresets();
      
      return presets;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load presets');
    }
  }
);

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
      const aiEnrichment = state.aiEnrichment || { selectedPresetId: null, presets: [] };
      const selectedPresetId = aiEnrichment.selectedPresetId;
      const presets = aiEnrichment.presets || [];
      const csvData = state.data?.csvData;
      
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
        console.log('Completely resetting AI enrichment state');
      }
    },
    
    resetStatus: (state) => {
      // Only reset the status to idle, preserving all other state
      state.status = 'idle';
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
    // Add extra reducers for async thunks
    builder
      // Handle rehydration from redux-persist
      .addCase(REHYDRATE, (state) => {
        state._initialized = true;
      })
      
      // Handle loadExternalPresets async thunk
      .addCase(loadExternalPresets.pending, (state) => {
        state.error = null;
      })
      .addCase(loadExternalPresets.fulfilled, (state, action) => {
        state.presets = action.payload;
        state._initialized = true;
      })
      .addCase(loadExternalPresets.rejected, (state, action) => {
        console.error('Failed to load presets:', action.payload);
        // Keep any existing presets on error
        state.error = action.payload as string;
        state._initialized = true;
      })
      
      // Handle processDataWithAI async thunk
      .addCase(processDataWithAI.pending, (state) => {
        state.status = 'processing';
        state.error = null;
      })
      .addCase(processDataWithAI.fulfilled, (state, action) => {
        state.status = 'success';
        state.result = action.payload;
        state.activeDataset = 'enriched'; // Switch to the enriched dataset view
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
  resetStatus,
  addPreset,
  updatePreset,
  removePreset
} = aiEnrichmentSlice.actions;

// Export selectors
export const selectAIEnrichmentState = (state: RootState) => state.aiEnrichment;
export const selectPresets = (state: RootState) => state.aiEnrichment?.presets || [];
export const selectSelectedPreset = (state: RootState) => {
  const aiEnrichment = state.aiEnrichment;
  if (!aiEnrichment || !aiEnrichment.selectedPresetId) return null;
  
  return aiEnrichment.presets.find(preset => preset.id === aiEnrichment.selectedPresetId);
};
export const selectEnrichmentStatus = (state: RootState) => state.aiEnrichment?.status;
export const selectActiveDataset = (state: RootState) => state.aiEnrichment?.activeDataset;
export const selectEnrichmentResult = (state: RootState) => state.aiEnrichment?.result;
export const selectEnrichmentError = (state: RootState) => state.aiEnrichment?.error;

// Export reducer
export default aiEnrichmentSlice.reducer;
