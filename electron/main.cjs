const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');

// Launch local Express API server in background
require('../server/server.js');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#1e1f21',
    title: 'Status+',
    icon: path.join(__dirname, '..', 'public', 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Check if running in dev or built
  const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173';
  mainWindow.loadURL(startUrl);

  // If local dev server isn't up, fallback to built dist/index.html
  mainWindow.webContents.on('did-fail-load', () => {
    const distPath = path.join(__dirname, '..', 'dist', 'index.html');
    const fs = require('fs');
    if (fs.existsSync(distPath)) {
      mainWindow.loadFile(distPath);
    } else {
      setTimeout(() => {
        mainWindow.loadURL(startUrl);
      }, 1500);
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
