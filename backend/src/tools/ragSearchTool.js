const { DynamicStructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");
const { searchKnowledgeBase } = require("../services/ragService");

/**
 * RAG Search Tool
 * This tool allows the LangChain Agent to query the existing ChromaDB 
 * knowledge base to find relevant context about the user's documents.
 */
const ragSearchTool = new DynamicStructuredTool({
  name: "search_knowledge_base",
  description: 
    "Useful for finding specific information, facts, or details within the documents " +
    "and PDFs that the user has uploaded to the system. Always use this tool before " +
    "answering questions about the user's data.",
  schema: z.object({
    query: z.string().describe("The search query to look up in the vector store"),
  }),
  func: async ({ query }) => {
    try {
      console.log(`[ragSearchTool] 🔍 Agent is searching knowledge base for: "${query}"`);
      const docs = await searchKnowledgeBase(query);
      
      if (!docs || docs.length === 0) {
        return "No relevant information found in the knowledge base for this query.";
      }

      // Format the retrieved documents into a single string for the LLM context
      const formattedContext = docs
        .map((doc, index) => {
          const source = doc.metadata.source || "Unknown Source";
          const chunkInfo = doc.metadata.chunk > 0 ? ` (Chunk ${doc.metadata.chunk})` : "";
          return `[Source ${index + 1}: ${source}${chunkInfo}]\n${doc.pageContent}`;
        })
        .join("\n\n---\n\n");

      return `Found the following relevant context:\n\n${formattedContext}`;
    } catch (error) {
      console.error(`[ragSearchTool] ❌ Error: ${error.message}`);
      return `Error retrieving information from the knowledge base: ${error.message}`;
    }
  },
});

module.exports = { ragSearchTool };
