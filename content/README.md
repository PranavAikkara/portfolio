# content/

Content files committed to the repo and consumed by build scripts at Vercel's `prebuild` step.

## newsletters/

- `index.json` — flat array of every synced newsletter's metadata, newest-first. Read by the list page generator.
- `<slug>.json` — one file per email, full sanitized body. Read by the detail page generator.

Files here are written by `tools/newsletter-sync/` on Pranav's laptop and pushed via git. Do not hand-edit unless you know what you're doing — the sync app treats `index.json` as its dedupe source of truth.
