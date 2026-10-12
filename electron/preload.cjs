const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  windowAction: (action) => ipcRenderer.invoke('window-action', action),
  onWindowStateChange: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('window-state-changed', handler);
    return () => ipcRenderer.removeListener('window-state-changed', handler);
  },
  getBookmarks: () => ipcRenderer.invoke('get-bookmarks'),
  saveBookmarks: (bookmarks) => ipcRenderer.invoke('save-bookmarks', bookmarks),
  getHistory: () => ipcRenderer.invoke('get-history'),
  saveHistory: (history) => ipcRenderer.invoke('save-history', history),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  copyToClipboard: (text) => ipcRenderer.invoke('clipboard-write', text),
  readClipboard: () => ipcRenderer.invoke('clipboard-read'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getWebviewPreloadPath: () => ipcRenderer.invoke('get-webview-preload-path'),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  saveTheme: (themeData) => ipcRenderer.invoke('save-theme', themeData),
  getThemePath: () => ipcRenderer.invoke('get-theme-path'),
  openThemeFile: () => ipcRenderer.invoke('open-theme-file'),
  onThemeChange: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('theme-changed', handler);
    return () => ipcRenderer.removeListener('theme-changed', handler);
  }
});
