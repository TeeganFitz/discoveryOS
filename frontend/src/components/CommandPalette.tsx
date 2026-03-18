// CommandPalette.tsx — Cmd+K command palette
//
// Opens with Cmd+K (Mac) or Ctrl+K (Windows/Linux).
// Provides quick access to actions: switch tabs, copy outputs, export PDFs.
// Built with cmdk — a lightweight, unstyled command menu.

"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "framer-motion";

interface CommandPaletteProps {
  // Callback to switch to a specific output tab
  onSwitchTab?: (tab: string) => void;
  // Callback to start a new session (reload page)
  onNewSession?: () => void;
}

export default function CommandPalette({
  onSwitchTab,
  onNewSession,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function runAction(action: () => void) {
    action();
    setOpen(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setOpen(false)}
          />

          {/* Command dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-[480px] z-50"
          >
            <Command
              className="bg-surface-raised border border-border rounded-lg shadow-2xl overflow-hidden"
              label="Command palette"
            >
              <Command.Input
                placeholder="Type a command..."
                className="w-full px-4 py-3 bg-transparent text-sm text-text-primary
                           placeholder-text-muted border-b border-border
                           focus:outline-none"
              />

              <Command.List className="max-h-[300px] overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center text-sm text-text-muted">
                  No results found.
                </Command.Empty>

                {/* Navigation group */}
                <Command.Group
                  heading="Navigate"
                  className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase
                             [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-text-muted
                             [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
                >
                  <CommandItem
                    onSelect={() =>
                      runAction(() => onSwitchTab?.("contextFile"))
                    }
                  >
                    Switch to Context File
                  </CommandItem>
                  <CommandItem
                    onSelect={() => runAction(() => onSwitchTab?.("proposal"))}
                  >
                    Switch to Proposal
                  </CommandItem>
                  <CommandItem
                    onSelect={() => runAction(() => onSwitchTab?.("diagram"))}
                  >
                    Switch to Diagram
                  </CommandItem>
                  <CommandItem
                    onSelect={() => runAction(() => onSwitchTab?.("email"))}
                  >
                    Switch to Email
                  </CommandItem>
                </Command.Group>

                {/* Actions group */}
                <Command.Group
                  heading="Actions"
                  className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase
                             [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-text-muted
                             [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
                >
                  <CommandItem
                    onSelect={() =>
                      runAction(() => {
                        onNewSession?.();
                        window.location.reload();
                      })
                    }
                  >
                    Start new session
                  </CommandItem>
                </Command.Group>
              </Command.List>

              {/* Footer hint */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-border">
                <span className="text-[10px] text-text-muted">
                  Navigate with arrow keys
                </span>
                <span className="text-[10px] text-text-muted">
                  ESC to close
                </span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Styled command item
function CommandItem({
  children,
  onSelect,
}: {
  children: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center px-2 py-2 text-sm text-text-secondary rounded-md
                 cursor-pointer
                 data-[selected=true]:bg-surface-overlay data-[selected=true]:text-text-primary
                 transition-colors duration-100"
    >
      {children}
    </Command.Item>
  );
}
