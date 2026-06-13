const { createMainAgent } = require('../agents/mainAgent');
const { HumanMessage, AIMessage } = require('@langchain/core/messages');
const { CallbackHandler } = require("langfuse-langchain");

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
 * Runs the LangGraph agent with the given message and history.
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

    // Invoke the agent with thread_id configuration and langfuse callbacks
    const response = await agent.invoke(
      { messages: messages },
      { 
        recursionLimit: 20,
        configurable: { thread_id },
        callbacks: [langfuseHandler]
      }
    );

    const responseMessages = response.messages;
    
    // Extract the final message
    const finalMessage = responseMessages[responseMessages.length - 1];
    
    // Determine if tools were used by checking intermediate messages
    const toolMessages = responseMessages.filter(m => m._getType() === "tool");
    const usedTools = toolMessages.map(m => m.name);
    const toolWasUsed = usedTools.length > 0;

    const totalTime = Date.now() - startTime;
    
    console.log(`[AgentService] ✅ Agent replied in ${totalTime}ms. Tools used: ${toolWasUsed ? usedTools.join(', ') : 'None'}`);

    return {
      reply: finalMessage.content,
      metadata: {
        agentVersion: 'LangGraph-1.0',
        toolUsed: toolWasUsed,
        toolsInvoked: [...new Set(usedTools)], // unique tools
        totalTimeMs: totalTime,
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
 * Runs the LangGraph agent with the given message and streams the events via SSE.
 * @param {Object} params
 * @param {string} params.message - The user's query
 * @param {Array} params.chatHistory - Array of previous messages
 * @param {string} params.thread_id - The session identifier for the checkpointer
 */
async function runAgentStream({ message, chatHistory = [], res, thread_id = 'default_thread' }) {
  console.log(`[AgentService] 🧠 Streaming agent for query: "${message}" (thread_id: ${thread_id})`);
  const agent = getAgent();

  // We only pass the new message, the checkpointer manages the rest for this thread_id.
  const messages = [new HumanMessage(message)];

  const startTime = Date.now();
  let usedTools = [];

  // Helper to send SSE data properly formatted
  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent({ type: 'thinking', content: 'Agent is analyzing your query...' });

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

    // Stream events using LangGraph's v2 events and thread_id configuration
    const eventStream = await agent.streamEvents(
      { messages: messages },
      { 
        version: "v2", 
        recursionLimit: 20,
        configurable: { thread_id },
        callbacks: [langfuseHandler]
      }
    );

    for await (const event of eventStream) {
      const eventType = event.event;

      if (eventType === "on_chat_model_stream") {
        const chunk = event.data?.chunk?.content;
        if (chunk) {
          sendEvent({ type: 'stream', chunk: chunk });
        }
      } 
      else if (eventType === "on_tool_start") {
        const toolName = event.name;
        usedTools.push(toolName);
        sendEvent({ type: 'tool_call', tool: toolName, input: event.data?.input });
      } 
      else if (eventType === "on_tool_end") {
        const toolName = event.name;
        sendEvent({ type: 'tool_result', tool: toolName, content: `Finished using ${toolName}` });
      }
    }

    const totalTime = Date.now() - startTime;
    const toolWasUsed = usedTools.length > 0;

    console.log(`[AgentService] ✅ Stream complete in ${totalTime}ms. Tools: ${usedTools.join(', ')}`);

    // Final completion event
    sendEvent({
      type: 'final_response',
      done: true,
      metadata: {
        agentVersion: 'LangGraph-1.0',
        toolUsed: toolWasUsed,
        toolsInvoked: [...new Set(usedTools)],
        totalTimeMs: totalTime,
      }
    });

    res.end();
  } catch (error) {
    console.error(`[AgentService] ❌ Error in agent stream: ${error.message}`);
    sendEvent({ type: 'error', error: error.message || 'Stream processing failed' });
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
