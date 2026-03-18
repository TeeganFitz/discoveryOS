// Chat.tsx — Conversation interface with the orchestrator agent
//
// Redesigned from generic chat bubbles to a professional, clean layout:
// - Agent messages: left-aligned plain text with a small avatar
// - User messages: right-aligned, subtle surface background
// - Typing indicator: three animated dots instead of "Thinking..." text
// - Send button: icon-only arrow

"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import GenerateButton from "./GenerateButton";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface SSEEvent {
  type: "context_file" | "proposal" | "diagram" | "email" | "done";
  content?: string;
}

interface ChatProps {
  sessionId: string;
  transcript: string;
  onReadyToGenerate: () => void;
  onGenerateEvent: (event: SSEEvent) => void;
  onGenerateComplete: () => void;
}

export default function Chat({
  sessionId,
  transcript,
  onReadyToGenerate,
  onGenerateEvent,
  onGenerateComplete,
}: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [readyToGenerate, setReadyToGenerate] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasSentFirst = useRef(false);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-send first message with transcript on mount
  useEffect(() => {
    if (hasSentFirst.current) return;
    hasSentFirst.current = true;
    sendMessage("Here's the transcript from the call.", true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendMessage(text: string, isFirst = false) {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const response = await fetch(`${apiUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          message: text,
          ...(isFirst ? { transcript } : {}),
        }),
      });

      const data = await response.json();

      const agentMessage: Message = { role: "assistant", content: data.reply };
      setMessages((prev) => [...prev, agentMessage]);

      if (data.ready_to_generate) {
        setReadyToGenerate(true);
        onReadyToGenerate();
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Connection failed — is the backend running?");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Connection failed. Is the backend running on port 8000?",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.map((msg, i) => {
          // Check if previous message was same role (for tighter grouping)
          const prevSameRole = i > 0 && messages[i - 1].role === msg.role;

          return (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}
                ${prevSameRole ? "mt-1" : "mt-4"}`}
            >
              {/* Agent avatar — only show on first message in a group */}
              {msg.role === "assistant" && !prevSameRole && (
                <div
                  className="w-6 h-6 rounded-md bg-surface-overlay flex items-center justify-center
                                text-[10px] font-semibold text-text-muted mr-2 mt-0.5 shrink-0"
                >
                  D
                </div>
              )}

              {/* Message content */}
              <div
                className={`max-w-[85%] text-sm leading-relaxed
                  ${
                    msg.role === "user"
                      ? "bg-surface-raised border border-border rounded-lg px-3.5 py-2 text-text-primary"
                      : `text-text-secondary ${prevSameRole ? "ml-8" : ""}`
                  }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}

        {/* Typing indicator — three bouncing dots */}
        {isLoading && (
          <div className="flex justify-start mt-4">
            <div
              className="w-6 h-6 rounded-md bg-surface-overlay flex items-center justify-center
                            text-[10px] font-semibold text-text-muted mr-2 mt-0.5 shrink-0"
            >
              D
            </div>
            <div className="flex items-center gap-1 py-2">
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-text-muted" />
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-text-muted" />
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-text-muted" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Generate button — appears when agent says it's ready */}
      {readyToGenerate && (
        <div className="px-4 pb-3">
          <GenerateButton
            sessionId={sessionId}
            onEvent={onGenerateEvent}
            onComplete={onGenerateComplete}
          />
        </div>
      )}

      {/* Input area */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && !e.shiftKey && sendMessage(input)
          }
          className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted
                     py-2 focus:outline-none"
          placeholder="Type a response..."
          disabled={isLoading}
        />
        {/* Send button — arrow icon */}
        <button
          onClick={() => sendMessage(input)}
          disabled={isLoading || !input.trim()}
          className="w-8 h-8 flex items-center justify-center rounded-md
                     text-text-muted hover:text-text-primary hover:bg-surface-overlay
                     disabled:opacity-30 disabled:hover:bg-transparent
                     transition-all duration-150"
        >
          {/* Simple arrow-up SVG */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 3L8 13M8 3L4 7M8 3L12 7"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
