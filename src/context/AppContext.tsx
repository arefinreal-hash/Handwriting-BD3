import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { BootstrapData, Language, ThemeMode } from '../types/hcfb';

interface AppContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  t: (bn: string, en: string) => string;
  path: string;
  search: string;
  navigate: (to: string) => void;
  bootstrap: BootstrapData | null;
  loading: boolean;
  error: string | null;
  refreshBootstrap: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('hcfb_lang');
    return saved === 'en' ? 'en' : 'bn';
  });

  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('hcfb_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  const [locationState, setLocationState] = useState(() => ({
    path: window.location.pathname || '/',
    search: window.location.search || '',
  }));

  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    localStorage.setItem('hcfb_lang', next);
    document.documentElement.lang = next;
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'bn' ? 'en' : 'bn');
  }, [lang, setLang]);

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next);
    localStorage.setItem('hcfb_theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const t = useCallback(
    (bn: string, en: string) => (lang === 'bn' ? bn || en : en || bn),
    [lang]
  );

  const navigate = useCallback((to: string) => {
    const url = new URL(to, window.location.origin);
    window.history.pushState({}, '', url.pathname + url.search + url.hash);
    setLocationState({ path: url.pathname, search: url.search });
    if (url.hash) {
      setTimeout(() => {
        const el = document.getElementById(url.hash.slice(1));
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setLocationState({
        path: window.location.pathname || '/',
        search: window.location.search || '',
      });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const refreshBootstrap = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/public/bootstrap');
      if (!res.ok) throw new Error('Failed to load foundation data.');
      const json = (await res.json()) as BootstrapData;
      setBootstrap(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshBootstrap();
  }, [refreshBootstrap]);

  return (
    <AppContext.Provider
      value={{
        lang,
        setLang,
        toggleLang,
        theme,
        setTheme,
        toggleTheme,
        t,
        path: locationState.path,
        search: locationState.search,
        navigate,
        bootstrap,
        loading,
        error,
        refreshBootstrap,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
