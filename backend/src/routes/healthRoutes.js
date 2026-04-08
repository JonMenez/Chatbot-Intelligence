const express = require('express');
const { isGroqReady } = require('../config/groq');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    server: 'running',
    groqReady: isGroqReady(),
    apiKeyConfigured: !!process.env.GROQ_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;

