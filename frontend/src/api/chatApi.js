import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const chatApi = axios.create({
  baseURL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

export async function postChatMessage(message, chatHistory = []) {
  // Use /rag instead of /chat to connect to the improved RAG endpoint that supports uploaded docs!
  const res = await chatApi.post('/rag', { message, chatHistory, stream: false });
  return res.data;
}

export async function postChatMessageStream(message, chatHistory = [], mode = 'agent', onData, threadId = null) {
  const isAgent = mode === 'agent';
  const url = isAgent ? `${baseURL}/agent/chat/stream` : `${baseURL}/rag`;
  
  const body = isAgent 
    ? JSON.stringify({ message, chatHistory, thread_id: threadId }) 
    : JSON.stringify({ message, chatHistory, stream: true });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });

  if (!response.ok) {
    let errorMessage = 'Network error';
    try {
      const errData = await response.json();
      errorMessage = errData.error || errorMessage;
    } catch {
      errorMessage = response.statusText;
    }
    throw new Error(errorMessage);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffered = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffered += decoder.decode(value, { stream: true });
    const lines = buffered.split('\n\n');
    buffered = lines.pop();

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataStr = line.slice(6);
        try {
          const data = JSON.parse(dataStr);
          onData(data);
        } catch (e) {
          console.error('SSE JSON parse error', e);
        }
      }
    }
  }
}

export async function postDocumentUpload(files) {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });
  
  const res = await chatApi.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

