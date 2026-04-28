const { DynamicTool } = require("@langchain/core/tools");

/**
 * Calculator Tool
 * A simple mathematical tool to demonstrate multi-tool capability without RAG.
 */
const calculatorTool = new DynamicTool({
  name: "calculator",
  description:
    "Utiliza esta herramienta para realizar operaciones matemáticas y cálculos numéricos. La entrada debe ser una expresión matemática válida (ej. '2 + 2', '15 * 4', '100 / 3').",
  func: async (expression) => {
    console.log(`[Tool] 🧮 calculator called with expression: "${expression}"`);
    try {
      // Very basic safe eval for math expressions
      // In production, use a proper math parser like mathjs to prevent injection
      const sanitized = expression.replace(/[^0-9+\-*/(). ]/g, '');
      const result = eval(sanitized);
      return result.toString();
    } catch (error) {
      return `Error al calcular: la expresión matemática no es válida.`;
    }
  },
});

module.exports = calculatorTool;
