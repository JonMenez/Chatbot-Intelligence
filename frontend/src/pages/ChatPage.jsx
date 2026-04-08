import { useChat } from '../hooks/useChat.js';
import { ChatComposer } from '../components/Chat/ChatComposer.jsx';
import { ChatHeader } from '../components/Chat/ChatHeader.jsx';
import { ChatMessageList } from '../components/Chat/ChatMessageList.jsx';
import { ChatNavbar } from '../components/Chat/ChatNavbar.jsx';
import { MobileNav } from '../components/Chat/MobileNav.jsx';

export default function ChatPage() {
  const { message, setMessage, chat, loading, uploading, uploadedFiles, sendMessage, uploadDocument, messagesEndRef } = useChat();

  const shell = 'relative z-[1] max-w-4xl mx-auto w-full px-6';

  return (
    <div className="relative min-h-screen flex flex-col bg-background text-on-surface font-body">
      <div className="ethereal-stage" aria-hidden />

      <ChatNavbar shellClassName={shell} />

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

      <MobileNav />
    </div>
  );
}

