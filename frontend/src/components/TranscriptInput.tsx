// TranscriptInput.tsx — First screen: paste your transcript
// Redesigned with dashed border (signals paste zone), word count, and cleaner copy

"use client";

import { useState } from "react";

interface TranscriptInputProps {
  onSubmit: (transcript: string) => void;
}

export default function TranscriptInput({ onSubmit }: TranscriptInputProps) {
  const [transcript, setTranscript] = useState("");

  function handleSubmit() {
    if (!transcript.trim()) return;
    onSubmit(transcript.trim());
  }

  // Count words for the footer indicator
  const wordCount = transcript.trim()
    ? transcript.trim().split(/\s+/).length
    : 0;

  return (
    <div className="flex flex-col h-full p-5">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-text-primary">
          Paste your transcript
        </h2>
        <p className="text-sm text-text-muted mt-1">
          Zoom summary, Granola notes, or raw call notes.
        </p>
      </div>

      {/* Textarea with dashed border — signals "paste zone" */}
      <div className="flex-1 relative">
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Paste discovery call transcript here..."
          className="w-full h-full bg-transparent border border-dashed border-border
                     rounded-lg p-4 text-sm text-text-primary placeholder-text-muted
                     resize-none focus:outline-none focus:border-text-muted
                     font-mono leading-relaxed transition-colors duration-150"
        />

        {/* Word count — bottom right of textarea */}
        {wordCount > 0 && (
          <div className="absolute bottom-3 right-3 text-xs text-text-muted">
            {wordCount} words
          </div>
        )}
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!transcript.trim()}
        className="mt-4 w-full py-2.5 rounded-md text-sm font-medium
                   bg-accent text-white
                   hover:bg-accent-hover active:scale-[0.98]
                   disabled:opacity-30 disabled:cursor-not-allowed
                   transition-all duration-150"
      >
        Begin Analysis
      </button>
    </div>
  );
}
