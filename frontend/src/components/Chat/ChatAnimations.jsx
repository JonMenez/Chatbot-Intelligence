export function ChatAnimations() {
  return (
    <style>{`
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes bounce {
        0%, 80%, 100% { transform: scale(1); opacity: 0.5; }
        40% { transform: scale(1.15); opacity: 1; }
      }
      @keyframes pulseSoft {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.55; }
      }
    `}</style>
  );
}

