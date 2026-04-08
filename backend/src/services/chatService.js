const { getGroqClient, isGroqReady } = require('../config/groq');

async function createChatCompletion(message) {
  if (!isGroqReady() || !getGroqClient()) {
    const err = new Error('Groq service not available. Check your GROQ_API_KEY in .env');
    err.statusCode = 503;
    throw err;
  }

  const groqClient = getGroqClient();
  const prompt = `You are a Senior AI Agent Developer helping a MERN teammate with 4 years of experience transition into AI Agents.

Think step by step as if you were explaining it to a friend on the team:

## Examples of how to respond:
User: "What is the System Message?"
Assistant: "It's like the .env file or global Express middleware. It defines the agent's behavior and safety rules before it starts working."

User: "What is Few-shot?"
Assistant: "It's like giving a junior developer code examples before they do the task. You show 2-3 examples, and then they understand the pattern."

## Current task:
User question: "${message}"

Think step by step and respond clearly, practically, and using MERN analogies.`;

  const response = await groqClient.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 1000,
  });

  const reply = response.choices?.[0]?.message?.content || response.choices?.[0]?.text || '';
  return reply;
}

module.exports = {
  createChatCompletion,
};

