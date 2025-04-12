import { configureStore } from '@reduxjs/toolkit';
import configReducer from './slices/configSlice';
import dataReducer from './slices/dataSlice';
import processingReducer from './slices/processingSlice';
import resultsReducer from './slices/resultsSlice';

export const store = configureStore({
  reducer: {
    config: configReducer,
    data: dataReducer,
    processing: processingReducer,
    results: resultsReducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 