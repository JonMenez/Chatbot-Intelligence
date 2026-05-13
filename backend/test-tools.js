/**
 * Isolated Test Script for Agent Tools
 * Validates the behavior of registryTool and calculatorTool without loading the entire LLM chain.
 */

const { registryTool } = require('./src/tools/registryTool');
const { calculatorTool } = require('./src/tools/calculatorTool');

async function testTools() {
  console.log("=== 🧪 TOOL TESTING SUITE ===");

  // 1. Test Registry Tool
  console.log("\n--- Testing Registry Tool ---");
  try {
    const registryResult = await registryTool.invoke({ query: "" });
    console.log("Registry Result:");
    console.log(registryResult);
  } catch (error) {
    console.error("Registry Tool Error:", error.message);
  }

  // 2. Test Calculator Tool - Addition
  console.log("\n--- Testing Calculator Tool: Addition ---");
  try {
    const calcResult1 = await calculatorTool.invoke({ expression: "15 + 27" });
    console.log(calcResult1);
  } catch (error) {
    console.error("Calculator Error:", error.message);
  }

  // 3. Test Calculator Tool - Complex Math
  console.log("\n--- Testing Calculator Tool: Complex Expression ---");
  try {
    const calcResult2 = await calculatorTool.invoke({ expression: "((10 * 5) / 2) ^ 2" });
    console.log(calcResult2);
  } catch (error) {
    console.error("Calculator Error:", error.message);
  }

  // 4. Test Calculator Tool - Security Check
  console.log("\n--- Testing Calculator Tool: Security Check (Injection Attempt) ---");
  try {
    const calcResult3 = await calculatorTool.invoke({ expression: "2 + 2; process.exit(1)" });
    console.log(calcResult3);
  } catch (error) {
    console.error("Calculator Error:", error.message);
  }

  console.log("\n=== ✅ ALL TESTS COMPLETED ===");
}

testTools();
