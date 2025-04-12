// This is a CommonJS compatibility module for electron-store
// It handles importing electron-store in a way that works in both
// development and production environments

let Store;

try {
  // Try ESM import first
  const importESM = new Function('modulePath', 'return import(modulePath)');
  
  module.exports = {
    createStore: async function(options) {
      try {
        const esm = await importESM('electron-store');
        Store = esm.default;
        return new Store(options);
      } catch (err) {
        console.error('Failed to import electron-store as ESM:', err);
        // Fallback to CommonJS
        try {
          Store = require('electron-store');
          return new Store(options);
        } catch (err2) {
          console.error('Failed to require electron-store as CJS:', err2);
          throw new Error('Could not load electron-store: ' + err2.message);
        }
      }
    }
  };
} catch (err) {
  console.error('Error in electronStoreCompat:', err);
  
  // Last resort fallback
  module.exports = {
    createStore: async function() {
      console.error('electronStoreCompat completely failed. Returning mock implementation.');
      // Return a mock implementation that won't crash
      return {
        get: (key) => null,
        set: () => {},
        has: () => false,
        delete: () => {}
      };
    }
  };
}
