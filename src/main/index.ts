import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { initSecureStorage } from './secureStorage'; // Import secure storage initializer

// Add type declaration for import.meta.env
declare global {
  interface ImportMeta {
    env: Record<string, any>;
  }
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

export const createWindow = (): BrowserWindow => {
  // *** Debug: Log platform ***
  console.log(`[Main Process] Detected platform: ${process.platform}`);

  // *** Debug: Simplify options to bare minimum for frameless ***
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false, // The most basic way to request frameless
    titleBarStyle: 'hiddenInset', // Re-enable for macOS
    titleBarOverlay: {
      color: '#d1d5db',  // Tailwind gray-300
      symbolColor: '#1f2937', // Tailwind gray-800
      height: 28 // Explicitly set height for macOS
    },
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: true,
      contextIsolation: true,
    },
  });

  // In production, set the initial browser path to the local bundle generated
  // by the Vite build process.
  // In development, set it to localhost to allow live/hot-reloading.
  const MAIN_URL = import.meta.env.DEV
    ? 'http://localhost:5173'
    : new URL('../renderer/index.html', 'file://' + __dirname).toString();

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_URL);

  // Open the DevTools.
  // if (import.meta.env.DEV) {
  //   mainWindow.webContents.openDevTools();
  // }

  return mainWindow;
};

// Register IPC handlers
function registerIpcHandlers() {
  console.log('Registering IPC handlers, including external-api:call');
  
  // Handle external API calls from the renderer process
  ipcMain.handle('external-api:call', async (event, args) => {
    const { url, method, headers, body } = args;
    
    console.log(`[Main Process] Making external API call to: ${url}`);
    console.log(`[Main Process] Method: ${method}`);
    
    try {
      // Dynamically import node-fetch
      const { default: fetch } = await import('node-fetch');
      
      // Make the API call using node-fetch
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });
      
      // Get response as text first
      const responseText = await response.text();
      
      // Try to parse as JSON if possible
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = responseText;
      }
      
      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData
      };
    } catch (error) {
      console.error('[Main Process] External API call error:', error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  // File dialog handlers
  ipcMain.handle('dialog:openFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (canceled) {
      return null;
    } else {
      return filePaths[0];
    }
  });

  // Save file dialog
  ipcMain.handle('dialog:saveFile', async (event, defaultPath) => {
    console.log('Save file dialog requested with default path:', defaultPath);
    
    if (!mainWindow) {
      console.error('Cannot show save dialog: main window is null');
      return null;
    }
    
    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        defaultPath: defaultPath || 'Untitled.csv',
        filters: [
          { name: 'CSV Files', extensions: ['csv'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      if (canceled) {
        console.log('Save dialog was canceled');
        return null;
      }
      
      console.log('User selected path:', filePath);
      return filePath;
    } catch (error) {
      console.error('Error showing save dialog:', error);
      return null;
    }
  });

  ipcMain.handle('dialog:selectDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (canceled) {
      return null;
    } else {
      return filePaths[0];
    }
  });

  // Save file dialog
  ipcMain.handle('save-file', async (event, defaultPath) => {
    console.log('Save file requested with default path:', defaultPath);
    
    if (!mainWindow) {
      console.error('Cannot show save dialog: main window is null');
      return null;
    }
    
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultPath || 'untitled.csv',
      filters: [
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (!result.canceled && result.filePath) {
      console.log('User selected path:', result.filePath);
      return result.filePath;
    }
    return null;
  });
  
  // Write file
  ipcMain.handle('write-file', async (event, path, content) => {
    console.log('Writing file to:', path);
    try {
      fs.writeFileSync(path, content, 'utf8');
      return true;
    } catch (error) {
      console.error('Error writing file:', error);
      return false;
    }
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  // Initialize secure storage and its IPC handlers
  try {
    await initSecureStorage(); // Wait for initialization
    console.log('Secure storage initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize secure storage:', error);
    // You might want to show an error dialog to the user here
  }

  // Register other IPC handlers first, before creating the window
  registerIpcHandlers();
  
  // Then create the browser window
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});