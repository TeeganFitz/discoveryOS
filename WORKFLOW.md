# DiscoveryOS — Collaboration Workflow

## Step 1 — Clone the Repo

Repo is live at: https://github.com/TeeganFitz/discoveryOS

**Your teammate runs:**

```bash
git clone https://github.com/TeeganFitz/discoveryOS.git
cd discoveryOS
```

## Step 2 — Add Them as a Collaborator

GitHub → discoveryOS → Settings → Collaborators → Add people → type their GitHub username.

They accept the invite. Now they can push directly.

---

## The Split

```
You    → backend/main.py, backend/context.py (Python)
Them   → frontend/ (TypeScript, React, Tailwind)
```

One person backend. One person frontend. You almost never touch the same file.

---

## The Workflow — Every 20-30 Minutes

Both people run this:

```bash
git add .
git commit -m "what you just built"
git push
git pull
```

Four commands. That's the entire workflow.

---

## If You Get a Conflict

Only happens if you both edited the same file. Open the file and you'll see:

```
<<<<<<< HEAD
your code
=======
their code
>>>>>>> main
```

Delete the markers, keep both pieces of code, save, then:

```bash
git add .
git commit -m "resolved conflict"
git push
```

---

## Communication

Just text each other. When your `/chat` endpoint works, text them:

```
"chat endpoint works
POST /chat
send: { session_id, message, transcript }
returns: { reply, ready_to_generate }
base url: http://localhost:8000"
```

When they finish a component, they text you:

```
"Chat.tsx done, hitting /chat on submit
need /generate to return SSE stream"
```

---

## Sync Rhythm

Every 25-30 minutes, both stop for a 2-minute check-in:

1. "Here's what I just finished."
2. "Here's what I need from you to keep going."
3. "Here's what I'm building next."

Talk out loud (Discord / Live Share). Don't coordinate through git messages.

---

## Using Claude as a Third Team Member

Both people can talk to Claude simultaneously in separate windows.

- **You** ask Claude for backend / Python / agent questions
- **They** ask Claude for React / Tailwind / frontend questions
- Neither has to wait for the other

**How to ask effectively:**
Don't ask: "how do I make streaming work?"
Ask: "I'm in backend/main.py. I have a /generate route that needs to stream SSE events. Each event has a type and content field. Write me the route."

Specific context = working code in 30 seconds.

---

## Checkpoints

| Time    | What Should Work                       | If Behind                                          |
| ------- | -------------------------------------- | -------------------------------------------------- |
| 25 min  | `/chat` works end to end               | Simplify orchestrator prompt                       |
| 50 min  | `/generate` returns at least 2 outputs | Cut diagram agent for now                          |
| 80 min  | Frontend shows chat + outputs          | Focus on chat first, tabs second                   |
| 100 min | All four outputs working in UI         | Polish what works, cut what doesn't                |
| 110 min | Deployed to live URL                   | Deploy whatever you have                           |
| 120 min | Demo ready                             | A great 2-output demo beats a broken 4-output demo |

---

## Deploy

Don't wait until the end. Deploy when the first endpoint works.

**Frontend → Vercel:**

```bash
cd frontend
npx vercel --prod
# Set NEXT_PUBLIC_API_URL in Vercel dashboard
```

**Backend → Railway:**

1. Go to railway.app
2. New Project → Deploy from GitHub
3. Set root to `/backend`
4. Add env var: `ANTHROPIC_API_KEY=sk-ant-...`
5. Copy the public URL → set it as `NEXT_PUBLIC_API_URL` in Vercel

Every `git push` after this auto-deploys both.
