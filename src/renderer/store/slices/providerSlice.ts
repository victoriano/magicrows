import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// Interface for a provider excluding sensitive data (API key)
export interface Provider {
  id: string;
  name: string;
  type: string; // 'openai', 'perplexity', etc.
  isActive: boolean;
}

interface ProviderState {
  providers: Provider[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ProviderState = {
  providers: [],
  isLoading: false,
  error: null
};

// Async thunks for secure API key operations
export const checkProviderApiKey = createAsyncThunk(
  'providers/checkApiKey',
  async (providerId: string) => {
    return window.electronAPI.secureStorage.hasApiKey(providerId);
  }
);

export const getProviderApiKey = createAsyncThunk(
  'providers/getApiKey',
  async (providerId: string) => {
    return window.electronAPI.secureStorage.getApiKey(providerId);
  }
);

export const saveProviderApiKey = createAsyncThunk(
  'providers/saveApiKey',
  async ({ providerId, apiKey }: { providerId: string; apiKey: string }) => {
    const success = await window.electronAPI.secureStorage.setApiKey(providerId, apiKey);
    return { providerId, success };
  }
);

export const deleteProviderApiKey = createAsyncThunk(
  'providers/deleteApiKey',
  async (providerId: string) => {
    const success = await window.electronAPI.secureStorage.deleteApiKey(providerId);
    return { providerId, success };
  }
);

const providerSlice = createSlice({
  name: 'providers',
  initialState,
  reducers: {
    // Add a new provider (without API key, which is stored separately)
    addProvider: (state, action: PayloadAction<Provider>) => {
      state.providers.push(action.payload);
    },
    
    // Update a provider's non-sensitive information
    updateProvider: (state, action: PayloadAction<Provider>) => {
      const index = state.providers.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.providers[index] = action.payload;
      }
    },
    
    // Update a provider's active status
    setProviderActive: (
      state, 
      action: PayloadAction<{ id: string; isActive: boolean }>
    ) => {
      const { id, isActive } = action.payload;
      const index = state.providers.findIndex(p => p.id === id);
      if (index !== -1) {
        state.providers[index].isActive = isActive;
      }
    },
    
    // Remove a provider
    removeProvider: (state, action: PayloadAction<string>) => {
      state.providers = state.providers.filter(p => p.id !== action.payload);
    },
    
    // Set all providers
    setProviders: (state, action: PayloadAction<Provider[]>) => {
      state.providers = action.payload;
    }
  },
  extraReducers: (builder) => {
    // Handle async operation statuses if needed
    builder
      .addCase(saveProviderApiKey.fulfilled, (state, action) => {
        if (action.payload.success) {
          // If API key was saved successfully, ensure the provider is active
          const index = state.providers.findIndex(p => p.id === action.payload.providerId);
          if (index !== -1) {
            state.providers[index].isActive = true;
          }
        }
      })
      .addCase(deleteProviderApiKey.fulfilled, (state, action) => {
        if (action.payload.success) {
          // If API key was deleted successfully, deactivate the provider
          const index = state.providers.findIndex(p => p.id === action.payload.providerId);
          if (index !== -1) {
            state.providers[index].isActive = false;
          }
        }
      });
  }
});

export const { 
  addProvider, 
  updateProvider, 
  setProviderActive, 
  removeProvider,
  setProviders
} = providerSlice.actions;

export default providerSlice.reducer;
