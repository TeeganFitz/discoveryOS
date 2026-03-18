// DiagramPanel.tsx — Displays the Excalidraw JSON output
// Redesigned: cleaner header, instruction text, consistent copy button

"use client";

import { useState } from "react";
import { toast } from "sonner";

interface DiagramPanelProps {
  content: string;
}

export default function DiagramPanel({ content }: DiagramPanelProps) {
  const [copied, setCopied] = useState(false);

  let formatted: string;
  let isValid = true;
  try {
    const parsed = JSON.parse(content);
    formatted = JSON.stringify(parsed, null, 2);
  } catch {
    formatted = content;
    isValid = false;
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(formatted);
    setCopied(true);
    toast.success("JSON copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Diagram
          </h3>
          {!isValid && (
            <p className="text-xs text-error mt-1">
              Invalid JSON — showing raw output
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="text-xs px-2 py-1 rounded-md text-text-muted
                       hover:text-text-secondary hover:bg-surface-overlay
                       transition-all duration-150"
          >
            {copied ? "Copied" : "Copy JSON"}
          </button>
          <a
            href="https://excalidraw.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-2 py-1 rounded-md text-text-muted
                       hover:text-text-secondary hover:bg-surface-overlay
                       transition-all duration-150"
          >
            Open Excalidraw
          </a>
        </div>
      </div>

      {/* Instruction */}
      <p className="text-xs text-text-muted mb-3">
        Copy the JSON below and paste it into Excalidraw to view the diagram.
      </p>

      {/* JSON display */}
      <pre
        className="bg-surface-raised border border-border rounded-md p-4
                      overflow-auto max-h-[600px] text-xs leading-relaxed"
      >
        <code className="text-text-secondary">{formatted}</code>
      </pre>
    </div>
  );
}
