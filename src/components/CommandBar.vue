<template>
  <div class="command-bar-wrapper">
    <!-- Auto-complete Suggestions Dropup -->
    <div v-if="filteredCommands.length > 0 && commandText.length > 0" class="command-suggestions">
      <div
        v-for="(cmd, idx) in filteredCommands"
        :key="cmd.name"
        class="cmd-suggestion-row"
        :class="{ active: idx === selectedSuggestionIndex }"
        @click="selectCommand(cmd)"
        @mouseenter="selectedSuggestionIndex = idx"
      >
        <span class="cmd-name">:{{ cmd.name }}</span>
        <span class="cmd-args">{{ cmd.args }}</span>
        <span class="cmd-desc">{{ cmd.desc }}</span>
      </div>
    </div>

    <!-- Vim Command Input Line -->
    <div class="command-line">
      <span class="command-prompt">:</span>
      <input
        ref="cmdInput"
        v-model="commandText"
        class="command-input"
        placeholder="type command (e.g. open, tabnew, q, b, help)..."
        spellcheck="false"
        @keydown="handleKeydown"
      />
      <div class="command-help-tip">
        <kbd>Tab</kbd> complete &nbsp;
        <kbd>↵</kbd> execute &nbsp;
        <kbd>Esc</kbd> cancel
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useTheme } from '../composables/useTheme';

const emit = defineEmits(['execute', 'close']);

const cmdInput = ref(null);
const commandText = ref('');
const selectedSuggestionIndex = ref(0);
const { availableThemesList, activeThemeName } = useTheme();

onMounted(() => {
  nextTick(() => {
    cmdInput.value?.focus();
    setTimeout(() => {
      cmdInput.value?.focus();
    }, 40);
  });
});

const AVAILABLE_COMMANDS = [
  { name: 'open', args: '<url or query>', desc: 'Open URL or search in current tab' },
  { name: 'tabnew', args: '[url]', desc: 'Open a new tab with optional URL' },
  { name: 'tabclose', args: '', desc: 'Close current tab' },
  { name: 'q', args: '', desc: 'Close current tab' },
  { name: 'tabnext', args: '', desc: 'Switch to next tab' },
  { name: 'tabprev', args: '', desc: 'Switch to previous tab' },
  { name: 'b', args: '<index or title>', desc: 'Switch to tab buffer' },
  { name: 'buffers', args: '', desc: 'Open buffer / tab switcher' },
  { name: 'colorscheme', args: '<theme>', desc: 'Switch Vim theme (e.g. tokyonight, gruvbox, nord)' },
  { name: 'colo', args: '<theme>', desc: 'Vim shorthand for :colorscheme' },
  { name: 'theme', args: '<theme>', desc: 'Switch Vim theme' },
  { name: 'themes', args: '', desc: 'Show available themes from ~/.keyor/theme.json' },
  { name: 'themeedit', args: '', desc: 'Open ~/.keyor/theme.json in system editor' },
  { name: 'reload', args: '', desc: 'Reload current page' },
  { name: 'reload!', args: '', desc: 'Hard reload bypassing cache' },
  { name: 'back', args: '', desc: 'Go back in history' },
  { name: 'forward', args: '', desc: 'Go forward in history' },
  { name: 'yank', args: '', desc: 'Copy current page URL to clipboard' },
  { name: 'bookmark', args: '[title]', desc: 'Bookmark current page' },
  { name: 'bookmarks', args: '', desc: 'Open bookmarks manager' },
  { name: 'downloads', args: '', desc: 'Open downloads manager' },
  { name: 'dl', args: '', desc: 'Shorthand for :downloads' },
  { name: 'history', args: '', desc: 'View browsing history' },
  { name: 'zoom', args: '<percent>', desc: 'Set zoom level (e.g. 100, 120)' },
  { name: 'fullscreen', args: '', desc: 'Toggle window fullscreen' },
  { name: 'devtools', args: '', desc: 'Open Chrome developer tools' },
  { name: 'help', args: '', desc: 'Show Vim cheatsheet' },
  { name: 'quit', args: '', desc: 'Close application' }
];

onMounted(() => {
  nextTick(() => {
    cmdInput.value?.focus();
  });
});

const filteredCommands = computed(() => {
  let cleaned = commandText.value.trim().replace(/^:+/, '');
  const parts = cleaned.split(/\s+/);
  const firstWord = parts[0]?.toLowerCase() || '';
  const secondWord = parts[1]?.toLowerCase() || '';

  if (!firstWord) return [];

  // If user is typing args for colorscheme/colo/theme
  if (['colorscheme', 'colo', 'cs', 'theme'].includes(firstWord) && parts.length > 1) {
    const matchingThemes = availableThemesList.value.filter(t =>
      t.id.toLowerCase().includes(secondWord) || t.name.toLowerCase().includes(secondWord)
    );
    return matchingThemes.map(t => ({
      name: `${firstWord} ${t.id}`,
      args: `[${t.name}]`,
      desc: t.author ? `by ${t.author}` : 'Vim Colorscheme',
      isThemeOption: true
    }));
  }

  if (/^\d+$/.test(firstWord)) {
    return [{
      name: firstWord,
      args: '',
      desc: `Jump directly to Tab ${firstWord}`
    }];
  }

  if (/^b\d+$/.test(firstWord)) {
    const num = firstWord.slice(1);
    return [{
      name: firstWord,
      args: '',
      desc: `Switch to Tab buffer ${num}`
    }];
  }

  return AVAILABLE_COMMANDS.filter(c => c.name.startsWith(firstWord));
});

const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    emit('close');
    return;
  }

  if (e.key === 'Tab') {
    e.preventDefault();
    if (filteredCommands.value.length > 0) {
      const match = filteredCommands.value[selectedSuggestionIndex.value];
      if (match) {
        commandText.value = `${match.name} `;
      }
    }
    return;
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (filteredCommands.value.length > 0) {
      selectedSuggestionIndex.value = (selectedSuggestionIndex.value + 1) % filteredCommands.value.length;
    }
    return;
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (filteredCommands.value.length > 0) {
      selectedSuggestionIndex.value = (selectedSuggestionIndex.value - 1 + filteredCommands.value.length) % filteredCommands.value.length;
    }
    return;
  }

  if (e.key === 'Enter') {
    e.preventDefault();
    submit();
  }
};

const selectCommand = (cmd) => {
  commandText.value = `${cmd.name} `;
  cmdInput.value?.focus();
};

const submit = () => {
  const text = commandText.value.trim();
  if (!text) {
    emit('close');
    return;
  }
  emit('execute', text);
};
</script>

<style scoped>
.command-bar-wrapper {
  position: absolute;
  bottom: 24px;
  left: 0;
  right: 0;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-subtle);
  z-index: 1000;
  font-family: var(--font-mono);
}

.command-suggestions {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-subtle);
  max-height: 160px;
  overflow-y: auto;
  padding: 4px;
}

.cmd-suggestion-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
}

.cmd-suggestion-row:hover,
.cmd-suggestion-row.active {
  background: var(--bg-hover);
}

.cmd-name {
  color: var(--accent-purple);
  font-weight: 500;
  min-width: 70px;
}

.cmd-args {
  color: var(--text-dim);
  min-width: 100px;
}

.cmd-desc {
  color: var(--text-muted);
  flex: 1;
}

.command-line {
  display: flex;
  align-items: center;
  padding: 2px 10px;
  gap: 8px;
  height: 26px;
}

.command-prompt {
  color: var(--accent-purple);
  font-weight: 600;
  font-size: 13px;
}

.command-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-main);
  font-family: inherit;
  font-size: 12px;
}

.command-input::placeholder {
  color: var(--text-dim);
}

.command-help-tip {
  color: var(--text-dim);
  font-size: 10px;
  display: flex;
  align-items: center;
}

kbd {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  padding: 0 4px;
  border-radius: 2px;
  font-size: 9.5px;
}
</style>
