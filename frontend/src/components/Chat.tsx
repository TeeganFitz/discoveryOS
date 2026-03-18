// Chat.tsx — The conversation interface with the orchestrator agent
//
// This is where the back-and-forth happens after the user pastes a transcript.
// The agent reads the transcript, asks targeted follow-up questions, and
// signals when it has enough info to generate documents.
//
// On mount, it automatically sends the first message with the transcript
// so the agent can start analyzing immediately.

"use client";

import { useState, useEffect, useRef } from "react";
import GenerateButton from "./GenerateButton";

// Each message in the conversation
interface Message {
  role: "user" | "assistant";
  content: string;
}

// SSE event shape (same as GenerateButton)
interface SSEEvent {
  type: "context_file" | "proposal" | "diagram" | "email" | "done";
  content?: string;
}

interface ChatProps {
  sessionId: string;
  transcript: string;
  // Called when the agent says it has enough info
  onReadyToGenerate: () => void;
  // Passed through to GenerateButton
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

  // Ref for auto-scrolling to the latest message
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // On mount, send the first message with the transcript to kick off the conversation
  useEffect(() => {
    sendMessage("Here's the transcript from the call.", true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendMessage(text: string, isFirst = false) {
    if (!text.trim() || isLoading) return;

    // Add user message to the chat immediately (optimistic update)
    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      // Call the /chat endpoint
      const response = await fetch(`${apiUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          message: text,
          // Only send transcript on the first message
          ...(isFirst ? { transcript } : {}),
        }),
      });

      const data = await response.json();

      // Add the agent's reply to the chat
      const agentMessage: Message = { role: "assistant", content: data.reply };
      setMessages((prev) => [...prev, agentMessage]);

      // Check if the agent says it has enough info
      if (data.ready_to_generate) {
        setReadyToGenerate(true);
        onReadyToGenerate();
      }
    } catch (error) {
      console.error("Chat error:", error);
      // Show the error in the chat so the user knows something went wrong
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Try again?" },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Message list — scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            // User messages right-aligned, agent messages left-aligned
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <span
              className={`inline-block max-w-[80%] px-4 py-2 rounded-lg text-sm leading-relaxed
                ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white" // User: blue bubble
                    : "bg-zinc-800 text-zinc-100" // Agent: dark bubble
                }`}
            >
              {msg.content}
            </span>
          </div>
        ))}

        {/* Loading indicator while waiting for agent response */}
        {isLoading && (
          <div className="flex justify-start">
            <span className="inline-block px-4 py-2 rounded-lg text-sm bg-zinc-800 text-zinc-500">
              Thinking...
            </span>
          </div>
        )}

        {/* Invisible element at the bottom — scrollIntoView targets this */}
        <div ref={messagesEndRef} />
      </div>

      {/* Generate button — appears when the agent says it's ready */}
      {readyToGenerate && (
        <div className="px-4 pb-2">
          <GenerateButton
            sessionId={sessionId}
            onEvent={onGenerateEvent}
            onComplete={onGenerateComplete}
          />
        </div>
      )}

      {/* Input area — text field + send button */}
      <div className="flex gap-2 p-4 border-t border-zinc-800">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          // Send on Enter key press
          onKeyDown={(e) =>
            e.key === "Enter" && !e.shiftKey && sendMessage(input)
          }
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg
                     px-4 py-2 text-sm text-zinc-200 placeholder-zinc-600
                     focus:outline-none focus:border-zinc-600"
          placeholder="Reply to agent..."
          disabled={isLoading}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 rounded-lg text-sm font-medium
                     bg-blue-600 text-white hover:bg-blue-500
                     disabled:bg-zinc-800 disabled:text-zinc-600
                     disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
