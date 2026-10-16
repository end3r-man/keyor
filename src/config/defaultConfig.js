/**
 * Keyor default configuration (renderer fallback).
 *
 * This mirrors the config generated into `~/.keyor/init.js` by the Electron
 * main process. It is only used when Electron is unavailable (plain web
 * preview) or when the user config fails to load. Edit the live config via
 * `:config` / `:themeedit`, or directly at `~/.keyor/init.js`.
 */

const normal = {
  // ── Motion / scrolling ────────────────────────────────────────────────
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

  // ── Hints ─────────────────────────────────────────────────────────────
  f: { action: 'hint.open', desc: 'Hint mode: click any element in this tab' },
  F: { action: 'hint.openNewTab', desc: 'Hint mode: open link in a new tab' },
  gi: { action: 'hint.focusInput', desc: 'Focus the first text input on the page' },

  // ── Modes ─────────────────────────────────────────────────────────────
  i: { action: 'mode.insert', desc: 'Enter INSERT mode (type into the page)' },
  '<Esc>': { action: 'mode.normal', desc: 'Return to NORMAL mode' },

  // ── Tabs / buffers ────────────────────────────────────────────────────
  t: { action: 'nav.openNewTab', desc: 'Open the omnibar to load a URL in a new tab' },
  T: { action: 'tab.new', desc: 'Open a new blank tab' },
  '<C-t>': { action: 'nav.openNewTab', desc: 'Open a new tab' },
  x: { action: 'tab.close', desc: 'Close current tab' },
  X: { action: 'tab.close', desc: 'Close current tab' },
  J: { action: 'tab.next', desc: 'Switch to next tab' },
  K: { action: 'tab.prev', desc: 'Switch to previous tab' },
  gt: { action: 'tab.next', desc: 'Next tab (use count: 3gt jumps to tab 3)' },
  gT: { action: 'tab.prev', desc: 'Previous tab' },
  '<C-Tab>': { action: 'tab.next', desc: 'Next tab' },
  '<C-S-Tab>': { action: 'tab.prev', desc: 'Previous tab' },
  U: { action: 'tab.restore', desc: 'Restore recently closed tab' },
  b: { action: 'tab.picker', desc: 'Open buffer / tab switcher' },
  Y: { action: 'tab.duplicate', desc: 'Duplicate current tab' },

  // ── URLs / clipboard ──────────────────────────────────────────────────
  o: { action: 'nav.open', desc: 'Open URL or search in current tab' },
  O: { action: 'nav.openNewTab', desc: 'Open URL or search in a new tab' },
  yy: { action: 'url.yank', desc: 'Yank (copy) current page URL' },
  p: { action: 'url.paste', desc: 'Open clipboard URL in current tab' },
  P: { action: 'url.pasteNewTab', desc: 'Open clipboard URL in a new tab' },

  // ── History / reload ──────────────────────────────────────────────────
  H: { action: 'nav.back', desc: 'Go back in page history' },
  L: { action: 'nav.forward', desc: 'Go forward in page history' },
  r: { action: 'nav.reload', desc: 'Reload page' },
  R: { action: 'nav.hardReload', desc: 'Hard reload (bypass cache)' },

  // ── Zoom ──────────────────────────────────────────────────────────────
  zi: { action: 'zoom.in', desc: 'Zoom in' },
  zo: { action: 'zoom.out', desc: 'Zoom out' },
  zz: { action: 'zoom.reset', desc: 'Reset zoom to 100%' },
  '<C-=>': { action: 'zoom.in', desc: 'Zoom in' },
  '<C-->': { action: 'zoom.out', desc: 'Zoom out' },
  '<C-0>': { action: 'zoom.reset', desc: 'Reset zoom' },

  // ── Search / command / UI ─────────────────────────────────────────────
  '/': { action: 'find.open', desc: 'Find in page' },
  n: { action: 'find.next', desc: 'Next search match' },
  N: { action: 'find.prev', desc: 'Previous search match' },
  ':': { action: 'command.open', desc: 'Open the Vim command line' },
  '?': { action: 'help.open', desc: 'Open the Vim cheatsheet' },

  // ── Bookmarks / downloads ─────────────────────────────────────────────
  B: { action: 'bookmark.picker', desc: 'Open bookmarks manager' },
  D: { action: 'downloads.open', desc: 'Open downloads manager' },
  '<leader>b': { action: 'bookmark.add', desc: 'Bookmark the current page' },
  '<leader>d': { action: 'downloads.open', desc: 'Open downloads manager' },
};

// Alt+1..9 / Ctrl+1..9 → jump straight to tab N.
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

export const DEFAULT_OPTIONS = {
  leader: '<Space>',
  timeoutlen: 500,
  scrollStep: 120,
  hintChars: 'asdfjklghweruio',
  searchEngine: 'https://duckduckgo.com/?q=',
  homePage: 'keyor://start',
  restoreSession: true,
};

export const DEFAULT_KEYMAPS = {
  normal,
  insert,
};

export const DEFAULT_CONFIG = {
  colorscheme: 'tokyonight',
  colorschemes: {},
  options: { ...DEFAULT_OPTIONS },
  keymaps: {
    normal: { ...normal },
    insert: { ...insert },
  },
};

export default DEFAULT_CONFIG;
