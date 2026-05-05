const { createMainAgent } = require('../agents/mainAgent');
const { HumanMessage, AIMessage } = require('@langchain/core/messages');

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
 * @returns {Promise<Object>} An object containing the final reply and metadata about tool usage
 */
async function runAgentChat(message, chatHistory = []) {
  const agent = getAgent();

  // Convert raw chat history to LangChain message objects
  const messages = chatHistory.map(msg => 
    msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
  );

  // Append current user message
  messages.push(new HumanMessage(message));

  const startTime = Date.now();

  try {
    console.log(`[AgentService] 🧠 Invoking agent for query: "${message.substring(0, 50)}..."`);
    // Invoke the agent
    const response = await agent.invoke({
      messages: messages,
    });

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
  }
}

/**
 * Runs the LangGraph agent with the given message and streams the events via SSE.
 * @param {Object} params
 * @param {string} params.message - The user's query
 * @param {Array} params.chatHistory - Array of previous messages
 * @param {Object} params.res - Express response object for SSE
 */
async function runAgentStream({ message, chatHistory = [], res }) {
  const agent = getAgent();

  const messages = chatHistory.map(msg => 
    msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
  );
  messages.push(new HumanMessage(message));

  const startTime = Date.now();
  let usedTools = [];

  // Helper to send SSE data properly formatted
  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent({ type: 'thinking', content: 'Agent is analyzing your query...' });

  try {
    // Stream events using LangGraph's v2 events
    const eventStream = await agent.streamEvents({ messages: messages }, { version: "v2" });

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
  }
}

module.exports = {
  runAgentChat,
  runAgentStream,
};
