<template>
  <div class="browser-webview-container" ref="containerEl">
    <!-- Internal Start Page -->
    <div
      v-if="activeTab?.url?.startsWith('keyor://start')"
      class="tab-viewport is-active"
    >
      <NewTabPage
        :bookmarks="bookmarks"
        :history="history"
        @navigate="navigateActiveTab"
        @open-omnibar="$emit('open-omnibar')"
        @open-help="$emit('open-help')"
      />
    </div>

    <!-- Web / Non-Electron Fallback (iframe with info banner when not in Electron) -->
    <div v-else-if="!isElectron" class="iframe-container">
      <div class="web-preview-notice">
        <span class="notice-badge">WEB PREVIEW</span>
        <span class="notice-text">In desktop Electron mode, native WebContentsView renders directly via Chromium views.</span>
        <span class="notice-url">{{ activeTab?.url }}</span>
      </div>
      <iframe
        :src="activeTab?.url"
        class="iframe-view"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      ></iframe>
    </div>

    <!-- When inside Electron, the native WebContentsView is mounted directly into the window by Electron -->
    <div v-else class="native-view-anchor" title="WebContentsView active"></div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
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

const containerEl = ref(null);
const isElectron = ref(false);
let resizeObserver = null;

const activeTab = computed(() => {
  return props.tabs.find((t) => t.id === props.activeTabId) || props.tabs[0];
});

// Sync bounds to Electron
const syncViewportBounds = () => {
  if (!isElectron.value || !containerEl.value || !window.electronAPI?.tabViewSetBounds) return;
  const rect = containerEl.value.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    window.electronAPI.tabViewSetBounds({
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    });
  }
};

// Lifecycle listeners
let unbindTabUpdate = null;
let unbindTabVimKey = null;
let unbindTabModeChange = null;
let unbindTabFoundInPage = null;
let unbindTabHistory = null;

onMounted(() => {
  if (window.electronAPI) {
    isElectron.value = true;

    // Listen to native WebContentsView events forwarded from Electron
    if (window.electronAPI.onTabUpdate) {
      unbindTabUpdate = window.electronAPI.onTabUpdate((data) => {
        emit('update-tab', data);
      });
    }

    if (window.electronAPI.onTabVimKey) {
      unbindTabVimKey = window.electronAPI.onTabVimKey((data) => {
        emit('vim-key', data);
      });
    }

    if (window.electronAPI.onTabModeChange) {
      unbindTabModeChange = window.electronAPI.onTabModeChange((mode) => {
        emit('mode-change', mode);
      });
    }

    if (window.electronAPI.onTabFoundInPage) {
      unbindTabFoundInPage = window.electronAPI.onTabFoundInPage((data) => {
        emit('found-in-page', {
          activeMatchOrdinal: data.activeMatchOrdinal,
          matches: data.matches,
          finalUpdate: data.finalUpdate
        });
      });
    }

    if (window.electronAPI.onTabHistory) {
      unbindTabHistory = window.electronAPI.onTabHistory((data) => {
        emit('add-history', data);
      });
    }

    // Set up ResizeObserver to automatically notify Electron of viewport bounds
    if (containerEl.value && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        syncViewportBounds();
      });
      resizeObserver.observe(containerEl.value);
    }

    nextTick(() => {
      syncViewportBounds();
      // Initialize active tab view
      if (activeTab.value) {
        window.electronAPI.tabViewSwitch(activeTab.value.id, activeTab.value.url);
      }
    });
  }
});

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect();
  if (unbindTabUpdate) unbindTabUpdate();
  if (unbindTabVimKey) unbindTabVimKey();
  if (unbindTabModeChange) unbindTabModeChange();
  if (unbindTabFoundInPage) unbindTabFoundInPage();
  if (unbindTabHistory) unbindTabHistory();
});

// Watch for active tab switch
watch(
  () => props.activeTabId,
  (newId) => {
    if (isElectron.value && window.electronAPI?.tabViewSwitch) {
      const tab = props.tabs.find((t) => t.id === newId);
      if (tab) {
        window.electronAPI.tabViewSwitch(tab.id, tab.url);
      }
    }
  }
);

// Watch for tab list changes to clean up closed tabs
watch(
  () => props.tabs.map((t) => t.id),
  (newIds, oldIds) => {
    if (!isElectron.value || !oldIds) return;
    const closedIds = oldIds.filter((id) => !newIds.includes(id));
    closedIds.forEach((id) => {
      window.electronAPI?.tabViewClose(id);
    });
  }
);

const navigateActiveTab = (url) => {
  emit('update-tab', { id: props.activeTabId, patch: { url, isLoading: !url.startsWith('keyor://') } });
  if (isElectron.value && window.electronAPI?.tabViewNavigate) {
    window.electronAPI.tabViewNavigate(props.activeTabId, url);
  }
};

// Hint Mode Methods via WebContentsView executeJavaScript
const startHintMode = async (openInNewTab = false) => {
  if (!isElectron.value || !window.electronAPI?.tabViewExecuteScript) return { count: 0, codes: [] };
  const hintCodes = generateHintCodes(80);
  try {
    const res = await window.electronAPI.tabViewExecuteScript(getInjectHintsScript(hintCodes));
    return res || { count: 0, codes: [] };
  } catch (e) {
    console.error('Failed to inject hints:', e);
    return { count: 0, codes: [] };
  }
};

const filterHints = (prefix) => {
  if (isElectron.value && window.electronAPI?.tabViewExecuteScript) {
    window.electronAPI.tabViewExecuteScript(getFilterHintsScript(prefix)).catch(() => {});
  }
};

const activateHint = async (code, openInNewTab = false) => {
  if (!isElectron.value || !window.electronAPI?.tabViewExecuteScript) return { success: false };
  try {
    return await window.electronAPI.tabViewExecuteScript(getActivateHintScript(code, openInNewTab));
  } catch (e) {
    console.error('Failed to activate hint:', e);
    return { success: false };
  }
};

const clearHints = () => {
  if (isElectron.value && window.electronAPI?.tabViewExecuteScript) {
    window.electronAPI.tabViewExecuteScript(getClearHintsScript()).catch(() => {});
  }
};

// Scrolling methods via native WebContentsView
const scrollDown = (px = 120) => {
  if (isElectron.value && window.electronAPI?.tabViewScrollBy) {
    window.electronAPI.tabViewScrollBy(px, 0, true);
  }
};

const scrollUp = (px = 120) => {
  if (isElectron.value && window.electronAPI?.tabViewScrollBy) {
    window.electronAPI.tabViewScrollBy(-px, 0, true);
  }
};

const scrollHalfDown = () => {
  if (isElectron.value && window.electronAPI?.tabViewScrollBy) {
    window.electronAPI.tabViewScrollBy(Math.round(window.innerHeight * 0.5), 0, true);
  }
};

const scrollHalfUp = () => {
  if (isElectron.value && window.electronAPI?.tabViewScrollBy) {
    window.electronAPI.tabViewScrollBy(-Math.round(window.innerHeight * 0.5), 0, true);
  }
};

const scrollToTop = () => {
  if (isElectron.value && window.electronAPI?.tabViewScrollTo) {
    window.electronAPI.tabViewScrollTo(0, 0, true);
  }
};

const scrollToBottom = () => {
  if (isElectron.value && window.electronAPI?.tabViewExecuteScript) {
    window.electronAPI.tabViewExecuteScript('window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })').catch(() => {});
  }
};

// Zoom methods
const zoomIn = async () => {
  if (isElectron.value && window.electronAPI?.tabViewSetZoom && window.electronAPI?.tabViewGetZoom) {
    const factor = await window.electronAPI.tabViewGetZoom();
    const newFactor = Math.min(3.0, factor + 0.1);
    await window.electronAPI.tabViewSetZoom(newFactor);
    emit('update-tab', { id: props.activeTabId, patch: { zoomFactor: newFactor } });
  }
};

const zoomOut = async () => {
  if (isElectron.value && window.electronAPI?.tabViewSetZoom && window.electronAPI?.tabViewGetZoom) {
    const factor = await window.electronAPI.tabViewGetZoom();
    const newFactor = Math.max(0.5, factor - 0.1);
    await window.electronAPI.tabViewSetZoom(newFactor);
    emit('update-tab', { id: props.activeTabId, patch: { zoomFactor: newFactor } });
  }
};

const resetZoom = async () => {
  if (isElectron.value && window.electronAPI?.tabViewSetZoom) {
    await window.electronAPI.tabViewSetZoom(1.0);
    emit('update-tab', { id: props.activeTabId, patch: { zoomFactor: 1.0 } });
  }
};

const focusFirstInput = () => {
  if (isElectron.value && window.electronAPI?.tabViewFocusFirstInput) {
    window.electronAPI.tabViewFocusFirstInput();
  }
};

const reload = (hard = false) => {
  if (isElectron.value && window.electronAPI?.tabViewReload) {
    window.electronAPI.tabViewReload(hard);
  }
};

const goBack = () => {
  if (isElectron.value && window.electronAPI?.tabViewGoBack) {
    window.electronAPI.tabViewGoBack();
  }
};

const goForward = () => {
  if (isElectron.value && window.electronAPI?.tabViewGoForward) {
    window.electronAPI.tabViewGoForward();
  }
};

// Find in page methods
const findInPage = (text, options = {}) => {
  if (isElectron.value && window.electronAPI?.tabViewFind) {
    return window.electronAPI.tabViewFind(text, options);
  }
};

const stopFindInPage = (action = 'clearSelection') => {
  if (isElectron.value && window.electronAPI?.tabViewStopFind) {
    window.electronAPI.tabViewStopFind(action);
  }
};

const blurActiveWebview = () => {
  if (isElectron.value && window.electronAPI?.tabViewBlur) {
    window.electronAPI.tabViewBlur();
  }
};

const sendModeToWebview = (mode) => {
  if (isElectron.value && window.electronAPI?.tabViewSetMode) {
    window.electronAPI.tabViewSetMode(mode);
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
  blurActiveWebview,
  sendModeToWebview,
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

.native-view-anchor {
  width: 100%;
  height: 100%;
  background: transparent;
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
