import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode, origin?: ThemeOrigin) => void;
  toggleTheme: (origin?: ThemeOrigin) => void;
}

interface ThemeOrigin {
  x: number;
  y: number;
}

const STORAGE_KEY = 'crm_theme';
const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveInitialTheme(): ThemeMode {
  const savedTheme = localStorage.getItem(STORAGE_KEY);
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  localStorage.setItem(STORAGE_KEY, theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => resolveInitialTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(() => {
    const transitionTo = (next: ThemeMode, origin?: ThemeOrigin) => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const startViewTransition = (document as Document & {
        startViewTransition?: (cb: () => void) => { finished: Promise<void> };
      }).startViewTransition?.bind(document);

      if (!startViewTransition || reduceMotion) {
        setThemeState(next);
        return;
      }

      const root = document.documentElement;
      const x = origin?.x ?? window.innerWidth - 40;
      const y = origin?.y ?? 40;
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      root.style.setProperty('--theme-ripple-x', `${x}px`);
      root.style.setProperty('--theme-ripple-y', `${y}px`);
      root.style.setProperty('--theme-ripple-r', `${endRadius}px`);
      root.dataset.themeTransition = next;

      const transition = startViewTransition(() => {
        setThemeState(next);
        applyTheme(next);
      });

      transition.finished.finally(() => {
        delete root.dataset.themeTransition;
        root.style.removeProperty('--theme-ripple-x');
        root.style.removeProperty('--theme-ripple-y');
        root.style.removeProperty('--theme-ripple-r');
      });
    };

    return {
      theme,
      setTheme: (next, origin) => {
        if (next === theme) return;
        transitionTo(next, origin);
      },
      toggleTheme: (origin) => {
        transitionTo(theme === 'dark' ? 'light' : 'dark', origin);
      },
    };
  }, [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
