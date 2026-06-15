const { DynamicStructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");

const calculatorTool = new DynamicStructuredTool({
  name: "calculator_tool",
  description: "Performs mathematical calculations. Input should be a valid mathematical expression. Supports +, -, *, /, ^ for power, and % for modulo.",
  schema: z.object({
    expression: z.string().describe("The mathematical expression to evaluate, e.g., '2 + 2' or '(10 / 2) ^ 3'")
  }),
  func: async ({ expression }) => {
    try {
      // 1. Sanitize the input to prevent code injection attacks
      // Only allow numbers, basic operators, parenthesis, and whitespace
      const sanitized = expression.replace(/[^0-9+\-*/().^\s%]/g, '');
      
      // 2. Convert ^ to ** for Javascript power evaluation
      const parsableExpr = sanitized.replace(/\^/g, '**');
      
      // 3. Evaluate safely using Function instead of eval()
      // Note: In a production enterprise app, we would use math.js or similar
      const result = new Function(`return ${parsableExpr}`)();
      
      if (isNaN(result) || !isFinite(result)) {
         throw new Error(`Result of expression "${expression}" is not a valid number (e.g. division by zero).`);
      }
      
      return `Result of ${expression} = ${result}`;
    } catch (error) {
      throw new Error(`Invalid math expression: "${expression}". Details: ${error.message}`);
    }
  }
});

module.exports = { calculatorTool };
