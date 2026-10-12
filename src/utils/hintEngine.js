// Hint generator and injector utility for Vim keyboard navigation

const HINT_CHARS = [
  "a",
  "s",
  "d",
  "f",
  "j",
  "k",
  "l",
  "g",
  "h",
  "e",
  "w",
  "o",
  "i",
  "r",
  "u",
];

/**
 * Generate unique hint letter codes for N elements
 */
export function generateHintCodes(count) {
  const chars = HINT_CHARS;
  const codes = [];

  if (count <= chars.length) {
    for (let i = 0; i < count; i++) {
      codes.push(chars[i]);
    }
    return codes;
  }

  // Generate 2-character codes
  let idx = 0;
  for (let i = 0; i < chars.length; i++) {
    for (let j = 0; j < chars.length; j++) {
      codes.push(chars[i] + chars[j]);
      idx++;
      if (idx >= count) return codes;
    }
  }

  // If still need more, generate 3-character codes
  for (let i = 0; i < chars.length; i++) {
    for (let j = 0; j < chars.length; j++) {
      for (let k = 0; k < chars.length; k++) {
        codes.push(chars[i] + chars[j] + chars[k]);
        idx++;
        if (idx >= count) return codes;
      }
    }
  }

  return codes;
}

/**
 * Script injected into webview to detect clickable elements and render badges
 */
export function getInjectHintsScript(hintCodes) {
  return `
  (function() {
    try {
      // Remove any existing hint container
      const existing = document.getElementById('__keyor_vim_hints__');
      if (existing) existing.remove();

      const container = document.createElement('div');
      container.id = '__keyor_vim_hints__';
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100vw';
      container.style.height = '100vh';
      container.style.pointerEvents = 'none';
      container.style.zIndex = '2147483647';
      container.style.fontFamily = 'monospace';

      const selectors = [
        'a[href]',
        'button',
        'input:not([type=hidden])',
        'textarea',
        'select',
        '[role=button]',
        '[role=link]',
        '[role=menuitem]',
        '[role=checkbox]',
        '[role=tab]',
        'summary',
        '[onclick]',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]'
      ];

      const elements = Array.from(document.querySelectorAll(selectors.join(',')));
      const visibleElements = [];

      for (let el of elements) {
        if (el.disabled || el.getAttribute('aria-hidden') === 'true') continue;
        const rect = el.getBoundingClientRect();
        if (rect.width <= 4 || rect.height <= 4) continue;
        if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
        if (rect.right < 0 || rect.left > window.innerWidth) continue;

        const style = window.getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none' || parseFloat(style.opacity) < 0.1) continue;

        visibleElements.push({ el, rect });
      }

      window.__KEYOR_HINT_ELEMENTS__ = {};
      const hintCodes = ${JSON.stringify(hintCodes)};
      const generated = [];

      visibleElements.forEach((item, index) => {
        if (index >= hintCodes.length) return;
        const code = hintCodes[index];
        window.__KEYOR_HINT_ELEMENTS__[code] = item.el;

        const badge = document.createElement('span');
        badge.className = '__keyor_hint_badge';
        badge.dataset.hint = code;
        badge.textContent = code.toUpperCase();
        badge.style.position = 'fixed';
        badge.style.top = Math.max(0, Math.min(window.innerHeight - 20, item.rect.top)) + 'px';
        badge.style.left = Math.max(0, Math.min(window.innerWidth - 30, item.rect.left)) + 'px';
        badge.style.background = '#10b981';
        badge.style.color = '#042f1a';
        badge.style.border = '1px solid rgba(0, 0, 0, 0.3)';
        badge.style.borderRadius = '2px';
        badge.style.padding = '0 3px';
        badge.style.fontSize = '10px';
        badge.style.fontWeight = '600';
        badge.style.letterSpacing = '0.4px';
        badge.style.boxShadow = '0 1px 3px rgba(0,0,0,0.4)';
        badge.style.pointerEvents = 'none';
        badge.style.zIndex = '2147483647';
        badge.style.textShadow = 'none';
        badge.style.transition = 'opacity 0.1s ease, transform 0.1s ease';

        container.appendChild(badge);
        generated.push(code);
      });

      document.body.appendChild(container);
      return { count: generated.length, codes: generated };
    } catch (e) {
      console.error('Hint injection error:', e);
      return { count: 0, codes: [] };
    }
  })();
  `;
}

/**
 * Script to filter or highlight badges matching user prefix
 */
export function getFilterHintsScript(prefix) {
  return `
  (function() {
    const badges = document.querySelectorAll('.__keyor_hint_badge');
    const p = ${JSON.stringify(prefix.toLowerCase())};
    badges.forEach(badge => {
      const code = badge.dataset.hint;
      if (!p) {
        badge.style.opacity = '1';
        badge.style.background = '#10b981';
        badge.style.color = '#042f1a';
      } else if (code.startsWith(p)) {
        badge.style.opacity = '1';
        badge.style.background = '#38bdf8';
        badge.style.color = '#042f38';
        badge.style.transform = 'scale(1.08)';
      } else {
        badge.style.opacity = '0.15';
        badge.style.transform = 'scale(0.9)';
      }
    });
  })();
  `;
}

/**
 * Script to activate the chosen hint
 */
export function getActivateHintScript(code, openInNewTab = false) {
  return `
  (function() {
    try {
      const code = ${JSON.stringify(code.toLowerCase())};
      const elementsMap = window.__KEYOR_HINT_ELEMENTS__ || {};
      const el = elementsMap[code];

      // Remove hints container
      const container = document.getElementById('__keyor_vim_hints__');
      if (container) container.remove();
      window.__KEYOR_HINT_ELEMENTS__ = {};

      if (!el) return { success: false, reason: 'Element not found' };

      // If user wants to open link in new tab
      if (${openInNewTab}) {
        let linkEl = el.tagName === 'A' ? el : el.closest('a');
        if (linkEl && linkEl.href) {
          return { success: true, openUrl: linkEl.href, newTab: true };
        }
      }

      // Check if element is an input/textarea
      const tag = el.tagName ? el.tagName.toLowerCase() : '';
      const isInput = tag === 'input' || tag === 'textarea' || el.isContentEditable;

      el.focus();
      el.click();

      return {
        success: true,
        focusedInput: isInput,
        tag: tag
      };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  })();
  `;
}

/**
 * Script to clear hints overlay
 */
export function getClearHintsScript() {
  return `
  (function() {
    const container = document.getElementById('__keyor_vim_hints__');
    if (container) container.remove();
    window.__KEYOR_HINT_ELEMENTS__ = {};
  })();
  `;
}
