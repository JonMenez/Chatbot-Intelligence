import { Markdown } from '../Markdown.jsx';

function MessageBubbleAi({ content, confidence, sources }) {
  return (
    <div className="flex flex-col gap-2 items-start max-w-[min(85%,36rem)]">
      <div className="flex items-center gap-2 mb-1 px-1">
        <div
          className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"
          style={{ boxShadow: '0 0 12px rgba(89, 231, 252, 0.55)' }}
        />
        <span className="font-label text-[10px] uppercase tracking-[0.14em] text-primary/85 font-semibold">
          Intelligence
        </span>
      </div>
      <div
        className="message-ai px-5 py-3.5 rounded-2xl text-[15px] leading-[1.6] text-on-surface border border-[rgba(59,73,73,0.12)]"
        style={{
          background: 'var(--ethereal-surface-card)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        <Markdown text={content} />
      </div>

      {(confidence !== undefined || (sources && sources.length > 0)) && (
        <div className="flex flex-col gap-3 px-2 mt-2 w-full">
          {confidence !== undefined && (
            <div className="flex items-center gap-2 px-2 py-1 rounded-full  bg-[rgba(20,20,22,0.4)] backdrop-blur-md self-start">
              <div
                className={`w-1.5 h-1.5 rounded-full ${confidence >= 0.85
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                  : confidence >= 0.70
                    ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                    : 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]'
                  }`}
              />
              <span className="text-[10px] text-on-surface-variant font-medium tracking-wide">
                {Math.round(confidence * 100)}% confidence
              </span>
            </div>
          )}
          {sources && sources.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap gap-2">
                {sources.map((src, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-xl border border-white/5 bg-[rgba(25,25,27,0.6)] backdrop-blur-md hover:bg-[rgba(35,35,37,0.8)] hover:border-white/10 transition-all duration-300 cursor-pointer group"
                  >
                    <svg className="w-3.5 h-3.5 text-on-surface-variant/50 group-hover:text-primary/70 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[8px] text-on-surface-variant group-hover:text-on-surface font-medium tracking-wide">
                      {src}
                    </span>
                  </div>
                ))}
              </div>
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
      <div
        className="message-user px-5 py-3.5 rounded-2xl text-[15px] leading-[1.6] text-on-surface border border-[rgba(59,73,73,0.1)]"
        style={{
          background: 'rgba(42, 42, 44, 0.72)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {content}
      </div>
    </div>
  );
}

function ChatLoadingBubble() {
  return (
    <div className="flex flex-col gap-2 items-start max-w-[min(85%,36rem)]">
      <div className="flex items-center gap-2 mb-1 px-1">
        <div
          className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"
          style={{
            boxShadow: '0 0 12px rgba(89, 231, 252, 0.55)',
            animation: 'pulseSoft 1.4s ease-in-out infinite',
          }}
        />
        <span className="font-label text-[10px] uppercase tracking-[0.14em] text-primary/85 font-semibold">
          Intelligence
        </span>
      </div>
      <div
        className="message-ai px-5 py-3.5 rounded-2xl border border-[rgba(59,73,73,0.12)]"
        style={{
          background: 'var(--ethereal-surface-card)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        <div className="flex gap-2">
          {[0, 200, 400].map((delay) => (
            <div
              key={delay}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--ethereal-primary)',
                animation: 'bounce 1.4s infinite',
                animationDelay: `${delay}ms`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ChatMessageList({ chat, loading, messagesEndRef }) {
  return (
    <div className="relative space-y-8">
      {chat.map((msg, idx) => (
        <div
          key={`${msg.type}-${idx}-${String(msg.content).slice(0, 24)}`}
          style={{
            animation: 'fadeIn 0.5s ease-in-out',
            animationDelay: `${idx * 140}ms`,
            animationFillMode: 'both',
          }}
        >
          {msg.type === 'ai' ? (
            <MessageBubbleAi content={msg.content} confidence={msg.confidence} sources={msg.sources} />
          ) : (
            <MessageBubbleUser content={msg.content} />
          )}
        </div>
      ))}

      {loading && <ChatLoadingBubble />}

      <div ref={messagesEndRef} />
    </div>
  );
}

