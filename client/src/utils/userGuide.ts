import { marked, Parser } from 'marked';
import documentacaoMd from '../content/documentacao.md?raw';

// ──────────────────────────────────────────────────────────────────────
// Conversão Markdown → HTML
// Reusa o MESMO conteúdo de /docs (single source of truth) e aplica
// transformações pra callouts, code blocks com botão copiar e ids em
// headings, gerando um HTML standalone bonito que abre offline.
// ──────────────────────────────────────────────────────────────────────

const CALLOUT_TYPES: Record<string, { label: string; iconPath: string }> = {
  NOTE: {
    label: 'Nota',
    // Lucide "info"
    iconPath:
      '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  },
  TIP: {
    label: 'Dica',
    // Lucide "lightbulb"
    iconPath:
      '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  },
  WARNING: {
    label: 'Atenção',
    // Lucide "triangle-alert"
    iconPath:
      '<path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  },
  IMPORTANT: {
    label: 'Importante',
    // Lucide "alert-circle"
    iconPath:
      '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  },
  CAUTION: {
    label: 'Cuidado',
    // Lucide "flame"
    iconPath:
      '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  },
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function buildMarkedRenderer(): { renderer: any; sections: { id: string; title: string; level: 2 | 3 }[] } {
  const sections: { id: string; title: string; level: 2 | 3 }[] = [];
  const renderer = new marked.Renderer();

  renderer.heading = ({ tokens, depth }: any) => {
    const text = tokens.map((t: any) => t.raw || t.text || '').join('');
    const id = slugify(text);
    if (depth === 2 || depth === 3) {
      sections.push({ id, title: text, level: depth as 2 | 3 });
    }
    const inner = Parser.parseInline(tokens) ?? escapeHtml(text);
    return `<h${depth} id="${id}" class="docs-heading docs-h${depth}">${inner}</h${depth}>`;
  };

  // Callouts: > [!NOTE] ... transforma em div colorida
  renderer.blockquote = ({ tokens }: any) => {
    const inner = Parser.parse(tokens) ?? '';
    const match = inner.match(/<p>\s*\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]\s*([\s\S]*?)<\/p>([\s\S]*)/);
    if (match) {
      const kind = match[1].toUpperCase();
      const firstParaContent = match[2].replace(/^\n+/, '').trim();
      const rest = match[3];
      const config = CALLOUT_TYPES[kind];
      const body = (firstParaContent ? `<p>${firstParaContent}</p>` : '') + rest;
      return `<div class="docs-callout docs-callout-${kind.toLowerCase()}">
  <svg class="docs-callout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${config.iconPath}</svg>
  <div class="docs-callout-body">
    <p class="docs-callout-label">${config.label}</p>
    ${body}
  </div>
</div>`;
    }
    return `<blockquote class="docs-blockquote">${inner}</blockquote>`;
  };

  renderer.code = ({ text, lang }: any) => {
    const language = (lang || '').trim() || 'texto';
    return `<div class="docs-codeblock">
  <div class="docs-codeblock-head">
    <span class="docs-codeblock-lang">${escapeHtml(language)}</span>
    <button type="button" class="docs-codeblock-copy" data-copy="${encodeURIComponent(text)}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="docs-icon-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="docs-icon-check"><path d="M20 6 9 17l-5-5"/></svg>
      <span class="docs-codeblock-copy-text">Copiar</span>
    </button>
  </div>
  <pre class="docs-codeblock-pre"><code>${escapeHtml(text)}</code></pre>
</div>`;
  };

  renderer.codespan = ({ text }: any) => `<code class="docs-code-inline">${text}</code>`;

  renderer.table = ({ header, rows }: any) => {
    const headerHtml = header
      .map((c: any) => `<th>${Parser.parseInline(c.tokens)}</th>`)
      .join('');
    const rowsHtml = rows
      .map(
        (row: any[]) =>
          `<tr>${row.map((c: any) => `<td>${Parser.parseInline(c.tokens)}</td>`).join('')}</tr>`
      )
      .join('');
    return `<div class="docs-table-wrap"><table class="docs-table"><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></div>`;
  };

  renderer.link = ({ href, title, tokens }: any) => {
    const inner = Parser.parseInline(tokens);
    const isExternal = /^https?:\/\//.test(href || '');
    const attrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
    return `<a class="docs-link" href="${escapeHtml(href || '#')}"${titleAttr}${attrs}>${inner}</a>`;
  };

  return { renderer, sections };
}

function renderMarkdown(): { html: string; sections: { id: string; title: string; level: 2 | 3 }[] } {
  const { renderer, sections } = buildMarkedRenderer();
  marked.use({ renderer, gfm: true, breaks: false });
  const html = marked.parse(documentacaoMd, { async: false }) as string;
  return { html, sections };
}

// ──────────────────────────────────────────────────────────────────────
// Template HTML standalone com CSS + JS embutidos (funciona offline)
// ──────────────────────────────────────────────────────────────────────

function buildSidebarHtml(sections: { id: string; title: string; level: 2 | 3 }[]): string {
  return sections
    .map(
      (s) =>
        `<li><a href="#${s.id}" class="docs-nav-link${s.level === 3 ? ' docs-nav-sub' : ''}" data-section="${s.id}">${escapeHtml(s.title)}</a></li>`
    )
    .join('\n          ');
}

function buildHtmlDocument(): string {
  const { html: contentHtml, sections } = renderMarkdown();
  const sidebarHtml = buildSidebarHtml(sections);
  const today = new Date().toLocaleDateString('pt-BR');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SOV CRM — Guia do Usuário</title>
<style>
  /* Reset */
  *, *::before, *::after { box-sizing: border-box; }
  * { margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    line-height: 1.6;
    color: var(--fg);
    background: var(--bg);
    transition: background-color 200ms ease, color 200ms ease;
  }

  /* Variáveis de tema (light por padrão) */
  :root {
    --bg: #ffffff;
    --bg-soft: #f8fafc;
    --bg-card: #ffffff;
    --fg: #1e293b;
    --fg-soft: #475569;
    --fg-muted: #64748b;
    --border: #e2e8f0;
    --border-soft: #f1f5f9;
    --accent: #6366f1;
    --accent-soft: #eef2ff;
    --accent-fg: #4338ca;
    --code-bg: #f1f5f9;
    --code-fg: #4338ca;
    --pre-bg: #0f172a;
    --pre-fg: #e2e8f0;
    --shadow: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03);
  }
  html.dark {
    --bg: #0f172a;
    --bg-soft: #1e293b;
    --bg-card: #1e293b;
    --fg: #e2e8f0;
    --fg-soft: #cbd5e1;
    --fg-muted: #94a3b8;
    --border: #334155;
    --border-soft: #1e293b;
    --accent: #818cf8;
    --accent-soft: rgba(99, 102, 241, 0.15);
    --accent-fg: #c7d2fe;
    --code-bg: #334155;
    --code-fg: #c7d2fe;
    --pre-bg: #020617;
    --pre-fg: #e2e8f0;
    --shadow: 0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2);
  }

  /* Layout */
  .docs-layout {
    display: grid;
    grid-template-columns: 280px 1fr;
    min-height: 100vh;
  }
  .docs-sidebar {
    border-right: 1px solid var(--border);
    background: var(--bg);
    position: sticky;
    top: 0;
    align-self: start;
    height: 100vh;
    display: flex;
    flex-direction: column;
    z-index: 10;
  }
  .docs-sidebar-head {
    padding: 20px 16px;
    border-bottom: 1px solid var(--border);
  }
  .docs-sidebar-title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--fg-muted);
    margin-bottom: 12px;
  }
  .docs-search {
    position: relative;
  }
  .docs-search-input {
    width: 100%;
    border: 1px solid var(--border);
    background: var(--bg-soft);
    padding: 8px 12px 8px 34px;
    border-radius: 8px;
    color: var(--fg);
    font-size: 14px;
    font-family: inherit;
    transition: border-color 150ms ease, background-color 200ms ease;
  }
  .docs-search-input:focus {
    outline: none;
    border-color: var(--accent);
    background: var(--bg);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }
  .docs-search-icon {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: var(--fg-muted);
    pointer-events: none;
  }
  .docs-nav {
    flex: 1;
    overflow-y: auto;
    padding: 12px 8px;
  }
  .docs-nav ul { list-style: none; }
  .docs-nav-link {
    display: block;
    padding: 6px 12px;
    margin: 1px 0;
    border-radius: 6px;
    font-size: 14px;
    color: var(--fg-soft);
    text-decoration: none;
    transition: background-color 120ms ease, color 120ms ease;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .docs-nav-link:hover { background: var(--bg-soft); color: var(--fg); }
  .docs-nav-link.is-active {
    background: var(--accent-soft);
    color: var(--accent-fg);
    font-weight: 500;
  }
  .docs-nav-sub { padding-left: 28px; font-size: 13px; }
  .docs-nav-empty {
    padding: 12px;
    color: var(--fg-muted);
    font-size: 13px;
  }

  .docs-main { min-width: 0; background: var(--bg); }
  .docs-topbar {
    position: sticky;
    top: 0;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 32px;
    border-bottom: 1px solid var(--border);
    background: color-mix(in srgb, var(--bg) 80%, transparent);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
  .docs-topbar-mobile-btn { display: none; }
  .docs-topbar-brand {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 500;
    color: var(--fg-muted);
  }
  .docs-topbar-actions { display: flex; align-items: center; gap: 12px; }

  /* Toggle tema (pill) */
  .docs-theme-toggle {
    position: relative;
    width: 72px;
    height: 36px;
    border: 1px solid var(--border);
    border-radius: 9999px;
    background: var(--bg-soft);
    cursor: pointer;
    transition: border-color 150ms ease, background-color 200ms ease;
  }
  .docs-theme-toggle:hover { border-color: var(--fg-muted); }
  .docs-theme-toggle-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 30px;
    height: 30px;
    background: var(--bg);
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1);
    color: #f59e0b;
  }
  html.dark .docs-theme-toggle-thumb { transform: translateX(36px); color: #cbd5e1; }
  .docs-theme-toggle-icon-side {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 14px;
    height: 14px;
    pointer-events: none;
  }
  .docs-theme-toggle-icon-sun { left: 10px; color: rgba(245, 158, 11, 0.7); }
  .docs-theme-toggle-icon-moon { right: 10px; color: var(--fg-muted); }

  /* Botão genérico do topbar */
  .docs-topbar-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--fg-soft);
    padding: 7px 12px;
    border-radius: 8px;
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    transition: background-color 120ms ease, border-color 120ms ease;
  }
  .docs-topbar-btn:hover { background: var(--bg-soft); border-color: var(--fg-muted); }
  .docs-topbar-btn svg { width: 14px; height: 14px; }

  /* Conteúdo */
  .docs-content {
    max-width: 760px;
    margin: 0 auto;
    padding: 56px 48px 96px;
  }

  /* Tipografia */
  .docs-h1 {
    font-size: 36px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--fg);
    margin-bottom: 12px;
    scroll-margin-top: 80px;
  }
  .docs-h2 {
    font-size: 26px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--fg);
    margin-top: 56px;
    margin-bottom: 18px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
    scroll-margin-top: 80px;
  }
  .docs-h3 {
    font-size: 19px;
    font-weight: 600;
    color: var(--fg);
    margin-top: 36px;
    margin-bottom: 10px;
    scroll-margin-top: 80px;
  }
  .docs-content h4 {
    font-size: 16px;
    font-weight: 600;
    color: var(--fg);
    margin-top: 24px;
    margin-bottom: 8px;
  }
  .docs-content p { margin: 16px 0; color: var(--fg-soft); }
  .docs-content strong { color: var(--fg); font-weight: 600; }
  .docs-content em { font-style: italic; }

  .docs-link {
    color: var(--accent);
    text-decoration: none;
    font-weight: 500;
    text-underline-offset: 3px;
  }
  .docs-link:hover { text-decoration: underline; }

  .docs-content ul, .docs-content ol {
    margin: 16px 0;
    padding-left: 24px;
    color: var(--fg-soft);
  }
  .docs-content li { margin: 6px 0; }
  .docs-content ul li::marker { color: var(--fg-muted); }
  .docs-content ol li::marker { color: var(--fg-muted); }

  .docs-content hr {
    border: none;
    border-top: 1px solid var(--border);
    margin: 48px 0;
  }

  /* Code */
  .docs-code-inline {
    background: var(--code-bg);
    color: var(--code-fg);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, monospace;
    font-size: 0.875em;
  }
  .docs-codeblock {
    margin: 20px 0;
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
    background: var(--bg-soft);
  }
  .docs-codeblock-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
  }
  .docs-codeblock-lang {
    font-size: 12px;
    font-weight: 500;
    color: var(--fg-muted);
    text-transform: lowercase;
  }
  .docs-codeblock-copy {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: none;
    background: transparent;
    color: var(--fg-muted);
    font-size: 12px;
    font-weight: 500;
    font-family: inherit;
    padding: 4px 8px;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 120ms ease, color 120ms ease;
  }
  .docs-codeblock-copy:hover { background: var(--bg-soft); color: var(--fg); }
  .docs-codeblock-copy svg { width: 14px; height: 14px; }
  .docs-codeblock-copy .docs-icon-check { display: none; }
  .docs-codeblock-copy.is-copied .docs-icon-copy { display: none; }
  .docs-codeblock-copy.is-copied .docs-icon-check { display: inline-block; color: #10b981; }
  .docs-codeblock-copy.is-copied .docs-codeblock-copy-text { color: #10b981; }
  .docs-codeblock-pre {
    margin: 0;
    padding: 14px 16px;
    overflow-x: auto;
    background: var(--pre-bg);
    color: var(--pre-fg);
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, monospace;
    font-size: 13.5px;
    line-height: 1.55;
  }
  .docs-codeblock-pre code { background: transparent; color: inherit; padding: 0; }

  /* Tabelas */
  .docs-table-wrap {
    margin: 20px 0;
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow-x: auto;
  }
  .docs-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }
  .docs-table thead { background: var(--bg-soft); }
  .docs-table th {
    text-align: left;
    padding: 12px 16px;
    font-weight: 600;
    color: var(--fg);
    border-bottom: 1px solid var(--border);
  }
  .docs-table td {
    padding: 12px 16px;
    color: var(--fg-soft);
    border-bottom: 1px solid var(--border-soft);
    vertical-align: top;
  }
  .docs-table tbody tr:last-child td { border-bottom: none; }

  /* Blockquote padrão (sem callout) */
  .docs-blockquote {
    border-left: 4px solid var(--accent);
    background: var(--accent-soft);
    padding: 8px 16px;
    margin: 20px 0;
    border-radius: 0 8px 8px 0;
    color: var(--fg-soft);
    font-style: italic;
  }
  .docs-blockquote p { margin: 6px 0; }

  /* Callouts */
  .docs-callout {
    display: flex;
    gap: 12px;
    margin: 20px 0;
    padding: 14px 16px;
    border-radius: 12px;
    border: 1px solid;
  }
  .docs-callout-icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    margin-top: 2px;
  }
  .docs-callout-body { flex: 1; }
  .docs-callout-body p { margin: 0; font-size: 14px; line-height: 1.6; }
  .docs-callout-body p + p { margin-top: 8px; }
  .docs-callout-label {
    font-size: 11px !important;
    font-weight: 700 !important;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 4px !important;
    opacity: 0.85;
  }

  .docs-callout-note {
    border-color: #93c5fd;
    background: rgba(219, 234, 254, 0.5);
    color: #1e3a8a;
  }
  html.dark .docs-callout-note {
    border-color: #1d4ed8;
    background: rgba(29, 78, 216, 0.15);
    color: #dbeafe;
  }
  .docs-callout-note .docs-callout-icon { color: #2563eb; }
  html.dark .docs-callout-note .docs-callout-icon { color: #60a5fa; }

  .docs-callout-tip {
    border-color: #6ee7b7;
    background: rgba(209, 250, 229, 0.5);
    color: #064e3b;
  }
  html.dark .docs-callout-tip {
    border-color: #047857;
    background: rgba(5, 150, 105, 0.15);
    color: #d1fae5;
  }
  .docs-callout-tip .docs-callout-icon { color: #059669; }
  html.dark .docs-callout-tip .docs-callout-icon { color: #34d399; }

  .docs-callout-warning {
    border-color: #fcd34d;
    background: rgba(254, 243, 199, 0.5);
    color: #78350f;
  }
  html.dark .docs-callout-warning {
    border-color: #b45309;
    background: rgba(180, 83, 9, 0.15);
    color: #fef3c7;
  }
  .docs-callout-warning .docs-callout-icon { color: #d97706; }
  html.dark .docs-callout-warning .docs-callout-icon { color: #fbbf24; }

  .docs-callout-important {
    border-color: #c4b5fd;
    background: rgba(237, 233, 254, 0.5);
    color: #4c1d95;
  }
  html.dark .docs-callout-important {
    border-color: #6d28d9;
    background: rgba(109, 40, 217, 0.15);
    color: #ede9fe;
  }
  .docs-callout-important .docs-callout-icon { color: #7c3aed; }
  html.dark .docs-callout-important .docs-callout-icon { color: #a78bfa; }

  .docs-callout-caution {
    border-color: #fca5a5;
    background: rgba(254, 226, 226, 0.5);
    color: #7f1d1d;
  }
  html.dark .docs-callout-caution {
    border-color: #b91c1c;
    background: rgba(185, 28, 28, 0.15);
    color: #fecaca;
  }
  .docs-callout-caution .docs-callout-icon { color: #dc2626; }
  html.dark .docs-callout-caution .docs-callout-icon { color: #f87171; }

  /* Footer */
  .docs-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 80px;
    padding-top: 24px;
    border-top: 1px solid var(--border);
    font-size: 13px;
    color: var(--fg-muted);
  }

  /* Mobile */
  @media (max-width: 900px) {
    .docs-layout { grid-template-columns: 1fr; }
    .docs-sidebar {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      width: 280px;
      transform: translateX(-100%);
      transition: transform 240ms cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 0 30px rgba(0,0,0,0.2);
    }
    .docs-sidebar.is-open { transform: translateX(0); }
    .docs-sidebar-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.4);
      backdrop-filter: blur(2px);
      z-index: 9;
    }
    .docs-sidebar-backdrop.is-open { display: block; }
    .docs-topbar { padding: 12px 20px; }
    .docs-topbar-mobile-btn { display: inline-flex; }
    .docs-content { padding: 32px 20px 80px; }
    .docs-h1 { font-size: 28px; }
    .docs-h2 { font-size: 22px; }
  }

  /* View Transitions API: animação do tema */
  ::view-transition-old(root),
  ::view-transition-new(root) { animation: none; mix-blend-mode: normal; }
  ::view-transition-old(root) { z-index: 1; }
  ::view-transition-new(root) { z-index: 2; }
  html[data-theme-transition='dark']::view-transition-new(root) {
    animation: docs-ripple-in 600ms cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
  }
  html[data-theme-transition='light']::view-transition-new(root) {
    z-index: 1;
    animation: docs-fade-hold 600ms linear forwards;
  }
  html[data-theme-transition='light']::view-transition-old(root) {
    z-index: 2;
    animation: docs-ripple-out 600ms cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
  }
  @keyframes docs-ripple-in {
    from { clip-path: circle(0 at var(--ripple-x, 50%) var(--ripple-y, 50%)); }
    to { clip-path: circle(var(--ripple-r, 150vmax) at var(--ripple-x, 50%) var(--ripple-y, 50%)); }
  }
  @keyframes docs-ripple-out {
    from { clip-path: circle(var(--ripple-r, 150vmax) at var(--ripple-x, 50%) var(--ripple-y, 50%)); }
    to { clip-path: circle(0 at var(--ripple-x, 50%) var(--ripple-y, 50%)); }
  }
  @keyframes docs-fade-hold { from { opacity: 1; } to { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) {
    ::view-transition-old(root), ::view-transition-new(root) { animation: none !important; }
  }

  /* Print: esconde UI, mostra só conteúdo */
  @media print {
    .docs-sidebar, .docs-topbar, .docs-sidebar-backdrop { display: none !important; }
    .docs-layout { display: block; }
    .docs-content { max-width: none; padding: 0; }
    .docs-h1, .docs-h2, .docs-h3 { page-break-after: avoid; }
    .docs-callout, .docs-codeblock, .docs-table-wrap { page-break-inside: avoid; }
    body { background: white; color: black; }
  }
</style>
</head>
<body>

<div class="docs-sidebar-backdrop" id="docs-backdrop"></div>

<div class="docs-layout">

  <!-- Sidebar -->
  <aside class="docs-sidebar" id="docs-sidebar">
    <div class="docs-sidebar-head">
      <div class="docs-sidebar-title">Documentação</div>
      <div class="docs-search">
        <svg class="docs-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input type="search" id="docs-search" class="docs-search-input" placeholder="Buscar..." aria-label="Buscar na documentação">
      </div>
    </div>
    <nav class="docs-nav" aria-label="Navegação">
      <ul id="docs-nav-list">
          ${sidebarHtml}
      </ul>
      <p class="docs-nav-empty" id="docs-nav-empty" style="display:none;">Nenhum resultado.</p>
    </nav>
  </aside>

  <!-- Conteúdo -->
  <main class="docs-main">
    <div class="docs-topbar">
      <button type="button" class="docs-topbar-btn docs-topbar-mobile-btn" id="docs-mobile-toggle" aria-label="Abrir menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
        Sumário
      </button>
      <span class="docs-topbar-brand">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
        SOV CRM
      </span>
      <div class="docs-topbar-actions">
        <button type="button" id="docs-print" class="docs-topbar-btn" title="Imprimir como PDF (Ctrl+P)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
          PDF
        </button>
        <button type="button" id="docs-theme-toggle" class="docs-theme-toggle" title="Alternar tema" aria-label="Alternar tema">
          <svg class="docs-theme-toggle-icon-side docs-theme-toggle-icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
          <svg class="docs-theme-toggle-icon-side docs-theme-toggle-icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          <span class="docs-theme-toggle-thumb" id="docs-theme-thumb">
            <svg id="docs-theme-icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
            <svg id="docs-theme-icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" style="display:none;"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </span>
        </button>
      </div>
    </div>

    <article class="docs-content" id="docs-content">
${contentHtml}
      <footer class="docs-footer">
        <span>SOV CRM — Guia do Usuário</span>
        <span>Gerado em ${today}</span>
      </footer>
    </article>
  </main>
</div>

<script>
(function() {
  'use strict';

  // ── TEMA ────────────────────────────────────────────────────────────
  var STORAGE_KEY = 'sov_docs_theme';
  var root = document.documentElement;
  var iconSun = document.getElementById('docs-theme-icon-sun');
  var iconMoon = document.getElementById('docs-theme-icon-moon');

  function applyTheme(t) {
    root.classList.toggle('dark', t === 'dark');
    if (iconSun && iconMoon) {
      iconSun.style.display = t === 'dark' ? 'none' : 'block';
      iconMoon.style.display = t === 'dark' ? 'block' : 'none';
    }
    try { localStorage.setItem(STORAGE_KEY, t); } catch(e) {}
  }

  function initialTheme() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch(e) {}
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  applyTheme(initialTheme());

  function toggleTheme(origin) {
    var next = root.classList.contains('dark') ? 'light' : 'dark';
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var startVT = document.startViewTransition && document.startViewTransition.bind(document);

    if (!startVT || reduceMotion) {
      applyTheme(next);
      return;
    }

    var x = origin && origin.x != null ? origin.x : window.innerWidth - 60;
    var y = origin && origin.y != null ? origin.y : 60;
    var endR = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    root.style.setProperty('--ripple-x', x + 'px');
    root.style.setProperty('--ripple-y', y + 'px');
    root.style.setProperty('--ripple-r', endR + 'px');
    root.dataset.themeTransition = next;

    var t = startVT(function() { applyTheme(next); });
    if (t && t.finished && t.finished.finally) {
      t.finished.finally(function() {
        delete root.dataset.themeTransition;
        root.style.removeProperty('--ripple-x');
        root.style.removeProperty('--ripple-y');
        root.style.removeProperty('--ripple-r');
      });
    }
  }

  var themeBtn = document.getElementById('docs-theme-toggle');
  themeBtn && themeBtn.addEventListener('click', function(e) {
    var rect = e.currentTarget.getBoundingClientRect();
    toggleTheme({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  });

  // ── COPY CODE ───────────────────────────────────────────────────────
  document.addEventListener('click', function(e) {
    var btn = e.target.closest && e.target.closest('.docs-codeblock-copy');
    if (!btn) return;
    var encoded = btn.getAttribute('data-copy') || '';
    var text = decodeURIComponent(encoded);
    var label = btn.querySelector('.docs-codeblock-copy-text');
    var done = function() {
      btn.classList.add('is-copied');
      if (label) label.textContent = 'Copiado';
      setTimeout(function() {
        btn.classList.remove('is-copied');
        if (label) label.textContent = 'Copiar';
      }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function() {
        var ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch(_) {}
        document.body.removeChild(ta);
      });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch(_) {}
      document.body.removeChild(ta);
    }
  });

  // ── BUSCA ───────────────────────────────────────────────────────────
  var searchInput = document.getElementById('docs-search');
  var navList = document.getElementById('docs-nav-list');
  var navEmpty = document.getElementById('docs-nav-empty');
  searchInput && searchInput.addEventListener('input', function() {
    var q = this.value.trim().toLowerCase();
    var items = navList.querySelectorAll('li');
    var visible = 0;
    items.forEach(function(li) {
      var match = !q || li.textContent.toLowerCase().indexOf(q) >= 0;
      li.style.display = match ? '' : 'none';
      if (match) visible++;
    });
    navEmpty.style.display = visible === 0 ? 'block' : 'none';
  });

  // ── SCROLL SPY ──────────────────────────────────────────────────────
  var navLinks = document.querySelectorAll('.docs-nav-link');
  var linkById = {};
  navLinks.forEach(function(a) { linkById[a.getAttribute('data-section')] = a; });
  var headings = Array.prototype.slice.call(document.querySelectorAll('.docs-content h2[id], .docs-content h3[id]'));

  function setActive(id) {
    navLinks.forEach(function(a) { a.classList.remove('is-active'); });
    var link = linkById[id];
    if (link) {
      link.classList.add('is-active');
      // Garante visibilidade dentro da nav
      if (link.scrollIntoView) link.scrollIntoView({ block: 'nearest' });
    }
  }

  if ('IntersectionObserver' in window && headings.length) {
    var observer = new IntersectionObserver(function(entries) {
      var visible = entries.filter(function(e) { return e.isIntersecting; });
      if (!visible.length) return;
      visible.sort(function(a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });
      setActive(visible[0].target.id);
    }, { rootMargin: '-100px 0px -70% 0px' });
    headings.forEach(function(h) { observer.observe(h); });
  }

  // ── SIDEBAR MOBILE ──────────────────────────────────────────────────
  var sidebar = document.getElementById('docs-sidebar');
  var backdrop = document.getElementById('docs-backdrop');
  var mobileBtn = document.getElementById('docs-mobile-toggle');
  function openSidebar() { sidebar.classList.add('is-open'); backdrop.classList.add('is-open'); }
  function closeSidebar() { sidebar.classList.remove('is-open'); backdrop.classList.remove('is-open'); }
  mobileBtn && mobileBtn.addEventListener('click', openSidebar);
  backdrop && backdrop.addEventListener('click', closeSidebar);
  navLinks.forEach(function(a) {
    a.addEventListener('click', function() {
      if (window.innerWidth < 900) closeSidebar();
    });
  });

  // ── PRINT ───────────────────────────────────────────────────────────
  var printBtn = document.getElementById('docs-print');
  printBtn && printBtn.addEventListener('click', function() { window.print(); });

})();
</script>

</body>
</html>`;
}

export function downloadUserGuide() {
  const html = buildHtmlDocument();
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'SOV_CRM_Guia_do_Usuario.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
