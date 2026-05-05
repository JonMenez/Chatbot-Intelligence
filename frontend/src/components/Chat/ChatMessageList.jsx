import { Markdown } from '../Markdown.jsx';

function MessageBubbleAi({ content, confidence, sources }) {
  return (
    <div className="flex flex-col gap-2 items-start max-w-[min(85%,36rem)]">
      <div className="flex items-center gap-2 mb-1 px-1">
        <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 primary-glow" />
        <span className="font-label text-[10px] uppercase tracking-[0.14em] text-primary/85 font-semibold">
          Intelligence
        </span>
      </div>
      <div className="message-ai px-5 py-3.5 rounded-[2rem] text-[15px] leading-[1.6] text-on-surface ghost-border glass-panel shadow-[inset_0_2px_10px_rgba(255,255,255,0.03)]">
        <Markdown text={content} />
      </div>

      {(confidence !== undefined || (sources && sources.length > 0)) && (
        <div className="flex flex-col gap-2 px-1 mt-3 w-full">
          {confidence !== undefined && (
            <div className="flex items-center gap-2 self-start">
              <div
                className={`w-1 h-1 rounded-full ${confidence >= 0.85
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                  : confidence >= 0.70
                    ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                    : 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]'
                  }`}
              />
              <span className="font-label text-[10px] uppercase tracking-[0.14em] text-on-surface-variant/50 font-semibold">
                {Math.round(confidence * 100)}% confidence
              </span>
            </div>
          )}
          {sources && sources.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {sources.map((src, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 transition-colors cursor-pointer group"
                >
                  <span className="material-symbols-outlined text-[10px] text-on-surface-variant/40 group-hover:text-primary/70">
                    description
                  </span>
                  <span className="font-label text-[10px] uppercase tracking-[0.14em] text-on-surface-variant/50 group-hover:text-on-surface font-semibold">
                    {src}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MessageBubbleUser({ content }) {
  return (
    <div className="flex flex-col gap-2 items-end ml-auto max-w-[min(85%,36rem)]">
      <div className="flex items-center gap-2 mb-1 px-1">
        <span className="font-label text-[10px] uppercase tracking-[0.14em] text-on-surface-variant/50 font-semibold">
          You
        </span>
      </div>
      <div className="message-user px-5 py-3.5 rounded-[2rem] text-[15px] leading-[1.6] text-on-surface ghost-border glass-panel opacity-90">
        {content}
      </div>
    </div>
  );
}

function ChatLoadingBubble({ statusMessage = "Ethereal is thinking..." }) {
  return (
    <div className="flex flex-col gap-2 items-start max-w-[min(85%,36rem)] animate-fade-in">
      <div className="flex items-center gap-2 mb-1 px-1">
        <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse-glow" />
        <span className="font-label text-[10px] uppercase tracking-[0.14em] text-primary/85 font-semibold">
          Intelligence
        </span>
      </div>
      <div className="message-ai px-5 py-3.5 rounded-[2rem] ghost-border glass-panel shadow-[inset_0_2px_10px_rgba(255,255,255,0.03)] flex items-center gap-4">
        <div className="flex gap-2">
          {[0, 200, 400].map((delay) => (
            <div
              key={delay}
              className="w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
        {statusMessage && (
          <span className="text-[14px] font-medium text-on-surface-variant/80 tracking-wide font-body">
            {statusMessage}
          </span>
        )}
      </div>
    </div>
  );
}

export function ChatMessageList({ chat, loading, messagesEndRef }) {
  const lastMsg = chat[chat.length - 1];
  const isWaitingForFirstChunk = loading && lastMsg?.type === 'ai' && !lastMsg?.content;

  return (
    <div className="relative space-y-8">
      {chat.map((msg, idx) => {
        // Show loading bubble with dynamic text for streaming messages that haven't received actual content yet
        if (msg.type === 'ai' && msg.isStreaming && !msg.content) {
          return <ChatLoadingBubble key={`loading-${idx}`} statusMessage={msg.agentStatus} />;
        }

        return (
          <div
            key={`${msg.type}-${idx}-${String(msg.content).slice(0, 24)}`}
            className="animate-fade-in"
            style={{ animationDelay: `${idx * 140}ms`, animationFillMode: 'both' }}
          >
            {msg.type === 'ai' ? (
              <MessageBubbleAi content={msg.content} confidence={msg.confidence} sources={msg.sources} />
            ) : (
              <MessageBubbleUser content={msg.content} />
            )}
          </div>
        );
      })}

      <div ref={messagesEndRef} />
    </div>
  );
}
