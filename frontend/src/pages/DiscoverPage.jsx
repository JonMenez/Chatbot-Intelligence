import { useOutletContext } from 'react-router-dom';

export default function DiscoverPage() {
  const { shell } = useOutletContext();

  return (
    <main
      className={`relative flex-1 overflow-y-auto min-h-0 pt-[5.25rem] md:pt-24 pb-44 md:pb-40 ${shell} flex flex-col`}
    >
      <div className="ethereal-ambient ethereal-ambient--a" aria-hidden />
      <div className="ethereal-ambient ethereal-ambient--b" aria-hidden />

      <div className="flex flex-col items-center justify-center flex-1 text-center animate-fade-in mt-20">
        <span className="material-symbols-outlined text-primary/80 text-6xl mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>
          explore
        </span>
        <h1 className="text-3xl font-headline font-bold text-on-surface mb-2 text-glow">
          Discover
        </h1>
        <p className="text-on-surface-variant max-w-md mx-auto text-[15px] leading-relaxed">
          Explore new capabilities and advanced neural models in future updates.
        </p>
      </div>
    </main>
  );
}
