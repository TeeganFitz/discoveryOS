// GenerateButton.tsx — Fires all four subagents and reads the SSE stream
//
// Why not use EventSource? EventSource only supports GET requests.
// Our /generate endpoint is POST, so we use fetch() + getReader() to
// manually read the Server-Sent Events stream.

"use client";

import { useState } from "react";

// Each SSE event from the backend looks like this
interface SSEEvent {
  type: "context_file" | "proposal" | "diagram" | "email" | "done";
  content?: string;
}

interface GenerateButtonProps {
  sessionId: string;
  // Called for each SSE event — page.tsx uses this to update the output tabs
  onEvent: (event: SSEEvent) => void;
  // Called when all four agents are done
  onComplete: () => void;
}

export default function GenerateButton({
  sessionId,
  onEvent,
  onComplete,
}: GenerateButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerate() {
    setIsGenerating(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      // POST to /generate — this returns an SSE stream
      const response = await fetch(`${apiUrl}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Generate request failed");
      }

      // Read the stream manually using the Streams API
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = ""; // Holds incomplete chunks between reads

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode the binary chunk into text and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by double newlines (\n\n)
        const events = buffer.split("\n\n");
        // The last item might be incomplete — keep it in the buffer
        buffer = events.pop() || "";

        for (const event of events) {
          // Each SSE line starts with "data: " followed by JSON
          if (event.startsWith("data: ")) {
            const json = event.slice(6); // Remove "data: " prefix
            const parsed: SSEEvent = JSON.parse(json);

            if (parsed.type === "done") {
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
      disabled={isGenerating}
      className="w-full py-3 rounded-lg text-sm font-medium transition-colors
                 bg-green-600 text-white hover:bg-green-500
                 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed"
    >
      {isGenerating ? (
        <span className="flex items-center justify-center gap-2">
          {/* Simple spinner using a spinning border */}
          <span className="w-4 h-4 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
          Generating... this takes 15-30s
        </span>
      ) : (
        "Generate All Documents"
      )}
    </button>
  );
}
