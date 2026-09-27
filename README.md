# Pranav P — Portfolio

Personal portfolio with a first-person chatbot backed by vectorless RAG.

## Dev

1. `npm install`
2. Set `NVIDIA_API_KEY` (free key from build.nvidia.com) — either `cp .env.local.example .env.local` and paste it in, or (if the repo is linked to a Vercel project) `npx vercel env pull .env.local` to fetch it from the dashboard. The chat runs on NVIDIA's free hosted endpoints through an OpenAI-compatible client; `LLM_MODEL` and `LLM_BASE_URL` switch model or provider.
3. `npm run build-index` to (re)build `tree.json` from `knowledge/*.md`.
4. Run the dev server: `npx vercel dev` (don't add `"dev": "vercel dev"` to package.json — Vercel will recurse).

Tests: `npm test` (Node built-in runner, ~50 unit tests across parser, tree, ratelimit, sse, router, answerer, llm client, newsletter builders).

## Newsletter sync (local-only tool)

```
cd tools/newsletter-sync
python -m venv .venv && .venv\Scripts\activate
pip install -e ".[dev]"
cp .env.example .env  # fill in GOOGLE_CLIENT_ID / SECRET + PORTFOLIO_REPO_PATH
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

See `tools/newsletter-sync/README.md` for details.

## Deploy

Connect the repo to Vercel (Settings → Git → Connect Git Repository). Set `NVIDIA_API_KEY` in **Production** and **Preview** environments. Every push to `main` auto-deploys.
