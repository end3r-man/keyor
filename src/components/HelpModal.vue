<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <div class="header-title">
          <span class="vim-tag">VIM</span>
          <h2>Keyboard Navigation Reference</h2>
        </div>
        <button class="modal-close-btn" @click="$emit('close')" title="Close (Esc)">✕</button>
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

defineEmits(['close']);

const filterQuery = ref('');

const SECTIONS = [
  {
    title: 'PAGE SCROLLING & MOTION',
    bindings: [
      { keys: ['j'], desc: 'Scroll down' },
      { keys: ['k'], desc: 'Scroll up' },
      { keys: ['d'], desc: 'Scroll half page down' },
      { keys: ['u'], desc: 'Scroll half page up' },
      { keys: ['gg'], desc: 'Scroll to top of page' },
      { keys: ['G'], desc: 'Scroll to bottom of page' }
    ]
  },
  {
    title: 'HINTS & INTERACTION',
    bindings: [
      { keys: ['f'], desc: 'Hint mode (click link/button)' },
      { keys: ['F'], desc: 'Hint mode (open link in new tab)' },
      { keys: ['gi'], desc: 'Focus first text input on page' },
      { keys: ['i'], desc: 'Enter INSERT mode (type on webpage)' },
      { keys: ['Esc'], desc: 'Exit to NORMAL mode / dismiss hints' }
    ]
  },
  {
    title: 'TABS & BUFFERS',
    bindings: [
      { keys: ['t'], desc: 'Open new tab with prompt' },
      { keys: ['d', 'x'], desc: 'Close current tab' },
      { keys: ['J'], desc: 'Switch to next tab' },
      { keys: ['K'], desc: 'Switch to previous tab' },
      { keys: ['u'], desc: 'Restore recently closed tab' },
      { keys: ['1..9', 'gt'], desc: 'Jump directly to tab N' },
      { keys: ['b'], desc: 'Open Buffer / Tab switcher' }
    ]
  },
  {
    title: 'URLS & CLIPBOARD',
    bindings: [
      { keys: ['o'], desc: 'Open URL or search in current tab' },
      { keys: ['O'], desc: 'Open URL or search in new tab' },
      { keys: ['yy'], desc: 'Yank (copy) current page URL' },
      { keys: ['p'], desc: 'Paste clipboard URL in current tab' },
      { keys: ['P'], desc: 'Paste clipboard URL in new tab' },
      { keys: ['B'], desc: 'Open Bookmarks manager' }
    ]
  },
  {
    title: 'SEARCH & COMMANDS',
    bindings: [
      { keys: ['/'], desc: 'Find text in active page' },
      { keys: ['n'], desc: 'Next search match' },
      { keys: ['N'], desc: 'Previous search match' },
      { keys: [':'], desc: 'Enter Vim command line' },
      { keys: ['?'], desc: 'Show this cheatsheet dialog' }
    ]
  },
  {
    title: 'THEMES & COLORSCHEMES',
    bindings: [
      { keys: [':colo', ':theme'], desc: 'Switch Vim theme (e.g. tokyonight, gruvbox, nord)' },
      { keys: [':themes'], desc: 'List themes loaded from ~/.keyor/theme.json' },
      { keys: [':themeedit'], desc: 'Open ~/.keyor/theme.json in editor' },
      { keys: ['theme.json'], desc: 'Hot-reloads automatically when edited!' }
    ]
  },
  {
    title: 'BROWSER CONTROLS',
    bindings: [
      { keys: ['H'], desc: 'Go back in page history' },
      { keys: ['L'], desc: 'Go forward in page history' },
      { keys: ['r'], desc: 'Reload current page' },
      { keys: ['R'], desc: 'Hard reload (bypass cache)' },
      { keys: ['zi'], desc: 'Zoom in' },
      { keys: ['zo'], desc: 'Zoom out' },
      { keys: ['zz'], desc: 'Reset zoom to 100%' }
    ]
  }
];

const filteredSections = computed(() => {
  const q = filterQuery.value.trim().toLowerCase();
  if (!q) return SECTIONS;

  return SECTIONS.map(s => {
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
