const { ChatGroq } = require("@langchain/groq");
const { SystemMessage } = require("@langchain/core/messages");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const { ragSearchTool } = require("../tools/ragSearchTool");
const { registryTool } = require("../tools/registryTool");
const { calculatorTool } = require("../tools/calculatorTool");

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
    model: "llama-3.1-8b-instant", // Fallback to 8b-instant to avoid Llama 3.3 XML tool calling bugs
    temperature: 0.1, // Keep it low for factual reliability
    maxTokens: 800,
  });

  // 2. Define the Tools available to the Agent
  const tools = [ragSearchTool, registryTool, calculatorTool];

  // 3. Create the System Prompt as a modifier
  const systemMessage = new SystemMessage(`You are Ethereal, an intelligent AI Assistant.
You have access to tools that can search the knowledge base, list available documents in the registry, and perform mathematical calculations.
Answer the user's queries concisely and accurately. If you don't know the answer, just say so.`);

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
