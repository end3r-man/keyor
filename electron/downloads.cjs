const { app, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const userDataPath = app.getPath('userData');
const downloadsFile = path.join(userDataPath, 'downloads.json');

// Map of currently active Electron DownloadItems: id -> DownloadItem
const activeDownloadItems = new Map();

// Helper to safely load JSON
function loadJson(filePath, defaultValue) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return defaultValue;
}

// Helper to safely save JSON
function saveJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
}

// In-memory list of download records
let downloadsHistory = loadJson(downloadsFile, []);

function saveHistory() {
  saveJson(downloadsFile, downloadsHistory);
}

/**
 * Setup download listeners on provided Electron sessions
 * @param {Array<Electron.Session>} sessions
 * @param {Function} broadcastEvent (eventName, data) => void
 */
function setupDownloads(sessions, broadcastEvent) {
  sessions.forEach((ses) => {
    if (!ses) return;

    ses.on('will-download', (event, item, webContents) => {
      const id = `dl-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const filename = item.getFilename() || 'download';
      const totalBytes = item.getTotalBytes() || 0;
      const url = item.getURL() || '';
      const mimeType = item.getMimeType() || '';
      const startTime = Date.now();

      // Determine unique destination file path in user's Downloads directory
      const downloadsDir = app.getPath('downloads');
      let targetPath = path.join(downloadsDir, filename);
      const ext = path.extname(filename);
      const base = path.basename(filename, ext);
      let counter = 1;

      while (fs.existsSync(targetPath)) {
        targetPath = path.join(downloadsDir, `${base} (${counter})${ext}`);
        counter++;
      }

      item.setSavePath(targetPath);
      activeDownloadItems.set(id, item);

      const downloadRecord = {
        id,
        filename: path.basename(targetPath),
        url,
        savePath: targetPath,
        receivedBytes: 0,
        totalBytes,
        percent: 0,
        speed: 0,
        state: 'progressing',
        mimeType,
        startTime,
        endTime: null
      };

      // Insert at the beginning of the history
      downloadsHistory.unshift(downloadRecord);
      saveHistory();

      broadcastEvent('download-started', { ...downloadRecord });

      let lastBytes = 0;
      let lastTime = Date.now();

      item.on('updated', (event, state) => {
        const now = Date.now();
        const receivedBytes = item.getReceivedBytes();
        const curTotalBytes = item.getTotalBytes() || totalBytes;

        const timeDiff = (now - lastTime) / 1000;
        let speed = 0;
        if (timeDiff > 0.5) {
          speed = Math.max(0, Math.round((receivedBytes - lastBytes) / timeDiff));
          lastBytes = receivedBytes;
          lastTime = now;
        }

        const percent = curTotalBytes > 0 ? Math.min(100, Math.round((receivedBytes / curTotalBytes) * 100)) : 0;

        downloadRecord.receivedBytes = receivedBytes;
        downloadRecord.totalBytes = curTotalBytes;
        downloadRecord.percent = percent;
        downloadRecord.speed = speed;
        downloadRecord.state = state; // 'progressing' or 'interrupted'

        broadcastEvent('download-progress', { ...downloadRecord });
      });

      item.once('done', (event, state) => {
        activeDownloadItems.delete(id);
        const endTime = Date.now();

        downloadRecord.state = state; // 'completed', 'cancelled', or 'interrupted'
        downloadRecord.endTime = endTime;
        downloadRecord.speed = 0;

        if (state === 'completed') {
          downloadRecord.percent = 100;
          downloadRecord.receivedBytes = downloadRecord.totalBytes || item.getReceivedBytes();
          broadcastEvent('download-completed', { ...downloadRecord });
        } else {
          broadcastEvent('download-failed', { ...downloadRecord });
        }

        saveHistory();
      });
    });
  });
}

function getDownloads() {
  // Check if savePath still exists for completed items
  return downloadsHistory.map(d => ({
    ...d,
    fileExists: d.savePath ? fs.existsSync(d.savePath) : false
  }));
}

function cancelDownload(id) {
  const item = activeDownloadItems.get(id);
  if (item && item.getState() === 'progressing') {
    item.cancel();
    activeDownloadItems.delete(id);
    return true;
  }
  return false;
}

async function openDownloadFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return false;
  }
  try {
    await shell.openPath(filePath);
    return true;
  } catch (e) {
    console.error('Failed to open downloaded file:', e);
    return false;
  }
}

function showDownloadInFolder(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return false;
  }
  try {
    shell.showItemInFolder(filePath);
    return true;
  } catch (e) {
    console.error('Failed to show download in folder:', e);
    return false;
  }
}

function removeDownload(id) {
  const item = activeDownloadItems.get(id);
  if (item) {
    item.cancel();
    activeDownloadItems.delete(id);
  }
  downloadsHistory = downloadsHistory.filter(d => d.id !== id);
  saveHistory();
  return true;
}

function clearDownloads() {
  // Keep only active progressing downloads
  downloadsHistory = downloadsHistory.filter(d => d.state === 'progressing');
  saveHistory();
  return true;
}

module.exports = {
  setupDownloads,
  getDownloads,
  cancelDownload,
  openDownloadFile,
  showDownloadInFolder,
  removeDownload,
  clearDownloads
};
