import { ref, computed } from 'vue';

const downloads = ref([]);
let isInitialized = false;
let toastCallback = null;

export function useDownloads() {
  const activeDownloads = computed(() => {
    return downloads.value.filter(d => d.state === 'progressing');
  });

  const activeDownloadsCount = computed(() => {
    return activeDownloads.value.length;
  });

  const overallProgress = computed(() => {
    if (activeDownloads.value.length === 0) return 0;
    const totalReceived = activeDownloads.value.reduce((acc, d) => acc + (d.receivedBytes || 0), 0);
    const totalExpected = activeDownloads.value.reduce((acc, d) => acc + (d.totalBytes || 0), 0);
    if (totalExpected <= 0) return 0;
    return Math.min(100, Math.round((totalReceived / totalExpected) * 100));
  });

  const activeSpeed = computed(() => {
    return activeDownloads.value.reduce((acc, d) => acc + (d.speed || 0), 0);
  });

  const registerToastCallback = (cb) => {
    toastCallback = cb;
  };

  const initDownloads = async () => {
    if (isInitialized) return;
    isInitialized = true;

    try {
      if (window.electronAPI?.getDownloads) {
        const list = await window.electronAPI.getDownloads();
        if (Array.isArray(list)) {
          downloads.value = list;
        }
      }

      if (window.electronAPI?.onDownloadStarted) {
        window.electronAPI.onDownloadStarted((item) => {
          const index = downloads.value.findIndex(d => d.id === item.id);
          if (index !== -1) {
            downloads.value[index] = item;
          } else {
            downloads.value.unshift(item);
          }
          if (toastCallback) {
            toastCallback(`Started downloading: ${item.filename} ⬇️`);
          }
        });
      }

      if (window.electronAPI?.onDownloadProgress) {
        window.electronAPI.onDownloadProgress((item) => {
          const index = downloads.value.findIndex(d => d.id === item.id);
          if (index !== -1) {
            Object.assign(downloads.value[index], item);
          } else {
            downloads.value.unshift(item);
          }
        });
      }

      if (window.electronAPI?.onDownloadCompleted) {
        window.electronAPI.onDownloadCompleted((item) => {
          const index = downloads.value.findIndex(d => d.id === item.id);
          if (index !== -1) {
            Object.assign(downloads.value[index], item);
          } else {
            downloads.value.unshift(item);
          }
          if (toastCallback) {
            toastCallback(`Download complete: ${item.filename} ✅`);
          }
        });
      }

      if (window.electronAPI?.onDownloadFailed) {
        window.electronAPI.onDownloadFailed((item) => {
          const index = downloads.value.findIndex(d => d.id === item.id);
          if (index !== -1) {
            Object.assign(downloads.value[index], item);
          } else {
            downloads.value.unshift(item);
          }
          if (toastCallback) {
            const reason = item.state === 'cancelled' ? 'cancelled' : 'failed';
            toastCallback(`Download ${reason}: ${item.filename} ⚠️`);
          }
        });
      }
    } catch (e) {
      console.warn('Failed to initialize downloads composable:', e);
    }
  };

  const cancel = async (id) => {
    if (window.electronAPI?.cancelDownload) {
      await window.electronAPI.cancelDownload(id);
    }
    const target = downloads.value.find(d => d.id === id);
    if (target) {
      target.state = 'cancelled';
    }
  };

  const openFile = async (filePath) => {
    if (window.electronAPI?.openDownloadFile) {
      const ok = await window.electronAPI.openDownloadFile(filePath);
      return ok;
    }
    return false;
  };

  const showInFolder = async (filePath) => {
    if (window.electronAPI?.showDownloadInFolder) {
      return window.electronAPI.showDownloadInFolder(filePath);
    }
    return false;
  };

  const remove = async (id) => {
    if (window.electronAPI?.removeDownload) {
      await window.electronAPI.removeDownload(id);
    }
    downloads.value = downloads.value.filter(d => d.id !== id);
  };

  const clear = async () => {
    if (window.electronAPI?.clearDownloads) {
      await window.electronAPI.clearDownloads();
    }
    downloads.value = downloads.value.filter(d => d.state === 'progressing');
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
  };

  const formatSpeed = (bytesPerSec) => {
    if (!bytesPerSec || bytesPerSec <= 0) return '';
    return `${formatBytes(bytesPerSec)}/s`;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return timeStr;
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${timeStr}`;
  };

  return {
    downloads,
    activeDownloads,
    activeDownloadsCount,
    overallProgress,
    activeSpeed,
    initDownloads,
    registerToastCallback,
    cancel,
    openFile,
    showInFolder,
    remove,
    clear,
    formatBytes,
    formatSpeed,
    formatTime
  };
}
