export function ChatHeader({ mode, setMode }) {
  return (
    <header className="relative mb-10 md:mb-12 text-center flex flex-col items-center">
      <h2
        className="font-headline text-3xl sm:text-[2.125rem] md:text-[2.35rem] font-bold text-white tracking-tight mb-3 text-glow"
      >
        Ethereal Presence
      </h2>
      <p className="font-label text-[10px] sm:text-[11px] text-on-surface-variant/60 uppercase tracking-[0.2em] font-semibold mb-6">
        Advanced Neural Processing Active
      </p>

      {setMode && (
        <div className="flex bg-surface-variant/30 rounded-full p-1 border border-white/5 backdrop-blur-md inline-flex mx-auto">
          <button
            onClick={() => setMode('rag')}
            className={`px-4 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.1em] transition-all duration-300 ${
              mode === 'rag' 
                ? 'bg-primary text-surface shadow-[0_0_15px_rgba(89,231,252,0.4)]' 
                : 'text-on-surface-variant/60 hover:text-on-surface'
            }`}
          >
            RAG System
          </button>
          <button
            onClick={() => setMode('agent')}
            className={`px-4 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.1em] transition-all duration-300 ${
              mode === 'agent' 
                ? 'bg-primary text-surface shadow-[0_0_15px_rgba(89,231,252,0.4)]' 
                : 'text-on-surface-variant/60 hover:text-on-surface'
            }`}
          >
            Autonomous Agent
          </button>
        </div>
      )}
    </header>
  );
}

