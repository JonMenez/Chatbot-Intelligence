import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { postChatMessageStream, postDocumentUpload } from '../api/chatApi.js';

const DEFAULT_INITIAL_CHAT = [
  {
    type: 'ai',
    content:
      'Hello. I am your personalized intelligence interface. What shall we explore today?',
  },
];

function getFriendlyError(err) {
  if (err?.message === 'Network Error' || err?.code === 'ECONNABORTED') {
    return 'No connection. Verify that the server is running on port 3001.';
  }
  if (err?.response?.status === 401) {
    return 'Authentication error. Check your Groq API Key.';
  }
  if (err?.response?.data?.error) {
    return err.response.data.error;
  }
  return 'Error processing your message. Please try again.';
}

export function useChat({ initialChat } = {}) {
  const seededChat = useMemo(
    () => (Array.isArray(initialChat) && initialChat.length ? initialChat : DEFAULT_INITIAL_CHAT),
    [initialChat]
  );

  const [message, setMessage] = useState('');
  const [chat, setChat] = useState(seededChat);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [mode, setMode] = useState('agent');
  const [threadId] = useState(() => 'thread_' + Math.random().toString(36).substring(2, 10));
  const messagesEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chat, scrollToBottom]);

  const sendMessage = useCallback(
    async (e) => {
      e?.preventDefault?.();
      if (!message.trim()) return;

      const userMsg = message;
      setMessage('');

      // We will prepare the chat history for memory (excluding the new message)
      // Only send valid message content, keeping it clean
      const chatHistory = chat.map(c => ({
        role: c.type === 'ai' ? 'assistant' : 'user',
        content: c.content
      }));

      // Immediately add User message to UI
      setChat((prev) => [...prev, { type: 'user', content: userMsg }]);

      // Placeholder for AI streaming response with initial agent status
      const initialStatus = mode === 'agent' ? 'Initializing neural link...' : 'Querying RAG system...';
      setChat((prev) => [...prev, { type: 'ai', content: '', isStreaming: true, agentStatus: initialStatus }]);
      setLoading(true);

      try {
        await postChatMessageStream(userMsg, chatHistory, mode, (data) => {
          if (data.error) {
            throw new Error(data.error);
          }

          if (data.type === 'thinking') {
            setChat((prev) => {
              const newChat = [...prev];
              newChat[newChat.length - 1] = { ...newChat[newChat.length - 1], agentStatus: 'Analyzing context...' };
              return newChat;
            });
          }

          if (data.type === 'tool_call' && data.tool) {
            setChat((prev) => {
              const newChat = [...prev];
              const lastMsgIndex = newChat.length - 1;
              const lastMsg = newChat[lastMsgIndex];
              
              const toolNameMap = {
                'ragSearchTool': 'knowledge base',
                'registryTool': 'registry',
                'calculatorTool': 'calculator'
              };
              const friendlyName = toolNameMap[data.tool] || data.tool;
              const newStatus = `🛠️ Using tool: ${friendlyName}...`;
              
              const prevTools = lastMsg.usedTools || [];
              const usedTools = prevTools.includes(data.tool) ? prevTools : [...prevTools, data.tool];

              newChat[lastMsgIndex] = { ...lastMsg, agentStatus: newStatus, usedTools };
              return newChat;
            });
          }

          // Compatibility: old RAG only sends data.chunk, Agent sends data.type === 'stream'
          if (data.chunk) {
            setChat((prev) => {
              const newChat = [...prev];
              const lastMsgIndex = newChat.length - 1;
              const lastMsg = newChat[lastMsgIndex];
              if (lastMsg && lastMsg.type === 'ai') {
                newChat[lastMsgIndex] = { ...lastMsg, content: lastMsg.content + data.chunk, agentStatus: null };
              }
              return newChat;
            });
          }

          // Compatibility: RAG sends data.done, Agent sends data.type === 'final_response' and data.done
          if (data.done) {
            setChat((prev) => {
              const newChat = [...prev];
              const lastMsgIndex = newChat.length - 1;
              const lastMsg = newChat[lastMsgIndex];
              if (lastMsg && lastMsg.type === 'ai') {
                newChat[lastMsgIndex] = {
                  ...lastMsg,
                  isStreaming: false,
                  agentStatus: null,
                  confidence: data.confidence, // RAG specific
                  sources: data.sources, // RAG specific
                  metadata: data.metadata, // Agent specific
                };
              }
              return newChat;
            });
          }
        }, threadId);
      } catch (err) {
        setChat((prev) => {
          const newChat = [...prev];
          const lastMsgIndex = newChat.length - 1;
          const lastMsg = newChat[lastMsgIndex];
          if (lastMsg && lastMsg.type === 'ai') {
            newChat[lastMsgIndex] = {
              ...lastMsg,
              isStreaming: false,
              content: 'Error: ' + getFriendlyError(err)
            };
          }
          return newChat;
        });
      } finally {
        setLoading(false);
      }
    },
    [message, chat, mode, threadId] // Note: chat is now a dependency because of chatHistory
  );

  const uploadDocument = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const data = await postDocumentUpload(files);
      if (data?.success && data?.files) {
        const filenames = data.files.map(f => f.filename);
        setUploadedFiles((prev) => [...prev, ...filenames]);

        const messageText = filenames.length > 1
          ? `I have successfully analyzed the following documents: **${filenames.join(', ')}**. You can now ask me questions about them.`
          : `I have successfully analyzed the document **${filenames[0]}**. You can now ask me questions about it.`;

        setChat((prev) => [...prev, { type: 'ai', content: messageText }]);
      }
    } catch (err) {
      setChat((prev) => [...prev, { type: 'ai', content: `Error uploading document(s): ${err.response?.data?.error || err.message}` }]);
    } finally {
      setUploading(false);
    }
  }, []);

  return {
    mode,
    setMode,
    message,
    setMessage,
    chat,
    loading,
    uploading,
    uploadedFiles,
    sendMessage,
    uploadDocument,
    messagesEndRef,
  };
}

