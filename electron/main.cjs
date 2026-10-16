const { app, BrowserWindow, ipcMain, clipboard, shell, session } = require('electron');
const path = require('path');
const fs = require('fs');
const {
  configFile,
  ensureConfig,
  loadConfig,
  saveConfig,
  setupConfigWatcher
} = require('./config.cjs');
const {
  setupDownloads,
  getDownloads,
  cancelDownload,
  openDownloadFile,
  showDownloadInFolder,
  removeDownload,
  clearDownloads
} = require('./downloads.cjs');
const { TabViewManager } = require('./tab-views.cjs');

// Path to user storage directory
const userDataPath = app.getPath('userData');
const bookmarksFile = path.join(userDataPath, 'bookmarks.json');
const historyFile = path.join(userDataPath, 'history.json');
const settingsFile = path.join(userDataPath, 'settings.json');
const sessionFile = path.join(userDataPath, 'session.json');

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
let tabViewManager = null;

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
      webviewTag: false,
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      spellcheck: true
    }
  });

  tabViewManager = new TabViewManager(mainWindow);
  // Seed each guest with the current keymap configuration.
  tabViewManager.setKeymaps(buildKeymapPayload(loadConfig()));

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5174';
  const distPath = path.join(__dirname, '../dist/index.html');

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

// Build the payload consumed by webview-preload.cjs to decide which keys to
// intercept inside guest pages.
function buildKeymapPayload(config) {
  const normalKeys = new Set();
  const insertKeys = new Set();
  const leader = config.options?.leader || '<Space>';
  const leaderToken = leader.length === 1 && leader !== ' ' ? leader : '<Space>';
  const collect = (map, target) => {
    for (const key of Object.keys(map || {})) {
      const expanded = key.replace(/<leader>/gi, leaderToken);
      const first = expanded.match(/^(<[^>]+>|.)/);
      if (first) target.add(first[1]);
    }
  };
  collect(config.keymaps?.normal, normalKeys);
  collect(config.keymaps?.insert, insertKeys);
  for (let i = 0; i <= 9; i += 1) normalKeys.add(String(i));
  return {
    normalKeys: Array.from(normalKeys),
    insertKeys: Array.from(insertKeys),
    timeoutlen: config.options?.timeoutlen || 500
  };
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
    homePage: 'keyor://start'
  });
});

ipcMain.handle('save-settings', (event, settings) => {
  return saveJson(settingsFile, settings);
});

// Session persistence
ipcMain.handle('get-session', () => {
  return loadJson(sessionFile, { tabs: [], activeIndex: 0 });
});

ipcMain.handle('save-session', (event, payload) => {
  return saveJson(sessionFile, payload);
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

// ── Config (~/.keyor/init.js) ───────────────────────────────────────────────
ipcMain.handle('get-config', () => {
  return loadConfig();
});

ipcMain.handle('save-config', (event, patch) => {
  const ok = saveConfig(patch);
  return ok;
});

ipcMain.handle('get-config-path', () => {
  return configFile;
});

ipcMain.handle('open-config-file', async () => {
  try {
    ensureConfig();
    await shell.openPath(configFile);
    return true;
  } catch (err) {
    console.error('Failed to open config file:', err);
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

// WebContentsView Native Tab Management IPC Handlers
ipcMain.handle('tab-view-create', (event, id, url) => {
  tabViewManager?.createTabView(id, url);
  return true;
});

ipcMain.handle('tab-view-switch', (event, id, url) => {
  tabViewManager?.switchTab(id, url);
  return true;
});

ipcMain.handle('tab-view-close', (event, id) => {
  tabViewManager?.closeTab(id);
  return true;
});

ipcMain.handle('tab-view-navigate', (event, id, url) => {
  tabViewManager?.navigateTab(id, url);
  return true;
});

ipcMain.handle('tab-view-set-mode', (event, mode) => {
  tabViewManager?.setMode(mode);
  return true;
});

ipcMain.handle('tab-view-set-bounds', (event, bounds) => {
  tabViewManager?.setViewportBounds(bounds);
  return true;
});

ipcMain.handle('tab-view-get-viewport', () => {
  return tabViewManager?.getViewportBounds() || { x: 0, y: 38, width: 1200, height: 700 };
});

ipcMain.handle('tab-view-set-keymaps', (event, payload) => {
  tabViewManager?.setKeymaps(payload);
  return true;
});

ipcMain.handle('tab-view-blur', () => {
  tabViewManager?.blurActiveTab();
  return true;
});

ipcMain.handle('tab-view-focus-first-input', () => {
  tabViewManager?.focusFirstInput();
  return true;
});

ipcMain.handle('tab-view-scroll-by', (event, top, left, smooth) => {
  tabViewManager?.scrollBy(top, left, smooth);
  return true;
});

ipcMain.handle('tab-view-scroll-to', (event, top, left, smooth) => {
  tabViewManager?.scrollTo(top, left, smooth);
  return true;
});

ipcMain.handle('tab-view-set-zoom', (event, factor) => {
  tabViewManager?.setZoomFactor(factor);
  return true;
});

ipcMain.handle('tab-view-get-zoom', () => {
  return tabViewManager?.getZoomFactor() || 1.0;
});

ipcMain.handle('tab-view-reload', (event, hard) => {
  tabViewManager?.reload(hard);
  return true;
});

ipcMain.handle('tab-view-go-back', () => {
  tabViewManager?.goBack();
  return true;
});

ipcMain.handle('tab-view-go-forward', () => {
  tabViewManager?.goForward();
  return true;
});

ipcMain.handle('tab-view-find', (event, text, options) => {
  return tabViewManager?.findInPage(text, options);
});

ipcMain.handle('tab-view-stop-find', (event, action) => {
  tabViewManager?.stopFindInPage(action);
  return true;
});

ipcMain.handle('tab-view-execute-script', async (event, script) => {
  return await tabViewManager?.executeJavaScript(script);
});

app.whenReady().then(() => {
  ensureConfig();
  createWindow();

  // Initialize Download Manager for both default session and webview partition
  const webviewSession = session.fromPartition('persist:keyor');
  setupDownloads([session.defaultSession, webviewSession], (eventName, data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(eventName, data);
    }
  });

  // Watch ~/.keyor/init.js for external modifications (like init.lua in Neovim)
  setupConfigWatcher((config) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      tabViewManager?.setKeymaps(buildKeymapPayload(config));
      mainWindow.webContents.send('config-changed', config);
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
