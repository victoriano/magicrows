import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import fetch from 'node-fetch';

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

const createWindow = (): void => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
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
  if (import.meta.env.DEV) {
    mainWindow.webContents.openDevTools();
  }
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

  ipcMain.handle('dialog:saveFile', async () => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      filters: [
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (canceled) {
      return null;
    } else {
      return filePath;
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
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  // Register IPC handlers first, before creating the window
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