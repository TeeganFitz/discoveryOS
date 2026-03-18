// GenerateButton.tsx — Fires all four subagents and reads the SSE stream
// Redesigned: accent color (not green), tactile press, progress text

"use client";

import { useState } from "react";

interface SSEEvent {
  type: "context_file" | "proposal" | "diagram" | "email" | "done";
  content?: string;
}

interface GenerateButtonProps {
  sessionId: string;
  onEvent: (event: SSEEvent) => void;
  onComplete: () => void;
}

export default function GenerateButton({
  sessionId,
  onEvent,
  onComplete,
}: GenerateButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);

  async function handleGenerate() {
    setIsGenerating(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const response = await fetch(`${apiUrl}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Generate request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
          if (event.startsWith("data: ")) {
            const json = event.slice(6);
            const parsed: SSEEvent = JSON.parse(json);

            if (parsed.type === "done") {
              setIsDone(true);
              onComplete();
            } else {
              onEvent(parsed);
            }
          }
        }
      }
    } catch (error) {
      console.error("Generate failed:", error);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={isGenerating || isDone}
      className={`w-full py-2.5 rounded-md text-sm font-medium transition-all duration-150
        ${
          isDone
            ? "bg-surface-raised text-text-muted border border-border cursor-default"
            : "bg-accent text-white hover:bg-accent-hover active:scale-[0.98] disabled:opacity-60"
        }`}
    >
      {isDone ? (
        "Documents generated"
      ) : isGenerating ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Running 4 agents...
        </span>
      ) : (
        "Generate all documents"
      )}
    </button>
  );
}
