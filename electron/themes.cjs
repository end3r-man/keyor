const path = require('path');
const fs = require('fs');
const os = require('os');

const keyorDir = path.join(os.homedir(), '.keyor');
const themeFile = path.join(keyorDir, 'theme.json');

const BUILTIN_THEMES = {
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
  everforest: {
    name: 'Everforest',
    author: 'sainnhe',
    type: 'dark',
    colors: {
      bgPrimary: '#272e33',
      bgSecondary: '#2d353b',
      bgSurface: '#343f44',
      bgHover: '#3d484d',
      borderSubtle: 'rgba(211, 198, 170, 0.08)',
      borderMuted: 'rgba(211, 198, 170, 0.16)',
      textMain: '#d3c6aa',
      textMuted: '#9da9a0',
      textDim: '#7a8478',
      accentVim: '#a7c080',
      accentBlue: '#7fbbb3',
      accentCyan: '#83c092',
      accentAmber: '#dbbc7f',
      accentPurple: '#d699b6',
      accentRose: '#e67e80'
    }
  },
  kanagawa: {
    name: 'Kanagawa',
    author: 'rebelot',
    type: 'dark',
    colors: {
      bgPrimary: '#16161d',
      bgSecondary: '#1f1f28',
      bgSurface: '#2a2a37',
      bgHover: '#363646',
      borderSubtle: 'rgba(220, 215, 186, 0.08)',
      borderMuted: 'rgba(220, 215, 186, 0.16)',
      textMain: '#dcd7ba',
      textMuted: '#957fb8',
      textDim: '#727169',
      accentVim: '#76946a',
      accentBlue: '#7e9cd8',
      accentCyan: '#7aa89f',
      accentAmber: '#c0a36e',
      accentPurple: '#957fb8',
      accentRose: '#c34043'
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

const DEFAULT_THEME_CONFIG = {
  $schema: 'https://keyor.dev/schemas/theme.json',
  description: 'Keyor Vim Theme Configuration. Edit colors, add custom themes, or switch active_theme.',
  active_theme: 'tokyonight',
  themes: BUILTIN_THEMES
};

/**
 * Ensure ~/.keyor directory and ~/.keyor/theme.json exist.
 */
function ensureThemeConfig() {
  try {
    if (!fs.existsSync(keyorDir)) {
      fs.mkdirSync(keyorDir, { recursive: true });
    }

    if (!fs.existsSync(themeFile)) {
      fs.writeFileSync(themeFile, JSON.stringify(DEFAULT_THEME_CONFIG, null, 2), 'utf-8');
      console.log(`Created default Vim theme config at ${themeFile}`);
    }
  } catch (err) {
    console.error(`Error ensuring theme configuration at ${themeFile}:`, err);
  }
}

/**
 * Load and merge theme configuration from ~/.keyor/theme.json
 */
function loadThemeConfig() {
  try {
    ensureThemeConfig();
    if (fs.existsSync(themeFile)) {
      const content = fs.readFileSync(themeFile, 'utf-8');
      const parsed = JSON.parse(content);
      
      // Merge with builtin themes so user themes complement builtins
      const themes = {
        ...BUILTIN_THEMES,
        ...(parsed.themes || {})
      };

      return {
        active_theme: parsed.active_theme || 'tokyonight',
        themes,
        themePath: themeFile
      };
    }
  } catch (err) {
    console.error(`Error reading ${themeFile}:`, err);
  }

  return {
    active_theme: 'tokyonight',
    themes: BUILTIN_THEMES,
    themePath: themeFile
  };
}

/**
 * Save updated theme configuration to ~/.keyor/theme.json
 */
function saveThemeConfig(data) {
  try {
    ensureThemeConfig();
    // Preserve existing file properties if possible
    let existing = {};
    if (fs.existsSync(themeFile)) {
      try {
        existing = JSON.parse(fs.readFileSync(themeFile, 'utf-8'));
      } catch (e) {
        existing = {};
      }
    }

    const merged = {
      $schema: 'https://keyor.dev/schemas/theme.json',
      description: 'Keyor Vim Theme Configuration. Edit colors, add custom themes, or switch active_theme.',
      active_theme: data.active_theme || existing.active_theme || 'tokyonight',
      themes: data.themes || existing.themes || BUILTIN_THEMES
    };

    fs.writeFileSync(themeFile, JSON.stringify(merged, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${themeFile}:`, err);
    return false;
  }
}

/**
 * Watch ~/.keyor/theme.json and notify on external changes (e.g. edited in Vim/Neovim)
 */
function setupThemeWatcher(callback) {
  ensureThemeConfig();

  let debounceTimer = null;
  try {
    // Watching the directory handles atomic file saves performed by text editors
    fs.watch(keyorDir, (eventType, filename) => {
      if (filename === 'theme.json' || !filename) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          try {
            const config = loadThemeConfig();
            callback(config);
          } catch (e) {
            console.error('Error reloading theme on watch event:', e);
          }
        }, 120);
      }
    });
  } catch (err) {
    console.error(`Failed to watch directory ${keyorDir}:`, err);
  }
}

module.exports = {
  keyorDir,
  themeFile,
  BUILTIN_THEMES,
  ensureThemeConfig,
  loadThemeConfig,
  saveThemeConfig,
  setupThemeWatcher
};
