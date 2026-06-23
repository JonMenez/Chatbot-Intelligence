const logger = {
  info: (msg) => console.log(`[QueryExpander] ℹ️  ${msg}`),
  success: (msg) => console.log(`[QueryExpander] ✅ ${msg}`),
  debug: (msg) => {
    if (process.env.DEBUG_RAG === 'true' || process.env.DEBUG_QUERY_EXPANDER === 'true') {
      console.log(`[QueryExpander] 🔍 ${msg}`);
    }
  }
};

// Synonym dictionary tailored to the project documentation and common RAG terms
const SYNONYM_DICTIONARY = {
  'rag': ['retrieval-augmented generation', 'retrieval augmented generation', 'retrieval system', 'knowledge base search'],
  'hallucination': ['hallucinations', 'errors', 'mistakes', 'false response', 'invented answers', 'factuality'],
  'hallucinations': ['hallucination', 'errors', 'mistakes', 'false response', 'invented answers', 'factuality'],
  'groq': ['llama', 'inference engine', 'llm backbone', 'llama-3.3-70b-versatile'],
  'embedding': ['embeddings', 'vectors', 'transformers', 'all-MiniLM-L6-v2', 'xenova'],
  'embeddings': ['embedding', 'vectors', 'transformers', 'all-MiniLM-L6-v2', 'xenova'],
  'vectorstore': ['vector store', 'chromadb', 'chroma', 'database', 'collection', 'vector database'],
  'chroma': ['chromadb', 'vector store', 'database', 'collection'],
  'chromadb': ['chroma', 'vector store', 'database', 'collection'],
  'chunking': ['chunk size', 'overlap', 'split text', 'splitter', 'recursivecharactertextsplitter', 'text fragmentation'],
  'chunk': ['chunk size', 'overlap', 'split text', 'splitter', 'recursivecharactertextsplitter', 'text fragment'],
  'chunks': ['chunk size', 'overlap', 'split text', 'splitter', 'recursivecharactertextsplitter', 'text fragments'],
  'pdf': ['pdfloader', 'document loader', 'uploaded files', 'pdf document'],
  'txt': ['text file', 'info.txt', 'documents', 'text document'],
  'retrieval': ['search', 'similarity search', 'cosine similarity', 'retrieve', 'retrieved docs', 'information retrieval'],
  'evaluation': ['faithfulness', 'evaluator', 'ragas', 'llm-as-a-judge', 'score', 'rag evaluation'],
  'evaluate': ['faithfulness', 'evaluator', 'ragas', 'llm-as-a-judge', 'score', 'perform evaluation'],
  'memory': ['chat history', 'conversational memory', 'checkpointer', 'memorysaver', 'retention']
};

/**
 * Normalizes a word by removing punctuation and converting to lowercase.
 */
function normalizeWord(word) {
  return word.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
}

/**
 * Expands a query using a dictionary-based synonym lookup.
 * Extensible for LLM-based query expansion later.
 * 
 * @param {string} query - Original user query
 * @param {Object} options - Expansion options
 * @param {string} options.mode - 'dictionary' | 'none' (future: 'llm')
 * @returns {Promise<string>} The expanded query
 */
async function expandQuery(query, options = { mode: 'dictionary' }) {
  if (!query || typeof query !== 'string') {
    return '';
  }

  const mode = options.mode || 'dictionary';
  logger.debug(`Expanding query: "${query}" using mode: "${mode}"`);

  if (mode === 'none') {
    return query;
  }

  if (mode === 'dictionary') {
    const words = query.split(/\s+/);
    const addedSynonyms = new Set();

    for (const word of words) {
      const normalized = normalizeWord(word);
      if (SYNONYM_DICTIONARY[normalized]) {
        SYNONYM_DICTIONARY[normalized].forEach(syn => addedSynonyms.add(syn));
      }
    }

    if (addedSynonyms.size === 0) {
      logger.debug(`No synonyms found for query.`);
      return query;
    }

    const synonymString = Array.from(addedSynonyms).join(', ');
    const expandedQuery = `${query} (synonyms: ${synonymString})`;
    logger.debug(`Expanded query result: "${expandedQuery}"`);
    return expandedQuery;
  }

  // Fallback if mode not recognized
  return query;
}

module.exports = {
  expandQuery,
  SYNONYM_DICTIONARY
};
