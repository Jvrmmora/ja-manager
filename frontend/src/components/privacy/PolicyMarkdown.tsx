import React from 'react';

/**
 * Renderizador mínimo de Markdown para el texto de la política de privacidad.
 * Soporta: encabezados (#, ##, ###), listas (-, 1.), separadores (---),
 * negritas (**texto**) y párrafos. No usa dangerouslySetInnerHTML.
 */

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={`${keyPrefix}-b-${i}`} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={`${keyPrefix}-t-${i}`}>{part}</React.Fragment>;
  });
}

interface PolicyMarkdownProps {
  content: string;
}

const PolicyMarkdown: React.FC<PolicyMarkdownProps> = ({ content }) => {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  let key = 0;

  const flushList = () => {
    if (list.length === 0) return;
    const items = [...list];
    list = [];
    blocks.push(
      <ul
        key={`ul-${key++}`}
        className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-300"
      >
        {items.map((it, i) => (
          <li key={i}>{renderInline(it, `li-${i}`)}</li>
        ))}
      </ul>
    );
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*[-*]\s+/.test(line)) {
      list.push(line.replace(/^\s*[-*]\s+/, ''));
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      list.push(line.replace(/^\s*\d+\.\s+/, ''));
      continue;
    }
    flushList();

    if (!line.trim()) continue;

    if (line.startsWith('### ')) {
      blocks.push(
        <h3
          key={`h-${key++}`}
          className="text-base font-semibold text-gray-900 dark:text-white mt-5 mb-1.5"
        >
          {renderInline(line.slice(4), 'h3')}
        </h3>
      );
    } else if (line.startsWith('## ')) {
      blocks.push(
        <h2
          key={`h-${key++}`}
          className="text-lg font-bold text-gray-900 dark:text-white mt-6 mb-2"
        >
          {renderInline(line.slice(3), 'h2')}
        </h2>
      );
    } else if (line.startsWith('# ')) {
      blocks.push(
        <h1
          key={`h-${key++}`}
          className="text-xl font-bold text-gray-900 dark:text-white mb-3"
        >
          {renderInline(line.slice(2), 'h1')}
        </h1>
      );
    } else if (/^---+$/.test(line.trim())) {
      blocks.push(
        <hr
          key={`hr-${key++}`}
          className="my-4 border-gray-200 dark:border-gray-700"
        />
      );
    } else {
      blocks.push(
        <p
          key={`p-${key++}`}
          className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 mb-2"
        >
          {renderInline(line, 'p')}
        </p>
      );
    }
  }
  flushList();

  return <div>{blocks}</div>;
};

export default PolicyMarkdown;
