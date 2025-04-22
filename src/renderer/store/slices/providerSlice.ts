import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// Interface for a provider excluding sensitive data (API key)
export interface Provider {
  id: string;
  name: string;
  type: string; // 'openai', 'perplexity', etc.
  // Add a unique display ID to prevent React key issues
  uniqueId?: string;
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
    try {
      const success = await window.electronAPI.secureStorage.deleteApiKey(providerId);
      return { providerId, success };
    } catch (error) {
      console.error('Error deleting API key:', error);
      return { providerId, success: false };
    }
  }
);

// Helper function to generate a unique display ID
const generateUniqueId = (provider: Provider): string => {
  return `${provider.type}-${provider.name}-${provider.id}`;
};

const providerSlice = createSlice({
  name: 'providers',
  initialState,
  reducers: {
    // Add a new provider (without API key, which is stored separately)
    addProvider: (state, action: PayloadAction<Provider>) => {
      // Ensure each provider has a unique display ID
      const provider = {
        ...action.payload,
        uniqueId: generateUniqueId(action.payload)
      };
      state.providers.push(provider);
    },
    
    // Update a provider's non-sensitive information
    updateProvider: (state, action: PayloadAction<Provider>) => {
      const index = state.providers.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        // Preserve uniqueId or generate a new one
        const uniqueId = state.providers[index].uniqueId || generateUniqueId(action.payload);
        state.providers[index] = {
          ...action.payload,
          uniqueId
        };
      }
    },
    
    // Remove a provider
    removeProvider: (state, action: PayloadAction<string>) => {
      state.providers = state.providers.filter(p => p.id !== action.payload);
    },
    
    // Set all providers
    setProviders: (state, action: PayloadAction<Provider[]>) => {
      // Ensure all providers have unique display IDs
      state.providers = action.payload.map(provider => ({
        ...provider,
        uniqueId: provider.uniqueId || generateUniqueId(provider)
      }));
    }
  },
  extraReducers: () => {}
});

export const { 
  addProvider, 
  updateProvider, 
  removeProvider,
  setProviders
} = providerSlice.actions;

export default providerSlice.reducer;
