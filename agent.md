# Keyor — Agent Instructions & Technical Blueprint

> **File:** `agent.md`  
> **Target Audience:** AI Agents & Developers working on Keyor  
> **Package Manager:** `pnpm` exclusively  

---

## 1. Project Overview & Philosophy

**Keyor** is a desktop web browser engineered for keyboard-first navigation and Vim muscle memory, built with **Vue 3**, **Vite**, and **Electron**.

### Core Philosophy
1. **Zero Mouse Dependency:** Every single action (navigating, switching tabs, clicking links, searching, closing dialogs) can be performed rapidly from the home row.
2. **Modal Architecture:** Strict state machine modes (`NORMAL`, `INSERT`, `HINT`, `COMMAND`, `FIND`, `HELP`, `BUFFER`, `BOOKMARKS`).
3. **Clean Hairline Aesthetic:** Muted dark tones, hairline borders (`1px solid var(--border-subtle)`), flat minimalist keycaps (`kbd`), and typography powered by `Inter` (UI) and `JetBrains Mono` (code/statusline).
4. **Vim Theme First:** Themes are defined and loaded from the user's home directory (`~/.keyor/theme.json`), supporting live hot-reloading when edited in external editors (Vim/Neovim).

---

## 2. Technology Stack & Commands

| Tool | Version / Purpose |
|---|---|
| **Vue.js** | Vue 3 (Composition API, `<script setup>`) |
| **Electron** | Desktop shell, frameless window, modern `WebContentsView` via `BrowserWindow.contentView` |
| **Vite** | Bundler & Dev Server (`base: './'` configured) |
| **CSS** | Vanilla CSS with dynamic CSS variables on `:root` |
| **Package Manager** | `pnpm` |

### Key Terminal Commands
```bash
# Run desktop dev environment (Vite dev server + Electron)
pnpm dev:electron

# Run standalone web dev server
pnpm dev

# Build production bundle (client assets -> dist/)
pnpm build

# Launch packaged/dist Electron app
pnpm start
```

---

## 3. Directory Structure & Architecture

```
keyor/
├── electron/
│   ├── main.cjs               # Main process: window lifecycle, IPC handlers, persistence, config watcher
│   ├── tab-views.cjs          # Native WebContentsView manager: tab lifecycle, bounds, mode & keymap integration
│   ├── downloads.cjs          # Download manager: active downloads, persistence, and file actions
│   ├── config.cjs             # ~/.keyor/init.js: build/read/save, hot-reload watcher, default template
│   ├── themes.cjs             # Builtin colorscheme palettes (BUILTIN_THEMES)
│   ├── preload.cjs            # ContextBridge: safe desktop API exposure
│   └── webview-preload.cjs    # Guest script injected into tabs: keyboard capture & hints
├── src/
│   ├── config/
│   │   ├── keymapEngine.js         # Key sequence trie: multi-key, modifiers, counts, timeoutlen
│   │   └── defaultConfig.js        # Built-in options/keymaps + web-preview fallback
│   ├── keymaps/
│   │   └── actions.js              # Action registry, categoryFor(), createActionRunner(ctx)
│   ├── components/
│   │   ├── BrowserHeader.vue       # Frameless titlebar & numbered tab bar (:1, :2, etc.)
│   │   ├── BrowserWebview.vue      # Viewport anchor, hint runner, and WebContentsView bridge
│   │   ├── BrowserStatusline.vue   # Powerline statusline (mode, zoom, scroll %, audio, downloads)
│   │   ├── CommandBar.vue          # Vim command line (:) with live autocomplete
│   │   ├── OmnibarModal.vue        # URL & search bar prompt (o, O, t)
│   │   ├── BufferSwitcher.vue      # Tab/buffer switcher modal (b)
│   │   ├── BookmarksModal.vue      # Bookmarks manager modal (B)
│   │   ├── DownloadsModal.vue      # Downloads manager modal (D / :dl)
│   │   ├── FindInPage.vue          # In-page text search overlay (/)
│   │   ├── HelpModal.vue           # Searchable keybindings cheatsheet (?)
│   │   └── NewTabPage.vue          # Internal start dashboard (keyor://start)
│   ├── composables/
│   │   ├── useTabs.js              # Tab state machine & closed tab history stack (U)
│   │   ├── useKeymaps.js           # Reactive config + KeymapEngine singleton (load/apply/feed)
│   │   ├── useCommands.js          # Vim `:` command-line execution (AVAILABLE_COMMANDS)
│   │   ├── useSession.js           # Tab session persistence & restore
│   │   ├── useTheme.js             # Config-driven colorscheme engine, CSS variable injector
│   │   ├── useDownloads.js         # Reactive downloads state, real-time events & formatters
│   │   ├── useVimKeybindings.js    # Mode state, hint buffer, toast alerts
│   │   ├── useBookmarks.js         # Bookmarks persistence
│   │   └── useHistory.js           # Navigation history persistence
│   ├── utils/
│   │   └── hintEngine.js           # Home-row link hinting algorithms & script generators
│   ├── App.vue                     # Root coordinator & global keydown dispatcher
│   ├── main.js                     # Vue entrypoint
│   └── style.css                   # Global styles & CSS design tokens
├── vite.config.js                  # Vite configuration (must keep base: './')
├── package.json                    # Project metadata & scripts
└── agent.md                        # This document
```

---

## 4. Modal State Machine & Keybindings

All modal states are coordinated by `useVimKeybindings.js` and dispatched through `App.vue`:

| Mode | Trigger | Exit | Behavior |
|---|---|---|---|
| `NORMAL` | Default / `Esc` | — | Standard Vim motion & single/multi-key sequences |
| `INSERT` | `i` or `gi` | `Esc` / `Ctrl+[` | User types directly into web page inputs |
| `HINT` | `f` / `F` | `Esc` / letter match | Badges appear over links/buttons; typing letters clicks element |
| `COMMAND` | `:` | `Esc` / `Enter` | Vim command line with autocomplete dropup |
| `OMNIBAR` | `o` / `O` / `t` | `Esc` / `Enter` | Search engine & URL bar |
| `FIND` | `/` | `Esc` / `Enter` | Native Chromium in-page search (`n` next, `N` prev) |
| `BUFFER` | `b` | `Esc` / `Enter` | Modal buffer / tab switcher |
| `BOOKMARKS`| `B` | `Esc` / click | Bookmarks manager modal |
| `DOWNLOADS`| `D` or `:dl` | `Esc` / click | Downloads manager modal (progress, open, reveal in folder) |
| `HELP` | `?` | `Esc` / click | Interactive Vim cheatsheet |

### Essential Navigation Keybindings
- **Scroll:** `j` (down), `k` (up), `d` (half-down), `u` (half-up), `Ctrl+d`/`Ctrl+u`/`Ctrl+f`/`Ctrl+b`, `gg` (top), `G` (bottom).
- **Tabs:** `t`/`T` (new tab), `x`/`X` (close tab), `J`/`K` (next/prev), `U` (restore closed tab), `Y` (duplicate), `1gt`..`9gt` / `Alt+1`..`9` (jump to tab N).
- **Hints:** `f` (open in active tab), `F` (open in new tab), `gi` (focus first input).
- **Clipboard & Downloads:** `yy` (yank current URL), `p` (open clipboard in tab), `P` (open clipboard in new tab), `D` (open Downloads manager).
- **History & Zoom:** `H` / `L` (back/forward), `r` / `R` (reload/hard-reload), `zi` / `zo` / `zz` (zoom in/out/reset).

> **Important:** keybindings are **no longer hardcoded in `App.vue`**. They live in the config (`~/.keyor/init.js`, mirrored by `src/config/defaultConfig.js`) and are resolved by `KeymapEngine` + the action registry. To change a binding, edit the config, not the dispatcher.

---

## 5. Config System (`~/.keyor/init.js`)

One Neovim-style JavaScript module configures **everything**: colorscheme, custom colorschemes, options, and keymaps. It hot-reloads on save (no restart), exactly like `init.lua`.

```js
module.exports = {
  colorscheme: 'tokyonight',
  colorschemes: { /* custom { name, author, type, colors } entries */ },
  options: {
    leader: '<Space>', timeoutlen: 500, scrollStep: 120,
    hintChars: 'asdfjklghweruio', searchEngine: 'https://duckduckgo.com/?q=',
    homePage: 'keyor://start', restoreSession: true,
  },
  keymaps: {
    normal: { '<C-j>': 'scroll.down', '<leader>t': { action: 'theme.set', args: 'gruvbox' } },
    insert: { '<C-e>': 'mode.normal' },
  },
};
```

- **Key notation:** multi-key sequences and modifiers — `"gg"`, `"gt"`, `"yy"`, `"<C-d>"`, `"<A-1>"`, `"<leader>b"`, `"<C-S-Tab>"`, `"<Space>"`.
- **Mapping values:** a plain action id string, or `{ action, desc, args }`.
- **Counts:** motion/tab actions accept a numeric prefix (`5j`, `3gt`, `2d`).
- **Merging:** only keys you specify are overridden; the rest fall back to built-in defaults.

### Data flow
- `electron/config.cjs` builds/reads/writes the file, merges `BUILTIN_THEMES` into `colorschemes`, and watches `~/.keyor` (`fs.watch`) → emits `config-changed`.
- `useKeymaps` loads config, feeds `KeymapEngine` (`src/config/keymapEngine.js`) and pushes the guest intercept key list to `tab-views.cjs` (`SET_KEYMAPS`) so only configured keys are hijacked inside pages.
- `useTheme` applies `config.colorschemes[config.colorscheme].colors` to CSS variables.

### Pre-loaded Vim Themes
- `tokyonight` (Tokyo Night — folke)
- `gruvbox` (Gruvbox Dark — morhetz)
- `nord` (Nord — arcticicestudio)
- `catppuccin` (Catppuccin Mocha)
- `onedark` (One Dark Pro — atom)
- `rosepine` (Rosé Pine)
- `dracula` (Dracula)
- `everforest` (Everforest — sainnhe)
- `kanagawa` (Kanagawa — rebelot)
- `keyor` (Keyor Obsidian Dark default)

### Theme CSS Variables
All components must use these variables instead of hardcoded hex values:
- Backgrounds: `--bg-primary`, `--bg-secondary`, `--bg-surface`, `--bg-hover`
- Borders: `--border-subtle`, `--border-muted`
- Text: `--text-main`, `--text-muted`, `--text-dim`
- Accents: `--accent-vim`, `--accent-blue`, `--accent-cyan`, `--accent-amber`, `--accent-purple`, `--accent-rose`

### Vim Commands for Config & Themes
- `:colorscheme <name>` or `:colo <name>`: Switch theme (persists to config).
- `:colorscheme`: Print current theme and config location.
- `:themes` / `:colorschemes`: List all available colorschemes.
- `:config` / `:themeedit`: Open `~/.keyor/init.js` in the system editor.
- `:source` / `:so`: Reload `~/.keyor/init.js` without restarting.

### Live Hot-Reloading
`electron/config.cjs` watches `~/.keyor` via `fs.watch`. When `init.js` is modified in an external editor, Electron emits `config-changed`; `useKeymaps` re-applies the keymap engine and `useTheme` immediately updates CSS variables — no restart required.

---

## 6. Critical Engineering Gotchas & Rules

When modifying or extending Keyor, follow these strict guidelines:

### 1. Tabs use native `WebContentsView` (NOT `<webview>`)
- Browser tabs are `WebContentsView`s attached to `BrowserWindow.contentView` and managed by `electron/tab-views.cjs`. There is no `<webview>` custom element; do not add one back.
- Guest keyboard capture happens in `electron/webview-preload.cjs`, and it is fed by `before-input-event` + `host-message` (`SET_KEYMAPS` / `SET_MODE`) — not by renderer-side key listeners.
- Always wrap `webContents.loadURL(...)` with `.catch((err) => { if (err?.errno !== -3 && err?.code !== 'ERR_ABORTED') ... })` to suppress normal `-3` abort noise.
- The internal `keyor://start` page is rendered by Vue, so its tab view stays hidden.

### 1b. Only intercept configured keys (guest vs renderer)
- The renderer sends the authoritative `{ normalKeys, insertKeys }` set (from `useKeymaps.interceptKeys`) to the main process, which forwards it to each guest via `SET_KEYMAPS`. Never hardcode a key list in the preload.
- A single key press must be handled exactly once: the guest (via `webview-ipc-message`) or the renderer (`window` capture listener) — never both. Do not also emit a `VIM_KEY` for Escape from the preload; `before-input-event` already reports it.

### 2. Vite Asset Base
- In `vite.config.js`, `base: './'` must always be set. Without relative paths, standalone Electron builds (`loadFile('dist/index.html')`) fail with 404 errors on root-relative `/assets/...`.

### 3. Keyboard Focus Retention (`ensureFocus()`)
- When modals close (`Escape`, `Enter`, or submission), always invoke `ensureFocus()` in `App.vue` (`nextTick(() => { document.activeElement.blur(); appRoot.value.focus(); })`). If focus is lost or trapped inside a hidden input, normal mode Vim keybindings will stop responding.

### 4. IPC Serialization
- Never pass Vue 3 `ref` or `reactive` Proxy objects directly across Electron IPC. Always pass plain objects or serialize with `JSON.parse(JSON.stringify(...))`.

### 5. Styling Integrity
- **Hairline Borders Only:** Maintain `1px solid var(--border-subtle)` (`rgba(255, 255, 255, 0.07)`). Do not add heavy borders, solid outlines, or garish box-shadows.
- **No Hardcoded Hex Colors for Layout Containers:** Use CSS variables so every modal, panel, and toolbar changes theme dynamically.

---

## 7. How to Add New Features

### Adding a New Action (backing a keybinding)
1. Open `src/keymaps/actions.js`:
   - Add metadata to `ACTION_META` (`'mygroup.thing': { desc: '...' }`) and map the prefix in `CATEGORY_BY_PREFIX` if it is a new category.
   - Add the implementation to the `actions` object inside `createActionRunner(ctx)` (`'mygroup.thing': (payload) => { ... }`). Use only `ctx.*` — never reach into components directly.
2. Wire any missing capability onto the `ctx` object in `App.vue`.
3. Bind it: add the mapping to `electron/config.cjs` (`buildDefaultKeymaps`) and `src/config/defaultConfig.js` (keep both in sync). The HelpModal builds itself from these keymaps automatically.

### Adding a New Keybinding (user-facing)
- No code change required — edit `~/.keyor/init.js` and set `keymaps.normal` / `keymaps.insert` entries, e.g. `'<C-j>': 'scroll.down'`. Save to hot-reload.
- To also ship it as a default, update `buildDefaultKeymaps()` in `electron/config.cjs` and `defaultConfig.js`.

### Adding a New Vim `:` Command
1. Open `src/composables/useCommands.js`:
   - Add the command object to `AVAILABLE_COMMANDS` (`{ name, args, desc }`).
   - Add a `case` in `execute()` using only `ctx.*`.
2. Open `src/components/CommandBar.vue` and add the matching entry to its local `AVAILABLE_COMMANDS` (autocomplete list).

### Adding a New Builtin Colorscheme
1. Open `electron/themes.cjs`:
   - Add the palette to `BUILTIN_THEMES`. It is merged into `config.colorschemes` automatically and appears in `:themes` and the HelpModal command list.
   - `useTheme.js` needs no change (main supplies the palette; the web preview uses a small fallback).
