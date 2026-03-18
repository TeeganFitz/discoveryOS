// TranscriptInput.tsx — The first screen the user sees
// A big textarea where they paste their discovery call transcript,
// and a button to start the debrief conversation with the agent.

"use client";

import { useState } from "react";

interface TranscriptInputProps {
  // Called when user clicks "Start Debrief" — passes the transcript text up to page.tsx
  onSubmit: (transcript: string) => void;
}

export default function TranscriptInput({ onSubmit }: TranscriptInputProps) {
  const [transcript, setTranscript] = useState("");

  function handleSubmit() {
    // Don't submit empty transcripts
    if (!transcript.trim()) return;
    onSubmit(transcript.trim());
  }

  return (
    <div className="flex flex-col h-full p-6">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-100">
          Paste Your Transcript
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Zoom summary, Granola notes, manual notes — anything from the call.
        </p>
      </div>

      {/* Big textarea — takes up most of the space */}
      <textarea
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        placeholder="Paste your discovery call transcript here..."
        className="flex-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg
                   p-4 text-sm text-zinc-200 placeholder-zinc-600
                   resize-none focus:outline-none focus:border-zinc-600
                   font-mono leading-relaxed"
      />

      {/* Submit button — disabled when transcript is empty */}
      <button
        onClick={handleSubmit}
        disabled={!transcript.trim()}
        className="mt-4 w-full py-3 rounded-lg text-sm font-medium
                   transition-colors
                   bg-blue-600 text-white hover:bg-blue-500
                   disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed"
      >
        Start Debrief
      </button>
    </div>
  );
}
