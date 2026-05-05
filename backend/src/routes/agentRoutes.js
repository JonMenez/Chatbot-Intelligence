const express = require('express');
const router = express.Router();
const { postAgentChat, postAgentChatStream } = require('../controllers/agentController');

router.post('/chat', postAgentChat);
router.post('/chat/stream', postAgentChatStream);

module.exports = router;
