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
      :keyBuffer="keyBuffer"
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
    <HelpModal v-if="currentMode === 'HELP'" @close="closeHelpModal" />

    <!-- Buffer / Tab Switcher ('b') -->
    <BufferSwitcher
      v-if="currentMode === 'BUFFER'"
      :tabs="tabs"
      :activeTabId="activeTabId"
      @select-tab="setActiveTab"
      @close-tab="closeTab"
      @close="closeBufferSwitcher"
    />

    <!-- Bookmarks Manager ('B') -->
    <BookmarksModal
      v-if="currentMode === 'BOOKMARKS'"
      :bookmarks="bookmarks"
      @open-bookmark="handleOpenBookmark"
      @remove-bookmark="removeBookmark"
      @close="closeBookmarksModal"
    />

    <!-- Downloads Manager ('D' / :dl) -->
    <DownloadsModal
      v-if="currentMode === 'DOWNLOADS'"
      @close="closeDownloadsModal"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from "vue";
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
} = useTabs();

const { bookmarks, addBookmark, removeBookmark } = useBookmarks();
const { history, addHistoryEntry } = useHistory();

const {
  currentMode,
  keyBuffer,
  hintBuffer,
  isHintNewTab,
  toastMessage,
  showToast,
  setMode: rawSetMode,
  appendKeyBuffer,
  clearKeyBuffer,
} = useVimKeybindings();

const setMode = (mode) => {
  rawSetMode(mode);
  if (mode !== "NORMAL" && mode !== "INSERT") {
    webviewComponent.value?.blurActiveWebview();
    window.focus();
  }
  webviewComponent.value?.sendModeToWebview(mode);
};

const {
  activeThemeName,
  currentTheme,
  availableThemeNames,
  availableThemesList,
  themePath,
  initTheme,
  switchTheme,
  openConfigFile
} = useTheme();

const { initDownloads, registerToastCallback } = useDownloads();

// Modal States
const omnibarInitialUrl = ref("");
const omnibarInNewTab = ref(false);
const activeHintCodes = ref([]);

// Find in page stats
const findMatchOrdinal = ref(0);
const findTotalMatches = ref(0);

// Ensure DOM focus returns to the app root so keybindings are always active
const ensureFocus = () => {
  nextTick(() => {
    const active = document.activeElement;
    if (
      active &&
      (active.tagName === "INPUT" || active.tagName === "TEXTAREA")
    ) {
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

let unbindOpenNewTab = null;
let unbindWebviewEscape = null;

onMounted(() => {
  initTheme();
  initDownloads();
  registerToastCallback(showToast);
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
    unbindWebviewEscape = window.electronAPI.onWebviewEscape(() => {
      handleVimKey("Escape");
    });
  }
  ensureFocus();
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleGlobalKeydown, true);
  if (unbindOpenNewTab) unbindOpenNewTab();
  if (unbindWebviewEscape) unbindWebviewEscape();
});

const onTabUpdate = ({ id, patch }) => {
  updateTab(id, patch);
};

const onAddHistory = ({ title, url }) => {
  addHistoryEntry(title, url);
};

const onFoundInPage = ({ activeMatchOrdinal, matches }) => {
  findMatchOrdinal.value = activeMatchOrdinal;
  findTotalMatches.value = matches;
};

// Handlers for Header buttons
const handleNewTab = () => {
  createTab("keyor://start", true);
  showToast("Opened new tab");
  ensureFocus();
};

const handleNavBack = () => {
  webviewComponent.value?.goBack();
};

const handleNavForward = () => {
  webviewComponent.value?.goForward();
};

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
    const wasStartPage = activeTab.value?.url?.startsWith("keyor://start");
    updateTab(activeTabId.value, { url, isLoading: true });
    // If not on start page, we tell the existing mounted webview to navigate
    if (!wasStartPage && webviewComponent.value?.navigateTo) {
      webviewComponent.value.navigateTo(url);
    }
    showToast(`Navigating: ${url}`);
  }
  setMode("NORMAL");
  ensureFocus();
};

const closeOmnibar = () => {
  setMode("NORMAL");
  ensureFocus();
};

// Vim Command Bar Execution
const executeVimCommand = async (rawCommand) => {
  let text = (rawCommand || "").trim();
  // Strip leading colons (e.g., ':1' -> '1', ':::open' -> 'open')
  text = text.replace(/^:+/, "").trim();

  if (!text) {
    setMode("NORMAL");
    ensureFocus();
    return;
  }

  const parts = text.split(/\s+/);
  let cmd = parts[0]?.toLowerCase() || "";
  const args = parts.slice(1).join(" ");

  setMode("NORMAL");
  ensureFocus();

  // 1. Direct number e.g. ':1', ':2', ':3'
  if (/^\d+$/.test(cmd)) {
    const tabIndex = parseInt(cmd, 10);
    const ok = jumpToTab(tabIndex);
    if (ok) {
      showToast(`Jumped to tab ${tabIndex}`);
    } else {
      showToast(`Tab ${tabIndex} does not exist (${tabs.value.length} open)`);
    }
    return;
  }

  // 2. Buffer number shorthand e.g. ':b1', ':b2', ':tab1'
  if (/^b\d+$/.test(cmd)) {
    const tabIndex = parseInt(cmd.slice(1), 10);
    const ok = jumpToTab(tabIndex);
    if (ok) {
      showToast(`Jumped to tab ${tabIndex}`);
    } else {
      showToast(`Tab ${tabIndex} does not exist (${tabs.value.length} open)`);
    }
    return;
  }

  if (/^tab\d+$/.test(cmd)) {
    const tabIndex = parseInt(cmd.slice(3), 10);
    const ok = jumpToTab(tabIndex);
    if (ok) {
      showToast(`Jumped to tab ${tabIndex}`);
    } else {
      showToast(`Tab ${tabIndex} does not exist (${tabs.value.length} open)`);
    }
    return;
  }

  // 3. Named commands
  switch (cmd) {
    case "o":
    case "open":
      if (args) {
        handleOmnibarSubmit({ url: args, inNewTab: false });
      } else {
        openOmnibarCurrent();
      }
      break;

    case "t":
    case "tabnew":
      if (args) {
        createTab(args, true);
        showToast(`Opened tab: ${args}`);
      } else {
        createTab("keyor://start", true);
        showToast("Opened new tab");
      }
      break;

    case "q":
    case "close":
    case "tabclose":
      closeTab(activeTabId.value);
      showToast("Closed tab");
      break;

    case "tabnext":
    case "tn":
    case "bnext":
      nextTab();
      showToast(`Tab ${activeTabIndex.value + 1}/${tabs.value.length}`);
      break;

    case "tabprev":
    case "tp":
    case "bprev":
      prevTab();
      showToast(`Tab ${activeTabIndex.value + 1}/${tabs.value.length}`);
      break;

    case "b":
    case "buffer":
    case "tab":
      if (args) {
        const num = parseInt(args, 10);
        if (!isNaN(num)) {
          const ok = jumpToTab(num);
          if (ok) {
            showToast(`Jumped to tab ${num}`);
          } else {
            showToast(`Tab ${num} does not exist (${tabs.value.length} open)`);
          }
        } else {
          // Find by title search
          const found = tabs.value.find(
            (t) =>
              t.title.toLowerCase().includes(args.toLowerCase()) ||
              t.url.toLowerCase().includes(args.toLowerCase()),
          );
          if (found) {
            setActiveTab(found.id);
            showToast(`Switched to: ${found.title}`);
          } else {
            showToast(`No tab matching "${args}"`);
          }
        }
      } else {
        setMode("BUFFER");
      }
      break;

    case "buffers":
      setMode("BUFFER");
      break;

    case "r":
    case "reload":
      webviewComponent.value?.reload(false);
      showToast("Reloading page");
      break;

    case "reload!":
    case "R":
      webviewComponent.value?.reload(true);
      showToast("Hard reloading (cache bypassed)");
      break;

    case "back":
      webviewComponent.value?.goBack();
      break;

    case "forward":
      webviewComponent.value?.goForward();
      break;

    case "y":
    case "yank":
      await handleYankUrl();
      break;

    case "bm":
    case "bookmark":
      await addBookmark(args || activeTab.value?.title, activeTab.value?.url);
      showToast("Bookmarked current page 🔖");
      break;

    case "bookmarks":
      setMode("BOOKMARKS");
      break;

    case "downloads":
    case "dl":
      setMode("DOWNLOADS");
      break;

    case "history":
      createTab("keyor://start", true);
      break;

    case "zoom":
      if (args) {
        const pct = parseInt(args, 10);
        if (!isNaN(pct)) {
          const factor = pct / 100;
          const wv = webviewComponent.value?.getActiveWebview();
          if (wv) wv.setZoomFactor(factor);
          updateTab(activeTabId.value, { zoomFactor: factor });
          showToast(`Zoom set to ${pct}%`);
        }
      }
      break;

    case "fullscreen":
      if (window.electronAPI) {
        window.electronAPI.windowAction("toggle-fullscreen");
      }
      break;

    case "devtools":
    case "inspect":
      if (window.electronAPI) {
        window.electronAPI.windowAction("toggle-devtools");
      }
      break;

    case "h":
    case "help":
      setMode("HELP");
      break;

    case "colorscheme":
    case "colo":
    case "cs":
    case "theme":
      if (args) {
        const res = await switchTheme(args);
        if (res.success) {
          showToast(`colorscheme ${res.themeId} (${res.themeName}) 🎨`);
        } else {
          showToast(`Cannot find theme '${args}'. Available: ${res.available?.join(', ')}`);
        }
      } else {
        showToast(`colorscheme: ${activeThemeName.value} (~/.keyor/theme.json)`);
      }
      break;

    case "themes":
    case "colorschemes":
      showToast(`Themes: ${availableThemeNames.value.join(', ')}`);
      break;

    case "themeedit":
    case "edittheme":
      {
        const opened = await openConfigFile();
        if (opened) {
          showToast(`Opened ${themePath.value} 🛠️`);
        } else {
          showToast(`Config: ${themePath.value}`);
        }
      }
      break;

    case "quit":
    case "qa":
      if (window.electronAPI) {
        window.electronAPI.windowAction("close");
      }
      break;

    default:
      showToast(`Unknown command: :${cmd}`);
      break;
  }
};

const closeCommandBar = () => {
  setMode("NORMAL");
  ensureFocus();
};

// Find In Page
const handleFindSearch = (text) => {
  webviewComponent.value?.findInPage(text, { forward: true, findNext: false });
};

const handleFindNext = (text) => {
  webviewComponent.value?.findInPage(text, { forward: true, findNext: true });
};

const handleFindPrev = (text) => {
  webviewComponent.value?.findInPage(text, { forward: false, findNext: true });
};

const closeFind = () => {
  webviewComponent.value?.stopFindInPage("clearSelection");
  findMatchOrdinal.value = 0;
  findTotalMatches.value = 0;
  setMode("NORMAL");
  ensureFocus();
};

// Help Modal
const openHelpModal = () => {
  setMode("HELP");
};

const closeHelpModal = () => {
  setMode("NORMAL");
  ensureFocus();
};

// Buffer Switcher
const closeBufferSwitcher = () => {
  setMode("NORMAL");
  ensureFocus();
};

// Bookmarks Modal
const handleOpenBookmark = (url) => {
  handleOmnibarSubmit({ url, inNewTab: false });
};

const closeBookmarksModal = () => {
  setMode("NORMAL");
  ensureFocus();
};

// Downloads Modal
const openDownloadsModal = () => {
  setMode("DOWNLOADS");
};

const closeDownloadsModal = () => {
  setMode("NORMAL");
  ensureFocus();
};

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
    showToast(`Yanked: ${url} 📋`);
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

  if (text) {
    handleOmnibarSubmit({ url: text.trim(), inNewTab: newTab });
  }
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

  const res = await webviewComponent.value?.startHintMode(newTab);
  if (res && res.codes && res.codes.length > 0) {
    activeHintCodes.value = res.codes;
    showToast(
      newTab ? "HINT (New Tab): Type letters" : "HINT: Type letters to click",
      1800,
    );
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

  // Check exact match
  if (activeHintCodes.value.includes(nextBuffer)) {
    const res = await webviewComponent.value?.activateHint(
      nextBuffer,
      isHintNewTab.value,
    );
    if (res && res.newTab && res.openUrl) {
      createTab(res.openUrl, true);
      showToast(`Opened: ${res.openUrl} in new tab`);
    } else if (res && res.focusedInput) {
      setMode("INSERT");
      showToast("INSERT mode");
      return;
    }
    webviewComponent.value?.clearHints();
    setMode("NORMAL");
    ensureFocus();
    hintBuffer.value = "";
    return;
  }

  // Check if any code starts with prefix
  const hasPrefixMatch = activeHintCodes.value.some((code) =>
    code.startsWith(nextBuffer),
  );
  if (!hasPrefixMatch) {
    showToast(`No match for '${nextBuffer}'`);
    webviewComponent.value?.clearHints();
    setMode("NORMAL");
    ensureFocus();
    hintBuffer.value = "";
  }
};

// Webview Preload IPC Bridge
const onWebviewVimKey = (eventData) => {
  handleVimKey(eventData.key, eventData);
};

const onWebviewModeChange = (mode) => {
  setMode(mode);
  if (mode === "INSERT") {
    showToast("-- INSERT --", 1200);
  } else if (mode === "NORMAL") {
    ensureFocus();
  }
};

// Global Keydown Handler (Attached to window in capture phase)
const handleGlobalKeydown = (e) => {
  // 1. If currently in an open modal (COMMAND, OMNIBAR, FIND, HELP, BUFFER, BOOKMARKS, DOWNLOADS)
  if (
    ["OMNIBAR", "COMMAND", "FIND", "HELP", "BUFFER", "BOOKMARKS", "DOWNLOADS"].includes(
      currentMode.value,
    )
  ) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setMode("NORMAL");
      ensureFocus();
      showToast("-- NORMAL --", 1000);
      return;
    }
    // Allow the modal's input element to receive keystrokes
    return;
  }

  // 2. If an editable element outside modals has focus (e.g., search input on start page)
  const active = document.activeElement;
  const isEditing =
    active &&
    (active.tagName === "INPUT" ||
      active.tagName === "TEXTAREA" ||
      active.isContentEditable);
  if (isEditing) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      active.blur();
      ensureFocus();
      setMode("NORMAL");
      showToast("-- NORMAL --", 1000);
      return;
    }
    // Allow Ctrl+t / Alt+t even while editing
    if ((e.ctrlKey || e.altKey) && e.key.toLowerCase() === "t") {
      e.preventDefault();
      e.stopPropagation();
      openOmnibarNewTab();
      return;
    }
    return;
  }

  // Universal new tab shortcut: Ctrl+t / Alt+t
  if ((e.ctrlKey || e.altKey) && e.key.toLowerCase() === "t") {
    e.preventDefault();
    e.stopPropagation();
    openOmnibarNewTab();
    return;
  }

  // 3. Normal / Hint mode: prevent default for standard Vim nav keys
  if (!e.ctrlKey && !e.altKey && !e.metaKey) {
    const vimNavKeys = [
      "j",
      "k",
      "d",
      "u",
      "f",
      "F",
      "o",
      "O",
      "t",
      "x",
      "J",
      "K",
      "H",
      "L",
      "r",
      "R",
      "/",
      ":",
      "?",
      "b",
      "B",
      "D",
    ];
    if (vimNavKeys.includes(e.key)) {
      e.preventDefault();
    }
  }

  handleVimKey(e.key, e);
};

// Central Vim Dispatcher
const handleVimKey = async (key, event = {}) => {
  // Escape Key: always reset to NORMAL
  if (key === "Escape" || (event.ctrlKey && key === "[")) {
    if (currentMode.value === "HINT") {
      webviewComponent.value?.clearHints();
      hintBuffer.value = "";
    }
    setMode("NORMAL");
    clearKeyBuffer();
    webviewComponent.value?.blurActiveWebview();
    ensureFocus();
    showToast("-- NORMAL --", 1000);
    return;
  }

  // Universal shortcut: Ctrl+t or Alt+t (New Tab Omnibar)
  if ((event.ctrlKey || event.altKey) && (key === "t" || key === "T")) {
    if (event.preventDefault) event.preventDefault();
    openOmnibarNewTab();
    return;
  }

  // Universal shortcut: Alt+1..9 or Ctrl+1..9 (Direct tab jumping)
  if ((event.altKey || event.ctrlKey) && /^[1-9]$/.test(key)) {
    if (event.preventDefault) event.preventDefault();
    const tabNum = parseInt(key, 10);
    const ok = jumpToTab(tabNum);
    if (ok) {
      showToast(`Jumped to tab ${tabNum}`);
    } else {
      showToast(`Tab ${tabNum} does not exist (${tabs.value.length} open)`);
    }
    return;
  }

  // If in INSERT mode: ignore other keys unless Escape was pressed or universal shortcuts
  if (currentMode.value === "INSERT") {
    return;
  }

  // If in HINT mode: process letter inputs
  if (currentMode.value === "HINT") {
    if (/^[a-zA-Z]$/.test(key)) {
      if (event.preventDefault) event.preventDefault();
      await processHintInput(key);
    }
    return;
  }

  // NORMAL MODE SHORTCUTS & SEQUENCES
  if (currentMode.value === "NORMAL") {
    const prevBuf = keyBuffer.value;

    // Sequence 'gg': Top of page
    if (prevBuf === "g" && key === "g") {
      clearKeyBuffer();
      webviewComponent.value?.scrollToTop();
      return;
    }

    // Sequence 'gt': Next tab
    if (prevBuf === "g" && key === "t") {
      clearKeyBuffer();
      nextTab();
      return;
    }

    // Sequence 'gT': Previous tab
    if (prevBuf === "g" && key === "T") {
      clearKeyBuffer();
      prevTab();
      return;
    }

    // Sequence 'gi': Focus first input
    if (prevBuf === "g" && key === "i") {
      clearKeyBuffer();
      webviewComponent.value?.focusFirstInput();
      setMode("INSERT");
      showToast("-- INSERT --", 1200);
      return;
    }

    // Sequence 'dd': Close tab
    if (prevBuf === "d" && key === "d") {
      clearKeyBuffer();
      closeTab(activeTabId.value);
      showToast("Closed tab (dd)");
      return;
    }

    // Sequence 'yy': Yank current URL
    if (prevBuf === "y" && key === "y") {
      clearKeyBuffer();
      await handleYankUrl();
      return;
    }

    // Sequence 'zi' / 'zo' / 'zz': Zoom
    if (prevBuf === "z") {
      clearKeyBuffer();
      if (key === "i") webviewComponent.value?.zoomIn();
      else if (key === "o") webviewComponent.value?.zoomOut();
      else if (key === "z") webviewComponent.value?.resetZoom();
      return;
    }

    // Number prefix tab jumping (e.g. '2gt')
    if (/^[1-9]$/.test(prevBuf) && key === "g") {
      appendKeyBuffer("g");
      return;
    }
    if (/^[1-9]g$/.test(prevBuf) && key === "t") {
      const tabNum = parseInt(prevBuf[0], 10);
      clearKeyBuffer();
      const ok = jumpToTab(tabNum);
      if (ok) {
        showToast(`Jumped to tab ${tabNum}`);
      } else {
        showToast(`Tab ${tabNum} does not exist (${tabs.value.length} open)`);
      }
      return;
    }

    // Single keys
    switch (key) {
      // Scrolling
      case "j":
        webviewComponent.value?.scrollDown(120);
        break;

      case "k":
        webviewComponent.value?.scrollUp(120);
        break;

      case "d":
        // Half page down and allow 'dd' follow-up
        webviewComponent.value?.scrollHalfDown();
        appendKeyBuffer("d");
        break;

      case "u":
        // Half page up
        webviewComponent.value?.scrollHalfUp();
        break;

      case "U":
        // Restore closed tab
        restoreClosedTab();
        showToast("Restored closed tab");
        break;

      case "G":
        // Scroll to bottom
        webviewComponent.value?.scrollToBottom();
        break;

      // Hints
      case "f":
        enterHintMode(false);
        break;

      case "F":
        enterHintMode(true);
        break;

      // Omnibar & Tabs
      case "o":
        openOmnibarCurrent();
        break;

      case "O":
        openOmnibarNewTab();
        break;

      case "t":
        openOmnibarNewTab();
        break;

      case "x":
        closeTab(activeTabId.value);
        showToast("Closed tab");
        break;

      case "J":
        nextTab();
        break;

      case "K":
        prevTab();
        break;

      // History & Reload
      case "H":
        webviewComponent.value?.goBack();
        break;

      case "L":
        webviewComponent.value?.goForward();
        break;

      case "r":
        webviewComponent.value?.reload(false);
        showToast("Reloading page");
        break;

      case "R":
        webviewComponent.value?.reload(true);
        showToast("Hard reloading (cache bypassed)");
        break;

      // Search & Commands
      case "/":
        setMode("FIND");
        break;

      case ":":
        setMode("COMMAND");
        break;

      case "?":
        setMode("HELP");
        break;

      // Buffers, Bookmarks & Downloads
      case "b":
        setMode("BUFFER");
        break;

      case "B":
        setMode("BOOKMARKS");
        break;

      case "D":
        setMode("DOWNLOADS");
        break;

      case "p":
        handlePasteOpen(false);
        break;

      case "P":
        handlePasteOpen(true);
        break;

      // Mode switch
      case "i":
        setMode("INSERT");
        showToast("-- INSERT --", 1200);
        break;

      // Sequences starters
      case "g":
      case "y":
      case "z":
        appendKeyBuffer(key);
        break;

      default:
        // Number prefix starter
        if (/^[1-9]$/.test(key)) {
          appendKeyBuffer(key);
        }
        break;
    }
  }
};
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
