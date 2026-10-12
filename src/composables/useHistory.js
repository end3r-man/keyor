import { ref, onMounted } from 'vue';

const history = ref([]);
const isLoaded = ref(false);

export function useHistory() {
  const loadHistory = async () => {
    if (isLoaded.value) return;
    try {
      if (window.electronAPI && window.electronAPI.getHistory) {
        const data = await window.electronAPI.getHistory();
        history.value = data || [];
      } else {
        const stored = localStorage.getItem('keyor_history');
        history.value = stored ? JSON.parse(stored) : [];
      }
    } catch (e) {
      console.warn('Failed to load history:', e);
      history.value = [];
    } finally {
      isLoaded.value = true;
    }
  };

  const saveHistory = async () => {
    try {
      const rawHistory = JSON.parse(JSON.stringify(history.value));
      if (window.electronAPI && window.electronAPI.saveHistory) {
        await window.electronAPI.saveHistory(rawHistory);
      } else {
        localStorage.setItem('keyor_history', JSON.stringify(rawHistory));
      }
    } catch (e) {
      console.warn('Failed to save history:', e);
    }
  };

  const addHistoryEntry = async (title, url) => {
    if (!url || url.startsWith('keyor://') || url === 'about:blank') return;

    // Filter out previous entry if same URL within short window to avoid duplicates
    history.value = history.value.filter(item => item.url !== url);

    history.value.unshift({
      id: Date.now().toString(),
      title: title || url,
      url,
      timestamp: Date.now()
    });

    // Keep up to 500 history items
    if (history.value.length > 500) {
      history.value = history.value.slice(0, 500);
    }

    await saveHistory();
  };

  const clearHistory = async () => {
    history.value = [];
    await saveHistory();
  };

  onMounted(() => {
    loadHistory();
  });

  return {
    history,
    loadHistory,
    addHistoryEntry,
    clearHistory
  };
}
