/**
 * Keyor keymap engine — a small Neovim-style key sequence resolver.
 *
 * Supports:
 *  - Multi-key sequences (`gg`, `gt`, `yy`, `zi`, ...).
 *  - `<leader>` expansion.
 *  - Modifier notation (`<C-t>`, `<A-1>`, `<S-Tab>`, `<C-A-x>`).
 *  - Numeric counts (`3gt`, `5j`) resolved via {@link KeymapEngine#feed}.
 *  - Vim-style `timeoutlen` for ambiguous mappings (e.g. `g` also starts `gg`).
 *
 * The engine is intentionally framework-agnostic and purely synchronous except
 * for the `timeoutlen` timer, which resolves an ambiguous mapping when no
 * further key arrives. Execution is delivered via the `onResolve` callback so
 * both immediate and timed-out resolutions take the same code path.
 */

const NAMED_KEYS = {
  escape: 'Esc',
  esc: 'Esc',
  enter: 'CR',
  return: 'CR',
  cr: 'CR',
  tab: 'Tab',
  backspace: 'BS',
  bs: 'BS',
  space: 'Space',
  delete: 'Del',
  del: 'Del',
  insert: 'Ins',
  ins: 'Ins',
  up: 'Up',
  down: 'Down',
  left: 'Left',
  right: 'Right',
  home: 'Home',
  end: 'End',
  pageup: 'PageUp',
  pagedown: 'PageDown',
};

const DOM_NAMED_KEYS = {
  Tab: 'Tab',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Delete: 'Del',
  Insert: 'Ins',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  ' ': 'Space',
  Escape: 'Esc',
  Enter: 'CR',
  Backspace: 'BS',
};

const MODIFIER_ORDER = ['C', 'A', 'S', 'M'];

/**
 * Canonicalize a `<...>` notation token into a normalized form.
 * e.g. `<c-t>` -> `<C-t>`, `<leader>` stays until expanded.
 */
export function canonicalToken(raw) {
  if (!raw) return raw;
  if (raw.length === 1) {
    return raw === ' ' ? '<Space>' : raw;
  }
  if (raw[0] !== '<' || raw[raw.length - 1] !== '>') {
    return raw;
  }

  const body = raw.slice(1, -1);
  const parts = body.split('-');
  const baseRaw = parts.pop();
  const baseKey = baseRaw.toLowerCase();

  const named = NAMED_KEYS[baseKey];
  const mods = new Set();

  for (const p of parts) {
    const m = p.toUpperCase();
    if (m === 'C' || m === 'CTRL' || m === 'CONTROL') mods.add('C');
    else if (m === 'A' || m === 'ALT' || m === 'META') mods.add('A');
    else if (m === 'S' || m === 'SHIFT') mods.add('S');
    else if (m === 'M' || m === 'CMD' || m === 'SUPER') mods.add('M');
  }

  let base = named || baseRaw;
  // Fold Shift on a single alpha into an uppercase letter (Neovim-friendly).
  if (mods.has('S') && !named && baseRaw.length === 1 && /[a-zA-Z]/.test(baseRaw)) {
    base = baseRaw.toUpperCase();
    mods.delete('S');
  }
  // Fold Shift on single non-alpha printable into an uppercase character space.
  if (mods.has('S') && !named && baseRaw.length === 1 && !/[a-zA-Z]/.test(baseRaw)) {
    base = baseRaw;
  }

  if (mods.size === 0) {
    return baseRaw.length === 1 && !named ? baseRaw : `<${base}>`;
  }

  const ordered = MODIFIER_ORDER.filter((m) => mods.has(m));
  return `<${ordered.join('-')}-${base}>`;
}

/**
 * Build the canonical token for a DOM KeyboardEvent.
 */
export function canonicalEventKey(event) {
  if (!event) return '';

  // Ctrl+[ is traditionally an alias for Escape.
  if ((event.ctrlKey || event.metaKey) && event.key === '[') return '<Esc>';
  if (event.key === 'Escape') return '<Esc>';

  const named = DOM_NAMED_KEYS[event.key];
  const mods = new Set();
  if (event.ctrlKey) mods.add('C');
  if (event.altKey) mods.add('A');
  if (event.metaKey) mods.add('M');

  if (named) {
    if (event.shiftKey && named === 'Tab') mods.add('S');
    if (mods.size === 0) return `<${named}>`;
    const ordered = MODIFIER_ORDER.filter((m) => mods.has(m));
    return `<${ordered.join('-')}-${named}>`;
  }

  const key = event.key;
  if (key.length === 1) {
    if (event.shiftKey && /[a-zA-Z]/.test(key)) {
      // Shift already represented by the uppercase character itself.
      if (mods.size === 0) return key.toUpperCase();
      const ordered = MODIFIER_ORDER.filter((m) => mods.has(m));
      return `<${ordered.join('-')}-${key.toUpperCase()}>`;
    }
    if (mods.size === 0) return key;
    const ordered = MODIFIER_ORDER.filter((m) => mods.has(m));
    return `<${ordered.join('-')}-${key}>`;
  }

  if (mods.size === 0) return `<${key}>`;
  const ordered = MODIFIER_ORDER.filter((m) => mods.has(m));
  return `<${ordered.join('-')}-${key}>`;
}

/**
 * Parse a mapping key string (e.g. `"gg"`, `"<C-t>"`, `"<leader>w"`) into an
 * array of canonical tokens.
 */
export function parseKeys(str, leaderToken = '<Space>') {
  if (str === undefined || str === null) return [];
  let s = String(str).replace(/<leader>/gi, leaderToken);

  const tokens = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === '<') {
      const end = s.indexOf('>', i);
      if (end !== -1) {
        tokens.push(canonicalToken(s.slice(i, end + 1)));
        i = end + 1;
        continue;
      }
    }
    const ch = s[i];
    if (ch === ' ') {
      tokens.push('<Space>');
    } else {
      tokens.push(ch);
    }
    i += 1;
  }
  return tokens;
}

/**
 * Pretty-print canonical tokens for the UI/help.
 */
export function formatKeys(tokens) {
  const arr = Array.isArray(tokens) ? tokens : parseKeys(tokens);
  return arr
    .map((t) => {
      if (t.length > 1 && t[0] === '<' && t[t.length - 1] === '>') {
        return t.slice(1, -1);
      }
      return t;
    })
    .join(' ');
}

function createNode() {
  return { children: Object.create(null), action: null, raw: null };
}

function normalizeList(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return { action: value, args: undefined, desc: undefined };
  if (Array.isArray(value)) return { action: value[0], args: value[1], desc: value[2] };
  if (typeof value === 'object') {
    return {
      action: value.action,
      args: value.args !== undefined ? value.args : value.arg,
      desc: value.desc,
      keys: value.keys,
    };
  }
  return null;
}

export class KeymapEngine {
  constructor() {
    this.options = { leader: '<Space>', timeoutlen: 500 };
    this.tries = {};
    this.mappings = {};
    this.pending = [];
    this.count = 0;
    this.timer = null;
    this.mode = 'normal';
    this.onResolve = null; // (result) => void
    this.onChange = null; // (state) => void
  }

  load(config) {
    this.options = {
      leader: '<Space>',
      timeoutlen: 500,
      ...((config && config.options) || {}),
    };
    const leaderToken =
      this.options.leader && this.options.leader.length > 1
        ? canonicalToken(this.options.leader)
        : this.options.leader === ' '
          ? '<Space>'
          : canonicalToken(this.options.leader) || '<Space>';

    this.tries = {};
    this.mappings = {};

    const keymaps = (config && config.keymaps) || {};
    for (const [mode, map] of Object.entries(keymaps)) {
      const root = createNode();
      const flat = {};
      for (const [keyStr, value] of Object.entries(map || {})) {
        const norm = normalizeList(value);
        if (!norm || !norm.action) continue;
        const tokens = parseKeys(keyStr, leaderToken);
        if (tokens.length === 0) continue;

        let node = root;
        for (const token of tokens) {
          if (!node.children[token]) node.children[token] = createNode();
          node = node.children[token];
        }
        node.action = norm.action;
        node.args = norm.args;
        node.desc = norm.desc;
        node.raw = keyStr;
        flat[tokens.join(' ')] = { action: norm.action, args: norm.args, desc: norm.desc };
      }
      this.tries[mode] = root;
      this.mappings[mode] = flat;
    }
    this.reset();
    return this;
  }

  setMode(mode) {
    this.mode = mode;
    this.reset();
  }

  reset() {
    this.pending = [];
    this.count = 0;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.emitChange();
  }

  emitChange() {
    if (this.onChange) {
      this.onChange({ pending: this.pendingText(), count: this.count, mode: this.mode });
    }
  }

  pendingText() {
    return this.pending.map((t) => (t.length > 1 ? t.slice(1, -1) : t)).join('');
  }

  rootFor(mode) {
    return this.tries[mode] || this.tries.normal || createNode();
  }

  /**
   * Feed a canonical key token for a mode.
   * @returns {{status: string, keys?: string, count?: number}}
   */
  feed(mode, token, meta = {}) {
    const root = this.rootFor(mode);
    const hadPending = this.pending.length > 0;

    // Numeric count accumulation (only before any mapping key is buffered).
    if (!hadPending && /^[1-9]$/.test(token) && !root.children[token]) {
      this.count = this.count * 10 + parseInt(token, 10);
      this.emitChange();
      return { status: 'count', count: this.count };
    }

    const seq = [...this.pending, token];

    // Walk the trie for the proposed sequence.
    let node = root;
    for (const t of seq) {
      node = node.children[t];
      if (!node) {
        // No such mapping. Vim aborts the sequence.
        this.reset();
        return { status: 'nomatch', keys: seq.join(' '), token };
      }
    }

    const isExact = node.action != null;
    const hasLonger = Object.keys(node.children).length > 0;

    if (isExact && !hasLonger) {
      const result = {
        action: node.action,
        args: node.args,
        desc: node.desc,
        keys: node.raw || seq.join(' '),
        count: this.count || 1,
        mode,
        meta,
      };
      this.reset();
      if (this.onResolve) this.onResolve(result);
      return { status: 'consumed' };
    }

    if (isExact && hasLonger) {
      // Ambiguous: wait for timeoutlen before committing to the shorter match.
      this.pending = seq;
      this.armTimeout(mode, meta);
      this.emitChange();
      return { status: 'pending', keys: this.pendingText(), count: this.count };
    }

    // Prefix only: keep buffering.
    this.pending = seq;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.emitChange();
    return { status: 'pending', keys: this.pendingText(), count: this.count };
  }

  armTimeout(mode, meta) {
    if (this.timer) clearTimeout(this.timer);
    const delay = Math.max(50, Number(this.options.timeoutlen) || 500);
    this.timer = setTimeout(() => {
      this.timer = null;
      const root = this.rootFor(mode);
      let node = root;
      for (const t of this.pending) {
        node = node.children[t];
        if (!node) {
          this.reset();
          return;
        }
      }
      if (node && node.action) {
        const result = {
          action: node.action,
          args: node.args,
          desc: node.desc,
          keys: node.raw || this.pending.join(' '),
          count: this.count || 1,
          mode,
          meta,
        };
        this.reset();
        if (this.onResolve) this.onResolve(result);
      } else {
        this.reset();
      }
    }, delay);
  }
}

export function createKeymapEngine() {
  return new KeymapEngine();
}

/**
 * Compute the set of raw `event.key` values that must be intercepted inside the
 * guest page for a given mode (used to build the webview-preload key list).
 */
export function collectInterceptKeys(config, mode) {
  const keymaps = (config && config.keymaps) || {};
  const map = keymaps[mode] || {};
  const leader =
    (config && config.options && config.options.leader) || '<Space>';
  const leaderToken = leader.length === 1 && leader !== ' ' ? leader : '<Space>';

  const keys = new Set();
  for (const keyStr of Object.keys(map)) {
    const tokens = parseKeys(keyStr, leaderToken);
    if (tokens.length === 0) continue;
    const first = tokens[0];
    if (first.length === 1) {
      keys.add(first);
    } else {
      keys.add(first); // canonical named token, resolved by preload
    }
  }
  return keys;
}
