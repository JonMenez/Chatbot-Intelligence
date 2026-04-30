const fs = require('fs');
const path = require('path');
const { Document } = require('@langchain/core/documents');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { Chroma } = require('@langchain/community/vectorstores/chroma');
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
const { HuggingFaceTransformersEmbeddings } = require('@langchain/community/embeddings/huggingface_transformers');
const { getGroqClient, isGroqReady } = require('../config/groq');
const registryService = require('./registryService');

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const DOCUMENTS_DIR = path.join(__dirname, '../../documents');

// Document validation thresholds
const MIN_DOCUMENT_CHARS = 100; // Skip documents shorter than this
const MIN_CHUNK_CHARS = 50;     // Skip chunks shorter than this

// Chunking parameters optimized for technical/knowledge documents
// Inspired by: NotebookLM best practices
const SPLITTER_CONFIG = {
  chunkSize: 1000,       // Increased to 1000 as per NotebookLM suggestion
  chunkOverlap: 200,     // 20% overlap strategy
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
  k: 5,                  // Retrieve top-5 chunks instead of 4 for richer context
  scoreThreshold: 0.20,  // Lowered from 0.75 because local MiniLM embeddings yield lower cosine scores (~0.3)
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

      // Use registryService to get original file name instead of disk name
      const originalName = await registryService.getOriginalName(entry.name);

      docs.push({
        text: trimmedText,
        metadata: {
          source: originalName,
          loadedAt: new Date().toISOString(),
          originalSize: trimmedText.length,
          fileExtension: ext,
          category: ext === '.pdf' ? 'document' : 'text_file',
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

      // Step 3: Initialize embeddings (✅ Free, runs locally)
      logger.info('Initializing Hugging Face embeddings model (Xenova/all-MiniLM-L6-v2)...');
      const embeddings = new HuggingFaceTransformersEmbeddings({
        modelName: 'Xenova/all-MiniLM-L6-v2', 
      });

      const COLLECTION_NAME = "chatbot_knowledge";
      const CHROMA_URL = process.env.CHROMA_URL || "http://localhost:8000";
      const resetDb = process.env.RESET_CHROMA_DB === 'true';
      let shouldIngest = false;

      // Initialize Chroma Client to check status
      try {
        const { ChromaClient } = require("chromadb");
        const client = new ChromaClient({ path: CHROMA_URL });

        if (resetDb) {
          logger.warn(`RESET_CHROMA_DB is true. Eliminando colección '${COLLECTION_NAME}'...`);
          try {
            await client.deleteCollection({ name: COLLECTION_NAME });
            logger.success(`Colección eliminada.`);
          } catch (e) {
            logger.debug(`Colección no existía o no se pudo eliminar (es normal en el primer inicio).`);
          }
          shouldIngest = true;
        } else {
          try {
            const collection = await client.getCollection({ name: COLLECTION_NAME });
            const count = await collection.count();
            if (count > 0) {
              logger.info(`ChromaDB collection '${COLLECTION_NAME}' ya contiene ${count} chunks. Omitiendo ingesta inicial.`);
              totalChunksGenerated = count;
              shouldIngest = false;
            } else {
              shouldIngest = true;
            }
          } catch (e) {
            shouldIngest = true;
          }
        }
      } catch (err) {
        logger.warn(`No se pudo conectar a ChromaDB en ${CHROMA_URL}. ¿Está corriendo Docker?`);
        throw new Error(`ChromaDB connection failed: ${err.message}`);
      }

      if (shouldIngest) {
        logger.info('Cargando documentos para la ingesta inicial en ChromaDB...');
        const rawDocs = await loadDocumentsFromFolder(DOCUMENTS_DIR);
        if (rawDocs.length > 0) {
          const docs = await chunkDocuments(rawDocs);
          if (docs.length > 0) {
            logger.info('Guardando chunks en la base de datos persistente ChromaDB...');
            await Chroma.fromDocuments(docs, embeddings, {
              collectionName: COLLECTION_NAME,
              url: CHROMA_URL,
              collectionMetadata: { "hnsw:space": "cosine" }
            });
            logger.success(`Ingesta inicial exitosa: ${docs.length} chunks agregados a ChromaDB.`);
          } else {
            logger.warn('No chunks generated from documents.');
          }
        } else {
          logger.warn('No documents found in documents folder. La base de datos iniciará vacía.');
        }
      }

      logger.info('Conectando store vectorial con Chroma...');
      vectorStore = new Chroma(embeddings, {
        collectionName: COLLECTION_NAME,
        url: CHROMA_URL,
        collectionMetadata: { "hnsw:space": "cosine" }
      });

      ragReady = true;
      logger.success(`RAG (ChromaDB) inicializado correctamente.`);
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

// 1. Separate Templates (Following Clean Code suggestion)
const SYSTEM_INSTRUCTIONS = `You are a senior AI Agent Developer assistant helping users.

Your role: Provide accurate, practical, and actionable answers grounded strictly in the provided knowledge base.

=== CRITICAL ANTI-HALLUCINATION RULES ===
1. **You MUST ONLY use information from the provided context.**
2. **If the user's question cannot be answered using the provided context, you MUST NOT guess or invent an answer.**
3. **If the context is empty or you lack information, you MUST reply EXACTLY with:**
   "No relevant information found in the knowledge base, I cannot answer this reliably."
4. **Never mention that you're an AI or talk about your limitations.**

=== HOW TO RESPOND ===
1. Read the provided context carefully.
2. Provide a clear, concise answer (1-2 paragraphs max).
3. Base your answer strictly on the facts presented in the context.

=== TONE & FORMAT ===
- Be professional but friendly.
- Format code blocks clearly using markdown.`;

const emptyContextTemplate = (query) => `
KNOWLEDGE BASE:
[EMPTY - NO RELEVANT DOCUMENTS PASSED THE THRESHOLD]

QUESTION:
${query}

INSTRUCTION:
No relevant information found in the context. Tell the user you don't know the answer.
`;

const qaPromptTemplate = (context, query) => `
Context information is below.
---------------------
${context}
---------------------
Given the context information and not prior knowledge,
answer the question: ${query}

INSTRUCTION:
Please answer based ONLY on the knowledge base above. If the answer is not there, say so.
`;

/**
 * Function to create the full QA API message
 * Intelligently concatenates context and returns the expected array format
 */
function createQAPrompt(message, relevantDocs, chatHistory = []) {
  let userContent = "";

  // If there are no relevant documents
  if (!relevantDocs || relevantDocs.length === 0) {
    userContent = emptyContextTemplate(message);
  } else {
    // Format context with source attribution
    const contextWithSources = relevantDocs
      .map((doc) => {
        return `[Source: ${doc.metadata.source}${doc.metadata.chunk > 0 ? `, Chunk ${doc.metadata.chunk}` : ''}]\n${doc.pageContent}`;
      })
      .join('\n\n---\n\n');

    userContent = qaPromptTemplate(contextWithSources, message);
  }

  // Format chat history for Groq API
  const historyMessages = chatHistory.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content
  }));

  // Return structured array expected by the API
  return [
    { role: "system", content: SYSTEM_INSTRUCTIONS },
    ...historyMessages,
    { role: "user", content: userContent }
  ];
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
 * Answer a question using the RAG pipeline (Standard Non-Streaming)
 * IMPROVEMENT #1, #2, #3, #4: All improvements integrated here
 *
 * Process:
 * 1. Retrieve relevant documents
 * 2. Build robust prompts with guardrails
 * 3. Query Groq LLM
 * 4. Return answer with confidence & sources
 *
 * @param {string} message - User's question
 * @param {Array} chatHistory - Array of previous messages for conversational memory
 * @returns {Promise<Object>} {reply, confidence, sources, metadata}
 */
async function answerWithRag(message, chatHistory = []) {
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
    // STEP 1: Retrieve relevant documents (using .similaritySearchWithScore for MemoryVectorStore)
    const vectorResults = await vectorStore.similaritySearchWithScore(message, RETRIEVAL_CONFIG.k);
    
    // Apply Similarity Score Filtering rule
    // LangChain MemoryVectorStore directly provides cosine similarity score (1 being exactly identical)
    const scoredDocs = vectorResults.map(([doc, score]) => ({
      doc,
      similarity: score
    }));

    // Filter documents strictly by threshold
    const filteredDocs = scoredDocs.filter((item) => {
      const passed = item.similarity >= RETRIEVAL_CONFIG.scoreThreshold;
      if (!passed) {
        logger.debug(`Filtered out chunk from ${item.doc.metadata.source} (Similarity: ${item.similarity.toFixed(2)} < Threshold: ${RETRIEVAL_CONFIG.scoreThreshold})`);
      }
      return passed;
    });

    let relevantDocs = filteredDocs.map((item) => item.doc);
    const retrievalTime = Date.now() - startTime;

    // IMPROVEMENT #3: Detailed logging
    logger.debug(`Retrieved ${vectorResults.length} docs, ${relevantDocs.length} passed threshold for query: "${message.substring(0, 60)}..."`);
    relevantDocs.forEach((doc, i) => {
      const source = doc.metadata.source;
      const chunk = doc.metadata.chunk > 0 ? `, Chunk ${doc.metadata.chunk}` : '';
      logger.debug(`  [${i + 1}] ${source}${chunk}`);
    });
    logger.debug(`Retrieval latency: ${retrievalTime}ms`);

    if (relevantDocs.length === 0) {
      logger.warn(`No relevant documents passed threshold for query: "${message.substring(0, 60)}..."`);
      // We do NOT return early here anymore.
      // We pass the empty context to Groq to force it to respond naturally.
    }

    // STEP 2: Build structured prompts using new string pattern and history
    const apiMessages = createQAPrompt(message, relevantDocs, chatHistory);

    // Log prompt structure for debugging
    logger.debug(`System prompt length: ${apiMessages[0].content.length} chars`);
    logger.debug(`User prompt length: ${apiMessages[apiMessages.length - 1].content.length} chars (includes history)`);

    // STEP 3: Query Groq with improved parameters
    const llmStartTime = Date.now();
    const groqClient = getGroqClient();

    const response = await groqClient.chat.completions.create({
      model: LLM_CONFIG.model,
      messages: apiMessages,
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

/**
 * Answer a question using the RAG pipeline using Streaming (SSE)
 * Includes Conversational Memory and SSE implementation.
 *
 * @param {string} message - User's question
 * @param {Array} chatHistory - Array of previous messages { role, content }
 * @param {Object} res - Express response object for SSE
 */
async function answerWithRagStream(message, chatHistory = [], res) {
  const startTime = Date.now();

  // VALIDATION: Check if RAG is ready
  if (!isRagReady()) {
    throw new Error('RAG is not initialized. Please add documents and restart the server.');
  }

  if (!isGroqReady()) {
    throw new Error('Groq service not available.');
  }

  try {
    // STEP 1: Retrieve relevant documents
    const vectorResults = await vectorStore.similaritySearchWithScore(message, RETRIEVAL_CONFIG.k);
    
    logger.debug(`[answerWithRagStream] Raw vectorResults for query: "${message}"`);
    vectorResults.forEach(([doc, score], i) => {
      logger.debug(`[answerWithRagStream] Match ${i+1}: Source="${doc.metadata.source}" | Score=${score.toFixed(3)}`);
    });

    const scoredDocs = vectorResults.map(([doc, score]) => ({
      doc,
      similarity: score
    }));

    const filteredDocs = scoredDocs.filter((item) => {
      const passed = item.similarity >= RETRIEVAL_CONFIG.scoreThreshold;
      if (!passed) logger.debug(`[answerWithRagStream] ❌ Filtered OUT Source="${item.doc.metadata.source}" (Score ${item.similarity.toFixed(3)} < Threshold ${RETRIEVAL_CONFIG.scoreThreshold})`);
      else logger.debug(`[answerWithRagStream] ✅ Filtered IN Source="${item.doc.metadata.source}" (Score ${item.similarity.toFixed(3)} >= Threshold)`);
      return passed;
    });
    let relevantDocs = filteredDocs.map((item) => item.doc);
    const retrievalTime = Date.now() - startTime;

    // STEP 2: Build structured prompts including conversational memory
    const apiMessages = createQAPrompt(message, relevantDocs, chatHistory);

    // STEP 3: Query Groq LLM with stream=true
    const llmStartTime = Date.now();
    const groqClient = getGroqClient();

    const stream = await groqClient.chat.completions.create({
      model: LLM_CONFIG.model,
      messages: apiMessages,
      temperature: LLM_CONFIG.temperature,
      max_tokens: LLM_CONFIG.max_tokens,
      top_p: LLM_CONFIG.top_p,
      stream: true,
    });

    let fullReply = '';

    // Handle Streaming Output
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullReply += content;
        // Send chunk to client via SSE using a properly formatted JSON payload string
        res.write(`data: ${JSON.stringify({ chunk: content })}\n\n`);
      }
    }

    const llmTime = Date.now() - llmStartTime;
    
    // STEP 4: Calculate confidence with the full aggregated reply
    const confidence = calculateConfidence(relevantDocs, fullReply);
    const totalTime = Date.now() - startTime;

    // Send the final event with metadata and references
    const finalMetadata = {
        retrievalTime,
        llmTime,
        totalTime,
        documentsRetrieved: relevantDocs.length,
        modelUsed: LLM_CONFIG.model,
        confidenceReasoning: confidence.reasoning,
    };

    res.write(`data: ${JSON.stringify({
      done: true,
      confidence: confidence.score,
      sources: confidence.sources,
      metadata: finalMetadata
    })}\n\n`);

    logger.success(`Stream completed: ${fullReply.length} chars in ${totalTime}ms`);

  } catch (error) {
    logger.error(`Error in RAG stream query: ${error.message}`);
    // If stream started, format error as SSE data
    res.write(`data: ${JSON.stringify({ error: error.message || 'Error generating RAG response' })}\n\n`);
    res.end();
  }
}

// ============================================================================
// RAG EVALUATION (LLM-as-a-judge)
// ============================================================================

/**
 * Evaluates a RAG response based on accuracy, faithfulness, and relevance.
 * Acts as a simple "Ragas" equivalent using an LLM-as-a-judge method.
 *
 * @param {string} question - The user query
 * @param {string} answer - The generated AI answer
 * @param {Array} contextDocs - The retrieved documents used as context
 * @returns {Promise<Object>} The evaluation score and reasoning
 */
async function evaluateRagResponse(question, answer, contextDocs) {
  if (!isGroqReady()) return null;

  const contextText = contextDocs.map(doc => doc.pageContent).join('\n---\n');
  
  const evalPrompt = `
You are an impartial evaluator for a Retrieval-Augmented Generation (RAG) system.
Your task is to grade the provided Answer based on the Question and the retrieved Context.

Question: ${question}
Context: ${contextText}
Answer: ${answer}

Evaluate the answer on a scale of 0 to 1 for Faithfulness (is the answer fully supported by the context without hallucinations?).
Return ONLY a valid JSON object in this format:
{
  "faithfulness_score": <number between 0 and 1>,
  "reasoning": "<short explanation>"
}`;

  try {
    const groqClient = getGroqClient();
    const response = await groqClient.chat.completions.create({
      model: LLM_CONFIG.model,
      messages: [{ role: "system", content: evalPrompt }],
      temperature: 0.0,
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (err) {
    logger.error(`EVALUATION ERROR: ${err.message}`);
    return null;
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
      fileExtension: ext,
      category: ext === '.pdf' ? 'document' : 'text_file',
    },
  };

  // Chunk documents mapping
  const docs = await chunkDocuments([rawDoc]);

  if (!docs.length) {
    throw new Error('Could not generate text chunks from document');
  }

  // Insert into ChromaDB store (will be persisted in DB via HTTP)
  await vectorStore.addDocuments(docs);
  logger.success(`Dynamically added ${originalName}: ${docs.length} chunks added`);
  docs.forEach((d, i) => logger.debug(`[addDocumentToVectorStore] Chunk ${i} preview: "${d.pageContent.substring(0, 50).replace(/\n/g, ' ')}..."`));

  return {
    source: originalName,
    chunksAdded: docs.length,
    size: trimmedText.length,
  };
}

/**
 * Performs a search in the vector store and applies thresholding.
 * Extracted for Agent Tool usage.
 * @param {string} query - The search query
 * @returns {Promise<Array>} Array of relevant documents
 */
async function searchKnowledgeBase(query) {
  if (!isRagReady()) {
    throw new Error('RAG is not initialized. Please add documents to backend/documents folder and restart the server.');
  }

  const vectorResults = await vectorStore.similaritySearchWithScore(query, RETRIEVAL_CONFIG.k);
  
  const scoredDocs = vectorResults.map(([doc, score]) => ({
    doc,
    similarity: score
  }));

  const filteredDocs = scoredDocs.filter((item) => item.similarity >= RETRIEVAL_CONFIG.scoreThreshold);
  return filteredDocs.map((item) => item.doc);
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  initRag,
  isRagReady,
  answerWithRag,
  answerWithRagStream,
  evaluateRagResponse,
  addDocumentToVectorStore,
  searchKnowledgeBase,
  // Exposed for testing/debugging:
  loadDocumentsFromFolder,
  chunkDocuments,
  calculateConfidence,
};
