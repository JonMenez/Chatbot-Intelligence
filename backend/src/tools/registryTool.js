const { DynamicStructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");
const fs = require("fs").promises;
const path = require("path");

const registryTool = new DynamicStructuredTool({
  name: "registry_tool",
  description: "Lists all available documents in the system registry/knowledge base. Use this to see what files exist and get their sizes and upload dates.",
  schema: z.object({
    // We keep schema empty/optional since it just reads the main documents folder
    query: z.string().optional().describe("Optional query, mostly unused.")
  }).catchall(z.any()),
  func: async () => {
    try {
      const documentsDir = path.join(__dirname, '../../documents');
      
      // Ensure the directory exists
      try {
        await fs.access(documentsDir);
      } catch {
        return "The documents directory does not exist or is empty.";
      }

      const files = await fs.readdir(documentsDir);
      
      if (files.length === 0) {
        return "No documents found in the registry.";
      }
      
      const fileDetails = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(documentsDir, file);
          const stats = await fs.stat(filePath);
          return {
            filename: file,
            sizeBytes: stats.size,
            lastModified: stats.mtime.toISOString(),
            isDirectory: stats.isDirectory()
          };
        })
      );
      
      return JSON.stringify(fileDetails, null, 2);
    } catch (error) {
      return `Error accessing registry: ${error.message}`;
    }
  }
});

module.exports = { registryTool };
