import React, { useEffect, useRef } from 'react';
import { CanvasNode } from '../types';

// Type definition for Prism global
declare global {
  interface Window {
    Prism: any;
  }
}

interface MarkdownRendererProps {
  content: string;
  onNodeLinkClick?: (id: string) => void;
  className?: string;
  compact?: boolean;
  nodes?: CanvasNode[];
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, onNodeLinkClick, className = '', compact = false, nodes }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Trigger Prism highlighting on content change
  useEffect(() => {
    if (window.Prism && containerRef.current) {
      window.Prism.highlightAllUnder(containerRef.current);
    }
  }, [content]);

  // --- Inline Parsing (Bold, Italic, Code, Links) ---
  const renderInline = (text: string, keyPrefix: string) => {
    // Regex logic to tokenize inline elements
    // Priority: NodeLink > Image > Link > Bold > Italic > Code
    const parts = text.split(/(\[\[node:[^|]+\|[^\]]+\]\]|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

    return parts.map((part, i) => {
      const key = `${keyPrefix}-${i}`;

      // 1. Node Link: [[node:ID|Title]]
      const nodeMatch = part.match(/^\[\[node:([^|]+)\|([^\]]+)\]\]$/);
      if (nodeMatch) {
        const nodeId = nodeMatch[1];
        const staticTitle = nodeMatch[2];
        const currentNode = nodes?.find(n => n.id === nodeId);
        const displayTitle = currentNode ? currentNode.title : staticTitle;

        return (
          <button
            key={key}
            onClick={(e) => { e.stopPropagation(); onNodeLinkClick?.(nodeId); }}
            className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-accent-primary/10 text-accent-primary hover:bg-accent-primary hover:text-white transition-colors text-xs font-medium align-middle border border-accent-primary/20 mx-0.5"
          >
            <i className="fa-solid fa-cube text-[10px]"></i>
            {displayTitle}
          </button>
        );
      }

      // 2. Image: ![alt](url)
      const imgMatch = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imgMatch) {
          return (
              <span key={key} className={`block rounded-lg overflow-hidden border border-border-subtle shadow-sm bg-bg-main/50 ${compact ? 'my-2' : 'my-3'}`}>
                  <img src={imgMatch[2]} alt={imgMatch[1]} className="max-w-full h-auto mx-auto object-contain max-h-[300px]" />
                  {imgMatch[1] && <span className="block text-center text-xs text-text-secondary mt-2 mb-1">{imgMatch[1]}</span>}
              </span>
          );
      }

      // 3. Web Link: [Title](URL)
      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        return (
          <a
            key={key}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline underline-offset-2 break-all font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            {linkMatch[1]}
          </a>
        );
      }

      // 4. Bold: **text**
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={key} className="font-bold">{part.slice(2, -2)}</strong>;
      }

      // 5. Italic: *text*
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={key} className="italic opacity-90">{part.slice(1, -1)}</em>;
      }

      // 6. Code: `text`
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={key} className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded text-[0.85em] font-mono border border-border-subtle/50">{part.slice(1, -1)}</code>;
      }

      return <span key={key}>{part}</span>;
    });
  };

  // --- Block Parsing ---
  const renderBlock = (block: any, index: number) => {
    switch (block.type) {
      case 'header': {
        const level = block.content.match(/^#+/)[0].length;
        const text = block.content.replace(/^#+\s*/, '');
        
        // Compact mode headers are significantly smaller
        if (compact) {
             const sizes: Record<number, string> = {
                1: 'text-sm font-bold mt-3 mb-1',
                2: 'text-xs font-bold mt-2 mb-1 uppercase tracking-wide opacity-80',
                3: 'text-xs font-bold mt-2 mb-1',
                4: 'text-xs font-semibold mt-1 mb-0.5',
             };
             return <div key={index} className={sizes[level] || sizes[1]}>{renderInline(text, `h-${index}`)}</div>;
        }

        const sizes: Record<number, string> = {
          1: 'text-3xl font-bold mt-8 mb-4 pb-2 border-b border-border-subtle text-text-primary',
          2: 'text-2xl font-bold mt-6 mb-3 text-text-primary',
          3: 'text-xl font-bold mt-5 mb-2 text-text-primary',
          4: 'text-lg font-bold mt-4 mb-2 text-text-primary',
          5: 'text-base font-bold mt-3 mb-1 text-text-primary',
          6: 'text-sm font-bold mt-3 mb-1 text-text-secondary uppercase tracking-wider',
        };
        return <div key={index} className={sizes[level] || sizes[4]}>{renderInline(text, `h-${index}`)}</div>;
      }

      case 'list':
        return (
          <ul key={index} className={`${compact ? 'my-1 space-y-0.5' : 'my-3 space-y-1'} pl-2`}>
            {block.items.map((item: string, i: number) => {
              const content = item.replace(/^(\s*)([-*]|\d+\.)\s/, '');
              const isTask = item.trim().match(/^[-*]\s\[([ x])\]/);
              
              // Indentation logic
              const spaces = item.match(/^\s*/)?.[0].length || 0;
              const indentClass = spaces >= 4 ? 'ml-6' : spaces >= 2 ? 'ml-3' : 'ml-0';

              if (isTask) {
                  const checked = isTask[1] === 'x';
                  const taskContent = content.replace(/^\[([ x])\]\s/, '');
                  return (
                      <li key={i} className={`flex items-start gap-2 ${indentClass} ${checked ? 'opacity-60' : ''}`}>
                           <div className={`mt-[0.3em] w-3 h-3 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-accent-primary border-accent-primary' : 'border-text-secondary'}`}>
                                {checked && <i className="fa-solid fa-check text-white text-[8px]"></i>}
                           </div>
                           <span className={`${compact ? 'text-sm' : 'text-base'} leading-relaxed ${checked ? 'line-through decoration-text-secondary' : ''}`}>
                               {renderInline(taskContent, `li-${index}-${i}`)}
                           </span>
                      </li>
                  );
              }

              return (
                <li key={i} className={`flex items-start gap-2 ${compact ? 'text-sm' : 'text-base'} leading-relaxed ${indentClass}`}>
                  <div className={`rounded-full bg-current opacity-40 mt-2 shrink-0 ${compact ? 'w-1 h-1' : 'w-1.5 h-1.5'}`}></div>
                  <span className="opacity-90">{renderInline(content, `li-${index}-${i}`)}</span>
                </li>
              );
            })}
          </ul>
        );

      case 'table':
        try {
          const headers = block.lines[0].split('|').slice(1, -1).map((h: string) => h.trim());
          const rows = block.lines.slice(2).map((row: string) => row.split('|').slice(1, -1).map((c: string) => c.trim()));
          return (
            <div key={index} className={`${compact ? 'my-2' : 'my-5'} overflow-x-auto rounded-lg border border-border-subtle shadow-sm bg-bg-surface/50`}>
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-bg-main text-xs uppercase font-semibold text-text-secondary">
                  <tr>
                    {headers.map((h: string, i: number) => (
                      <th key={i} className={`border-b border-border-subtle whitespace-nowrap ${compact ? 'px-2 py-1.5' : 'px-4 py-3'}`}>{renderInline(h, `th-${index}-${i}`)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {rows.map((row: string[], i: number) => (
                    <tr key={i} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      {row.map((cell: string, j: number) => (
                        <td key={j} className={`${compact ? 'px-2 py-1.5 text-xs' : 'px-4 py-3 text-base'} opacity-90`}>{renderInline(cell, `td-${index}-${i}-${j}`)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        } catch (e) {
          return null;
        }

      case 'blockquote':
        return (
          <blockquote key={index} className={`border-l-4 border-accent-primary/40 pl-4 py-1 ${compact ? 'my-2 text-sm' : 'my-5 text-base'} bg-accent-primary/5 rounded-r-lg italic text-text-secondary/90 leading-relaxed`}>
            {block.content.map((line: string, i: number) => (
              <div key={i}>{renderInline(line.replace(/^>\s?/, ''), `bq-${index}-${i}`)}</div>
            ))}
          </blockquote>
        );

      case 'codeblock':
          return (
             <div key={index} className={`${compact ? 'my-2' : 'my-5'} rounded-lg overflow-hidden border border-border-subtle bg-bg-main/50 group/code shadow-sm`}>
                <div className="flex items-center justify-between px-3 py-1.5 bg-black/5 dark:bg-white/5 border-b border-border-subtle">
                    <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">{block.lang || 'TEXT'}</span>
                    <button
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(block.code); }}
                        className="text-[10px] font-medium text-text-secondary hover:text-text-primary opacity-0 group-hover/code:opacity-100 transition-opacity flex items-center gap-1.5"
                    >
                        <i className="fa-regular fa-copy"></i> Copy
                    </button>
                </div>
                <div className="relative">
                    <pre className={`${compact ? 'p-3 text-xs' : 'p-4 text-sm'} overflow-x-auto font-mono text-text-primary bg-bg-surface/50 whitespace-pre custom-scrollbar leading-relaxed`}>
                        <code className={`language-${block.lang || 'none'}`}>{block.code}</code>
                    </pre>
                </div>
            </div>
          );

      case 'hr':
        return <hr key={index} className={`${compact ? 'my-3' : 'my-8'} border-t border-border-subtle`} />;

      case 'paragraph':
      default:
        return (
          <div key={index} className={`${compact ? 'my-1.5 text-sm' : 'my-3 text-base'} leading-relaxed text-text-primary/90 whitespace-pre-wrap`}>
            {block.content.map((line: string, i: number) => (
              <React.Fragment key={i}>
                {renderInline(line, `p-${index}-${i}`)}
                {i < block.content.length - 1 && '\n'}
              </React.Fragment>
            ))}
          </div>
        );
    }
  };

  // --- Parsing Core ---
  const parseContent = (text: string) => {
    // First, split by code blocks to avoid processing markdown inside them
    const parts = text.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, partIndex) => {
        if (part.startsWith('```')) {
            const lines = part.split('\n');
            const lang = lines[0].slice(3).trim();
            const code = lines.slice(1, -1).join('\n');
            return renderBlock({ type: 'codeblock', lang, code }, partIndex);
        }

        // Process other blocks
        const lines = part.split('\n');
        const blocks: any[] = [];
        let currentBlock: any = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // 1. Headers
            if (line.match(/^#{1,6}\s/)) {
                if (currentBlock) blocks.push(currentBlock);
                blocks.push({ type: 'header', content: line });
                currentBlock = null;
                continue;
            }

            // 2. HR
            if (line.trim().match(/^---$/) || line.trim().match(/^\*\*\*$/)) {
                if (currentBlock) blocks.push(currentBlock);
                blocks.push({ type: 'hr' });
                currentBlock = null;
                continue;
            }

            // 3. Tables
            if (line.trim().startsWith('|')) {
                if (currentBlock?.type !== 'table') {
                    if (currentBlock) blocks.push(currentBlock);
                    currentBlock = { type: 'table', lines: [line] };
                } else {
                    currentBlock.lines.push(line);
                }
                continue;
            }

            // 4. Lists (including nested and tasks)
            if (line.match(/^(\s*)([-*]|\d+\.)\s/)) {
                if (currentBlock?.type !== 'list') {
                    if (currentBlock) blocks.push(currentBlock);
                    currentBlock = { type: 'list', items: [line] };
                } else {
                    currentBlock.items.push(line);
                }
                continue;
            }

            // 5. Blockquotes
            if (line.trim().startsWith('>')) {
                if (currentBlock?.type !== 'blockquote') {
                    if (currentBlock) blocks.push(currentBlock);
                    currentBlock = { type: 'blockquote', content: [line] };
                } else {
                    currentBlock.content.push(line);
                }
                continue;
            }

            // 6. Paragraphs / Empty Lines
            if (!line.trim()) {
                if (currentBlock) {
                    blocks.push(currentBlock);
                    currentBlock = null;
                }
            } else {
                if (currentBlock?.type === 'paragraph') {
                    currentBlock.content.push(line);
                } else {
                    if (currentBlock) blocks.push(currentBlock);
                    currentBlock = { type: 'paragraph', content: [line] };
                }
            }
        }
        if (currentBlock) blocks.push(currentBlock);

        return (
            <div key={partIndex}>
                {blocks.map((b, i) => renderBlock(b, i))}
            </div>
        );
    });
  };

  return <div ref={containerRef} className={`prose-content ${className}`}>{parseContent(content)}</div>;
};