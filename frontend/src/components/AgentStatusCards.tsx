// AgentStatusCards.tsx — Shows 4 animated cards during generation
//
// Each card represents one of the four subagents:
//   Archivist (haiku), Proposal Writer (sonnet), Diagrammer (sonnet), Closer (haiku)
//
// States: waiting → writing → done
// Uses Framer Motion for smooth transitions between states.

"use client";

import { motion } from "framer-motion";

// Agent metadata — what to show on each card
const AGENTS = [
  {
    key: "context_file",
    name: "Archivist",
    model: "haiku",
    output: "Context File",
  },
  {
    key: "proposal",
    name: "Proposal Writer",
    model: "sonnet",
    output: "Proposal",
  },
  { key: "diagram", name: "Diagrammer", model: "sonnet", output: "Diagram" },
  { key: "email", name: "Closer", model: "haiku", output: "Email" },
];

interface AgentStatusCardsProps {
  // Set of agent keys that have completed (e.g., {"context_file", "email"})
  completedAgents: Set<string>;
  // Whether generation is running
  generating: boolean;
}

export default function AgentStatusCards({
  completedAgents,
  generating,
}: AgentStatusCardsProps) {
  if (!generating && completedAgents.size === 0) return null;

  return (
    <div className="px-6 py-4">
      <p className="text-xs text-text-muted uppercase tracking-wider mb-3">
        Agents
      </p>
      <div className="grid grid-cols-2 gap-2">
        {AGENTS.map((agent, i) => {
          const isDone = completedAgents.has(agent.key);
          const isRunning = generating && !isDone;

          return (
            <motion.div
              key={agent.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.25 }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md border transition-colors duration-300
                ${
                  isDone
                    ? "border-success/30 bg-success-subtle"
                    : "border-border bg-surface-raised"
                }`}
            >
              {/* Status indicator */}
              <div className="shrink-0">
                {isDone ? (
                  // Checkmark
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    className="text-success"
                  >
                    <path
                      d="M3 7L6 10L11 4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                ) : isRunning ? (
                  // Spinner
                  <div className="w-3.5 h-3.5 border-2 border-text-muted/30 border-t-accent rounded-full animate-spin" />
                ) : (
                  // Waiting dot
                  <div className="w-2 h-2 rounded-full bg-text-muted" />
                )}
              </div>

              {/* Agent info */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-xs font-medium ${isDone ? "text-success" : "text-text-primary"}`}
                  >
                    {agent.name}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {agent.model}
                  </span>
                </div>
                <span className="text-[11px] text-text-muted">
                  {isDone
                    ? agent.output + " ready"
                    : isRunning
                      ? "Writing..."
                      : "Queued"}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
