<template>
  <div class="new-tab-page">
    <div class="new-tab-container">
      <!-- Clock & Date -->
      <div class="hero-section">
        <div class="clock-display">{{ timeString }}</div>
        <div class="date-display">{{ dateString }}</div>
        
        <div class="search-trigger-box" @click="$emit('open-omnibar')">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span class="search-placeholder">Press <kbd>o</kbd> to enter URL or search...</span>
          <span class="search-hint"><kbd>:</kbd> for commands</span>
        </div>
      </div>

      <!-- Quick Dial Bookmarks -->
      <div class="section-block">
        <h3 class="section-title">
          <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          Favorites & Speed Dial
        </h3>
        <div class="speed-dial-grid">
          <a
            v-for="(bm, idx) in bookmarks.slice(0, 8)"
            :key="bm.id"
            class="speed-dial-card"
            :href="bm.url"
            @click.prevent="$emit('navigate', bm.url)"
          >
            <div class="dial-icon-wrap">
              <span class="dial-icon"><DynamicIcon :name="bm.icon" fallback="Globe" :size="18" /></span>
              <span class="dial-num">{{ idx + 1 }}</span>
            </div>
            <div class="dial-info">
              <span class="dial-title">{{ bm.title }}</span>
              <span class="dial-domain">{{ formatDomain(bm.url) }}</span>
            </div>
          </a>
        </div>
      </div>

      <!-- Vim Keybinding Cheat Card -->
      <div class="section-block">
        <div class="section-header">
          <h3 class="section-title">
            <svg class="section-icon vim-color" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
              <line x1="6" y1="8" x2="6" y2="8"></line>
              <line x1="10" y1="8" x2="10" y2="8"></line>
              <line x1="14" y1="8" x2="14" y2="8"></line>
              <line x1="18" y1="8" x2="18" y2="8"></line>
              <line x1="6" y1="12" x2="6" y2="12"></line>
              <line x1="18" y1="12" x2="18" y2="12"></line>
              <line x1="7" y1="16" x2="17" y2="16"></line>
            </svg>
            Vim Navigation Cheat Sheet
          </h3>
          <button class="view-all-btn" @click="$emit('open-help')">
            Full Reference <kbd>?</kbd>
          </button>
        </div>

        <div class="cheatsheet-grid">
          <div class="cheat-category">
            <span class="cat-title">SCROLL & NAV</span>
            <div class="cheat-row"><kbd>j</kbd><kbd>k</kbd><span>Scroll down / up</span></div>
            <div class="cheat-row"><kbd>d</kbd><kbd>u</kbd><span>Scroll half page</span></div>
            <div class="cheat-row"><kbd>gg</kbd><kbd>G</kbd><span>Scroll to top / bottom</span></div>
            <div class="cheat-row"><kbd>H</kbd><kbd>L</kbd><span>History back / forward</span></div>
          </div>

          <div class="cheat-category">
            <span class="cat-title">TABS & BUFFERS</span>
            <div class="cheat-row"><kbd>t</kbd><span>New tab</span></div>
            <div class="cheat-row"><kbd>x</kbd> / <kbd>X</kbd><span>Close current tab</span></div>
            <div class="cheat-row"><kbd>J</kbd><kbd>K</kbd><span>Next / previous tab</span></div>
            <div class="cheat-row"><kbd>U</kbd><span>Restore closed tab</span></div>
          </div>

          <div class="cheat-category">
            <span class="cat-title">HINTS & LINKS</span>
            <div class="cheat-row"><kbd>f</kbd><span>Hint mode (open link)</span></div>
            <div class="cheat-row"><kbd>F</kbd><span>Hint mode (in new tab)</span></div>
            <div class="cheat-row"><kbd>gi</kbd><span>Focus first text input</span></div>
            <div class="cheat-row"><kbd>Esc</kbd><span>Return to Normal mode</span></div>
          </div>

          <div class="cheat-category">
            <span class="cat-title">ACTIONS & PROMPT</span>
            <div class="cheat-row"><kbd>o</kbd><kbd>O</kbd><span>Open URL (current/new)</span></div>
            <div class="cheat-row"><kbd>yy</kbd><span>Yank (copy) current URL</span></div>
            <div class="cheat-row"><kbd>/</kbd><span>Find in page</span></div>
            <div class="cheat-row"><kbd>:</kbd><span>Vim command prompt</span></div>
            <div class="cheat-row"><kbd>D</kbd><span>Downloads manager</span></div>
          </div>
        </div>
      </div>

      <!-- Recent History Quick Links -->
      <div v-if="history.length > 0" class="section-block">
        <h3 class="section-title">
          <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          Recently Visited
        </h3>
        <div class="history-list">
          <div
            v-for="item in history.slice(0, 5)"
            :key="item.id"
            class="history-row"
            @click="$emit('navigate', item.url)"
          >
            <span class="history-bullet">›</span>
            <span class="history-title">{{ item.title || item.url }}</span>
            <span class="history-url">{{ item.url }}</span>
            <span class="history-time">{{ formatTime(item.timestamp) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import DynamicIcon from './DynamicIcon.vue';

const props = defineProps({
  bookmarks: {
    type: Array,
    default: () => []
  },
  history: {
    type: Array,
    default: () => []
  }
});

defineEmits(['navigate', 'open-omnibar', 'open-help']);

const timeString = ref('');
const dateString = ref('');
let timer = null;

const updateClock = () => {
  const now = new Date();
  timeString.value = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  dateString.value = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
};

onMounted(() => {
  updateClock();
  timer = setInterval(updateClock, 1000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

const formatDomain = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch (e) {
    return url;
  }
};

const formatTime = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
</script>

<style scoped>
.new-tab-page {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background: #0a0b0e;
  color: #f1f3f7;
  display: flex;
  justify-content: center;
  padding: 36px 20px 50px;
}

.new-tab-page::-webkit-scrollbar {
  width: 4px;
}

.new-tab-page::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.new-tab-container {
  width: 100%;
  max-width: 780px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.hero-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  margin-top: 10px;
}

.clock-display {
  font-family: var(--font-mono);
  font-size: 50px;
  font-weight: 600;
  letter-spacing: -1.5px;
  color: #f1f3f7;
}

.date-display {
  font-size: 13px;
  font-weight: 400;
  color: #717885;
}

.search-trigger-box {
  margin-top: 14px;
  width: 100%;
  max-width: 520px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 9px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.search-trigger-box:hover {
  background: var(--bg-hover);
  border-color: var(--border-muted);
}

.search-icon {
  width: 15px;
  height: 15px;
  color: var(--accent-blue);
}

.search-placeholder {
  flex: 1;
  text-align: left;
  font-size: 12.5px;
  color: #717885;
}

.search-hint {
  font-size: 10.5px;
  color: #555b68;
}

.section-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.3px;
  color: #8c93a0;
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
}

.section-icon {
  width: 14px;
  height: 14px;
  color: #38bdf8;
}

.section-icon.vim-color {
  color: #10b981;
}

.view-all-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.07);
  color: #717885;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 10.5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.12s ease;
}

.view-all-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.speed-dial-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 8px;
}

.speed-dial-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  padding: 9px 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  transition: all 0.12s ease;
  cursor: pointer;
}

.speed-dial-card:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.12);
}

.dial-icon-wrap {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  font-size: 14px;
}

.dial-num {
  position: absolute;
  top: -3px;
  right: -3px;
  background: #0f1117;
  color: #555b68;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 0 3px;
  font-size: 8px;
  font-family: var(--font-mono);
}

.dial-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.dial-title {
  font-size: 12px;
  font-weight: 500;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dial-domain {
  font-size: 10.5px;
  color: #687080;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cheatsheet-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 8px;
}

.cheat-category {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.cat-title {
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.6px;
  color: #10b981;
  font-family: var(--font-mono);
}

.cheat-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #8c93a0;
}

.cheat-row kbd {
  min-width: 16px;
  text-align: center;
}

.history-list {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  overflow: hidden;
}

.history-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition: background 0.1s ease;
}

.history-row:last-child {
  border-bottom: none;
}

.history-row:hover {
  background: rgba(255, 255, 255, 0.04);
}

.history-bullet {
  color: #38bdf8;
  font-size: 11px;
}

.history-title {
  font-size: 11.5px;
  font-weight: 500;
  color: #cbd5e1;
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-url {
  flex: 1;
  font-size: 10.5px;
  color: #555b68;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-time {
  font-size: 10px;
  color: #555b68;
  font-family: var(--font-mono);
}
</style>
