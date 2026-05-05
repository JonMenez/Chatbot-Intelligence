const { runAgentChat, runAgentStream } = require('../services/agentService');
const { isGroqReady } = require('../config/groq');
const { isRagReady } = require('../services/ragService');

/**
 * POST /agent/chat handler
 * Receives a question, passes it to the Agent Executor, and returns the response in JSON.
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

    if (!isRagReady()) {
      return res.status(503).json({
        error: 'RAG/Knowledge Base is not initialized yet. Please start ChromaDB.',
        statusCode: 503,
      });
    }

    if (!isGroqReady()) {
      return res.status(503).json({
        error: 'Groq service not available. Check your GROQ_API_KEY in .env file.',
        statusCode: 503,
      });
    }

    // Call the agent service (Option A: Synchronous JSON response)
    const result = await runAgentChat(message, chatHistory);

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

/**
 * POST /agent/chat/stream handler
 * Receives a question and streams back the agent's reasoning and response using SSE.
 */
async function postAgentChatStream(req, res) {
  try {
    const { message, chatHistory = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required and must be a string' });
    }

    if (!isRagReady()) {
      return res.status(503).json({ error: 'RAG is not initialized yet. Please start ChromaDB.' });
    }

    if (!isGroqReady()) {
      return res.status(503).json({ error: 'Groq service not available. Check your GROQ_API_KEY in .env file.' });
    }

    // 1. Set headers for SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // 2. Call the streaming service
    await runAgentStream({ message, chatHistory, res });

  } catch (error) {
    console.error('❌ Error in /agent/chat/stream:', error.message || error);
    
    // If headers are already sent, we must send an error event via SSE
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message || 'Internal Server Error' })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: 'Error processing Agent Stream request.' });
    }
  }
}

module.exports = {
  postAgentChat,
  postAgentChatStream,
};
