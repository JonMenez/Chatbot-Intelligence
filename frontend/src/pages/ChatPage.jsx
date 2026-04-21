import { useOutletContext } from 'react-router-dom';
import { useChat } from '../hooks/useChat.js';
import { ChatComposer } from '../components/Chat/ChatComposer.jsx';
import { ChatHeader } from '../components/Chat/ChatHeader.jsx';
import { ChatMessageList } from '../components/Chat/ChatMessageList.jsx';

export default function ChatPage() {
  const { shell } = useOutletContext();
  const { message, setMessage, chat, loading, uploading, uploadedFiles, sendMessage, uploadDocument, messagesEndRef } = useChat();

  return (
    <>
      <main
        className={`relative flex-1 overflow-y-auto min-h-0 pt-[5.25rem] md:pt-24 pb-44 md:pb-40 ${shell} flex flex-col`}
      >
        <div className="ethereal-ambient ethereal-ambient--a" aria-hidden />
        <div className="ethereal-ambient ethereal-ambient--b" aria-hidden />

        <ChatHeader />

        <ChatMessageList chat={chat} loading={loading} messagesEndRef={messagesEndRef} />
      </main>

      <ChatComposer 
        message={message} 
        setMessage={setMessage} 
        loading={loading} 
        uploading={uploading}
        uploadedFiles={uploadedFiles}
        onSubmit={sendMessage} 
        onUpload={uploadDocument}
      />
    </>
  );
}

