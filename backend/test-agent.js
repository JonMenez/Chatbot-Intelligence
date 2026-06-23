const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { initRag } = require('#services/ragService');
const { createMainAgent } = require('#agents/mainAgent');
const { HumanMessage } = require('@langchain/core/messages');

async function runTests() {
  console.log('======================================================');
  console.log('🚀 Starting Agent Test Script (LangGraph Edition)');
  console.log('======================================================\n');

  console.log('--- Step 1: Initializing RAG System (Embeddings + ChromaDB) ---');
  await initRag();

  console.log('\n--- Step 2: Initializing AgentExecutor ---');
  const agentExecutor = createMainAgent();
  console.log('✅ Agent initialized with tools and prompt.\n');

  const scenarios = [
    {
      name: "Scenario A: Conversational Question",
      query: "Hello! Who are you?",
      shouldUseTool: false
    },
    {
      name: "Scenario B: Knowledge Base Question",
      query: "What is the info.txt document about?",
      shouldUseTool: true
    }
  ];

  for (const scenario of scenarios) {
    console.log(`\n======================================================`);
    console.log(`🧠 Executing ${scenario.name}`);
    console.log(`❓ Query: "${scenario.query}"`);
    console.log(`======================================================\n`);

    try {
      // Invoke the LangGraph agent
      const response = await agentExecutor.invoke({
        messages: [new HumanMessage(scenario.query)],
      }, {
        configurable: { thread_id: "test-thread-" + scenario.name.replace(/\s+/g, "-").toLowerCase() }
      });

      // The response.messages contains the conversation history
      const messages = response.messages;
      
      // Analyze intermediate messages to see if a tool was used
      // Tool messages indicate a tool was successfully called and returned a response
      const toolMessages = messages.filter(m => m._getType() === "tool");
      const toolWasUsed = toolMessages.length > 0;
      
      const finalMessage = messages[messages.length - 1];

      console.log(`\n--- Test Analysis ---`);
      console.log(`Did the agent use a tool? -> ${toolWasUsed ? '✅ YES' : '❌ NO'}`);
      
      if (toolWasUsed) {
        toolMessages.forEach((msg, index) => {
          console.log(`  Step ${index + 1} Action: called tool '${msg.name}'`);
        });
      }

      // Check if it matches our expectation
      if (toolWasUsed === scenario.shouldUseTool) {
        console.log(`🎯 STATUS: SUCCESS (Agent behaved as expected)`);
      } else {
        console.log(`⚠️ STATUS: FAILED (Expected tool use: ${scenario.shouldUseTool}, got: ${toolWasUsed})`);
      }

      console.log(`\n🤖 Final Output:\n"${finalMessage.content}"\n`);
      
    } catch (error) {
      console.error(`❌ Error executing scenario:`, error);
    }
  }
}

runTests().then(() => {
  console.log('\n--- Tests Completed Successfully ---');
  process.exit(0);
});
