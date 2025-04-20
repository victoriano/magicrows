import { contextBridge, ipcRenderer } from 'electron';
// Import the ElectronAPI interface from the types file
import type { ElectronAPI } from '../renderer/types/electron';

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
  saveFile: (defaultPath?: string) => ipcRenderer.invoke('dialog:saveFile', defaultPath),
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
  
  // External API calls (to bypass content security policy restrictions)
  externalApi: {
    call: (options: { 
      url: string; 
      method: string; 
      headers?: Record<string, string>; 
      body?: any; 
    }) => ipcRenderer.invoke('external-api:call', options),
  },
} as ElectronAPI);

// The window.electronAPI interface is defined in ../renderer/types/electron.d.ts