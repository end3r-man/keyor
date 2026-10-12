<template>
  <div class="browser-webview-container">
    <div
      v-for="tab in tabs"
      :key="tab.id"
      class="tab-viewport"
      :class="{ 'is-active': tab.id === activeTabId }"
      v-show="tab.id === activeTabId"
    >
      <!-- Internal Start Page -->
      <NewTabPage
        v-if="tab.url.startsWith('keyor://start')"
        :bookmarks="bookmarks"
        :history="history"
        @navigate="(url) => navigateTab(tab.id, url)"
        @open-omnibar="$emit('open-omnibar')"
        @open-help="$emit('open-help')"
      />

      <!-- Electron Webview (when inside Electron) -->
      <webview
        v-else-if="isElectron"
        :ref="el => setWebviewRef(tab.id, el)"
        :src="tab.url"
        :preload="webviewPreloadPath"
        allowpopups
        partition="persist:keyor"
        class="webview-frame"
      ></webview>

      <!-- Web / Non-Electron Fallback (iframe with info banner) -->
      <div v-else class="iframe-container">
        <div class="web-preview-notice">
          <span class="notice-badge">ELECTRON WEBVIEW</span>
          <span class="notice-text">In desktop Electron mode, full webviews with sandboxed DOM hinting run natively.</span>
          <span class="notice-url">{{ tab.url }}</span>
        </div>
        <iframe
          :src="tab.url"
          class="iframe-view"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        ></iframe>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import NewTabPage from './NewTabPage.vue';
import {
  generateHintCodes,
  getInjectHintsScript,
  getFilterHintsScript,
  getActivateHintScript,
  getClearHintsScript
} from '../utils/hintEngine';

const props = defineProps({
  tabs: {
    type: Array,
    required: true
  },
  activeTabId: {
    type: String,
    required: true
  },
  bookmarks: {
    type: Array,
    default: () => []
  },
  history: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits([
  'update-tab',
  'new-tab',
  'vim-key',
  'mode-change',
  'open-omnibar',
  'open-help',
  'add-history',
  'found-in-page'
]);

const webviewRefs = {};
const webviewPreloadPath = ref('');
const isElectron = ref(false);

const setWebviewRef = (id, el) => {
  if (el) {
    webviewRefs[id] = el;
    setupWebviewEvents(id, el);
  } else {
    delete webviewRefs[id];
  }
};

onMounted(async () => {
  if (window.electronAPI) {
    isElectron.value = true;
    try {
      webviewPreloadPath.value = await window.electronAPI.getWebviewPreloadPath();
    } catch (e) {
      console.warn('Failed to get preload path:', e);
    }
  }
});

const setupWebviewEvents = (tabId, wv) => {
  if (!wv || wv._hasKeyorEvents) return;
  wv._hasKeyorEvents = true;

  wv.addEventListener('did-start-loading', () => {
    emit('update-tab', { id: tabId, patch: { isLoading: true } });
  });

  wv.addEventListener('did-stop-loading', () => {
    emit('update-tab', {
      id: tabId,
      patch: {
        isLoading: false,
        canGoBack: wv.canGoBack(),
        canGoForward: wv.canGoForward()
      }
    });
  });

  wv.addEventListener('page-title-updated', (e) => {
    emit('update-tab', { id: tabId, patch: { title: e.title } });
    emit('add-history', { title: e.title, url: wv.getURL() });
  });

  wv.addEventListener('page-favicon-updated', (e) => {
    if (e.favicons && e.favicons.length > 0) {
      emit('update-tab', { id: tabId, patch: { favicon: e.favicons[0] } });
    }
  });

  wv.addEventListener('did-fail-load', (e) => {
    // Error code -3 is ERR_ABORTED, standard when requests are superseded or redirected
    if (e.errorCode === -3) return;
    emit('update-tab', { id: tabId, patch: { isLoading: false } });
  });

  wv.addEventListener('did-navigate', (e) => {
    emit('update-tab', {
      id: tabId,
      patch: {
        url: e.url,
        canGoBack: wv.canGoBack(),
        canGoForward: wv.canGoForward()
      }
    });
    emit('add-history', { title: wv.getTitle(), url: e.url });
  });

  wv.addEventListener('did-navigate-in-page', (e) => {
    if (e.isMainFrame) {
      emit('update-tab', {
        id: tabId,
        patch: {
          url: e.url,
          canGoBack: wv.canGoBack(),
          canGoForward: wv.canGoForward()
        }
      });
    }
  });

  wv.addEventListener('new-window', (e) => {
    e.preventDefault();
    emit('new-tab', e.url);
  });

  wv.addEventListener('media-started-playing', () => {
    emit('update-tab', { id: tabId, patch: { isAudioPlaying: true } });
  });

  wv.addEventListener('media-paused', () => {
    emit('update-tab', { id: tabId, patch: { isAudioPlaying: false } });
  });

  wv.addEventListener('found-in-page', (e) => {
    emit('found-in-page', {
      activeMatchOrdinal: e.result.activeMatchOrdinal,
      matches: e.result.matches,
      finalUpdate: e.result.finalUpdate
    });
  });

  // Handle IPC messages from webview preload
  wv.addEventListener('ipc-message', (e) => {
    const data = e.channel || e.args?.[0];
    if (!data) return;

    if (data.type === 'VIM_KEY') {
      emit('vim-key', data);
    } else if (data.type === 'FOCUS_INPUT') {
      emit('mode-change', 'INSERT');
    } else if (data.type === 'BLUR_INPUT') {
      emit('mode-change', 'NORMAL');
    } else if (data.type === 'SCROLL_UPDATE') {
      emit('update-tab', { id: tabId, patch: { scrollPercent: data.percent } });
    } else if (data.type === 'PAGE_INFO') {
      emit('update-tab', { id: tabId, patch: { title: data.title, url: data.url } });
    }
  });
};

const getActiveWebview = () => {
  return webviewRefs[props.activeTabId];
};

const loadWebviewUrl = (wv, targetUrl) => {
  if (!wv || !targetUrl) return;
  try {
    if (typeof wv.getURL === 'function' && wv.getURL() === targetUrl) {
      return;
    }
  } catch (e) {}

  if (typeof wv.loadURL === 'function') {
    wv.loadURL(targetUrl).catch((err) => {
      // Ignore ERR_ABORTED (-3) as it happens normally on redirects or rapid input
      if (err && err.errno !== -3 && err.code !== 'ERR_ABORTED') {
        console.warn('Navigation error:', err);
      }
    });
  } else {
    wv.src = targetUrl;
  }
};

const navigateTab = (tabId, url) => {
  const currentTab = props.tabs.find(t => t.id === tabId);
  const wasStartPage = currentTab?.url?.startsWith('keyor://start');
  emit('update-tab', { id: tabId, patch: { url, isLoading: true } });

  // If it was start page, Vue unmounts NewTabPage and mounts <webview :src="url">,
  // which automatically initiates the first load without a double loadURL call.
  if (!wasStartPage) {
    const wv = webviewRefs[tabId];
    if (wv) {
      loadWebviewUrl(wv, url);
    }
  }
};

const navigateActiveTab = (url) => {
  navigateTab(props.activeTabId, url);
};

// Hint Mode Methods
const startHintMode = async (openInNewTab = false) => {
  const wv = getActiveWebview();
  if (!wv) return { count: 0, codes: [] };

  const hintCodes = generateHintCodes(80);
  try {
    const res = await wv.executeJavaScript(getInjectHintsScript(hintCodes));
    return res || { count: 0, codes: [] };
  } catch (e) {
    console.error('Failed to inject hints:', e);
    return { count: 0, codes: [] };
  }
};

const filterHints = (prefix) => {
  const wv = getActiveWebview();
  if (wv) {
    wv.executeJavaScript(getFilterHintsScript(prefix)).catch(() => {});
  }
};

const activateHint = async (code, openInNewTab = false) => {
  const wv = getActiveWebview();
  if (!wv) return { success: false };

  try {
    return await wv.executeJavaScript(getActivateHintScript(code, openInNewTab));
  } catch (e) {
    console.error('Failed to activate hint:', e);
    return { success: false };
  }
};

const clearHints = () => {
  const wv = getActiveWebview();
  if (wv) {
    wv.executeJavaScript(getClearHintsScript()).catch(() => {});
  }
};

// Scrolling methods
const scrollDown = (px = 120) => {
  const wv = getActiveWebview();
  if (wv) wv.executeJavaScript(`window.scrollBy({ top: ${px}, behavior: 'smooth' })`).catch(() => {});
};

const scrollUp = (px = 120) => {
  const wv = getActiveWebview();
  if (wv) wv.executeJavaScript(`window.scrollBy({ top: -${px}, behavior: 'smooth' })`).catch(() => {});
};

const scrollHalfDown = () => {
  const wv = getActiveWebview();
  if (wv) wv.executeJavaScript(`window.scrollBy({ top: window.innerHeight * 0.5, behavior: 'smooth' })`).catch(() => {});
};

const scrollHalfUp = () => {
  const wv = getActiveWebview();
  if (wv) wv.executeJavaScript(`window.scrollBy({ top: -window.innerHeight * 0.5, behavior: 'smooth' })`).catch(() => {});
};

const scrollToTop = () => {
  const wv = getActiveWebview();
  if (wv) wv.executeJavaScript(`window.scrollTo({ top: 0, behavior: 'smooth' })`).catch(() => {});
};

const scrollToBottom = () => {
  const wv = getActiveWebview();
  if (wv) wv.executeJavaScript(`window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })`).catch(() => {});
};

// Zoom methods
const zoomIn = () => {
  const wv = getActiveWebview();
  if (wv) {
    wv.getZoomFactor((factor) => {
      const newFactor = Math.min(3.0, factor + 0.1);
      wv.setZoomFactor(newFactor);
      emit('update-tab', { id: props.activeTabId, patch: { zoomFactor: newFactor } });
    });
  }
};

const zoomOut = () => {
  const wv = getActiveWebview();
  if (wv) {
    wv.getZoomFactor((factor) => {
      const newFactor = Math.max(0.5, factor - 0.1);
      wv.setZoomFactor(newFactor);
      emit('update-tab', { id: props.activeTabId, patch: { zoomFactor: newFactor } });
    });
  }
};

const resetZoom = () => {
  const wv = getActiveWebview();
  if (wv) {
    wv.setZoomFactor(1.0);
    emit('update-tab', { id: props.activeTabId, patch: { zoomFactor: 1.0 } });
  }
};

const focusFirstInput = () => {
  const wv = getActiveWebview();
  if (wv) {
    wv.send('host-message', { type: 'FOCUS_FIRST_INPUT' });
  }
};

const reload = (hard = false) => {
  const wv = getActiveWebview();
  if (wv) {
    if (hard) wv.reloadIgnoringCache();
    else wv.reload();
  }
};

const goBack = () => {
  const wv = getActiveWebview();
  if (wv && wv.canGoBack()) wv.goBack();
};

const goForward = () => {
  const wv = getActiveWebview();
  if (wv && wv.canGoForward()) wv.goForward();
};

// Find in page methods
const findInPage = (text, options = {}) => {
  const wv = getActiveWebview();
  if (wv && text) {
    return wv.findInPage(text, options);
  }
};

const stopFindInPage = (action = 'clearSelection') => {
  const wv = getActiveWebview();
  if (wv) {
    wv.stopFindInPage(action);
  }
};

defineExpose({
  startHintMode,
  filterHints,
  activateHint,
  clearHints,
  scrollDown,
  scrollUp,
  scrollHalfDown,
  scrollHalfUp,
  scrollToTop,
  scrollToBottom,
  zoomIn,
  zoomOut,
  resetZoom,
  focusFirstInput,
  reload,
  goBack,
  goForward,
  findInPage,
  stopFindInPage,
  getActiveWebview,
  navigateTo: navigateActiveTab
});
</script>

<style scoped>
.browser-webview-container {
  flex: 1;
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #090c12;
}

.tab-viewport {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  display: none;
}

.tab-viewport.is-active {
  display: block;
}

.webview-frame {
  width: 100%;
  height: 100%;
  border: none;
  background: #ffffff;
}

.iframe-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.web-preview-notice {
  background: #111624;
  border-bottom: 1px solid #1c2538;
  padding: 6px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
}

.notice-badge {
  background: #3b82f6;
  color: #0b1c3d;
  font-weight: 800;
  font-size: 9.5px;
  padding: 2px 6px;
  border-radius: 3px;
}

.notice-text {
  color: #94a3b8;
}

.notice-url {
  color: #38bdf8;
  margin-left: auto;
}

.iframe-view {
  flex: 1;
  width: 100%;
  border: none;
  background: #ffffff;
}
</style>
