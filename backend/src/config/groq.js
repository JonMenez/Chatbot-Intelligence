const { OpenAI } = require('openai');

// Groq backend configuration using OpenAI-compatible SDK interface
let groqClient = null;
let groqReady = false;

try {
  if (process.env.GROQ_API_KEY) {
    groqClient = new OpenAI({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY,
      timeout: 20000,
      maxRetries: 2,
    });
    groqReady = true;
    console.log('✅ Groq client initialized successfully');
  } else {
    console.warn('⚠️ GROQ_API_KEY not found in .env');
  }
} catch (err) {
  console.error('❌ Error initializing Groq client:', err.message);
  groqReady = false;
}

function getGroqClient() {
  return groqClient;
}

function isGroqReady() {
  return groqReady;
}

module.exports = {
  getGroqClient,
  isGroqReady,
};

