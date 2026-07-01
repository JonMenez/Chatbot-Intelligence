const { createMainAgent } = require('../agents/mainAgent');
const { HumanMessage, AIMessage } = require('@langchain/core/messages');
const { CallbackHandler } = require("langfuse-langchain");
const { runSelfCritique, streamSelfCritique } = require('./selfCritiqueService');

// Initialize the agent executor globally
let agentExecutor = null;

/**
 * Ensures the agent is initialized.
 */
function getAgent() {
  if (!agentExecutor) {
    agentExecutor = createMainAgent();
  }
  return agentExecutor;
}

/**
 * Extracts tool usage information from a LangGraph response message array.
 * @param {Array} responseMessages - The full messages array from agent.invoke().
 * @returns {{ toolWasUsed: boolean, usedTools: string[] }}
 */
function extractToolUsage(responseMessages) {
  const toolMessages = responseMessages.filter(m => m._getType() === "tool");
  const usedTools = toolMessages.map(m => m.name);
  return {
    toolWasUsed: usedTools.length > 0,
    usedTools: [...new Set(usedTools)],
  };
}

/**
 * Runs the LangGraph agent with the given message and history.
 * After the agent generates a response, it is passed through Self-Critique
 * for quality validation and correction before being returned.
 *
 * @param {string} message - The user's query
 * @param {Array} chatHistory - Array of previous messages { role: 'user' | 'assistant', content: string }
 * @param {string} thread_id - The session identifier for the checkpointer
 */
async function runAgentChat(message, chatHistory = [], thread_id = 'default_thread') {
  const agent = getAgent();

  // Since we are using a Checkpointer (MemorySaver), we only need to pass the new message.
  // The checkpointer will automatically retrieve the previous messages for this thread_id.
  const messages = [new HumanMessage(message)];

  const startTime = Date.now();
  let langfuseHandler;
  try {
    console.log(`[AgentService] 🧠 Invoking agent for query: "${message.substring(0, 50)}..."`);
    
    // Initialize Langfuse handler for this run
    langfuseHandler = new CallbackHandler({
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL,
      sessionId: thread_id,
      runName: "agent_chat_sync"
    });

    // Phase 1: Invoke the agent silently to get the full response
    const response = await agent.invoke(
      { messages: messages },
      { 
        recursionLimit: 20,
        configurable: { thread_id },
        callbacks: [langfuseHandler]
      }
    );

    const responseMessages = response.messages;
    const finalMessage = responseMessages[responseMessages.length - 1];
    const { toolWasUsed, usedTools } = extractToolUsage(responseMessages);
    const proposedResponse = finalMessage.content;

    // Phase 2: Self-Critique — evaluate and potentially correct the response
    console.log(`[AgentService] 🔍 Running Self-Critique on proposed response...`);
    const { correctedResponse, applied: selfCritiqueApplied } = await runSelfCritique(
      responseMessages,
      proposedResponse
    );

    // Persist the corrected response in the agent's memory if critique was applied
    if (selfCritiqueApplied && correctedResponse !== proposedResponse) {
      await agent.updateState(
        { configurable: { thread_id } },
        { messages: [new AIMessage({ content: correctedResponse, id: finalMessage.id })] }
      );
      console.log(`[AgentService] 💾 Corrected response persisted in thread memory.`);
    }

    const totalTime = Date.now() - startTime;
    
    console.log(`[AgentService] ✅ Agent replied in ${totalTime}ms. Tools used: ${toolWasUsed ? usedTools.join(', ') : 'None'}. Self-Critique applied: ${selfCritiqueApplied}`);

    return {
      reply: correctedResponse,
      metadata: {
        agentVersion: 'LangGraph-1.0',
        toolUsed: toolWasUsed,
        toolsInvoked: usedTools,
        totalTimeMs: totalTime,
        selfCritiqueApplied,
      }
    };
  } catch (error) {
    console.error(`[AgentService] ❌ Error running agent: ${error.message}`);
    throw error;
  } finally {
    // Ensure traces are flushed to Langfuse
    if (typeof langfuseHandler !== 'undefined') {
      console.log(`[AgentService] 📤 Flushing traces to Langfuse...`);
      await langfuseHandler.flushAsync();
      console.log(`[AgentService] 📤 Langfuse traces flushed successfully.`);
    }
  }
}

/**
 * Runs the LangGraph agent with the given message using a two-phase approach:
 *   Phase 1: agent.invoke() — generates the full response silently (no streaming to client).
 *   Phase 2: Self-Critique — evaluates the response and streams the corrected version via SSE.
 *
 * The user only sees the final, critiqued response streamed natively.
 *
 * @param {Object} params
 * @param {string} params.message - The user's query
 * @param {Array} params.chatHistory - Array of previous messages
 * @param {Object} params.res - Express response object for SSE
 * @param {string} params.thread_id - The session identifier for the checkpointer
 */
async function runAgentStream({ message, chatHistory = [], res, thread_id = 'default_thread' }) {
  console.log(`[AgentService] 🧠 Processing agent query: "${message}" (thread_id: ${thread_id})`);
  const agent = getAgent();

  // We only pass the new message, the checkpointer manages the rest for this thread_id.
  const messages = [new HumanMessage(message)];

  const startTime = Date.now();

  // Helper to send SSE data properly formatted
  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Phase 1: Invoke the agent silently
  sendEvent({ type: 'thinking', content: 'Procesando consulta...' });

  let langfuseHandler;
  try {
    // Initialize Langfuse handler for this stream run
    langfuseHandler = new CallbackHandler({
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL,
      sessionId: thread_id,
      runName: "agent_chat_stream"
    });

    const response = await agent.invoke(
      { messages: messages },
      {
        recursionLimit: 20,
        configurable: { thread_id },
        callbacks: [langfuseHandler]
      }
    );

    const responseMessages = response.messages;
    const finalMessage = responseMessages[responseMessages.length - 1];
    const { toolWasUsed, usedTools } = extractToolUsage(responseMessages);
    const proposedResponse = finalMessage.content;

    // Phase 2: Self-Critique — evaluate and stream the corrected response
    sendEvent({ type: 'thinking', content: 'Analizando y mejorando respuesta...' });

    console.log(`[AgentService] 🔍 Streaming Self-Critique...`);
    let selfCritiqueApplied = true;
    let accumulatedResponse = '';

    for await (const chunk of streamSelfCritique(responseMessages, proposedResponse)) {
      accumulatedResponse += chunk;
      sendEvent({ type: 'stream', chunk });
    }

    // If the accumulated response is empty (shouldn't happen due to fallback), use original
    if (!accumulatedResponse) {
      accumulatedResponse = proposedResponse;
      selfCritiqueApplied = false;
    }

    // Persist the corrected response in the agent's memory if it was modified
    if (accumulatedResponse !== proposedResponse) {
      await agent.updateState(
        { configurable: { thread_id } },
        { messages: [new AIMessage({ content: accumulatedResponse, id: finalMessage.id })] }
      );
      console.log(`[AgentService] 💾 Corrected response persisted in thread memory.`);
    }

    const totalTime = Date.now() - startTime;
    console.log(`[AgentService] ✅ Response complete in ${totalTime}ms. Tools: ${usedTools.join(', ') || 'None'}. Self-Critique applied: ${selfCritiqueApplied}`);

    // Final completion event with enriched metadata
    sendEvent({
      type: 'final_response',
      done: true,
      metadata: {
        agentVersion: 'LangGraph-1.0',
        toolUsed: toolWasUsed,
        toolsInvoked: usedTools,
        totalTimeMs: totalTime,
        selfCritiqueApplied,
      }
    });

    res.end();
  } catch (error) {
    console.error(`[AgentService] ❌ Error in agent processing: ${error.message}`);
    sendEvent({ type: 'error', error: error.message || 'Processing failed' });
    res.end();
  } finally {
    // Ensure traces are flushed to Langfuse before ending completely
    if (typeof langfuseHandler !== 'undefined') {
      console.log(`[AgentService] 📤 Flushing traces to Langfuse...`);
      await langfuseHandler.flushAsync();
      console.log(`[AgentService] 📤 Langfuse traces flushed successfully.`);
    }
  }
}

module.exports = {
  runAgentChat,
  runAgentStream,
};
