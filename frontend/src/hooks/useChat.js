import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { postChatMessage, postDocumentUpload } from '../api/chatApi.js';

const DEFAULT_INITIAL_CHAT = [
  {
    type: 'ai',
    content:
      'Hello. I am your personalized intelligence interface. What shall we explore today on this second day of development?',
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
      setChat((prev) => [...prev, { type: 'user', content: userMsg }]);
      setLoading(true);

      try {
        const data = await postChatMessage(userMsg);
        if (data?.reply) {
          setChat((prev) => [
            ...prev,
            {
              type: 'ai',
              content: data.reply,
              confidence: data.confidence,
              sources: data.sources,
            },
          ]);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        setChat((prev) => [...prev, { type: 'ai', content: getFriendlyError(err) }]);
      } finally {
        setLoading(false);
      }
    },
    [message]
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

