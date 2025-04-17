import { ipcMain, app } from 'electron';
import crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// We'll wrap the module initialization in a function that can be called after import
let secureStore: any = null;

// Integrated SimpleFileStorage implementation
class SimpleFileStorage {
  private name: string;
  private encryptionKey: string | undefined;
  private data: Record<string, any>;
  private filePath: string;

  constructor(options: { name: string; encryptionKey?: string }) {
    this.name = options.name || 'config';
    this.encryptionKey = options.encryptionKey;
    this.data = {};
    
    try {
      // Determine the storage file path - ensure we use the absolute path
      const userDataPath = app.getPath('userData');
      this.filePath = path.join(userDataPath, `${this.name}.json`);
      
      console.log(`SimpleFileStorage: Using file at ${this.filePath}`);
      console.log(`SimpleFileStorage: User data path is ${userDataPath}`);
      
      // Force create directory if it doesn't exist
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        console.log(`SimpleFileStorage: Creating directory ${dir}`);
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Load data if file exists
      this.load();
    } catch (error) {
      console.error('SimpleFileStorage: Error in constructor:', error);
      // Default to temp path if something went wrong
      this.filePath = path.join(app.getPath('temp'), `${this.name}.json`);
      this.data = {};
    }
  }
  
  // Load data from file
  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        console.log(`SimpleFileStorage: Loading data from ${this.filePath}`);
        const fileContent = fs.readFileSync(this.filePath, 'utf8');
        console.log(`SimpleFileStorage: File content length: ${fileContent.length}`);
        
        const decryptedContent = this.decrypt(fileContent);
        this.data = JSON.parse(decryptedContent);
        console.log('SimpleFileStorage: Data loaded successfully', Object.keys(this.data));
      } else {
        console.log('SimpleFileStorage: No existing file, creating new store');
        this.data = {};
        // Create an empty file to ensure the path is writable
        this.save();
      }
    } catch (error) {
      console.error('SimpleFileStorage: Error loading data:', error);
      this.data = {};
    }
  }
  
  // Save data to file
  private save(): boolean {
    try {
      console.log(`SimpleFileStorage: Saving data to ${this.filePath}`, Object.keys(this.data));
      const jsonData = JSON.stringify(this.data, null, 2);
      console.log(`SimpleFileStorage: JSON data length: ${jsonData.length}`);
      
      const encryptedData = this.encrypt(jsonData);
      console.log(`SimpleFileStorage: Encrypted data length: ${encryptedData.length}`);
      
      // Ensure directory exists
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        console.log(`SimpleFileStorage: Creating directory ${dir}`);
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Use synchronous write to ensure data is persisted immediately
      fs.writeFileSync(this.filePath, encryptedData, { encoding: 'utf8' });
      
      // Verify the file was created
      if (fs.existsSync(this.filePath)) {
        const stats = fs.statSync(this.filePath);
        console.log(`SimpleFileStorage: File saved successfully, size: ${stats.size} bytes`);
        return true;
      } else {
        console.error(`SimpleFileStorage: File was not created at ${this.filePath}`);
        return false;
      }
    } catch (error) {
      console.error('SimpleFileStorage: Error saving data:', error);
      return false;
    }
  }
  
  // Encrypt data if encryption key is provided
  private encrypt(text: string): string {
    if (!this.encryptionKey) return text;
    
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        'aes-256-cbc', 
        Buffer.from(this.encryptionKey), 
        iv
      );
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('SimpleFileStorage: Encryption error:', error);
      return text;
    }
  }
  
  // Decrypt data if encryption key is provided
  private decrypt(text: string): string {
    if (!this.encryptionKey || !text.includes(':')) return text;
    
    try {
      const [ivHex, encrypted] = text.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc', 
        Buffer.from(this.encryptionKey), 
        iv
      );
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('SimpleFileStorage: Decryption error:', error);
      return text;
    }
  }
  
  // Get a value
  get(key: string): any {
    const parts = key.split('.');
    let current = this.data;
    
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    
    return current;
  }
  
  // Set a value
  set(key: string, value: any): boolean {
    try {
      console.log(`SimpleFileStorage: Setting key "${key}" with value:`, value);
      const parts = key.split('.');
      let current = this.data;
      
      // Navigate to the nested object
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part] || typeof current[part] !== 'object') {
          current[part] = {};
        }
        current = current[part];
      }
      
      // Set the value
      current[parts[parts.length - 1]] = value;
      
      // Save to file
      const result = this.save();
      console.log(`SimpleFileStorage: Save result for key "${key}": ${result}`);
      return result;
    } catch (error) {
      console.error(`SimpleFileStorage: Error setting key "${key}":`, error);
      return false;
    }
  }
  
  // Check if a key exists
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }
  
  // Delete a key
  delete(key: string): boolean {
    const parts = key.split('.');
    let current = this.data;
    
    // Navigate to the parent object
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (current === undefined || current === null) return false;
      current = current[part];
    }
    
    // Delete the property
    if (current !== undefined && current !== null) {
      delete current[parts[parts.length - 1]];
      return this.save();
    }
    
    return false;
  }
}

// Initialize secure storage - this will be called after the app is ready
export function initSecureStorage() {
  try {
    console.log("SECURE STORAGE: Initializing secure storage");
    console.log("SECURE STORAGE: User data path is", app.getPath('userData'));
    
    // Generate a stable encryption key based on machine-specific information
    const encryptionKey = generateEncryptionKey();
    
    // Create the secure store with a name and encryption key
    secureStore = new SimpleFileStorage({
      name: 'magicrows-secure-config',
      encryptionKey
    });
    
    console.log("SECURE STORAGE: File path is", (secureStore as any).filePath);
    console.log("SECURE STORAGE: Keys in storage:", Object.keys((secureStore as any).data));
    
    // Verify that secure storage is working by testing read/write
    try {
      // Try to write a test key
      const testKey = 'secure-storage-test';
      const testValue = `test-value-${Date.now()}`;
      secureStore.set(testKey, testValue);
      
      // Try to read the test key back
      const readValue = secureStore.get(testKey);
      
      if (readValue === testValue) {
        console.log('SECURE STORAGE: Self-test passed - storage is working correctly');
      } else {
        console.error('SECURE STORAGE: Self-test failed - read value does not match written value');
        console.error(`- Written: "${testValue}"`);
        console.error(`- Read: "${readValue}"`);
      }
    } catch (error) {
      console.error('SECURE STORAGE: Self-test failed with error:', error);
    }
    
    console.log('Secure storage initialized successfully');
    setupIpcHandlers();
    
    // Return success
    return true;
  } catch (error) {
    console.error('Failed to initialize secure storage:', error);
    
    // Fall back to a simpler storage mechanism
    secureStore = createFallbackStore();
    setupIpcHandlers();
    
    // Return failure
    return false;
  }
}

// Fallback store for when secure storage fails
function createFallbackStore() {
  console.warn('Using fallback in-memory store - API keys will not persist!');
  // Simple in-memory store implementation
  const memoryStore: Record<string, any> = {};
  secureStore = {
    get: (key: string) => {
      const parts = key.split('.');
      let current = memoryStore;
      for (const part of parts) {
        if (current === undefined) return undefined;
        current = current[part];
      }
      return current;
    },
    set: (key: string, value: any) => {
      const parts = key.split('.');
      let current = memoryStore;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
      current[parts[parts.length - 1]] = value;
      return true;
    },
    has: (key: string) => {
      const parts = key.split('.');
      let current = memoryStore;
      for (const part of parts) {
        if (current === undefined || current[part] === undefined) return false;
        current = current[part];
      }
      return true;
    },
    delete: (key: string) => {
      const parts = key.split('.');
      let current = memoryStore;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (current === undefined || current[part] === undefined) return false;
        current = current[part];
      }
      if (current !== undefined) {
        delete current[parts[parts.length - 1]];
      }
      return true;
    }
  };
}

// Generate a stable encryption key based on machine-specific information
function generateEncryptionKey(): string {
  // This is a simplified example - in production, use a more secure approach
  const os = require('os');
  const hostname = os.hostname();
  const username = os.userInfo().username;
  const hash = crypto.createHash('sha256');
  hash.update(`${hostname}-${username}-magicrows-secure-storage`);
  return hash.digest('hex').substring(0, 32); // Use first 32 chars (16 bytes)
}

// Set up IPC handlers for secure storage operations
function setupIpcHandlers() {
  // Handle getting a provider's API key
  ipcMain.handle('secure-storage:get-api-key', (_, providerId: string) => {
    try {
      if (!secureStore) throw new Error('Secure storage not initialized');
      
      console.log(`SECURE STORAGE: Getting API key for provider: ${providerId}`);
      
      // Try different key formats
      const possibleKeys = [
        providerId,
        `apiKeys.${providerId}`
      ];
      
      // If providerId contains openai/perplexity, also add the generic version
      const genericType = providerId.toLowerCase().includes('openai') ? 'openai' : 
                         providerId.toLowerCase().includes('perplexity') ? 'perplexity' : 
                         null;
      
      if (genericType && genericType !== providerId) {
        possibleKeys.push(genericType);
        possibleKeys.push(`apiKeys.${genericType}`);
      }
      
      // Try all possible key formats
      for (const keyFormat of possibleKeys) {
        const key = secureStore.get(keyFormat) as string | undefined;
        if (key) {
          console.log(`SECURE STORAGE: Found API key for ${providerId} using format: ${keyFormat}`);
          console.log(`SECURE STORAGE: Key length: ${key.length} characters`);
          return key;
        }
      }
      
      console.error(`SECURE STORAGE: No API key found for ${providerId} after trying formats:`, possibleKeys);
      return '';
    } catch (error) {
      console.error('Error getting API key:', error);
      return '';
    }
  });
  
  // Handle setting a provider's API key
  ipcMain.handle('secure-storage:set-api-key', (_, providerId: string, apiKey: string) => {
    try {
      if (!secureStore) throw new Error('Secure storage not initialized');
      
      console.log(`SECURE STORAGE: Setting API key for provider: ${providerId}`);
      console.log(`SECURE STORAGE: Key length: ${apiKey.length} characters`);
      
      // Store directly by providerId and also with apiKeys. prefix for compatibility
      const success1 = secureStore.set(providerId, apiKey);
      const success2 = secureStore.set(`apiKeys.${providerId}`, apiKey);
      
      if (success1 && success2) {
        console.log(`SECURE STORAGE: Successfully saved API key for ${providerId}`);
      } else {
        console.error(`SECURE STORAGE: Failed to save API key for ${providerId}`);
      }
      
      return success1 && success2;
    } catch (error) {
      console.error('Error setting API key:', error);
      return false;
    }
  });
  
  // Handle deleting a provider's API key
  ipcMain.handle('secure-storage:delete-api-key', (_, providerId: string) => {
    try {
      if (!secureStore) throw new Error('Secure storage not initialized');
      
      console.log(`SECURE STORAGE: Deleting API key for provider: ${providerId}`);
      
      // Delete both direct and prefixed versions
      const success1 = secureStore.delete(providerId);
      const success2 = secureStore.delete(`apiKeys.${providerId}`);
      
      return success1 || success2;
    } catch (error) {
      console.error('Error deleting API key:', error);
      return false;
    }
  });
  
  // Handle checking if a provider has an API key
  ipcMain.handle('secure-storage:has-api-key', (_, providerId: string) => {
    try {
      if (!secureStore) throw new Error('Secure storage not initialized');
      
      console.log(`SECURE STORAGE: Checking if API key exists for provider: ${providerId}`);
      
      // Try different key formats
      const possibleKeys = [
        providerId,
        `apiKeys.${providerId}`
      ];
      
      // If providerId contains openai/perplexity, also add the generic version
      const genericType = providerId.toLowerCase().includes('openai') ? 'openai' : 
                         providerId.toLowerCase().includes('perplexity') ? 'perplexity' : 
                         null;
      
      if (genericType && genericType !== providerId) {
        possibleKeys.push(genericType);
        possibleKeys.push(`apiKeys.${genericType}`);
      }
      
      // Check all possible key formats
      for (const keyFormat of possibleKeys) {
        if (secureStore.has(keyFormat)) {
          console.log(`SECURE STORAGE: Found API key for ${providerId} using format: ${keyFormat}`);
          return true;
        }
      }
      
      console.log(`SECURE STORAGE: No API key found for ${providerId}`);
      return false;
    } catch (error) {
      console.error('Error checking API key:', error);
      return false;
    }
  });
}
