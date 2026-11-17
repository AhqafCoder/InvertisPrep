# Security Policy

## Reporting a vulnerability

Please report security issues privately to **support@invertisprep.in** — do
not open a public GitHub issue for anything you believe is exploitable.

Include: a description of the issue, steps to reproduce or a proof of concept,
and the affected service(s) (`client`, `server`, `pdf-service`, `quiz-server`).

We aim to acknowledge reports within a few days and will work with you on a
fix and disclosure timeline.

## Scope notes

- Client-side protections (devtools blocking, screenshot guards, PDF
  watermarks) are **deterrence, not DRM** — known bypasses are not
  vulnerabilities unless they expose data the server should have protected.
- The PDF watermark is intentionally generic (no per-user identifiers) to keep
  the shared Redis cache valid.
- If you find secrets committed anywhere, report immediately — do not test
  them against production.
