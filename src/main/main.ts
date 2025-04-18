import { app, BrowserWindow, ipcMain, dialog, session } from 'electron';
import * as path from 'path';
import * as fs from 'fs';  // Use regular fs for existsSync
import * as fsPromises from 'fs/promises';
import * as http from 'http';
import { initSecureStorage } from './secureStorage';

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
  // Determine the preload script path based on environment
  let preloadPath: string;
  
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    // In development, use the preload script from the source directory
    preloadPath = path.join(__dirname, '../preload/preload.js');
  } else {
    // In production, try multiple potential locations for the preload script
    const potentialPaths = [
      path.join(__dirname, 'preload.js'),                // Same directory
      path.join(__dirname, '../preload/preload.js'),     // Up one level in preload dir
      path.join(__dirname, '../../preload/preload.js'),  // Up two levels in preload dir
      path.join(app.getAppPath(), '.vite/preload/preload.js') // In .vite directory
    ];
    
    preloadPath = potentialPaths.find(p => fs.existsSync(p)) || potentialPaths[0];
    
    // Log the resolved preload path to help debug
    console.log('Potential preload paths:', potentialPaths);
    console.log('Selected preload path:', preloadPath);
    console.log('Path exists:', fs.existsSync(preloadPath));
    console.log('App path:', app.getAppPath());
    console.log('Current directory:', __dirname);
  }
  
  // Create the browser window.
  mainWindow = new BrowserWindow({
    title: 'MagicRows',
    width: 1280,
    height: 720,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Only for development! Remove in production
    },
  });

  // Log the preload path to help debug
  console.log('Preload script path:', preloadPath);

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
  if (isDevelopment) {
    console.log('Running in development mode');
    // mainWindow.webContents.openDevTools(); // Commented out to prevent automatic DevTools opening
    
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
    
    // Get the correct path to the renderer index.html file
    let indexPath;
    
    if (app.isPackaged) {
      // In packaged app, the path is relative to the executable
      // Use path.resolve with __dirname to get the absolute path
      indexPath = path.resolve(__dirname, '../renderer/index.html');
      console.log('App is packaged, looking for index at:', indexPath);
      
      // If the default path doesn't exist, try alternative locations
      if (!fs.existsSync(indexPath)) {
        console.log(`Index not found at primary location: ${indexPath}`);
        
        // Define possible locations where the index.html might be in a packaged app
        const possiblePaths = [
          path.resolve(__dirname, '../renderer/index.html'),
          path.resolve(__dirname, '../../renderer/index.html'),
          path.resolve(__dirname, '../.vite/renderer/index.html'),
          path.resolve(process.resourcesPath, 'app.asar/.vite/renderer/index.html'),
          path.resolve(process.resourcesPath, 'app.asar/renderer/index.html'),
          path.resolve(app.getAppPath(), 'renderer/index.html'),
          path.resolve(app.getAppPath(), '.vite/renderer/index.html')
        ];
        
        // Find the first path that exists
        for (const testPath of possiblePaths) {
          console.log(`Trying path: ${testPath}`);
          if (fs.existsSync(testPath)) {
            indexPath = testPath;
            console.log(`✅ Found index.html at: ${indexPath}`);
            break;
          }
        }
        
        // If no path was found, log an error
        if (!fs.existsSync(indexPath)) {
          console.error('❌ ERROR: Could not find index.html in any location!');
          // List all files in the app directory to help debug
          try {
            const appDir = app.getAppPath();
            console.log(`Listing files in ${appDir}:`);
            const { execSync } = require('child_process');
            const result = execSync(`find "${appDir}" -name "*.html" -type f | sort`).toString();
            console.log(result || 'No HTML files found');
          } catch (err) {
            console.error('Failed to list app directory:', err);
          }
        }
      }
    } else {
      // For unpackaged production builds
      indexPath = path.resolve(__dirname, '../renderer/index.html');
      console.log('App is not packaged, using index at:', indexPath);
      
      // For testing a "pseudo-packaged" environment, you can simulate production paths
      if (process.env.SIMULATE_PRODUCTION === 'true') {
        indexPath = path.resolve(__dirname, '../.vite/renderer/index.html');
        console.log('Simulating production environment, using index at:', indexPath);
      }
    }
    
    // Log the final path being used
    console.log(`Loading index from: ${indexPath}`);
    
    // Load the file or show an error page if it doesn't exist
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
      // Enable DevTools in production to help debug storage issues
      mainWindow.webContents.openDevTools();
    } else {
      // Display an error page when index.html can't be found
      mainWindow.loadURL(`data:text/html;charset=utf-8,
        <html>
          <head><title>Error - File Not Found</title></head>
          <body style="font-family: sans-serif; padding: 2rem;">
            <h1 style="color: #e74c3c;">Error: Could not load application</h1>
            <p>The application could not find the required files.</p>
            <p>Looking for: <code>${indexPath}</code></p>
            <p>This is usually caused by a packaging or build configuration issue.</p>
            <hr>
            <p><small>Application path: ${app.getAppPath()}</small></p>
            <button onclick="window.electronAPI.restart()">Restart App</button>
          </body>
        </html>
      `);
    }
  }

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object
    mainWindow = null;
  });
};

// Handle restart requests from the renderer
ipcMain.handle('app:restart', () => {
  app.relaunch();
  app.exit(0);
});

// Provide application info for debugging purposes
ipcMain.handle('app:getInfo', () => {
  return {
    appPath: app.getAppPath(),
    resourcesPath: process.resourcesPath,
    isPackaged: app.isPackaged,
    version: app.getVersion(),
    platform: process.platform,
    userDataPath: app.getPath('userData')
  };
});

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

ipcMain.handle('dialog:selectDirectory', async () => {
  if (!mainWindow) return null;
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Output Directory'
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

ipcMain.handle('file:read', async (_, filePath) => {
  try {
    // If this is an absolute path, use it directly
    if (path.isAbsolute(filePath)) {
      const content = await fsPromises.readFile(filePath, 'utf8');
      return content;
    }
    
    // Otherwise, read from the user data directory
    const userDataPath = app.getPath('userData');
    const fullPath = path.join(userDataPath, filePath);
    console.log(`Reading file from: ${fullPath}`);
    
    try {
      const content = await fsPromises.readFile(fullPath, 'utf8');
      return content;
    } catch (error) {
      console.error(`Error reading file ${fullPath}:`, error);
      throw error;
    }
  } catch (error) {
    console.error('Error in file:read handler:', error);
    throw error;
  }
});

ipcMain.handle('file:write', async (_, filePath, content) => {
  try {
    // If this is an absolute path, use it directly
    if (path.isAbsolute(filePath)) {
      await fsPromises.writeFile(filePath, content, 'utf8');
      return;
    }
    
    // Otherwise, write to the user data directory
    const userDataPath = app.getPath('userData');
    const fullPath = path.join(userDataPath, filePath);
    console.log(`Writing file to: ${fullPath}`);
    
    // Ensure directory exists
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    await fsPromises.writeFile(fullPath, content, 'utf8');
    return;
  } catch (error) {
    console.error('Error in file:write handler:', error);
    throw error;
  }
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

// External API handler for making external requests from the renderer process
// This bypasses Content Security Policy restrictions
ipcMain.handle('external-api:call', async (_, args) => {
  const { url, method, headers, body, timeout = 30000 } = args;
  
  console.log(`[Main Process] Making external API call to: ${url}`);
  console.log(`[Main Process] Method: ${method}`);
  
  if (url.includes('perplexity')) {
    console.log(`[Main Process] Perplexity API call detected`);
    console.log(`[Main Process] Headers: ${JSON.stringify(headers, null, 2)}`);
    console.log(`[Main Process] Body: ${JSON.stringify(body, null, 2)}`);
  }
  
  try {
    // We need to import fetch dynamically since it's not imported at the top level
    const { default: fetch } = await import('node-fetch');
    const https = await import('https');
    
    // Create abort controller for timeout
    // Use native AbortController from global scope
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // Set family: 4 to force IPv4 (avoid IPv6 issues)
    const agent = new https.Agent({
      family: 4, // Force IPv4
      timeout: timeout
    });
    
    // Make the API call using node-fetch
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      agent
      // timeout property removed as it's not in the RequestInit type
    });
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    // Get response as text first
    const responseText = await response.text();
    
    if (url.includes('perplexity')) {
      console.log(`[Main Process] Perplexity API response status: ${response.status}`);
      console.log(`[Main Process] Perplexity API response text: ${responseText.substring(0, 500)}${responseText.length > 500 ? '...' : ''}`);
    }
    
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
    
    // Enhanced error information
    const errorInfo = {
      ok: false,
      status: error.name === 'AbortError' ? 408 : undefined,
      statusText: error.name === 'AbortError' ? 'Request Timeout' : undefined,
      error: error instanceof Error ? error.message : String(error),
      code: error.code,
      name: error.name,
      isTimeout: error.name === 'AbortError' || error.code === 'ETIMEDOUT'
    };
    
    console.log('[Main Process] Detailed error info:', errorInfo);
    return errorInfo;
  }
});

// Initialize the app and create window
const initApp = async () => {
  try {
    // First initialize secure storage
    await initSecureStorage();
    console.log('Secure storage initialized successfully');
    
    // Then create the main window
    await createWindow();
  } catch (error) {
    console.error('Failed to initialize application:', error);
    app.quit();
  }
};

// This method will be called when Electron has finished initialization
app.whenReady().then(initApp);

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window when clicking on the dock icon
  if (mainWindow === null) {
    createWindow();
  }
});