const { app, BrowserWindow, ipcMain, Notification, Menu } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

// In production, store user data (SQLite DB, uploads) safely in userData directory
if (app.isPackaged) {
  process.env.STATUS_USER_DATA = app.getPath('userData');
  process.env.NODE_ENV = 'production';
}

// Launch local Express API server safely if not already running
const debugLogFile = 'C:/Users/Boss-QA/status_debug.log';
const debugLog = (msg) => {
  try {
    fs.appendFileSync(debugLogFile, `[${new Date().toISOString()}] [main.cjs] ${msg}\n`);
  } catch (_) {}
};

debugLog(`Electron main started. isPackaged=${app.isPackaged}, userData=${app.getPath('userData')}`);

try {
  debugLog('Requiring ../server/server.js');
  require('../server/server.js');
  debugLog('../server/server.js required successfully');
} catch (e) {
  debugLog(`Server init ERROR: ${e.stack || e.message}`);
  console.error('[Electron] Server init error:', e);
}

let mainWindow;
let splashWindow;

function createWindow() {
  Menu.setApplicationMenu(null);

  // 1. Create and show compact Splash Window immediately on center of screen
  splashWindow = new BrowserWindow({
    width: 440,
    height: 270,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    center: true,
    show: true,
    backgroundColor: '#00000000',
    title: 'Status+ Loading...',
    icon: path.join(__dirname, '..', 'public', 'logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const splashPath = path.join(__dirname, 'splash.html');
  splashWindow.loadFile(splashPath);

  // 2. Create Main Window in background (hidden until assets & server ready)
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#1e1f21',
    title: 'Status+',
    icon: path.join(__dirname, '..', 'public', 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.setMenuBarVisibility(false);

  // Helper to transition smoothly from Splash to Main Window
  let isMainShown = false;
  const showMainApp = () => {
    debugLog(`showMainApp called. isMainShown=${isMainShown}`);
    if (isMainShown) return;
    isMainShown = true;

    if (mainWindow && !mainWindow.isDestroyed()) {
      debugLog('Showing mainWindow');
      mainWindow.show();
      mainWindow.focus();
    }
    if (splashWindow && !splashWindow.isDestroyed()) {
      debugLog('Closing splashWindow');
      splashWindow.close();
      splashWindow = null;
    }
  };

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    debugLog(`[Renderer Console] lvl=${level} line=${line}: ${message} (${sourceId})`);
  });

  mainWindow.webContents.once('did-finish-load', () => {
    debugLog('mainWindow did-finish-load fired');
    setTimeout(showMainApp, 400);
  });

  mainWindow.webContents.on('did-fail-load', (e, errCode, errDesc, validatedURL) => {
    debugLog(`mainWindow did-fail-load: ${errCode} ${errDesc} for ${validatedURL}`);
  });

  mainWindow.once('ready-to-show', () => {
    debugLog('mainWindow ready-to-show fired');
    setTimeout(showMainApp, 400);
  });

  mainWindow.on('closed', () => {
    debugLog('mainWindow closed event fired');
  });

  // Failsafe timer: Maximum 3.5 seconds on splash screen under any circumstance
  setTimeout(() => {
    debugLog('Failsafe timer fired');
    showMainApp();
  }, 3500);

  const serverUrl = 'http://localhost:3001';
  const devUrl = 'http://localhost:5173';
  const startUrl = process.env.ELECTRON_START_URL || (app.isPackaged ? serverUrl : devUrl);

  // Poll for server/dev before loading URL
  const tryConnect = (retries = 80) => {
    debugLog(`tryConnect to ${startUrl}, retries left: ${retries}`);
    const req = http.get(startUrl, (res) => {
      debugLog(`Connected to ${startUrl}, statusCode=${res.statusCode}`);
      res.resume(); // Consume data so socket is released immediately
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(startUrl);
      }
    });
    req.on('error', (err) => {
      if (retries > 0) {
        setTimeout(() => tryConnect(retries - 1), 250);
      } else {
        // Fallback to serverUrl if startUrl was devUrl
        http.get(serverUrl, (res) => {
          res.resume();
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.loadURL(serverUrl);
          }
        }).on('error', () => {
          setTimeout(() => tryConnect(20), 1000);
        });
      }
    });
  };

  tryConnect();
}

// Windows Toast Notification IPC Handler
ipcMain.on('show-notification', (event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({
      title: title || 'Status+ Project Manager',
      body: body || '',
      icon: path.join(__dirname, '..', 'public', 'icon.png')
    }).show();
  }
});

process.on('uncaughtException', (e) => {
  debugLog(`uncaughtException: ${e.stack || e.message}`);
});
process.on('unhandledRejection', (e) => {
  debugLog(`unhandledRejection: ${e}`);
});

app.whenReady().then(() => {
  debugLog('app.whenReady fired');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  debugLog(`window-all-closed fired. platform=${process.platform}`);
  if (process.platform !== 'darwin') app.quit();
});
app.on('will-quit', () => {
  debugLog('app will-quit fired');
});
app.on('quit', () => {
  debugLog('app quit fired');
});
