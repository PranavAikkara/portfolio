# PRODUCT.md

## What this is
Personal portfolio site for **Pranav P** — Data Scientist & GenAI Engineer. The site is the product: a visitor's impression is the deliverable. Source of truth for content is `Pranav_AI_Engineer_Resume.pdf`.

## Register
Brand (design IS the product). Portfolio / personal brand surface.

## Audience
Hiring managers, GenAI/ML recruiters, and engineering leads evaluating Pranav for data-science / LLM-engineering roles. Technical readers who can tell real systems work from buzzwords.

## Brand voice (three concrete words)
Precise · instrumented · calm-technical. The feeling of a calibration lab at first light: white paper, cool mineral instruments, one clear teal signal.

## Design direction — "Instrument"
- **Theme:** light. Pure-white paper surfaces; the mood lives in the teal primary + typography, not in a tinted background.
- **Color strategy:** Committed-but-disciplined. Mineral teal carries identity; one warm coral as <5% punctuation.
- **Palette (OKLCH):** bg near-pure white, cool near-black ink, mineral-teal primary (hue ~200), coral accent (hue ~32).
- **Type:** Bricolage Grotesque (display), Hanken Grotesk (body), JetBrains Mono (telemetry labels/data).
- **Signature motif:** animated SVG time-series "signal" curve (nods to his satellite DTW work), hairline measurement grids, tabular-figure telemetry.
- **Anti-slop guardrails:** no editorial-serif lane, no cream/sand bg, no AI-blue-gradient SaaS, no dark-terminal reflex, no numbered/uppercase eyebrow on every section. Numbering only where a real sequence exists (the work timeline).

## Sections
Hero · About (summary) · Work experience (timeline) · Projects · Skills · Education & Certifications · Contact. Plus a required bottom-right **AI-twin chatbot** widget (UI-only, simulated replies, no backend yet).

## Constraints
- New standalone build; do NOT modify the existing site under `public/`.
- No backend this round. Chatbot is a believable UI demo.
- Single self-contained HTML file for portability.
- Accessible: WCAG AA contrast, keyboard paths, `prefers-reduced-motion` honored.
