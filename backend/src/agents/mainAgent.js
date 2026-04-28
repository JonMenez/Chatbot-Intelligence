const { ChatGroq } = require("@langchain/groq");
const { createToolCallingAgent, AgentExecutor } = require("langchain/agents");
const { ChatPromptTemplate, MessagesPlaceholder } = require("@langchain/core/prompts");
const { HumanMessage, AIMessage } = require("@langchain/core/messages");

const ragSearchTool = require("../tools/ragSearchTool");
const registryTool = require("../tools/registryTool");
const calculatorTool = require("../tools/calculatorTool");

// Combine tools
const tools = [ragSearchTool, registryTool, calculatorTool];

let agentExecutor = null;

/**
 * Initialize the agent
 */
function initAgent() {
  if (!process.env.GROQ_API_KEY) {
    console.warn("⚠️ Agent not initialized: GROQ_API_KEY not found in .env");
    return false;
  }

  // Use Llama 3.3 which has native tool calling
  const llm = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    modelName: "llama-3.3-70b-versatile",
    temperature: 0.2, // Slightly higher to allow reasoning, but low enough for factuality
  });

  // Create prompt for the agent
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `You are Ethereal Intelligence, a helpful, advanced AI Agent assistant.
You have access to specific tools. Use them when necessary to provide accurate answers.

Important Rules:
1. If the user asks about uploaded documents, use 'get_document_registry' to see what's available or 'search_knowledge_base' to answer specific questions based on document content.
2. If you search the knowledge base and find the answer, DO NOT hallucinate. Answer strictly based on the results.
3. If the knowledge base search returns no relevant information, tell the user you don't know the answer.
4. If the user asks a math question, use the 'calculator' tool.
5. Always respond in Spanish unless the user asks otherwise, but remain professional and friendly.
6. Provide final answers directly to the user based on the tool execution results.`],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
    new MessagesPlaceholder("agent_scratchpad"),
  ]);

  const agent = createToolCallingAgent({
    llm,
    tools,
    prompt,
  });

  agentExecutor = new AgentExecutor({
    agent,
    tools,
    verbose: true, // Set to true to observe tool calls in terminal
  });

  console.log("✅ Main Agent initialized successfully with Tool Calling.");
  return true;
}

/**
 * Run the agent for a user query
 * @param {string} input - User query
 * @param {Array} history - Conversational history [{role, content}]
 */
async function runAgent(input, history = []) {
  if (!agentExecutor) {
    const initialized = initAgent();
    if (!initialized) throw new Error("Agent executor not initialized");
  }

  const startTime = Date.now();

  // Format history for LangChain
  const chat_history = history.map(msg => 
    msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
  );

  // Invoke the agent
  const result = await agentExecutor.invoke({
    input,
    chat_history,
  });

  const totalTime = Date.now() - startTime;

  return {
    reply: result.output,
    metadata: {
      totalTime,
      modelUsed: "llama-3.3-70b-versatile (Agent)",
      // Note: Full tracing/intermediate steps could be captured with callbacks
    }
  };
}

module.exports = {
  initAgent,
  runAgent
};
