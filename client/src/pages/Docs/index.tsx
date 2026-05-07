import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import { Menu, BookOpen, Download } from 'lucide-react';
// Importados como string pra alternar conforme o tema (Vite ?inline)
import lightHljs from 'highlight.js/styles/github.css?inline';
import darkHljs from 'highlight.js/styles/github-dark.css?inline';
import documentacaoRaw from '../../content/documentacao.md?raw';
import { useTheme } from '../../contexts/ThemeContext';
import { downloadUserGuide } from '../../utils/userGuide';
import Sidebar, { extractSections } from './Sidebar';
import { useMarkdownComponents } from './markdown';
import ThemeToggle from './ThemeToggle';

const HLJS_STYLE_ID = 'docs-hljs-theme';

export default function DocsPage() {
  const { theme } = useTheme();
  const sections = useMemo(() => extractSections(documentacaoRaw), []);
  const components = useMarkdownComponents();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(sections[0]?.id ?? null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Injeta o tema do highlight.js conforme o tema do app, removendo no unmount
  useEffect(() => {
    let styleEl = document.getElementById(HLJS_STYLE_ID) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = HLJS_STYLE_ID;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = theme === 'dark' ? darkHljs : lightHljs;

    return () => {
      const el = document.getElementById(HLJS_STYLE_ID);
      if (el) el.remove();
    };
  }, [theme]);

  // Scroll spy: detecta a seção atual conforme rola
  useEffect(() => {
    if (!contentRef.current) return;

    const headings = Array.from(
      contentRef.current.querySelectorAll<HTMLElement>('h2[id], h3[id]')
    );
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) {
          setActiveId(visible.target.id);
        }
      },
      { rootMargin: '-100px 0px -70% 0px', threshold: 0 }
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [sections.length]);

  const handleSelect = (id: string) => {
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(id);
    }
    setMobileOpen(false);
  };

  return (
    <div className="relative -mx-4 -my-4 sm:-mx-6 sm:-my-6 lg:-mx-8 lg:-my-8">
      {/* Header mobile: sumário + tema */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <Menu className="h-4 w-4" />
          Sumário
        </button>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-slate-400">
            <BookOpen className="h-3.5 w-3.5" />
            Docs
          </span>
          <ThemeToggle />
        </div>
      </div>

      <div className="flex">
        {/* Sidebar fixa em desktop */}
        <aside className="hidden w-72 flex-shrink-0 border-r border-gray-200 dark:border-slate-800 lg:block">
          <div className="sticky top-0 h-screen">
            <Sidebar sections={sections} activeId={activeId} onSelect={handleSelect} />
          </div>
        </aside>

        {/* Drawer mobile */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] shadow-xl">
              <Sidebar
                sections={sections}
                activeId={activeId}
                onSelect={handleSelect}
                onClose={() => setMobileOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Conteúdo principal */}
        <main className="min-w-0 flex-1">
          {/* Topbar desktop com baixar guia + toggle de tema */}
          <div className="sticky top-0 z-10 hidden items-center justify-end gap-3 border-b border-gray-200 bg-white/70 px-6 py-3 backdrop-blur lg:flex dark:border-slate-800 dark:bg-slate-900/70">
            <button
              type="button"
              onClick={downloadUserGuide}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700"
              title="Baixa um arquivo HTML que abre offline"
            >
              <Download className="h-4 w-4" />
              Baixar guia
            </button>
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
              Tema
            </span>
            <ThemeToggle variant="pill" />
          </div>

          <div ref={contentRef} className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSlug, rehypeHighlight]}
              components={components}
            >
              {documentacaoRaw}
            </ReactMarkdown>

            <footer className="mt-16 flex items-center justify-between border-t border-gray-200 pt-6 text-sm text-gray-500 dark:border-slate-800 dark:text-slate-400">
              <span>SOV CRM — Documentação</span>
              <span>Última atualização: {new Date().toLocaleDateString('pt-BR')}</span>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
