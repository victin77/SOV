import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface ThemeToggleProps {
  variant?: 'icon' | 'pill';
  className?: string;
}

export default function ThemeToggle({ variant = 'icon', className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    toggleTheme({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  };

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`group relative inline-flex h-9 w-[72px] items-center rounded-full border border-gray-200 bg-gray-100 transition-colors hover:border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 ${className}`}
        aria-label={isDark ? 'Mudar pra tema claro' : 'Mudar pra tema escuro'}
        title={isDark ? 'Tema claro' : 'Tema escuro'}
      >
        <span
          className={`absolute top-0.5 left-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform duration-300 ease-out dark:bg-slate-900 dark:ring-white/10 ${
            isDark ? 'translate-x-[36px]' : 'translate-x-0'
          }`}
        >
          {isDark ? (
            <Moon className="h-4 w-4 text-slate-200" />
          ) : (
            <Sun className="h-4 w-4 text-amber-500" />
          )}
        </span>
        <Sun className="absolute left-2.5 h-4 w-4 text-amber-500/70" aria-hidden="true" />
        <Moon className="absolute right-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-700 dark:hover:text-white ${className}`}
      aria-label={isDark ? 'Mudar pra tema claro' : 'Mudar pra tema escuro'}
      title={isDark ? 'Tema claro' : 'Tema escuro'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
