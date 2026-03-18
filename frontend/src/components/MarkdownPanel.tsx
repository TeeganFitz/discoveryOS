// MarkdownPanel.tsx — Renders markdown content with a copy button
// Used for three of the four output tabs: Context File, Proposal, and Email.
// Uses react-markdown to convert markdown text into styled HTML.

"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownPanelProps {
  content: string; // The raw markdown string to render
  label?: string; // Optional label shown above the content
}

export default function MarkdownPanel({ content, label }: MarkdownPanelProps) {
  const [copied, setCopied] = useState(false);

  // Copy the raw markdown to clipboard so user can paste into a doc
  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
  }

  return (
    <div className="relative">
      {/* Header row: label + copy button */}
      <div className="flex items-center justify-between mb-4">
        {label && (
          <h3 className="text-sm font-medium text-zinc-400">{label}</h3>
        )}
        <button
          onClick={handleCopy}
          className="text-xs px-3 py-1 rounded bg-zinc-800 text-zinc-300
                     hover:bg-zinc-700 transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Markdown content — prose-invert makes headings/text light for dark bg */}
      {/* remarkGfm adds support for tables, strikethrough, task lists */}
      <div
        className="prose prose-invert prose-sm max-w-none
                      prose-headings:text-zinc-100
                      prose-p:text-zinc-300
                      prose-strong:text-zinc-100
                      prose-li:text-zinc-300
                      prose-a:text-blue-400
                      prose-code:text-blue-300
                      prose-pre:bg-zinc-900
                      prose-th:text-zinc-200
                      prose-td:text-zinc-300"
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
