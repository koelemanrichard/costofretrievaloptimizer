
import React, { useMemo } from 'react';

interface SimpleMarkdownProps {
  content: string;
}

export const SimpleMarkdown: React.FC<SimpleMarkdownProps> = ({ content }) => {
  const html = useMemo(() => {
    if (!content) return '';

    // 1. Basic HTML Escaping to prevent XSS from raw input
    let text = content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const lines = text.split('\n');
    let inTable = false;
    const processedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // --- Block Level Elements ---

        // Headers
        if (line.startsWith('# ')) {
            line = `<h1 class="text-2xl font-bold text-white mt-6 mb-4 border-b border-gray-700 pb-2">${line.substring(2)}</h1>`;
        } else if (line.startsWith('## ')) {
            line = `<h2 class="text-xl font-bold text-white mt-5 mb-3">${line.substring(3)}</h2>`;
        } else if (line.startsWith('### ')) {
            line = `<h3 class="text-lg font-bold text-white mt-4 mb-2">${line.substring(4)}</h3>`;
        } else if (line.startsWith('#### ')) {
            line = `<h4 class="text-base font-bold text-white mt-3 mb-2">${line.substring(5)}</h4>`;
        }

        // --- Inline Formatting (Applied to all lines) ---

        // Bold (**text**)
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>');
        
        // Italic (*text*)
        line = line.replace(/\*([^*]+)\*/g, '<em class="italic text-gray-400">$1</em>');
        
        // Inline Code (`text`)
        line = line.replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-1 rounded font-mono text-sm text-pink-300 border border-gray-700">$1</code>');
        
        // Links ([text](url))
        line = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 hover:underline">$1</a>');

        // --- Lists ---

        if (line.trim().startsWith('- ')) {
            line = `<div class="flex items-start gap-2 ml-2 mb-1"><span class="text-blue-500 mt-1.5">•</span><span class="text-gray-300">${line.trim().substring(2)}</span></div>`;
        } else if (line.trim().match(/^\d+\.\s/)) {
             // Extract number
             const match = line.trim().match(/^(\d+)\.\s/);
             const num = match ? match[1] : '•';
             const content = line.trim().replace(/^\d+\.\s/, '');
             line = `<div class="flex items-start gap-2 ml-2 mb-1"><span class="text-gray-500 font-mono text-xs mt-1">${num}.</span><span class="text-gray-300">${content}</span></div>`;
        }

        // --- Tables ---
        
        // Detect if line is part of a table (starts and ends with | or contains multiple |)
        const isTableLine = line.trim().startsWith('|') && (line.trim().endsWith('|') || line.split('|').length > 2);

        if (isTableLine) {
            // Filter empty cells caused by leading/trailing pipes
            const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => {
                 // Keep internal empty cells, but remove the very first/last if they are empty strings resulting from split
                 if (idx === 0 && c === '') return false;
                 if (idx === arr.length - 1 && c === '') return false;
                 return true;
            });

            // Check if this is a separator line (e.g. |---|---|)
            const isSeparator = cells.every(c => c.match(/^[-:]+$/));

            if (isSeparator) {
                if (!inTable) { 
                     processedLines.push('<div class="overflow-x-auto my-6 border border-gray-700 rounded-lg shadow-sm"><table class="min-w-full text-left text-sm">');
                     inTable = true;
                }
                continue; 
            }

            if (!inTable) {
                processedLines.push('<div class="overflow-x-auto my-6 border border-gray-700 rounded-lg shadow-sm"><table class="min-w-full text-left text-sm">');
                inTable = true;
                
                let headerHtml = '<thead class="bg-gray-800 text-gray-200 font-semibold uppercase tracking-wider text-xs"><tr>';
                cells.forEach(cell => {
                    headerHtml += `<th class="px-4 py-3 border-b border-gray-700">${cell}</th>`;
                });
                headerHtml += '</tr></thead><tbody class="divide-y divide-gray-700">';
                processedLines.push(headerHtml);

            } else {
                let rowHtml = '<tr class="hover:bg-gray-800/50 transition-colors">';
                cells.forEach(cell => {
                    rowHtml += `<td class="px-4 py-3 text-gray-300 whitespace-pre-wrap">${cell}</td>`;
                });
                rowHtml += '</tr>';
                processedLines.push(rowHtml);
            }
        } else {
            if (inTable) {
                processedLines.push('</tbody></table></div>');
                inTable = false;
            }

            if (!line.startsWith('<h') && !line.startsWith('<div')) {
                if (line.trim() === '') {
                    line = '<div class="h-4"></div>';
                } else {
                    line = `<p class="mb-4 leading-relaxed text-gray-300">${line}</p>`;
                }
            }
            processedLines.push(line);
        }
    }

    if (inTable) {
        processedLines.push('</tbody></table></div>');
    }

    return processedLines.join('\n');

  }, [content]);

  return <div className="simple-markdown-container" dangerouslySetInnerHTML={{ __html: html }} />;
};
