const fs = require('fs');
const path = require('path');
const { Document } = require('@langchain/core/documents');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { MemoryVectorStore } = require('@langchain/classic/vectorstores/memory');
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
const { HuggingFaceTransformersEmbeddings } = require('@langchain/community/embeddings/huggingface_transformers');
const { getGroqClient, isGroqReady } = require('../config/groq');

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const DOCUMENTS_DIR = path.join(__dirname, '../../documents');

// Document validation thresholds
const MIN_DOCUMENT_CHARS = 100; // Skip documents shorter than this
const MIN_CHUNK_CHARS = 50;     // Skip chunks shorter than this

// Chunking parameters optimized for technical/knowledge documents
// Inspired by: https://docs.langchain.com/docs/modules/data_connection/document_loaders/
const SPLITTER_CONFIG = {
  chunkSize: 600,        // Reduced from 800 to avoid cutting mid-sentence in technical docs
  chunkOverlap: 150,     // Increased to 25% overlap for better context continuity
  separators: [
    '\n\n',              // Priority 1: Paragraph breaks (preserve structure)
    '\n',                // Priority 2: Line breaks
    '. ',                // Priority 3: Sentence ends
    ' ',                 // Priority 4: Spaces
    '',                  // Priority 5: Character level (last resort)
  ],
};

// Vector retrieval configuration
const RETRIEVAL_CONFIG = {
  k: 4,                  // Retrieve top-4 chunks instead of 3 for richer context
  scoreThreshold: 0.50,  // Optional: filter out low-relevance results
};

// LLM parameters for RAG
const LLM_CONFIG = {
  model: 'llama-3.3-70b-versatile',
  temperature: 0.1,      // Reduced from 0.3 to 0.1 for less creativity (more factual)
  max_tokens: 800,       // Reduced from 1000 to keep responses concise
  top_p: 0.9,            // Nucleus sampling for quality
};

// ============================================================================
// STATE & LOGGING
// ============================================================================

let vectorStore = null;
let ragReady = false;
let totalDocumentsLoaded = 0;
let totalChunksGenerated = 0;

/** Standardized logger for RAG operations */
const logger = {
  info: (msg) => console.log(`[RAG] ℹ️  ${msg}`),
  success: (msg) => console.log(`[RAG] ✅ ${msg}`),
  warn: (msg) => console.warn(`[RAG] ⚠️  ${msg}`),
  error: (msg) => console.error(`[RAG] ❌ ${msg}`),
  debug: (msg) => {
    if (process.env.DEBUG_RAG === 'true') {
      console.log(`[RAG] 🔍 ${msg}`);
    }
  },
};

// ============================================================================
// FILE LOADING & PARSING
// ============================================================================

/**
 * Load and parse a .txt file
 * @param {string} filePath - Path to text file
 * @returns {Promise<string>} File content
 */
async function loadTextFile(filePath) {
  try {
    return await fs.promises.readFile(filePath, 'utf8');
  } catch (err) {
    logger.error(`Failed to read text file ${path.basename(filePath)}: ${err.message}`);
    throw err;
  }
}

/**
 * Load and parse a .pdf file using pdf-parse
 * @param {string} filePath - Path to PDF file
 * @returns {Promise<string>} Extracted text content
 */
async function loadPdfFile(filePath) {
  try {
    const loader = new PDFLoader(filePath);
    const docs = await loader.load();
    // Combine text from all pages
    const text = docs.map(doc => doc.pageContent).join('\n\n');
    return text || '';
  } catch (err) {
    logger.error(`Failed to parse PDF ${path.basename(filePath)}: ${err.message}`);
    throw err;
  }
}

/**
 * Load all documents from the documents folder
 * Supports .txt and .pdf files with validation
 * @param {string} folderPath - Path to documents folder
 * @returns {Promise<Array>} Array of {text, metadata} objects
 */
async function loadDocumentsFromFolder(folderPath) {
  if (!fs.existsSync(folderPath)) {
    logger.warn(`Documents folder not found: ${folderPath}`);
    return [];
  }

  const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });
  const docs = [];
  let skipped = 0;

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const filePath = path.join(folderPath, entry.name);
    const ext = path.extname(entry.name).toLowerCase();
    let text = '';

    try {
      // Load file based on extension
      if (ext === '.txt') {
        text = await loadTextFile(filePath);
      } else if (ext === '.pdf') {
        text = await loadPdfFile(filePath);
      } else {
        logger.debug(`Skipping file ${entry.name}: unsupported format (${ext})`);
        continue;
      }

      // IMPROVEMENT #4a: Validate document length
      const trimmedText = text.trim();
      if (trimmedText.length === 0) {
        logger.warn(`Skipping ${entry.name}: file is empty`);
        skipped++;
        continue;
      }

      if (trimmedText.length < MIN_DOCUMENT_CHARS) {
        logger.warn(
          `Skipping ${entry.name}: too short (${trimmedText.length} chars, minimum: ${MIN_DOCUMENT_CHARS})`
        );
        skipped++;
        continue;
      }

      // IMPROVEMENT #4b: Track document size
      logger.debug(`Loaded ${entry.name}: ${trimmedText.length} chars`);

      docs.push({
        text: trimmedText,
        metadata: {
          source: entry.name,
          loadedAt: new Date().toISOString(),
          originalSize: trimmedText.length,
        },
      });
    } catch (err) {
      logger.error(`Failed to load ${entry.name}: ${err.message}`);
      skipped++;
    }
  }

  totalDocumentsLoaded = docs.length;
  logger.info(`Loaded ${docs.length} documents (${skipped} skipped)`);
  return docs;
}

// ============================================================================
// DOCUMENT CHUNKING
// ============================================================================

/**
 * Split documents into chunks with improved parameters
 * IMPROVEMENT #2: Better chunking configuration with structural awareness
 * @param {Array} rawDocs - Array of {text, metadata} objects
 * @returns {Promise<Array>} Array of LangChain Document objects
 */
async function chunkDocuments(rawDocs) {
  // IMPROVEMENT #2: Use RecursiveCharacterTextSplitter with better config
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: SPLITTER_CONFIG.chunkSize,
    chunkOverlap: SPLITTER_CONFIG.chunkOverlap,
    separators: SPLITTER_CONFIG.separators,
  });

  const documents = [];
  let totalSkipped = 0;

  for (const rawDoc of rawDocs) {
    try {
      const chunks = await splitter.splitText(rawDoc.text);

      if (!chunks || chunks.length === 0) {
        logger.debug(`No chunks generated for ${rawDoc.metadata.source}, adding as single document`);
        documents.push(
          new Document({
            pageContent: rawDoc.text,
            metadata: {
              ...rawDoc.metadata,
              chunk: -1, // Indicator: not chunked
            },
          })
        );
        continue;
      }

      // IMPROVEMENT #4c: Validate chunk size and skip tiny chunks
      const validChunks = chunks.filter((chunk) => {
        if (chunk.trim().length < MIN_CHUNK_CHARS) {
          totalSkipped++;
          return false;
        }
        return true;
      });

      validChunks.forEach((chunk, index) => {
        documents.push(
          new Document({
            pageContent: chunk,
            metadata: {
              ...rawDoc.metadata,
              chunk: index + 1,
              chunkCount: validChunks.length,
            },
          })
        );
      });

      logger.debug(
        `Split ${rawDoc.metadata.source}: ${validChunks.length} valid chunks (${totalSkipped} below threshold)`
      );
    } catch (err) {
      logger.error(`Failed to chunk ${rawDoc.metadata.source}: ${err.message}`);
    }
  }

  totalChunksGenerated = documents.length;
  logger.info(`Generated ${documents.length} document chunks`);
  return documents;
}

// ============================================================================
// RAG INITIALIZATION
// ============================================================================

/**
 * Initialize the RAG system with retry logic
 * Loads documents, chunks them, and creates vector store
 * @param {Object} options - Configuration options
 * @param {number} options.maxRetries - Max retry attempts on rate limit
 * @param {number} options.initialDelayMs - Initial retry delay in ms
 */
async function initRag({ maxRetries = 3, initialDelayMs = 1500 } = {}) {
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      logger.info(`Initializing RAG... (attempt ${attempt}/${maxRetries})`);

      // Ensure documents directory exists
      if (!fs.existsSync(DOCUMENTS_DIR)) {
        await fs.promises.mkdir(DOCUMENTS_DIR, { recursive: true });
        logger.success(`Created documents directory`);
      }

      // Step 1: Load documents
      const rawDocs = await loadDocumentsFromFolder(DOCUMENTS_DIR);
      if (!rawDocs.length) {
        logger.warn('No documents found in documents folder');
        ragReady = false;
        return;
      }

      // Step 2: Chunk documents
      const docs = await chunkDocuments(rawDocs);
      if (!docs.length) {
        logger.warn('No chunks generated from documents');
        ragReady = false;
        return;
      }

      // Step 3: Initialize embeddings (HF Transformers - local, free)
      logger.info('Initializing Hugging Face embeddings model (Xenova/all-MiniLM-L6-v2)...');
      const embeddings = new HuggingFaceTransformersEmbeddings({
        modelName: 'Xenova/all-MiniLM-L6-v2', // ✅ Free, runs locally
      });

      // Step 4: Create vector store from documents
      logger.info('Creating in-memory vector store...');
      vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);
      ragReady = true;

      logger.success(
        `RAG initialized successfully: ${totalDocumentsLoaded} docs → ${totalChunksGenerated} chunks`
      );
      return;
    } catch (error) {
      ragReady = false;
      const isRateLimit =
        error?.message?.toString().toLowerCase().includes('quota') ||
        error?.message?.toString().toLowerCase().includes('rate_limit') ||
        error?.message?.toString().toLowerCase().includes('429');

      if (isRateLimit && attempt < maxRetries) {
        const nextDelay = initialDelayMs * attempt;
        logger.warn(
          `Rate limit hit. Retrying in ${nextDelay}ms... (${attempt}/${maxRetries})`
        );
        await delay(nextDelay);
        continue;
      }

      logger.error(`Failed to initialize RAG: ${error.message || error}`);
      return; // Non-throwing failure: server stays up, /rag returns 503
    }
  }
}

/**
 * Check if RAG system is ready for queries
 * @returns {boolean} True if RAG is initialized and vector store exists
 */
function isRagReady() {
  return ragReady && vectorStore !== null;
}

// ============================================================================
// PROMPT ENGINEERING (IMPROVEMENT #1)
// ============================================================================

/**
 * Build a robust system prompt with guardrails to prevent hallucinations
 * Features:
 * - Explicit instructions when knowledge is missing
 * - Chain-of-Thought reasoning pattern
 * - Tone and format guidelines
 * @returns {string} System prompt
 */
function buildSystemPrompt() {
  return `You are a senior AI Agent Developer assistant helping MERN developers transition into AI/ML.

Your role: Provide accurate, practical, and actionable answers grounded in the provided knowledge base.

=== CRITICAL RULES ===
1. **You MUST ONLY use information from the provided context.**
2. **If the answer is NOT in the provided context, you MUST respond EXACTLY with:**
   "I don't have enough information in the knowledge base to answer this accurately."
3. **Never invent, assume, or extrapolate beyond the provided context.**
4. **Never mention that you're an AI or talk about your limitations.**

=== HOW TO RESPOND ===
1. Read the provided context carefully.
2. Think through the question step-by-step (Chain of Thought).
3. Provide a clear, concise answer (1-2 paragraphs max).
4. Use concrete examples from the context if available.
5. Use analogies to MERN concepts when appropriate.

=== TONE & FORMAT ===
- Be professional but friendly.
- Be specific and avoid vague language.
- For technical questions, include code examples if available in context.
- Format code blocks clearly using markdown.

=== OUTPUT GUIDELINES ===
- Maximum 3 paragraphs.
- Use bullet points for lists.
- If unsure, ask clarifying questions rather than guessing.`;
}

/**
 * Build the user prompt with context and question
 * IMPROVEMENT #3: Structured logging of what's being sent to LLM
 * @param {string} message - User's question
 * @param {Array} relevantDocs - Retrieved documents with similarity scores
 * @returns {string} Formatted user prompt
 */
function buildUserPrompt(message, relevantDocs) {
  // Format context with source attribution
  const contextWithSources = relevantDocs
    .map((doc, idx) => {
      return `[Source: ${doc.metadata.source}${doc.metadata.chunk > 0 ? `, Chunk ${doc.metadata.chunk}` : ''}]\n${doc.pageContent}`;
    })
    .join('\n\n---\n\n');

  return `KNOWLEDGE BASE:
${contextWithSources}

QUESTION:
${message}

Please answer based ONLY on the knowledge base above. If the answer is not there, say so.`;
}

// ============================================================================
// CONFIDENCE & SOURCE ATTRIBUTION
// ============================================================================

/**
 * Calculate confidence score based on retrieval quality and LLM response
 * IMPROVEMENT #3: Observability for response reliability
 * @param {Array} relevantDocs - Array of retrieved documents
 * @param {string} reply - The LLM's response
 * @returns {Object} Confidence metrics {score: 0-1, reasoning: string, sources: Array}
 */
function calculateConfidence(relevantDocs, reply) {
  // CRITICAL FIX: If LLM says it doesn't have information, confidence = 0
  const noInfoResponse = "I don't have enough information in the knowledge base to answer this accurately.";
  if (reply.trim().toLowerCase().includes(noInfoResponse.toLowerCase())) {
    return {
      score: 0,
      reasoning: 'LLM indicated insufficient information in knowledge base',
      sources: [], // No sources if no information available
    };
  }

  if (!relevantDocs || relevantDocs.length === 0) {
    return { score: 0, reasoning: 'No documents retrieved', sources: [] };
  }

  // Note: LangChain MemoryVectorStore doesn't return similarity scores in this API
  // For now, we estimate confidence based on number of relevant documents
  const confidenceScore = Math.min(0.9, 0.5 + relevantDocs.length * 0.15);

  // FIX: Make sources unique (remove duplicates)
  const uniqueSources = [...new Set(relevantDocs.map((d) => d.metadata.source))];

  return {
    score: confidenceScore,
    reasoning: `Retrieved ${relevantDocs.length} relevant documents from ${uniqueSources.length} sources`,
    sources: uniqueSources, // Return unique sources only
  };
}

// ============================================================================
// MAIN RAG QUERY FUNCTION
// ============================================================================

/**
 * Answer a question using the RAG pipeline
 * IMPROVEMENT #1, #2, #3, #4: All improvements integrated here
 *
 * Process:
 * 1. Retrieve relevant documents
 * 2. Build robust prompts with guardrails
 * 3. Query Groq LLM
 * 4. Return answer with confidence & sources
 *
 * @param {string} message - User's question
 * @returns {Promise<Object>} {reply, confidence, sources, metadata}
 */
async function answerWithRag(message) {
  const startTime = Date.now();

  // VALIDATION: Check if RAG is ready
  if (!isRagReady()) {
    throw new Error(
      'RAG is not initialized. Please add documents to backend/documents folder and restart the server.'
    );
  }

  if (!isGroqReady()) {
    throw new Error('Groq service not available. Check your GROQ_API_KEY in .env file.');
  }

  try {
    // STEP 1: Retrieve relevant documents
    let relevantDocs = await vectorStore.similaritySearch(message, RETRIEVAL_CONFIG.k);
    const retrievalTime = Date.now() - startTime;

    // IMPROVEMENT #3: Detailed logging
    logger.debug(`Retrieved ${relevantDocs.length} documents for query: "${message.substring(0, 60)}..."`);
    relevantDocs.forEach((doc, i) => {
      const source = doc.metadata.source;
      const chunk = doc.metadata.chunk > 0 ? `, Chunk ${doc.metadata.chunk}` : '';
      logger.debug(`  [${i + 1}] ${source}${chunk}`);
    });
    logger.debug(`Retrieval latency: ${retrievalTime}ms`);

    // Filter out irrelevant results if score threshold is available (MemoryVectorStore limitation)
    if (relevantDocs.length === 0) {
      logger.warn(`No relevant documents found for query: "${message.substring(0, 60)}..."`);
      return {
        reply:
          "I don't have enough information in the knowledge base to answer this accurately.",
        confidence: 0,
        sources: [],
        metadata: {
          retrievalTime,
          documentsRetrieved: 0,
          modelUsed: 'N/A',
        },
      };
    }

    // STEP 2: Build structured prompts
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(message, relevantDocs);

    // Log prompt structure for debugging
    logger.debug(`System prompt length: ${systemPrompt.length} chars`);
    logger.debug(`User prompt length: ${userPrompt.length} chars`);

    // STEP 3: Query Groq with improved parameters
    const llmStartTime = Date.now();
    const groqClient = getGroqClient();

    const response = await groqClient.chat.completions.create({
      model: LLM_CONFIG.model,
      messages: [
        { role: 'system', content: systemPrompt }, // ✅ IMPROVEMENT #1: Robust system prompt
        { role: 'user', content: userPrompt },
      ],
      temperature: LLM_CONFIG.temperature, // ✅ Reduced to 0.1 for factuality
      max_tokens: LLM_CONFIG.max_tokens,
      top_p: LLM_CONFIG.top_p,
    });

    const llmTime = Date.now() - llmStartTime;

    // Extract response
    const reply = response.choices?.[0]?.message?.content || response.choices?.[0]?.text || '';

    // IMPROVEMENT #3: Calculate confidence & track metrics (NOW with reply context)
    const confidence = calculateConfidence(relevantDocs, reply);
    const totalTime = Date.now() - startTime;

    logger.success(
      `Reply generated: ${reply.length} chars in ${totalTime}ms (retrieval: ${retrievalTime}ms, LLM: ${llmTime}ms)`
    );

    return {
      reply,
      confidence: confidence.score,
      sources: confidence.sources, // Now returns unique sources
      metadata: {
        retrievalTime,
        llmTime,
        totalTime,
        documentsRetrieved: relevantDocs.length,
        modelUsed: LLM_CONFIG.model,
        confidenceReasoning: confidence.reasoning,
      },
    };
  } catch (error) {
    logger.error(`Error in RAG query: ${error.message}`);
    throw error;
  }
}

// ============================================================================
// DYNAMIC DOCUMENT INGESTION
// ============================================================================

/**
 * Dynamically loads, chunks, and adds a document to the existing vector store
 * @param {string} filePath - Absolute path to the file
 * @param {string} originalName - Original filename for source tracking
 * @returns {Promise<Object>} Metadata about the insertion process
 */
async function addDocumentToVectorStore(filePath, originalName) {
  if (!isRagReady()) {
    throw new Error('Vector store is not initialized yet. Ensure the RAG system connects at startup first.');
  }

  const ext = path.extname(originalName).toLowerCase();
  let text = '';

  // Extract text
  if (ext === '.txt') {
    text = await loadTextFile(filePath);
  } else if (ext === '.pdf') {
    text = await loadPdfFile(filePath);
  } else {
    throw new Error('Unsupported file format. Please upload PDF or TXT files.');
  }

  const trimmedText = text.trim();
  if (trimmedText.length < MIN_DOCUMENT_CHARS) {
    throw new Error(`File content too short (min ${MIN_DOCUMENT_CHARS} chars)`);
  }

  // Create single rawDoc object
  const rawDoc = {
    text: trimmedText,
    metadata: {
      source: originalName,
      loadedAt: new Date().toISOString(),
      originalSize: trimmedText.length,
    },
  };

  // Chunk documents mapping
  const docs = await chunkDocuments([rawDoc]);

  if (!docs.length) {
    throw new Error('Could not generate text chunks from document');
  }

  // Insert into memory store
  await vectorStore.addDocuments(docs);
  logger.success(`Dynamically added ${originalName}: ${docs.length} chunks added`);

  return {
    source: originalName,
    chunksAdded: docs.length,
    size: trimmedText.length,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  initRag,
  isRagReady,
  answerWithRag,
  addDocumentToVectorStore,
  // Exposed for testing/debugging:
  loadDocumentsFromFolder,
  chunkDocuments,
  calculateConfidence,
};
