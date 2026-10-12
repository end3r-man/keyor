const { WebContentsView } = require('electron');
const path = require('path');

/**
 * TabViewManager - Manages native WebContentsView instances for browser tabs
 * Uses BaseWindow / BrowserWindow.contentView with permanent view attachments and visibility toggling.
 */
class TabViewManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.views = new Map(); // tabId -> WebContentsView
    this.activeTabId = null;
    this.currentMode = 'NORMAL';
    this.preloadPath = path.join(__dirname, 'webview-preload.cjs');

    // Default viewport bounds (Header height: 38px, Statusline height: 24px)
    this.bounds = {
      x: 0,
      y: 38,
      width: 1200,
      height: 738
    };

    this.setupWindowListeners();
  }

  setupWindowListeners() {
    this.mainWindow.on('resize', () => {
      this.recalculateBoundsFromWindow();
      this.applyActiveViewBounds();
    });
  }

  recalculateBoundsFromWindow() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    const [winWidth, winHeight] = this.mainWindow.getContentSize();
    this.bounds = {
      x: 0,
      y: 38,
      width: winWidth,
      height: Math.max(0, winHeight - 38 - 24)
    };
  }

  setViewportBounds(newBounds) {
    if (newBounds && typeof newBounds.width === 'number' && typeof newBounds.height === 'number') {
      this.bounds = {
        x: Math.round(newBounds.x || 0),
        y: Math.round(newBounds.y || 38),
        width: Math.round(newBounds.width),
        height: Math.round(newBounds.height)
      };
      this.applyActiveViewBounds();
    }
  }

  sendToRenderer(channel, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  createTabView(tabId, initialUrl = 'keyor://start') {
    if (this.views.has(tabId)) {
      return this.views.get(tabId);
    }

    const wcv = new WebContentsView({
      webPreferences: {
        preload: this.preloadPath,
        partition: 'persist:keyor',
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        spellcheck: true
      }
    });

    const wc = wcv.webContents;

    const getCanGoBack = () => (wc.navigationHistory ? wc.navigationHistory.canGoBack() : wc.canGoBack());
    const getCanGoForward = () => (wc.navigationHistory ? wc.navigationHistory.canGoForward() : wc.canGoForward());

    // Loading & state events
    wc.on('did-start-loading', () => {
      this.sendToRenderer('tab-update', { id: tabId, patch: { isLoading: true } });
    });

    wc.on('did-stop-loading', () => {
      this.sendToRenderer('tab-update', {
        id: tabId,
        patch: {
          isLoading: false,
          canGoBack: getCanGoBack(),
          canGoForward: getCanGoForward()
        }
      });
    });

    wc.on('page-title-updated', (event, title) => {
      this.sendToRenderer('tab-update', { id: tabId, patch: { title } });
      this.sendToRenderer('tab-history', { title, url: wc.getURL() });
    });

    wc.on('page-favicon-updated', (event, favicons) => {
      if (favicons && favicons.length > 0) {
        this.sendToRenderer('tab-update', { id: tabId, patch: { favicon: favicons[0] } });
      }
    });

    wc.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      // Error code -3 is ERR_ABORTED, standard when requests are superseded or redirected
      if (errorCode === -3) return;
      this.sendToRenderer('tab-update', { id: tabId, patch: { isLoading: false } });
    });

    wc.on('did-navigate', (event, url) => {
      this.sendToRenderer('tab-mode-change', 'NORMAL');
      this.sendToRenderer('tab-update', {
        id: tabId,
        patch: {
          url,
          canGoBack: getCanGoBack(),
          canGoForward: getCanGoForward()
        }
      });
      this.sendToRenderer('tab-history', { title: wc.getTitle(), url });
    });

    wc.on('did-navigate-in-page', (event, url, isMainFrame) => {
      if (isMainFrame) {
        this.sendToRenderer('tab-mode-change', 'NORMAL');
        this.sendToRenderer('tab-update', {
          id: tabId,
          patch: {
            url,
            canGoBack: getCanGoBack(),
            canGoForward: getCanGoForward()
          }
        });
      }
    });

    wc.on('media-started-playing', () => {
      this.sendToRenderer('tab-update', { id: tabId, patch: { isAudioPlaying: true } });
    });

    wc.on('media-paused', () => {
      this.sendToRenderer('tab-update', { id: tabId, patch: { isAudioPlaying: false } });
    });

    wc.on('found-in-page', (event, result) => {
      this.sendToRenderer('tab-found-in-page', result);
    });

    wc.setWindowOpenHandler(({ url }) => {
      this.sendToRenderer('open-new-tab', url);
      return { action: 'deny' };
    });

    // Native capture-phase before-input-event for Escape
    wc.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown' && (input.key === 'Escape' || (input.control && input.key === '['))) {
        this.sendToRenderer('webview-escape-pressed');
      }
    });

    // Listen to IPC messages from webview-preload.cjs
    wc.on('ipc-message', (event, channel, data) => {
      if (channel === 'webview-ipc-message' && data) {
        if (data.type === 'VIM_KEY') {
          this.sendToRenderer('tab-vim-key', data);
        } else if (data.type === 'FOCUS_INPUT') {
          this.sendToRenderer('tab-mode-change', 'INSERT');
        } else if (data.type === 'BLUR_INPUT') {
          this.sendToRenderer('tab-mode-change', 'NORMAL');
        } else if (data.type === 'SCROLL_UPDATE') {
          this.sendToRenderer('tab-update', { id: tabId, patch: { scrollPercent: data.percent } });
        } else if (data.type === 'PAGE_INFO') {
          this.sendToRenderer('tab-update', { id: tabId, patch: { title: data.title, url: data.url } });
        }
      }
    });

    // Permanently attach to contentView so RenderWidgetHostView stays connected
    if (this.mainWindow?.contentView) {
      this.mainWindow.contentView.addChildView(wcv);
    }
    wcv.setBounds(this.bounds);
    wcv.setVisible(false);

    this.views.set(tabId, wcv);

    // Initial navigation if not start page
    if (initialUrl && !initialUrl.startsWith('keyor://start')) {
      wc.loadURL(initialUrl).catch((err) => {
        if (err && err.errno !== -3 && err.code !== 'ERR_ABORTED') {
          console.warn('Navigation error:', err);
        }
      });
    }

    return wcv;
  }

  getActiveView() {
    if (!this.activeTabId) return null;
    return this.views.get(this.activeTabId) || null;
  }

  switchTab(tabId, tabUrl) {
    this.activeTabId = tabId;

    // Hide all inactive tabs (preserves widget host and GPU surface)
    for (const [id, view] of this.views.entries()) {
      if (id !== tabId) {
        view.setVisible(false);
      }
    }

    if (!tabUrl || tabUrl.startsWith('keyor://start')) {
      // Internal start page is rendered in Vue UI; keep tab view hidden
      const activeView = this.views.get(tabId);
      if (activeView) activeView.setVisible(false);
      return;
    }

    let nextView = this.views.get(tabId);
    if (!nextView) {
      nextView = this.createTabView(tabId, tabUrl);
    }

    if (this.mainWindow?.contentView && nextView) {
      if (!this.mainWindow.contentView.children.includes(nextView)) {
        this.mainWindow.contentView.addChildView(nextView);
      }
      this.applyActiveViewBounds();
      if (['NORMAL', 'INSERT'].includes(this.currentMode)) {
        nextView.webContents.focus();
      }
    }
  }

  navigateTab(tabId, url) {
    if (!url) return;

    if (url.startsWith('keyor://start')) {
      const view = this.views.get(tabId);
      if (view) {
        view.setVisible(false);
      }
      return;
    }

    let view = this.views.get(tabId);
    if (!view) {
      view = this.createTabView(tabId, url);
    }

    if (tabId === this.activeTabId && this.mainWindow?.contentView) {
      if (!this.mainWindow.contentView.children.includes(view)) {
        this.mainWindow.contentView.addChildView(view);
      }
      this.applyActiveViewBounds();
    }

    try {
      const currentUrl = view.webContents.getURL();
      if (currentUrl !== url) {
        view.webContents.loadURL(url).catch((err) => {
          if (err && err.errno !== -3 && err.code !== 'ERR_ABORTED') {
            console.warn('Navigation error:', err);
          }
        });
      }
    } catch (e) {}
  }

  closeTab(tabId) {
    const view = this.views.get(tabId);
    if (view) {
      if (this.mainWindow?.contentView) {
        try {
          this.mainWindow.contentView.removeChildView(view);
        } catch (e) {}
      }
      try {
        view.webContents.destroy();
      } catch (e) {}
      this.views.delete(tabId);
    }
    if (this.activeTabId === tabId) {
      this.activeTabId = null;
    }
  }

  applyActiveViewBounds() {
    const activeView = this.getActiveView();
    if (!activeView || !this.mainWindow?.contentView) return;

    if (!this.mainWindow.contentView.children.includes(activeView)) {
      return;
    }

    let targetBounds = { ...this.bounds };

    if (['NORMAL', 'INSERT'].includes(this.currentMode)) {
      activeView.setBounds(targetBounds);
      activeView.setVisible(true);
    } else if (this.currentMode === 'COMMAND') {
      // Command line is at the bottom (34px height above statusline)
      targetBounds.height = Math.max(0, targetBounds.height - 34);
      activeView.setBounds(targetBounds);
      activeView.setVisible(true);
    } else if (this.currentMode === 'FIND') {
      // Find bar is at the top (34px height below header)
      targetBounds.y += 34;
      targetBounds.height = Math.max(0, targetBounds.height - 34);
      activeView.setBounds(targetBounds);
      activeView.setVisible(true);
    } else {
      // Modal overlays (OMNIBAR, HELP, BUFFER, BOOKMARKS, DOWNLOADS)
      // Hide view so native Chromium does not block Vue modal UI or steal keys
      activeView.setVisible(false);
    }
  }

  setMode(mode) {
    this.currentMode = mode;
    this.applyActiveViewBounds();

    const activeView = this.getActiveView();
    if (activeView) {
      if (mode === 'NORMAL') {
        activeView.webContents.send('host-message', { type: 'SET_MODE', mode: 'NORMAL' });
      } else if (mode === 'INSERT') {
        activeView.webContents.send('host-message', { type: 'SET_MODE', mode: 'INSERT' });
      }
    }
  }

  blurActiveTab() {
    const activeView = this.getActiveView();
    if (activeView) {
      try {
        activeView.webContents.send('host-message', { type: 'BLUR_ACTIVE' });
      } catch (e) {}
    }
  }

  focusFirstInput() {
    const activeView = this.getActiveView();
    if (activeView) {
      try {
        activeView.webContents.send('host-message', { type: 'FOCUS_FIRST_INPUT' });
      } catch (e) {}
    }
  }

  scrollBy(top = 0, left = 0, smooth = true) {
    const activeView = this.getActiveView();
    if (activeView) {
      activeView.webContents.send('host-message', { type: 'SCROLL_BY', top, left, smooth });
    }
  }

  scrollTo(top, left, smooth = true) {
    const activeView = this.getActiveView();
    if (activeView) {
      activeView.webContents.send('host-message', { type: 'SCROLL_TO', top, left, smooth });
    }
  }

  setZoomFactor(factor) {
    const activeView = this.getActiveView();
    if (activeView) {
      activeView.webContents.setZoomFactor(factor);
    }
  }

  getZoomFactor() {
    const activeView = this.getActiveView();
    if (activeView) {
      return activeView.webContents.getZoomFactor();
    }
    return 1.0;
  }

  reload(hard = false) {
    const activeView = this.getActiveView();
    if (activeView) {
      if (hard) activeView.webContents.reloadIgnoringCache();
      else activeView.webContents.reload();
    }
  }

  goBack() {
    const activeView = this.getActiveView();
    if (activeView) {
      const wc = activeView.webContents;
      const canGoBack = wc.navigationHistory ? wc.navigationHistory.canGoBack() : wc.canGoBack();
      if (canGoBack) {
        if (wc.navigationHistory) wc.navigationHistory.goBack();
        else wc.goBack();
      }
    }
  }

  goForward() {
    const activeView = this.getActiveView();
    if (activeView) {
      const wc = activeView.webContents;
      const canGoForward = wc.navigationHistory ? wc.navigationHistory.canGoForward() : wc.canGoForward();
      if (canGoForward) {
        if (wc.navigationHistory) wc.navigationHistory.goForward();
        else wc.goForward();
      }
    }
  }

  findInPage(text, options = {}) {
    const activeView = this.getActiveView();
    if (activeView && text) {
      return activeView.webContents.findInPage(text, options);
    }
    return null;
  }

  stopFindInPage(action = 'clearSelection') {
    const activeView = this.getActiveView();
    if (activeView) {
      activeView.webContents.stopFindInPage(action);
    }
  }

  async executeJavaScript(script) {
    const activeView = this.getActiveView();
    if (activeView && script) {
      try {
        return await activeView.webContents.executeJavaScript(script);
      } catch (err) {
        console.error('executeJavaScript error:', err);
        return null;
      }
    }
    return null;
  }
}

module.exports = { TabViewManager };
