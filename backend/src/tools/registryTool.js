const { DynamicTool } = require("@langchain/core/tools");
const registryService = require("../services/registryService");

/**
 * Document Registry Tool
 * Allows the agent to check what documents have been uploaded.
 */
const registryTool = new DynamicTool({
  name: "get_document_registry",
  description:
    "Utiliza esta herramienta para saber qué documentos o PDFs están actualmente subidos y disponibles en el sistema. No requiere argumentos. Devuelve la lista de nombres de archivos disponibles.",
  func: async () => {
    console.log(`[Tool] 📁 get_document_registry called`);
    try {
      const registry = await registryService.getRegistry();
      const files = Object.keys(registry);
      
      if (files.length === 0) {
        return "No hay documentos actualmente en el sistema.";
      }
      
      const fileList = files.map(id => `- ${registry[id].originalName} (ID: ${id})`).join('\n');
      return `Los siguientes documentos están en el sistema:\n${fileList}`;
    } catch (error) {
      return `Error al leer el registro de documentos: ${error.message}`;
    }
  },
});

module.exports = registryTool;
