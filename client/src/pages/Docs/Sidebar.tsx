import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { slugify } from './markdown';

export interface DocSection {
  id: string;
  title: string;
  level: 2 | 3;
}

interface SidebarProps {
  sections: DocSection[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose?: () => void;
}

export default function Sidebar({ sections, activeId, onSelect, onClose }: SidebarProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter((s) => s.title.toLowerCase().includes(q));
  }, [query, sections]);

  return (
    <nav
      aria-label="Navegação da documentação"
      className="flex h-full w-full flex-col bg-white dark:bg-slate-900"
    >
      <div className="border-b border-gray-200 px-4 py-4 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
            Documentação
          </h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
              aria-label="Fechar menu"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="relative mt-3">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900 dark:focus:ring-primary-500/20"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {filtered.length === 0 ? (
          <p className="px-3 py-2 text-sm text-gray-500 dark:text-slate-400">Nenhum resultado.</p>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map((section) => {
              const isActive = activeId === section.id;
              return (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(section.id)}
                    className={`block w-full truncate rounded-md px-3 py-1.5 text-left text-sm transition ${
                      section.level === 3 ? 'pl-7' : ''
                    } ${
                      isActive
                        ? 'bg-primary-50 font-medium text-primary-700 dark:bg-primary-500/15 dark:text-primary-300'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                    }`}
                  >
                    {section.title}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </nav>
  );
}

export function extractSections(markdown: string): DocSection[] {
  const lines = markdown.split('\n');
  const sections: DocSection[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    // Não captura headings dentro de code blocks
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const h2 = line.match(/^##\s+(.+?)\s*$/);
    const h3 = line.match(/^###\s+(.+?)\s*$/);

    if (h2) {
      const title = h2[1].trim();
      sections.push({ id: slugify(title), title, level: 2 });
    } else if (h3) {
      const title = h3[1].trim();
      sections.push({ id: slugify(title), title, level: 3 });
    }
  }

  return sections;
}
