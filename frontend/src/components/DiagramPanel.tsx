// DiagramPanel.tsx — Displays the Excalidraw JSON output
// For the hackathon, we show formatted JSON with a copy button.
// The user can paste this into excalidraw.com to see the visual diagram.
// Post-hackathon: swap this for the actual @excalidraw/excalidraw component.

"use client";

import { useState } from "react";

interface DiagramPanelProps {
  content: string; // Raw JSON string from the diagrammer agent
}

export default function DiagramPanel({ content }: DiagramPanelProps) {
  const [copied, setCopied] = useState(false);

  // Try to parse and pretty-print the JSON for readability
  let formatted: string;
  let isValid = true;
  try {
    const parsed = JSON.parse(content);
    formatted = JSON.stringify(parsed, null, 2);
  } catch {
    // If the JSON is malformed, show it raw with a warning
    formatted = content;
    isValid = false;
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      {/* Action bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-zinc-400">
            Excalidraw Diagram
          </h3>
          {!isValid && (
            <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
              Invalid JSON — showing raw output
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="text-xs px-3 py-1 rounded bg-zinc-800 text-zinc-300
                       hover:bg-zinc-700 transition-colors"
          >
            {copied ? "Copied!" : "Copy JSON"}
          </button>
          {/* Link to excalidraw.com — user pastes the JSON there */}
          <a
            href="https://excalidraw.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1 rounded bg-zinc-800 text-zinc-300
                       hover:bg-zinc-700 transition-colors"
          >
            Open Excalidraw
          </a>
        </div>
      </div>

      {/* JSON display — styled code block with horizontal scroll */}
      <pre
        className="bg-zinc-900 border border-zinc-800 rounded-lg p-4
                      overflow-auto max-h-[600px] text-xs leading-relaxed"
      >
        <code className="text-zinc-300">{formatted}</code>
      </pre>
    </div>
  );
}
