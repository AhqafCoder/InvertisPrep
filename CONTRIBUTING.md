# Contributing to InvertisPrep

Thanks for your interest in improving InvertisPrep! This repo is a monorepo of
four services — `client/` (Next.js), `server/` (main API), `pdf-service/` and
`quiz-server/`.

## Getting started

1. Fork the repo and create a branch from `devlopment` (e.g. `feat/quiz-streaks`).
2. Follow the [Local Setup](README.md#local-setup) section in the README.
3. Copy every `.env.example` to a real `.env`/`.env.local` and fill in values —
   **never commit `.env` files or real secrets.**

## Before you open a PR

- `cd client && npm run build` — must pass (this also typechecks).
- `npm run lint` in whichever service you touched.
- If you changed auth, PDF or cross-service behavior, run the relevant smoke
  tests in `server/scripts/` and mention the result in the PR.
- Keep PRs focused: one feature or fix per PR, with a short description of
  **what changed and why**.

## Conventions

- **Client**: TypeScript, Tailwind utility classes, shadcn/ui primitives.
  Public data pages are server-rendered (RSC + `revalidate`) — see
  `client/app/pyq/page.tsx` for the pattern before adding client-side fetching.
- **Servers**: ESM Node, environment-driven config (zod-validated in
  pdf-service). No secrets or personal data in code — use env vars.
- Data pages should degrade gracefully: a failed upstream fetch must fall back
  to the client fetch path, never blank the page.

## Reporting bugs

Open a GitHub issue with steps to reproduce, expected vs actual behavior, and
your environment. For security vulnerabilities, **do not** open a public
issue — follow [SECURITY.md](SECURITY.md).
