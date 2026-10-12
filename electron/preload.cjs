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
  },
  onOpenNewTab: (callback) => {
    const handler = (event, url) => callback(url);
    ipcRenderer.on('open-new-tab', handler);
    return () => ipcRenderer.removeListener('open-new-tab', handler);
  },
  // Download Manager
  getDownloads: () => ipcRenderer.invoke('get-downloads'),
  cancelDownload: (id) => ipcRenderer.invoke('cancel-download', id),
  openDownloadFile: (filePath) => ipcRenderer.invoke('open-download-file', filePath),
  showDownloadInFolder: (filePath) => ipcRenderer.invoke('show-download-in-folder', filePath),
  removeDownload: (id) => ipcRenderer.invoke('remove-download', id),
  clearDownloads: () => ipcRenderer.invoke('clear-downloads'),
  onDownloadStarted: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('download-started', handler);
    return () => ipcRenderer.removeListener('download-started', handler);
  },
  onDownloadProgress: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('download-progress', handler);
    return () => ipcRenderer.removeListener('download-progress', handler);
  },
  onDownloadCompleted: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('download-completed', handler);
    return () => ipcRenderer.removeListener('download-completed', handler);
  },
  onDownloadFailed: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('download-failed', handler);
    return () => ipcRenderer.removeListener('download-failed', handler);
  },
  onWebviewEscape: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('webview-escape-pressed', handler);
    return () => ipcRenderer.removeListener('webview-escape-pressed', handler);
  }
});
