const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { expandQuery, SYNONYM_DICTIONARY } = require('#services/queryExpander');
const { initRag, searchKnowledgeBase, isRagReady } = require('#services/ragService');

// Enable RAG and query expander debugging
process.env.DEBUG_RAG = 'true';
process.env.DEBUG_QUERY_EXPANDER = 'true';

async function runTests() {
  console.log('======================================================');
  console.log('🧪 Starting Query Expansion Tests');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // --- UNIT TESTS ---
  console.log('--- Step 1: Running Unit Tests for expandQuery ---');

  // Test 1: Expansion with synonyms
  const query1 = 'What is RAG?';
  const res1 = await expandQuery(query1);
  console.log(`Query: "${query1}" -> Expanded: "${res1}"`);
  assert(res1.includes('retrieval-augmented generation') || res1.includes('retrieval augmented generation'), 'Expands RAG with correct synonyms');

  // Test 2: Multiple terms expansion
  const query2 = 'how to prevent hallucinations in groq?';
  const res2 = await expandQuery(query2);
  console.log(`Query: "${query2}" -> Expanded: "${res2}"`);
  assert(
    res2.includes('errors') && res2.includes('llama') && res2.includes('inference engine'),
    'Expands multiple words with synonyms'
  );

  // Test 3: No synonyms matching
  const query3 = 'What is the color of the sky?';
  const res3 = await expandQuery(query3);
  console.log(`Query: "${query3}" -> Expanded: "${res3}"`);
  assert(res3 === query3, 'Leaves query untouched when no synonyms match');

  // Test 4: Mode setting 'none'
  const query4 = 'What is RAG?';
  const res4 = await expandQuery(query4, { mode: 'none' });
  console.log(`Query: "${query4}" (mode: none) -> Expanded: "${res4}"`);
  assert(res4 === query4, 'Bypasses expansion when mode is set to "none"');

  // --- INTEGRATION TESTS ---
  console.log('\n--- Step 2: Running Integration Tests with ChromaDB ---');
  try {
    console.log('Initializing RAG system (connecting to ChromaDB)...');
    await initRag();

    if (!isRagReady()) {
      console.error('⚠️ RAG system failed to initialize. ChromaDB might not be running.');
      console.log('Skipping database integration tests, but unit tests passed.');
    } else {
      console.log('RAG system is ready. Running knowledge base search...');
      
      const searchQuery = 'Tell me about RAG chunking size';
      console.log(`\nSearching knowledge base for: "${searchQuery}"`);
      const docs = await searchKnowledgeBase(searchQuery);
      
      console.log(`Retrieved ${docs.length} document chunks.`);
      assert(docs.length > 0, 'Retrieves documents from the vector store using expanded query');
      
      if (docs.length > 0) {
        console.log('Sample retrieved chunk from source:', docs[0].metadata.source);
        console.log(`Content preview: "${docs[0].pageContent.substring(0, 150).replace(/\n/g, ' ')}..."`);
      }
    }
  } catch (error) {
    console.error('❌ Error running integration tests:', error.message);
    failed++;
  }

  console.log('\n======================================================');
  console.log(`📊 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
