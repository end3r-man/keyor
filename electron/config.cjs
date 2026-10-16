const path = require('path');
const fs = require('fs');
const os = require('os');
const { BUILTIN_THEMES } = require('./themes.cjs');

/**
 * Keyor configuration manager.
 *
 * The user configuration is a single Neovim-style JavaScript module at
 * `~/.keyor/init.js` (CommonJS) that can customize keymaps, options and themes.
 * It hot-reloads on save, exactly like `init.lua` in Neovim.
 */

const keyorDir = path.join(os.homedir(), '.keyor');
const configFile = path.join(keyorDir, 'init.js');

const DEFAULT_OPTIONS = {
  leader: '<Space>',
  timeoutlen: 500,
  scrollStep: 120,
  hintChars: 'asdfjklghweruio',
  searchEngine: 'https://duckduckgo.com/?q=',
  homePage: 'keyor://start',
  restoreSession: true,
};

function buildDefaultKeymaps() {
  const normal = {
    // Motion / scrolling
    j: { action: 'scroll.down', desc: 'Scroll down' },
    k: { action: 'scroll.up', desc: 'Scroll up' },
    d: { action: 'scroll.halfDown', desc: 'Scroll half page down (accepts count: 3d)' },
    u: { action: 'scroll.halfUp', desc: 'Scroll half page up (accepts count: 3u)' },
    '<C-d>': { action: 'scroll.halfDown', desc: 'Scroll half page down' },
    '<C-u>': { action: 'scroll.halfUp', desc: 'Scroll half page up' },
    '<C-f>': { action: 'scroll.pageDown', desc: 'Scroll a full page down' },
    '<C-b>': { action: 'scroll.pageUp', desc: 'Scroll a full page up' },
    gg: { action: 'scroll.top', desc: 'Scroll to top of page' },
    G: { action: 'scroll.bottom', desc: 'Scroll to bottom of page' },

    // Hints
    f: { action: 'hint.open', desc: 'Hint mode: click any element in this tab' },
    F: { action: 'hint.openNewTab', desc: 'Hint mode: open link in a new tab' },
    gi: { action: 'hint.focusInput', desc: 'Focus the first text input on the page' },

    // Modes
    i: { action: 'mode.insert', desc: 'Enter INSERT mode (type into the page)' },
    '<Esc>': { action: 'mode.normal', desc: 'Return to NORMAL mode' },

    // Tabs / buffers
    t: { action: 'nav.openNewTab', desc: 'Open the omnibar to load a URL in a new tab' },
    T: { action: 'tab.new', desc: 'Open a new blank tab' },
    '<C-t>': { action: 'nav.openNewTab', desc: 'Open a new tab' },
    x: { action: 'tab.close', desc: 'Close current tab' },
    X: { action: 'tab.close', desc: 'Close current tab' },
    J: { action: 'tab.next', desc: 'Switch to next tab' },
    K: { action: 'tab.prev', desc: 'Switch to previous tab' },
    gt: { action: 'tab.next', desc: 'Next tab (3gt jumps to tab 3)' },
    gT: { action: 'tab.prev', desc: 'Previous tab' },
    '<C-Tab>': { action: 'tab.next', desc: 'Next tab' },
    '<C-S-Tab>': { action: 'tab.prev', desc: 'Previous tab' },
    U: { action: 'tab.restore', desc: 'Restore recently closed tab' },
    b: { action: 'tab.picker', desc: 'Open buffer / tab switcher' },
    Y: { action: 'tab.duplicate', desc: 'Duplicate current tab' },

    // URLs / clipboard
    o: { action: 'nav.open', desc: 'Open URL or search in current tab' },
    O: { action: 'nav.openNewTab', desc: 'Open URL or search in a new tab' },
    yy: { action: 'url.yank', desc: 'Yank (copy) current page URL' },
    p: { action: 'url.paste', desc: 'Open clipboard URL in current tab' },
    P: { action: 'url.pasteNewTab', desc: 'Open clipboard URL in a new tab' },

    // History / reload
    H: { action: 'nav.back', desc: 'Go back in page history' },
    L: { action: 'nav.forward', desc: 'Go forward in page history' },
    r: { action: 'nav.reload', desc: 'Reload page' },
    R: { action: 'nav.hardReload', desc: 'Hard reload (bypass cache)' },

    // Zoom
    zi: { action: 'zoom.in', desc: 'Zoom in' },
    zo: { action: 'zoom.out', desc: 'Zoom out' },
    zz: { action: 'zoom.reset', desc: 'Reset zoom to 100%' },
    '<C-=>': { action: 'zoom.in', desc: 'Zoom in' },
    '<C-->': { action: 'zoom.out', desc: 'Zoom out' },
    '<C-0>': { action: 'zoom.reset', desc: 'Reset zoom' },

    // Search / command / UI
    '/': { action: 'find.open', desc: 'Find in page' },
    n: { action: 'find.next', desc: 'Next search match' },
    N: { action: 'find.prev', desc: 'Previous search match' },
    ':': { action: 'command.open', desc: 'Open the Vim command line' },
    '?': { action: 'help.open', desc: 'Open the Vim cheatsheet' },

    // Bookmarks / downloads
    B: { action: 'bookmark.picker', desc: 'Open bookmarks manager' },
    D: { action: 'downloads.open', desc: 'Open downloads manager' },
    '<leader>b': { action: 'bookmark.add', desc: 'Bookmark the current page' },
    '<leader>d': { action: 'downloads.open', desc: 'Open downloads manager' },
  };
  for (let i = 1; i <= 9; i += 1) {
    normal[`<A-${i}>`] = { action: 'tab.goto', args: i, desc: `Jump to tab ${i}` };
    normal[`<C-${i}>`] = { action: 'tab.goto', args: i, desc: `Jump to tab ${i}` };
  }

  const insert = {
    '<Esc>': { action: 'mode.normal', desc: 'Return to NORMAL mode' },
    '<C-[>': { action: 'mode.normal', desc: 'Return to NORMAL mode' },
    '<C-t>': { action: 'nav.openNewTab', desc: 'Open a new tab' },
    '<A-t>': { action: 'nav.openNewTab', desc: 'Open a new tab' },
  };
  for (let i = 1; i <= 9; i += 1) {
    insert[`<A-${i}>`] = { action: 'tab.goto', args: i, desc: `Jump to tab ${i}` };
    insert[`<C-${i}>`] = { action: 'tab.goto', args: i, desc: `Jump to tab ${i}` };
  }

  return { normal, insert };
}

function buildDefaultConfig() {
  return {
    colorscheme: 'tokyonight',
    colorschemes: {},
    options: { ...DEFAULT_OPTIONS },
    keymaps: buildDefaultKeymaps(),
  };
}

const HEADER = `// ─────────────────────────────────────────────────────────────────────────────
// Keyor configuration  (~/.keyor/init.js)
// Neovim-style: edit this file and save — it hot-reloads instantly.
//
//   colorscheme   active colorscheme name (see colorschemes below / builtins)
//   colorschemes  custom { name, author, type, colors: { ... } } entries
//   options       leader, timeoutlen, scrollStep, hintChars, searchEngine ...
//   keymaps       per-mode key sequences -> action ids
//
// Key notation supports multi-key sequences and modifiers:
//   "gg"  "gt"  "yy"  "<C-d>"  "<A-1>"  "<leader>b"  "<C-S-Tab>"  "<Space>"
//
// Mapping values may be a plain action id or an object:
//   { action: 'scroll.down', desc: 'my label' }
//   { action: 'theme.set', args: 'gruvbox' }
//   { action: 'tab.goto', args: 3 }
//
// See all available actions in the cheatsheet (?), or run :help.
// ─────────────────────────────────────────────────────────────────────────────
`;

function renderConfigFile(config) {
  return `${HEADER}\nmodule.exports = ${JSON.stringify(config, null, 2)};\n`;
}

function ensureConfigDir() {
  try {
    if (!fs.existsSync(keyorDir)) fs.mkdirSync(keyorDir, { recursive: true });
  } catch (err) {
    console.error(`Error creating ${keyorDir}:`, err);
  }
}

function ensureConfig() {
  ensureConfigDir();
  if (!fs.existsSync(configFile)) {
    try {
      fs.writeFileSync(configFile, renderConfigFile(buildDefaultConfig()), 'utf-8');
      console.log(`Created default Keyor config at ${configFile}`);
    } catch (err) {
      console.error(`Error writing ${configFile}:`, err);
    }
  }
}

function readConfigFile() {
  try {
    ensureConfig();
    // Drop the require cache so external edits are picked up live.
    delete require.cache[require.resolve(configFile)];
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const loaded = require(configFile);
    return loaded && typeof loaded === 'object' ? loaded : {};
  } catch (err) {
    console.error(`Failed to load ${configFile}:`, err.message);
    return {};
  }
}

function normalize(raw) {
  const defaults = buildDefaultConfig();
  const user = raw || {};
  return {
    colorscheme: user.colorscheme || defaults.colorscheme,
    colorschemes: {
      ...BUILTIN_THEMES,
      ...(defaults.colorschemes || {}),
      ...(user.colorschemes || {}),
    },
    options: { ...defaults.options, ...(user.options || {}) },
    keymaps: {
      normal: { ...defaults.keymaps.normal, ...(user.keymaps?.normal || {}) },
      insert: { ...defaults.keymaps.insert, ...(user.keymaps?.insert || {}) },
    },
    path: configFile,
  };
}

function loadConfig() {
  return normalize(readConfigFile());
}

function saveConfig(patch) {
  try {
    ensureConfig();
    const current = readConfigFile();
    const next = {
      ...current,
      ...patch,
    };
    if (patch && patch.options) {
      next.options = { ...(current.options || {}), ...patch.options };
    }
    if (patch && patch.keymaps) {
      next.keymaps = { ...(current.keymaps || {}), ...patch.keymaps };
    }
    fs.writeFileSync(configFile, renderConfigFile(next), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error saving ${configFile}:`, err);
    return false;
  }
}

function setupConfigWatcher(callback) {
  ensureConfig();
  let debounce = null;
  try {
    fs.watch(keyorDir, (eventType, filename) => {
      if (filename && filename !== 'init.js' && filename !== 'init.cjs') return;
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        try {
          callback(loadConfig());
        } catch (err) {
          console.error('Error reloading config on watch event:', err);
        }
      }, 120);
    });
  } catch (err) {
    console.error(`Failed to watch ${keyorDir}:`, err);
  }
}

module.exports = {
  keyorDir,
  configFile,
  DEFAULT_OPTIONS,
  BUILTIN_THEMES,
  buildDefaultConfig,
  ensureConfig,
  loadConfig,
  saveConfig,
  setupConfigWatcher,
};
