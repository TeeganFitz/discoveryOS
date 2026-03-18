// page.tsx — Main page layout
// TODO: Build out the two-panel layout:
//   Left panel: transcript input → chat interface
//   Right panel: four output tabs (Context File, Proposal, Diagram, Email)

"use client";

import { useState } from "react";

export default function Page() {
  // Phase tracks where the user is in the flow:
  // "input" → pasting transcript
  // "chat" → answering agent questions
  // "generating" → agents are running
  // "done" → outputs are ready
  const [phase, setPhase] = useState<"input" | "chat" | "generating" | "done">(
    "input",
  );
  const [sessionId] = useState(() => crypto.randomUUID());

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      <div className="flex items-center justify-center w-full">
        <h1 className="text-2xl font-bold">DiscoveryOS</h1>
        <p className="text-zinc-400 ml-4">Build in progress...</p>
      </div>
    </div>
  );
}
