import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import electronStorage from './electronStorage';
import configReducer from './slices/configSlice';
import dataReducer from './slices/dataSlice';
import processingReducer from './slices/processingSlice';
import resultsReducer from './slices/resultsSlice';
import providerReducer from './slices/providerSlice';

// For debugging
console.log('Setting up Redux store');

// Configure persistence settings
const persistConfig = {
  key: 'root',
  storage: electronStorage,
  whitelist: ['data', 'providers'], // Persist both data and providers
  debug: true, // Enable debug mode for Redux persist
};

const rootReducer = combineReducers({
  config: configReducer,
  data: dataReducer,
  processing: processingReducer,
  results: resultsReducer,
  providers: providerReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER]
      }
    })
});

// Log state changes for debugging
store.subscribe(() => {
  const state = store.getState();
  console.log('Redux state updated:', {
    providers: state.providers.providers.length
  });
});

export const persistor = persistStore(store, null, () => {
  console.log('Redux persist rehydration complete');
  console.log('Current state after rehydration:', store.getState());
});

console.log('Redux store created successfully');

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;