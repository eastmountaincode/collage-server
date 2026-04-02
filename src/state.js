const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', 'state.json');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// In-memory state: Map of id -> image object
const images = new Map();

let saveTimeout = null;

function scheduleSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    const data = JSON.stringify(Array.from(images.values()), null, 2);
    fs.writeFile(STATE_FILE, data, (err) => {
      if (err) console.error('Failed to save state:', err);
    });
  }, 1000);
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
      for (const img of data) {
        if (img.rotation === undefined) img.rotation = 0;
        images.set(img.id, img);
      }
      console.log(`Loaded ${images.size} images from state.json`);
    }
  } catch (err) {
    console.error('Failed to load state:', err);
  }
}

function getAll() {
  return Array.from(images.values());
}

function addImage(id, width, height, x = 0, y = 0) {
  let maxZ = -1;
  for (const img of images.values()) {
    if (img.zIndex > maxZ) maxZ = img.zIndex;
  }
  const image = { id, x, y, width, height, rotation: 0, zIndex: maxZ + 1 };
  images.set(id, image);
  scheduleSave();
  return image;
}

function updatePosition(id, x, y) {
  const img = images.get(id);
  if (!img) return null;
  img.x = x;
  img.y = y;
  scheduleSave();
  return img;
}

function updateSize(id, x, y, width, height) {
  const img = images.get(id);
  if (!img) return null;
  img.x = x;
  img.y = y;
  img.width = width;
  img.height = height;
  scheduleSave();
  return img;
}

function updateTransform(id, x, y, width, height, rotation) {
  const img = images.get(id);
  if (!img) return null;
  img.x = x;
  img.y = y;
  img.width = width;
  img.height = height;
  img.rotation = rotation;
  scheduleSave();
  return img;
}

function removeImage(id) {
  const img = images.get(id);
  if (!img) return false;
  images.delete(id);

  // Delete file from disk
  const filePath = path.join(UPLOADS_DIR, id);
  fs.unlink(filePath, (err) => {
    if (err && err.code !== 'ENOENT') console.error('Failed to delete file:', err);
  });

  // Compact zIndexes
  compactZIndexes();
  scheduleSave();
  return true;
}

function removeAll() {
  // Delete all files from disk
  for (const img of images.values()) {
    const filePath = path.join(UPLOADS_DIR, img.id);
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') console.error('Failed to delete file:', err);
    });
  }
  images.clear();
  scheduleSave();
}

function sendToFront(id) {
  const img = images.get(id);
  if (!img) return null;

  let maxZ = -1;
  for (const other of images.values()) {
    if (other.id !== id && other.zIndex > maxZ) maxZ = other.zIndex;
  }
  img.zIndex = maxZ + 1;
  compactZIndexes();
  scheduleSave();
  return getAll();
}

function sendToBack(id) {
  const img = images.get(id);
  if (!img) return null;

  // Set target to 0, bump others up
  for (const other of images.values()) {
    if (other.id !== id && other.zIndex >= 0) {
      other.zIndex += 1;
    }
  }
  img.zIndex = 0;
  compactZIndexes();
  scheduleSave();
  return getAll();
}

function compactZIndexes() {
  const sorted = Array.from(images.values()).sort((a, b) => a.zIndex - b.zIndex);
  sorted.forEach((img, i) => {
    img.zIndex = i;
  });
}

function setLocked(id, locked) {
  const img = images.get(id);
  if (!img) return;
  img.locked = locked;
  scheduleSave();
}

module.exports = {
  loadState,
  getAll,
  addImage,
  updatePosition,
  updateSize,
  updateTransform,
  removeImage,
  removeAll,
  sendToFront,
  sendToBack,
  setLocked,
};
