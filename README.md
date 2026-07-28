# CareerOS

A local-first career workspace: maintain a master profile, tailor ATS-friendly resumes, track applications, decide what role you actually want, and drill interview questions — all stored on your own machine.

## Features

### Resume building

- Master profile plus resume-specific editing, with per-resume clones for tailoring
- Live paginated Letter-size preview that matches the PDF output
- **15 themes** covering different audiences — Classic, Modern, Executive, Minimal, Leadership, Compact, Luxe, Prestige, Folio, Editorial, Technical, Heritage, plus **Graduate** (education-first for new grads), **Academic** (research CV) and **Swiss** (typographic)
- Style controls for font scale and accent color that **every theme honors**
- Career highlights, work experience, education, skills, projects, and certifications
- Three editor layouts — **Split**, full-page **Form** (with a scaled live preview rail), and **Preview** — remembered across sessions

### Resume quality — Hiring Panel Score

A weighted rubric modeled on how FAANG-tier screens actually evaluate, replacing a simple completeness checklist:

- **Recruiter screen (25%)** — contact basics, location, LinkedIn, summary, title tagline
- **Impact & writing (40%)** — share of bullets opening with strong action verbs, share carrying quantified results, scannable length, plus detection of weak phrases ("responsible for"), first-person pronouns, and clichés
- **Structure & parsing (25%)** — titles/companies/dates on every role, bullets per job, categorized skills
- **Job match (10%)** — keyword coverage against a pasted job description

Failed checks explain *why*, and **Panel notes** name the exact bullet and problem.

### JD matching

- Paste or link a job description to see **covered vs. missing keyword chips**
- The Job Tracker shows a **match score per resume** for each tracked job, computed from the JD already stored on that application — no re-pasting
- Matching logic lives in one shared module (`shared/jdMatch.js`) used by both client and server, so the editor and tracker never disagree

### AI assistance (bring your own key)

Optional, entirely user-configured, and **off by default** — no AI affordances appear until you add a key.

- **Providers**: Anthropic Claude, OpenAI, Google Gemini, or any **OpenAI-compatible endpoint** (Ollama, OpenRouter, Groq, LM Studio, vLLM)
- **Bullet rewriter**: turns a flagged bullet into 2–3 impact-driven candidates using the XYZ formula, shown with the source phrases each rewrite is grounded in
- **Truthfulness guardrails**: prompts forbid invented facts, *and* a code-level check flags any number in the output that doesn't appear in your source material. Missing metrics come back as an `[ADD METRIC]` placeholder you must fill — never a guess
- **You stay in control**: the agent proposes, you dispose. Candidates are editable, nothing is written until you click Apply, and every accepted change is recorded in an audit trail

See [AI setup](#ai-setup) below.

### Job Tracker

- Pipeline stepper for status (Saved → Applied → Screening → Interview → Offer, plus Rejected/Closed)
- **Autosave everywhere** — no Save button, and pending edits flush before any action that reloads the record
- Grouped fields: role & posting, timeline & contacts, job description, closure notes
- Hiring rounds with per-round autosave, notes, and outcomes
- Resume tagging with live JD match scores

### Next Role

A structured worksheet based on Lara Hogan's [four lists framework](https://larahogan.me/blog/four-steps-identifying-your-new-role/):

- One **"I'm optimizing for…"** statement — the thing you cannot budge on
- Three sortable lists: **Must-Haves**, **Nice-to-Haves**, **Don't-Cares**, with items movable between them
- **Job Fit** scoring — answer ✓/✗ per criterion for each tracked job; a single ✗ on a must-have rules a role out, and jobs rank by fit

### Question Bank

**182 interview questions** across four categories, with practice tracking:

| Category | Count | Grouping |
|---|---:|---|
| System Design | 113 | 10 archetypes (Social Feed, Money Movement, …) |
| ML System Design | 46 | 8 archetypes (Recommendation & Ranking, Trust & Safety, …) |
| Low Level Design | 16 | Object design problems, foundations, concurrency |
| System Design Patterns | 7 | Cross-cutting techniques |

- Questions grouped by **archetype**, each with the "probe underneath" it tests — drill the pattern, not the question
- **Practice tracking** with timestamps, a progress ring, per-archetype progress, and a weekly momentum indicator
- **Per-question notes** that autosave and are searchable
- **Add your own questions** in any category (stored separately from the seeded content)
- **Reset** progress globally, per category, or per archetype — notes are always kept
- **Generate a prep plan** from any mix of categories and archetypes, optionally targeted at a tracked job; each question becomes a trackable prep item with priority derived from level

### Preparation plans

- General or company/JD-targeted plans with trackable items, priorities, due dates, resources, status, and chase notes
- Generated directly from the Question Bank, or built by hand

### Dashboard & exports

- Metrics across resumes, active jobs, applications, interviews, and resume tags
- Exports to **PDF, DOCX, and TXT**, with ATS-safe section ordering and no stray markdown
- PDFs are **tagged** (structured for parsers and screen readers) and carry proper Title metadata
- No blank trailing pages — trailing margins are neutralized before printing

## Tech Stack

- Client: React, Vite, Tailwind CSS, lucide-react
- Server: Express, SQLite via `node:sqlite`
- PDF export: `puppeteer-core` with local Chrome
- DOCX/TXT export: server-side generators
- AI: provider-agnostic layer (`server/llm.js`); `@anthropic-ai/sdk` plus plain HTTP for other providers

## Getting Started

Install all dependencies:

```bash
npm run install:all
```

Start the full development stack:

```bash
npm run dev
```

The app normally runs at:

- Client: `http://localhost:5173`
- Server API: `http://localhost:3001`

If Vite finds the client port busy, it will choose the next available port.

## AI Setup

AI features are optional. Without a key, the app works fully — you simply won't see the ✨ Fix affordances.

**Recommended — in the app:** open **AI Settings** in the sidebar, pick a provider, enter a model and API key, then **Save & Test** to verify the round trip. Settings apply immediately with no restart.

For a local, no-cost setup choose **OpenAI-compatible** and point it at Ollama:

```text
Base URL:  http://localhost:11434/v1
Model:     llama3.3
API key:   (leave blank)
```

**Alternative — environment variables** (used as a fallback when no key is saved in the app):

```bash
export ANTHROPIC_API_KEY=...   # or OPENAI_API_KEY / GEMINI_API_KEY
```

The key is stored locally in your personal database and is **never returned by the API** — clients only ever receive a `has_key` flag and a `…last4` hint.

## Data Storage

Two SQLite databases at the project root, split along a **PII boundary**:

```text
resumes.db          PERSONAL — never share
careeros-shared.db  reference content only
```

**`resumes.db`** holds everything you author: resumes, master profile, job applications and contacts, hiring rounds, prep plans, Next Role lists, question practice state and notes, the AI audit trail, and `app_settings` (including your LLM API key).

**`careeros-shared.db`** holds only the seeded question bank content — no user data. It is attached to the same connection, so cross-database queries work normally.

Both are gitignored. The shared database is a **derived artifact**: `server/questionBank.js` is the source of truth, and the server reseeds on boot, so a fresh clone regenerates all 182 questions automatically.

Missing databases are created automatically on startup by `server/db.js`, which also runs schema migrations for existing installs.

Override the paths with `CV_BUILDER_DB_PATH` and `CV_BUILDER_SHARED_DB_PATH`.

### Adding seeded questions

Edit `server/questionBank.js` and restart. Each bank pairs a category with its own archetypes and questions. The seeder upserts by question number, so additions and corrections reach existing databases while practice state — keyed by the same number in the personal database — is untouched.

> Question numbers are stable identifiers. Never renumber an existing entry; add new numbers instead.

## Available Scripts

### Make Commands

The Makefile is the quickest way to run common local workflows:

```bash
make help       # show all Makefile targets
make install    # install root, server, and client dependencies
make dev        # run server and client in the foreground
make dev-bg     # run nodemon and Vite in the background
make start      # start server and client in the background
make stop       # stop background server/client processes
make restart    # stop and start again
make status     # show server/client process status
make logs       # tail server and client logs together
make server-log # tail only the server log
make client-log # tail only the client log
make build      # build the client for production
```

Background commands write logs and PID files to `/tmp`:

```text
/tmp/careeros-server.log
/tmp/careeros-client.log
/tmp/careeros-server.pid
/tmp/careeros-client.pid
```

### NPM Scripts

From the repo root:

```bash
npm run dev         # run client and server together
npm run client      # run only the Vite client
npm run server      # run only the Express server
npm run install:all # install root, server, and client dependencies
```

From `client/`:

```bash
npm run build
npm run preview
```

From `server/`:

```bash
npm run start
npm run dev
```

## API Overview

Resumes and content:

```text
GET/POST/PUT/DELETE  /api/resumes[/:id]        and nested section routes
POST                 /api/resumes/:id/clone
GET                  /api/resumes/:id/pdf|docx|txt
```

Jobs, prep, and planning:

```text
GET/POST/PUT/DELETE  /api/jobs[/:id]           rounds, resume tagging
GET                  /api/jobs/:id/match       JD match score per resume
GET/POST/PUT/DELETE  /api/prep-plans[/:id]     and plan items
GET/PUT/POST/DELETE  /api/next-role            criteria and per-job checks
```

Question bank:

```text
GET                  /api/questions            seeded + custom, with progress
POST                 /api/questions            add a custom question
PUT                  /api/questions/:key       practice state / notes  ('shared:42' | 'custom:3')
PUT/DELETE           /api/questions/custom/:id edit or remove a custom question
POST                 /api/questions/reset      optionally scoped by category/archetype
```

AI:

```text
GET                  /api/ai/status
GET/PUT              /api/settings/ai          provider config (key never returned)
POST                 /api/settings/ai/test     live connection test
POST                 /api/resumes/:id/ai/rewrite-bullet
POST                 /api/resumes/:id/ai/changes   audit trail
```

PDF export requires Google Chrome or a compatible Chromium installation on the machine.

## Project Structure

```text
client/                         React application
  src/pages/                    Dashboard, Editor, Profile, JobTracker,
                                PrepDashboard, PrepPlanBuilder,
                                NextRole, QuestionBank
  src/components/editor/        Resume editing sections
  src/components/preview/       Theme rendering and pagination
  src/components/               AtsScore, AiSettingsModal, BulletRewriteModal
server/                         Express API and generation
  db.js                         Schema, migrations, question seeding
  index.js                      API routes
  pdf.js                        PDF HTML rendering and generation
  exporters.js                  TXT and DOCX generation
  llm.js                        Provider-agnostic LLM layer
  ai.js                         AI workflows and truthfulness guardrails
  questionBank.js               Seeded question content (source of truth)
shared/jdMatch.js               JD parsing/matching used by client and server
```

## Notes

- Keep resume layout changes mirrored between `client/src/components/preview/themes.jsx` and `server/pdf.js` when the PDF should match the preview.
- Single-column themes are the safest choice for ATS submission; Folio's two-column layout and the decorative backgrounds in Luxe/Prestige can confuse stricter parsers.
- Never commit local databases, generated PDFs, or build outputs.
- The preview and PDF both use Letter sizing for consistency.
