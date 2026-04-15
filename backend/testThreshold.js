require('dotenv').config();
const { initRag, answerWithRag } = require('./src/services/ragService');

async function runTest() {
  console.log("=========================================");
  console.log("🧪 INICIANDO TEST DEL UMBRAL RAG (0.75) 🧪");
  console.log("=========================================");
  
  // 1. Inicializar RAG (escaneará la carpeta backend/documents y se conectará a Chroma)
  await initRag();
  
  console.log("\n-----------------------------------------");
  console.log("📌 PREGUNTA 1: Una pregunta DENTRO del contexto (Pingüinos)");
  console.log("-----------------------------------------");
  try {
    const res1 = await answerWithRag("¿Dónde viven los pingüinos emperador y a qué temperaturas se enfrentan?");
    console.log("\n🤖 RESPUESTA DE GROQ:");
    console.log(res1.reply);
    console.log("\n📊 MÉTRICAS:");
    console.log(`Confianza: ${res1.confidence.toFixed(2)}`);
    console.log(`Documentos superaron el umbral (0.75): ${res1.metadata.documentsRetrieved}`);
  } catch (error) {
    console.error("Error en Pregunta 1:", error.message);
  }

  console.log("\n-----------------------------------------");
  console.log("📌 PREGUNTA 2: Una pregunta FUERA del contexto (React Router)");
  console.log("-----------------------------------------");
  try {
    // Al no haber documentos sobre React Router, Chroma podría retornar documentos sobre pingüinos
    // pero con un score bajo (ej. 0.3 o 0.4). Nuestro filtro de 0.75 debería bloquearlos
    // y forzar la regla anti-alucinación!
    const res2 = await answerWithRag("¿Cómo instalo React Router en un proyecto Vite?");
    console.log("\n🤖 RESPUESTA DE GROQ:");
    console.log(res2.reply); // Debería decir: "No relevant information found..."
    console.log("\n📊 MÉTRICAS:");
    console.log(`Confianza: ${res2.confidence.toFixed(2)}`);
    console.log(`Documentos superaron el umbral (0.75): ${res2.metadata.documentsRetrieved}`);
  } catch (error) {
    console.error("Error en Pregunta 2:", error.message);
  }
}

runTest().then(() => {
  console.log("\n✅ Test finalizado.");
  process.exit(0);
});
