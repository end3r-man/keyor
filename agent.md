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
| **Electron** | Desktop shell, frameless window, native `<webview>` tags |
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
│   ├── main.cjs               # Main process: window lifecycle, IPC handlers, web-contents guard
│   ├── themes.cjs             # Theme manager: ~/.keyor/theme.json initialization & watcher
│   ├── preload.cjs            # ContextBridge: safe desktop API exposure
│   └── webview-preload.cjs    # Guest script injected into <webview>: keyboard bridge & hints
├── src/
│   ├── components/
│   │   ├── BrowserHeader.vue       # Frameless titlebar & numbered tab bar (:1, :2, etc.)
│   │   ├── BrowserWebview.vue      # Active webviews, hint runner, and navigation controller
│   │   ├── BrowserStatusline.vue   # Powerline statusline (mode, zoom, scroll %, audio)
│   │   ├── CommandBar.vue          # Vim command line (:) with live autocomplete
│   │   ├── OmnibarModal.vue        # URL & search bar prompt (o, O, t)
│   │   ├── BufferSwitcher.vue      # Tab/buffer switcher modal (b)
│   │   ├── BookmarksModal.vue      # Bookmarks manager modal (B)
│   │   ├── FindInPage.vue          # In-page text search overlay (/)
│   │   ├── HelpModal.vue           # Searchable keybindings cheatsheet (?)
│   │   └── NewTabPage.vue          # Internal start dashboard (keyor://start)
│   ├── composables/
│   │   ├── useTabs.js              # Tab state machine & closed tab history stack (u)
│   │   ├── useTheme.js             # Vim theme engine, CSS variable injector & watcher listener
│   │   ├── useVimKeybindings.js    # Mode state, pending key sequences, toast alerts
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
| `HELP` | `?` | `Esc` / click | Interactive Vim cheatsheet |

### Essential Navigation Keybindings
- **Scroll:** `j` (down), `k` (up), `d` (half-down), `u` (half-up), `gg` (top), `G` (bottom).
- **Tabs:** `t` (new tab), `x` / `d` (close tab), `J` / `K` (next/prev tab), `u` / `U` (restore closed tab), `1`..`9` / `:1`..`:9` (direct jump to tab index).
- **Hints:** `f` (open in active tab), `F` (open in new tab), `gi` (focus first input).
- **Clipboard:** `yy` (yank current URL), `p` (open clipboard in tab), `P` (open clipboard in new tab).
- **History & Zoom:** `H` / `L` (back/forward), `r` / `R` (reload/hard-reload), `zi` / `zo` / `zz` (zoom in/out/reset).

---

## 5. Theme System (`~/.keyor/theme.json`)

Keyor stores its colorscheme in the user's home directory under `~/.keyor/theme.json`.

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

### Vim Commands for Themes
- `:colorscheme <name>` or `:colo <name>`: Switch theme.
- `:colorscheme`: Print current theme and config location.
- `:themes`: List all available themes.
- `:themeedit`: Open `~/.keyor/theme.json` in system editor.

### Live Hot-Reloading
`electron/themes.cjs` watches `~/.keyor` via `fs.watch`. When `theme.json` is modified in an external editor, Electron emits `theme-changed` and `useTheme.js` immediately updates CSS variables without restarting the application.

---

## 6. Critical Engineering Gotchas & Rules

When modifying or extending Keyor, follow these strict guidelines:

### 1. Electron `<webview>` Navigation (`ERR_ABORTED -3`)
- **Do not trigger concurrent double-loads.** When transitioning from `keyor://start` to an external URL, Vue conditionally mounts `<webview :src="url">`, which automatically initiates navigation. Do not simultaneously call `wv.loadURL(url)`.
- Always wrap `wv.loadURL(url)` with `.catch((err) => { if (err?.errno !== -3) ... })` to avoid unhandled promise rejections in Electron's `GUEST_VIEW_MANAGER_CALL`.
- Handle `did-fail-load` on both the `<webview>` element and `web-contents-created` in `main.cjs` to suppress normal `-3` (`ERR_ABORTED`) noise from redirects.

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

### Adding a New Vim Command
1. Open `src/components/CommandBar.vue`:
   - Add the command object to `AVAILABLE_COMMANDS` (`{ name, args, desc }`).
2. Open `src/App.vue`:
   - Add a case inside `executeVimCommand(rawCommand)` to handle execution and display toast feedback.

### Adding a New Keybinding Sequence
1. Open `src/App.vue`:
   - Inside `handleVimKey(key, event)` under `currentMode === "NORMAL"`:
   - Handle single-key shortcuts in the `switch (key)` block.
   - For multi-key sequences (e.g. `yy`, `gg`, `dd`), check `keyBuffer.value` before clearing with `clearKeyBuffer()`.
2. Open `src/components/HelpModal.vue` and `src/components/NewTabPage.vue`:
   - Add the new binding to the cheatsheet tables.

### Adding a New Builtin Theme
1. Open `electron/themes.cjs`:
   - Add the palette definition to `BUILTIN_THEMES`.
2. Open `src/composables/useTheme.js`:
   - Add the fallback definition to `FALLBACK_THEMES`.
