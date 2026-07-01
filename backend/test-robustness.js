/**
 * Unit test for postModelHook robustness features
 * Validates alias mapping, arguments sanitization, and loop detection.
 */

const { createMainAgent } = require('./src/agents/mainAgent');
const { AIMessage, HumanMessage, ToolMessage } = require('@langchain/core/messages');

// We retrieve the postModelHook from mainAgent.js by creating the agent
// and extracting it or we can import it if it's exported.
// Since it's not exported, we can read the file or test via the compiled agent.
// Actually, let's export postModelHook from mainAgent.js to make it unit testable!
// Wait, is it exported? No, it's not currently. Let's see if we should export it or test it by importing.
// Yes! Let's check mainAgent.js. Currently it exports createMainAgent.
// Let's modify mainAgent.js exports to also export postModelHook and wrapLlmForGroqRobustness
// so they can be unit-tested. That is a great best practice for clean code!

const mainAgentModule = require('./src/agents/mainAgent');
const postModelHook = mainAgentModule.postModelHook || mainAgentModule.createMainAgent.postModelHook;

async function testRobustness() {
  console.log("======================================================");
  console.log("🧪 RUNNING ROBUSTNESS UNIT TESTS FOR postModelHook");
  console.log("======================================================\n");

  if (typeof postModelHook !== 'function') {
    console.error("❌ postModelHook is not exported from mainAgent.js. Please export it for testing.");
    process.exit(1);
  }

  let successCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      successCount++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failCount++;
    }
  }

  // --- TEST 1: Tool Name Alias Mapping ---
  console.log("--- Test 1: Alias Mapping ---");
  const state1 = {
    messages: [
      new HumanMessage("Calculate 2+2"),
      new AIMessage({
        content: "",
        tool_calls: [
          { name: "calc", args: { expression: "2+2" }, id: "call1", type: "tool_call" },
          { name: "search", args: { query: "penguins" }, id: "call2", type: "tool_call" },
          { name: "registry", args: {}, id: "call3", type: "tool_call" }
        ]
      })
    ]
  };

  const res1 = postModelHook(state1);
  assert(res1.messages !== undefined, "Returns updated messages");
  if (res1.messages) {
    const updatedMsg = res1.messages[0];
    assert(updatedMsg.tool_calls[0].name === "calculator_tool", "Mapped 'calc' to 'calculator_tool'");
    assert(updatedMsg.tool_calls[1].name === "search_knowledge_base", "Mapped 'search' to 'search_knowledge_base'");
    assert(updatedMsg.tool_calls[2].name === "registry_tool", "Mapped 'registry' to 'registry_tool'");
  }

  // --- TEST 2: Arguments Sanitization ---
  console.log("\n--- Test 2: Arguments Sanitization ---");
  const state2 = {
    messages: [
      new HumanMessage("Calculate 10*5"),
      new AIMessage({
        content: "",
        tool_calls: [
          { name: "calculator_tool", args: "10*5", id: "call1", type: "tool_call" },
          { name: "search_knowledge_base", args: { val: "penguins" }, id: "call2", type: "tool_call" }
        ]
      })
    ]
  };

  const res2 = postModelHook(state2);
  if (res2.messages) {
    const updatedMsg = res2.messages[0];
    assert(updatedMsg.tool_calls[0].args.expression === "10*5", "Sanitized string argument to expression object");
    assert(updatedMsg.tool_calls[1].args.query === "penguins", "Sanitized mismatched argument object to query");
  }

  // --- TEST 3: Loop Detection and Breaking ---
  console.log("\n--- Test 3: Loop Detection and Breaking ---");
  const state3 = {
    messages: [
      new HumanMessage("Calculate 15 + 27"),
      new AIMessage({
        content: "",
        tool_calls: [{ name: "calculator_tool", args: { expression: "15+27" }, id: "call1", type: "tool_call" }]
      }),
      new ToolMessage({ name: "calculator_tool", content: "Result of 15 + 27 = 42", tool_call_id: "call1" }),
      // The model generates the duplicate tool call!
      new AIMessage({
        content: "",
        tool_calls: [{ name: "calculator_tool", args: { expression: "15+27" }, id: "call2", type: "tool_call" }]
      })
    ]
  };

  const res3 = postModelHook(state3);
  assert(res3.messages !== undefined, "Loop detection triggered and returned update");
  if (res3.messages) {
    const updatedMsg = res3.messages[0];
    assert(!updatedMsg.tool_calls || updatedMsg.tool_calls.length === 0, "Cleared tool calls to break the loop");
    assert(updatedMsg.content === "42", "Extracted previous tool result '42' as fallback content");
  }

  // --- TEST 4: Invalid Tool Calls Promotion ---
  console.log("\n--- Test 4: Invalid Tool Calls Promotion ---");
  const state4 = {
    messages: [
      new HumanMessage("what do we have in the knowledge base"),
      new AIMessage({
        content: "",
        tool_calls: [],
        invalid_tool_calls: [
          { name: "registry_tool", args: "null", id: "call1", type: "invalid_tool_call" }
        ]
      })
    ]
  };

  const res4 = postModelHook(state4);
  assert(res4.messages !== undefined, "Invalid tool call promotion triggered and returned update");
  if (res4.messages) {
    const updatedMsg = res4.messages[0];
    assert(updatedMsg.tool_calls !== undefined && updatedMsg.tool_calls.length === 1, "Promoted invalid tool call to valid tool calls");
    if (updatedMsg.tool_calls && updatedMsg.tool_calls.length === 1) {
      assert(updatedMsg.tool_calls[0].name === "registry_tool", "Kept name 'registry_tool'");
      assert(typeof updatedMsg.tool_calls[0].args === "object" && Object.keys(updatedMsg.tool_calls[0].args).length === 0, "Normalized 'null' args to empty object");
    }
  }

  console.log("\n======================================================");
  console.log(`📊 postModelHook TESTS: ${successCount} PASSED, ${failCount} FAILED`);
  console.log("======================================================");
  
  return { successCount, failCount };
}

// ============================================================
// Self-Critique Unit Tests
// ============================================================

const { buildCritiqueMessages, CRITIQUE_SYSTEM_PROMPT } = require('./src/services/selfCritiqueService');

async function testSelfCritique() {
  console.log("\n======================================================");
  console.log("🧪 RUNNING SELF-CRITIQUE UNIT TESTS");
  console.log("======================================================\n");

  let successCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      successCount++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failCount++;
    }
  }

  // --- TEST 5: buildCritiqueMessages produces correct structure ---
  console.log("--- Test 5: buildCritiqueMessages Structure ---");
  const conversationMessages = [
    new HumanMessage("What is the capital of France?"),
    new AIMessage({ content: "", tool_calls: [{ name: "search_knowledge_base", args: { query: "capital of France" }, id: "c1", type: "tool_call" }] }),
    new ToolMessage({ name: "search_knowledge_base", content: "Paris is the capital of France.", tool_call_id: "c1" }),
    new AIMessage({ content: "The capital of France is Paris." }),
  ];

  const critiqueMessages = buildCritiqueMessages(conversationMessages, "The capital of France is Paris.");
  assert(critiqueMessages.length === 2, "buildCritiqueMessages returns 2 messages (system + human)");
  assert(critiqueMessages[0].content === CRITIQUE_SYSTEM_PROMPT, "First message is the system critique prompt");
  assert(critiqueMessages[1].content.includes("[User]: What is the capital of France?"), "Human message includes user query");
  assert(critiqueMessages[1].content.includes("[Tool Result — search_knowledge_base]: Paris is the capital of France."), "Human message includes tool results for context verification");
  assert(critiqueMessages[1].content.includes("PROPOSED RESPONSE:\nThe capital of France is Paris."), "Human message includes proposed response");

  // --- TEST 6: streamSelfCritique fallback on error ---
  console.log("\n--- Test 6: streamSelfCritique Fallback on Error ---");
  // We test the fallback behavior by temporarily overriding the module's internal
  // createCritiqueLlm. Since we can't easily mock internal functions, we test
  // the exported contract: if GROQ_API_KEY is invalid, it should still yield the original.
  const originalKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "invalid_key_for_testing_fallback";

  const { streamSelfCritique } = require('./src/services/selfCritiqueService');
  const fallbackMessages = [
    new HumanMessage("Test question"),
    new AIMessage({ content: "Original response that should be preserved." }),
  ];

  let fallbackResult = '';
  for await (const chunk of streamSelfCritique(fallbackMessages, "Original response that should be preserved.")) {
    fallbackResult += chunk;
  }

  assert(
    fallbackResult === "Original response that should be preserved.",
    "streamSelfCritique returns original response on API failure (fallback)"
  );

  // Restore the original key
  process.env.GROQ_API_KEY = originalKey;

  // --- TEST 7: runSelfCritique fallback on error ---
  console.log("\n--- Test 7: runSelfCritique Fallback on Error ---");
  process.env.GROQ_API_KEY = "invalid_key_for_testing_fallback";

  // Clear the module cache so it picks up the new invalid key
  delete require.cache[require.resolve('./src/services/selfCritiqueService')];
  const { runSelfCritique } = require('./src/services/selfCritiqueService');

  const syncResult = await runSelfCritique(
    fallbackMessages,
    "Sync original response."
  );

  assert(syncResult.correctedResponse === "Sync original response.", "runSelfCritique returns original response on API failure");
  assert(syncResult.applied === false, "runSelfCritique sets applied=false on API failure");

  // Restore the original key
  process.env.GROQ_API_KEY = originalKey;

  // --- TEST 8: buildCritiqueMessages handles empty tool results ---
  console.log("\n--- Test 8: buildCritiqueMessages with No Tools ---");
  const simpleMessages = [
    new HumanMessage("Hello!"),
    new AIMessage({ content: "Hi there!" }),
  ];

  const simpleResult = buildCritiqueMessages(simpleMessages, "Hi there!");
  assert(simpleResult.length === 2, "Returns 2 messages for simple conversation");
  assert(!simpleResult[1].content.includes("[Tool Result"), "No tool results in simple conversation");
  assert(simpleResult[1].content.includes("[User]: Hello!"), "Includes user message");
  assert(simpleResult[1].content.includes("[Assistant]: Hi there!"), "Includes assistant message");

  console.log("\n======================================================");
  console.log(`📊 Self-Critique TESTS: ${successCount} PASSED, ${failCount} FAILED`);
  console.log("======================================================");

  return { successCount, failCount };
}

// ============================================================
// Main Runner
// ============================================================

async function runAllTests() {
  const hookResults = await testRobustness();
  const critiqueResults = await testSelfCritique();

  const totalSuccess = hookResults.successCount + critiqueResults.successCount;
  const totalFail = hookResults.failCount + critiqueResults.failCount;

  console.log("\n======================================================");
  console.log(`📊 TOTAL: ${totalSuccess} PASSED, ${totalFail} FAILED`);
  console.log("======================================================");

  if (totalFail > 0) {
    process.exit(1);
  }
}

runAllTests().catch(console.error);

