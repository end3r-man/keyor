# Keyor ⚡

> **A Keyboard-Focused, Vim-Inspired Web Browser built with Vue.js & Electron**

> [!WARNING]
> ### ⚠️ Experimental Project – Not for Daily Use
> **Keyor is an experimental learning project and is NOT intended for daily browsing.**
> This project serves as an architectural prototype and learning platform to explore keyboard-first modal navigation, Vim paradigms, and input interception techniques before building a full-fledged, native browser directly from the **Chromium source code**.

Keyor brings modal navigation, home-row hinting, and Vim muscle memory to the modern web. Built with **Vue 3**, **Vite**, and **Electron**, Keyor provides a fast, distraction-free browsing experience without needing a mouse.

---

## ✨ Features

- 🎯 **Vim Modal Navigation**: Full modal state machine (`NORMAL`, `INSERT`, `HINT`, `COMMAND`, `FIND`).
- 🏷️ **Home-Row Hint Mode (`f` / `F`)**: Real-time home-row badges overlaid on all visible interactive elements. Type hint characters to click links or focus inputs without touching the mouse (`f` for active tab, `F` to open link in a new tab).
- ⌨️ **Vim Motion & Scrolling**: `j` / `k` (scroll down/up), `d` / `u` (half-page down/up), `Ctrl+d` / `Ctrl+u` / `Ctrl+f` / `Ctrl+b` (page motions), `gg` / `G` (top/bottom of document).
- 📑 **Keyboard Tab Management**: `t` / `T` (new tab), `x` / `X` (close tab), `J` / `K` or `gt` / `gT` (next/prev tab), `U` (undo closed tab), `1gt`..`9gt` / `Alt+1`..`9` (jump to tab index).
- ⚙️ **Neovim-style Config (`~/.keyor/init.js`)**: Remap every key, switch colorschemes, and tune options in one hot-reloading JavaScript config (`:config`, `:source`).
- 🔍 **Omnibar Prompt (`o` / `O`)**: Instant search and URL bar with autocomplete, DuckDuckGo search, bookmarks, and history integration (`o` for current tab, `O` for new tab).
- 💬 **Vim Command Line (`:`)**: Statusline command line supporting `:open`, `:tabnew`, `:close`, `:q`, `:b`, `:reload`, `:yank`, `:bookmark`, `:history`, `:devtools`, `:help`, etc.
- 🔎 **Native In-Page Find (`/`)**: High-speed native Chromium find-in-page with match counter (`n` for next match, `N` for previous match).
- 📊 **Powerline-Style Statusline**: Live mode badge (`NORMAL`, `INSERT`, `HINT`, `COMMAND`, `FIND`), SSL indicator, URL display, pending key sequence buffer, zoom indicator, buffer stats, and scroll percentage (`Top`, `42%`, `Bot`).
- 📋 **URL Yank & Paste (`yy` / `p` / `P`)**: Yank current page URL to system clipboard with `yy`, paste and navigate with `p` / `P`.
- 📦 **Download Manager (`D` / `:dl`)**: Built-in downloads manager with live progress, download speed, one-click open (`Enter`), reveal in file manager (`f`), cancel (`x`), and statusline indicator.
- ⚡ **Start Dashboard (`keyor://start`)**: Clean new tab dashboard with live digital clock, speed dial shortcuts, recent history, and built-in keybinding reference.
- ❓ **Interactive Cheat Sheet (`?`)**: Full searchable cheatsheet modal with categorized keybindings.

---

## ⌨️ Vim Navigation Keybindings

| Key / Sequence | Mode | Action |
|---|---|---|
| `j` / `k` | NORMAL | Scroll down / up (120px) |
| `d` / `u` | NORMAL | Scroll half page down / up (accepts count: `3d`) |
| `Ctrl+d` / `Ctrl+u` | NORMAL | Scroll half page down / up |
| `Ctrl+f` / `Ctrl+b` | NORMAL | Scroll a full page down / up |
| `gg` | NORMAL | Scroll to top of document |
| `G` | NORMAL | Scroll to bottom of document |
| `f` | NORMAL | **Hint mode**: click link, button, or input in current tab |
| `F` | NORMAL | **Hint mode**: open link in a new tab |
| `gi` | NORMAL | Focus first text input on page and enter `INSERT` mode |
| `i` | NORMAL | Enter `INSERT` mode (type into webpage) |
| `Esc` / `Ctrl+[` | ANY | Return to `NORMAL` mode / cancel hints / close dialogs |
| `t` / `Ctrl+t` | NORMAL | Open new tab with Omnibar prompt |
| `T` | NORMAL | Open a new blank tab |
| `x` / `X` | NORMAL | Close current tab |
| `J` / `K` | NORMAL | Switch to next / previous tab |
| `gt` / `gT` | NORMAL | Switch to next / previous tab |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | NORMAL | Switch to next / previous tab |
| `U` | NORMAL | Restore last closed tab (undo tab close) |
| `Y` | NORMAL | Duplicate current tab |
| `1gt`..`9gt` | NORMAL | Jump directly to tab N |
| `Alt+1`..`9` / `Ctrl+1`..`9` | NORMAL / INSERT | Jump directly to tab N |
| `o` | NORMAL | Open Omnibar to navigate or search in current tab |
| `O` | NORMAL | Open Omnibar to navigate or search in new tab |
| `yy` | NORMAL | Yank (copy) current page URL to clipboard |
| `p` / `P` | NORMAL | Paste clipboard and open in current / new tab |
| `H` / `L` | NORMAL | Go back / forward in page history |
| `r` / `R` | NORMAL | Reload page / hard reload (bypass cache) |
| `zi` / `zo` / `zz` | NORMAL | Zoom in / zoom out / reset zoom (100%) |
| `/` | NORMAL | Find in page (`n` next, `N` prev) |
| `:` | NORMAL | Enter Vim command line |
| `b` | NORMAL | Open buffer / tab switcher dialog |
| `B` | NORMAL | Open bookmarks manager |
| `D` / `<leader>d` | NORMAL | Open downloads manager |
| `<leader>b` | NORMAL | Bookmark the current page |
| `?` | NORMAL | Open Vim keybinding cheat sheet modal |

> **Counts:** most motion/tab commands accept a numeric prefix (`5j`, `3gt`, `2d`). The leader key defaults to `Space` and is configurable.

---

## ⚙️ Configuration (`~/.keyor/init.js`)

Keyor is configured by a single Neovim-style JavaScript module at `~/.keyor/init.js`. Edit it in any editor and save — it hot-reloads instantly (no restart).

```js
module.exports = {
  // Active colorscheme (builtins: tokyonight, gruvbox, nord, catppuccin,
  // onedark, rosepine, dracula, everforest, kanagawa, keyor)
  colorscheme: 'tokyonight',

  // Add your own colorschemes:
  colorschemes: {
    mytheme: {
      name: 'My Theme',
      author: 'you',
      type: 'dark',
      colors: {
        bgPrimary: '#101014', bgSecondary: '#0c0c10', bgSurface: '#16161d',
        bgHover: '#20202a', borderSubtle: 'rgba(255,255,255,0.08)',
        borderMuted: 'rgba(255,255,255,0.16)', textMain: '#e6e6f0',
        textMuted: '#a0a0b8', textDim: '#5a5a70', accentVim: '#9ece6a',
        accentBlue: '#7aa2f7', accentCyan: '#7dcfff', accentAmber: '#e0af68',
        accentPurple: '#bb9af7', accentRose: '#f7768e',
      },
    },
  },

  options: {
    leader: '<Space>',
    timeoutlen: 500,
    scrollStep: 120,
    hintChars: 'asdfjklghweruio',
    searchEngine: 'https://duckduckgo.com/?q=',
    homePage: 'keyor://start',
    restoreSession: true,
  },

  // Key notation: multi-key sequences and modifiers.
  //   "gg"  "gt"  "yy"  "<C-d>"  "<A-1>"  "<leader>b"  "<C-S-Tab>"  "<Space>"
  // Values: an action id string, or { action, desc, args }.
  keymaps: {
    normal: {
      // Override just the keys you care about; the rest keep their defaults.
      '<C-j>': { action: 'scroll.down', desc: 'Scroll down' },
      '<leader>t': { action: 'theme.set', args: 'gruvbox', desc: 'Gruvbox theme' },
    },
    insert: {
      '<C-e>': { action: 'mode.normal', desc: 'Back to NORMAL' },
    },
  },
};
```

Only the keys you specify are overridden — everything else falls back to the built-in defaults.

### Managing the config

| Command | Action |
|---|---|
| `:config` / `:themeedit` | Open `~/.keyor/init.js` in your editor |
| `:source` | Reload the config without restarting |
| `:colorscheme <name>` | Switch colorscheme (also persists to config) |
| `:themes` | List available colorschemes |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [pnpm](https://pnpm.io/) (`corepack enable` or `npm i -g pnpm`)

### Install Dependencies

```bash
pnpm install
```

### Run Locally with Electron

```bash
# Starts Vite dev server + launches Electron desktop browser
pnpm dev:electron
```

### Run Web Preview

```bash
# Starts Vite dev server for browser preview
pnpm dev
```

### Production Build

```bash
pnpm build
```

---

## 🏗️ Project Architecture

```
keyor/
├── electron/
│   ├── main.cjs            # Electron main process (window, frameless chrome, IPC, persistence)
│   ├── tab-views.cjs       # Native WebContentsView manager for browser tabs via BrowserWindow.contentView
│   ├── preload.cjs         # ContextBridge preload script exposing safe desktop APIs
│   ├── config.cjs          # ~/.keyor/init.js loader, writer, hot-reload watcher
│   ├── themes.cjs          # Builtin colorscheme definitions (BUILTIN_THEMES)
│   ├── downloads.cjs       # Electron download manager with session tracking
│   └── webview-preload.cjs # Preload injected into tabs to capture vim keys, detect inputs & scroll
├── src/
│   ├── config/
│   │   ├── keymapEngine.js      # Neovim-style key sequence engine (trie, counts, timeoutlen)
│   │   └── defaultConfig.js     # Built-in options, keymaps & fallback config
│   ├── keymaps/
│   │   └── actions.js           # Action registry + runner (keymap values -> operations)
│   ├── components/
│   │   ├── BrowserHeader.vue     # Frameless titlebar, tabs with index badges, window controls
│   │   ├── BrowserWebview.vue    # Viewport anchor, hint runner & bridge to native WebContentsView
│   │   ├── BrowserStatusline.vue # Vim airline/lualine statusline (modes, URL, stats, toasts)
│   │   ├── OmnibarModal.vue      # Floating URL / search bar with suggestions ('o' / 'O')
│   │   ├── CommandBar.vue        # Vim command line prompt with autocomplete (':')
│   │   ├── FindInPage.vue        # In-page search bar with match counter ('/')
│   │   ├── HelpModal.vue         # Searchable Vim keybinding cheat sheet ('?')
│   │   ├── BufferSwitcher.vue    # Buffer / tab switcher dialog ('b')
│   │   ├── BookmarksModal.vue    # Bookmarks manager ('B')
│   │   └── NewTabPage.vue        # Start page dashboard (clock, speed dials, key reference)
│   ├── composables/
│   │   ├── useTabs.js            # Reactive tab management & undo closed stack
│   │   ├── useBookmarks.js       # Bookmarks storage & persistence
│   │   ├── useHistory.js         # Navigation history logger & search
│   │   ├── useDownloads.js       # Download tracking & statusline indicator
│   │   ├── useKeymaps.js         # Reactive keymap config + engine wiring
│   │   ├── useCommands.js        # Vim `:` command-line execution
│   │   ├── useSession.js         # Tab session persistence & restore
│   │   ├── useTheme.js           # Config-driven colorscheme engine
│   │   └── useVimKeybindings.js  # Vim mode state, hint buffer, notifications
│   ├── utils/
│   │   └── hintEngine.js         # Interactive DOM element scanner & badge overlay generator
│   ├── App.vue                   # Core orchestration & global keyboard listener
│   ├── main.js                   # Vue entry point
│   └── style.css                 # Dark theme design system & typography tokens
├── index.html                    # Root HTML document
├── package.json
└── vite.config.js
```

---

## 📜 License

This project is licensed under the [GNU General Public License v3.0](LICENSE) (GPL-3.0).
