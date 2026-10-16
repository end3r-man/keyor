import {
  Zap,
  Volume2,
  Download,
  X,
  Check,
  FolderOpen,
  CornerDownLeft,
  Package,
  Image,
  BookOpen,
  Film,
  Music,
  Code,
  Disc,
  FileText,
  Bookmark,
  Search,
  Leaf,
  Keyboard,
  Globe,
  Circle,
} from '@lucide/vue';

/**
 * Explicit icon registry so the bundler can tree-shake the rest of Lucide.
 * Add a new icon here when a component or stored bookmark references it.
 */
const ICONS = {
  Zap,
  Volume2,
  Download,
  X,
  Check,
  FolderOpen,
  CornerDownLeft,
  Package,
  Image,
  BookOpen,
  Film,
  Music,
  Code,
  Disc,
  FileText,
  Bookmark,
  Search,
  Leaf,
  Keyboard,
  Globe,
  Circle,
};

// Backward compatibility: old bookmarks/downloads stored emoji as their icon.
const EMOJI_ALIASES = {
  '🦆': 'Search',
  '🐙': 'Code',
  '⚡': 'Zap',
  '🟢': 'Leaf',
  '📚': 'BookOpen',
  '⌨️': 'Keyboard',
  '🔖': 'Bookmark',
  '🌐': 'Globe',
  '📄': 'FileText',
  '📦': 'Package',
  '🖼️': 'Image',
  '📕': 'BookOpen',
  '🎬': 'Film',
  '🎵': 'Music',
  '💻': 'Code',
  '💿': 'Disc',
  '📁': 'FolderOpen',
  '📥': 'Download',
};

/**
 * Resolve a Lucide icon component by name.
 *
 * Accepts the registry name ("BookOpen") or the legacy emoji values stored in
 * older data. Always returns a component so callers never have to null-check.
 */
export function resolveIcon(name, fallback = 'Circle') {
  if (!name) return ICONS[fallback] || ICONS.Circle;
  const key = EMOJI_ALIASES[name] || name;
  return ICONS[key] || ICONS[fallback] || ICONS.Circle;
}
