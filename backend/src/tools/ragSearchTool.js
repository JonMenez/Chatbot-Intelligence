const { DynamicTool } = require('langchain/tools');
const { searchKnowledgeBase } = require('../services/ragService');

/**
 * ragSearchTool
 * A LangChain Tool that wraps our ChromaDB vector search functionality.
 * This allows the Agent to decide WHEN to search the document knowledge base.
 */
const ragSearchTool = new DynamicTool({
  name: 'SearchKnowledgeBaseTool',
  description: 
    'Use this tool EXCLUSIVELY when you need to find information, facts, details, or answer questions regarding the content of the documents and PDFs uploaded by the user to the system. ' +
    'Input must be a clear question or specific search terms.',
  func: async (input) => {
    try {
      console.log(`[ragSearchTool] Agent is searching for: "${input}"`);
      
      const docs = await searchKnowledgeBase(input);
      
      if (!docs || docs.length === 0) {
        return 'No relevant information found in the uploaded documents for this query.';
      }

      // Format the output so the LLM can easily read the sources and chunks
      let result = 'Information found in the knowledge base:\n\n';
      docs.forEach((doc, index) => {
        result += `--- Document ${index + 1} ---\n`;
        result += `Source: ${doc.metadata?.source || 'Unknown'}\n`;
        result += `Content: ${doc.pageContent}\n\n`;
      });

      return result;
    } catch (error) {
      console.error(`[ragSearchTool] Error: ${error.message}`);
      return `An error occurred while searching the knowledge base: ${error.message}`;
    }
  },
});

module.exports = ragSearchTool;
