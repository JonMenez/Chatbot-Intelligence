import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const chatApi = axios.create({
  baseURL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

export async function postChatMessage(message) {
  // Use /rag instead of /chat to connect to the improved RAG endpoint that supports uploaded docs!
  const res = await chatApi.post('/rag', { message });
  return res.data;
}

export async function postDocumentUpload(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await chatApi.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

