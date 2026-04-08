import { useRef } from 'react';

export function ChatComposer({ message, setMessage, loading, uploading, uploadedFiles, onSubmit, onUpload }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      e.target.value = null; // reset
    }
  };

  return (
    <div className="fixed bottom-12 left-0 right-0 z-40 px-6 pointer-events-none">
      <div className="max-w-4xl mx-auto w-full pointer-events-auto flex flex-col gap-3">
        
        {/* Archivos subidos en memoria */}
        {uploadedFiles && uploadedFiles.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-2 animate-fade-in">
            {uploadedFiles.map((filename, i) => (
              <div
                key={i}
                className="px-3 py-1.5 rounded-full border border-white/5 bg-[rgba(20,20,22,0.6)] backdrop-blur-md text-[10px] text-on-surface-variant font-medium tracking-wide hover:bg-white/5 hover:text-on-surface transition-all duration-300 font-mono shadow-sm cursor-default"
                title="Document loaded in Vector Store"
              >
                📄 {filename}
              </div>
            ))}
          </div>
        )}

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".pdf,.txt" 
          className="hidden" 
        />

        <form
          onSubmit={onSubmit}
          className="flex items-center gap-1.5 sm:gap-2 pl-5 pr-1.5 py-1.5 rounded-full border border-[rgba(59,73,73,0.15)] bg-[rgba(27,27,29,0.72)] backdrop-blur-[40px] shadow-[0_0_0_1px_rgba(89,231,252,0.12),0_16px_40px_rgba(0,0,0,0.45)]"
        >
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask me anything..."
            disabled={loading || uploading}
            className="flex-1 min-w-0 bg-transparent border-0 focus:ring-0 text-[15px] px-1 py-2.5 placeholder:text-on-surface-variant/45 text-on-surface font-body outline-none focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || uploading}
            className={`w-10 h-10 flex items-center justify-center shrink-0 rounded-full transition-all duration-300 hover:bg-white/5 ${
              uploading 
                ? 'text-primary animate-pulse' 
                : 'text-on-surface-variant/45 hover:text-primary'
            }`}
            aria-label="Upload document"
          >
            <span className={`material-symbols-outlined text-[20px] ${uploading ? 'animate-spin' : ''}`}>
              {uploading ? 'sync' : 'attach_file'}
            </span>
          </button>
          <button
            type="submit"
            disabled={loading || uploading || !message.trim()}
            className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-on-primary font-headline text-lg font-extrabold leading-none hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-45 disabled:hover:scale-100 bg-[linear-gradient(135deg,var(--ethereal-primary),var(--ethereal-primary-container))] shadow-[0_0_16px_rgba(89,231,252,0.35),0_4px_12px_rgba(0,0,0,0.35)]"
            aria-label="Send"
          >
            ›
          </button>
        </form>
        <p className="text-center font-label text-[10px] text-on-surface-variant/40 tracking-[0.28em] uppercase">
          Quantum encryption active • Ethereal v2.0
        </p>
      </div>
    </div>
  );
}

