import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  total: number;
  currentItem: string | null;
  error: string | null;
}

const initialState: ProcessingState = {
  isProcessing: false,
  progress: 0,
  total: 0,
  currentItem: null,
  error: null,
};

export const processingSlice = createSlice({
  name: 'processing',
  initialState,
  reducers: {
    startProcessing: (state, action: PayloadAction<number>) => {
      state.isProcessing = true;
      state.progress = 0;
      state.total = action.payload;
      state.currentItem = null;
      state.error = null;
    },
    updateProgress: (state, action: PayloadAction<{ progress: number; currentItem: string }>) => {
      state.progress = action.payload.progress;
      state.currentItem = action.payload.currentItem;
    },
    stopProcessing: (state) => {
      state.isProcessing = false;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isProcessing = false;
    },
  },
});

export const { startProcessing, updateProgress, stopProcessing, setError } = processingSlice.actions;

export default processingSlice.reducer; 