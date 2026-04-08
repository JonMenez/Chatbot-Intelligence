const { isGroqReady } = require('../config/groq');
const { createChatCompletion } = require('../services/chatService');

async function postChat(req, res) {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required and must be a string' });
    }

    if (!isGroqReady()) {
      return res.status(503).json({ error: 'Groq service not available. Check your GROQ_API_KEY in .env' });
    }

    console.log('📨 Incoming message:', message.substring(0, 50) + '...');

    const reply = await createChatCompletion(message);

    console.log('✅ Response sent:', (reply || '').substring(0, 50) + '...');
    return res.json({ reply });
  } catch (error) {
    console.error('❌ Error in /chat:', {
      message: error.message,
      status: error.status,
      type: error.constructor.name,
    });

    // Specific error handling
    if (error.message.includes('API key') || error.message.includes('Incorrect API')) {
      return res.status(401).json({ error: 'Invalid or missing API key. Check your .env configuration.' });
    }

    if (error.message.includes('timeout') || error.code === 'ETIMEDOUT') {
      return res.status(504).json({ error: 'Groq API timeout. Please try again.' });
    }

    if (error.message.includes('rate_limit')) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    return res.status(500).json({ error: 'Error processing your message. Please try again.' });
  }
}

module.exports = {
  postChat,
};

