const express = require('express');
const { postChat } = require('../controllers/chatController');

const router = express.Router();

router.post('/chat', postChat);

module.exports = router;

