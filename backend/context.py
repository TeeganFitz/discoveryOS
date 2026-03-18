# context.py — The shared data object every agent reads from
# This is a dataclass: a clean way to define a structured object with typed fields.
# Think of it as a schema for all the client intel we gather during the conversation.

from dataclasses import dataclass, field


@dataclass
class HandoffContext:
    """Everything we know about the client, built up during the chat phase
    and consumed by the subagents during generation."""

    session_id: str
    raw_transcript: str

    # Populated during the orchestrator conversation
    client_name: str | None = None
    company: str | None = None
    vertical: str | None = None
    decision_maker: str | None = None
    pain_points: list[str] = field(default_factory=list)
    budget_signal: str | None = None
    timeline_signal: str | None = None
    current_tools: list[str] = field(default_factory=list)
    urgency: str | None = None
    key_quotes: list[str] = field(default_factory=list)
    red_flags: list[str] = field(default_factory=list)
    clarifications: list[dict] = field(default_factory=list)
    ready_to_generate: bool = False

    # Populated by the four subagents after "Generate" is hit
    context_file: str | None = None
    proposal: str | None = None
    diagram_json: str | None = None
    followup_email: str | None = None

    # Trace keeps a log of each agent run (timing, token usage)
    trace: list[dict] = field(default_factory=list)
