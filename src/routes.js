const path = require('path');
const express = require('express');
const multer = require('multer');
const { execFile } = require('child_process');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, file.originalname),
});

const upload = multer({ storage });

/**
 * If the uploaded file is a GIF, set its loop count to infinite
 * using gifsicle so it plays forever in the browser.
 */
function ensureGifLoops(filePath) {
  return new Promise((resolve) => {
    execFile('gifsicle', ['--batch', '--loopcount=forever', filePath], (err) => {
      if (err) {
        console.error('gifsicle error (non-fatal):', err.message);
      }
      resolve();
    });
  });
}

function setupRoutes(app) {
  // Serve uploaded images
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Upload endpoint
  app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Process GIFs to loop forever
    if (req.file.originalname.toLowerCase().endsWith('.gif')) {
      await ensureGifLoops(req.file.path);
    }

    res.json({ filename: req.file.filename });
  });
}

module.exports = { setupRoutes };
