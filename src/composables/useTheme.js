import { ref, computed } from 'vue';

const FALLBACK_THEMES = {
  tokyonight: {
    name: 'Tokyo Night',
    author: 'folke',
    type: 'dark',
    colors: {
      bgPrimary: '#1a1b26',
      bgSecondary: '#16161e',
      bgSurface: '#1f2335',
      bgHover: '#292e42',
      borderSubtle: 'rgba(192, 202, 245, 0.08)',
      borderMuted: 'rgba(192, 202, 245, 0.16)',
      textMain: '#c0caf5',
      textMuted: '#7aa2f7',
      textDim: '#565f89',
      accentVim: '#9ece6a',
      accentBlue: '#7aa2f7',
      accentCyan: '#7dcfff',
      accentAmber: '#e0af68',
      accentPurple: '#bb9af7',
      accentRose: '#f7768e'
    }
  },
  gruvbox: {
    name: 'Gruvbox Dark',
    author: 'morhetz',
    type: 'dark',
    colors: {
      bgPrimary: '#1d2021',
      bgSecondary: '#282828',
      bgSurface: '#32302f',
      bgHover: '#3c3836',
      borderSubtle: 'rgba(235, 219, 178, 0.08)',
      borderMuted: 'rgba(235, 219, 178, 0.16)',
      textMain: '#ebdbb2',
      textMuted: '#a89984',
      textDim: '#7c6f64',
      accentVim: '#b8bb26',
      accentBlue: '#83a598',
      accentCyan: '#8ec07c',
      accentAmber: '#fabd2f',
      accentPurple: '#d3869b',
      accentRose: '#fb4934'
    }
  },
  nord: {
    name: 'Nord',
    author: 'arcticicestudio',
    type: 'dark',
    colors: {
      bgPrimary: '#242933',
      bgSecondary: '#2e3440',
      bgSurface: '#3b4252',
      bgHover: '#434c5e',
      borderSubtle: 'rgba(216, 222, 233, 0.08)',
      borderMuted: 'rgba(216, 222, 233, 0.16)',
      textMain: '#eceff4',
      textMuted: '#d8dee9',
      textDim: '#4c566a',
      accentVim: '#a3be8c',
      accentBlue: '#88c0d0',
      accentCyan: '#81a1c1',
      accentAmber: '#ebcb8b',
      accentPurple: '#b48ead',
      accentRose: '#bf616a'
    }
  },
  catppuccin: {
    name: 'Catppuccin Mocha',
    author: 'catppuccin',
    type: 'dark',
    colors: {
      bgPrimary: '#181825',
      bgSecondary: '#1e1e2e',
      bgSurface: '#313244',
      bgHover: '#45475a',
      borderSubtle: 'rgba(205, 214, 244, 0.08)',
      borderMuted: 'rgba(205, 214, 244, 0.16)',
      textMain: '#cdd6f4',
      textMuted: '#a6adc8',
      textDim: '#6c7086',
      accentVim: '#a6e3a1',
      accentBlue: '#89b4fa',
      accentCyan: '#94e2d5',
      accentAmber: '#f9e2af',
      accentPurple: '#cba6f7',
      accentRose: '#f38ba8'
    }
  },
  onedark: {
    name: 'One Dark Pro',
    author: 'atom',
    type: 'dark',
    colors: {
      bgPrimary: '#1e222a',
      bgSecondary: '#21252b',
      bgSurface: '#282c34',
      bgHover: '#2c313a',
      borderSubtle: 'rgba(171, 178, 191, 0.08)',
      borderMuted: 'rgba(171, 178, 191, 0.16)',
      textMain: '#abb2bf',
      textMuted: '#828997',
      textDim: '#5c6370',
      accentVim: '#98c379',
      accentBlue: '#61afef',
      accentCyan: '#56b6c2',
      accentAmber: '#e5c07b',
      accentPurple: '#c678dd',
      accentRose: '#e06c75'
    }
  },
  rosepine: {
    name: 'Rosé Pine',
    author: 'rose-pine',
    type: 'dark',
    colors: {
      bgPrimary: '#13121d',
      bgSecondary: '#191724',
      bgSurface: '#1f1d2e',
      bgHover: '#26233a',
      borderSubtle: 'rgba(224, 222, 244, 0.08)',
      borderMuted: 'rgba(224, 222, 244, 0.16)',
      textMain: '#e0def4',
      textMuted: '#908caa',
      textDim: '#6e6a86',
      accentVim: '#31748f',
      accentBlue: '#9ccfd8',
      accentCyan: '#c4a7e7',
      accentAmber: '#f6c177',
      accentPurple: '#c4a7e7',
      accentRose: '#eb6f92'
    }
  },
  dracula: {
    name: 'Dracula',
    author: 'dracula',
    type: 'dark',
    colors: {
      bgPrimary: '#1e1f29',
      bgSecondary: '#282a36',
      bgSurface: '#343746',
      bgHover: '#44475a',
      borderSubtle: 'rgba(248, 248, 242, 0.08)',
      borderMuted: 'rgba(248, 248, 242, 0.16)',
      textMain: '#f8f8f2',
      textMuted: '#bd93f9',
      textDim: '#6272a4',
      accentVim: '#50fa7b',
      accentBlue: '#8be9fd',
      accentCyan: '#8be9fd',
      accentAmber: '#f1fa8c',
      accentPurple: '#bd93f9',
      accentRose: '#ff79c6'
    }
  },
  keyor: {
    name: 'Keyor Obsidian',
    author: 'keyor',
    type: 'dark',
    colors: {
      bgPrimary: '#0a0b0e',
      bgSecondary: '#0f1116',
      bgSurface: '#14161d',
      bgHover: '#1a1e27',
      borderSubtle: 'rgba(255, 255, 255, 0.07)',
      borderMuted: 'rgba(255, 255, 255, 0.12)',
      textMain: '#f1f3f7',
      textMuted: '#8b929e',
      textDim: '#555b68',
      accentVim: '#10b981',
      accentBlue: '#3b82f6',
      accentCyan: '#06b6d4',
      accentAmber: '#f59e0b',
      accentPurple: '#a855f7',
      accentRose: '#f43f5e'
    }
  }
};

const activeThemeName = ref('tokyonight');
const allThemes = ref(FALLBACK_THEMES);
const themePath = ref('~/.keyor/theme.json');
let isInitialized = false;

export function useTheme() {
  const currentTheme = computed(() => {
    return allThemes.value[activeThemeName.value] || allThemes.value['tokyonight'] || Object.values(allThemes.value)[0];
  });

  const availableThemeNames = computed(() => {
    return Object.keys(allThemes.value);
  });

  const availableThemesList = computed(() => {
    return Object.entries(allThemes.value).map(([id, t]) => ({
      id,
      name: t.name || id,
      author: t.author || '',
      type: t.type || 'dark'
    }));
  });

  /**
   * Apply theme color variables to document.documentElement
   */
  const applyColors = (colors) => {
    if (!colors) return;
    const root = document.documentElement;

    if (colors.bgPrimary) root.style.setProperty('--bg-primary', colors.bgPrimary);
    if (colors.bgSecondary) root.style.setProperty('--bg-secondary', colors.bgSecondary);
    if (colors.bgSurface) root.style.setProperty('--bg-surface', colors.bgSurface);
    if (colors.bgHover) root.style.setProperty('--bg-hover', colors.bgHover);
    if (colors.borderSubtle) root.style.setProperty('--border-subtle', colors.borderSubtle);
    if (colors.borderMuted) root.style.setProperty('--border-muted', colors.borderMuted);
    if (colors.textMain) root.style.setProperty('--text-main', colors.textMain);
    if (colors.textMuted) root.style.setProperty('--text-muted', colors.textMuted);
    if (colors.textDim) root.style.setProperty('--text-dim', colors.textDim);
    if (colors.accentVim) root.style.setProperty('--accent-vim', colors.accentVim);
    if (colors.accentBlue) root.style.setProperty('--accent-blue', colors.accentBlue);
    if (colors.accentCyan) root.style.setProperty('--accent-cyan', colors.accentCyan);
    if (colors.accentAmber) root.style.setProperty('--accent-amber', colors.accentAmber);
    if (colors.accentPurple) root.style.setProperty('--accent-purple', colors.accentPurple);
    if (colors.accentRose) root.style.setProperty('--accent-rose', colors.accentRose);
  };

  /**
   * Switch the active theme by key/name
   */
  const switchTheme = async (query) => {
    const clean = (query || '').trim().toLowerCase();
    if (!clean) {
      return {
        success: false,
        message: 'No theme specified',
        current: activeThemeName.value,
        available: Object.keys(allThemes.value)
      };
    }

    // Exact match or partial match
    let matchKey = Object.keys(allThemes.value).find(k => k.toLowerCase() === clean);
    if (!matchKey) {
      matchKey = Object.keys(allThemes.value).find(k => k.toLowerCase().includes(clean));
    }
    if (!matchKey) {
      // Try matching by theme's display name
      const entry = Object.entries(allThemes.value).find(([_, t]) => (t.name || '').toLowerCase().includes(clean));
      if (entry) matchKey = entry[0];
    }

    if (!matchKey) {
      return {
        success: false,
        message: `Unknown colorscheme: '${query}'`,
        current: activeThemeName.value,
        available: Object.keys(allThemes.value)
      };
    }

    activeThemeName.value = matchKey;
    const themeObj = allThemes.value[matchKey];
    applyColors(themeObj.colors);

    // Save active theme to ~/.keyor/theme.json
    if (window.electronAPI?.saveTheme) {
      try {
        await window.electronAPI.saveTheme({
          active_theme: matchKey,
          themes: JSON.parse(JSON.stringify(allThemes.value))
        });
      } catch (err) {
        console.error('Failed to persist active theme:', err);
      }
    }

    return {
      success: true,
      themeId: matchKey,
      themeName: themeObj.name || matchKey
    };
  };

  /**
   * Open ~/.keyor/theme.json in system editor
   */
  const openConfigFile = async () => {
    if (window.electronAPI?.openThemeFile) {
      return await window.electronAPI.openThemeFile();
    }
    return false;
  };

  /**
   * Initialize theme configuration on app mount
   */
  const initTheme = async () => {
    if (isInitialized) return;
    isInitialized = true;

    try {
      if (window.electronAPI?.getTheme) {
        const config = await window.electronAPI.getTheme();
        if (config) {
          if (config.themes) {
            allThemes.value = { ...FALLBACK_THEMES, ...config.themes };
          }
          if (config.active_theme && allThemes.value[config.active_theme]) {
            activeThemeName.value = config.active_theme;
          }
          if (config.themePath) {
            themePath.value = config.themePath;
          }
        }
      }

      // Apply initial colors
      const themeObj = allThemes.value[activeThemeName.value] || allThemes.value['tokyonight'];
      if (themeObj?.colors) {
        applyColors(themeObj.colors);
      }

      // Listen for hot-reload file watcher changes from ~/.keyor/theme.json
      if (window.electronAPI?.onThemeChange) {
        window.electronAPI.onThemeChange((newConfig) => {
          if (!newConfig) return;
          if (newConfig.themes) {
            allThemes.value = { ...FALLBACK_THEMES, ...newConfig.themes };
          }
          if (newConfig.active_theme && allThemes.value[newConfig.active_theme]) {
            activeThemeName.value = newConfig.active_theme;
          }
          const updatedTheme = allThemes.value[activeThemeName.value];
          if (updatedTheme?.colors) {
            applyColors(updatedTheme.colors);
          }
        });
      }
    } catch (err) {
      console.error('Error initializing theme:', err);
      // Fallback
      applyColors(FALLBACK_THEMES.tokyonight.colors);
    }
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
    applyColors
  };
}
