/**
 * Type declarations for Electron API
 * Extends the Window interface to include the electronAPI property
 */

interface SecureStorage {
  hasApiKey: (providerId: string) => Promise<boolean>;
  getApiKey: (providerId: string) => Promise<string>;
  setApiKey: (providerId: string, apiKey: string) => Promise<void>;
  removeApiKey: (providerId: string) => Promise<void>;
}

interface ElectronAPI {
  secureStorage: SecureStorage;
  // Add other Electron API interfaces as needed
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
