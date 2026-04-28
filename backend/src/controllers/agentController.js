const { runAgent } = require('../agents/mainAgent');
const { isGroqReady } = require('../config/groq');

/**
 * POST /agent/chat endpoint handler
 * Receives a question and processes it through the ReAct/Tool Calling Agent
 */
async function postAgentChat(req, res) {
  try {
    const { message, chatHistory = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Message is required and must be a string',
        statusCode: 400,
      });
    }

    if (!isGroqReady()) {
      return res.status(503).json({
        error: 'Groq service not available. Check your GROQ_API_KEY in .env file.',
        statusCode: 503,
      });
    }

    console.log(`[Agent Controller] Processing message: "${message}"`);
    
    // Call the agent
    const result = await runAgent(message, chatHistory);

    return res.json({
      reply: result.reply,
      metadata: result.metadata,
      statusCode: 200,
    });
  } catch (error) {
    console.error('❌ Error in /agent/chat:', error.message || error);
    
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Error processing Agent request: ' + (error.message || 'Please try again.'),
        statusCode: 500,
      });
    }
  }
}

module.exports = {
  postAgentChat,
};
