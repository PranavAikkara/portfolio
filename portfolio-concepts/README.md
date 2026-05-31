# Portfolio concepts — three directions

Three distinct, self-contained portfolio website designs, each built as a small
multi-page site. They were drawn from real award/template families (Awwwards
portfolio winners, the *Vertical* and *Fuel* Framer templates, neo-brutalist /
editorial-typography trends for 2026), then executed to deliberately avoid the
generic "AI-made" look.

> **Whose portfolio is this?** I wrote the content for **Pranav P, applied AI
> engineer** (the profile in memory: production GenAI, vectorless RAG, voice
> agents, ingestion, fine-tuning). If this is for someone else, tell me and I'll
> re-skin the copy. Nothing here reads or depends on the existing repo.

## The three directions

| # | Name | Aesthetic family | Type & color | Theme |
|---|------|------------------|--------------|-------|
| 01 | **Editorial** | Research-quarterly / print | Newsreader serif + IBM Plex Mono, ink on cool paper, vermilion accent | Light (print concept) |
| 02 | **Terminal** | Industrial-brutalist / dark-tech | JetBrains Mono + Space Grotesk, phosphor green | Dark (concept) |
| 03 | **Atelier** | Swiss kinetic-minimal | Cabinet Grotesk + General Sans, cobalt accent | Light **and** dark (auto) |

Each direction has three pages sharing one stylesheet:

```
01-editorial/   index.html  work.html  about.html  style.css
02-terminal/    index.html  work.html  about.html  style.css
03-atelier/     index.html  work.html  about.html  style.css
```

## View them

Just open any `index.html` in a browser. No build step. To see direction 03 in
dark mode, switch your OS to dark appearance (it follows `prefers-color-scheme`).

For the cleanest local serve:

```powershell
# from e:\portfolio\portfolio-concepts
python -m http.server 8080
# then visit http://localhost:8080/01-editorial/
```

## Notes / what to swap before going live

- **Links & handles** (`hello@pranavp.dev`, `/pranavp`, GitHub/LinkedIn URLs)
  are placeholders. Replace with the real ones.
- **Images** use `picsum.photos` seeded placeholders (grayscale in 01, photographic
  in 03). Swap for real photography or generated art. The portrait slot in
  `01-editorial/about.html` is marked for a real photo.
- **Numbers** are intentionally conservative and labelled illustrative where shown
  (e.g. the terminal stats row). Don't ship fabricated precise metrics; fill in
  your real figures.
- **Fonts** load from Google Fonts (01, 02) and Fontshare (03) via `<link>`, which
  is fine for a demo. For production, self-host with `@font-face` + `font-display: swap`.

## Design discipline applied

Motion respects `prefers-reduced-motion`; reveals use `IntersectionObserver`
(no scroll-event listeners). One accent locked per design, one corner-radius
system per design, one marquee max (03 only), eyebrows rationed, zero em-dashes,
WCAG-AA contrast on CTAs. Each direction carries one idiosyncratic element so it
doesn't read as a template: the editorial *masthead + margin notes*, the terminal
*live shell sessions*, the atelier *kinetic numeric index + drag strip*.
