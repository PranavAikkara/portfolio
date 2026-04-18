# Pranav P — Portfolio

Personal portfolio with a first-person chatbot backed by vectorless RAG.

## Dev

1. `cp .env.local.example .env.local` and fill in `GROQ_API_KEY`.
2. `npm install`
3. `npm run build-index` to build `tree.json` from `knowledge/*.md`.
4. `npm run dev` to run locally via Vercel CLI.

## Deploy

Connect the repo to Vercel, set `GROQ_API_KEY` in the dashboard, push.
