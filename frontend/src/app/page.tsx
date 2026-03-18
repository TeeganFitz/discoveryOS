// page.tsx — Main page for DiscoveryOS
//
// This is the central orchestrator of the UI. It manages a simple
// state machine with four phases:
//   1. "input"      — User pastes their transcript
//   2. "chat"       — Agent asks follow-up questions
//   3. "generating" — Four subagents are running
//   4. "done"       — All outputs are ready
//
// Layout: two-panel split
//   Left panel  = transcript input or chat conversation
//   Right panel = four output tabs (empty until generation starts)

"use client";

import { useState } from "react";
import TranscriptInput from "@/components/TranscriptInput";
import Chat from "@/components/Chat";
import OutputTabs from "@/components/OutputTabs";

// Shape of the four outputs from the subagents
interface Outputs {
  contextFile?: string;
  proposal?: string;
  diagram?: string;
  email?: string;
}

export default function Page() {
  // Phase state machine — controls what the user sees
  const [phase, setPhase] = useState<"input" | "chat" | "generating" | "done">(
    "input",
  );

  // Unique session ID — stays the same for the entire user session
  const [sessionId] = useState(() => crypto.randomUUID());

  // The raw transcript text the user pasted
  const [transcript, setTranscript] = useState("");

  // Outputs from the four subagents, populated as SSE events arrive
  const [outputs, setOutputs] = useState<Outputs>({});

  // Whether the generate process is running (for loading states)
  const [generating, setGenerating] = useState(false);

  // ── Event Handlers ──

  // Called when user submits their transcript
  function handleTranscriptSubmit(text: string) {
    setTranscript(text);
    setPhase("chat"); // Move to the chat phase
  }

  // Called when the orchestrator agent says it has enough info
  function handleReadyToGenerate() {
    // The GenerateButton will appear in the chat — no phase change yet
    // Phase changes to "generating" when the user actually clicks Generate
  }

  // Called for each SSE event during generation
  // Maps backend event types to our output state keys
  function handleGenerateEvent(event: { type: string; content?: string }) {
    setGenerating(true);
    setPhase("generating");

    // Map the SSE event type to our output object keys
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

  // Called when all four agents are done
  function handleGenerateComplete() {
    setGenerating(false);
    setPhase("done");
  }

  return (
    <div className="flex h-screen">
      {/* ── Left Panel: Input or Chat ── */}
      <div className="w-1/2 border-r border-zinc-800 flex flex-col">
        {/* Header bar */}
        <div className="px-6 py-4 border-b border-zinc-800">
          <h1 className="text-lg font-semibold">DiscoveryOS</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {phase === "input" && "Paste your discovery call transcript"}
            {phase === "chat" && "Answer the agent's questions"}
            {phase === "generating" && "Generating documents..."}
            {phase === "done" && "Documents ready"}
          </p>
        </div>

        {/* Phase-dependent content */}
        <div className="flex-1 overflow-hidden">
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
      </div>

      {/* ── Right Panel: Output Tabs ── */}
      <div className="w-1/2 flex flex-col">
        {phase === "input" ? (
          // Before chat starts, show a welcome message
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="text-4xl mb-4">&#9889;</div>
            <h2 className="text-xl font-semibold text-zinc-200 mb-2">
              Four documents. One click.
            </h2>
            <p className="text-sm text-zinc-500 max-w-md">
              Paste your transcript, answer a few questions, and hit Generate.
              Four specialist agents will produce your context file, proposal,
              workflow diagram, and follow-up email simultaneously.
            </p>
          </div>
        ) : (
          // Once chat starts, show the output tabs (empty until generation)
          <OutputTabs outputs={outputs} generating={generating} />
        )}
      </div>
    </div>
  );
}
