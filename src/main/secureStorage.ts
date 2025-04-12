import { ipcMain } from 'electron';
import Store from 'electron-store';
import * as crypto from 'crypto';

// Generate a stable encryption key based on machine-specific information
// In a production app, you'd want a more robust approach
function generateEncryptionKey(): string {
  // This is a simplified example - in production, use a more secure approach
  const hostname = require('os').hostname();
  const username = require('os').userInfo().username;
  const hash = crypto.createHash('sha256');
  hash.update(`${hostname}-${username}-rowvana-secure-storage`);
  return hash.digest('hex').substring(0, 32); // Use first 32 chars (16 bytes)
}

// Create secure store with encryption
const secureStore = new Store({
  name: 'rowvana-secure-config',
  encryptionKey: generateEncryptionKey(),
  // Don't allow access from renderer process directly
  watch: false
});

// Initialize secure storage
export function initSecureStorage() {
  console.log('Initializing secure storage');
  
  // Handle getting a provider's API key
  ipcMain.handle('secure-storage:get-api-key', (_, providerId: string) => {
    try {
      const key = secureStore.get(`apiKeys.${providerId}`) as string | undefined;
      return key || '';
    } catch (error) {
      console.error('Error getting API key:', error);
      return '';
    }
  });
  
  // Handle setting a provider's API key
  ipcMain.handle('secure-storage:set-api-key', (_, providerId: string, apiKey: string) => {
    try {
      secureStore.set(`apiKeys.${providerId}`, apiKey);
      return true;
    } catch (error) {
      console.error('Error setting API key:', error);
      return false;
    }
  });
  
  // Handle deleting a provider's API key
  ipcMain.handle('secure-storage:delete-api-key', (_, providerId: string) => {
    try {
      secureStore.delete(`apiKeys.${providerId}`);
      return true;
    } catch (error) {
      console.error('Error deleting API key:', error);
      return false;
    }
  });
  
  // Handle checking if a provider has an API key stored
  ipcMain.handle('secure-storage:has-api-key', (_, providerId: string) => {
    try {
      return secureStore.has(`apiKeys.${providerId}`);
    } catch (error) {
      console.error('Error checking for API key:', error);
      return false;
    }
  });
  
  console.log('Secure storage initialized');
}
