const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');

// Launch local Express API server safely if not already running
try {
  require('../server/server.js');
} catch (e) {
  console.log('[Electron] Server init note:', e.message);
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    backgroundColor: '#1e1f21',
    title: 'Status+',
    icon: path.join(__dirname, '..', 'public', 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173';
  const http = require('http');
  const fs = require('fs');

  // Poll for Vite dev server before loading URL
  const tryConnect = (retries = 40) => {
    const req = http.get(startUrl, (res) => {
      mainWindow.loadURL(startUrl);
      mainWindow.show();
    });
    req.on('error', () => {
      if (retries > 0) {
        setTimeout(() => tryConnect(retries - 1), 300);
      } else {
        const distPath = path.join(__dirname, '..', 'dist', 'index.html');
        if (fs.existsSync(distPath)) {
          mainWindow.loadFile(distPath);
        } else {
          mainWindow.loadURL(startUrl);
        }
        mainWindow.show();
      }
    });
  };

  tryConnect();

  // If local dev server fails later, fallback to built dist/index.html
  mainWindow.webContents.on('did-fail-load', (event, errorCode) => {
    if (errorCode !== -3) { // Not an aborted navigation
      const distPath = path.join(__dirname, '..', 'dist', 'index.html');
      if (fs.existsSync(distPath)) {
        mainWindow.loadFile(distPath);
        mainWindow.show();
      }
    }
  });
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

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
