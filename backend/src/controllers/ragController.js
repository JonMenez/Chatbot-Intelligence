const { isGroqReady } = require('../config/groq');
const { initRag, isRagReady, answerWithRag, answerWithRagStream, evaluateRagResponse } = require('../services/ragService');

/**
 * POST /rag endpoint handler
 * Receives a question and returns an answer grounded in the knowledge base
 * 
 * Request body:
 * - message: string (The question)
 * - chatHistory: array (Optional previous messages for conversational memory)
 * - stream: boolean (Optional, if true uses SSE to stream response)
 *
 * Response includes:
 * - reply: The answer text
 * - confidence: Confidence score (0-1)
 * - sources: Document sources used for the answer
 * - metadata: Performance metrics (retrieval time, LLM time, etc.)
 */
async function postRag(req, res) {
  try {
    const { message, chatHistory = [], stream = false } = req.body;

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

    if (stream) {
      // Setup SSE Headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Call streaming service
      await answerWithRagStream(message, chatHistory, res);
      res.end();
    } else {
      // Call the standard RAG service
      const result = await answerWithRag(message, chatHistory);

      // Return enriched response with confidence and sources
      return res.json({
        reply: result.reply,
        confidence: result.confidence,
        sources: result.sources,
        metadata: result.metadata,
        statusCode: 200,
      });
    }
  } catch (error) {
    console.error('❌ Error in /rag:', error.message || error);
    
    // Fallback for non-streaming headers sent error
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Error processing RAG request: ' + (error.message || 'Please try again.'),
        statusCode: 500,
      });
    }
  }
}

/**
 * POST /rag/evaluate endpoint handler
 * Evaluates the RAG response faithfulness
 */
async function postEvaluate(req, res) {
  try {
    const { question, answer, contextDocs, expectedAnswer = "" } = req.body;

    if (!question || !answer || !contextDocs) {
      return res.status(400).json({ error: 'question, answer, and contextDocs are required' });
    }

    const evaluation = await evaluateRagResponse(question, answer, contextDocs, expectedAnswer);
    if (!evaluation) {
      return res.status(500).json({ error: 'Failed to evaluate response' });
    }

    return res.json(evaluation);
  } catch (error) {
    console.error('❌ Error in /rag/evaluate:', error);
    return res.status(500).json({ error: 'Error running evaluation' });
  }
}

module.exports = {
  postRag,
  postEvaluate,
  initRag,
};
