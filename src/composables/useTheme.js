import { ref, computed } from 'vue';

/**
 * Theme engine backed by the unified Keyor config (`~/.keyor/init.js`).
 * The Electron main process merges builtin colorschemes with the user's
 * `colorschemes`, so `config.colorschemes` is always complete.
 */

const FALLBACK_THEMES = {
  tokyonight: {
    name: 'Tokyo Night', author: 'folke', type: 'dark',
    colors: {
      bgPrimary: '#1a1b26', bgSecondary: '#16161e', bgSurface: '#1f2335', bgHover: '#292e42',
      borderSubtle: 'rgba(192, 202, 245, 0.08)', borderMuted: 'rgba(192, 202, 245, 0.16)',
      textMain: '#c0caf5', textMuted: '#7aa2f7', textDim: '#565f89',
      accentVim: '#9ece6a', accentBlue: '#7aa2f7', accentCyan: '#7dcfff', accentAmber: '#e0af68', accentPurple: '#bb9af7', accentRose: '#f7768e'
    }
  }
};

const activeThemeName = ref('tokyonight');
const allThemes = ref(FALLBACK_THEMES);
const themePath = ref('~/.keyor/init.js');
let isInitialized = false;

export function useTheme() {
  const currentTheme = computed(() => {
    return allThemes.value[activeThemeName.value] || Object.values(allThemes.value)[0] || null;
  });

  const availableThemeNames = computed(() => Object.keys(allThemes.value));

  const availableThemesList = computed(() =>
    Object.entries(allThemes.value).map(([id, t]) => ({
      id,
      name: t.name || id,
      author: t.author || '',
      type: t.type || 'dark'
    }))
  );

  const applyColors = (colors) => {
    if (!colors) return;
    const root = document.documentElement;
    const map = {
      bgPrimary: '--bg-primary', bgSecondary: '--bg-secondary', bgSurface: '--bg-surface', bgHover: '--bg-hover',
      borderSubtle: '--border-subtle', borderMuted: '--border-muted',
      textMain: '--text-main', textMuted: '--text-muted', textDim: '--text-dim',
      accentVim: '--accent-vim', accentBlue: '--accent-blue', accentCyan: '--accent-cyan',
      accentAmber: '--accent-amber', accentPurple: '--accent-purple', accentRose: '--accent-rose'
    };
    for (const [key, cssVar] of Object.entries(map)) {
      if (colors[key]) root.style.setProperty(cssVar, colors[key]);
    }
  };

  const applyConfig = (config) => {
    if (!config) return;
    if (config.colorschemes && Object.keys(config.colorschemes).length > 0) {
      allThemes.value = config.colorschemes;
    }
    if (config.colorscheme && allThemes.value[config.colorscheme]) {
      activeThemeName.value = config.colorscheme;
    } else if (config.colorscheme) {
      activeThemeName.value = config.colorscheme;
    }
    if (config.path) themePath.value = config.path;
    const theme = allThemes.value[activeThemeName.value];
    if (theme?.colors) applyColors(theme.colors);
  };

  const switchTheme = async (query) => {
    const clean = (query || '').trim().toLowerCase();
    if (!clean) {
      return { success: false, current: activeThemeName.value, available: Object.keys(allThemes.value) };
    }

    let matchKey = Object.keys(allThemes.value).find((k) => k.toLowerCase() === clean);
    if (!matchKey) matchKey = Object.keys(allThemes.value).find((k) => k.toLowerCase().includes(clean));
    if (!matchKey) {
      const entry = Object.entries(allThemes.value).find(([, t]) => (t.name || '').toLowerCase().includes(clean));
      if (entry) matchKey = entry[0];
    }

    if (!matchKey) {
      return { success: false, message: `Unknown colorscheme: '${query}'`, current: activeThemeName.value, available: Object.keys(allThemes.value) };
    }

    activeThemeName.value = matchKey;
    applyColors(allThemes.value[matchKey].colors);

    if (window.electronAPI?.saveConfig) {
      try {
        await window.electronAPI.saveConfig({ colorscheme: matchKey });
      } catch (err) {
        console.error('Failed to persist colorscheme:', err);
      }
    }

    return { success: true, themeId: matchKey, themeName: allThemes.value[matchKey].name || matchKey };
  };

  const openConfigFile = async () => {
    if (window.electronAPI?.openConfigFile) return await window.electronAPI.openConfigFile();
    return false;
  };

  const initTheme = async () => {
    if (isInitialized) return;
    isInitialized = true;
    try {
      if (window.electronAPI?.getConfig) {
        applyConfig(await window.electronAPI.getConfig());
      }
      if (window.electronAPI?.onConfigChange) {
        window.electronAPI.onConfigChange((config) => applyConfig(config));
      }
    } catch (err) {
      console.error('Error initializing theme:', err);
      applyColors(FALLBACK_THEMES.tokyonight.colors);
    }
  };

  const setThemes = (themes, active) => {
    if (themes && Object.keys(themes).length > 0) allThemes.value = themes;
    if (active) activeThemeName.value = active;
    const theme = allThemes.value[activeThemeName.value];
    if (theme?.colors) applyColors(theme.colors);
  };

  return {
    activeThemeName,
    currentTheme,
    allThemes,
    themePath,
    availableThemeNames,
    availableThemesList,
    initTheme,
    switchTheme,
    openConfigFile,
    applyColors,
    applyConfig,
    setThemes
  };
}
