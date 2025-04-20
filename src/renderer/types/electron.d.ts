/**
 * Type declarations for Electron API
 * Extends the Window interface to include the electronAPI property
 */

export interface SecureStorage {
  hasApiKey: (providerId: string) => Promise<boolean>;
  getApiKey: (providerId: string) => Promise<string>;
  setApiKey: (providerId: string, apiKey: string) => Promise<boolean>;
  deleteApiKey: (providerId: string) => Promise<boolean>;
}

export interface ExternalApiResponse {
  ok: boolean;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  data?: any;
  error?: string;
}

export interface ExternalApi {
  call: (options: { 
    url: string; 
    method: string; 
    headers?: Record<string, string>; 
    body?: any; 
  }) => Promise<ExternalApiResponse>;
}

export interface ElectronAPI {
  openFile: () => Promise<string | null>;
  saveFile: (defaultPath?: string) => Promise<string | null>;
  selectDirectory: () => Promise<string | null>;
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<boolean>;
  getApiKeys: () => Promise<{ openai?: string, perplexity?: string }>;
  saveApiKeys: (keys: { openai?: string, perplexity?: string }) => Promise<boolean>;
  restart: () => Promise<void>;
  getAppInfo: () => Promise<{ version: string, platform: string }>;
  secureStorage: SecureStorage;
  externalApi: ExternalApi;
}

// Using declaration merging to add electronAPI to the Window interface
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
