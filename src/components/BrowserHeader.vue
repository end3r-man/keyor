<template>
  <header class="browser-header">
    <!-- Window Drag Region & Brand -->
    <div class="header-left">
      <div class="brand-pill" title="Keyor - Vim Browser">
        <span class="vim-logo">V</span>
        <span class="brand-text">KEYOR</span>
      </div>

      <!-- Quick Nav Controls -->
      <div class="nav-controls non-draggable">
        <button
          class="nav-btn"
          :disabled="!activeTab?.canGoBack"
          @click="$emit('nav-back')"
          title="Back (H)"
        >
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <button
          class="nav-btn"
          :disabled="!activeTab?.canGoForward"
          @click="$emit('nav-forward')"
          title="Forward (L)"
        >
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
        <button
          class="nav-btn"
          @click="$emit('nav-reload')"
          :title="activeTab?.isLoading ? 'Stop loading' : 'Reload (r)'"
        >
          <svg
            class="icon"
            :class="{ 'spin-icon': activeTab?.isLoading }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </button>
      </div>
    </div>

    <!-- Tabs Container -->
    <div class="tabs-container non-draggable">
      <div
        v-for="(tab, index) in tabs"
        :key="tab.id"
        class="tab-item"
        :class="{ active: tab.id === activeTabId }"
        @click="selectTab(tab.id)"
        :title="tab.title + ' (Jump: ' + (index + 1) + 'gt)'"
      >
        <span class="tab-index">{{ index + 1 }}</span>
        
        <span v-if="tab.isLoading" class="tab-spinner"></span>
        <span v-else class="tab-favicon">
          <span v-if="tab.url.startsWith('keyor://')">⚡</span>
          <img v-else-if="tab.favicon" :src="tab.favicon" class="favicon-img" alt="" />
          <svg v-else class="icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
        </span>

        <span class="tab-title">{{ tab.title || 'Untitled' }}</span>

        <button
          class="tab-close-btn"
          @click.stop="closeTab(tab.id)"
          title="Close tab (x or d)"
        >
          <svg class="icon-tiny" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- New Tab Button -->
      <button
        class="new-tab-btn"
        @click="$emit('new-tab')"
        title="New Tab (t)"
      >
        <svg class="icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    </div>

    <!-- Header Right Controls -->
    <div class="header-right non-draggable">
      <!-- Quick Omnibar Trigger -->
      <button
        class="header-action-btn"
        @click="$emit('open-omnibar')"
        title="Open URL or Search (o)"
      >
        <svg class="icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <span class="btn-kbd">o</span>
      </button>

      <!-- Cheatsheet Trigger -->
      <button
        class="header-action-btn"
        @click="$emit('open-help')"
        title="Vim Cheatsheet (?)"
      >
        <svg class="icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <span class="btn-kbd">?</span>
      </button>

      <!-- Window Controls -->
      <div class="window-controls">
        <button class="win-btn minimize" @click="handleWindowAction('minimize')" title="Minimize">
          <svg viewBox="0 0 12 12" width="10" height="10">
            <line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" stroke-width="1.5" />
          </svg>
        </button>
        <button class="win-btn maximize" @click="handleWindowAction('maximize')" title="Maximize">
          <svg viewBox="0 0 12 12" width="10" height="10">
            <rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.5" />
          </svg>
        </button>
        <button class="win-btn close" @click="handleWindowAction('close')" title="Close">
          <svg viewBox="0 0 12 12" width="10" height="10">
            <line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="1.5" />
            <line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="1.5" />
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { useTabs } from '../composables/useTabs';

const props = defineProps({
  tabs: {
    type: Array,
    required: true
  },
  activeTabId: {
    type: String,
    required: true
  },
  activeTab: {
    type: Object,
    default: null
  }
});

const emit = defineEmits([
  'select-tab',
  'close-tab',
  'new-tab',
  'nav-back',
  'nav-forward',
  'nav-reload',
  'open-omnibar',
  'open-help'
]);

const selectTab = (id) => {
  emit('select-tab', id);
};

const closeTab = (id) => {
  emit('close-tab', id);
};

const handleWindowAction = (action) => {
  if (window.electronAPI && window.electronAPI.windowAction) {
    window.electronAPI.windowAction(action);
  }
};
</script>

<style scoped>
.browser-header {
  height: 38px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  user-select: none;
  -webkit-app-region: drag;
  padding: 0 8px 0 12px;
  gap: 10px;
  z-index: 100;
}

.non-draggable {
  -webkit-app-region: no-drag;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.brand-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 6px;
  border-radius: 4px;
}

.vim-logo {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 12px;
  color: var(--accent-vim);
}

.brand-text {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.8px;
  color: #717885;
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: 1px;
}

.nav-btn {
  background: transparent;
  border: none;
  color: #717885;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.nav-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
}

.nav-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.icon {
  width: 14px;
  height: 14px;
}

.icon-small {
  width: 13px;
  height: 13px;
}

.icon-tiny {
  width: 10px;
  height: 10px;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}

.tabs-container {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 3px;
  overflow-x: auto;
  overflow-y: hidden;
  height: 100%;
}

.tabs-container::-webkit-scrollbar {
  display: none;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 6px 0 8px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  max-width: 180px;
  min-width: 90px;
  cursor: pointer;
  transition: all 0.12s ease;
  position: relative;
}

.tab-item:hover {
  background: rgba(255, 255, 255, 0.03);
}

.tab-item.active {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
}

.tab-index {
  font-family: var(--font-mono);
  font-size: 9.5px;
  color: #4b5262;
}

.tab-item.active .tab-index {
  color: #60a5fa;
}

.tab-favicon {
  display: flex;
  align-items: center;
  font-size: 11px;
}

.favicon-img {
  width: 13px;
  height: 13px;
  border-radius: 2px;
}

.tab-spinner {
  width: 11px;
  height: 11px;
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  border-top-color: #38bdf8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.tab-title {
  flex: 1;
  font-size: 11.5px;
  color: #8c93a0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-item.active .tab-title {
  color: #f1f3f7;
  font-weight: 500;
}

.tab-close-btn {
  background: transparent;
  border: none;
  color: #555c6b;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: all 0.12s ease;
}

.tab-close-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.new-tab-btn {
  background: transparent;
  border: 1px solid transparent;
  color: #717885;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.new-tab-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-action-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.07);
  color: #8c93a0;
  height: 24px;
  padding: 0 7px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.15s ease;
}

.header-action-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.btn-kbd {
  font-family: var(--font-mono);
  font-size: 9.5px;
  background: rgba(255, 255, 255, 0.06);
  padding: 1px 4px;
  border-radius: 2px;
  color: #10b981;
}

.window-controls {
  display: flex;
  align-items: center;
  margin-left: 2px;
}

.win-btn {
  background: transparent;
  border: none;
  color: #717885;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.win-btn:hover {
  background: rgba(255, 255, 255, 0.07);
  color: #ffffff;
}

.win-btn.close:hover {
  background: #dc2626;
  color: #ffffff;
}
</style>
