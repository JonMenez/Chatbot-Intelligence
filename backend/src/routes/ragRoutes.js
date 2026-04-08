const express = require('express');
const { postRag } = require('../controllers/ragController');

const router = express.Router();

router.post('/rag', postRag);

module.exports = router;
