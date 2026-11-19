<div align="center">

<img src="client/public/logo.jpeg" alt="WTFBuilds" width="100">

# 🎓 InvertisPrep

**Free previous-year question papers, syllabi, Quizzo and more — built for Invertis University students.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![Express 5](https://img.shields.io/badge/Express-5-green)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.x-47A248?logo=mongodb&logoColor=white)](https://mongodb.com)
[![Redis](https://img.shields.io/badge/Redis-cache%20%2B%20sessions-DC382D?logo=redis&logoColor=white)](https://redis.io)
[![Node](https://img.shields.io/badge/Node-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**A product by [WTFBuilds](https://wtfbuilds.com)** | **Founded by [AhqafCoder](https://ahqafali.dev)**

</div>

---

## 📑 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Monorepo Structure](#monorepo-structure)
- [Data Models](#data-models)
- [API Reference](#api-reference)
- [Authentication](#authentication)
- [Caching Strategy](#caching-strategy)
- [PDF Pipeline](#pdf-pipeline--cloudinary-storage)
- [Security](#security)
- [Environment Variables](#environment-variables)
- [Local Setup](#local-setup)
- [Testing & Validation Scripts](#testing--validation-scripts)
- [npm Scripts](#npm-scripts)
- [Deployment](#deployment)
- [Android WebView App](#android-webview-app)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

InvertisPrep lets students find previous-year question papers organized by
**department → branch → semester → session → exam type**. Students log in with
Google; papers uploaded by students must be **verified by staff** before they
appear publicly. Around that core it has grown into a full student platform:
Quizzo (real-time 1v1 quiz battles), a resume builder with an ATS scorer,
QCoins wallet, leaderboard, events, clubs, syllabus library, careers board and
a support/reporting workflow.

This repo contains the complete stack:

| Service | Port | Role |
|---|---|---|
| **client** (Next.js 16) | 3000 | App Router frontend — server-rendered public pages, admin suite |
| **server** (Express 5) | 5000 | Main API: auth, users, departments, syllabus, resumes, wallet, events, clubs, careers, mail, activity |
| **pdf-service** (Express 5) | 5002 | PYQ CRUD, PDF upload, watermarking, view/download streaming |
| **quiz-server** (Express + Socket.io) | 5001 | Quizzo: matchmaking, live 1v1 quiz engine, history, leaderboard |

All services share **MongoDB** and **Redis** and validate the **same JWT** —
the client talks to each service through same-origin rewrites, so backend URLs
never reach the browser bundle.

---

## Features

**PYQ core**
- 🔍 Browse papers by department → branch → semester → session → exam type, with instant client-side search
- 🔗 Slug URLs (`/pyq/btech`) with ObjectId back-compat
- ⬆️ Staff upload + student upload (verified before public, 10/day IST cap)
- ✅ Verification workflow for staff (`student | srt | admin | super-admin` roles)
- 🖼️ Generic watermarking (render once, cached 24 h in Redis) + protected canvas PDF viewer
- 📄 Server-rendered listing pages (Next.js ISR) — instant paint, SEO-friendly

**Student platform**
- 🧠 **Quizzo** — real-time 1v1 quiz matches, matchmaking queue, rooms, weekly leaderboard
- 📝 **Resume builder** — ATS score analyzer, templates, PDF export, guest-mode with migration on login
- 🪙 **QCoins wallet** — Razorpay top-ups, free downloads, full transaction log
- 🏆 Leaderboard (all-time + weekly, department filter)
- 🎉 **Events** — admin-authored pages with rich HTML content, registration links, drafts
- 🏫 **Clubs** — seeded directory with detail pages and RSVP
- 📚 **Syllabus library** — department-wise PDF downloads
- 💼 **Careers board** — applications with status tracking
- 📨 **Paper requests & bug reports** — with reply notifications
- 👥 Social graph — follow/unfollow, public profiles

**Admin suite** (role-gated)
- 📊 Dashboard with live activity monitoring + growth analytics (drill-down to real users)
- 📬 **Mail Center** — automail, IMAP mailbox, compose, logs, editable email templates (SES-powered)
- 👤 User & role management with custom roles + fine-grained permissions
- 🗃️ Database backup/restore (EJSON gzip export, chunked import)
- 🛡️ Content moderation — reports, bugs, paper verification queues

---

## Architecture

```
                        ┌──────────────────────────────┐
                        │      CLIENT (Next.js 16)     │
                        │  SSR/ISR public pages + SPA  │
                        │  same-origin /backend /pdfapi│
                        └──────┬───────────────┬───────┘
               Bearer JWT      │               │      Bearer JWT
                              ▼               ▼
        ┌──────────────────────────┐   ┌──────────────────────────┐
        │   MAIN SERVER  (:5000)   │   │   PDF SERVICE  (:5002)   │
        │  Auth · Users · Depts    │   │  PYQ CRUD · Uploads      │
        │  Syllabus · Resumes      │   │  Watermark · View/DL     │
        │  Wallet · Events · Clubs │   │  Redis PDF cache         │
        │  Careers · Mail · Admin  │   │  BullMQ watermark jobs   │
        └─────┬────────┬───────────┘   └────────┬─────────────────┘
              │        │                        │
              │        │  /api/auth/internal    │
              │        └───────────►│ (X-Service-Token guarded)
              ▼                     ▼          ▼
      ┌──────────────────────────────────────┐  ┌──────────────┐
      │        MongoDB (shared database)     │  │   Cloudinary │
      │  users · pyqpapers · departments · … │  │  (raw PDFs)  │
      └──────────────────────────────────────┘  └──────────────┘
                              ▲
                              │
      ┌───────────────────────┴──────────────────┐
      │              Redis (shared)              │
      │  sessions · user cache · PDF cache       │
      │  BullMQ queue (watermark jobs)           │
      └──────────────────────────────────────────┘

        ┌──────────────────────────────────────────┐
        │        QUIZ SERVER (:5001, Socket.io)    │
        │  matchmaking · 1v1 engine · history      │
        │  shares MongoDB + JWT with the stack     │
        └──────────────────────────────────────────┘
```

### Why the split

| Before (monolith) | After |
|---|---|
| User-specific watermarks → re-render per user, high CPU | One generic watermark per paper → render once, cache in Redis |
| Client → main server → PDF proxy hop | Client calls the PDF service directly |
| DB lookup on every authenticated request | Redis-cached user profiles (5-min TTL) |
| PDF bytes cached in per-process LRU only | Shared Redis cache by `paperId` (24-h TTL) |

Measured locally: **cold PDF view ~860 ms** (Cloudinary fetch + watermark + cache
write), **cached view ~47 ms** (≈18× faster).

---

## Tech Stack

### Client (`/client`)
| Layer | Technology |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack, ISR on public pages) |
| UI | **React 19**, **Tailwind CSS v4**, **shadcn/ui** (Radix primitives), `framer-motion`, `lucide-react` |
| PDF Viewer | **react-pdf v10** (`pdfjs-dist`) — canvas rendering, screenshot guard |
| Auth | **next-auth v4** (Google handshake) + app JWT in `localStorage` + httpOnly refresh cookie |
| HTTP | **axios** — dual instances (main + PDF) with auto token-refresh interceptor; **SWR** on client-cached pages |
| Language | **TypeScript** |

### Main Server (`/server`)
| Layer | Technology |
|---|---|
| Runtime | **Node.js** (ESM) |
| Framework | **Express 5** |
| Database | **MongoDB** via **Mongoose 8** |
| Auth | **jsonwebtoken** (15-min access / 7–30-day refresh), **bcryptjs**, **google-auth-library** |
| Email | **Amazon SES** (SMTP), IMAP inbox sync, templated automail |
| Payments | **Razorpay** (QCoins top-ups, webhook signature verification) |
| Security | `helmet`, tiered `express-rate-limit`, prod-aware CORS |

### PDF Service (`/pdf-service`)
| Layer | Technology |
|---|---|
| Framework | **Express 5** |
| PDF processing | **pdf-lib** (generic gradient watermark + branded footer) |
| Cache/Queue | **Redis** (PDF cache) + **BullMQ** (watermark jobs) |
| Config | **zod** env validation |

### Quiz Server (`/quiz-server`)
| Layer | Technology |
|---|---|
| Framework | **Express 5** + **Socket.io 4** |
| Engine | Room + auto matchmaking, live 1v1 quiz engine, MongoDB persistence |
| Auth | Same JWT as the stack (local verify + shared Redis cache) |

The Redis client is **vendored per service** (`src/shared/redisClient.js`) so
each service deploys as a fully self-contained unit — no cross-package
dependencies, no monorepo tooling needed. If you change one copy, change both.

---

## Monorepo Structure

```
InvertisPrep/
├── client/                      # Next.js 16 frontend (:3000)
│   ├── app/
│   │   ├── pyq/                 # /pyq (departments) → /pyq/[departmentId] — SSR'd
│   │   ├── view/[id]/           # protected watermarked PDF viewer
│   │   ├── events/ club/ careers/ resources/syllabus/
│   │   ├── quizz0/              # Quizzo UI (play, rooms, history, leaderboard)
│   │   ├── admin/               # dashboard, papers, users, mail, activity, backup…
│   │   ├── wallet/ resumes/ leaderboard/ profile/
│   │   └── api/                 # Next route handlers (NextAuth, ATS proxy)
│   ├── components/              # Navbar, PDFViewer, brand/, ui/* (shadcn)
│   ├── contexts/                # AuthContext, QuizSocketContext
│   ├── hooks/ lib/ types/
│   └── next.config.ts           # rewrites (/backend, /pdfapi), security headers
│
├── server/                      # Main API service (:5000)
│   ├── src/
│   │   ├── server.js            # bootstrap, CORS, rate-limit tiers, route mounts
│   │   ├── models/ controllers/ routes/ services/ middleware/ utils/
│   │   └── shared/redisClient.js
│   └── scripts/                 # operational scripts (see Testing section)
│
├── pdf-service/                 # PDF/PYQ microservice (:5002)
│   └── src/                     # server, models, controllers, services (watermark), utils
│
├── quiz-server/                 # Quizzo realtime server (:5001)
│   ├── src/server.js            # Express + Socket.io bootstrap
│   ├── src/socket/              # matchmaking + quiz engine
│   └── src/seed/seedQuestions.js
│
├── scripts/generate-club-seed.mjs   # regenerates server club seed from client clubs.ts
├── docs/                            # brand assets used by this README
├── start-all.sh                     # boots Redis + main + pdf-service + client
└── README.md
```

> The Kotlin Android WebView app lives in a **separate repo** — see
> [Android WebView App](#android-webview-app).

---

## Data Models

Both services read/write the **same MongoDB collections**. The PYQ entity is
`pyqpapers` — the main server's `PYQPaper` model and the PDF service's
`PDFDocument` model both point at it explicitly.

### User (`users`)
`googleId` · `email` (unique) · `password` (select:false) · `name` · `picture` ·
`studentId` · `course` · `followers[]` · `following[]` · `role`
(`student|srt|admin|super-admin` + custom roles) · `isActive` · `qcoins` ·
`freeDownloadsLeft` · `points` · `weeklyPoints`

### PYQ paper (`pyqpapers`)
`title` (auto: `subjectName examType year`) · `subjectCode` · `subjectName` ·
`departmentId` · `branchId` · `additionalBranchIds[]` · `semester` (1–10) ·
`sessionId` · `examType` (`mid-term|end-term`) · `cloudinaryUrl` ·
`cloudinaryPublicId` · `fileSize` · `year` · `uploadedBy` · `views` ·
`downloads` · `verified` · `isActive`

> `cloudinaryUrl` is excluded from public listing responses. PDFs are served
> only through the authenticated, watermarked view/download endpoints.

### Department (`departments`)
`id` (unique slug, e.g. `btech`) · `name` · `displayName` · `icon` ·
`description` · `isActive` — public endpoints resolve **ObjectId or slug**.

### Others
`branches` · `sessions` · `syllabuses` · `resumes` · `transactions` · `pointslogs`
· `bugs` · `events` · `clubs` · `clubregistrations` · `careers` · `careerapplications`
· `paperrequests` · `reports` · `questions` · `quizmatches` · `activitylogs` ·
`presences` · `watermarkjobs`

---

## API Reference

Auth legend: 🔓 public · 🔑 JWT required · 🎫 staff (admin/super-admin/srt) · 👑 admin · 👑👑 super-admin.

### Main Server — `:5000/api`

#### Auth — `/api/auth` (rate-limited, brute-force protected)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | 🔓 | Email/password → access token + user + sets refresh cookie |
| POST | `/auth/google-login` | 🔓 | Verify Google ID token, upsert student → tokens |
| POST | `/auth/refresh` | 🔓 (cookie) | Rotate access token via httpOnly refresh cookie |
| POST | `/auth/logout` | 🔓 | Revoke Redis session + clear cookie |
| GET | `/auth/me` | 🔑 | Current user |
| PUT | `/auth/profile` | 🔑 | Update profile |
| GET | `/auth/internal/user/:userId` | 🔧 | Service-to-service only — `X-Service-Token` (timing-safe) |

#### Resources
| Resource | Notes |
|---|---|
| `/api/departments` | list 🔓 · `/:id` by **ObjectId or slug** 🔓 · branches 🔓 · CRUD 👑 |
| `/api/syllabus` | list 🔓 · upload 🎫 · delete 👑 |
| `/api/users/:id`, follow/unfollow | 🔑 |
| `/api/resumes`, `/api/wallet` | 🔑 (QCoins, Razorpay top-ups, transactions) |
| `/api/leaderboard` | 🔓 rankings + 🔑 my-stats |
| `/api/events`, `/api/clubs` | site content — CRUD 👑 |
| `/api/careers`, `/api/sponsors` | board + applications |
| `/api/paper-requests`, `/api/bugs`, `/api/reports` | student requests & moderation |
| `/api/settings` | public platform settings (gates, toggles) |
| `/api/admin/*` | users, roles, mail, activity, marketing, backup — 👑👑 |
| `/health` | 🔓 liveness |

### PDF Service — `:5002/api`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/pyq` | 🔓 | Public list (`verified:true, isActive:true`) with operator-injection-safe filters |
| POST | `/pyq/upload` | 🎫 | Staff upload |
| POST | `/pyq/upload-public` | 🔑 | Student upload (10/day IST) |
| PATCH | `/pyq/:id/verify` | 🎫 | Verify paper |
| PUT / DELETE | `/pyq/:id` | 👑 | Update metadata / soft-delete + Cloudinary cleanup |
| GET | `/pdf/view/:id?type=pyq\|syllabus` | 🔑 | Inline watermarked PDF (Redis-cached) |
| GET | `/pdf/download/:id` | 🔑 | Attachment with branded RFC-5987 filename |
| GET | `/health` | 🔓 | DB + queue + memory status |

### Quiz Server — `:5001/api/quiz`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/leaderboard` | 🔓 | All-time + weekly rankings |
| GET | `/history` | 🔑 | Player's match history (paginated) |
| GET | `/match/:id` | 🔑 | Match result detail |
| GET | `/stats` | 🔑 | Personal stats |
| POST/DELETE | `/questions` | 🔑 | Question bank management |

Live gameplay runs over **Socket.io** (`quiz:join_queue`, `quiz:submit_answer`,
…) — see `quiz-server/src/socket/`.

---

## Authentication

### Token model
| Token | Lifetime | Storage |
|---|---|---|
| Access token (JWT, `{id, email, role}`) | **15 minutes** | `localStorage` → `Authorization: Bearer` |
| Refresh token (JWT, `type:refresh`) | **7 days** (30 with "remember me") | httpOnly `refreshToken` cookie + Redis session hash |

### Flows
- **Login (Google or password)** → both tokens signed, `session:{userId}` stored
  in Redis, `user:{userId}` cached (5-min TTL).
- **Every authenticated request** → JWT verified → user loaded from the **Redis
  cache** (zero DB queries in steady state; DB fallback repopulates the cache).
- **Token expiry** → client interceptor catches the 401, calls `/auth/refresh`
  **once** (shared promise — concurrent 401s queue), stores the new token, and
  retries. Users never see a re-login until the refresh cookie itself expires.
- **Background polls** (navbar badges) opt out of forced logout via a
  `skipAuthRedirect` flag — a transient blip never yanks the user to `/login`.
- **Role/status change (admin)** → `User` post-save hook invalidates `user:{id}`
  so revoked roles take effect within seconds.

### Cross-service validation
All services verify the **same JWT** (shared `JWT_SECRET`), check the shared
Redis user cache first, and fall back to the main server's internal endpoint
guarded by `INTERNAL_SERVICE_TOKEN` (timing-safe comparison).

---

## Caching Strategy

| Layer | Key/Window | TTL | Purpose |
|---|---|---|---|
| Redis | `session:{userId}` | 7–30 d | Refresh-token validation, UA/IP metadata |
| Redis | `user:{userId}` | 5 min | Auth middleware profile cache — zero DB auth queries |
| Redis | `pdf:watermarked:{paperId}` | 24 h | Rendered watermarked PDF — shared across users/instances |
| Redis | BullMQ streams | — | Async watermark job queue |
| Next.js | ISR data cache | 60 s–1 h | Public page payloads (`/pyq`, `/events`, clubs, syllabus) — **one** upstream request per window regardless of traffic |

- **Fail-open design**: if Redis is unavailable, auth falls back to DB and PDFs
  regenerate — the site degrades gracefully instead of erroring.
- Rate limiting is currently **in-memory per instance** — use a Redis store
  before horizontal scaling.

---

## PDF Pipeline / Cloudinary Storage

Papers live in **Cloudinary** as `raw` resources and are never served directly.

```
Client ── GET /pdfapi/pdf/view/:id (Bearer JWT) ──► PDF Service
   1. authenticateJWT (Redis-cached user)
   2. lookup paper (pyqpapers) — invalid ids → clean 404
   3. Redis: pdf:watermarked:{id} ── hit ──► stream (≈47ms)
   4. miss ──► Cloudinary fetch ──► pdf-lib watermark ──► cache ──► stream (≈860ms)
```

### Watermark (generic, cache-friendly)
- **One big diagonal `INVERTISPREP`** per page — 68 pt, −35°, 12 % opacity,
  per-character indigo→purple→pink gradient.
- **Branded footer** — "PYQs available for free on www.invertisprep.in".
- **No user email/timestamp** — the output is identical for every viewer, which
  is what makes the shared 24-h cache valid.

### Key files
| File | Purpose |
|---|---|
| `pdf-service/src/services/pdfProcessor.js` | Watermark + footer + Redis cache |
| `pdf-service/src/utils/redisCache.js` | `pdf:watermarked:*` get/set/invalidate |
| `pdf-service/src/controllers/pdfController.js` | View/download handlers |
| `server/src/services/authService.js` | Tokens, Redis sessions, refresh, revoke |
| `client/lib/api.ts` | Dual axios clients, auto-refresh interceptor, `skipAuthRedirect` |
| `client/components/PDFViewer.tsx` | Canvas viewer + screenshot guard |
| `client/components/devtools-guard.tsx` | Global inspect/context-menu deterrence |

---

## Security

| Control | Status |
|---|---|
| Helmet security headers (all three API services) | ✅ |
| Tiered rate limiting — API / auth / read / write / upload / PDF / quiz | ✅ |
| NoSQL operator-injection guards (login + PYQ filters) | ✅ |
| Timing-safe service-token comparison | ✅ |
| CORS: dev-only localhost + prod allow-list | ✅ |
| httpOnly + SameSite=Lax + Secure-in-prod refresh cookie | ✅ |
| Redis-backed session revocation (effective immediately) | ✅ |
| Next.js hardening — `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `poweredByHeader` off, `console.*` stripped from prod bundle | ✅ |
| Browser source maps disabled in production (Next default, kept off) | ✅ |
| Client-side inspect deterrence (F12/shortcuts/context menu) | ✅ deterrence only |
| Secrets gitignored; `.env.example` files carry placeholders only | ✅ |

> **Honesty note:** client-side guards (devtools blocking, screenshot shields,
> watermarks) are **deterrence, not DRM** — determined users can bypass them.
> Real protection lives server-side: authenticated endpoints, redacted listings
> (`cloudinaryUrl` never public), watermarked delivery and audit logs.

---

## Environment Variables

All `.env.example` files carry placeholders — copy them and fill in real values.
Never commit real secrets.

### Main Server (`server/.env`)
| Key | Purpose |
|---|---|
| `PORT` | 5000 |
| `NODE_ENV` | `production` → secure cookies, prod CORS, lean errors |
| `MONGODB_URI` | Shared MongoDB connection string |
| `REDIS_URL` | e.g. `redis://localhost:6379` |
| `JWT_SECRET` | Shared with pdf-service + quiz-server (32+ random bytes) |
| `INTERNAL_SERVICE_TOKEN` | Shared — guards the internal user endpoint |
| `CLOUDINARY_*` | Syllabus uploads |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google login verification |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | QCoins top-ups |
| `SES_*` / `IMAP_*` / `SMTP_*` | Mail Center (send + inbox pull) |
| `CORS_ORIGINS`, `TRUST_PROXY`, `BODY_LIMIT`, `*_RATE_LIMIT_*` | Tuning knobs |

### PDF Service (`pdf-service/.env`)
Shared keys (`MONGODB_URI`, `REDIS_URL`, `JWT_SECRET`,
`INTERNAL_SERVICE_TOKEN`) plus `PORT=5002`, `CLOUDINARY_*`, `MAIN_SERVER_URL`
(internal fallback), `PDF_CACHE_MAX_MB` and rate-limit knobs. Validated by zod
at boot. The BullMQ queue auto-disables (synchronous fallback) if `REDIS_URL`
is unset.

### Quiz Server (`quiz-server/.env`)
| Key | Purpose |
|---|---|
| `PORT` | 5001 |
| `MONGODB_URI` | Shared MongoDB (same cluster) |
| `JWT_SECRET` | **Same value** as the other services |
| `CLIENT_URL` | Allowed browser origin |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` / `TRUST_PROXY` | Rate-limit knobs |

### Client (`client/.env.local`)
| Key | Purpose |
|---|---|
| `API_URL` | Main server base — **server-only**, used by the Next.js rewrite (never in the browser bundle) |
| `PDF_API_URL` | PDF service base — server-only, same |
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | NextAuth (Google handshake only) |
| `NEXT_PUBLIC_QUIZ_SERVER_URL` | Quizzo server (public; optional — defaults to `http://localhost:5001`) |

> 🔒 **No `NEXT_PUBLIC_*` URL variables for the main APIs.** The browser calls
> same-origin `/backend/*` and `/pdfapi/*`; `next.config.ts` rewrites proxy
> them to the real backends using server-only env vars. Backend URLs never
> appear in the browser bundle, CORS becomes a non-issue, and the refresh
> cookie is first-party.

---

## Local Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Redis (`brew install redis && redis-server --daemonize yes`)
- Google OAuth client ID/secret (NextAuth + server verification)

### Option A — everything at once
```bash
./start-all.sh        # Redis + main server + pdf service + client
```

### Option B — individually
```bash
# main server
cd server && cp .env.example .env    # fill values
npm install && npm run dev           # :5000

# pdf service
cd ../pdf-service && cp .env.example .env
npm install && npm run dev           # :5002

# quiz server (optional — only for Quizzo)
cd ../quiz-server && cp .env.example .env
npm install && npm run seed && npm run dev   # :5001

# client
cd ../client && cp .env.example .env.local   # fill values
npm install && npm run dev           # :3000
```

> `pdf-service/.npmrc` sets `legacy-peer-deps=true` — BullMQ declares an
> optional `redis@>=5` peer while the shared cache pins `redis@4`.

---

## Testing & Validation Scripts

Self-cleaning smoke tests that run against your real `.env` (MongoDB + Redis)
— useful after deploys or config changes:

| Script | What it verifies |
|---|---|
| `server/scripts/test-auth-service.mjs` | login → Redis session → cache-validate → refresh → revoke → revoked-token rejection → inactive-user rejection (8 checks) |
| `server/scripts/test-cross-service.mjs` | main-server JWT accepted by pdf-service, internal endpoint w/ service token, Redis user cache, invalid-token rejection (4 checks) |
| `server/scripts/test-google-flow.mjs` | googleLogin DB flow (find/create/save/login/formatUser) |
| `server/scripts/test-pdf-view.mjs` | cold vs cached PDF view timing, Redis cache write, download filename |
| `server/scripts/verify-activity-pipeline.mjs` | E2E activity pipeline (view/presence → aggregates) |
| `server/scripts/verify-role-perms.mjs` | E2E role/permission matrix |
| `server/scripts/verify-support-tickets.mjs` | E2E support-ticket lifecycle |

Operational scripts (also under `server/scripts/` + `scripts/`):
`import-firebase-users.mjs` (one-time user migration), `send_bulk_email.py`
(SES bulk campaigns, dry-run/test modes), `generate-club-seed.mjs` (codegen).

---

## npm Scripts

| Location | Script | Command |
|---|---|---|
| client | `dev` / `build` / `start` / `lint` | `next dev` / `next build` / `next start` / `eslint` |
| server | `dev` / `start` | `node --watch src/server.js` / `node src/server.js` |
| pdf-service | `dev` / `start` | `node --watch src/server.js` / `node src/server.js` |
| quiz-server | `dev` / `start` / `seed` | `node --watch src/server.js` / `node src/server.js` / seed question bank |

---

## Deployment

- **Client** → **Vercel**. Set `API_URL` and `PDF_API_URL` (server-only,
  **without** `NEXT_PUBLIC_` prefix) plus the NextAuth vars — rewrites are
  evaluated at build time, so redeploy after changing them.
- **Main server** → long-running host (Render/Railway/VPS): `npm start`, with
  all env vars above; `NODE_ENV=production`, `TRUST_PROXY=1` behind a proxy.
- **PDF service** → separate service: `npm start`, shared
  `MONGODB_URI`/`REDIS_URL`/`JWT_SECRET`/`INTERNAL_SERVICE_TOKEN`, Cloudinary
  keys, `MAIN_SERVER_URL` pointing at the main server.
- **Quiz server** → separate service: `npm start`, shared
  `MONGODB_URI`/`JWT_SECRET`, `CLIENT_URL` set to the app origin.
- **Redis** → Render Redis / Upstash; all services need the same `REDIS_URL`.
- Deployment order: Redis → main server → pdf-service → quiz-server → client →
  smoke tests (health endpoints, login, PYQ list, PDF view).

---

## Android WebView App

A separate **Kotlin** project wraps the webapp in a native `WebView`; Google
login is bridged via a Chrome Custom Tab and a deep link
(`invertisprep://auth/callback`) that injects the app JWT into the WebView's
`localStorage`. On 401 the webapp's auto-refresh flow keeps the session alive
using the refresh cookie.

---

## Roadmap

- [x] Microservice split (main + pdf-service) with shared Redis/Mongo
- [x] Redis sessions + auto token refresh
- [x] Generic watermark + 24-h shared PDF cache (47 ms cached views)
- [x] Quizzo real-time quiz engine
- [x] Server-rendered public pages (Next.js ISR)
- [x] Transactional email (SES automail + Mail Center templates)
- [x] QCoins payments (Razorpay) + admin backup
- [ ] Redis-backed distributed rate limiting (currently in-memory per instance)
- [ ] Full CSP with nonces (blocked on inline AdSense/Analytics scripts)
- [ ] Load testing & auto-scaling

---

## Contributing

Contributions are welcome! Read [CONTRIBUTING.md](CONTRIBUTING.md) to get
started, and please check [SECURITY.md](SECURITY.md) before reporting anything
sensitive. For bugs and feature ideas, open an issue with steps to reproduce.

---

## License

Released under the [MIT License](LICENSE) — free to use, modify and self-host
with attribution.

---

<div align="center">

**Crafted with ❤️ by Ahqaf & team at Invertis University**
**A [WTFBuilds](https://wtfbuilds.com) product** · [invertisprep.in](https://www.invertisprep.in)

</div>
