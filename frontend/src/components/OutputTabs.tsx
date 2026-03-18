// OutputTabs.tsx — Tabbed panel for the four generation outputs
// Redesigned with background-filled active tabs, status pills, and proper spacing

"use client";

import { useState } from "react";
import EditablePanel from "./EditablePanel";
import DiagramPanel from "./DiagramPanel";

interface Outputs {
  contextFile?: string;
  proposal?: string;
  diagram?: string;
  email?: string;
}

interface OutputTabsProps {
  outputs: Outputs;
  generating: boolean;
}

const TABS = [
  { label: "Context", key: "contextFile" as const },
  { label: "Proposal", key: "proposal" as const },
  { label: "Diagram", key: "diagram" as const },
  { label: "Email", key: "email" as const },
];

export default function OutputTabs({ outputs, generating }: OutputTabsProps) {
  const [activeTab, setActiveTab] = useState<string>("contextFile");

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 pt-2 pb-0 border-b border-border">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const hasContent = !!outputs[tab.key];

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-3 py-2 text-sm rounded-t-md transition-colors duration-150
                ${
                  isActive
                    ? "bg-surface-raised text-text-primary border-b-2 border-accent"
                    : "text-text-muted hover:text-text-secondary"
                }`}
            >
              <span className="flex items-center gap-2">
                {tab.label}

                {/* Status pill */}
                {hasContent ? (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full
                                   bg-success-subtle text-success font-medium"
                  >
                    Ready
                  </span>
                ) : generating ? (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full
                                   bg-surface-overlay text-text-muted animate-shimmer"
                  >
                    ...
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "diagram" ? (
          outputs.diagram ? (
            <DiagramPanel content={outputs.diagram} />
          ) : generating ? (
            <LoadingSkeleton />
          ) : (
            <EmptyState />
          )
        ) : outputs[activeTab as keyof Outputs] ? (
          <EditablePanel
            key={activeTab}
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

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        Running agents... this takes 15–30 seconds.
      </p>
      <div className="space-y-3 animate-shimmer">
        <div className="h-3 bg-surface-raised rounded w-3/4" />
        <div className="h-3 bg-surface-raised rounded w-1/2" />
        <div className="h-3 bg-surface-raised rounded w-5/6" />
        <div className="h-3 bg-surface-raised rounded w-2/3" />
        <div className="h-3 bg-surface-raised rounded w-3/5" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm text-text-muted">
        Output will appear here after generation.
      </p>
    </div>
  );
}
