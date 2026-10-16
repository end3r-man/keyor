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

// ── Keymap configuration (pushed by the host via SET_KEYMAPS) ────────────────
// Defaults mirror ~/.keyor/init.js so early key presses are still intercepted.
let normalKeys = new Set('j k d u g G f F o O t T x X J K H L r R y z i b B D Y n N p P / : ? [ ] 1 2 3 4 5 6 7 8 9 0'.split(' ').filter(Boolean));
let insertKeys = new Set(['<C-t>', '<A-t>']);
let currentHostMode = 'NORMAL';

const NAMED = {
  Escape: 'Esc', Enter: 'CR', Backspace: 'BS', ' ': 'Space', Tab: 'Tab',
  ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
  Delete: 'Del', Insert: 'Ins', Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown'
};

function canonicalEventKey(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === '[') return '<Esc>';
  if (e.key === 'Escape') return '<Esc>';
  const mods = [];
  if (e.ctrlKey) mods.push('C');
  if (e.altKey) mods.push('A');
  if (e.metaKey) mods.push('M');
  const named = NAMED[e.key];
  if (named) {
    if (e.shiftKey && named === 'Tab') mods.push('S');
    return mods.length ? `<${mods.join('-')}-${named}>` : `<${named}>`;
  }
  if (e.key.length === 1) {
    if (e.shiftKey && /[a-zA-Z]/.test(e.key)) {
      return mods.length ? `<${mods.join('-')}-${e.key.toUpperCase()}>` : e.key.toUpperCase();
    }
    return mods.length ? `<${mods.join('-')}-${e.key}>` : e.key;
  }
  return mods.length ? `<${mods.join('-')}-${e.key}>` : `<${e.key}>`;
}

function sendToHostOrMain(data) {
  try {
    ipcRenderer.send('webview-ipc-message', data);
  } catch (e) {}
  if (typeof ipcRenderer.sendToHost === 'function') {
    try {
      ipcRenderer.sendToHost(data);
    } catch (e) {}
  }
}

window.addEventListener('DOMContentLoaded', () => {
  sendToHostOrMain({
    type: 'PAGE_INFO',
    title: document.title,
    url: window.location.href
  });
  checkActiveFocus();
});

// Scroll reporting
let scrollThrottleTimeout = null;
window.addEventListener('scroll', () => {
  if (scrollThrottleTimeout) return;
  scrollThrottleTimeout = setTimeout(() => {
    scrollThrottleTimeout = null;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const percent = Math.min(100, Math.max(0, Math.round((window.scrollY / maxScroll) * 100)));
    sendToHostOrMain({
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
    sendToHostOrMain({ type: 'FOCUS_INPUT' });
  } else {
    sendToHostOrMain({ type: 'BLUR_INPUT' });
  }
}

document.addEventListener('focusin', checkActiveFocus, true);
document.addEventListener('focusout', () => {
  setTimeout(checkActiveFocus, 10);
}, true);

document.addEventListener('pointerdown', () => {
  setTimeout(checkActiveFocus, 20);
}, true);

/**
 * Intercept keyboard events in the capture phase before webpage scripts receive them.
 * Only keys present in the (configurable) keymap sets are intercepted.
 */
function handleKeyDown(e) {
  const active = getDeepActiveElement();
  const isEditing = isEditableElement(active) || currentHostMode === 'INSERT';

  // Escape always blurs inputs and returns to NORMAL. The host is notified via
  // the native `before-input-event` path (see tab-views.cjs) so we do not also
  // emit a VIM_KEY here, avoiding duplicate handling.
  if (e.key === 'Escape' || ((e.ctrlKey || e.metaKey) && e.key === '[')) {
    if (active && typeof active.blur === 'function') active.blur();
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return;
  }

  const token = canonicalEventKey(e);

  if (isEditing) {
    // While editing, only explicitly configured insert-mode chords are hijacked.
    if (insertKeys.has(token)) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      sendToHostOrMain({ type: 'VIM_KEY', key: e.key, token, ctrlKey: e.ctrlKey, altKey: e.altKey, shiftKey: e.shiftKey, metaKey: e.metaKey });
    }
    return;
  }

  // NORMAL mode: intercept only configured keys so pages keep the rest.
  if (normalKeys.has(token) || (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1 && normalKeys.has(e.key))) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    sendToHostOrMain({ type: 'VIM_KEY', key: e.key, token, ctrlKey: e.ctrlKey, altKey: e.altKey, shiftKey: e.shiftKey, metaKey: e.metaKey });
  }
}

// Attach to both window and document with capture: true for rock-solid interception
window.addEventListener('keydown', handleKeyDown, true);
document.addEventListener('keydown', handleKeyDown, true);

// Listen for messages from host application
ipcRenderer.on('host-message', (event, message) => {
  if (!message) return;

  if (message.type === 'SET_KEYMAPS') {
    if (Array.isArray(message.normalKeys)) normalKeys = new Set(message.normalKeys);
    if (Array.isArray(message.insertKeys)) insertKeys = new Set(message.insertKeys);
  }

  if (message.type === 'SET_MODE') {
    currentHostMode = message.mode;
    if (message.mode === 'NORMAL') {
      const active = getDeepActiveElement();
      if (active && typeof active.blur === 'function') active.blur();
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
      sendToHostOrMain({ type: 'FOCUS_INPUT' });
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
