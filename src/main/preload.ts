import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: () => ipcRenderer.invoke('dialog:saveFile'),
  readFile: (path: string) => ipcRenderer.invoke('file:read', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('file:write', path, content),
  getApiKeys: () => ipcRenderer.invoke('config:getApiKeys'),
  saveApiKeys: (keys: { openai?: string, perplexity?: string }) => 
    ipcRenderer.invoke('config:saveApiKeys', keys),
});

// The type definition for the exposed API
declare global {
  interface Window {
    electronAPI: {
      openFile: () => Promise<string | null>;
      saveFile: () => Promise<string | null>;
      readFile: (path: string) => Promise<string>;
      writeFile: (path: string, content: string) => Promise<void>;
      getApiKeys: () => Promise<{ openai?: string, perplexity?: string }>;
      saveApiKeys: (keys: { openai?: string, perplexity?: string }) => Promise<void>;
    }
  }
} 