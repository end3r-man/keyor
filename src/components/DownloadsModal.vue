<template>
  <div class="dl-backdrop" @click.self="$emit('close')">
    <div class="dl-modal" @keydown="handleKeydown" tabindex="-1" ref="modalRoot">
      <!-- Modal Header -->
      <div class="dl-header">
        <div class="dl-title-wrap">
          <span class="dl-tag">DL</span>
          <h2 class="dl-title">Downloads Manager</h2>
          <span v-if="activeDownloadsCount > 0" class="active-badge">
            {{ activeDownloadsCount }} active
          </span>
        </div>

        <input
          ref="searchInput"
          v-model="searchQuery"
          class="dl-search-input"
          placeholder="Filter downloads... (j/k to navigate)"
          spellcheck="false"
        />

        <div class="header-actions">
          <button
            v-if="downloads.some(d => d.state !== 'progressing')"
            class="header-btn"
            @click="clearCompleted"
            title="Clear finished downloads"
          >
            Clear Finished
          </button>
          <button class="dl-close-btn" @click="$emit('close')" title="Close (Esc)">
            <X :size="13" />
          </button>
        </div>
      </div>

      <!-- Downloads List -->
      <div class="dl-list" ref="listContainer">
        <div v-if="filteredDownloads.length === 0" class="dl-empty">
          <span class="empty-icon"><Download :size="28" /></span>
          <span class="empty-text">
            {{ searchQuery ? `No downloads match "${searchQuery}"` : 'No downloads yet' }}
          </span>
          <span class="empty-sub">Files you download will appear here with real-time progress.</span>
        </div>

        <div
          v-for="(item, idx) in filteredDownloads"
          :key="item.id"
          class="dl-row"
          :class="{
            active: idx === selectedIndex,
            'is-progressing': item.state === 'progressing',
            'is-completed': item.state === 'completed',
            'is-failed': item.state === 'cancelled' || item.state === 'interrupted'
          }"
          @click="selectItem(idx)"
          @dblclick="handleOpen(item)"
        >
          <!-- File Icon -->
          <div class="dl-icon-wrap">
            <span class="file-icon"><DynamicIcon :name="getFileIcon(item.filename)" fallback="FileText" :size="16" /></span>
          </div>

          <!-- Main Info -->
          <div class="dl-info">
            <div class="dl-main-line">
              <span class="dl-filename" :title="item.filename">{{ item.filename }}</span>
              <span class="dl-time">{{ formatTime(item.endTime || item.startTime) }}</span>
            </div>

            <!-- Progress Bar (for active downloads) -->
            <div v-if="item.state === 'progressing'" class="dl-progress-bar-wrap">
              <div
                class="dl-progress-bar-fill"
                :style="{ width: `${item.percent || 0}%` }"
              ></div>
            </div>

            <!-- Sub details line -->
            <div class="dl-sub-line">
              <!-- Progress stats -->
              <span v-if="item.state === 'progressing'" class="dl-stat-text active-color">
                {{ formatBytes(item.receivedBytes) }} / {{ item.totalBytes > 0 ? formatBytes(item.totalBytes) : '?' }}
                ({{ item.percent }}%)
                <span v-if="item.speed > 0" class="dl-speed">• {{ formatSpeed(item.speed) }}</span>
              </span>

              <!-- Completed stats -->
              <span v-else-if="item.state === 'completed'" class="dl-stat-text completed-color">
                <Check class="stat-icon" :size="11" /> {{ formatBytes(item.receivedBytes || item.totalBytes) }}
                <span v-if="!item.fileExists" class="file-missing-tag">(moved or deleted)</span>
              </span>

              <!-- Failed / Cancelled stats -->
              <span v-else class="dl-stat-text failed-color">
                <X class="stat-icon" :size="11" /> {{ item.state === 'cancelled' ? 'Cancelled' : 'Failed' }}
              </span>

              <!-- URL origin hint -->
              <span class="dl-origin-url" :title="item.url">
                {{ formatDomain(item.url) }}
              </span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="dl-actions">
            <!-- Cancel for progressing -->
            <button
              v-if="item.state === 'progressing'"
              class="dl-action-btn cancel-btn"
              @click.stop="handleCancel(item)"
              title="Cancel download (x)"
            >
              Cancel
            </button>

            <!-- Open file for completed -->
            <button
              v-if="item.state === 'completed' && item.fileExists !== false"
              class="dl-action-btn open-btn"
              @click.stop="handleOpen(item)"
              title="Open file (Enter)"
            >
              Open
            </button>

            <!-- Show in folder -->
            <button
              v-if="item.savePath && item.fileExists !== false"
              class="dl-action-btn folder-btn"
              @click.stop="handleShowInFolder(item)"
              title="Show in folder (f)"
            >
              <FolderOpen :size="13" />
            </button>

            <!-- Delete from history -->
            <button
              class="dl-action-btn delete-btn"
              @click.stop="handleRemove(item)"
              title="Remove from list (x)"
            >
              <X :size="13" />
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="dl-footer">
        <div class="footer-tip">
          <kbd>j</kbd>/<kbd>k</kbd> navigate &nbsp;
          <kbd><CornerDownLeft :size="10" /></kbd> open file &nbsp;
          <kbd>f</kbd> reveal in folder &nbsp;
          <kbd>x</kbd> cancel/remove &nbsp;
          <kbd>Esc</kbd> close
        </div>
        <div v-if="activeSpeed > 0" class="footer-speed">
          Total speed: <strong>{{ formatSpeed(activeSpeed) }}</strong>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { X, Check, Download, FolderOpen, CornerDownLeft } from '@lucide/vue';
import DynamicIcon from './DynamicIcon.vue';
import { useDownloads } from '../composables/useDownloads';

const emit = defineEmits(['close']);

const {
  downloads,
  activeDownloadsCount,
  activeSpeed,
  cancel,
  openFile,
  showInFolder,
  remove,
  clear,
  formatBytes,
  formatSpeed,
  formatTime
} = useDownloads();

const searchQuery = ref('');
const selectedIndex = ref(0);
const modalRoot = ref(null);
const searchInput = ref(null);
const listContainer = ref(null);

const filteredDownloads = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return downloads.value;
  return downloads.value.filter(d =>
    (d.filename && d.filename.toLowerCase().includes(q)) ||
    (d.url && d.url.toLowerCase().includes(q))
  );
});

onMounted(() => {
  nextTick(() => {
    modalRoot.value?.focus();
  });
});

const selectItem = (idx) => {
  selectedIndex.value = idx;
};

const handleOpen = async (item) => {
  if (item.state === 'completed' && item.savePath) {
    await openFile(item.savePath);
  }
};

const handleShowInFolder = async (item) => {
  if (item.savePath) {
    await showInFolder(item.savePath);
  }
};

const handleCancel = async (item) => {
  await cancel(item.id);
};

const handleRemove = async (item) => {
  await remove(item.id);
  if (selectedIndex.value >= filteredDownloads.value.length) {
    selectedIndex.value = Math.max(0, filteredDownloads.value.length - 1);
  }
};

const clearCompleted = async () => {
  await clear();
  selectedIndex.value = 0;
};

const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    emit('close');
    return;
  }

  // Navigation j/k or ArrowDown/ArrowUp
  if (e.key === 'j' || e.key === 'ArrowDown') {
    if (document.activeElement !== searchInput.value) {
      e.preventDefault();
      if (filteredDownloads.value.length > 0) {
        selectedIndex.value = (selectedIndex.value + 1) % filteredDownloads.value.length;
        scrollToSelected();
      }
      return;
    }
  }

  if (e.key === 'k' || e.key === 'ArrowUp') {
    if (document.activeElement !== searchInput.value) {
      e.preventDefault();
      if (filteredDownloads.value.length > 0) {
        selectedIndex.value = (selectedIndex.value - 1 + filteredDownloads.value.length) % filteredDownloads.value.length;
        scrollToSelected();
      }
      return;
    }
  }

  // Open on Enter
  if (e.key === 'Enter') {
    e.preventDefault();
    const item = filteredDownloads.value[selectedIndex.value];
    if (item) {
      handleOpen(item);
    }
    return;
  }

  // Reveal in folder on 'f'
  if (e.key === 'f' && document.activeElement !== searchInput.value) {
    e.preventDefault();
    const item = filteredDownloads.value[selectedIndex.value];
    if (item) {
      handleShowInFolder(item);
    }
    return;
  }

  // Delete/Cancel on 'x' or 'd'
  if ((e.key === 'x' || e.key === 'd') && document.activeElement !== searchInput.value) {
    e.preventDefault();
    const item = filteredDownloads.value[selectedIndex.value];
    if (item) {
      if (item.state === 'progressing') {
        handleCancel(item);
      } else {
        handleRemove(item);
      }
    }
    return;
  }
};

const scrollToSelected = () => {
  nextTick(() => {
    const activeEl = listContainer.value?.querySelector('.dl-row.active');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  });
};

const getFileIcon = (filename) => {
  if (!filename) return 'FileText';
  const ext = filename.split('.').pop().toLowerCase();
  if (['zip', 'tar', 'gz', 'bz2', 'xz', '7z', 'rar'].includes(ext)) return 'Package';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext)) return 'Image';
  if (['pdf', 'doc', 'docx', 'odt'].includes(ext)) return 'BookOpen';
  if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) return 'Film';
  if (['mp3', 'flac', 'wav', 'ogg', 'm4a'].includes(ext)) return 'Music';
  if (['js', 'ts', 'json', 'html', 'css', 'py', 'c', 'cpp', 'rs', 'go'].includes(ext)) return 'Code';
  if (['deb', 'rpm', 'appimage', 'exe', 'dmg', 'iso'].includes(ext)) return 'Disc';
  return 'FileText';
};

const formatDomain = (url) => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch (e) {
    return '';
  }
};
</script>

<style scoped>
.dl-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(5, 7, 10, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 12vh;
  z-index: 1000;
  animation: fadeIn 0.1s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.dl-modal {
  width: 100%;
  max-width: 680px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55);
  display: flex;
  flex-direction: column;
  outline: none;
}

.dl-header {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  gap: 12px;
}

.dl-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dl-tag {
  background: rgba(59, 130, 246, 0.12);
  color: var(--accent-blue);
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 9.5px;
  padding: 1px 5px;
  border-radius: 3px;
  border: 1px solid rgba(59, 130, 246, 0.25);
}

.dl-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
}

.active-badge {
  background: rgba(16, 185, 129, 0.12);
  color: var(--accent-vim);
  font-family: var(--font-mono);
  font-size: 9.5px;
  padding: 1px 5px;
  border-radius: 3px;
  border: 1px solid rgba(16, 185, 129, 0.2);
  white-space: nowrap;
}

.dl-search-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  color: var(--text-main);
  font-family: var(--font-mono);
  font-size: 11.5px;
  padding: 4px 8px;
  outline: none;
  transition: border-color 0.12s ease;
}

.dl-search-input:focus {
  border-color: var(--accent-blue);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-btn {
  background: transparent;
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  font-size: 10.5px;
  padding: 3px 7px;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.header-btn:hover {
  background: var(--bg-hover);
  color: var(--text-main);
}

.dl-close-btn {
  background: transparent;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  transition: all 0.12s ease;
}

.dl-close-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.dl-list {
  max-height: 380px;
  overflow-y: auto;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dl-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 6px;
  text-align: center;
}

.empty-icon {
  display: flex;
  justify-content: center;
  color: var(--text-dim);
}

.stat-icon {
  vertical-align: -1px;
}

.empty-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-main);
}

.empty-sub {
  font-size: 11px;
  color: var(--text-dim);
}

.dl-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s ease;
  border: 1px solid transparent;
}

.dl-row:hover,
.dl-row.active {
  background: var(--bg-hover);
}

.dl-row.active {
  border-color: var(--border-subtle);
}

.dl-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.dl-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.dl-main-line {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}

.dl-filename {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dl-time {
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--text-dim);
  white-space: nowrap;
}

.dl-progress-bar-wrap {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.07);
  border-radius: 2px;
  overflow: hidden;
}

.dl-progress-bar-fill {
  height: 100%;
  background: var(--accent-blue);
  transition: width 0.2s ease;
}

.dl-sub-line {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10.5px;
  font-family: var(--font-mono);
}

.dl-stat-text {
  font-weight: 500;
}

.active-color {
  color: var(--accent-blue);
}

.completed-color {
  color: var(--accent-vim);
}

.failed-color {
  color: var(--accent-rose);
}

.file-missing-tag {
  color: var(--text-dim);
  font-weight: normal;
  font-size: 9.5px;
}

.dl-speed {
  color: var(--accent-cyan);
}

.dl-origin-url {
  color: var(--text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  text-align: right;
}

.dl-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.dl-action-btn {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  border-radius: 3px;
  font-size: 10.5px;
  padding: 3px 6px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.dl-action-btn:hover {
  background: var(--bg-hover);
  color: var(--text-main);
  border-color: var(--border-muted);
}

.open-btn {
  color: var(--accent-vim);
}

.cancel-btn {
  color: var(--accent-rose);
}

.delete-btn {
  padding: 3px 5px;
  font-size: 9.5px;
}

.dl-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 14px;
  background: var(--bg-surface);
  border-top: 1px solid var(--border-subtle);
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-dim);
}

.footer-speed strong {
  color: var(--accent-cyan);
}
</style>
