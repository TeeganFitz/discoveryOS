// OutputTabs.tsx — Tabbed panel showing the four generation outputs
// Each tab displays one of: Context File, Proposal, Diagram, Email
// Content arrives asynchronously — tabs show a loading state until ready.

"use client";

import { useState } from "react";
import MarkdownPanel from "./MarkdownPanel";
import DiagramPanel from "./DiagramPanel";

// The keys match what page.tsx passes down after parsing SSE events
interface Outputs {
  contextFile?: string;
  proposal?: string;
  diagram?: string;
  email?: string;
}

interface OutputTabsProps {
  outputs: Outputs;
  generating: boolean; // True while agents are running
}

// Tab config — maps tab labels to their output keys
const TABS = [
  { label: "Context File", key: "contextFile" as const },
  { label: "Proposal", key: "proposal" as const },
  { label: "Diagram", key: "diagram" as const },
  { label: "Email", key: "email" as const },
];

export default function OutputTabs({ outputs, generating }: OutputTabsProps) {
  const [activeTab, setActiveTab] = useState<string>("contextFile");

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-zinc-800">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm transition-colors relative
              ${
                activeTab === tab.key
                  ? "text-white border-b-2 border-blue-500"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
          >
            {tab.label}

            {/* Green dot = content arrived, pulsing dot = still generating */}
            {outputs[tab.key] ? (
              <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
            ) : generating ? (
              <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-zinc-500 animate-shimmer" />
            ) : null}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Show the active tab's content, or a loading/empty state */}
        {activeTab === "diagram" ? (
          // Diagram tab uses the special JSON panel
          outputs.diagram ? (
            <DiagramPanel content={outputs.diagram} />
          ) : generating ? (
            <LoadingSkeleton />
          ) : (
            <EmptyState />
          )
        ) : // All other tabs use the markdown renderer
        outputs[activeTab as keyof Outputs] ? (
          <MarkdownPanel
            content={outputs[activeTab as keyof Outputs]!}
            label={TABS.find((t) => t.key === activeTab)?.label}
          />
        ) : generating ? (
          <LoadingSkeleton />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

// Shown while waiting for agent output
function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-shimmer">
      <div className="text-sm text-zinc-500">
        Generating... this takes 15-30 seconds
      </div>
      {/* Fake content blocks that pulse */}
      <div className="h-4 bg-zinc-800 rounded w-3/4" />
      <div className="h-4 bg-zinc-800 rounded w-1/2" />
      <div className="h-4 bg-zinc-800 rounded w-5/6" />
      <div className="h-4 bg-zinc-800 rounded w-2/3" />
    </div>
  );
}

// Shown before generation starts
function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
      Output will appear here after you hit Generate
    </div>
  );
}
