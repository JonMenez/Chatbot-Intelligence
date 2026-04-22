import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { chatApi } from '../api/chatApi.js';

export default function MemoryPage() {
  const { shell } = useOutletContext();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDocs() {
      try {
        const res = await chatApi.get('/documents');
        if (res.data.success) {
          setDocuments(res.data.documents);
        }
      } catch (err) {
        console.error('Failed to load documents:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDocs();
  }, []);

  return (
    <main
      className={`relative flex-1 overflow-y-auto min-h-0 pt-[5.25rem] md:pt-24 pb-44 md:pb-40 ${shell} flex flex-col`}
    >
      <div className="ethereal-ambient ethereal-ambient--a" aria-hidden />
      <div className="ethereal-ambient ethereal-ambient--b" aria-hidden />

      <div className="animate-fade-in w-full max-w-2xl mx-auto mt-6">
        <div className="flex items-center gap-4 mb-8">
          <span className="material-symbols-outlined text-primary/80 text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            database
          </span>
          <div>
            <h1 className="text-2xl font-headline font-bold text-on-surface text-glow">
              Memory Core
            </h1>
            <p className="text-on-surface-variant text-sm">
              Vectorized knowledge base
            </p>
          </div>
        </div>

        <div className="glass-panel ghost-border rounded-2xl overflow-hidden p-6 shadow-xl">
          <h2 className="text-lg font-headline font-semibold text-on-surface mb-4">Indexed Documents</h2>
          
          {loading ? (
            <div className="flex items-center gap-2 text-primary/70 py-4">
              <span className="material-symbols-outlined animate-spin">sync</span>
              <span className="text-sm">Retrieving memory core...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-on-surface-variant/60 py-8 text-center text-sm border border-dashed border-white/10 rounded-xl">
              No documents have been indexed yet.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl bg-surface-variant/20 hover:bg-surface-variant/40 border border-white/5 transition-colors group">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="material-symbols-outlined text-primary/60 group-hover:text-primary transition-colors">
                      description
                    </span>
                    <span className="text-sm font-medium text-on-surface truncate">
                      {doc.filename}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-on-surface-variant/60 shrink-0">
                    <span>{(doc.size / 1024).toFixed(1)} KB</span>
                    <span className="hidden sm:inline">{new Date(doc.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
