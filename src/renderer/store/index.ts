import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import configReducer from './slices/configSlice';
import dataReducer from './slices/dataSlice';
import processingReducer from './slices/processingSlice';
import resultsReducer from './slices/resultsSlice';

// For debugging
console.log('Setting up Redux store');

// Configure persistence settings
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['data'] // Only persist the data slice
};

const rootReducer = combineReducers({
  config: configReducer,
  data: dataReducer,
  processing: processingReducer,
  results: resultsReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE']
      }
    })
});

export const persistor = persistStore(store);

console.log('Redux store created successfully');

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;