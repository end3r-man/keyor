const { app, BrowserWindow, ipcMain, clipboard, shell, session } = require('electron');
const path = require('path');
const fs = require('fs');
const {
  themeFile,
  ensureThemeConfig,
  loadThemeConfig,
  saveThemeConfig,
  setupThemeWatcher
} = require('./themes.cjs');
const {
  setupDownloads,
  getDownloads,
  cancelDownload,
  openDownloadFile,
  showDownloadInFolder,
  removeDownload,
  clearDownloads
} = require('./downloads.cjs');

// Path to user storage directory
const userDataPath = app.getPath('userData');
const bookmarksFile = path.join(userDataPath, 'bookmarks.json');
const historyFile = path.join(userDataPath, 'history.json');
const settingsFile = path.join(userDataPath, 'settings.json');

// Helper to safely load JSON
function loadJson(filePath, defaultValue) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return defaultValue;
}

// Helper to safely save JSON
function saveJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 860,
    minWidth: 800,
    minHeight: 520,
    backgroundColor: '#0c0e14',
    frame: false, // Sleek custom titlebar and tab bar
    titleBarStyle: 'hidden',
    webPreferences: {
      webviewTag: true,
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      spellcheck: true
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5174';
  const distPath = path.join(__dirname, '../dist/index.html');

  // Try loading dev server first; fallback gracefully to local bundle if server is not active
  mainWindow.loadURL(devServerUrl).catch(() => {
    mainWindow && mainWindow.loadURL('http://localhost:5173').catch(() => {
      if (fs.existsSync(distPath)) {
        console.log('Dev server not active, loading local dist/index.html bundle.');
        mainWindow && mainWindow.loadFile(distPath);
      } else {
        console.error('Neither dev server nor dist/index.html was found.');
      }
    });
  });

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-state-changed', { isMaximized: true });
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-state-changed', { isMaximized: false });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('window-action', (event, action) => {
  if (!mainWindow) return false;
  switch (action) {
    case 'minimize':
      mainWindow.minimize();
      return true;
    case 'maximize':
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
      return mainWindow.isMaximized();
    case 'close':
      mainWindow.close();
      return true;
    case 'is-maximized':
      return mainWindow.isMaximized();
    case 'toggle-devtools':
      mainWindow.webContents.toggleDevTools();
      return true;
    case 'toggle-fullscreen':
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      return mainWindow.isFullScreen();
    default:
      return false;
  }
});

// Storage Handlers
ipcMain.handle('get-bookmarks', () => {
  return loadJson(bookmarksFile, [
    { id: '1', title: 'DuckDuckGo', url: 'https://duckduckgo.com', icon: '🦆', date: Date.now() },
    { id: '2', title: 'GitHub', url: 'https://github.com', icon: '🐙', date: Date.now() },
    { id: '3', title: 'Hacker News', url: 'https://news.ycombinator.com', icon: '⚡', date: Date.now() },
    { id: '4', title: 'Vue.js Documentation', url: 'https://vuejs.org', icon: '🟢', date: Date.now() },
    { id: '5', title: 'MDN Web Docs', url: 'https://developer.mozilla.org', icon: '📚', date: Date.now() },
    { id: '6', title: 'Vim Cheatsheet', url: 'https://vim.rtorr.com', icon: '⌨️', date: Date.now() }
  ]);
});

ipcMain.handle('save-bookmarks', (event, bookmarks) => {
  return saveJson(bookmarksFile, bookmarks);
});

ipcMain.handle('get-history', () => {
  return loadJson(historyFile, []);
});

ipcMain.handle('save-history', (event, history) => {
  return saveJson(historyFile, history);
});

ipcMain.handle('get-settings', () => {
  return loadJson(settingsFile, {
    searchEngine: 'https://duckduckgo.com/?q=',
    scrollStep: 120,
    smoothScroll: true,
    homePage: 'keyor://start',
    hintCharacters: 'asdfjklghweruio',
    theme: 'dark-nord'
  });
});

ipcMain.handle('save-settings', (event, settings) => {
  return saveJson(settingsFile, settings);
});

// Clipboard
ipcMain.handle('clipboard-write', (event, text) => {
  clipboard.writeText(text);
  return true;
});

ipcMain.handle('clipboard-read', () => {
  return clipboard.readText();
});

// Open external URL
ipcMain.handle('open-external', (event, url) => {
  return shell.openExternal(url);
});

// Get preload script path for webview
ipcMain.handle('get-webview-preload-path', () => {
  const filePath = path.join(__dirname, 'webview-preload.cjs');
  return `file://${filePath}`;
});

// Vim Theme IPC Handlers (~/.keyor/theme.json)
ipcMain.handle('get-theme', () => {
  return loadThemeConfig();
});

ipcMain.handle('save-theme', (event, themeData) => {
  return saveThemeConfig(themeData);
});

ipcMain.handle('get-theme-path', () => {
  return themeFile;
});

ipcMain.handle('open-theme-file', async () => {
  try {
    ensureThemeConfig();
    await shell.openPath(themeFile);
    return true;
  } catch (err) {
    console.error('Failed to open theme file:', err);
    return false;
  }
});

// Download Manager IPC Handlers
ipcMain.handle('get-downloads', () => {
  return getDownloads();
});

ipcMain.handle('cancel-download', (event, id) => {
  return cancelDownload(id);
});

ipcMain.handle('open-download-file', async (event, filePath) => {
  return await openDownloadFile(filePath);
});

ipcMain.handle('show-download-in-folder', (event, filePath) => {
  return showDownloadInFolder(filePath);
});

ipcMain.handle('remove-download', (event, id) => {
  return removeDownload(id);
});

ipcMain.handle('clear-downloads', () => {
  return clearDownloads();
});

app.whenReady().then(() => {
  ensureThemeConfig();
  createWindow();

  // Initialize Download Manager for both default session and webview partition
  const webviewSession = session.fromPartition('persist:keyor');
  setupDownloads([session.defaultSession, webviewSession], (eventName, data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(eventName, data);
    }
  });

  // Watch ~/.keyor/theme.json for external modifications (e.g. edited in Vim/Neovim)
  setupThemeWatcher((updatedConfig) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('theme-changed', updatedConfig);
    }
  });

  // Handle webview guest contents
  app.on('web-contents-created', (event, contents) => {
    if (contents.getType() === 'webview') {
      contents.setWindowOpenHandler(({ url }) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('open-new-tab', url);
        }
        return { action: 'deny' };
      });

      contents.on('did-fail-load', (e, errorCode, errorDescription, validatedURL) => {
        // -3 is ERR_ABORTED, standard when navigation is superseded or redirected
        if (errorCode !== -3) {
          console.warn(`Webview load failed: [${errorCode}] ${validatedURL}`);
        }
      });

      // Handle before-input-event at native Chromium level
      contents.on('before-input-event', (event, input) => {
        if (input.type === 'keyDown' && (input.key === 'Escape' || (input.control && input.key === '['))) {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('webview-escape-pressed');
          }
        }
      });
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
