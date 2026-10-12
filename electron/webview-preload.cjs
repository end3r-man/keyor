const { ipcRenderer } = require('electron');

// Check if an element is text-editable
function isEditableElement(el) {
  if (!el) return false;
  const tag = el.tagName ? el.tagName.toLowerCase() : '';
  if (tag === 'input') {
    const type = (el.type || '').toLowerCase();
    const nonTextTypes = ['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file', 'image'];
    return !nonTextTypes.includes(type);
  }
  if (tag === 'textarea' || tag === 'select') return true;
  if (el.isContentEditable) return true;
  if (el.getAttribute && el.getAttribute('role') === 'textbox') return true;
  return false;
}

// Track current mode state from host
let currentHostMode = 'NORMAL';

window.addEventListener('DOMContentLoaded', () => {
  // Report title and URL
  ipcRenderer.sendToHost({
    type: 'PAGE_INFO',
    title: document.title,
    url: window.location.href
  });
});

// Scroll reporting
let scrollThrottleTimeout = null;
window.addEventListener('scroll', () => {
  if (scrollThrottleTimeout) return;
  scrollThrottleTimeout = setTimeout(() => {
    scrollThrottleTimeout = null;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const percent = Math.min(100, Math.max(0, Math.round((window.scrollY / maxScroll) * 100)));
    ipcRenderer.sendToHost({
      type: 'SCROLL_UPDATE',
      percent: percent,
      scrollY: window.scrollY
    });
  }, 50);
}, { passive: true });

// Listen for focus changes
document.addEventListener('focusin', (e) => {
  if (isEditableElement(e.target)) {
    ipcRenderer.sendToHost({ type: 'FOCUS_INPUT' });
  }
}, true);

document.addEventListener('focusout', (e) => {
  if (isEditableElement(e.target)) {
    ipcRenderer.sendToHost({ type: 'BLUR_INPUT' });
  }
}, true);

// Listen to keyboard events on the webpage
window.addEventListener('keydown', (e) => {
  const isEditing = isEditableElement(document.activeElement);

  // If in Escape key, always blur active input and return to normal mode
  if (e.key === 'Escape' || (e.ctrlKey && e.key === '[')) {
    if (isEditing && document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    ipcRenderer.sendToHost({
      type: 'VIM_KEY',
      key: 'Escape',
      shiftKey: false,
      ctrlKey: false,
      altKey: false
    });
    return;
  }

  // If currently typing inside an input field, allow normal behavior unless it's a browser command
  if (isEditing) {
    return;
  }

  // Keys reserved for Vim Normal navigation
  const vimKeys = [
    'j', 'k', 'd', 'u', 'g', 'G', 'f', 'F', 'o', 'O', 't', 'x', 'r', 'R',
    'H', 'L', 'y', '/', ':', '?', 'i', 'b', 'B', 'n', 'N', 'z', 'p', 'P'
  ];

  if (!e.ctrlKey && !e.altKey && !e.metaKey) {
    if (vimKeys.includes(e.key) || (e.key.length === 1 && !isNaN(e.key))) {
      e.preventDefault();
      e.stopPropagation();
      ipcRenderer.sendToHost({
        type: 'VIM_KEY',
        key: e.key,
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey
      });
      return;
    }
  }

  // Support Ctrl+d, Ctrl+u, etc.
  if (e.ctrlKey && ['d', 'u', 'b', 'f'].includes(e.key.toLowerCase())) {
    e.preventDefault();
    e.stopPropagation();
    ipcRenderer.sendToHost({
      type: 'VIM_KEY',
      key: e.key,
      shiftKey: e.shiftKey,
      ctrlKey: true,
      altKey: false
    });
  }
}, true);

// Listen for messages from host application
ipcRenderer.on('host-message', (event, message) => {
  if (!message) return;

  if (message.type === 'SET_MODE') {
    currentHostMode = message.mode;
  }

  if (message.type === 'FOCUS_FIRST_INPUT') {
    const inputs = Array.from(document.querySelectorAll('input:not([type=hidden]):not([disabled]), textarea:not([disabled]), [contenteditable="true"]'));
    const visibleInput = inputs.find(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.top >= 0;
    });
    if (visibleInput) {
      visibleInput.focus();
      ipcRenderer.sendToHost({ type: 'FOCUS_INPUT' });
    }
  }

  if (message.type === 'SCROLL_BY') {
    window.scrollBy({
      top: message.top || 0,
      left: message.left || 0,
      behavior: message.smooth ? 'smooth' : 'auto'
    });
  }

  if (message.type === 'SCROLL_TO') {
    window.scrollTo({
      top: message.top !== undefined ? message.top : window.scrollY,
      left: message.left !== undefined ? message.left : window.scrollX,
      behavior: message.smooth ? 'smooth' : 'auto'
    });
  }
});
