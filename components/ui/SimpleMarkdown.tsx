
import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface SimpleMarkdownProps {
  content: string;
}

export const SimpleMarkdown: React.FC<SimpleMarkdownProps> = ({ content }) => {
  // Track if we've seen the first image for hero treatment
  let isFirstImage = true;

  const components: Components = useMemo(() => ({
    h1: ({ children }) => (
      <h1 className="text-2xl font-bold text-white mt-6 mb-4 border-b border-gray-700 pb-2">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-xl font-bold text-white mt-5 mb-3">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-lg font-bold text-white mt-4 mb-2">{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-base font-bold text-white mt-3 mb-2">{children}</h4>
    ),
    p: ({ children }) => (
      <p className="mb-4 leading-relaxed text-gray-300">{children}</p>
    ),
    strong: ({ children }) => (
      <strong className="text-white font-bold">{children}</strong>
    ),
    em: ({ children }) => (
      <em className="italic text-gray-400">{children}</em>
    ),
    code: ({ children, className }) => {
      // Check if this is inline code (no className with language-)
      const isInline = !className;
      if (isInline) {
        return (
          <code className="bg-gray-800 px-1 rounded font-mono text-sm text-pink-300 border border-gray-700">
            {children}
          </code>
        );
      }
      // Block code
      return (
        <code className={className}>{children}</code>
      );
    },
    pre: ({ children }) => (
      <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto my-4 border border-gray-700">
        {children}
      </pre>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:text-blue-300 hover:underline"
      >
        {children}
      </a>
    ),
    img: ({ src, alt }) => {
      const heroTreatment = isFirstImage;
      if (isFirstImage) isFirstImage = false;

      if (heroTreatment) {
        return (
          <figure className="my-6">
            <img
              src={src}
              alt={alt || ''}
              className="w-full h-auto rounded-lg shadow-lg"
              loading="eager"
            />
            {alt && (
              <figcaption className="text-center text-xs text-gray-500 mt-2 italic">
                {alt}
              </figcaption>
            )}
          </figure>
        );
      }

      return (
        <img
          src={src}
          alt={alt || ''}
          className="max-w-full h-auto rounded-lg shadow-md my-4 mx-auto block"
          loading="lazy"
        />
      );
    },
    ul: ({ children }) => (
      <ul className="ml-6 mb-4 space-y-1 list-disc">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="ml-6 mb-4 space-y-1 list-decimal">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="text-gray-300">{children}</li>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto my-6 border border-gray-700 rounded-lg shadow-sm">
        <table className="min-w-full text-left text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-gray-800 text-gray-200 font-semibold uppercase tracking-wider text-xs">
        {children}
      </thead>
    ),
    tbody: ({ children }) => (
      <tbody className="divide-y divide-gray-700">{children}</tbody>
    ),
    tr: ({ children }) => (
      <tr className="hover:bg-gray-800/50 transition-colors">{children}</tr>
    ),
    th: ({ children }) => (
      <th className="px-4 py-3 border-b border-gray-700">{children}</th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-3 text-gray-300 whitespace-pre-wrap">{children}</td>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-gray-600 pl-4 my-4 italic text-gray-400">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="border-gray-700 my-6" />,
  }), []);

  // Handle image placeholders before passing to ReactMarkdown
  const processedContent = useMemo(() => {
    if (!content) return '';

    // Convert image placeholders to a visible format
    return content.replace(
      /\[IMAGE:\s*([^|]+)\s*\|\s*alt="([^"]+)"\]/g,
      '\n\n> 📷 **Image Placeholder**\n> $1\n> *Alt: $2*\n\n'
    );
  }, [content]);

  if (!content) return null;

  return (
    <div className="simple-markdown-container">
      <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};
