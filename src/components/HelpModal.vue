<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <div class="header-title">
          <span class="vim-tag">VIM</span>
          <h2>Keyboard Navigation Reference</h2>
        </div>
        <button class="modal-close-btn" @click="$emit('close')" title="Close (Esc)">
          <X :size="14" />
        </button>
      </div>

      <div class="modal-search">
        <input
          v-model="filterQuery"
          class="filter-input"
          placeholder="Filter keybindings (e.g. scroll, tab, hint, yank)..."
          spellcheck="false"
          autofocus
        />
      </div>

      <div class="cheat-columns">
        <div
          v-for="section in filteredSections"
          :key="section.title"
          class="cheat-section"
        >
          <div class="section-badge">{{ section.title }}</div>
          <div class="bindings-list">
            <div
              v-for="b in section.bindings"
              :key="b.key"
              class="binding-row"
            >
              <div class="keys-wrap">
                <kbd v-for="k in b.keys" :key="k">{{ k }}</kbd>
              </div>
              <span class="binding-desc">{{ b.desc }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <span>Press <kbd>Esc</kbd> anytime to return to NORMAL mode</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { X } from '@lucide/vue';
import { useKeymaps } from '../composables/useKeymaps';
import { useCommands } from '../composables/useCommands';
import { categoryFor } from '../keymaps/actions';
import { parseKeys } from '../config/keymapEngine';

defineEmits(['close']);

const filterQuery = ref('');

const keymaps = useKeymaps();
const { AVAILABLE_COMMANDS } = useCommands({});

const CATEGORY_ORDER = [
  'Motion & Scrolling',
  'Hints & Interaction',
  'Tabs & Buffers',
  'Navigation',
  'URLs & Clipboard',
  'Search & Commands',
  'Bookmarks & Downloads',
  'Zoom',
  'Appearance & Themes',
  'Application',
  'Other',
];

// Render a mapping key string ("gg", "<C-d>", "<leader>b") as kbd tokens.
const keyToTags = (keyStr) => {
  const leader = keymaps.options.value.leader || '<Space>';
  const leaderToken = leader.length === 1 && leader !== ' ' ? leader : '<Space>';
  return parseKeys(keyStr, leaderToken).map((t) =>
    t.length > 1 && t[0] === '<' && t[t.length - 1] === '>' ? t.slice(1, -1) : t,
  );
};

// Build the cheat sheet straight from the live (and user-editable) keymaps.
const sections = computed(() => {
  const maps = keymaps.config.value.keymaps || {};
  const byCategory = new Map();

  const collect = (map) => {
    for (const [key, value] of Object.entries(map || {})) {
      const def = typeof value === 'string' ? { action: value } : value || {};
      const action = def.action || '';
      const category = categoryFor(action);
      if (!byCategory.has(category)) byCategory.set(category, []);
      byCategory.get(category).push({
        key,
        keys: keyToTags(key),
        desc: def.desc || action || key,
      });
    }
  };
  collect(maps.normal);
  collect(maps.insert);

  const result = [];
  for (const category of CATEGORY_ORDER) {
    if (byCategory.has(category)) {
      result.push({ title: category.toUpperCase(), bindings: byCategory.get(category) });
      byCategory.delete(category);
    }
  }
  for (const [category, bindings] of byCategory) {
    result.push({ title: category.toUpperCase(), bindings });
  }

  result.push({
    title: 'COMMAND LINE',
    bindings: AVAILABLE_COMMANDS.map((c) => ({
      key: c.name,
      keys: [`:${c.name}`],
      desc: c.desc,
    })),
  });

  return result;
});

const filteredSections = computed(() => {
  const q = filterQuery.value.trim().toLowerCase();
  if (!q) return sections.value;

  return sections.value.map(s => {
    const matchingBindings = s.bindings.filter(b =>
      b.desc.toLowerCase().includes(q) ||
      b.keys.some(k => k.toLowerCase().includes(q))
    );
    return {
      ...s,
      bindings: matchingBindings
    };
  }).filter(s => s.bindings.length > 0);
});
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(5, 7, 10, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-card {
  width: 100%;
  max-width: 760px;
  max-height: 85vh;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.vim-tag {
  background: rgba(16, 185, 129, 0.12);
  color: var(--accent-vim);
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 3px;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.modal-header h2 {
  margin: 0;
  font-size: 13.5px;
  color: #f1f3f7;
  font-weight: 600;
}

.modal-close-btn {
  background: transparent;
  border: none;
  color: #687080;
  cursor: pointer;
  font-size: 13px;
  padding: 2px 6px;
  border-radius: 3px;
  transition: all 0.12s ease;
}

.modal-close-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.modal-search {
  padding: 8px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-subtle);
}

.filter-input {
  width: 100%;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-main);
  padding: 6px 10px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 12px;
  outline: none;
}

.filter-input:focus {
  border-color: rgba(59, 130, 246, 0.4);
}

.cheat-columns {
  padding: 14px 16px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 10px;
}

.cheat-columns::-webkit-scrollbar {
  width: 4px;
}

.cheat-columns::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.cheat-section {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-badge {
  font-family: var(--font-mono);
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: #38bdf8;
}

.bindings-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.binding-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 11.5px;
}

.keys-wrap {
  display: flex;
  align-items: center;
  gap: 3px;
}

.binding-desc {
  color: #8c93a0;
  text-align: right;
}

.modal-footer {
  padding: 8px 16px;
  background: #0d0f14;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 10.5px;
  color: #687080;
  text-align: center;
}
</style>
