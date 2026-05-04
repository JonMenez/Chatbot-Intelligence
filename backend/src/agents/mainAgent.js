const { ChatGroq } = require("@langchain/groq");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const { SystemMessage } = require("@langchain/core/messages");
const { ragSearchTool } = require("../tools/ragSearchTool");

/**
 * Initializes and returns the Agent Executor using LangGraph.
 * Follows the Tool Calling paradigm using Llama 3 on Groq.
 */
function createMainAgent() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not defined in environment variables.");
  }

  // 1. Initialize the Chat Model
  // We use ChatGroq which natively supports tool calling
  const llm = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "llama-3.3-70b-versatile", // Fix: The property is 'model', not 'modelName'
    temperature: 0.1, // Keep it low for factual reliability
    maxTokens: 800,
  });

  // 2. Define the Tools available to the Agent
  const tools = [ragSearchTool];

  // 3. Create the System Prompt as a modifier
  const systemMessage = new SystemMessage(`You are an intelligent, helpful AI Agent named Ethereal. 
You answer the user's questions clearly and concisely.
You have access to a knowledge base tool. Use it whenever the user asks about their documents, data, or facts.
If the tool returns no information, politely inform the user that you don't know.`);

  // 4. Create the Tool Calling Agent using LangGraph prebuilt agent
  const agentExecutor = createReactAgent({
    llm,
    tools,
    messageModifier: systemMessage,
  });

  return agentExecutor;
}

module.exports = {
  createMainAgent,
};
