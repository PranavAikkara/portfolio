# Newsletter Aggregator — Design

**Date:** 2026-04-19
**Owner:** Pranav (it@farmwiseai.com)
**Status:** Design approved, ready for implementation planning

## Goal

A personal AI-newsletter aggregator that lives inside Pranav's existing static portfolio (hosted on Vercel). Visitors see a curated, read-only feed of newsletters Pranav reads ("what I'm reading in AI"). Pranav syncs new content by running a small local app that reads his Gmail, sanitizes the emails, writes them as content files into the portfolio repo, and pushes — Vercel rebuilds and the public feed updates.

## Architecture

Two pieces, one shared repo:

1. **Local sync app** (Python + FastAPI) — runs only on Pranav's laptop. Owns Gmail OAuth, sender allowlist, fetch + sanitize, write files, git commit + push. Never deployed.
2. **Public site** — the existing static portfolio (plain HTML + CSS + vanilla JS, one Node serverless function at `/api/chat`). Adds a `/newsletter` section rendered by a **build-time Node script** (`scripts/build-newsletters.mjs`) that reads the synced JSON files and emits static `public/newsletter/index.html` and `public/newsletter/<slug>.html` pages. No framework, no runtime function, no auth, no DB.

The "bridge" between them is **the git repo itself**. Sync = commit + push. Vercel prebuild = regenerate static pages = publish.

## Repo layout (single combined repo)

```
portfolio/                          # existing static site + chatbot
├── public/                         # static assets served by Vercel
│   ├── index.html                  # (existing) portfolio home
│   ├── styles.css                  # (existing)
│   ├── js/chat.js                  # (existing) chat widget
│   └── newsletter/                 # GENERATED at build time, committed
│       ├── index.html              # list view (all cards)
│       ├── styles.css              # newsletter-specific CSS
│       └── <slug>.html             # one per synced email
├── content/
│   └── newsletters/                # synced JSON output, committed to git
│       ├── index.json              # [{slug, subject, sender_name, date, snippet}]
│       └── 2026-04-19-openai-foo.json   # one file per email
├── scripts/
│   ├── build-index.mjs             # (existing) tree.json builder
│   └── build-newsletters.mjs       # NEW — reads content/newsletters/*.json,
│                                   #       emits public/newsletter/*.html
├── package.json                    # `prebuild` runs both build scripts
└── tools/
    └── newsletter-sync/            # the local Python app (never deployed)
        ├── pyproject.toml
        ├── .env.example            # GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, PORTFOLIO_REPO_PATH
        ├── .gitignore              # token.json, .env
        ├── app/
        │   ├── main.py             # FastAPI entry
        │   ├── oauth.py            # Gmail OAuth (loopback flow)
        │   ├── gmail.py            # fetch logic
        │   ├── sanitize.py         # strip personalization
        │   ├── senders.py          # allowlist storage
        │   ├── writer.py           # write JSON files + index, run git commit/push
        │   └── templates/          # Jinja2 templates for local UI
        └── data/
            ├── token.json          # gitignored
            ├── senders.json        # committed (public "what I read" list)
            └── last_sync.json      # gitignored
```

## Data shape (per email)

```json
{
  "slug": "2026-04-19-openai-the-future-of-agents",
  "subject": "The future of agents",
  "sender_name": "OpenAI",
  "sender_email": "newsletter@openai.com",
  "date": "2026-04-19T08:32:00Z",
  "snippet": "First ~280 chars of plaintext, used in list view",
  "body_html": "Sanitized HTML, used in detail view",
  "body_text": "Sanitized plaintext fallback",
  "gmail_id": "18f3a2bcd..."   // for dedupe
}
```

`index.json` is an array of `{slug, subject, sender_name, date, snippet}` for fast list rendering, sorted newest-first.

## Local app — UI

- `GET /` — dashboard: Gmail connection status, last sync time, "Sync now" button, link to senders.
- `GET /auth` — kicks off OAuth (loopback redirect to `/auth/callback`).
- `GET /senders` — list current allowlist; add/remove sender email or full domain.
- `POST /sync` — fetch new emails since last sync from allowlisted senders, sanitize, write files, commit, push. Returns count of new items.

Bind to `127.0.0.1:8000` only (not `0.0.0.0`).

## Sync flow

1. Determine cutoff: `last_sync` timestamp, or 30 days ago on first sync.
2. For each sender in allowlist, query Gmail: `from:<sender> after:<cutoff>`.
3. For each message, fetch full payload, dedupe by `gmail_id` against `index.json`.
4. Sanitize (see below).
5. Write `content/newsletters/<slug>.json` and update `index.json` (sorted newest-first).
6. `git -C $PORTFOLIO_REPO_PATH add content/newsletters && git commit -m "sync: N newsletters" && git push`.
7. Update `last_sync.json`.

## Sanitization

Public visitors should see educational content only — no personalization, no tracking, no unsubscribe footers.

Strategy:
- Parse HTML with BeautifulSoup.
- Remove: `<img>` tracking pixels (1x1, or src containing tracking domains), all `<a>` whose href contains `unsubscribe` / `preferences` / Pranav's email, common footer blocks (matched by class names like `footer`, `unsubscribe`, or by trailing-block heuristics).
- Replace personalized greetings: regex strip `Hi Pranav,` / `Hello Pranav,` / `Dear Pranav,` from start of body.
- Strip Pranav's email anywhere it appears (replace with empty string).
- Strip `view in browser` / `view online` links.
- Keep: headings, paragraphs, lists, code blocks, images that aren't tracking pixels, content links.

Sanitization is best-effort. Acceptable to ship a "preview before publish" step in v2 if false negatives become a problem.

## Public site — UI

- `/newsletter/` — grid or list of cards: subject (heading), sender_name (subtitle), date, snippet. Newest first. Generated at build time from `content/newsletters/index.json`. Matches the portfolio's existing design system (warm cream, Instrument Serif display, Inter body, burnt-orange accent).
- `/newsletter/<slug>` — full sanitized body, plus subject, sender, date. Back-link to the list.
- Generation: `scripts/build-newsletters.mjs` runs during Vercel's `prebuild` step (same hook that runs `build-index`). Reads `content/newsletters/index.json` and every `content/newsletters/<slug>.json`, emits `public/newsletter/index.html` and `public/newsletter/<slug>.html`. Pure templating via JS template literals — no framework.
- Generated files are committed to git so local `vercel dev` works the same as production.
- No filtering / search in v1. Add per-sender filter later if needed.
- No SEO sitemap / RSS in v1.

## OAuth setup

- Google Cloud Console → create project → enable Gmail API → create OAuth client ID, type **Desktop app** (loopback flow, no app verification needed for personal use).
- Scope: `https://www.googleapis.com/auth/gmail.readonly`.
- Token stored at `tools/newsletter-sync/data/token.json`, **gitignored**.
- Refresh token used to renew access tokens silently.

## Security

- Token + `.env` never committed (gitignored).
- Local app binds to `127.0.0.1` only.
- Sanitizer strips Pranav's email before content hits the repo.
- No Gmail credentials ever go to Vercel; the public site is a static reader.

## Out of scope (v1)

- Search, tag/category, per-sender filter, read tracking, multiple users, mobile sync UI, scheduled background sync, RSS export. All deferrable.

## Open decisions for implementation

- Should `senders.json` be committed (visible list of subscriptions, fits the "what I read" portfolio angle) or gitignored (private)? **Resolved: committed.**
- Snippet length: **Resolved: 280 chars.**
- First-sync window: **Resolved: 30 days.**
- Whether to support multiple selectable allowlists (e.g., "AI", "Engineering"). **Resolved: no, single flat list.**
- Where `/newsletter` is linked from on the portfolio home page. **Default: add a subtle nav link next to "Work / Projects / Stack / Contact"** — commit that as part of the build plan.
