<template>
  <footer class="browser-statusline" :class="`mode-${mode.toLowerCase()}`">
    <!-- Mode Indicator Block (Vim Powerline style) -->
    <div class="status-section left-section">
      <div class="mode-badge" :class="`badge-${mode.toLowerCase()}`">
        <span class="mode-text">{{ modeText }}</span>
      </div>

      <!-- Security / SSL Badge -->
      <div class="security-badge" :title="securityTitle">
        <svg v-if="isSecure" class="status-icon secure" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        <svg v-else-if="isInternal" class="status-icon internal" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
        <svg v-else class="status-icon insecure" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>

      <!-- Active URL / Title -->
      <div class="url-display" :title="activeTab?.url" @click="$emit('open-omnibar')">
        <span class="url-text">{{ displayUrl }}</span>
      </div>
    </div>

    <!-- Center Section: Toast Notification -->
    <div class="status-section center-section">
      <transition name="toast-fade">
        <div v-if="toastMessage" class="status-toast">
          <span class="toast-indicator">●</span>
          <span class="toast-content">{{ toastMessage }}</span>
        </div>
      </transition>
    </div>

    <!-- Right Section: Vim stats & state -->
    <div class="status-section right-section">
      <!-- Key Sequence Buffer (e.g. pending 'g' or 'y') -->
      <div v-if="keyBuffer || hintBuffer" class="key-buffer-badge">
        <span class="key-buffer-label">{{ hintBuffer ? 'hint:' : 'cmd:' }}</span>
        <span class="key-buffer-val">{{ hintBuffer || keyBuffer }}</span>
      </div>

      <!-- Audio playing indicator -->
      <div v-if="activeTab?.isAudioPlaying" class="status-stat audio-stat" title="Audio playing">
        <Volume2 class="status-icon" />
      </div>

      <!-- Zoom factor -->
      <div class="status-stat" title="Zoom level (zi: zoom in, zo: zoom out, zz: reset)">
        <span class="stat-label">zoom:</span>
        <span class="stat-value">{{ Math.round((activeTab?.zoomFactor || 1) * 100) }}%</span>
      </div>

      <!-- Tabs / Buffer count -->
      <div class="status-stat" title="Current tab (b: buffer switcher)">
        <span class="stat-label">buf:</span>
        <span class="stat-value">{{ activeIndex + 1 }}/{{ totalTabs }}</span>
      </div>

      <!-- Scroll Position -->
      <div class="status-stat scroll-stat" title="Page scroll (j/k: scroll, gg/G: top/bottom)">
        <span class="stat-value">{{ scrollText }}</span>
      </div>

      <!-- Downloads status indicator -->
      <div
        v-if="activeDownloadsCount > 0"
        class="status-stat dl-indicator-active"
        @click="$emit('open-downloads')"
        :title="`Active downloads: ${activeDownloadsCount} (${overallProgress}%) • Click or press D to open`"
      >
        <Download class="dl-anim-icon" :size="11" />
        <span class="stat-value">{{ overallProgress }}%</span>
        <span v-if="activeSpeed > 0" class="dl-speed-badge">{{ formatSpeed(activeSpeed) }}</span>
      </div>
      <button
        v-else
        class="help-btn dl-btn"
        @click="$emit('open-downloads')"
        title="Downloads Manager (D / :dl)"
      >
        <Download :size="11" />
      </button>

      <!-- Vim Help hint -->
      <button class="help-btn" @click="$emit('open-help')" title="Vim Cheatsheet (?)">
        ?
      </button>
    </div>
  </footer>
</template>

<script setup>
import { computed } from 'vue';
import { Volume2, Download } from '@lucide/vue';
import { useDownloads } from '../composables/useDownloads';

const props = defineProps({
  mode: {
    type: String,
    default: 'NORMAL'
  },
  activeTab: {
    type: Object,
    default: null
  },
  activeIndex: {
    type: Number,
    default: 0
  },
  totalTabs: {
    type: Number,
    default: 1
  },
  keyBuffer: {
    type: String,
    default: ''
  },
  hintBuffer: {
    type: String,
    default: ''
  },
  toastMessage: {
    type: String,
    default: ''
  }
});

defineEmits(['open-omnibar', 'open-help', 'open-downloads']);

const {
  activeDownloadsCount,
  overallProgress,
  activeSpeed,
  formatSpeed
} = useDownloads();

const modeText = computed(() => {
  switch (props.mode) {
    case 'NORMAL':
      return 'NORMAL';
    case 'INSERT':
      return 'INSERT';
    case 'HINT':
      return 'HINT';
    case 'COMMAND':
      return 'COMMAND';
    case 'FIND':
      return 'FIND';
    case 'OMNIBAR':
      return 'OPEN';
    default:
      return props.mode;
  }
});

const isInternal = computed(() => {
  const url = props.activeTab?.url || '';
  return url.startsWith('keyor://') || url.startsWith('about:');
});

const isSecure = computed(() => {
  const url = props.activeTab?.url || '';
  return url.startsWith('https://');
});

const securityTitle = computed(() => {
  if (isInternal.value) return 'Internal System Page';
  if (isSecure.value) return 'Secure Connection (HTTPS)';
  return 'Not Secure (HTTP)';
});

const displayUrl = computed(() => {
  const url = props.activeTab?.url || '';
  if (url === 'keyor://start') return 'keyor://start — Vim Dashboard';
  return url;
});

const scrollText = computed(() => {
  const pct = props.activeTab?.scrollPercent;
  if (pct === undefined || pct === null) return '--';
  if (pct <= 0) return 'Top';
  if (pct >= 99) return 'Bot';
  return `${pct}%`;
});
</script>

<style scoped>
.browser-statusline {
  height: 24px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  font-family: var(--font-mono);
  font-size: 11px;
  user-select: none;
  z-index: 100;
}

.status-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.left-section {
  flex: 1;
  min-width: 0;
}

.mode-badge {
  padding: 1px 6px;
  border-radius: 3px;
  font-weight: 600;
  letter-spacing: 0.5px;
  font-size: 9.5px;
  text-transform: uppercase;
}

.badge-normal {
  background: rgba(16, 185, 129, 0.12);
  color: var(--accent-vim);
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.badge-insert {
  background: rgba(6, 182, 212, 0.12);
  color: var(--accent-cyan);
  border: 1px solid rgba(6, 182, 212, 0.2);
}

.badge-hint {
  background: rgba(245, 158, 11, 0.12);
  color: var(--accent-amber);
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.badge-command {
  background: rgba(168, 85, 247, 0.12);
  color: var(--accent-purple);
  border: 1px solid rgba(168, 85, 247, 0.2);
}

.badge-find {
  background: rgba(244, 63, 94, 0.12);
  color: var(--accent-rose);
  border: 1px solid rgba(244, 63, 94, 0.2);
}

.badge-omnibar {
  background: rgba(99, 102, 241, 0.12);
  color: var(--accent-blue);
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.security-badge {
  display: flex;
  align-items: center;
}

.status-icon {
  width: 11px;
  height: 11px;
}

.status-icon.secure {
  color: #10b981;
}

.status-icon.internal {
  color: #38bdf8;
}

.status-icon.insecure {
  color: #ef4444;
}

.url-display {
  color: #717885;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  padding: 1px 4px;
  border-radius: 3px;
  transition: all 0.12s ease;
}

.url-display:hover {
  color: #f1f3f7;
}

.url-text {
  font-size: 11px;
}

.center-section {
  display: flex;
  justify-content: center;
}

.status-toast {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.06);
  color: #38bdf8;
  padding: 1px 8px;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 10px;
  font-weight: 500;
}

.toast-indicator {
  color: #10b981;
  font-size: 7px;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.15s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(2px);
}

.right-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.key-buffer-badge {
  background: rgba(168, 85, 247, 0.1);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.2);
  padding: 0 4px;
  border-radius: 2px;
  display: flex;
  gap: 3px;
  font-size: 9.5px;
  font-weight: 600;
}

.key-buffer-label {
  opacity: 0.6;
}

.status-stat {
  display: flex;
  align-items: center;
  gap: 3px;
  color: #555b68;
  font-size: 10px;
}

.stat-label {
  color: #555b68;
}

.stat-value {
  color: #8c93a0;
  font-weight: 500;
}

.scroll-stat {
  min-width: 28px;
  text-align: right;
  justify-content: flex-end;
}

.help-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #717885;
  width: 15px;
  height: 15px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.12s ease;
}

.help-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.dl-indicator-active {
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.25);
  color: var(--accent-blue);
  padding: 1px 5px;
  border-radius: 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 9.5px;
  font-weight: 600;
  transition: all 0.12s ease;
}

.dl-indicator-active:hover {
  background: rgba(59, 130, 246, 0.2);
}

.dl-anim-icon {
  animation: bounce 1.2s infinite ease-in-out;
  display: inline-block;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}

.dl-speed-badge {
  color: var(--accent-cyan);
  font-size: 8.5px;
  opacity: 0.9;
}

.dl-btn {
  font-size: 8.5px;
}
</style>
