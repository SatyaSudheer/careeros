# CareerOS

A local resume workspace for maintaining a master profile, tailoring ATS-friendly resumes, tracking job applications, and exporting to PDF, DOCX, or plain text.

## Features

- Master profile and resume-specific editing
- Live paginated Letter-size resume preview
- Multiple resume themes, including senior leadership and compact layouts
- Resume styling controls for font scale and accent color
- Career highlights, work experience, education, skills, projects, and certifications
- ATS score checklist with practical readiness signals
- Job Tracker for JDs, application status, hiring rounds, round notes, closure notes, and resume versions shared
- Dedicated preparation plan builder for general or company/JD-targeted prep, with trackable items, priorities, due dates, resources, status, and chase notes
- Dashboard metrics across resumes, active jobs, applications, interviews, and resume tags
- Exports to PDF, DOCX, and TXT
- PDF output uses the same page size and styling decisions as the preview

## Tech Stack

- Client: React, Vite, Tailwind CSS, lucide-react
- Server: Express, SQLite via `node:sqlite`
- PDF export: `puppeteer-core` with local Chrome
- DOCX/TXT export: server-side generators

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

## Data Storage

Resume data is stored locally in SQLite at:

```text
resumes.db
```

The database lives at the project root. SQLite WAL/SHM files are intentionally ignored by git. To share seed data, export/import it separately rather than committing the local database.

If `resumes.db` is missing, the server creates it automatically on startup and runs the schema bootstrap in `server/db.js`.

## Exports

The server provides export endpoints for each resume:

- `GET /api/resumes/:id/pdf`
- `GET /api/resumes/:id/docx`
- `GET /api/resumes/:id/txt`

PDF export requires Google Chrome or a compatible Chromium installation available on the machine.

## Project Structure

```text
client/              React application
client/src/pages/    Dashboard, editor, and profile pages
client/src/components/editor/
                     Resume editing sections
client/src/components/preview/
                     Theme rendering and pagination
server/              Express API and export generation
server/db.js         SQLite schema and migrations
server/pdf.js        PDF HTML rendering and generation
server/exporters.js  TXT and DOCX generation
```

## Notes

- Keep resume layout changes mirrored between `client/src/components/preview/themes.jsx` and `server/pdf.js` when the PDF should match the preview.
- Avoid committing local databases, generated PDFs, or build outputs.
- The preview and PDF use Letter sizing for consistency.
