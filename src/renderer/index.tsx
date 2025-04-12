import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import './styles/index.css';
import App from './App';

// Add timestamp to logs for easier debugging
const log = (message: string, ...args: any[]) => {
  const timestamp = new Date().toISOString().split('T')[1].substring(0, 8);
  console.log(`[${timestamp}] ${message}`, ...args);
};

// Application initialization
log('🚀 Index.tsx is executing');
log('Looking for root element...');

try {
  // Find the root element
  const rootElement = document.getElementById('root');
  log('Root element found:', rootElement);

  if (rootElement) {
    // Hide loading indicator when app is mounted
    const loadingIndicator = document.getElementById('loading-indicator');
    
    try {
      // Create React root
      const root = ReactDOM.createRoot(rootElement);
      log('React root created, rendering app...');
      
      // Render the app
      root.render(
        <React.StrictMode>
          <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
              <App />
            </PersistGate>
          </Provider>
        </React.StrictMode>
      );
      
      // Remove loading indicator after app is rendered
      if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
        log('Loading indicator hidden');
      }
      
      log('✅ App rendered successfully');
    } catch (error) {
      log('❌ Error rendering React app:', error);
      
      // Show error in UI if React fails to mount
      if (rootElement) {
        rootElement.innerHTML = `
          <div style="display: flex; justify-content: center; align-items: center; height: 100vh; color: #e74c3c; font-family: Arial, sans-serif; padding: 20px; text-align: center;">
            <div>
              <h2>Failed to start application</h2>
              <p>An error occurred while initializing the app.</p>
              <pre style="background: #f8f8f8; padding: 10px; border-radius: 4px; text-align: left; overflow: auto; max-width: 800px;">${error instanceof Error ? error.stack : String(error)}</pre>
            </div>
          </div>
        `;
      }
    }
  } else {
    log('❌ Root element not found! Check your HTML');
    document.body.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; height: 100vh; color: #e74c3c; font-family: Arial, sans-serif; text-align: center;">
        <div>
          <h2>App Failed to Load</h2>
          <p>Could not find the "root" element to mount the application.</p>
        </div>
      </div>
    `;
  }
} catch (error) {
  console.error('❌ Fatal error during app initialization:', error);
} 