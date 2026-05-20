# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hubble is a full-stack real-time messaging app with video calling. The backend is a minimal Express.js API — most real-time chat logic lives in the Stream Chat SDK on the frontend. The backend's main jobs are: generating Stream auth tokens, persisting messages to MongoDB (for search), and syncing users via Inngest background jobs.

## Development Commands

**Backend** (from `backend/`):
```bash
npm run dev     # nodemon with Sentry instrumentation (--import ./instrument.mjs)
npm start       # production start
```

**Frontend** (from `frontend/`):
```bash
npm run dev     # Vite dev server (localhost:5173)
npm run build   # production build → dist/
npm run lint    # ESLint
npm run preview # preview production build
```

No root-level package.json — run commands from each subdirectory.

## Architecture

### Tech Stack
- **Backend:** Express 5 (ES Modules), MongoDB + Mongoose, Clerk (auth), Stream Chat (server SDK), Inngest (background jobs), Sentry
- **Frontend:** React 19, Vite 7, Tailwind CSS v4 (via `@tailwindcss/vite`), Clerk React, Stream Chat React + Video SDKs, TanStack Query, Axios, React Router 7, Sentry

### Data Flow

**Authentication:**
```
Clerk → Frontend useAuth → Axios interceptor adds JWT Bearer → backend protectRoute middleware
```

**Real-time messaging:**
```
User → Stream Chat React (frontend) → Stream Chat API (cloud)
Stream Chat → backend webhooks → MongoDB (message persistence for search)
```

**User sync (background):**
```
Clerk webhook → Inngest → sync user to MongoDB + Stream Chat → add to public channels
```

### API Endpoints

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/chat/token` | ✅ | Generate Stream Chat user token |
| GET | `/api/channels` | ✅ | Get current user's channels |
| POST | `/api/channels` | ✅ | Create a channel |
| GET | `/api/messages/:channelId` | ✅ | Get channel messages from MongoDB |
| GET | `/api/messages/:channelId/search` | ✅ | Full-text search messages in MongoDB |
| POST | `/api/messages/sync` | ✅ | Sync a message to MongoDB |
| POST | `/api/webhooks/stream/message-new` | ❌ | Stream webhook: new message |
| POST | `/api/webhooks/stream/message-updated` | ❌ | Stream webhook: updated message |
| POST | `/api/webhooks/stream/message-deleted` | ❌ | Stream webhook: deleted message |
| POST | `/api/inngest` | Inngest | Inngest function handler |

### MongoDB Models
- **User:** `clerkId`, `email`, `name`, `image`
- **Channel:** `name`, `slug`, `type` (public/private), `members[]`, `createdBy`, `category`
- **Message:** `streamMessageId`, `channelId`, `userId`, `text`, `attachments[]`

### Frontend Structure
- `src/providers/AuthProvider.jsx` — Axios interceptor that injects Clerk JWT into every request
- `src/hooks/useStreamChat.js` — Initializes Stream Chat client and connects the authenticated user
- `src/lib/api.js` — All API call functions (token, messages, search, sync)
- `src/lib/axios.js` — Axios instance pointed at `VITE_API_BASE_URL`
- `src/pages/HomePage.jsx` — Main chat UI using Stream Chat React components
- `src/pages/CallPage.jsx` — Video calling via Stream Video SDK
- `src/styles/stream-chat-theme.css` — ~1000 lines of custom Stream Chat theming (glassmorphism dark theme)

## Environment Variables

**Backend `.env`:**
```
PORT=5001
NODE_ENV=development
MONGO_URI=
CLIENT_URL=http://localhost:5173
CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
STREAM_API_KEY=
STREAM_API_SECRET=
SENTRY_DSN=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```

**Frontend `.env`:**
```
VITE_CLERK_PUBLISHABLE_KEY=
VITE_STREAM_API_KEY=
VITE_SENTRY_DSN=
VITE_API_BASE_URL=http://localhost:5001/api
```

## Deployment

Both backend and frontend deploy to Vercel:
- **Backend:** Serverless via `@vercel/node` (`backend/vercel.json`)
- **Frontend:** SPA with catch-all rewrite (`frontend/vercel.json`)

Sentry must be initialized before the app loads — backend uses `instrument.mjs` loaded via Node.js `--import` flag (required in both dev and production scripts).

## Key Conventions

- Backend uses ES Modules (`"type": "module"` in package.json) — use `import`/`export`, not `require`
- Tailwind CSS v4 syntax: configured via `@tailwindcss/vite` plugin, imported with `@import "tailwindcss"` (not `@tailwind base` directives)
- Stream Chat token flow: frontend calls `/api/chat/token` → backend uses `StreamServerClient.createToken(userId)` → frontend connects with that token
- MongoDB is used only for message search/history; Stream Chat is the source of truth for real-time state
