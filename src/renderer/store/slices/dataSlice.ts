import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface RecentFile {
  id: string;
  path: string;
  name: string;
  timestamp: number;
}

interface DataState {
  csvData: {
    headers: string[];
    rows: string[][];
  } | null;
  filteredData: string[][] | null;
  isLoading: boolean;
  error: string | null;
  currentFilePath: string | null;
  currentFileName: string | null;
  recentFiles: RecentFile[];
  isPreviewActive: boolean;
}

const initialState: DataState = {
  csvData: null,
  filteredData: null,
  isLoading: false,
  error: null,
  currentFilePath: null,
  currentFileName: null,
  recentFiles: [],
  isPreviewActive: false,
};

export const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    setData: (state, action: PayloadAction<{ 
      headers: string[]; 
      rows: string[][];
      filePath?: string; 
      fileName?: string;
    }>) => {
      state.csvData = {
        headers: action.payload.headers,
        rows: action.payload.rows
      };
      state.filteredData = action.payload.rows;
      state.error = null;
      state.isPreviewActive = true;
      
      // Update file path and name if provided
      if (action.payload.filePath) {
        state.currentFilePath = action.payload.filePath;
      }
      if (action.payload.fileName) {
        state.currentFileName = action.payload.fileName;
      }
      
      // Add to recent files if we have a path
      if (action.payload.filePath && action.payload.fileName) {
        // Generate a unique ID
        const fileId = `file_${Date.now()}`;
        
        // Remove existing entry with the same path if it exists
        state.recentFiles = state.recentFiles.filter(
          file => file.path !== action.payload.filePath
        );
        
        // Add new entry at the beginning
        state.recentFiles.unshift({
          id: fileId,
          path: action.payload.filePath,
          name: action.payload.fileName,
          timestamp: Date.now(),
        });
        
        // Keep only the last 10 recent files
        if (state.recentFiles.length > 10) {
          state.recentFiles = state.recentFiles.slice(0, 10);
        }
      }
    },
    clearData: (state) => {
      state.csvData = null;
      state.filteredData = null;
      state.currentFilePath = null;
      state.currentFileName = null;
      state.isPreviewActive = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    markPreviewAsImported: (state) => {
      state.isPreviewActive = false;
    },
    removeRecentFile: (state, action: PayloadAction<string>) => {
      state.recentFiles = state.recentFiles.filter(file => file.id !== action.payload);
    },
    setRecentFiles: (state, action: PayloadAction<RecentFile[]>) => {
      state.recentFiles = action.payload;
    },
    updateFileTimestamp: (state, action: PayloadAction<string>) => {
      // Find the file with the matching path
      const fileIndex = state.recentFiles.findIndex(file => file.path === action.payload);
      if (fileIndex !== -1) {
        // Create a copy of the file with updated timestamp
        const updatedFile = {
          ...state.recentFiles[fileIndex],
          timestamp: Date.now()
        };
        
        // Remove the file from the current position
        state.recentFiles.splice(fileIndex, 1);
        
        // Add it back at the top of the list
        state.recentFiles.unshift(updatedFile);
      }
    },
  },
});

export const { 
  setData, 
  clearData, 
  setLoading, 
  setError,
  markPreviewAsImported,
  removeRecentFile,
  setRecentFiles,
  updateFileTimestamp
} = dataSlice.actions;

export default dataSlice.reducer;