/**
 * Vim `:` command-line execution, extracted from App.vue so the dispatcher stays
 * small and new commands are easy to add in one place.
 */
export function useCommands(ctx) {
  const AVAILABLE_COMMANDS = [
    { name: 'open', args: '<url or query>', desc: 'Open URL or search in current tab' },
    { name: 'tabnew', args: '[url]', desc: 'Open a new tab with optional URL' },
    { name: 'tabclose', args: '', desc: 'Close current tab' },
    { name: 'q', args: '', desc: 'Close current tab' },
    { name: 'tabnext', args: '', desc: 'Switch to next tab' },
    { name: 'tabprev', args: '', desc: 'Switch to previous tab' },
    { name: 'b', args: '<index or title>', desc: 'Switch to tab buffer' },
    { name: 'buffers', args: '', desc: 'Open buffer / tab switcher' },
    { name: 'colorscheme', args: '<theme>', desc: 'Switch Vim theme (e.g. tokyonight, gruvbox)' },
    { name: 'colo', args: '<theme>', desc: 'Vim shorthand for :colorscheme' },
    { name: 'theme', args: '<theme>', desc: 'Switch Vim theme' },
    { name: 'themes', args: '', desc: 'List available themes' },
    { name: 'themeedit', args: '', desc: 'Open ~/.keyor/init.js in your editor' },
    { name: 'config', args: '', desc: 'Open ~/.keyor/init.js (keymaps, theme, options)' },
    { name: 'source', args: '', desc: 'Reload ~/.keyor/init.js' },
    { name: 'reload', args: '', desc: 'Reload current page' },
    { name: 'reload!', args: '', desc: 'Hard reload bypassing cache' },
    { name: 'back', args: '', desc: 'Go back in history' },
    { name: 'forward', args: '', desc: 'Go forward in history' },
    { name: 'yank', args: '', desc: 'Copy current page URL to clipboard' },
    { name: 'bookmark', args: '[title]', desc: 'Bookmark current page' },
    { name: 'bookmarks', args: '', desc: 'Open bookmarks manager' },
    { name: 'downloads', args: '', desc: 'Open downloads manager' },
    { name: 'dl', args: '', desc: 'Shorthand for :downloads' },
    { name: 'history', args: '', desc: 'Open the start dashboard' },
    { name: 'zoom', args: '<percent>', desc: 'Set zoom level (e.g. 100, 120)' },
    { name: 'fullscreen', args: '', desc: 'Toggle window fullscreen' },
    { name: 'devtools', args: '', desc: 'Open Chrome developer tools' },
    { name: 'help', args: '', desc: 'Show Vim cheatsheet' },
    { name: 'quit', args: '', desc: 'Close application' },
  ];

  const jumpOrToast = (n) => {
    const ok = ctx.tabs.jumpToTab(n);
    const total = ctx.state.tabs.value.length;
    ctx.ui.showToast(ok ? `Jumped to tab ${n}` : `Tab ${n} does not exist (${total} open)`);
  };

  const execute = async (rawCommand) => {
    let text = (rawCommand || '').trim().replace(/^:+/, '').trim();
    if (!text) {
      ctx.ui.setMode('NORMAL');
      return;
    }

    const parts = text.split(/\s+/);
    const cmd = (parts[0] || '').toLowerCase();
    const args = parts.slice(1).join(' ');

    ctx.ui.setMode('NORMAL');

    // Direct tab index (:1, :b2, :tab3)
    let m;
    if ((m = /^(\d+)$/.exec(cmd))) return jumpOrToast(parseInt(m[1], 10));
    if ((m = /^b(\d+)$/.exec(cmd))) return jumpOrToast(parseInt(m[1], 10));
    if ((m = /^tab(\d+)$/.exec(cmd))) return jumpOrToast(parseInt(m[1], 10));

    switch (cmd) {
      case 'o':
      case 'open':
        if (args) ctx.omnibar.submit({ url: args, inNewTab: false });
        else ctx.omnibar.openCurrent();
        break;

      case 't':
      case 'tabnew':
        if (args) {
          ctx.tabs.createTab(args, true);
          ctx.ui.showToast(`Opened tab: ${args}`);
        } else {
          ctx.tabs.createTab(ctx.options().homePage || 'keyor://start', true);
          ctx.ui.showToast('Opened new tab');
        }
        break;

      case 'q':
      case 'close':
      case 'tabclose':
        ctx.tabs.closeTab(ctx.state.activeTabId.value);
        ctx.ui.showToast('Closed tab');
        break;

      case 'tabnext':
      case 'tn':
      case 'bnext':
        ctx.tabs.nextTab();
        ctx.ui.showToast(`Tab ${ctx.state.activeTabIndex.value + 1}/${ctx.state.tabs.value.length}`);
        break;

      case 'tabprev':
      case 'tp':
      case 'bprev':
        ctx.tabs.prevTab();
        ctx.ui.showToast(`Tab ${ctx.state.activeTabIndex.value + 1}/${ctx.state.tabs.value.length}`);
        break;

      case 'b':
      case 'buffer':
      case 'tab':
        if (args) {
          const num = parseInt(args, 10);
          if (!isNaN(num)) {
            jumpOrToast(num);
          } else {
            const found = ctx.state.tabs.value.find(
              (t) =>
                t.title.toLowerCase().includes(args.toLowerCase()) ||
                t.url.toLowerCase().includes(args.toLowerCase()),
            );
            if (found) {
              ctx.tabs.setActiveTab(found.id);
              ctx.ui.showToast(`Switched to: ${found.title}`);
            } else {
              ctx.ui.showToast(`No tab matching "${args}"`);
            }
          }
        } else {
          ctx.ui.setMode('BUFFER');
        }
        break;

      case 'buffers':
        ctx.ui.setMode('BUFFER');
        break;

      case 'r':
      case 'reload':
        ctx.webview()?.reload(false);
        ctx.ui.showToast('Reloading page');
        break;

      case 'reload!':
      case 'R':
        ctx.webview()?.reload(true);
        ctx.ui.showToast('Hard reloading (cache bypassed)');
        break;

      case 'back':
        ctx.webview()?.goBack();
        break;

      case 'forward':
        ctx.webview()?.goForward();
        break;

      case 'y':
      case 'yank':
        await ctx.clipboard.yank();
        break;

      case 'bm':
      case 'bookmark': {
        const tab = ctx.state.activeTab.value;
        await ctx.bookmarks.add(args || tab?.title, tab?.url);
        ctx.ui.showToast('Bookmarked current page');
        break;
      }

      case 'bookmarks':
        ctx.ui.setMode('BOOKMARKS');
        break;

      case 'downloads':
      case 'dl':
        ctx.ui.setMode('DOWNLOADS');
        break;

      case 'history':
        ctx.tabs.createTab('keyor://start', true);
        break;

      case 'zoom': {
        const pct = parseInt(args, 10);
        if (!isNaN(pct)) {
          const factor = pct / 100;
          ctx.webview()?.setZoom(factor);
          ctx.ui.showToast(`Zoom set to ${pct}%`);
        }
        break;
      }

      case 'fullscreen':
        ctx.window.fullscreen();
        break;

      case 'devtools':
      case 'inspect':
        ctx.window.devtools();
        break;

      case 'h':
      case 'help':
        ctx.ui.setMode('HELP');
        break;

      case 'colorscheme':
      case 'colo':
      case 'cs':
      case 'theme': {
        if (args) {
          const res = await ctx.theme.switchTheme(args);
          ctx.ui.showToast(
            res.success
              ? `colorscheme ${res.themeId} (${res.themeName})`
              : `Cannot find theme '${args}'. Available: ${(res.available || []).join(', ')}`,
          );
        } else {
          ctx.ui.showToast(`colorscheme: ${ctx.theme.active()} (${ctx.theme.path})`);
        }
        break;
      }

      case 'themes':
      case 'colorschemes':
        ctx.ui.showToast(`Themes: ${ctx.theme.list().join(', ')}`);
        break;

      case 'themeedit':
      case 'edittheme':
      case 'config': {
        const opened = await ctx.theme.editConfig();
        ctx.ui.showToast(opened ? `Opened ${ctx.theme.path}` : `Config: ${ctx.theme.path}`);
        break;
      }

      case 'source':
      case 'so':
        await ctx.reloadConfig();
        ctx.ui.showToast('Sourced ~/.keyor/init.js');
        break;

      case 'quit':
      case 'qa':
        ctx.window.quit();
        break;

      default:
        ctx.ui.showToast(`Unknown command: :${cmd}`);
        break;
    }
  };

  return { execute, AVAILABLE_COMMANDS };
}
