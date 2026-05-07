import { useState, useMemo, ReactNode, isValidElement, Children } from 'react';
import type { Components } from 'react-markdown';
import { Info, Lightbulb, AlertTriangle, AlertCircle, Flame, Check, Copy } from 'lucide-react';

type CalloutKind = 'note' | 'tip' | 'warning' | 'important' | 'caution';

const CALLOUT_STYLES: Record<CalloutKind, {
  icon: typeof Info;
  label: string;
  border: string;
  bg: string;
  text: string;
  iconColor: string;
}> = {
  note: {
    icon: Info,
    label: 'Nota',
    border: 'border-blue-300 dark:border-blue-700',
    bg: 'bg-blue-50/70 dark:bg-blue-500/10',
    text: 'text-blue-900 dark:text-blue-100',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  tip: {
    icon: Lightbulb,
    label: 'Dica',
    border: 'border-emerald-300 dark:border-emerald-700',
    bg: 'bg-emerald-50/70 dark:bg-emerald-500/10',
    text: 'text-emerald-900 dark:text-emerald-100',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  warning: {
    icon: AlertTriangle,
    label: 'Atenção',
    border: 'border-amber-300 dark:border-amber-700',
    bg: 'bg-amber-50/70 dark:bg-amber-500/10',
    text: 'text-amber-900 dark:text-amber-100',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  important: {
    icon: AlertCircle,
    label: 'Importante',
    border: 'border-violet-300 dark:border-violet-700',
    bg: 'bg-violet-50/70 dark:bg-violet-500/10',
    text: 'text-violet-900 dark:text-violet-100',
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
  caution: {
    icon: Flame,
    label: 'Cuidado',
    border: 'border-red-300 dark:border-red-700',
    bg: 'bg-red-50/70 dark:bg-red-500/10',
    text: 'text-red-900 dark:text-red-100',
    iconColor: 'text-red-600 dark:text-red-400',
  },
};

function Callout({ kind, children }: { kind: CalloutKind; children: ReactNode }) {
  const style = CALLOUT_STYLES[kind];
  const Icon = style.icon;
  return (
    <div
      role="note"
      className={`not-prose my-5 flex gap-3 rounded-xl border ${style.border} ${style.bg} ${style.text} px-4 py-3.5`}
    >
      <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${style.iconColor}`} aria-hidden="true" />
      <div className="flex-1 space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{style.label}</p>
        <div className="text-sm leading-relaxed [&_p]:m-0 [&_p+p]:mt-2 [&_a]:underline">{children}</div>
      </div>
    </div>
  );
}

const CALLOUT_REGEX = /^\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]\s*/i;

// Detecta se um blockquote começa com [!TIPO] e converte em Callout.
// Estrutura típica do react-markdown: blockquote > p > "[!NOTE] texto..."
function tryRenderCallout(children: ReactNode): ReactNode | null {
  const childArray = Children.toArray(children);
  // Procura o primeiro <p>
  const firstP = childArray.find((c) => isValidElement(c) && (c.type === 'p' || (c as any).props?.node?.tagName === 'p'));
  if (!firstP || !isValidElement(firstP)) return null;

  const pChildren = Children.toArray((firstP as any).props.children);
  const firstText = pChildren[0];
  if (typeof firstText !== 'string') return null;

  const match = firstText.match(CALLOUT_REGEX);
  if (!match) return null;

  const kind = match[1].toLowerCase() as CalloutKind;
  const remainingText = firstText.replace(CALLOUT_REGEX, '');

  // Reconstrói os filhos sem o marker, removendo \n inicial
  const cleaned = remainingText.replace(/^\n+/, '');
  const newPChildren = cleaned ? [cleaned, ...pChildren.slice(1)] : pChildren.slice(1);

  // Filtra <p> vazio se sobrou só um break
  const restChildren = childArray
    .filter((c) => c !== firstP)
    .filter((c) => !(typeof c === 'string' && c.trim() === ''));

  return (
    <Callout kind={kind}>
      {newPChildren.length > 0 && newPChildren.some((c) => c !== '\n' && c !== '') && <p>{newPChildren}</p>}
      {restChildren}
    </Callout>
  );
}

function CodeBlock({ className, children }: { className?: string; children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const language = (className || '').replace(/^language-/, '').trim();
  const code = String(children ?? '').replace(/\n$/, '');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="not-prose my-5 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-900/60">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white/50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800/50">
        <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
          {language || 'texto'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
          aria-label="Copiar código"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <pre className="m-0 overflow-x-auto bg-transparent px-4 py-3 text-sm leading-relaxed">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function extractText(node: ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (isValidElement(node)) return extractText((node as any).props.children);
  return '';
}

export function useMarkdownComponents(): Components {
  return useMemo<Components>(
    () => ({
      h1: ({ children }) => {
        const text = extractText(children);
        return (
          <h1 id={slugify(text)} className="scroll-mt-24 text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3">
            {children}
          </h1>
        );
      },
      h2: ({ children }) => {
        const text = extractText(children);
        return (
          <h2
            id={slugify(text)}
            className="scroll-mt-24 mt-12 mb-4 border-b border-gray-200 pb-2 text-2xl font-semibold tracking-tight text-gray-900 dark:border-slate-800 dark:text-white"
          >
            {children}
          </h2>
        );
      },
      h3: ({ children }) => {
        const text = extractText(children);
        return (
          <h3 id={slugify(text)} className="scroll-mt-24 mt-8 mb-2 text-lg font-semibold text-gray-900 dark:text-white">
            {children}
          </h3>
        );
      },
      h4: ({ children }) => (
        <h4 className="mt-6 mb-2 text-base font-semibold text-gray-900 dark:text-white">{children}</h4>
      ),
      p: ({ children }) => (
        <p className="my-4 leading-relaxed text-gray-700 dark:text-slate-300">{children}</p>
      ),
      a: ({ children, href }) => (
        <a
          href={href}
          className="font-medium text-primary-600 underline-offset-4 hover:underline dark:text-primary-400"
          target={href?.startsWith('http') ? '_blank' : undefined}
          rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
        >
          {children}
        </a>
      ),
      strong: ({ children }) => (
        <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>
      ),
      ul: ({ children }) => (
        <ul className="my-4 ml-5 list-disc space-y-1.5 text-gray-700 marker:text-gray-400 dark:text-slate-300 dark:marker:text-slate-500">
          {children}
        </ul>
      ),
      ol: ({ children }) => (
        <ol className="my-4 ml-5 list-decimal space-y-1.5 text-gray-700 marker:text-gray-500 dark:text-slate-300 dark:marker:text-slate-400">
          {children}
        </ol>
      ),
      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
      hr: () => <hr className="my-10 border-gray-200 dark:border-slate-800" />,
      table: ({ children }) => (
        <div className="not-prose my-6 overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
          <table className="w-full border-collapse text-sm">{children}</table>
        </div>
      ),
      thead: ({ children }) => (
        <thead className="bg-gray-50 dark:bg-slate-800/60">{children}</thead>
      ),
      th: ({ children }) => (
        <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-900 dark:border-slate-700 dark:text-white">
          {children}
        </th>
      ),
      td: ({ children }) => (
        <td className="border-b border-gray-100 px-4 py-3 align-top text-gray-700 last:border-b-0 dark:border-slate-800 dark:text-slate-300">
          {children}
        </td>
      ),
      blockquote: ({ children }) => {
        const callout = tryRenderCallout(children);
        if (callout) return <>{callout}</>;
        return (
          <blockquote className="my-5 border-l-4 border-primary-300 bg-primary-50/50 px-4 py-2 italic text-gray-700 dark:border-primary-700 dark:bg-primary-500/10 dark:text-slate-300">
            {children}
          </blockquote>
        );
      },
      code: ({ className, children, ...props }: any) => {
        const isInline = !className;
        if (isInline) {
          return (
            <code
              className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[0.875em] text-primary-700 dark:bg-slate-800 dark:text-primary-300"
              {...props}
            >
              {children}
            </code>
          );
        }
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
      pre: ({ children }: any) => {
        // pre vem com um <code> dentro — extrai e usa CodeBlock
        const codeEl = Children.toArray(children).find(
          (c) => isValidElement(c) && (c as any).props?.className?.startsWith('language-')
        );
        if (isValidElement(codeEl)) {
          return (
            <CodeBlock className={(codeEl as any).props.className}>
              {(codeEl as any).props.children}
            </CodeBlock>
          );
        }
        // Code block sem language definida
        const fallbackCode = Children.toArray(children).find((c) => isValidElement(c));
        return (
          <CodeBlock>
            {isValidElement(fallbackCode) ? (fallbackCode as any).props.children : children}
          </CodeBlock>
        );
      },
    }),
    []
  );
}

export { slugify, extractText };
