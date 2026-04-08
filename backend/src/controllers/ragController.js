const { isGroqReady } = require('../config/groq');
const { initRag, isRagReady, answerWithRag } = require('../services/ragService');

/**
 * POST /rag endpoint handler
 * Receives a question and returns an answer grounded in the knowledge base
 * 
 * Response includes:
 * - reply: The answer text
 * - confidence: Confidence score (0-1)
 * - sources: Document sources used for the answer
 * - metadata: Performance metrics (retrieval time, LLM time, etc.)
 */
async function postRag(req, res) {
  try {
    const { message } = req.body;

    // Validation: Check message input
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Message is required and must be a string',
        statusCode: 400,
      });
    }

    // Validation: Check if RAG is initialized
    if (!isRagReady()) {
      return res.status(503).json({
        error: 'RAG not initialized. Please add documents to backend/documents folder and restart the server.',
        statusCode: 503,
      });
    }

    // Validation: Check if Groq is available
    if (!isGroqReady()) {
      return res.status(503).json({
        error: 'Groq service not available. Check your GROQ_API_KEY in .env file.',
        statusCode: 503,
      });
    }

    // Call the improved RAG service (now returns structured response)
    const result = await answerWithRag(message);

    // Return enriched response with confidence and sources
    return res.json({
      reply: result.reply,
      confidence: result.confidence,
      sources: result.sources,
      metadata: result.metadata,
      statusCode: 200,
    });
  } catch (error) {
    console.error('❌ Error in /rag:', error.message || error);
    return res.status(500).json({
      error: 'Error processing RAG request: ' + (error.message || 'Please try again.'),
      statusCode: 500,
    });
  }
}

module.exports = {
  postRag,
  initRag,
};
