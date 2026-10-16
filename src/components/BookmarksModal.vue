<template>
  <div class="bm-backdrop" @click.self="$emit('close')">
    <div class="bm-modal">
      <div class="bm-header">
        <div class="bm-tag">BOOKMARKS</div>
        <input
          ref="searchInput"
          v-model="query"
          class="bm-search-input"
          placeholder="Search bookmarks (type to filter, Enter to open)..."
          spellcheck="false"
          @keydown="handleKeydown"
        />
        <button class="bm-close-btn" @click="$emit('close')" title="Close (Esc)">
          <X :size="13" />
        </button>
      </div>

      <div class="bm-list">
        <div
          v-for="(bm, idx) in filteredBookmarks"
          :key="bm.id"
          class="bm-row"
          :class="{ active: idx === selectedIndex }"
          @click="selectBookmark(bm.url)"
          @mouseenter="selectedIndex = idx"
        >
          <span class="bm-icon"><DynamicIcon :name="bm.icon" fallback="Bookmark" :size="13" /></span>
          <div class="bm-info">
            <span class="bm-title">{{ bm.title }}</span>
            <span class="bm-url">{{ bm.url }}</span>
          </div>
          <button class="bm-del-btn" @click.stop="$emit('remove-bookmark', bm.id)" title="Delete bookmark">
            <X :size="11" />
          </button>
        </div>

        <div v-if="filteredBookmarks.length === 0" class="bm-empty">
          No bookmarks matching query.
        </div>
      </div>

      <div class="bm-footer">
        <span><kbd><CornerDownLeft :size="10" /></kbd> open &nbsp; <kbd>j/k</kbd> navigate &nbsp; <kbd>Esc</kbd> close</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { X, CornerDownLeft } from '@lucide/vue';
import DynamicIcon from './DynamicIcon.vue';

const props = defineProps({
  bookmarks: {
    type: Array,
    required: true
  }
});

const emit = defineEmits(['open-bookmark', 'remove-bookmark', 'close']);

const searchInput = ref(null);
const query = ref('');
const selectedIndex = ref(0);

onMounted(() => {
  nextTick(() => {
    searchInput.value?.focus();
  });
});

const filteredBookmarks = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return props.bookmarks;
  return props.bookmarks.filter(b => b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q));
});

const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    emit('close');
    return;
  }

  if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n')) {
    e.preventDefault();
    if (filteredBookmarks.value.length > 0) {
      selectedIndex.value = (selectedIndex.value + 1) % filteredBookmarks.value.length;
    }
    return;
  }

  if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p')) {
    e.preventDefault();
    if (filteredBookmarks.value.length > 0) {
      selectedIndex.value = (selectedIndex.value - 1 + filteredBookmarks.value.length) % filteredBookmarks.value.length;
    }
    return;
  }

  if (e.key === 'Enter') {
    e.preventDefault();
    const current = filteredBookmarks.value[selectedIndex.value];
    if (current) {
      selectBookmark(current.url);
    }
  }
};

const selectBookmark = (url) => {
  emit('open-bookmark', url);
  emit('close');
};
</script>

<style scoped>
.bm-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(5, 7, 10, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 14vh;
  z-index: 1000;
}

.bm-modal {
  width: 100%;
  max-width: 580px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
}

.bm-header {
  display: flex;
  align-items: center;
  padding: 9px 14px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  gap: 10px;
}

.bm-tag {
  background: rgba(245, 158, 11, 0.12);
  color: var(--accent-amber);
  font-family: var(--font-mono);
  font-weight: 500;
  font-size: 9.5px;
  padding: 1px 5px;
  border-radius: 3px;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.bm-search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #f1f3f7;
  font-family: var(--font-mono);
  font-size: 12.5px;
}

.bm-close-btn {
  background: transparent;
  border: none;
  color: #687080;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 13px;
}

.bm-close-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.bm-list {
  max-height: 320px;
  overflow-y: auto;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bm-list::-webkit-scrollbar {
  width: 4px;
}

.bm-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.bm-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s ease;
}

.bm-row:hover,
.bm-row.active {
  background: rgba(255, 255, 255, 0.05);
}

.bm-icon {
  font-size: 13px;
}

.bm-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.bm-title {
  font-size: 12px;
  font-weight: 500;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bm-url {
  font-size: 10.5px;
  font-family: var(--font-mono);
  color: #687080;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bm-del-btn {
  background: transparent;
  border: none;
  color: #555b68;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 2px;
  font-size: 10px;
}

.bm-del-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.bm-empty {
  padding: 24px;
  text-align: center;
  color: #687080;
  font-size: 12px;
}

.bm-footer {
  padding: 6px 14px;
  background: #0d0f14;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 10px;
  color: #687080;
  text-align: center;
}
</style>
