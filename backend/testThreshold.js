const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { initRag, answerWithRag } = require('#services/ragService');

async function runTest() {
  console.log("=========================================");
  console.log("🧪 STARTING RAG THRESHOLD TEST (0.75) 🧪");
  console.log("=========================================");
  
  // 1. Initialize RAG (scans backend/documents folder and connects to Chroma)
  await initRag();
  
  console.log("\n-----------------------------------------");
  console.log("📌 QUESTION 1: A question INSIDE the context (Penguins)");
  console.log("-----------------------------------------");
  try {
    const res1 = await answerWithRag("Where do emperor penguins live and what temperatures do they face?");
    console.log("\n🤖 GROQ RESPONSE:");
    console.log(res1.reply);
    console.log("\n📊 METRICS:");
    console.log(`Confidence: ${res1.confidence.toFixed(2)}`);
    console.log(`Documents that passed threshold (0.75): ${res1.metadata.documentsRetrieved}`);
  } catch (error) {
    console.error("Error in Question 1:", error.message);
  }

  console.log("\n-----------------------------------------");
  console.log("📌 QUESTION 2: A question OUTSIDE the context (React Router)");
  console.log("-----------------------------------------");
  try {
    // Since there are no documents about React Router, Chroma might return penguin documents
    // but with a low score (e.g. 0.3 or 0.4). Our 0.75 threshold filter should block them
    // and trigger the anti-hallucination guardrail!
    const res2 = await answerWithRag("How do I install React Router in a Vite project?");
    console.log("\n🤖 GROQ RESPONSE:");
    console.log(res2.reply); // Should output: "No relevant information found..."
    console.log("\n📊 METRICS:");
    console.log(`Confidence: ${res2.confidence.toFixed(2)}`);
    console.log(`Documents that passed threshold (0.75): ${res2.metadata.documentsRetrieved}`);
  } catch (error) {
    console.error("Error in Question 2:", error.message);
  }
}

runTest().then(() => {
  console.log("\n✅ Test completed.");
  process.exit(0);
});
