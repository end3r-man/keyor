import { ref } from 'vue';

const session = ref({ tabs: [], activeIndex: 0 });
const isLoaded = ref(false);
let saveTimer = null;

function serialize(tabs, activeIndex) {
  return {
    activeIndex,
    tabs: tabs
      .filter((t) => t && t.url)
      .map((t) => ({ url: t.url, title: t.title || t.url })),
  };
}

export function useSession() {
  const load = async () => {
    if (isLoaded.value) return session.value;
    isLoaded.value = true;
    try {
      if (window.electronAPI?.getSession) {
        const data = await window.electronAPI.getSession();
        if (data && Array.isArray(data.tabs) && data.tabs.length > 0) {
          session.value = data;
        }
      } else {
        const stored = localStorage.getItem('keyor_session');
        if (stored) session.value = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load session:', e);
    }
    return session.value;
  };

  const save = (tabs, activeIndex) => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        const payload = serialize(tabs, activeIndex);
        if (window.electronAPI?.saveSession) {
          await window.electronAPI.saveSession(payload);
        } else {
          localStorage.setItem('keyor_session', JSON.stringify(payload));
        }
      } catch (e) {
        console.warn('Failed to save session:', e);
      }
    }, 400);
  };

  return { session, load, save };
}
