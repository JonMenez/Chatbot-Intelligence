const express = require('express');
const { postRag, postEvaluate } = require('../controllers/ragController');

const router = express.Router();

router.post('/rag', postRag);
router.post('/rag/evaluate', postEvaluate);

module.exports = router;
