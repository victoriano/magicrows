import { app, BrowserWindow, ipcMain, dialog, session } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs'; // Import the synchronous existsSync function
import http from 'http';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// Use try-catch to handle the case when the module is not found (macOS/Linux)
try {
  if (require('electron-squirrel-startup')) {
    app.quit();
  }
} catch (e) {
  // Not running on Windows or module not found, ignore the error
  console.log('electron-squirrel-startup not found, continuing...');
}

// Keep a global reference of the window object to avoid garbage collection
let mainWindow: BrowserWindow | null = null;

// Check if a port is in use
const isPortInUse = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const req = http.get({
      hostname: 'localhost',
      port,
      path: '/',
      timeout: 1000
    }, () => {
      resolve(true);
    }).on('error', () => {
      resolve(false);
    });
    req.end();
  });
};

// Find the first available port in a range
const findAvailablePort = async (startPort: number, endPort: number): Promise<number | null> => {
  for (let port = startPort; port <= endPort; port++) {
    const inUse = await isPortInUse(port);
    if (inUse) {
      console.log(`Found active server on port ${port}`);
      return port;
    }
  }
  return null;
};

const createWindow = async (): Promise<void> => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false // Only for development! Remove in production
    },
  });

  // Set custom session permissions
  if (mainWindow) {
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      console.log(`Network request to: ${details.url}`);
      callback({});
    });
    
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      console.log(`Response from: ${details.url} - Status: ${details.statusCode}`);
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Access-Control-Allow-Origin': ['*'],
        },
      });
    });
  }

  // In development mode, load from vite dev server
  if (process.env.NODE_ENV === 'development') {
    console.log('Running in development mode');
    mainWindow.webContents.openDevTools();
    
    // Find the active Vite server port (Vite might select a different port if 5173 is in use)
    const port = await findAvailablePort(5173, 5180);
    
    if (port) {
      // Test if the Vite server is ready by making a request
      try {
        console.log(`Attempting to connect to Vite server at http://localhost:${port}/`);
        
        // Try to load the URL with a specific path
        const loadUrl = `http://localhost:${port}/index.html`;
        console.log(`Loading URL: ${loadUrl}`);
        await mainWindow.loadURL(loadUrl);
        
        console.log(`Successfully connected to Vite server on port ${port}`);
      } catch (e) {
        console.error(`Failed to connect to Vite server on port ${port}:`, e);
        // Fallback to file loading
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
      }
    } else {
      console.error('No active Vite server found in port range 5173-5180');
      // Fallback to file loading
      mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }
  } else {
    // In production, load the index.html file from the correct location
    console.log('Running in production mode');
    
    // We need to handle path resolution differently in a packaged app
    let indexPath;
    if (app.isPackaged) {
      // When packaged, the rendered files are in the app.asar at a predictable location
      indexPath = path.join(__dirname, '../renderer/index.html');
      
      // If the above doesn't work, try these alternative paths
      if (!existsSync(indexPath)) {
        console.log(`Index not found at ${indexPath}, trying alternative paths...`);
        const possiblePaths = [
          path.join(__dirname, '../../renderer/index.html'),
          path.join(__dirname, '../index.html'),
          path.join(process.resourcesPath, 'app.asar/renderer/index.html'),
          path.join(process.resourcesPath, 'app.asar/.vite/build/index.html')
        ];
        
        for (const testPath of possiblePaths) {
          try {
            if (existsSync(testPath)) {
              indexPath = testPath;
              console.log(`Found index at: ${indexPath}`);
              break;
            }
          } catch (err) {
            console.log(`Error checking path ${testPath}:`, err);
          }
        }
      }
    } else {
      // For unpackaged production builds
      indexPath = path.join(__dirname, '../renderer/index.html');
    }
    
    console.log(`Loading index from: ${indexPath}`);
    mainWindow.loadFile(indexPath);
  }

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object
    mainWindow = null;
  });
};

// Set up IPC handlers for file operations
ipcMain.handle('dialog:openFile', async () => {
  if (!mainWindow) return null;
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  });
  if (canceled) return null;
  return filePaths[0];
});

ipcMain.handle('dialog:saveFile', async () => {
  if (!mainWindow) return null;
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  });
  if (canceled || !filePath) return null;
  return filePath;
});

ipcMain.handle('file:read', async (_, path) => {
  const content = await fs.readFile(path, 'utf8');
  return content;
});

ipcMain.handle('file:write', async (_, path, content) => {
  await fs.writeFile(path, content, 'utf8');
});

// API key storage - in a real app, use a more secure method
let apiKeys: { openai?: string, perplexity?: string } = {};

ipcMain.handle('config:getApiKeys', () => {
  return apiKeys;
});

ipcMain.handle('config:saveApiKeys', (_, keys) => {
  apiKeys = keys;
  return;
});

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window when clicking on the dock icon
    if (mainWindow === null) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
}); 