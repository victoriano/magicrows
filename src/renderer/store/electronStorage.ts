// Custom storage engine for redux-persist using Electron's file system
// This ensures data is properly persisted across app restarts

import { Storage } from 'redux-persist';

// Create a storage engine using Electron's APIs
const createElectronStorage = (): Storage => {
  // Debug flag
  const enableLogging = true;
  
  // Helper function for logging
  const log = (message: string, ...args: any[]) => {
    if (enableLogging) {
      console.log(`[ElectronStorage] ${message}`, ...args);
    }
  };
  
  // Check if we're in the renderer process and have access to electronAPI
  const hasElectronAPI = typeof window !== 'undefined' && 
                         'electronAPI' in window && 
                         window.electronAPI !== null;
  
  log(`ElectronStorage initialized, hasElectronAPI: ${hasElectronAPI}`);
  
  return {
    getItem: (key: string): Promise<string | null> => {
      return new Promise((resolve) => {
        log(`Getting item with key: ${key}`);
        
        try {
          // Use localStorage as fallback if electronAPI is not available
          if (!hasElectronAPI) {
            log('Falling back to localStorage for getItem');
            const data = localStorage.getItem(key);
            log(`Retrieved from localStorage, data length: ${data?.length || 0}`);
            resolve(data);
            return;
          }
          
          // Try to read the file using the Electron API
          log('Attempting to read persisted data via electron API');
          
          // Using the app's user data directory with getAppInfo
          window.electronAPI.getAppInfo()
            .then((appInfo) => {
              // First try using the user data directory integrated with app name
              window.electronAPI.readFile(`magicrows-${key}.json`)
                .then((content: string) => {
                  log(`Data retrieved from file, length: ${content.length}`);
                  resolve(content);
                })
                .catch((error: any) => {
                  log(`Error reading file: ${error}`);
                  // If file doesn't exist yet, that's okay
                  resolve(null);
                });
            })
            .catch((error) => {
              log(`Error getting app info: ${error}`);
              // Fallback to localStorage if we can't get app info
              const data = localStorage.getItem(key);
              resolve(data);
            });
        } catch (error) {
          log(`Exception in getItem: ${error}`);
          // Return null on error
          resolve(null);
        }
      });
    },
    
    setItem: (key: string, value: string): Promise<void> => {
      return new Promise((resolve) => {
        log(`Setting item with key: ${key}, value length: ${value.length}`);
        
        try {
          // Use localStorage as fallback if electronAPI is not available
          if (!hasElectronAPI) {
            log('Falling back to localStorage for setItem');
            localStorage.setItem(key, value);
            resolve();
            return;
          }
          
          // Try to write the file using the Electron API
          log('Attempting to write persisted data via electron API');
          
          // Using a temporary directory for storage
          window.electronAPI.writeFile(`magicrows-${key}.json`, value)
            .then(() => {
              log('Data successfully written to file');
              // Also save to localStorage as a backup
              try {
                localStorage.setItem(key, value);
              } catch (e) {
                // Ignore localStorage errors
              }
              resolve();
            })
            .catch((error: any) => {
              log(`Error writing file: ${error}, falling back to localStorage`);
              // Fallback to localStorage on error
              localStorage.setItem(key, value);
              resolve();
            });
        } catch (error) {
          log(`Exception in setItem: ${error}`);
          // Fallback to localStorage on error
          localStorage.setItem(key, value);
          resolve();
        }
      });
    },
    
    removeItem: (key: string): Promise<void> => {
      return new Promise((resolve) => {
        log(`Removing item with key: ${key}`);
        
        try {
          // Always remove from localStorage as a precaution
          localStorage.removeItem(key);
          
          // If electronAPI is not available, we're done
          if (!hasElectronAPI) {
            log('Falling back to localStorage for removeItem');
            resolve();
            return;
          }
          
          // Try to delete the file using the Electron API
          // Here we'd normally delete the file, but since we don't have a deleteFile method,
          // we'll just write an empty string to it
          window.electronAPI.writeFile(`magicrows-${key}.json`, '')
            .then(() => {
              log('Data file emptied');
              resolve();
            })
            .catch((error: any) => {
              log(`Error emptying file: ${error}`);
              resolve();
            });
        } catch (error) {
          log(`Exception in removeItem: ${error}`);
          resolve();
        }
      });
    }
  };
};

// Export the storage engine
const electronStorage = createElectronStorage();
export default electronStorage;
