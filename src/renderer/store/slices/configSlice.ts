import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ConfigState {
  inputFile: string;
  outputFile: string;
  apiChoice: 'openai' | 'perplexity' | 'both';
  numTasks: number;
  delay: number;
  filters: string[];
  maxRows: number | null;
  promptTemplate: string;
}

const initialState: ConfigState = {
  inputFile: '',
  outputFile: '',
  apiChoice: 'openai',
  numTasks: 5,
  delay: 1.0,
  filters: [],
  maxRows: null,
  promptTemplate: 'Provide {n_tasks} tasks for NACE {nace}, ISCO {isco}',
};

export const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    setInputFile: (state, action: PayloadAction<string>) => {
      state.inputFile = action.payload;
    },
    setOutputFile: (state, action: PayloadAction<string>) => {
      state.outputFile = action.payload;
    },
    setApiChoice: (state, action: PayloadAction<'openai' | 'perplexity' | 'both'>) => {
      state.apiChoice = action.payload;
    },
    setNumTasks: (state, action: PayloadAction<number>) => {
      state.numTasks = action.payload;
    },
    setDelay: (state, action: PayloadAction<number>) => {
      state.delay = action.payload;
    },
    addFilter: (state, action: PayloadAction<string>) => {
      state.filters.push(action.payload);
    },
    removeFilter: (state, action: PayloadAction<number>) => {
      state.filters.splice(action.payload, 1);
    },
    clearFilters: (state) => {
      state.filters = [];
    },
    setMaxRows: (state, action: PayloadAction<number | null>) => {
      state.maxRows = action.payload;
    },
    setPromptTemplate: (state, action: PayloadAction<string>) => {
      state.promptTemplate = action.payload;
    },
  },
});

export const {
  setInputFile,
  setOutputFile,
  setApiChoice,
  setNumTasks,
  setDelay,
  addFilter,
  removeFilter,
  clearFilters,
  setMaxRows,
  setPromptTemplate,
} = configSlice.actions;

export default configSlice.reducer; 