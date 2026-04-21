const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { initRag, isRagReady, answerWithRag, evaluateRagResponse } = require('../src/services/ragService');

// Golden Dataset for RAG Evaluation
const goldenDataset = [
  {
    question: "What is a Retrieval-Augmented Generation (RAG) system?",
    expectedAnswer: "A system that retrieves relevant documents from a knowledge base to augment an LLM's prompt, improving factual accuracy."
  },
  {
    question: "How does the system handle an empty context or lack of information?",
    expectedAnswer: "It replies exactly with 'No relevant information found in the knowledge base, I cannot answer this reliably.'"
  },
  {
    question: "What embeddings model is used in this project?",
    expectedAnswer: "Xenova/all-MiniLM-L6-v2"
  },
  {
    question: "What vector database is used to store documents?",
    expectedAnswer: "ChromaDB"
  },
  {
    question: "How do I upload a document to the chatbot?",
    expectedAnswer: "Users can upload PDF or TXT documents which are parsed and dynamically added to ChromaDB."
  },
  {
    question: "Can you tell me a joke about programming?",
    expectedAnswer: "No relevant information found in the knowledge base, I cannot answer this reliably. (Testing strict adherence to knowledge base)"
  },
  {
    question: "Who developed the first AI model?",
    expectedAnswer: "No relevant information found in the knowledge base, I cannot answer this reliably."
  },
  {
    question: "What is the maximum file size for document uploads?",
    expectedAnswer: "50 MB"
  }
];

async function runEvaluation() {
  console.log('🚀 Starting Offline RAG Evaluation...\n');

  // Initialize RAG System
  console.log('⏳ Initializing RAG System...');
  await initRag();
  
  if (!isRagReady()) {
    console.error('❌ RAG System failed to initialize. Please check ChromaDB and Groq connections.');
    process.exit(1);
  }
  
  console.log('✅ RAG System Initialized. Starting evaluation of Golden Dataset...\n');

  const results = [];
  let totalFaithfulness = 0;
  let totalAnswerRelevance = 0;
  let totalContextRelevance = 0;

  for (let i = 0; i < goldenDataset.length; i++) {
    const item = goldenDataset[i];
    console.log(`\n--- Test ${i + 1}/${goldenDataset.length} ---`);
    console.log(`Q: ${item.question}`);
    console.log(`Expected: ${item.expectedAnswer}`);

    try {
      // 1. Run RAG to get the generated answer and context docs
      const ragResult = await answerWithRag(item.question, []);
      console.log(`Generated: ${ragResult.reply.substring(0, 100)}${ragResult.reply.length > 100 ? '...' : ''}`);
      
      // 2. Run the LLM-as-a-judge evaluation
      const evalScores = await evaluateRagResponse(
        item.question,
        ragResult.reply,
        ragResult.contextDocs,
        item.expectedAnswer
      );

      if (evalScores) {
        results.push({
          question: item.question,
          faithfulness: evalScores.faithfulness_score,
          answerRelevance: evalScores.answer_relevance_score,
          contextRelevance: evalScores.context_relevance_score,
          reasoning: evalScores.reasoning
        });

        totalFaithfulness += evalScores.faithfulness_score;
        totalAnswerRelevance += evalScores.answer_relevance_score;
        totalContextRelevance += evalScores.context_relevance_score;

        console.log(`Scores -> Faithfulness: ${evalScores.faithfulness_score} | Answer Relevance: ${evalScores.answer_relevance_score} | Context Relevance: ${evalScores.context_relevance_score}`);
        console.log(`Reasoning: ${evalScores.reasoning}`);
      } else {
        console.error(`⚠️ Evaluation failed for question: ${item.question}`);
      }

    } catch (err) {
      console.error(`❌ Error processing question "${item.question}":`, err.message);
    }
  }

  console.log('\n=========================================');
  console.log('📊 RAG EVALUATION SUMMARY');
  console.log('=========================================');
  
  if (results.length > 0) {
    const avgFaithfulness = (totalFaithfulness / results.length).toFixed(2);
    const avgAnswerRelevance = (totalAnswerRelevance / results.length).toFixed(2);
    const avgContextRelevance = (totalContextRelevance / results.length).toFixed(2);

    console.log(`Total Questions Evaluated: ${results.length}`);
    console.log(`Average Faithfulness: ${avgFaithfulness}`);
    console.log(`Average Answer Relevance: ${avgAnswerRelevance}`);
    console.log(`Average Context Relevance: ${avgContextRelevance}`);
    
    console.log('\nFull Results Matrix:');
    console.table(results.map(r => ({
      Question: r.question.substring(0, 40) + '...',
      Faithful: r.faithfulness,
      AnsRel: r.answerRelevance,
      CtxRel: r.contextRelevance
    })));
  } else {
    console.log('No valid results generated.');
  }
  
  console.log('=========================================\n');
  
  // Workaround for ONNX Runtime (Xenova) C++ mutex lock bug on macOS during process exit:
  // Instead of process.exit(0) which triggers destructors that crash, we send SIGTERM.
  process.kill(process.pid, 'SIGTERM');
}

runEvaluation();
