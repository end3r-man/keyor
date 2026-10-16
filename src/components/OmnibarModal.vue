<template>
  <div class="omnibar-backdrop" @click.self="close">
    <div class="omnibar-modal">
      <!-- Input Box -->
      <div class="omnibar-input-wrap">
        <div class="prompt-symbol">
          <span v-if="inNewTab" class="symbol-new-tab">NEW TAB ›</span>
          <span v-else class="symbol-normal">:open ›</span>
        </div>
        <input
          ref="inputEl"
          v-model="query"
          class="omnibar-input"
          placeholder="Enter URL or search query..."
          spellcheck="false"
          @keydown="handleKeydown"
        />
        <div class="omnibar-hints">
          <kbd><CornerDownLeft :size="10" /></kbd> open &nbsp;
          <kbd>j/k</kbd> select &nbsp;
          <kbd>Esc</kbd> cancel
        </div>
      </div>

      <!-- Suggestions & Results List -->
      <div v-if="suggestions.length > 0" class="suggestions-list">
        <div
          v-for="(item, idx) in suggestions"
          :key="idx"
          class="suggestion-item"
          :class="{ active: idx === selectedIndex }"
          @click="selectItem(item)"
          @mouseenter="selectedIndex = idx"
        >
          <div class="item-type-badge" :class="`badge-${item.type}`">
            {{ item.badge }}
          </div>

          <div class="item-details">
            <div class="item-title-row">
              <span class="item-title">{{ item.title }}</span>
            </div>
            <div class="item-url">{{ item.url }}</div>
          </div>

          <div class="item-action-hint">
            <kbd v-if="idx === selectedIndex">Enter</kbd>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { CornerDownLeft } from '@lucide/vue';

const props = defineProps({
  initialUrl: {
    type: String,
    default: ''
  },
  inNewTab: {
    type: Boolean,
    default: false
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

const emit = defineEmits(['submit', 'close']);

const inputEl = ref(null);
const query = ref('');
const selectedIndex = ref(0);

onMounted(() => {
  if (props.initialUrl && !props.initialUrl.startsWith('keyor://')) {
    query.value = props.initialUrl;
  }
  nextTick(() => {
    inputEl.value?.focus();
    inputEl.value?.select();
    setTimeout(() => {
      inputEl.value?.focus();
    }, 40);
  });
});

const isLikelyUrl = (text) => {
  if (!text) return false;
  const trimmed = text.trim();
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^localhost(:\d+)?/i.test(trimmed)) return true;
  if (/^(\d{1,3}\.){3}\d{1,3}(:\d+)?/.test(trimmed)) return true;
  if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(trimmed)) return true;
  return false;
};

const normalizeUrl = (text) => {
  const trimmed = text.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^localhost(:\d+)?/i.test(trimmed)) return `http://${trimmed}`;
  if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(trimmed)) return `https://${trimmed}`;
  return `https://duckduckgo.com/?q=${encodeURIComponent(trimmed)}`;
};

const suggestions = computed(() => {
  const q = query.value.trim().toLowerCase();
  const list = [];

  if (!q) {
    // Show top bookmarks
    props.bookmarks.slice(0, 5).forEach(b => {
      list.push({
        type: 'bookmark',
        badge: 'BOOKMARK',
        title: b.title,
        url: b.url,
        actionUrl: b.url
      });
    });
    return list;
  }

  // 1. Direct match: URL or Search engine
  if (isLikelyUrl(q)) {
    list.push({
      type: 'url',
      badge: 'NAVIGATE',
      title: `Go to ${normalizeUrl(q)}`,
      url: normalizeUrl(q),
      actionUrl: normalizeUrl(q)
    });
  } else {
    list.push({
      type: 'search',
      badge: 'SEARCH',
      title: `Search DuckDuckGo: "${query.value}"`,
      url: `https://duckduckgo.com/?q=${encodeURIComponent(query.value)}`,
      actionUrl: `https://duckduckgo.com/?q=${encodeURIComponent(query.value)}`
    });
  }

  // 2. Filter matching bookmarks
  props.bookmarks.forEach(b => {
    if (b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q)) {
      list.push({
        type: 'bookmark',
        badge: 'BOOKMARK',
        title: b.title,
        url: b.url,
        actionUrl: b.url
      });
    }
  });

  // 3. Filter matching history
  props.history.forEach(h => {
    if (list.length >= 12) return;
    if (h.title?.toLowerCase().includes(q) || h.url?.toLowerCase().includes(q)) {
      // Avoid duplicate url in suggestions
      if (!list.some(item => item.actionUrl === h.url)) {
        list.push({
          type: 'history',
          badge: 'HISTORY',
          title: h.title || h.url,
          url: h.url,
          actionUrl: h.url
        });
      }
    }
  });

  return list.slice(0, 10);
});

const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    close();
    return;
  }

  if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n')) {
    e.preventDefault();
    if (suggestions.value.length > 0) {
      selectedIndex.value = (selectedIndex.value + 1) % suggestions.value.length;
    }
    return;
  }

  if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p')) {
    e.preventDefault();
    if (suggestions.value.length > 0) {
      selectedIndex.value = (selectedIndex.value - 1 + suggestions.value.length) % suggestions.value.length;
    }
    return;
  }

  if (e.key === 'Tab') {
    e.preventDefault();
    const current = suggestions.value[selectedIndex.value];
    if (current) {
      query.value = current.actionUrl;
    }
    return;
  }

  if (e.key === 'Enter') {
    e.preventDefault();
    submit();
  }
};

const selectItem = (item) => {
  emit('submit', { url: item.actionUrl, inNewTab: props.inNewTab });
};

const submit = () => {
  if (suggestions.value.length > 0 && selectedIndex.value < suggestions.value.length) {
    const item = suggestions.value[selectedIndex.value];
    emit('submit', { url: item.actionUrl, inNewTab: props.inNewTab });
    return;
  }

  const raw = query.value.trim();
  if (raw) {
    emit('submit', { url: normalizeUrl(raw), inNewTab: props.inNewTab });
  } else {
    close();
  }
};

const close = () => {
  emit('close');
};
</script>

<style scoped>
.omnibar-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(5, 7, 10, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 14vh;
  z-index: 1000;
  animation: fadeIn 0.1s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.omnibar-modal {
  width: 100%;
  max-width: 620px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
}

.omnibar-input-wrap {
  display: flex;
  align-items: center;
  padding: 9px 14px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  gap: 10px;
}

.prompt-symbol {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.symbol-normal {
  color: var(--accent-vim);
}

.symbol-new-tab {
  color: var(--accent-blue);
}

.omnibar-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #f1f3f7;
  font-family: var(--font-mono);
  font-size: 13px;
}

.omnibar-input::placeholder {
  color: #555b68;
}

.omnibar-hints {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #687080;
  font-size: 10px;
}

.suggestions-list {
  max-height: 340px;
  overflow-y: auto;
  padding: 5px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.suggestions-list::-webkit-scrollbar {
  width: 4px;
}

.suggestions-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s ease;
}

.suggestion-item:hover,
.suggestion-item.active {
  background: rgba(255, 255, 255, 0.05);
}

.item-type-badge {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  padding: 1px 5px;
  border-radius: 3px;
  letter-spacing: 0.4px;
}

.badge-url {
  background: rgba(59, 130, 246, 0.12);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.badge-search {
  background: rgba(16, 185, 129, 0.12);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.badge-bookmark {
  background: rgba(245, 158, 11, 0.12);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.badge-history {
  background: rgba(168, 85, 247, 0.12);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.2);
}

.item-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.item-title {
  font-size: 12px;
  font-weight: 500;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-url {
  font-size: 10.5px;
  font-family: var(--font-mono);
  color: #687080;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-action-hint {
  font-size: 10px;
  color: #8c93a0;
}
</style>
