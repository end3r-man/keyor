<template>
  <div class="find-wrapper">
    <span class="find-slash">/</span>
    <input
      ref="findInput"
      v-model="searchText"
      class="find-input"
      placeholder="Find in page..."
      spellcheck="false"
      @input="handleInput"
      @keydown="handleKeydown"
    />

    <div class="find-stats">
      <span v-if="hasSearched" class="stats-text">
        {{ totalMatches > 0 ? `${activeMatchOrdinal} of ${totalMatches}` : 'Phrase not found' }}
      </span>
    </div>

    <div class="find-nav-btns">
      <button class="find-btn" @click="findNext" title="Next match (n)">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      <button class="find-btn" @click="findPrev" title="Previous match (N)">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      </button>
      <button class="find-btn close-btn" @click="close" title="Close (Esc)">
        <X :size="12" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { X } from '@lucide/vue';

const props = defineProps({
  activeMatchOrdinal: {
    type: Number,
    default: 0
  },
  totalMatches: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['find', 'find-next', 'find-prev', 'close']);

const findInput = ref(null);
const searchText = ref('');
const hasSearched = ref(false);

onMounted(() => {
  nextTick(() => {
    findInput.value?.focus();
  });
});

const handleInput = () => {
  hasSearched.value = true;
  emit('find', searchText.value);
};

const findNext = () => {
  emit('find-next', searchText.value);
};

const findPrev = () => {
  emit('find-prev', searchText.value);
};

const close = () => {
  emit('close');
};

const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    close();
    return;
  }

  if (e.key === 'Enter') {
    e.preventDefault();
    if (e.shiftKey) {
      findPrev();
    } else {
      findNext();
    }
  }
};
</script>

<style scoped>
.find-wrapper {
  position: absolute;
  top: 44px;
  right: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  padding: 3px 8px;
  gap: 8px;
  z-index: 1000;
  font-family: var(--font-mono);
  animation: slideDown 0.1s ease;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.find-slash {
  color: var(--accent-rose);
  font-weight: 600;
  font-size: 12px;
}

.find-input {
  background: transparent;
  border: none;
  outline: none;
  color: #f1f3f7;
  font-family: inherit;
  font-size: 12px;
  width: 150px;
}

.find-stats {
  font-size: 10.5px;
  color: #717885;
  min-width: 50px;
}

.find-nav-btns {
  display: flex;
  align-items: center;
  gap: 2px;
}

.find-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: #8c93a0;
  width: 18px;
  height: 18px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  font-size: 9px;
  transition: all 0.12s ease;
}

.find-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #ffffff;
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  border-color: transparent;
}
</style>
