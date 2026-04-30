const { ChatGroq } = require('@langchain/groq');
const { AgentExecutor, createToolCallingAgent } = require('langchain/agents');
const { ChatPromptTemplate, MessagesPlaceholder } = require('@langchain/core/prompts');
const ragSearchTool = require('../tools/ragSearchTool');

// We use the same configuration from ragService or define a dynamic one
const LLM_MODEL = 'llama-3.3-70b-versatile';

/**
 * Initializes and returns the configured LangChain Agent Executor
 * @returns {AgentExecutor}
 */
function createAgentExecutor() {
  // 1. Initialize the LLM (ChatGroq has native tool calling support)
  const llm = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: LLM_MODEL,
    temperature: 0.1, // Low temp for more deterministic actions
    maxTokens: 1000,
  });

  // 2. Define the tools the Agent can use
  const tools = [ragSearchTool];

  // 3. Create the System Prompt for the Agent
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are an advanced and intelligent AI Assistant. Your primary role is to assist the user accurately and professionally.
      
You have access to tools to obtain additional information.
- If the user asks a question about documents, manuals, PDFs, or internal data, you MUST use the 'SearchKnowledgeBaseTool'.
- DO NOT invent information about documents if you haven't used the tool.
- If the user greets you or asks a general question that doesn't require searching the documents, respond directly and amiably.
- Always respond in English, unless the user specifies otherwise.

Think step-by-step about whether you need to use a tool to answer the question.`
    ],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
    new MessagesPlaceholder("agent_scratchpad"),
  ]);

  // 4. Create the Tool Calling Agent
  // This binds the tools to the LLM and manages the reasoning loop
  const agent = createToolCallingAgent({
    llm,
    tools,
    prompt,
  });

  // 5. Create the Agent Executor
  // The executor runs the agent loop (Thought -> Action -> Observation -> Final Answer)
  const agentExecutor = new AgentExecutor({
    agent,
    tools,
    verbose: true, // Set to true to see the agent's internal thoughts in the console
    returnIntermediateSteps: false, // Set to true if we want to return the steps to the frontend
  });

  return agentExecutor;
}

module.exports = {
  createAgentExecutor,
};
