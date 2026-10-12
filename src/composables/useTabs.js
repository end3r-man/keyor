import { ref, computed } from 'vue';

const tabs = ref([
  {
    id: 'tab-1',
    title: 'Keyor Home',
    url: 'keyor://start',
    favicon: '',
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
    isAudioPlaying: false,
    isMuted: false,
    zoomFactor: 1.0,
    scrollPercent: 0
  }
]);

const activeTabId = ref('tab-1');
const closedTabsStack = ref([]);

export function useTabs() {
  const activeTab = computed(() => {
    return tabs.value.find(t => t.id === activeTabId.value) || tabs.value[0];
  });

  const activeTabIndex = computed(() => {
    return tabs.value.findIndex(t => t.id === activeTabId.value);
  });

  const createTab = (url = 'keyor://start', activate = true) => {
    const newId = `tab-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newTab = {
      id: newId,
      title: url === 'keyor://start' ? 'Keyor Home' : 'Loading...',
      url,
      favicon: '',
      isLoading: url !== 'keyor://start',
      canGoBack: false,
      canGoForward: false,
      isAudioPlaying: false,
      isMuted: false,
      zoomFactor: 1.0,
      scrollPercent: 0
    };

    tabs.value.push(newTab);
    if (activate) {
      activeTabId.value = newId;
    }
    return newTab;
  };

  const closeTab = (idToClose = activeTabId.value) => {
    const index = tabs.value.findIndex(t => t.id === idToClose);
    if (index === -1) return;

    const closed = tabs.value[index];
    closedTabsStack.value.push({
      url: closed.url,
      title: closed.title
    });

    // If closing the last remaining tab, create a new start tab
    if (tabs.value.length === 1) {
      tabs.value.splice(0, 1);
      createTab('keyor://start', true);
      return;
    }

    // Determine next active tab if closing the active one
    if (activeTabId.value === idToClose) {
      const nextTab = tabs.value[index + 1] || tabs.value[index - 1];
      if (nextTab) {
        activeTabId.value = nextTab.id;
      }
    }

    tabs.value.splice(index, 1);
  };

  const restoreClosedTab = () => {
    if (closedTabsStack.value.length === 0) return null;
    const item = closedTabsStack.value.pop();
    return createTab(item.url, true);
  };

  const setActiveTab = (id) => {
    const found = tabs.value.find(t => t.id === id);
    if (found) {
      activeTabId.value = id;
    }
  };

  const nextTab = () => {
    if (tabs.value.length <= 1) return;
    const currentIndex = tabs.value.findIndex(t => t.id === activeTabId.value);
    const nextIndex = (currentIndex + 1) % tabs.value.length;
    activeTabId.value = tabs.value[nextIndex].id;
  };

  const prevTab = () => {
    if (tabs.value.length <= 1) return;
    const currentIndex = tabs.value.findIndex(t => t.id === activeTabId.value);
    const prevIndex = (currentIndex - 1 + tabs.value.length) % tabs.value.length;
    activeTabId.value = tabs.value[prevIndex].id;
  };

  const jumpToTab = (indexOneBased) => {
    const zeroIndex = indexOneBased - 1;
    if (zeroIndex >= 0 && zeroIndex < tabs.value.length) {
      activeTabId.value = tabs.value[zeroIndex].id;
      return true;
    }
    return false;
  };

  const updateTab = (id, patch) => {
    const tab = tabs.value.find(t => t.id === id);
    if (tab) {
      Object.assign(tab, patch);
    }
  };

  const duplicateTab = (id = activeTabId.value) => {
    const tab = tabs.value.find(t => t.id === id);
    if (tab) {
      createTab(tab.url, true);
    }
  };

  return {
    tabs,
    activeTabId,
    activeTab,
    activeTabIndex,
    closedTabsStack,
    createTab,
    closeTab,
    restoreClosedTab,
    setActiveTab,
    nextTab,
    prevTab,
    jumpToTab,
    updateTab,
    duplicateTab
  };
}
