export function MobileNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-8 pt-4 pb-8 rounded-t-[3rem] border-t border-[rgba(59,73,73,0.15)]"
      style={{
        background: 'rgba(27, 27, 29, 0.72)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        boxShadow: '0 -24px 48px rgba(0, 0, 0, 0.4)',
      }}
    >
      <span className="flex flex-col items-center text-primary relative">
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
          chat_bubble
        </span>
        <span className="font-label text-[10px] uppercase tracking-[0.18em] mt-1 font-semibold">
          Chat
        </span>
        <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary" aria-hidden />
      </span>
      <button
        type="button"
        className="flex flex-col items-center text-on-surface-variant/40 hover:text-primary/90 transition-all active:scale-95 bg-transparent border-0 p-0"
      >
        <span className="material-symbols-outlined">database</span>
        <span className="font-label text-[10px] uppercase tracking-[0.18em] mt-1">Memory</span>
      </button>
      <button
        type="button"
        className="flex flex-col items-center text-on-surface-variant/40 hover:text-primary/90 transition-all active:scale-95 bg-transparent border-0 p-0"
      >
        <span className="material-symbols-outlined">explore</span>
        <span className="font-label text-[10px] uppercase tracking-[0.18em] mt-1">Discover</span>
      </button>
      <button
        type="button"
        className="flex flex-col items-center text-on-surface-variant/40 hover:text-primary/90 transition-all active:scale-95 bg-transparent border-0 p-0"
      >
        <span className="material-symbols-outlined">person</span>
        <span className="font-label text-[10px] uppercase tracking-[0.18em] mt-1">Profile</span>
      </button>
    </nav>
  );
}

