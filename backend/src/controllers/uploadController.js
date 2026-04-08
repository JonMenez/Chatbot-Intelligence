const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { addDocumentToVectorStore } = require('../services/ragService');

// Ensure documents directory exists
const DOCUMENTS_DIR = path.join(__dirname, '../../../documents');
if (!fs.existsSync(DOCUMENTS_DIR)) {
  fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
}

// Setup multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, DOCUMENTS_DIR);
  },
  filename: function (req, file, cb) {
    // Keep original name but add timestamp to prevent collisions
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const parsed = path.parse(file.originalname);
    cb(null, parsed.name + '-' + uniqueSuffix + parsed.ext);
  },
});

// File filter to allow only PDFs and TXTs
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['application/pdf', 'text/plain'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and TXT are allowed.'), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

/**
 * Handle document upload and injection into RAG Vector Store
 */
async function postUpload(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided or invalid format.' });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;

    // Inject document dynamically
    const result = await addDocumentToVectorStore(filePath, originalName);

    return res.status(200).json({
      message: 'Document successfully loaded into the knowledge base.',
      success: true,
      filename: originalName,
      details: result
    });
  } catch (error) {
    console.error('❌ Upload Error:', error);
    // Cleanup the uploaded file if there's an error during vector embedding
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch(cleanupError) {
        console.error('Failed to cleanup file:', cleanupError);
      }
    }
    return res.status(500).json({
      error: error.message || 'Failed to process document.',
      success: false
    });
  }
}

module.exports = {
  upload,
  postUpload
};
