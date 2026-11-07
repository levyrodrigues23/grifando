# Security policy

## Reporting a vulnerability

Please report security problems privately through GitHub Security Advisories:
**Security tab → Report a vulnerability** on this repository. Do not open a public issue or
pull request for something exploitable.

This is a personal project maintained in spare time. Expect an acknowledgement within a few
days, not a service-level agreement.

## In scope

- **AI key handling**: anything that makes a visitor's key leave their browser other than in
  the `x-ai-provider` / `x-ai-key` headers to this app's own routes, or that gets it stored,
  logged, put in a URL, or sent to analytics.
- **The session cookie** (`ig_session`): forging, guessing, fixation, or reading another
  visitor's data.
- **Data deletion**: `DELETE /api/me` and the daily cleanup job failing to remove what the
  privacy page says they remove.
- **Rate limits**: bypasses that allow unbounded use of AI-calling routes or the database.
- Secrets committed to the repository, and injection / XSS / CSP bypasses.

## Out of scope

- A visitor's own AI provider account (Google, Anthropic): its quotas, billing, data-use
  terms, or a key the visitor chose to paste elsewhere.
- Findings that need a compromised browser, device, or deployment environment.
- Denial of service through volumetric traffic, and automated scanner output without a
  working proof of concept.
