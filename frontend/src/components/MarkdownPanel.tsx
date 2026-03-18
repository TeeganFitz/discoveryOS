// MarkdownPanel.tsx — Renders markdown content with a copy button
// Redesigned: max-width prose container, ghost-style copy button

"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownPanelProps {
  content: string;
  label?: string;
}

export default function MarkdownPanel({ content, label }: MarkdownPanelProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative">
      {/* Header: label + copy button */}
      <div className="flex items-center justify-between mb-5">
        {label && (
          <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider">
            {label}
          </h3>
        )}
        <button
          onClick={handleCopy}
          className="text-xs px-2 py-1 rounded-md text-text-muted
                     hover:text-text-secondary hover:bg-surface-overlay
                     transition-all duration-150"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* Markdown — constrained width for readability */}
      <div
        className="prose prose-invert prose-sm max-w-[65ch]
                      prose-headings:text-text-primary prose-headings:font-semibold
                      prose-p:text-text-secondary prose-p:leading-relaxed
                      prose-strong:text-text-primary
                      prose-li:text-text-secondary
                      prose-a:text-accent prose-a:no-underline hover:prose-a:underline
                      prose-code:text-accent prose-code:text-xs
                      prose-pre:bg-surface-raised prose-pre:border prose-pre:border-border
                      prose-th:text-text-primary
                      prose-td:text-text-secondary
                      prose-hr:border-border"
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
