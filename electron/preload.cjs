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
  // Config (~/.keyor/init.js)
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (patch) => ipcRenderer.invoke('save-config', patch),
  getConfigPath: () => ipcRenderer.invoke('get-config-path'),
  openConfigFile: () => ipcRenderer.invoke('open-config-file'),
  onConfigChange: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('config-changed', handler);
    return () => ipcRenderer.removeListener('config-changed', handler);
  },
  getSession: () => ipcRenderer.invoke('get-session'),
  saveSession: (payload) => ipcRenderer.invoke('save-session', payload),
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
  },
  // WebContentsView Native Tab Management
  tabViewCreate: (id, url) => ipcRenderer.invoke('tab-view-create', id, url),
  tabViewSwitch: (id, url) => ipcRenderer.invoke('tab-view-switch', id, url),
  tabViewClose: (id) => ipcRenderer.invoke('tab-view-close', id),
  tabViewNavigate: (id, url) => ipcRenderer.invoke('tab-view-navigate', id, url),
  tabViewSetMode: (mode) => ipcRenderer.invoke('tab-view-set-mode', mode),
  tabViewSetBounds: (bounds) => ipcRenderer.invoke('tab-view-set-bounds', bounds),
  tabViewGetViewport: () => ipcRenderer.invoke('tab-view-get-viewport'),
  tabViewSetKeymaps: (payload) => ipcRenderer.invoke('tab-view-set-keymaps', payload),
  tabViewBlur: () => ipcRenderer.invoke('tab-view-blur'),
  tabViewFocusFirstInput: () => ipcRenderer.invoke('tab-view-focus-first-input'),
  tabViewScrollBy: (top, left, smooth) => ipcRenderer.invoke('tab-view-scroll-by', top, left, smooth),
  tabViewScrollTo: (top, left, smooth) => ipcRenderer.invoke('tab-view-scroll-to', top, left, smooth),
  tabViewSetZoom: (factor) => ipcRenderer.invoke('tab-view-set-zoom', factor),
  tabViewGetZoom: () => ipcRenderer.invoke('tab-view-get-zoom'),
  tabViewReload: (hard) => ipcRenderer.invoke('tab-view-reload', hard),
  tabViewGoBack: () => ipcRenderer.invoke('tab-view-go-back'),
  tabViewGoForward: () => ipcRenderer.invoke('tab-view-go-forward'),
  tabViewFind: (text, options) => ipcRenderer.invoke('tab-view-find', text, options),
  tabViewStopFind: (action) => ipcRenderer.invoke('tab-view-stop-find', action),
  tabViewExecuteScript: (script) => ipcRenderer.invoke('tab-view-execute-script', script),
  onTabUpdate: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('tab-update', handler);
    return () => ipcRenderer.removeListener('tab-update', handler);
  },
  onTabVimKey: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('tab-vim-key', handler);
    return () => ipcRenderer.removeListener('tab-vim-key', handler);
  },
  onTabModeChange: (callback) => {
    const handler = (event, mode) => callback(mode);
    ipcRenderer.on('tab-mode-change', handler);
    return () => ipcRenderer.removeListener('tab-mode-change', handler);
  },
  onTabFoundInPage: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('tab-found-in-page', handler);
    return () => ipcRenderer.removeListener('tab-found-in-page', handler);
  },
  onTabHistory: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('tab-history', handler);
    return () => ipcRenderer.removeListener('tab-history', handler);
  }
});
