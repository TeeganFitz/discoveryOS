// page.tsx — Main page for DiscoveryOS
//
// State machine with four phases:
//   1. "input"      — User pastes their transcript
//   2. "chat"       — Agent asks follow-up questions
//   3. "generating" — Four subagents are running
//   4. "done"       — All outputs are ready
//
// Layout: top bar + two-panel grid
//   Left panel  (420px fixed) = transcript input or chat
//   Right panel (fills rest)  = output tabs

"use client";

import { useState } from "react";
import TranscriptInput from "@/components/TranscriptInput";
import Chat from "@/components/Chat";
import OutputTabs from "@/components/OutputTabs";

interface Outputs {
  contextFile?: string;
  proposal?: string;
  diagram?: string;
  email?: string;
}

export default function Page() {
  const [phase, setPhase] = useState<"input" | "chat" | "generating" | "done">(
    "input",
  );
  const [sessionId] = useState(() => crypto.randomUUID());
  const [transcript, setTranscript] = useState("");
  const [outputs, setOutputs] = useState<Outputs>({});
  const [generating, setGenerating] = useState(false);

  function handleTranscriptSubmit(text: string) {
    setTranscript(text);
    setPhase("chat");
  }

  function handleReadyToGenerate() {
    // GenerateButton appears in chat — no phase change yet
  }

  function handleGenerateEvent(event: { type: string; content?: string }) {
    setGenerating(true);
    setPhase("generating");

    const keyMap: Record<string, keyof Outputs> = {
      context_file: "contextFile",
      proposal: "proposal",
      diagram: "diagram",
      email: "email",
    };

    const key = keyMap[event.type];
    if (key && event.content) {
      setOutputs((prev) => ({ ...prev, [key]: event.content }));
    }
  }

  function handleGenerateComplete() {
    setGenerating(false);
    setPhase("done");
  }

  return (
    <div className="flex flex-col h-screen">
      {/* ── Top Bar ── */}
      <header className="flex items-center justify-between px-5 h-12 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold tracking-tight text-text-primary">
            DiscoveryOS
          </span>
          <span className="text-xs text-text-muted">/</span>
          <span className="text-xs text-text-muted">
            {phase === "input" && "New session"}
            {phase === "chat" && "Debrief"}
            {phase === "generating" && "Generating"}
            {phase === "done" && "Complete"}
          </span>
        </div>
        <div
          className="text-xs text-text-muted font-mono"
          suppressHydrationWarning
        >
          {sessionId.slice(0, 8)}
        </div>
      </header>

      {/* ── Main Content: two-panel grid ── */}
      <div className="flex-1 grid grid-cols-[420px_1fr] min-h-0">
        {/* Left Panel */}
        <div className="border-r border-border flex flex-col min-h-0">
          {phase === "input" && (
            <TranscriptInput onSubmit={handleTranscriptSubmit} />
          )}

          {(phase === "chat" || phase === "generating" || phase === "done") && (
            <Chat
              sessionId={sessionId}
              transcript={transcript}
              onReadyToGenerate={handleReadyToGenerate}
              onGenerateEvent={handleGenerateEvent}
              onGenerateComplete={handleGenerateComplete}
            />
          )}
        </div>

        {/* Right Panel */}
        <div className="flex flex-col min-h-0">
          {phase === "input" ? (
            <div className="flex flex-col items-center justify-center h-full px-12">
              <h2 className="text-xl font-semibold text-text-primary mb-3">
                Paste a transcript to begin
              </h2>
              <p className="text-sm text-text-muted text-center max-w-md leading-relaxed">
                An AI agent will read it, ask the questions it didn&apos;t
                answer, then generate your context file, proposal, diagram, and
                follow-up email simultaneously.
              </p>
            </div>
          ) : (
            <OutputTabs outputs={outputs} generating={generating} />
          )}
        </div>
      </div>
    </div>
  );
}
