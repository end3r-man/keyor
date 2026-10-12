<template>
  <div class="buffer-backdrop" @click.self="$emit('close')">
    <div class="buffer-modal">
      <div class="buffer-header">
        <span class="buffer-tag">BUFFER LIST</span>
        <input
          ref="filterInput"
          v-model="query"
          class="buffer-filter-input"
          placeholder="Filter tabs (type or use j/k to select)..."
          spellcheck="false"
          @keydown="handleKeydown"
        />
      </div>

      <div class="buffer-list">
        <div
          v-for="(tab, idx) in filteredTabs"
          :key="tab.id"
          class="buffer-row"
          :class="{ active: idx === selectedIndex, current: tab.id === activeTabId }"
          @click="selectTab(tab.id)"
          @mouseenter="selectedIndex = idx"
        >
          <span class="buf-num">{{ tab.originalIndex + 1 }}</span>
          <span class="buf-icon">{{ tab.url.startsWith('keyor://') ? '⚡' : '🌐' }}</span>
          <div class="buf-info">
            <span class="buf-title">{{ tab.title }}</span>
            <span class="buf-url">{{ tab.url }}</span>
          </div>
          <span v-if="tab.id === activeTabId" class="buf-badge">ACTIVE</span>
          <button class="buf-close" @click.stop="$emit('close-tab', tab.id)" title="Close tab (x)">✕</button>
        </div>
      </div>

      <div class="buffer-footer">
        <span><kbd>↵</kbd> switch &nbsp; <kbd>j/k</kbd> navigate &nbsp; <kbd>d</kbd> close &nbsp; <kbd>Esc</kbd> cancel</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';

const props = defineProps({
  tabs: {
    type: Array,
    required: true
  },
  activeTabId: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['select-tab', 'close-tab', 'close']);

const filterInput = ref(null);
const query = ref('');
const selectedIndex = ref(0);

onMounted(() => {
  nextTick(() => {
    filterInput.value?.focus();
  });
});

const filteredTabs = computed(() => {
  const q = query.value.trim().toLowerCase();
  const mapped = props.tabs.map((t, idx) => ({ ...t, originalIndex: idx }));
  if (!q) return mapped;
  return mapped.filter(t => t.title.toLowerCase().includes(q) || t.url.toLowerCase().includes(q));
});

const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    emit('close');
    return;
  }

  if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n')) {
    e.preventDefault();
    if (filteredTabs.value.length > 0) {
      selectedIndex.value = (selectedIndex.value + 1) % filteredTabs.value.length;
    }
    return;
  }

  if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p')) {
    e.preventDefault();
    if (filteredTabs.value.length > 0) {
      selectedIndex.value = (selectedIndex.value - 1 + filteredTabs.value.length) % filteredTabs.value.length;
    }
    return;
  }

  if (e.key === 'Enter') {
    e.preventDefault();
    const current = filteredTabs.value[selectedIndex.value];
    if (current) {
      selectTab(current.id);
    }
  }
};

const selectTab = (id) => {
  emit('select-tab', id);
  emit('close');
};
</script>

<style scoped>
.buffer-backdrop {
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

.buffer-modal {
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

.buffer-header {
  display: flex;
  align-items: center;
  padding: 9px 14px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  gap: 10px;
}

.buffer-tag {
  background: rgba(59, 130, 246, 0.12);
  color: #60a5fa;
  font-family: var(--font-mono);
  font-weight: 500;
  font-size: 9.5px;
  padding: 1px 5px;
  border-radius: 3px;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.buffer-filter-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #f1f3f7;
  font-family: var(--font-mono);
  font-size: 12.5px;
}

.buffer-list {
  max-height: 320px;
  overflow-y: auto;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.buffer-list::-webkit-scrollbar {
  width: 4px;
}

.buffer-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.buffer-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s ease;
}

.buffer-row:hover,
.buffer-row.active {
  background: rgba(255, 255, 255, 0.05);
}

.buf-num {
  font-family: var(--font-mono);
  font-size: 11px;
  color: #555b68;
  min-width: 14px;
}

.buf-icon {
  font-size: 12px;
}

.buf-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.buf-title {
  font-size: 12px;
  font-weight: 500;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.buf-url {
  font-size: 10.5px;
  font-family: var(--font-mono);
  color: #687080;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.buf-badge {
  background: rgba(59, 130, 246, 0.12);
  color: #60a5fa;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  padding: 1px 4px;
  border-radius: 2px;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.buf-close {
  background: transparent;
  border: none;
  color: #555b68;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 2px;
  font-size: 10px;
}

.buf-close:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.buffer-footer {
  padding: 6px 14px;
  background: #0d0f14;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 10px;
  color: #687080;
  text-align: center;
}
</style>
