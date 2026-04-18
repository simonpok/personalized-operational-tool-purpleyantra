import React, { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('theme')) {
      return localStorage.getItem('theme') as 'light' | 'dark';
    }
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const seedData = async () => {
    if (!window.confirm("WARNING: This will wipe all current mission phases, tasks, and history, replacing them with default seed data. Proceed?")) return;
    
    try {
      setIsSeeding(true);
      const res = await fetch('http://localhost:3001/api/seed', { method: 'POST' });
      const data = await res.json();
      if (data.goal1Id) {
        window.location.href = `/goal/${data.goal1Id}/dashboard`; // full refresh
      }
    } catch (e) {
      console.error('Failed to seed', e);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <>
      <div className="fixed top-4 right-4 z-[999] flex items-center gap-3">
        <button
          onClick={seedData}
          disabled={isSeeding}
          className="px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg border outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:scale-105 active:scale-95"
          title="Reset Database to Seed State"
        >
          {isSeeding ? 'Seeding...' : 'Reset & Seed'}
        </button>
        <button
          onClick={toggleTheme}
          className="p-3 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:scale-110 active:scale-95 transition-all outline-none"
          aria-label="Toggle Dark Mode"
        >
      {theme === 'light' ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
        </svg>
        )}
        </button>
      </div>

      {isSeeding && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md z-[1000] flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 max-w-sm text-center border border-slate-100 dark:border-slate-800">
            <div className="w-16 h-16 border-4 border-blue-100 dark:border-blue-900 border-t-blue-600 rounded-full animate-spin" />
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Reconstructing System</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Please wait while we recalibrate the operational environment and seed core TRU priorities...</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
