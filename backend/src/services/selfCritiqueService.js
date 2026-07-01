const { ChatGroq } = require("@langchain/groq");
const { SystemMessage, HumanMessage } = require("@langchain/core/messages");

/**
 * Critique prompt: strict editor that outputs only the final response text.
 * No JSON, no commentary, no preamble — just the response itself.
 */
const CRITIQUE_SYSTEM_PROMPT = `You are a strict quality editor for an AI assistant called Ethereal.

You will receive:
1. The CONVERSATION HISTORY (including any retrieved context from knowledge base searches).
2. A PROPOSED RESPONSE that the assistant is about to send.

Your job:
- If the proposed response is accurate, complete, well-reasoned, and free of hallucinations → output it EXACTLY as-is, word for word.
- If it contains factual errors, hallucinations, incomplete reasoning, or could be significantly improved → output a CORRECTED version.

Rules:
- Output ONLY the final response text. No preamble, no "Here is the corrected version:", no commentary.
- Do NOT add information that wasn't available in the conversation history or retrieved context.
- Do NOT change the language of the response (if the original is in Spanish, your output must be in Spanish).
- Do NOT change the tone or style unless it's clearly wrong.
- Start your output directly with the response content.`;

const CRITIQUE_TIMEOUT_MS = 45000;

/**
 * Creates a fresh ChatGroq instance configured for critique.
 * Uses a fast, deterministic model with strict temperature.
 * @returns {ChatGroq}
 */
function createCritiqueLlm() {
  return new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_CRITIQUE_MODEL || "llama-3.1-8b-instant",
    temperature: 0.0,
    maxTokens: 1024,
  });
}

/**
 * Builds the critique prompt messages from conversation history and proposed response.
 * @param {Array} conversationMessages - The full LangGraph message array from the agent invocation.
 * @param {string} proposedResponse - The text content of the agent's final AIMessage.
 * @returns {Array} Array of LangChain messages for the critique model.
 */
function buildCritiqueMessages(conversationMessages, proposedResponse) {
  // Build a human-readable summary of the conversation for the critique model.
  // We include tool results (RAG context) so the critique can verify factual claims.
  const historyLines = [];
  for (const msg of conversationMessages) {
    const type = msg._getType();
    if (type === "human") {
      historyLines.push(`[User]: ${msg.content}`);
    } else if (type === "ai" && msg.content) {
      historyLines.push(`[Assistant]: ${msg.content}`);
    } else if (type === "tool") {
      historyLines.push(`[Tool Result — ${msg.name}]: ${msg.content}`);
    }
    // Skip system messages and empty AI messages (tool call placeholders)
  }

  const userPrompt =
    `CONVERSATION HISTORY:\n${historyLines.join("\n")}\n\n` +
    `PROPOSED RESPONSE:\n${proposedResponse}`;

  return [
    new SystemMessage(CRITIQUE_SYSTEM_PROMPT),
    new HumanMessage(userPrompt),
  ];
}

/**
 * Streams a self-critique of the proposed response.
 * Yields text chunks from the critique model for native SSE streaming.
 *
 * On any failure (timeout, API error, empty response), yields the original
 * proposed response as a single chunk so the user always gets an answer.
 *
 * @param {Array} conversationMessages - Full message array from agent invocation.
 * @param {string} proposedResponse - The agent's proposed final response text.
 * @returns {AsyncGenerator<string>} Async generator of text chunks.
 */
async function* streamSelfCritique(conversationMessages, proposedResponse) {
  try {
    const critiqueLlm = createCritiqueLlm();
    const messages = buildCritiqueMessages(conversationMessages, proposedResponse);

    const stream = await critiqueLlm.stream(messages, {
      signal: AbortSignal.timeout(CRITIQUE_TIMEOUT_MS),
    });

    let hasContent = false;
    for await (const chunk of stream) {
      const text = chunk.content;
      if (text) {
        hasContent = true;
        yield text;
      }
    }

    // If the critique model returned nothing, fall back to original
    if (!hasContent) {
      console.warn("[SelfCritique] ⚠️ Critique model returned empty response. Falling back to original.");
      yield proposedResponse;
    }
  } catch (error) {
    console.error(`[SelfCritique] ❌ Critique failed: ${error.message}. Falling back to original response.`);
    yield proposedResponse;
  }
}

/**
 * Runs a synchronous (non-streaming) self-critique of the proposed response.
 * Returns the corrected text and whether the critique was successfully applied.
 *
 * On any failure, returns the original response with applied = false.
 *
 * @param {Array} conversationMessages - Full message array from agent invocation.
 * @param {string} proposedResponse - The agent's proposed final response text.
 * @returns {Promise<{correctedResponse: string, applied: boolean}>}
 */
async function runSelfCritique(conversationMessages, proposedResponse) {
  try {
    const critiqueLlm = createCritiqueLlm();
    const messages = buildCritiqueMessages(conversationMessages, proposedResponse);

    const response = await critiqueLlm.invoke(messages, {
      signal: AbortSignal.timeout(CRITIQUE_TIMEOUT_MS),
    });

    const corrected = response.content?.trim();
    if (!corrected) {
      console.warn("[SelfCritique] ⚠️ Critique model returned empty response. Using original.");
      return { correctedResponse: proposedResponse, applied: false };
    }

    console.log(`[SelfCritique] ✅ Critique complete. Response ${corrected === proposedResponse ? "unchanged" : "corrected"}.`);
    return { correctedResponse: corrected, applied: true };
  } catch (error) {
    console.error(`[SelfCritique] ❌ Critique failed: ${error.message}. Using original response.`);
    return { correctedResponse: proposedResponse, applied: false };
  }
}

module.exports = {
  streamSelfCritique,
  runSelfCritique,
  // Exported for testing
  buildCritiqueMessages,
  CRITIQUE_SYSTEM_PROMPT,
};
