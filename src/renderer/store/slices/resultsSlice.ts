import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ResultItem {
  id: string;
  nace: string;
  isco: string;
  task: string;
  timestamp: string;
}

interface ResultsState {
  items: ResultItem[];
  selectedItems: string[];
}

const initialState: ResultsState = {
  items: [],
  selectedItems: [],
};

export const resultsSlice = createSlice({
  name: 'results',
  initialState,
  reducers: {
    addResult: (state, action: PayloadAction<ResultItem>) => {
      state.items.push(action.payload);
    },
    addResults: (state, action: PayloadAction<ResultItem[]>) => {
      state.items = [...state.items, ...action.payload];
    },
    clearResults: (state) => {
      state.items = [];
      state.selectedItems = [];
    },
    selectItem: (state, action: PayloadAction<string>) => {
      if (!state.selectedItems.includes(action.payload)) {
        state.selectedItems.push(action.payload);
      }
    },
    deselectItem: (state, action: PayloadAction<string>) => {
      state.selectedItems = state.selectedItems.filter(id => id !== action.payload);
    },
    selectAll: (state) => {
      state.selectedItems = state.items.map(item => item.id);
    },
    deselectAll: (state) => {
      state.selectedItems = [];
    },
  },
});

export const {
  addResult,
  addResults,
  clearResults,
  selectItem,
  deselectItem,
  selectAll,
  deselectAll,
} = resultsSlice.actions;

export default resultsSlice.reducer; 