# main.py — The entire backend in one file
# FastAPI app with two main routes: /chat and /generate
# Keep it simple: everything lives here until there's a reason to split it out.

import asyncio
import json
import os
import uuid
import time
from contextlib import asynccontextmanager

import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from context import HandoffContext

# Load environment variables from .env file
load_dotenv()

# Initialize the Anthropic client (reads ANTHROPIC_API_KEY from env)
client = anthropic.Anthropic()


# ─── Pydantic models for request validation ───
# These define what shape the incoming JSON must have.

class ChatRequest(BaseModel):
    session_id: str
    message: str
    transcript: str | None = None  # Only sent on the first message


class GenerateRequest(BaseModel):
    session_id: str


# ─── In-memory session store ───
# Each session holds a HandoffContext and the chat history.
# This is fine for a demo. In production you'd use Redis or a database.
sessions: dict[str, dict] = {}


# ─── The Orchestrator ───
# This is the "smart colleague" who reads the transcript and asks
# targeted follow-up questions to fill in gaps.

ORCHESTRATOR_PROMPT = """
You are a senior business analyst running a post-discovery-call
debrief. You have just read a client transcript.

Your job is to have a focused conversation to fill in what the
transcript didn't capture. You already know what you extracted.
Only ask about genuine gaps. Never ask something already answered.

Ask one question at a time. Be direct. Sound like a smart colleague,
not a chatbot.

When you have enough to produce quality documents, set
ready_to_generate to true in your response.

You need at minimum:
- Client name and company confirmed
- Primary pain point confirmed
- Budget signal (even rough)
- Decision maker confirmed
- Timeline signal (even rough)

Respond in JSON only:
{
  "reply": "your message to the user",
  "extracted": { "field_name": "value" },
  "ready_to_generate": true/false
}
"""


def run_conversation(
    transcript: str,
    message: str,
    context: HandoffContext,
    history: list,
) -> dict:
    """Run one turn of the orchestrator conversation.
    Takes the user's message, sends it to Claude with full history,
    parses the structured JSON response, and updates the context."""

    messages = list(history)  # copy so we don't mutate the original

    # On the very first message, prepend the transcript
    if not history:
        messages.append({
            "role": "user",
            "content": f"TRANSCRIPT:\n{transcript}\n\nSTART THE DEBRIEF.",
        })

    # Add the user's latest message
    messages.append({"role": "user", "content": message})

    # Call Claude
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        system=ORCHESTRATOR_PROMPT,
        messages=messages,
    )

    # Parse the JSON response
    # Claude sometimes wraps JSON in markdown code blocks like ```json ... ```
    # so we need to strip those before parsing
    raw_text = response.content[0].text.strip()

    # Remove markdown code block wrapper if present
    if raw_text.startswith("```"):
        # Strip opening ```json or ``` and closing ```
        lines = raw_text.split("\n")
        # Remove first line (```json) and last line (```)
        lines = [l for l in lines if not l.strip().startswith("```")]
        raw_text = "\n".join(lines).strip()

    # If still empty or not JSON, build a fallback response
    if not raw_text or raw_text[0] not in "{[":
        result = {
            "reply": raw_text or "I'm having trouble processing that. Could you try again?",
            "extracted": {},
            "ready_to_generate": False,
        }
    else:
        result = json.loads(raw_text)

    # Update context with any newly extracted fields
    for key, value in result.get("extracted", {}).items():
        if hasattr(context, key) and value:
            # For list fields, extend rather than replace
            current = getattr(context, key)
            if isinstance(current, list) and isinstance(value, list):
                current.extend(value)
            else:
                setattr(context, key, value)

    context.ready_to_generate = result.get("ready_to_generate", False)

    return result


# ─── The Four Subagents ───
# Each is just a function that takes a HandoffContext and returns a string.
# No classes, no inheritance — just functions.

def build_context_file(context: HandoffContext) -> str:
    """Archivist agent — builds structured client intel for RAG storage."""
    start = time.time()
    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=2000,
        system="""You are a senior business analyst building a client intelligence file.
Write only what was confirmed. Mark unknowns as [NOT CAPTURED].
Write for a team member who wasn't on the call.
Optimize for future RAG retrieval — use specific industry terms,
pain point language, and outcome metrics.
Output structured markdown.""",
        messages=[{
            "role": "user",
            "content": f"""Build the client context file:

Client: {context.client_name} at {context.company}
Vertical: {context.vertical}
Decision maker: {context.decision_maker}
Pain points: {', '.join(context.pain_points)}
Budget signal: {context.budget_signal}
Timeline: {context.timeline_signal}
Current tools: {', '.join(context.current_tools)}
Urgency: {context.urgency}
Key quotes: {context.key_quotes}
Red flags: {context.red_flags}
Clarifications: {context.clarifications}

Template:
# CLIENT CONTEXT — [Company]
## WHO THEY ARE
## THE PROBLEM
## THE ENGAGEMENT
## KEY QUOTES
## PAIN SCORE (0-100)
## ICP FIT (Weak/Moderate/Strong)
## RAW NOTES""",
        }],
    )
    result = response.content[0].text
    context.trace.append({
        "agent": "archivist",
        "duration_ms": int((time.time() - start) * 1000),
        "tokens": response.usage.input_tokens + response.usage.output_tokens,
    })
    return result


def build_proposal(context: HandoffContext) -> str:
    """Proposal writer agent — creates the Flowsor-format proposal."""
    start = time.time()
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=3000,
        system="""You are Flowsor's senior proposal writer.
Lead with the client's pain, not your services.
Offer three tiers: Lean / Standard / Full.
Make every deliverable concrete and verifiable.
Use [TBD] for anything uncertain — never guess at price.
Tone: direct, confident, zero fluff.""",
        messages=[{
            "role": "user",
            "content": f"""Write a proposal:

Client: {context.client_name}, {context.company}
Problem: {', '.join(context.pain_points)}
Budget signal: {context.budget_signal}
Timeline: {context.timeline_signal}
Decision maker: {context.decision_maker}
Clarifications: {context.clarifications}

Template:
# PROPOSAL — [Company] [Project Type]
Prepared by: Flowsor LLC | Date: {time.strftime('%Y-%m-%d')}

## THE PROBLEM WE'RE SOLVING
## OUR APPROACH (phased)
## WHAT YOU GET (deliverables)
## INVESTMENT (three tiers)
## WHAT WE NEED FROM YOU
## NEXT STEPS""",
        }],
    )
    result = response.content[0].text
    context.trace.append({
        "agent": "proposal_writer",
        "duration_ms": int((time.time() - start) * 1000),
        "tokens": response.usage.input_tokens + response.usage.output_tokens,
    })
    return result


def build_diagram(context: HandoffContext) -> str:
    """Diagrammer agent — generates Excalidraw-compatible JSON."""
    start = time.time()
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=3000,
        system="""You are a systems architect who thinks visually.
Output ONLY valid JSON — an array of Excalidraw element objects.
No explanation. No markdown. Just the JSON array.

Rules:
- Max 10 nodes. Clarity beats completeness.
- Left: client's current problem (red fill #ff6b6b)
- Middle: the system being built (blue fill #74c0fc)
- Right: outcomes (green fill #69db7c)
- Every arrow needs a label
- Readable by a non-technical client""",
        messages=[{
            "role": "user",
            "content": f"""Generate an Excalidraw diagram:

Client problem: {', '.join(context.pain_points)}
Current tools: {', '.join(context.current_tools)}
Vertical: {context.vertical}

Show:
LEFT: What their world looks like today (the pain)
MIDDLE: The system Flowsor builds
RIGHT: What their world looks like after (the outcome)

Return only the Excalidraw JSON elements array.""",
        }],
    )
    result = response.content[0].text
    context.trace.append({
        "agent": "diagrammer",
        "duration_ms": int((time.time() - start) * 1000),
        "tokens": response.usage.input_tokens + response.usage.output_tokens,
    })
    return result


def build_email(context: HandoffContext) -> str:
    """Closer agent — writes the follow-up email."""
    start = time.time()
    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=500,
        system="""You write follow-up emails that sound human.
Under 150 words. Always.
Reference something specific the client said.
One clear ask at the end. Not multiple options.
Never use: synergy, leverage, solution, circle back,
touch base, value-add, reach out, hoping this finds you well.
Sign off as Teegan from Flowsor.""",
        messages=[{
            "role": "user",
            "content": f"""Write the follow-up email:

Client: {context.client_name} at {context.company}
Main pain: {context.pain_points[0] if context.pain_points else 'their operational challenges'}
Key quote: {context.key_quotes[0] if context.key_quotes else 'none captured'}
Budget signal: {context.budget_signal}
Decision maker: {context.decision_maker}

Include:
- Subject line that doesn't sound like a sales email
- Reference one specific thing they said
- Mention we're sending a proposal
- End with ONE clear ask""",
        }],
    )
    result = response.content[0].text
    context.trace.append({
        "agent": "closer",
        "duration_ms": int((time.time() - start) * 1000),
        "tokens": response.usage.input_tokens + response.usage.output_tokens,
    })
    return result


async def run_all_agents(context: HandoffContext):
    """Fire all four subagents simultaneously using asyncio.
    Each Claude call is synchronous, so we use run_in_executor to
    run them in a thread pool — this means all four run in parallel."""
    loop = asyncio.get_event_loop()

    results = await asyncio.gather(
        loop.run_in_executor(None, build_context_file, context),
        loop.run_in_executor(None, build_proposal, context),
        loop.run_in_executor(None, build_diagram, context),
        loop.run_in_executor(None, build_email, context),
    )

    context.context_file = results[0]
    context.proposal = results[1]
    context.diagram_json = results[2]
    context.followup_email = results[3]

    return context


# ─── FastAPI App ───

app = FastAPI(title="DiscoveryOS")

# Allow the frontend to talk to this backend from a different port/domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Lock this down in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/chat")
async def chat(body: ChatRequest):
    """Handle one turn of the orchestrator conversation.
    Creates a new session if this is the first message."""

    # Get or create session
    if body.session_id not in sessions:
        sessions[body.session_id] = {
            "context": HandoffContext(
                session_id=body.session_id,
                raw_transcript=body.transcript or "",
            ),
            "history": [],
        }

    session = sessions[body.session_id]

    # If transcript is provided (first message), store it
    if body.transcript:
        session["context"].raw_transcript = body.transcript

    result = run_conversation(
        transcript=session["context"].raw_transcript,
        message=body.message,
        context=session["context"],
        history=session["history"],
    )

    # Update chat history for multi-turn conversation
    session["history"].append({"role": "user", "content": body.message})
    session["history"].append({"role": "assistant", "content": result["reply"]})

    return {
        "reply": result["reply"],
        "ready_to_generate": result.get("ready_to_generate", False),
    }


@app.post("/generate")
async def generate(body: GenerateRequest):
    """Fire all four subagents and stream results as each one finishes.
    Instead of waiting for all 4 to complete (old behavior), we now
    stream each result the moment its agent is done. This means the user
    sees outputs appear one-by-one in real time."""

    session = sessions.get(body.session_id)
    if not session:
        return {"error": "Session not found"}

    context = session["context"]

    async def stream():
        loop = asyncio.get_event_loop()

        # Map each agent function to its SSE event type and context field
        agents = [
            ("context_file", "context_file", build_context_file),
            ("proposal", "proposal", build_proposal),
            ("diagram", "diagram_json", build_diagram),
            ("email", "followup_email", build_email),
        ]

        # Tell the frontend which agents are starting
        yield f"data: {json.dumps({'type': 'started', 'agents': [a[0] for a in agents]})}\n\n"

        # Create async tasks for all agents (they run in parallel)
        async def run_agent(event_type, context_field, agent_fn):
            result = await loop.run_in_executor(None, agent_fn, context)
            setattr(context, context_field, result)
            return event_type, result

        # Fire all four and yield each result as it completes
        tasks = [
            asyncio.create_task(run_agent(et, cf, fn))
            for et, cf, fn in agents
        ]

        for coro in asyncio.as_completed(tasks):
            event_type, result = await coro
            yield f"data: {json.dumps({'type': event_type, 'content': result})}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.get("/session/{session_id}")
async def get_session(session_id: str):
    """Retrieve the full context for a session — useful for debugging."""
    session = sessions.get(session_id)
    if not session:
        return {"error": "Not found"}

    ctx = session["context"]
    return {
        "session_id": ctx.session_id,
        "client_name": ctx.client_name,
        "company": ctx.company,
        "ready_to_generate": ctx.ready_to_generate,
        "context_file": ctx.context_file,
        "proposal": ctx.proposal,
        "diagram_json": ctx.diagram_json,
        "followup_email": ctx.followup_email,
        "trace": ctx.trace,
    }
