<template>
  <div class="keyor-app" @click="handleAppClick" tabindex="-1" ref="appRoot">
    <!-- Header with Draggable Titlebar & Tabs -->
    <BrowserHeader
      :tabs="tabs"
      :activeTabId="activeTabId"
      :activeTab="activeTab"
      @select-tab="setActiveTab"
      @close-tab="closeTab"
      @new-tab="handleNewTab"
      @nav-back="handleNavBack"
      @nav-forward="handleNavForward"
      @nav-reload="handleNavReload"
      @open-omnibar="openOmnibarCurrent"
      @open-help="openHelpModal"
    />

    <!-- Main Active Webview Viewport -->
    <main class="browser-body">
      <BrowserWebview
        ref="webviewComponent"
        :tabs="tabs"
        :activeTabId="activeTabId"
        :bookmarks="bookmarks"
        :history="history"
        @update-tab="onTabUpdate"
        @new-tab="createTab"
        @vim-key="onWebviewVimKey"
        @mode-change="onWebviewModeChange"
        @open-omnibar="openOmnibarCurrent"
        @open-help="openHelpModal"
        @add-history="onAddHistory"
        @found-in-page="onFoundInPage"
      />
    </main>

    <!-- Bottom Vim Statusline -->
    <BrowserStatusline
      :mode="currentMode"
      :activeTab="activeTab"
      :activeIndex="activeTabIndex"
      :totalTabs="tabs.length"
      :keyBuffer="statusBuffer"
      :hintBuffer="hintBuffer"
      :toastMessage="toastMessage"
      @open-omnibar="openOmnibarCurrent"
      @open-help="openHelpModal"
      @open-downloads="openDownloadsModal"
    />

    <!-- Omnibar Modal ('o', 'O', 't') -->
    <OmnibarModal
      v-if="currentMode === 'OMNIBAR'"
      :initialUrl="omnibarInitialUrl"
      :inNewTab="omnibarInNewTab"
      :bookmarks="bookmarks"
      :history="history"
      @submit="handleOmnibarSubmit"
      @close="closeOmnibar"
    />

    <!-- Vim Command Bar (':') -->
    <CommandBar
      v-if="currentMode === 'COMMAND'"
      @execute="executeVimCommand"
      @close="closeCommandBar"
    />

    <!-- Find In Page ('/') -->
    <FindInPage
      v-if="currentMode === 'FIND'"
      :activeMatchOrdinal="findMatchOrdinal"
      :totalMatches="findTotalMatches"
      @find="handleFindSearch"
      @find-next="handleFindNext"
      @find-prev="handleFindPrev"
      @close="closeFind"
    />

    <!-- Help Modal ('?') -->
    <HelpModal v-if="currentMode === 'HELP'" @close="closeModalToNormal" />

    <!-- Buffer / Tab Switcher ('b') -->
    <BufferSwitcher
      v-if="currentMode === 'BUFFER'"
      :tabs="tabs"
      :activeTabId="activeTabId"
      @select-tab="setActiveTab"
      @close-tab="closeTab"
      @close="closeModalToNormal"
    />

    <!-- Bookmarks Manager ('B') -->
    <BookmarksModal
      v-if="currentMode === 'BOOKMARKS'"
      :bookmarks="bookmarks"
      @open-bookmark="handleOpenBookmark"
      @remove-bookmark="removeBookmark"
      @close="closeModalToNormal"
    />

    <!-- Downloads Manager ('D' / :dl) -->
    <DownloadsModal
      v-if="currentMode === 'DOWNLOADS'"
      @close="closeModalToNormal"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import BrowserHeader from "./components/BrowserHeader.vue";
import BrowserWebview from "./components/BrowserWebview.vue";
import BrowserStatusline from "./components/BrowserStatusline.vue";
import OmnibarModal from "./components/OmnibarModal.vue";
import CommandBar from "./components/CommandBar.vue";
import FindInPage from "./components/FindInPage.vue";
import HelpModal from "./components/HelpModal.vue";
import BufferSwitcher from "./components/BufferSwitcher.vue";
import BookmarksModal from "./components/BookmarksModal.vue";
import DownloadsModal from "./components/DownloadsModal.vue";

import { useTabs } from "./composables/useTabs";
import { useBookmarks } from "./composables/useBookmarks";
import { useHistory } from "./composables/useHistory";
import { useVimKeybindings } from "./composables/useVimKeybindings";
import { useTheme } from "./composables/useTheme";
import { useDownloads } from "./composables/useDownloads";
import { useKeymaps } from "./composables/useKeymaps";
import { useCommands } from "./composables/useCommands";
import { useSession } from "./composables/useSession";
import { createActionRunner } from "./keymaps/actions";
import { canonicalEventKey } from "./config/keymapEngine";

const MODAL_MODES = ["OMNIBAR", "COMMAND", "FIND", "HELP", "BUFFER", "BOOKMARKS", "DOWNLOADS"];

const appRoot = ref(null);
const webviewComponent = ref(null);

const {
  tabs,
  activeTabId,
  activeTab,
  activeTabIndex,
  createTab,
  closeTab,
  restoreClosedTab,
  setActiveTab,
  nextTab,
  prevTab,
  jumpToTab,
  updateTab,
  duplicateTab,
  initTabs,
} = useTabs();

const { bookmarks, addBookmark, removeBookmark } = useBookmarks();
const { history, addHistoryEntry } = useHistory();

const {
  currentMode,
  hintBuffer,
  isHintNewTab,
  toastMessage,
  showToast,
  setMode: rawSetMode,
} = useVimKeybindings();

const keymaps = useKeymaps();
const { options, pendingText, pendingCount } = keymaps;

// Statusline buffer shows the pending keymap sequence plus any count prefix.
const statusBuffer = computed(() => {
  const n = pendingCount.value;
  return (n > 1 ? String(n) : "") + pendingText.value;
});

const setMode = (mode) => {
  rawSetMode(mode);
  if (mode !== "NORMAL" && mode !== "INSERT") {
    webviewComponent.value?.blurActiveWebview();
    window.focus();
  }
  webviewComponent.value?.sendModeToWebview(mode);
  // Only NORMAL / INSERT drive the keymap trie; other modes reset it.
  keymaps.setMode(mode === "INSERT" ? "insert" : "normal");
  if (mode !== "NORMAL" && mode !== "INSERT") keymaps.reset();
};

const {
  activeThemeName,
  availableThemeNames,
  themePath,
  setThemes,
  applyConfig: applyThemeConfig,
  switchTheme,
  openConfigFile,
} = useTheme();

const { initDownloads, registerToastCallback } = useDownloads();
const session = useSession();

// Modal States
const omnibarInitialUrl = ref("");
const omnibarInNewTab = ref(false);
const activeHintCodes = ref([]);

// Find in page stats
const findMatchOrdinal = ref(0);
const findTotalMatches = ref(0);
const lastFindText = ref("");

// Ensure DOM focus returns to the app root so keybindings are always active
const ensureFocus = () => {
  nextTick(() => {
    const active = document.activeElement;
    if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
      active.blur();
    }
    if (appRoot.value) {
      appRoot.value.focus();
    }
  });
};

const handleAppClick = () => {
  if (currentMode.value === "NORMAL") {
    ensureFocus();
  }
};

const onTabUpdate = ({ id, patch }) => updateTab(id, patch);
const onAddHistory = ({ title, url }) => addHistoryEntry(title, url);
const onFoundInPage = ({ activeMatchOrdinal, matches }) => {
  findMatchOrdinal.value = activeMatchOrdinal;
  findTotalMatches.value = matches;
};

// Handlers for Header buttons
const handleNewTab = () => {
  createTab(options.value.homePage || "keyor://start", true);
  showToast("Opened new tab");
  ensureFocus();
};

const handleNavBack = () => webviewComponent.value?.goBack();
const handleNavForward = () => webviewComponent.value?.goForward();
const handleNavReload = () => {
  webviewComponent.value?.reload();
  showToast("Reloading page");
};

// Omnibar trigger
const openOmnibarCurrent = () => {
  omnibarInitialUrl.value = activeTab.value?.url || "";
  omnibarInNewTab.value = false;
  setMode("OMNIBAR");
};

const openOmnibarNewTab = () => {
  omnibarInitialUrl.value = "";
  omnibarInNewTab.value = true;
  setMode("OMNIBAR");
};

const handleOmnibarSubmit = ({ url, inNewTab }) => {
  if (inNewTab) {
    createTab(url, true);
    showToast(`Opened: ${url}`);
  } else {
    updateTab(activeTabId.value, { url, isLoading: !url.startsWith("keyor://") });
    webviewComponent.value?.navigateTo?.(url);
    showToast(`Navigating: ${url}`);
  }
  setMode("NORMAL");
  ensureFocus();
};

const closeOmnibar = () => {
  setMode("NORMAL");
  ensureFocus();
};

const executeVimCommand = async (rawCommand) => {
  await commands.execute(rawCommand);
  ensureFocus();
};

const closeCommandBar = () => {
  setMode("NORMAL");
  ensureFocus();
};

// Find In Page
const handleFindSearch = (text) => {
  lastFindText.value = text;
  webviewComponent.value?.findInPage(text, { forward: true, findNext: false });
};

const handleFindNext = (text) => {
  if (text) lastFindText.value = text;
  webviewComponent.value?.findInPage(lastFindText.value, { forward: true, findNext: true });
};

const handleFindPrev = (text) => {
  if (text) lastFindText.value = text;
  webviewComponent.value?.findInPage(lastFindText.value, { forward: false, findNext: true });
};

const findNextDefault = () => {
  if (!lastFindText.value) {
    showToast("No active search");
    return;
  }
  webviewComponent.value?.findInPage(lastFindText.value, { forward: true, findNext: true });
};

const findPrevDefault = () => {
  if (!lastFindText.value) {
    showToast("No active search");
    return;
  }
  webviewComponent.value?.findInPage(lastFindText.value, { forward: false, findNext: true });
};

const closeFind = () => {
  webviewComponent.value?.stopFindInPage("clearSelection");
  findMatchOrdinal.value = 0;
  findTotalMatches.value = 0;
  setMode("NORMAL");
  ensureFocus();
};

// Modals
const openHelpModal = () => setMode("HELP");
const closeModalToNormal = () => {
  setMode("NORMAL");
  ensureFocus();
};
const handleOpenBookmark = (url) => handleOmnibarSubmit({ url, inNewTab: false });
const openDownloadsModal = () => setMode("DOWNLOADS");

// Clipboard URL Yank
const handleYankUrl = async () => {
  const url = activeTab.value?.url || "";
  if (!url) return;
  try {
    if (window.electronAPI) {
      await window.electronAPI.copyToClipboard(url);
    } else {
      await navigator.clipboard.writeText(url);
    }
    showToast(`Yanked: ${url}`);
  } catch (e) {
    showToast("Failed to copy URL");
  }
};

// Clipboard Paste & Open
const handlePasteOpen = async (newTab = false) => {
  let text = "";
  try {
    if (window.electronAPI) {
      text = await window.electronAPI.readClipboard();
    } else {
      text = await navigator.clipboard.readText();
    }
  } catch (e) {
    showToast("Cannot read clipboard");
    return;
  }
  if (text) handleOmnibarSubmit({ url: text.trim(), inNewTab: newTab });
};

// Hint Mode Runner
const enterHintMode = async (newTab = false) => {
  if (activeTab.value?.url.startsWith("keyor://")) {
    showToast("Hints not active on start page");
    return;
  }

  isHintNewTab.value = newTab;
  setMode("HINT");
  hintBuffer.value = "";

  const res = await webviewComponent.value?.startHintMode();
  if (res && res.codes && res.codes.length > 0) {
    activeHintCodes.value = res.codes;
    showToast(newTab ? "HINT (New Tab): Type letters" : "HINT: Type letters to click", 1800);
  } else {
    showToast("No clickable elements found");
    setMode("NORMAL");
    ensureFocus();
  }
};

const processHintInput = async (char) => {
  const nextBuffer = hintBuffer.value + char.toLowerCase();
  hintBuffer.value = nextBuffer;
  webviewComponent.value?.filterHints(nextBuffer);

  if (activeHintCodes.value.includes(nextBuffer)) {
    const res = await webviewComponent.value?.activateHint(nextBuffer, isHintNewTab.value);
    if (res && res.newTab && res.openUrl) {
      createTab(res.openUrl, true);
      showToast(`Opened: ${res.openUrl} in new tab`);
    } else if (res && res.focusedInput) {
      setMode("INSERT");
      showToast("-- INSERT --", 1200);
      return;
    }
    webviewComponent.value?.clearHints();
    setMode("NORMAL");
    ensureFocus();
    hintBuffer.value = "";
    return;
  }

  const hasPrefixMatch = activeHintCodes.value.some((code) => code.startsWith(nextBuffer));
  if (!hasPrefixMatch) {
    showToast(`No match for '${nextBuffer}'`);
    webviewComponent.value?.clearHints();
    setMode("NORMAL");
    ensureFocus();
    hintBuffer.value = "";
  }
};

// ── Action context & runner ─────────────────────────────────────────────────
const ctx = {
  state: { tabs, activeTab, activeTabId, activeTabIndex },
  tabs: {
    createTab, closeTab, restoreClosedTab, setActiveTab,
    nextTab, prevTab, jumpToTab, updateTab, duplicateTab,
  },
  options: () => options.value,
  webview: () => webviewComponent.value,
  omnibar: {
    openCurrent: openOmnibarCurrent,
    openNew: openOmnibarNewTab,
    submit: handleOmnibarSubmit,
  },
  hints: { enter: enterHintMode },
  ui: { setMode, showToast },
  find: { next: findNextDefault, prev: findPrevDefault },
  clipboard: { yank: handleYankUrl, paste: handlePasteOpen },
  bookmarks: { add: addBookmark, remove: removeBookmark, list: () => bookmarks.value },
  window: {
    fullscreen: () => window.electronAPI?.windowAction("toggle-fullscreen"),
    devtools: () => window.electronAPI?.windowAction("toggle-devtools"),
    quit: () => window.electronAPI?.windowAction("close"),
  },
  theme: {
    switchTheme,
    list: () => availableThemeNames.value,
    active: () => activeThemeName.value,
    editConfig: openConfigFile,
    get path() { return themePath.value; },
  },
  commands: { run: (cmd) => commands.execute(cmd) },
  reloadConfig: async () => {
    const cfg = await keymaps.reloadConfig();
    applyThemeConfig(cfg);
    pushKeymaps();
  },
};

const commands = useCommands(ctx);
const actions = createActionRunner(ctx);
keymaps.setResolver((res) =>
  actions.run(res.action, { args: res.args, count: res.count, keys: res.keys, meta: res.meta }),
);

const pushKeymaps = () => {
  if (!window.electronAPI?.tabViewSetKeymaps) return;
  window.electronAPI.tabViewSetKeymaps({
    normalKeys: keymaps.interceptKeys("normal"),
    insertKeys: keymaps.interceptKeys("insert"),
    timeoutlen: options.value.timeoutlen || 500,
  });
};

// ── Escape / mode dispatch ──────────────────────────────────────────────────
const handleEscape = () => {
  if (currentMode.value === "HINT") {
    webviewComponent.value?.clearHints();
    hintBuffer.value = "";
  }
  keymaps.reset();
  setMode("NORMAL");
  webviewComponent.value?.blurActiveWebview();
  ensureFocus();
  showToast("-- NORMAL --", 1000);
};

const isEditableTarget = (el) => {
  if (!el) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.isContentEditable === true
  );
};

const canonicalFromParts = (d) => {
  const key = d.key === " " ? " " : d.key;
  return canonicalEventKey({
    key,
    ctrlKey: !!d.ctrlKey,
    altKey: !!d.altKey,
    shiftKey: !!d.shiftKey,
    metaKey: !!d.metaKey,
  });
};

// ── Webview preload IPC bridge ──────────────────────────────────────────────
const onWebviewVimKey = (data) => {
  if (currentMode.value === "HINT") {
    if (/^[a-zA-Z]$/.test(data.key)) processHintInput(data.key);
    return;
  }
  const token = data.token || canonicalFromParts(data);
  if (token === "<Esc>") {
    handleEscape();
    return;
  }
  const mode = currentMode.value === "INSERT" ? "insert" : "normal";
  keymaps.feedToken(mode, token, data);
};

const onWebviewModeChange = (mode) => {
  if (mode === currentMode.value) return;
  setMode(mode);
  if (mode === "INSERT") showToast("-- INSERT --", 1200);
  else if (mode === "NORMAL") ensureFocus();
};

// ── Global keydown (renderer chrome has focus) ──────────────────────────────
const handleGlobalKeydown = (e) => {
  // Modals own their typing; Escape always dismisses them (capture phase wins).
  if (MODAL_MODES.includes(currentMode.value)) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      handleEscape();
    }
    return;
  }

  const editing = isEditableTarget(document.activeElement) || currentMode.value === "INSERT";

  if (e.key === "Escape" || ((e.ctrlKey || e.metaKey) && e.key === "[")) {
    e.preventDefault();
    e.stopPropagation();
    handleEscape();
    return;
  }

  if (editing) {
    const res = keymaps.feedEvent("insert", e);
    if (res && (res.status === "consumed" || res.status === "pending" || res.status === "count")) {
      e.preventDefault();
      e.stopPropagation();
    }
    return;
  }

  if (currentMode.value === "HINT") {
    if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      processHintInput(e.key);
    }
    return;
  }

  const res = keymaps.feedEvent("normal", e);
  if (res && (res.status === "consumed" || res.status === "pending" || res.status === "count")) {
    e.preventDefault();
    e.stopPropagation();
  }
};

let unbindOpenNewTab = null;
let unbindWebviewEscape = null;
let unbindConfigChange = null;

onMounted(async () => {
  initDownloads();
  registerToastCallback(showToast);

  const cfg = await keymaps.loadConfig();
  setThemes(cfg.colorschemes, cfg.colorscheme);
  pushKeymaps();

  // Restore the previous session before wiring tabs up.
  const saved = await session.load();
  if (options.value.restoreSession !== false && saved?.tabs?.length) {
    initTabs(saved.tabs, saved.activeIndex);
  }

  window.addEventListener("keydown", handleGlobalKeydown, true);

  if (window.electronAPI?.onOpenNewTab) {
    unbindOpenNewTab = window.electronAPI.onOpenNewTab((url) => {
      if (url) {
        createTab(url, true);
        showToast(`Opened tab: ${url}`);
      }
    });
  }
  if (window.electronAPI?.onWebviewEscape) {
    unbindWebviewEscape = window.electronAPI.onWebviewEscape(() => handleEscape());
  }
  if (window.electronAPI?.onConfigChange) {
    unbindConfigChange = window.electronAPI.onConfigChange((nextCfg) => {
      keymaps.applyConfig(nextCfg);
      applyThemeConfig(nextCfg);
      pushKeymaps();
    });
  }

  ensureFocus();
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleGlobalKeydown, true);
  if (unbindOpenNewTab) unbindOpenNewTab();
  if (unbindWebviewEscape) unbindWebviewEscape();
  if (unbindConfigChange) unbindConfigChange();
});

// Persist the session whenever tabs or the active tab change.
watch(
  () => tabs.value.map((t) => `${t.id}:${t.url}`).join("|"),
  () => session.save(tabs.value, activeTabIndex.value),
);
watch(activeTabId, () => session.save(tabs.value, activeTabIndex.value));
</script>

<style>
@import "./style.css";

.keyor-app {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  color: var(--text-main);
  overflow: hidden;
  outline: none;
}

.browser-body {
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  background: var(--bg-primary);
}
</style>
