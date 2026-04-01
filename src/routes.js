const path = require('path');
const express = require('express');
const multer = require('multer');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, file.originalname),
});

const upload = multer({ storage });

function setupRoutes(app) {
  // Serve uploaded images
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Upload endpoint
  app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ filename: req.file.filename });
  });
}

module.exports = { setupRoutes };
