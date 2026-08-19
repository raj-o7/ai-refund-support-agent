# AI Customer Support Agent — Refunds

**🔗 Live demo:** [ai-refund-support-agent-iota.vercel.app](https://ai-refund-support-agent-iota.vercel.app)
([Customer Chat](https://ai-refund-support-agent-iota.vercel.app/) · [Admin Dashboard](https://ai-refund-support-agent-iota.vercel.app/admin))

A full-stack Next.js app where an LLM-backed agent handles e-commerce refund
requests: it looks up the customer, pulls the order, runs it through a
deterministic refund-policy engine via tool calls, and approves, denies, or
escalates the request accordingly. An admin dashboard shows the agent's
reasoning — every tool call and result — live, per conversation.

Try it live with the sample order IDs in the [table below](#try-these-order-ids) —
e.g. open the chat and ask for a refund on `ORD-1001` (approved) or `ORD-1004`
(denied, digital good), then watch the reasoning unfold in the
[admin dashboard](https://ai-refund-support-agent-iota.vercel.app/admin) in a
second tab.

## Why it's built this way

- **Raw function calling, no agent framework.** The loop in
  [`lib/agent.js`](lib/agent.js) is ~90 lines: send messages + tool schemas
  to the model, execute whatever tools it asks for, feed results back,
  repeat until it returns a final text reply. LangGraph/CrewAI would add a
  dependency and an abstraction layer without adding capability at this
  scale, and a hand-rolled loop is easier to explain and debug end-to-end.
- **Policy logic lives in code, not the prompt.** [`lib/policy.js`](lib/policy.js)
  is a deterministic function that evaluates the refund rules from
  [`data/refund-policy.md`](data/refund-policy.md). The model is required to
  call `check_refund_eligibility` and act on its output rather than
  reasoning about dates/categories itself — this is what keeps refund
  decisions consistent and auditable instead of hallucination-prone.
- **Groq for inference.** Fast, OpenAI-compatible tool-calling API,
  generous free tier — no different in kind from the Groq integration in
  [PromptPal](https://github.com/raj-o7/PromptPal).
- **Voice input via the browser's native Web Speech API**, not a paid
  voice pipeline (OpenAI Realtime / ElevenLabs / LiveKit). Same approach as
  [Voxscribe](https://github.com/raj-o7/voxscribe): zero backend cost, no
  extra API key, and it's a pattern already proven out in a shipped project.

## Architecture

```
Customer chat (app/page.js, components/ChatPanel.js)
        │  POST /api/chat  { conversationId, message }
        ▼
lib/agent.js — runAgentTurn()
        │  chat.completions.create({ tools, tool_choice: "auto" })
        ▼
Groq (openai/gpt-oss-120b)
        │  tool_calls
        ▼
lib/tools.js — executeTool()  ───────────►  lib/policy.js (deterministic rules)
        │                                    lib/store.js  (mock CRM + orders)
        ▼
tool results fed back to the model, loop continues until final reply
        │
        ▼
Every step (user message, tool call, tool result, final reply) is
appended to lib/store.js's per-conversation log
        │
        ▼
Admin dashboard (app/admin/page.js, components/AdminDashboard.js)
polls GET /api/logs/[conversationId] every 1.5s and renders it live
```

**Data:** `data/customers.json` — 15 mock customers/orders covering every
policy branch (standard eligible, past the 30-day window, damaged-item
45-day extension, digital-goods/gift-card/final-sale non-refundable,
>$500 escalation, fraud-guard escalation with 3+ refunds in 90 days, wrong
order status, duplicate refund request). `data/refund-policy.md` is the
policy document itself, injected into the agent's system prompt verbatim
so the model is always grounded in the current written rules.

**State:** in-memory (module-level `Map`s in `lib/store.js`), scoped to the
running server process. Fine for a demo; a real deployment would swap this
for a database without touching the agent loop or tool interfaces.

## Tools available to the agent

| Tool | Purpose |
|---|---|
| `lookup_customer` | Find a customer by ID, email, name, or order ID |
| `get_order` | Fetch a specific order's details |
| `check_refund_eligibility` | Run the order through the policy engine — the agent must call this before any decision |
| `process_refund` | Approve + apply a refund (only succeeds if the policy engine says `approve`) |
| `deny_refund` | Record a denial with a reason |
| `escalate_to_human` | Flag the request for manual review |

## Running locally

```bash
npm install
cp .env.local.example .env.local
# add your Groq API key to .env.local — get one free at https://console.groq.com/keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the customer chat,
and [http://localhost:3000/admin](http://localhost:3000/admin) for the
reasoning-log dashboard (open it in a second tab while you chat).

### Try these order IDs

| Order | Scenario | Expected outcome |
|---|---|---|
| `ORD-1001` | Standard item, delivered 10 days ago | Approved |
| `ORD-1002` | Standard item, delivered 45 days ago | Denied — past 30-day window |
| `ORD-1003` | Damaged item, delivered 40 days ago | Approved — 45-day damaged-item extension |
| `ORD-1004` | Digital e-book | Denied — non-refundable category |
| `ORD-1005` | Final-sale jacket | Denied — non-refundable category |
| `ORD-1006` | TV, $649.99 | Escalated — over $500 |
| `ORD-1007` | Customer has 3 refunds in 90 days | Escalated — fraud guard |
| `ORD-1008` | Order still "processing" | Denied — not yet delivered |
| `ORD-1013` | Order already refunded | Denied — duplicate request |

## Voice input

Click the 🎤 button in the chat input (Chrome/Edge; the Web Speech API isn't
available in every browser) to dictate a message instead of typing it.

## Tech stack

Next.js 16 (App Router), React 19, JavaScript, Groq SDK. No CSS framework —
hand-written CSS in `app/globals.css`.
