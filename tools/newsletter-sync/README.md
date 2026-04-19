# newsletter-sync

Local-only tool that reads newsletters from Pranav's Gmail, sanitizes them, and
writes JSON into the portfolio repo. Never deployed.

## Setup (once)

1. Create a Python 3.11+ virtualenv:
   ```
   cd tools/newsletter-sync
   python -m venv .venv
   .venv\Scripts\activate       # Windows PowerShell
   pip install -e ".[dev]"
   ```

2. Create OAuth credentials in Google Cloud Console:
   - New project → enable Gmail API
   - Create OAuth client ID, type **Desktop app** (loopback flow)
   - Copy Client ID + Secret into `.env`

3. Copy `.env.example` to `.env` and fill in values.

## Running

```
cd tools/newsletter-sync
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000. First visit will prompt Gmail OAuth.

## Files

- `app/main.py` — FastAPI routes
- `app/oauth.py` — Gmail OAuth flow
- `app/gmail.py` — message fetch
- `app/sanitize.py` — HTML sanitizer
- `app/senders.py` — sender allowlist
- `app/writer.py` — write JSON + git commit/push
- `app/config.py` — env settings
- `data/token.json` — OAuth token (gitignored, stays local)
- `data/last_sync.json` — last sync timestamp (gitignored, stays local)
- `<PORTFOLIO>/content/newsletters/senders.json` — allowlist, in the portfolio repo
- `<PORTFOLIO>/content/newsletters/index.json` + `<slug>.json` — synced content

## Tests

```
pytest
```
