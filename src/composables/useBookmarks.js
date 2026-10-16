import { ref, onMounted } from 'vue';

const bookmarks = ref([]);
const isLoaded = ref(false);

const DEFAULT_BOOKMARKS = [
  { id: '1', title: 'DuckDuckGo Search', url: 'https://duckduckgo.com', icon: 'Search', date: Date.now() },
  { id: '2', title: 'GitHub', url: 'https://github.com', icon: 'Code', date: Date.now() },
  { id: '3', title: 'Hacker News', url: 'https://news.ycombinator.com', icon: 'Zap', date: Date.now() },
  { id: '4', title: 'Vue.js Framework', url: 'https://vuejs.org', icon: 'Leaf', date: Date.now() },
  { id: '5', title: 'MDN Web Docs', url: 'https://developer.mozilla.org', icon: 'BookOpen', date: Date.now() },
  { id: '6', title: 'Vim Quick Reference', url: 'https://vim.rtorr.com', icon: 'Keyboard', date: Date.now() }
];

export function useBookmarks() {
  const loadBookmarks = async () => {
    if (isLoaded.value) return;
    try {
      if (window.electronAPI && window.electronAPI.getBookmarks) {
        const data = await window.electronAPI.getBookmarks();
        bookmarks.value = data && data.length > 0 ? data : DEFAULT_BOOKMARKS;
      } else {
        const stored = localStorage.getItem('keyor_bookmarks');
        bookmarks.value = stored ? JSON.parse(stored) : DEFAULT_BOOKMARKS;
      }
    } catch (e) {
      console.warn('Failed to load bookmarks:', e);
      bookmarks.value = DEFAULT_BOOKMARKS;
    } finally {
      isLoaded.value = true;
    }
  };

  const saveBookmarks = async () => {
    try {
      const rawBookmarks = JSON.parse(JSON.stringify(bookmarks.value));
      if (window.electronAPI && window.electronAPI.saveBookmarks) {
        await window.electronAPI.saveBookmarks(rawBookmarks);
      } else {
        localStorage.setItem('keyor_bookmarks', JSON.stringify(rawBookmarks));
      }
    } catch (e) {
      console.warn('Failed to save bookmarks:', e);
    }
  };

  const addBookmark = async (title, url) => {
    if (!url) return;
    const exists = bookmarks.value.find(b => b.url === url);
    if (exists) {
      exists.title = title || exists.title;
      await saveBookmarks();
      return exists;
    }
    const newBm = {
      id: Date.now().toString(),
      title: title || url,
      url,
      icon: 'Bookmark',
      date: Date.now()
    };
    bookmarks.value.unshift(newBm);
    await saveBookmarks();
    return newBm;
  };

  const removeBookmark = async (idOrUrl) => {
    bookmarks.value = bookmarks.value.filter(b => b.id !== idOrUrl && b.url !== idOrUrl);
    await saveBookmarks();
  };

  const isBookmarked = (url) => {
    return bookmarks.value.some(b => b.url === url);
  };

  onMounted(() => {
    loadBookmarks();
  });

  return {
    bookmarks,
    loadBookmarks,
    addBookmark,
    removeBookmark,
    isBookmarked
  };
}
