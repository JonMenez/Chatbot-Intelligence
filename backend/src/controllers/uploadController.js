const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { addDocumentToVectorStore } = require('../services/ragService');
const registryService = require('../services/registryService');

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
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB limit
});

const uploadMiddleware = (req, res, next) => {
  const multerUpload = upload.array('files', 10);
  multerUpload(req, res, (err) => {
    if (err) {
      console.error('❌ Multer Error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, error: 'File exceeds the 50MB limit.' });
      }
      return res.status(400).json({ success: false, error: `Upload error: ${err.message}` });
    }
    next();
  });
};

/**
 * Handle document upload and injection into RAG Vector Store
 */
async function postUpload(req, res) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided or invalid format.' });
    }

    const results = [];
    const filesInfo = [];

    // Process all files sequentially to avoid overloading memory/embeddings model
    for (const file of req.files) {
      const filePath = file.path;
      const originalName = file.originalname;

      // Register the file mapping so startup ingestion uses the proper source
      await registryService.registerDocumentMapping(file.filename, originalName);

      // Inject document dynamically
      const result = await addDocumentToVectorStore(filePath, originalName);
      results.push(result);
      filesInfo.push({ filename: originalName });
    }

    return res.status(200).json({
      message: 'Documents successfully loaded into the knowledge base.',
      success: true,
      files: filesInfo,
      details: results
    });
  } catch (error) {
    console.error('❌ Upload Error:', error);
    // Cleanup the uploaded files if there's an error during vector embedding
    if (req.files) {
      for (const file of req.files) {
        if (fs.existsSync(file.path)) {
          try {
            fs.unlinkSync(file.path);
          } catch(cleanupError) {
            console.error(`Failed to cleanup file ${file.originalname}:`, cleanupError);
          }
        }
      }
    }
    return res.status(500).json({
      error: error.message || 'Failed to process documents.',
      success: false
    });
  }
}

/**
 * Retrieve list of all uploaded documents
 */
async function getDocuments(req, res) {
  try {
    const registry = await registryService.loadRegistry();
    const files = fs.readdirSync(DOCUMENTS_DIR);
    
    const documents = files
      .filter(f => f !== '_registry.json')
      .map(file => {
        const filePath = path.join(DOCUMENTS_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          id: file,
          filename: registry[file] || file,
          size: stats.size,
          createdAt: stats.birthtime,
        };
      });
      
    return res.status(200).json({ success: true, documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch documents' });
  }
}

module.exports = {
  uploadMiddleware,
  postUpload,
  getDocuments
};
