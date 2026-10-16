import { ref, computed } from 'vue';
import { createKeymapEngine, canonicalEventKey, parseKeys } from '../config/keymapEngine';
import { DEFAULT_CONFIG } from '../config/defaultConfig';

const config = ref(DEFAULT_CONFIG);
const pendingText = ref('');
const pendingCount = ref(0);
const isLoaded = ref(false);

const engine = createKeymapEngine();
let resolver = null;

function normalizeOptions(cfg) {
  return {
    ...DEFAULT_CONFIG.options,
    ...(cfg?.options || {}),
  };
}

function mergeConfig(userCfg) {
  if (!userCfg) return DEFAULT_CONFIG;
  return {
    colorscheme: userCfg.colorscheme || DEFAULT_CONFIG.colorscheme,
    colorschemes: { ...DEFAULT_CONFIG.colorschemes, ...(userCfg.colorschemes || {}) },
    options: normalizeOptions(userCfg),
    keymaps: {
      normal: { ...DEFAULT_CONFIG.keymaps.normal, ...(userCfg.keymaps?.normal || {}) },
      insert: { ...DEFAULT_CONFIG.keymaps.insert, ...(userCfg.keymaps?.insert || {}) },
    },
  };
}

// Collect raw `event.key` values that the guest page must intercept for a mode.
function computeInterceptKeys(cfg, mode) {
  const map = cfg.keymaps?.[mode] || {};
  const leader = cfg.options?.leader || '<Space>';
  const leaderToken = leader.length === 1 && leader !== ' ' ? leader : '<Space>';
  const keys = new Set();

  for (const keyStr of Object.keys(map)) {
    const tokens = parseKeys(keyStr, leaderToken);
    if (tokens.length === 0) continue;
    const first = tokens[0];
    if (first.length === 1) {
      keys.add(first);
    } else {
      keys.add(first);
    }
  }
  // Always allow numeric counts to be intercepted in normal mode.
  if (mode === 'normal') {
    for (let i = 0; i <= 9; i += 1) keys.add(String(i));
  }
  return Array.from(keys);
}

export function useKeymaps() {
  const setResolver = (fn) => {
    resolver = fn;
  };

  engine.onResolve = (result) => {
    if (resolver) resolver(result);
  };
  engine.onChange = ({ pending, count }) => {
    pendingText.value = pending || '';
    pendingCount.value = count || 0;
  };

  const applyConfig = (rawCfg) => {
    config.value = mergeConfig(rawCfg);
    engine.load(config.value);
    pendingText.value = '';
    pendingCount.value = 0;
    return config.value;
  };

  const loadConfig = async () => {
    if (isLoaded.value) return config.value;
    isLoaded.value = true;
    try {
      if (window.electronAPI?.getConfig) {
        const cfg = await window.electronAPI.getConfig();
        return applyConfig(cfg);
      }
    } catch (e) {
      console.warn('Failed to load keyor config:', e);
    }
    return applyConfig(DEFAULT_CONFIG);
  };

  const reloadConfig = async () => {
    try {
      if (window.electronAPI?.getConfig) {
        return applyConfig(await window.electronAPI.getConfig());
      }
    } catch (e) {
      console.warn('Failed to reload keyor config:', e);
    }
    return applyConfig(DEFAULT_CONFIG);
  };

  const reset = () => {
    engine.reset();
    pendingText.value = '';
    pendingCount.value = 0;
  };

  const setMode = (mode) => engine.setMode(mode);

  /**
   * Feed a DOM KeyboardEvent for the given mode.
   * @returns {{status:string, keys?:string, count?:number}}
   */
  const feedEvent = (mode, event) => engine.feed(mode, canonicalEventKey(event));

  const feedToken = (mode, token, meta) => engine.feed(mode, token, meta);

  const interceptKeys = (mode) => computeInterceptKeys(config.value, mode);

  const options = computed(() => config.value.options);

  return {
    config,
    options,
    pendingText,
    pendingCount,
    isLoaded,
    loadConfig,
    reloadConfig,
    applyConfig,
    setMode,
    reset,
    feedEvent,
    feedToken,
    setResolver,
    interceptKeys,
    engine,
  };
}
