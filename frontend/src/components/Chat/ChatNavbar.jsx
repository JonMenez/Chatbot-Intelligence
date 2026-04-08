export function ChatNavbar({ shellClassName }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[rgba(59,73,73,0.15)] bg-[rgba(19,19,21,0.82)] backdrop-blur-xl">
      <div className={`flex justify-between items-center gap-4 py-4 ${shellClassName}`}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="ethereal-orb" aria-hidden />
          <h1
            className="font-headline text-[0.9375rem] sm:text-lg font-bold tracking-tight truncate"
            title="Chatbot AI"
          >
            <span className="text-on-surface">Chatbot</span>
            <span
              className="text-primary"
              style={{ textShadow: '0 0 14px rgba(89, 231, 252, 0.35)' }}
            >
              {' '}
              AI
            </span>
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-5 text-on-surface-variant/45">
          <button
            type="button"
            className="hover:text-primary transition-colors duration-200 active:scale-95"
            aria-label="Settings"
          >
            <span className="material-symbols-outlined text-[22px]">settings</span>
          </button>
          <button
            type="button"
            className="hover:text-primary transition-colors duration-200 active:scale-95"
            aria-label="Account"
          >
            <span className="material-symbols-outlined text-[22px]">account_circle</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

