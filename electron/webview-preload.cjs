const { ipcRenderer } = require('electron');

/**
 * Deeply resolve the active element through any Shadow DOM roots (e.g. YouTube Polymer components)
 */
function getDeepActiveElement(doc = document) {
  let el = doc.activeElement;
  while (el && el.shadowRoot && el.shadowRoot.activeElement) {
    el = el.shadowRoot.activeElement;
  }
  return el;
}

/**
 * Check if a DOM element is a text editable field
 */
function isEditableElement(el) {
  if (!el) return false;
  const tag = (el.tagName || '').toLowerCase();

  if (tag === 'input') {
    const type = (el.type || '').toLowerCase();
    const nonTextTypes = ['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file', 'image', 'hidden'];
    return !nonTextTypes.includes(type);
  }

  if (tag === 'textarea' || tag === 'select') return true;
  if (el.isContentEditable || el.contentEditable === 'true') return true;

  if (el.getAttribute) {
    const role = (el.getAttribute('role') || '').toLowerCase();
    if (role === 'textbox' || role === 'searchbox' || role === 'combobox') return true;
  }

  return false;
}

// Track current mode state from host
let currentHostMode = 'NORMAL';

window.addEventListener('DOMContentLoaded', () => {
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

// Sync focus states accurately
function checkActiveFocus() {
  const active = getDeepActiveElement();
  if (isEditableElement(active)) {
    ipcRenderer.sendToHost({ type: 'FOCUS_INPUT' });
  } else {
    ipcRenderer.sendToHost({ type: 'BLUR_INPUT' });
  }
}

document.addEventListener('focusin', checkActiveFocus, true);
document.addEventListener('focusout', () => {
  setTimeout(checkActiveFocus, 10);
}, true);

// Pointer down handler to quickly detect clicks on non-editable elements (video players, background, buttons)
document.addEventListener('pointerdown', () => {
  setTimeout(checkActiveFocus, 20);
}, true);

// Reserved Vim keys in NORMAL mode
const VIM_NORMAL_KEYS = new Set([
  'j', 'k', 'd', 'u', 'g', 'G', 'f', 'F', 'o', 'O', 't', 'x', 'r', 'R',
  'H', 'L', 'y', '/', ':', '?', 'i', 'b', 'B', 'D', 'n', 'N', 'z', 'p', 'P',
  'J', 'K', '1', '2', '3', '4', '5', '6', '7', '8', '9'
]);

/**
 * Intercept keyboard events in the capture phase before webpage scripts receive them
 */
function handleKeyDown(e) {
  const active = getDeepActiveElement();
  const isEditing = isEditableElement(active);

  // 1. Escape key: always blur any active input element and return to NORMAL mode
  if (e.key === 'Escape' || (e.ctrlKey && e.key === '[')) {
    if (active && typeof active.blur === 'function') {
      active.blur();
    }
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    ipcRenderer.sendToHost({
      type: 'VIM_KEY',
      key: 'Escape',
      shiftKey: false,
      ctrlKey: false,
      altKey: false
    });
    return;
  }

  // 2. Allow direct tab jump shortcuts (Alt+1..9 or Ctrl+1..9) even while editing
  if ((e.altKey || e.ctrlKey) && /^[1-9]$/.test(e.key)) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    ipcRenderer.sendToHost({
      type: 'VIM_KEY',
      key: e.key,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey
    });
    return;
  }

  // 3. Allow Ctrl+t or Alt+t (open new tab) even while editing
  if ((e.ctrlKey || e.altKey) && e.key.toLowerCase() === 't') {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    ipcRenderer.sendToHost({
      type: 'VIM_KEY',
      key: 't',
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey
    });
    return;
  }

  // 4. If actively editing an input or host mode is explicitly INSERT,
  // let keys pass directly to webpage / input field
  if (isEditing || currentHostMode === 'INSERT') {
    return;
  }

  // 5. In NORMAL mode: intercept Vim keys before webpage scripts (e.g. YouTube player shortcuts)
  if (!e.ctrlKey && !e.altKey && !e.metaKey) {
    if (VIM_NORMAL_KEYS.has(e.key)) {
      // Completely halt the event from reaching YouTube / webpage listeners
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      ipcRenderer.sendToHost({
        type: 'VIM_KEY',
        key: e.key,
        shiftKey: e.shiftKey,
        ctrlKey: false,
        altKey: false
      });
      return;
    }
  }

  // 6. Ctrl+d, Ctrl+u half page scroll, Ctrl+b, Ctrl+f
  if (e.ctrlKey && ['d', 'u', 'b', 'f'].includes(e.key.toLowerCase())) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    ipcRenderer.sendToHost({
      type: 'VIM_KEY',
      key: e.key,
      shiftKey: e.shiftKey,
      ctrlKey: true,
      altKey: false
    });
  }
}

// Attach to both window and document with capture: true for rock-solid interception
window.addEventListener('keydown', handleKeyDown, true);
document.addEventListener('keydown', handleKeyDown, true);

// Listen for messages from host application
ipcRenderer.on('host-message', (event, message) => {
  if (!message) return;

  if (message.type === 'SET_MODE') {
    currentHostMode = message.mode;
    if (message.mode === 'NORMAL') {
      const active = getDeepActiveElement();
      if (active && typeof active.blur === 'function') {
        active.blur();
      }
    }
  }

  if (message.type === 'BLUR_ACTIVE') {
    const active = getDeepActiveElement();
    if (active && typeof active.blur === 'function') {
      active.blur();
    }
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
