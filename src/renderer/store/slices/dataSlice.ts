import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DataState {
  csvData: {
    headers: string[];
    rows: string[][];
  } | null;
  filteredData: string[][] | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: DataState = {
  csvData: null,
  filteredData: null,
  isLoading: false,
  error: null,
};

export const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    setData: (state, action: PayloadAction<{ headers: string[]; rows: string[][] }>) => {
      state.csvData = action.payload;
      state.filteredData = action.payload.rows;
      state.error = null;
    },
    clearData: (state) => {
      state.csvData = null;
      state.filteredData = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
  },
});

export const { setData, clearData, setLoading, setError } = dataSlice.actions;

export default dataSlice.reducer; 