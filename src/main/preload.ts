import { contextBridge, ipcRenderer } from 'electron';

// Suppress dragEvent not defined errors - this is an Electron quirk
window.addEventListener('error', (event) => {
  if (event.error && event.error.toString().includes('dragEvent is not defined')) {
    event.preventDefault();
    console.log('Suppressed dragEvent error (known Electron issue)');
  }
});

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: () => ipcRenderer.invoke('dialog:saveFile'),
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  readFile: (path: string) => ipcRenderer.invoke('file:read', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('file:write', path, content),
  getApiKeys: () => ipcRenderer.invoke('config:getApiKeys'),
  saveApiKeys: (keys: { openai?: string, perplexity?: string }) => 
    ipcRenderer.invoke('config:saveApiKeys', keys),
  restart: () => ipcRenderer.invoke('app:restart'),
  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),
  
  // Secure storage for API keys
  secureStorage: {
    getApiKey: (providerId: string) => ipcRenderer.invoke('secure-storage:get-api-key', providerId),
    setApiKey: (providerId: string, apiKey: string) => ipcRenderer.invoke('secure-storage:set-api-key', providerId, apiKey),
    deleteApiKey: (providerId: string) => ipcRenderer.invoke('secure-storage:delete-api-key', providerId),
    hasApiKey: (providerId: string) => ipcRenderer.invoke('secure-storage:has-api-key', providerId),
  },
});

// TypeScript declarations for window.electronAPI
declare global {
  interface Window {
    electronAPI: {
      openFile: () => Promise<string | null>;
      saveFile: () => Promise<string | null>;
      selectDirectory: () => Promise<string | null>;
      readFile: (path: string) => Promise<string>;
      writeFile: (path: string, content: string) => Promise<boolean>;
      getApiKeys: () => Promise<{ openai?: string, perplexity?: string }>;
      saveApiKeys: (keys: { openai?: string, perplexity?: string }) => Promise<boolean>;
      restart: () => Promise<void>;
      getAppInfo: () => Promise<{ version: string, platform: string }>;
      secureStorage: {
        getApiKey: (providerId: string) => Promise<string>;
        setApiKey: (providerId: string, apiKey: string) => Promise<boolean>;
        deleteApiKey: (providerId: string) => Promise<boolean>;
        hasApiKey: (providerId: string) => Promise<boolean>;
      };
    }
  }
}