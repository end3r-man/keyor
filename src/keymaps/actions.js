/**
 * Keyor action registry.
 *
 * Every keymap resolves to an action id (e.g. `scroll.halfDown`). Actions are
 * thin, named operations executed by {@link createActionRunner} against the
 * application context. This keeps the keymap config declarative and Neovim-like:
 * users remap keys in `~/.keyor/init.js` without touching component code.
 */

const CATEGORY_BY_PREFIX = {
  scroll: 'Motion & Scrolling',
  hint: 'Hints & Interaction',
  mode: 'Hints & Interaction',
  tab: 'Tabs & Buffers',
  nav: 'Navigation',
  url: 'URLs & Clipboard',
  find: 'Search & Commands',
  command: 'Search & Commands',
  bookmark: 'Bookmarks & Downloads',
  downloads: 'Bookmarks & Downloads',
  zoom: 'Zoom',
  theme: 'Appearance & Themes',
  window: 'Application',
  app: 'Application',
  help: 'Application',
};

export const ACTION_META = {
  'scroll.down': { desc: 'Scroll down' },
  'scroll.up': { desc: 'Scroll up' },
  'scroll.halfDown': { desc: 'Scroll half page down' },
  'scroll.halfUp': { desc: 'Scroll half page up' },
  'scroll.pageDown': { desc: 'Scroll a full page down' },
  'scroll.pageUp': { desc: 'Scroll a full page up' },
  'scroll.top': { desc: 'Scroll to top of page' },
  'scroll.bottom': { desc: 'Scroll to bottom of page' },

  'hint.open': { desc: 'Hint mode: click an element in this tab' },
  'hint.openNewTab': { desc: 'Hint mode: open a link in a new tab' },
  'hint.focusInput': { desc: 'Focus the first text input on the page' },

  'mode.insert': { desc: 'Enter INSERT mode' },
  'mode.normal': { desc: 'Return to NORMAL mode' },

  'tab.new': { desc: 'Open a new blank tab' },
  'tab.close': { desc: 'Close current tab' },
  'tab.next': { desc: 'Switch to next tab' },
  'tab.prev': { desc: 'Switch to previous tab' },
  'tab.goto': { desc: 'Jump to tab N' },
  'tab.restore': { desc: 'Restore recently closed tab' },
  'tab.picker': { desc: 'Open buffer / tab switcher' },
  'tab.duplicate': { desc: 'Duplicate current tab' },

  'nav.open': { desc: 'Open URL or search in current tab' },
  'nav.openNewTab': { desc: 'Open URL or search in a new tab' },
  'nav.back': { desc: 'Go back in page history' },
  'nav.forward': { desc: 'Go forward in page history' },
  'nav.reload': { desc: 'Reload page' },
  'nav.hardReload': { desc: 'Hard reload (bypass cache)' },

  'url.yank': { desc: 'Yank (copy) current page URL' },
  'url.paste': { desc: 'Open clipboard URL in current tab' },
  'url.pasteNewTab': { desc: 'Open clipboard URL in a new tab' },

  'find.open': { desc: 'Find in page' },
  'find.next': { desc: 'Next search match' },
  'find.prev': { desc: 'Previous search match' },

  'command.open': { desc: 'Open the Vim command line' },

  'bookmark.picker': { desc: 'Open bookmarks manager' },
  'bookmark.add': { desc: 'Bookmark the current page' },

  'downloads.open': { desc: 'Open downloads manager' },

  'zoom.in': { desc: 'Zoom in' },
  'zoom.out': { desc: 'Zoom out' },
  'zoom.reset': { desc: 'Reset zoom to 100%' },

  'theme.set': { desc: 'Set colorscheme (e.g. :colorscheme gruvbox)' },
  'theme.list': { desc: 'List available colorschemes' },
  'theme.edit': { desc: 'Edit ~/.keyor/init.js' },

  'window.fullscreen': { desc: 'Toggle fullscreen' },
  'window.devtools': { desc: 'Toggle developer tools' },
  'app.quit': { desc: 'Quit Keyor' },

  'help.open': { desc: 'Open the Vim cheatsheet' },
};

export function categoryFor(actionId) {
  const prefix = String(actionId).split('.')[0];
  return CATEGORY_BY_PREFIX[prefix] || 'Other';
}

function countOr(count, fallback) {
  const n = Number(count);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Build the action runner bound to an application context.
 * @param {object} ctx
 */
export function createActionRunner(ctx) {
  const actions = {
    // ── Scrolling ───────────────────────────────────────────────────────
    'scroll.down': ({ count }) => {
      const step = ctx.options().scrollStep || 120;
      ctx.webview()?.scrollDown(step * countOr(count, 1));
    },
    'scroll.up': ({ count }) => {
      const step = ctx.options().scrollStep || 120;
      ctx.webview()?.scrollUp(step * countOr(count, 1));
    },
    'scroll.halfDown': ({ count }) => {
      for (let i = 0; i < countOr(count, 1); i += 1) ctx.webview()?.scrollHalfDown();
    },
    'scroll.halfUp': ({ count }) => {
      for (let i = 0; i < countOr(count, 1); i += 1) ctx.webview()?.scrollHalfUp();
    },
    'scroll.pageDown': () => ctx.webview()?.scrollPageDown(),
    'scroll.pageUp': () => ctx.webview()?.scrollPageUp(),
    'scroll.top': () => ctx.webview()?.scrollToTop(),
    'scroll.bottom': () => ctx.webview()?.scrollToBottom(),

    // ── Hints & modes ───────────────────────────────────────────────────
    'hint.open': () => ctx.hints.enter(false),
    'hint.openNewTab': () => ctx.hints.enter(true),
    'hint.focusInput': () => {
      ctx.webview()?.focusFirstInput();
      ctx.ui.setMode('INSERT');
      ctx.ui.showToast('-- INSERT --', 1200);
    },
    'mode.insert': () => {
      ctx.ui.setMode('INSERT');
      ctx.ui.showToast('-- INSERT --', 1200);
    },
    'mode.normal': () => {
      ctx.ui.setMode('NORMAL');
    },

    // ── Tabs ────────────────────────────────────────────────────────────
    'tab.new': () => {
      ctx.tabs.createTab(ctx.options().homePage || 'keyor://start', true);
      ctx.ui.showToast('Opened new tab');
    },
    'tab.close': () => {
      ctx.tabs.closeTab(ctx.state.activeTabId.value);
      ctx.ui.showToast('Closed tab');
    },
    'tab.next': ({ count }) => {
      if (count > 1) {
        ctx.tabs.jumpToTab(count);
      } else {
        ctx.tabs.nextTab();
      }
    },
    'tab.prev': ({ count }) => {
      if (count > 1) {
        ctx.tabs.jumpToTab(count);
      } else {
        ctx.tabs.prevTab();
      }
    },
    'tab.goto': ({ args, count }) => {
      const n = Number(args) || Number(count);
      if (!n) return;
      const ok = ctx.tabs.jumpToTab(n);
      ctx.ui.showToast(
        ok ? `Jumped to tab ${n}` : `Tab ${n} does not exist (${ctx.state.tabs.value.length} open)`,
      );
    },
    'tab.restore': () => {
      const restored = ctx.tabs.restoreClosedTab();
      ctx.ui.showToast(restored ? 'Restored closed tab' : 'No closed tab to restore');
    },
    'tab.picker': () => ctx.ui.setMode('BUFFER'),
    'tab.duplicate': () => {
      ctx.tabs.duplicateTab();
      ctx.ui.showToast('Duplicated tab');
    },

    // ── Navigation ──────────────────────────────────────────────────────
    'nav.open': () => ctx.omnibar.openCurrent(),
    'nav.openNewTab': () => ctx.omnibar.openNew(),
    'nav.back': () => ctx.webview()?.goBack(),
    'nav.forward': () => ctx.webview()?.goForward(),
    'nav.reload': () => {
      ctx.webview()?.reload(false);
      ctx.ui.showToast('Reloading page');
    },
    'nav.hardReload': () => {
      ctx.webview()?.reload(true);
      ctx.ui.showToast('Hard reloading (cache bypassed)');
    },

    // ── URLs / clipboard ────────────────────────────────────────────────
    'url.yank': () => ctx.clipboard.yank(),
    'url.paste': () => ctx.clipboard.paste(false),
    'url.pasteNewTab': () => ctx.clipboard.paste(true),

    // ── Find / command ──────────────────────────────────────────────────
    'find.open': () => ctx.ui.setMode('FIND'),
    'find.next': () => ctx.find.next(),
    'find.prev': () => ctx.find.prev(),
    'command.open': () => ctx.ui.setMode('COMMAND'),

    // ── Bookmarks / downloads ───────────────────────────────────────────
    'bookmark.picker': () => ctx.ui.setMode('BOOKMARKS'),
    'bookmark.add': async () => {
      const tab = ctx.state.activeTab.value;
      await ctx.bookmarks.add(tab?.title, tab?.url);
      ctx.ui.showToast('Bookmarked current page');
    },
    'downloads.open': () => ctx.ui.setMode('DOWNLOADS'),

    // ── Zoom ────────────────────────────────────────────────────────────
    'zoom.in': () => ctx.webview()?.zoomIn(),
    'zoom.out': () => ctx.webview()?.zoomOut(),
    'zoom.reset': () => ctx.webview()?.resetZoom(),

    // ── Themes ──────────────────────────────────────────────────────────
    'theme.set': async ({ args }) => {
      const res = await ctx.theme.switchTheme(args || '');
      if (res.success) {
        ctx.ui.showToast(`colorscheme ${res.themeId} (${res.themeName})`);
      } else {
        ctx.ui.showToast(
          `Cannot find theme '${args}'. Available: ${(res.available || []).join(', ')}`,
        );
      }
    },
    'theme.list': () => {
      ctx.ui.showToast(`Themes: ${ctx.theme.list().join(', ')}`);
    },
    'theme.edit': async () => {
      const opened = await ctx.theme.editConfig();
      ctx.ui.showToast(opened ? `Opened ${ctx.theme.path}` : `Config: ${ctx.theme.path}`);
    },

    // ── Application ─────────────────────────────────────────────────────
    'window.fullscreen': () => ctx.window.fullscreen(),
    'window.devtools': () => ctx.window.devtools(),
    'app.quit': () => ctx.window.quit(),
    'help.open': () => ctx.ui.setMode('HELP'),
  };

  return {
    has(actionId) {
      return !!actions[actionId];
    },
    async run(actionId, payload = {}) {
      const fn = actions[actionId];
      if (!fn) {
        // Allow arbitrary Vim command strings as actions (e.g. { command: 'tabnew' }).
        if (actionId && actionId.startsWith(':')) {
          await ctx.commands.run(actionId.slice(1));
          return;
        }
        ctx.ui.showToast(`Unknown action: ${actionId}`);
        return;
      }
      try {
        await fn(payload);
      } catch (err) {
        console.error(`Action '${actionId}' failed:`, err);
        ctx.ui.showToast(`Action failed: ${actionId}`);
      }
    },
    listActionIds() {
      return Object.keys(actions);
    },
  };
}
