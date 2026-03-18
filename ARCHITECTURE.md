# DiscoveryOS — Full Architecture

## What It Is

Agencies and teams waste hours after every discovery call doing the same thing manually — reading through the transcript, pulling out what the client said, writing a proposal, building a diagram, drafting the follow-up email. It's the same work every time and it compounds across every client.

DiscoveryOS fixes that. Paste your transcript. A conversational agent reads it and asks you the 3-5 questions the transcript didn't answer. Hit Generate. Four specialist subagents fire simultaneously and produce four documents your team can use immediately.

---

## The Four Outputs

1. **Context File** — structured client intel, goes into RAG memory
2. **Proposal** — company's standardized format, scoped and priced
3. **Workflow Diagram** — Excalidraw visual of current state → system → outcomes
4. **Follow-up Email** — personalized, ready to send, under 150 words

---

## The User Flow

**Step 1 — Paste transcript**
Raw Zoom summary, Granola notes, manual notes — anything

**Step 2 — Agent reads it and asks what's missing**
Not a form. Real back-and-forth chat.
"What's their rough budget?"
"Is this replacing something existing or net new?"
"Who's the decision maker?"
User answers naturally. Agent updates its context.

**Step 3 — Agent says "I have enough. Ready to generate?"**
User hits Generate.

**Step 4 — Four subagents fire simultaneously**
Four panels populate at the same time.
Each streams its output in real time.
User copies, edits, exports.

---

## Full Architecture

```
TRANSCRIPT + CHAT ANSWERS
           ↓
┌──────────────────────────────┐
│     ORCHESTRATOR AGENT       │  claude-sonnet-4-6
│                              │
│  Job 1: Run the conversation │  Reads transcript.
│  Job 2: Know when it's ready │  Asks targeted questions.
│  Job 3: Fire the subagents   │  Builds HandoffContext.
│                              │  Triggers generate.
└─────────────┬────────────────┘
              │
              │  passes HandoffContext to all four simultaneously
              │  (asyncio.gather — truly parallel)
              │
    ┌─────────┬┴────────┬─────────┐
    ↓         ↓         ↓         ↓
┌────────┐ ┌──────┐ ┌───────┐ ┌───────┐
│ARCHI-  │ │PROP  │ │DIAGRAM│ │CLOSER │
│VIST    │ │WRITER│ │AGENT  │ │AGENT  │
│haiku   │ │sonnet│ │sonnet │ │haiku  │
└────────┘ └──────┘ └───────┘ └───────┘
    ↓         ↓         ↓         ↓
Context   Proposal  Excalidraw  Follow-up
  File    Document  JSON Diagram  Email
    ↓         ↓         ↓         ↓
         RAG Database
    (stored for future client matching)
```

---

## The HandoffContext — The Shared Object

Every agent reads from this. It's the single source of truth for the entire run.

```python
@dataclass
class HandoffContext:
    session_id: str
    raw_transcript: str

    # populated during conversation
    client_name: str | None
    company: str | None
    vertical: str | None
    decision_maker: str | None
    pain_points: list[str]
    budget_signal: str | None
    timeline_signal: str | None
    current_tools: list[str]
    urgency: str | None
    key_quotes: list[str]
    red_flags: list[str]
    clarifications: list[dict]
    ready_to_generate: bool

    # populated by subagents
    context_file: str | None
    proposal: str | None
    diagram_json: str | None
    followup_email: str | None

    # trace
    trace: list[dict]
```

---

## API Contract

### `POST /chat`

**Send:**

```json
{
  "session_id": "uuid",
  "message": "string",
  "transcript": "string (first msg only)"
}
```

**Receive:**

```json
{ "reply": "string", "ready_to_generate": true/false }
```

### `POST /generate`

**Send:**

```json
{ "session_id": "uuid" }
```

**Receive:** SSE stream with events:

```
data: { "type": "context_file", "content": "..." }
data: { "type": "proposal", "content": "..." }
data: { "type": "diagram", "content": "...json..." }
data: { "type": "email", "content": "..." }
data: { "type": "done" }
```

### `GET /session/{session_id}`

**Receive:** Full context object

---

## Backend Structure

```
backend/
├── main.py              ← FastAPI app, all routes, all agent functions
├── context.py           ← HandoffContext dataclass
├── requirements.txt     ← fastapi, uvicorn, anthropic, python-dotenv
├── .env.example         ← template for API key
└── .env                 ← actual key (gitignored)
```

### Orchestrator Agent

- Model: `claude-sonnet-4-6`
- Reads the transcript, asks targeted follow-up questions
- Responds in structured JSON with `reply`, `extracted` fields, and `ready_to_generate`
- Updates HandoffContext with each turn

### Subagents (all run in parallel via `asyncio.gather`)

| Agent           | Model               | Output                               |
| --------------- | ------------------- | ------------------------------------ |
| Archivist       | `claude-haiku-4-5`  | Structured markdown context file     |
| Proposal Writer | `claude-sonnet-4-6` | Flowsor-format proposal with 3 tiers |
| Diagrammer      | `claude-sonnet-4-6` | Excalidraw JSON elements array       |
| Closer          | `claude-haiku-4-5`  | Follow-up email under 150 words      |

---

## Frontend Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx       ← root layout
│   │   ├── page.tsx         ← main page, phase-based state machine
│   │   └── globals.css      ← Tailwind base
│   └── components/
│       ├── TranscriptInput.tsx  ← paste area for raw transcript
│       ├── Chat.tsx             ← chat interface with orchestrator
│       ├── OutputTabs.tsx       ← tabbed panel for four outputs
│       ├── DiagramPanel.tsx     ← Excalidraw renderer
│       ├── MarkdownPanel.tsx    ← markdown renderer for text outputs
│       └── GenerateButton.tsx   ← trigger generation
├── package.json
└── .env.local               ← NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Page Phases

1. **input** — User pastes transcript
2. **chat** — Orchestrator asks follow-up questions
3. **generating** — Four agents running, panels streaming
4. **done** — All outputs ready, user can copy/edit/export

### Layout

- Split screen: left half = chat, right half = output tabs
- Dark theme (`bg-zinc-950`, `text-zinc-100`)
- Four tabs: Context File, Proposal, Diagram, Email
- Diagram tab renders Excalidraw component; others render markdown

---

## Dependencies

### Backend

```
fastapi
uvicorn
anthropic
python-dotenv
```

### Frontend

```
next (App Router, TypeScript, Tailwind)
@excalidraw/excalidraw
react-markdown
```

---

## Setup

### Backend

```bash
cd backend
cp .env.example .env   # add your ANTHROPIC_API_KEY
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npx create-next-app@latest . --typescript --tailwind --app
pnpm add @excalidraw/excalidraw react-markdown
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
pnpm dev
```

---

## Build Order (2-hour buildathon)

| Time      | Milestone                            | Checkpoint                 |
| --------- | ------------------------------------ | -------------------------- |
| 0:00–0:15 | `context.py` + `.env`                | HandoffContext defined     |
| 0:15–0:35 | `orchestrator` + `/chat` route       | Chat works end to end      |
| 0:35–0:55 | Archivist + Closer agents            | Two fastest agents done    |
| 0:55–1:10 | `/generate` route + `asyncio.gather` | Two outputs working        |
| 1:10–1:30 | Proposal + Diagrammer agents         | All four outputs appearing |
| 1:30–1:50 | `Chat.tsx` + `OutputTabs.tsx`        | UI shows chat + four tabs  |
| 1:50–2:00 | `DiagramPanel.tsx` + deploy          | Live URL works             |

---

## Collaboration

- **Person A** owns `backend/` (Python)
- **Person B** owns `frontend/` (TypeScript/React)
- Both work on `main` branch — no PRs needed during buildathon
- Sync every 25-30 min: "what I finished, what I need, what's next"
- Deploy early (Vercel for frontend, Railway for backend)
