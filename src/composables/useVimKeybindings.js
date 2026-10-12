import { ref, computed } from 'vue';

// Modes: NORMAL | INSERT | HINT | COMMAND | FIND | OMNIBAR | BUFFER | BOOKMARKS | HELP
const currentMode = ref('NORMAL');
const keyBuffer = ref('');
const hintBuffer = ref('');
const isHintNewTab = ref(false);
const toastMessage = ref('');
let toastTimer = null;
let keyBufferTimeout = null;

export function useVimKeybindings() {
  const showToast = (msg, duration = 2200) => {
    toastMessage.value = msg;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastMessage.value = '';
    }, duration);
  };

  const setMode = (mode) => {
    currentMode.value = mode;
    keyBuffer.value = '';
    if (mode !== 'HINT') {
      hintBuffer.value = '';
    }
  };

  const appendKeyBuffer = (key) => {
    keyBuffer.value += key;
    if (keyBufferTimeout) clearTimeout(keyBufferTimeout);
    keyBufferTimeout = setTimeout(() => {
      keyBuffer.value = '';
    }, 1200);
  };

  const clearKeyBuffer = () => {
    keyBuffer.value = '';
    if (keyBufferTimeout) clearTimeout(keyBufferTimeout);
  };

  return {
    currentMode,
    keyBuffer,
    hintBuffer,
    isHintNewTab,
    toastMessage,
    showToast,
    setMode,
    appendKeyBuffer,
    clearKeyBuffer
  };
}
