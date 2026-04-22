const express = require('express');
const { uploadMiddleware, postUpload, getDocuments } = require('../controllers/uploadController');

const router = express.Router();

router.post('/upload', uploadMiddleware, postUpload);
router.get('/documents', getDocuments);

module.exports = router;
