const { DynamicTool } = require("@langchain/core/tools");
const { rawSimilaritySearch } = require("../services/ragService");

/**
 * RAG Search Tool
 * Allows the agent to query the vector database directly.
 */
const ragSearchTool = new DynamicTool({
  name: "search_knowledge_base",
  description:
    "Utiliza esta herramienta cuando necesites buscar información, hechos o detalles específicos dentro de la base de conocimiento de documentos subidos por el usuario. La entrada debe ser una pregunta clara o términos de búsqueda precisos.",
  func: async (query) => {
    console.log(`[Tool] 🔍 search_knowledge_base called with query: "${query}"`);
    const results = await rawSimilaritySearch(query);
    return results;
  },
});

module.exports = ragSearchTool;
