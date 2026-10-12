# Keyor ⚡

> **A Keyboard-Focused, Vim-Inspired Web Browser built with Vue.js & Electron**

Keyor brings modal navigation, home-row hinting, and Vim muscle memory to the modern web. Built with **Vue 3**, **Vite**, and **Electron**, Keyor provides a fast, distraction-free browsing experience without needing a mouse.

---

## ✨ Features

- 🎯 **Vim Modal Navigation**: Full modal state machine (`NORMAL`, `INSERT`, `HINT`, `COMMAND`, `FIND`).
- 🏷️ **Home-Row Hint Mode (`f` / `F`)**: Real-time home-row badges overlaid on all visible interactive elements. Type hint characters to click links or focus inputs without touching the mouse (`f` for active tab, `F` to open link in a new tab).
- ⌨️ **Vim Motion & Scrolling**: `j` / `k` (scroll down/up), `d` / `u` (half-page down/up), `gg` / `G` (top/bottom of document).
- 📑 **Keyboard Tab Management**: `t` (new tab), `x` or `d` (close tab), `J` / `K` or `gt` / `gT` (next/prev tab), `u` / `U` (undo closed tab), `1gt`..`9gt` (jump to tab index).
- 🔍 **Omnibar Prompt (`o` / `O`)**: Instant search and URL bar with autocomplete, DuckDuckGo search, bookmarks, and history integration (`o` for current tab, `O` for new tab).
- 💬 **Vim Command Line (`:`)**: Statusline command line supporting `:open`, `:tabnew`, `:close`, `:q`, `:b`, `:reload`, `:yank`, `:bookmark`, `:history`, `:devtools`, `:help`, etc.
- 🔎 **Native In-Page Find (`/`)**: High-speed native Chromium find-in-page with match counter (`n` for next match, `N` for previous match).
- 📊 **Powerline-Style Statusline**: Live mode badge (`NORMAL`, `INSERT`, `HINT`, `COMMAND`, `FIND`), SSL indicator, URL display, pending key sequence buffer, zoom indicator, buffer stats, and scroll percentage (`Top`, `42%`, `Bot`).
- 📋 **URL Yank & Paste (`yy` / `p` / `P`)**: Yank current page URL to system clipboard with `yy`, paste and navigate with `p` / `P`.
- ⚡ **Start Dashboard (`keyor://start`)**: Clean new tab dashboard with live digital clock, speed dial shortcuts, recent history, and built-in keybinding reference.
- ❓ **Interactive Cheat Sheet (`?`)**: Full searchable cheatsheet modal with categorized keybindings.

---

## ⌨️ Vim Navigation Keybindings

| Key / Sequence | Mode | Action |
|---|---|---|
| `j` / `k` | NORMAL | Scroll down / up (120px) |
| `d` / `u` | NORMAL | Scroll half page down / up |
| `gg` | NORMAL | Scroll to top of document |
| `G` | NORMAL | Scroll to bottom of document |
| `f` | NORMAL | **Hint mode**: click link, button, or input in current tab |
| `F` | NORMAL | **Hint mode**: open link in a new tab |
| `gi` | NORMAL | Focus first text input on page and enter `INSERT` mode |
| `i` | NORMAL | Enter `INSERT` mode (type into webpage) |
| `Esc` / `Ctrl+[` | ANY | Return to `NORMAL` mode / cancel hints / close dialogs |
| `t` | NORMAL | Open new tab with Omnibar prompt |
| `x` | NORMAL | Close current tab |
| `J` / `K` | NORMAL | Switch to next / previous tab |
| `gt` / `gT` | NORMAL | Switch to next / previous tab |
| `u` / `U` | NORMAL | Restore last closed tab (undo tab close) |
| `1gt`..`9gt` | NORMAL | Jump directly to tab N |
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
| `?` | NORMAL | Open Vim keybinding cheat sheet modal |

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
│   ├── preload.cjs         # ContextBridge preload script exposing safe desktop APIs
│   └── webview-preload.cjs # Preload injected into <webview> to capture vim keys, detect inputs & scroll
├── src/
│   ├── components/
│   │   ├── BrowserHeader.vue     # Frameless titlebar, tabs with index badges, window controls
│   │   ├── BrowserWebview.vue    # Webview container, hint injector & runner, scroll controls
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
│   │   └── useVimKeybindings.js  # Vim state machine, key buffer, notifications
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

MIT
