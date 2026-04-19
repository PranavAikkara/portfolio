# Newsletter Aggregator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/newsletter` section to the existing static portfolio that shows newsletters synced from Pranav's Gmail, plus a local-only Python/FastAPI sync tool that reads Gmail, sanitizes emails, writes JSON content files, and pushes the repo so Vercel rebuilds.

**Architecture:** Two pieces in one repo connected by git. (1) A **build-time Node script** (`scripts/build-newsletters.mjs`) reads `content/newsletters/*.json` during Vercel's `prebuild` and emits static `public/newsletter/*.html`. (2) A **local Python/FastAPI app** under `tools/newsletter-sync/` handles Gmail OAuth, fetches messages from allowlisted senders, sanitizes them, writes JSON, and does `git commit + push`. The sync app never ships to Vercel.

**Tech Stack:** Existing site — Node ESM, `marked` already installed, Node built-in test runner. New site code — zero new deps (pure template literals). Sync app — Python 3.11+, FastAPI, Uvicorn, google-auth, google-api-python-client, beautifulsoup4, lxml, jinja2, pydantic, pytest.

**Spec:** `docs/superpowers/specs/2026-04-19-newsletter-aggregator-design.md`

---

## Task 1: Content directory scaffold + sample fixture

Gives the build script something to render before we write it, and tests something to assert against.

**Files:**
- Create: `content/newsletters/index.json`
- Create: `content/newsletters/2026-04-18-sample-welcome.json`
- Create: `content/README.md`

- [ ] **Step 1: Create sample newsletter JSON**

Write `e:/portfolio/content/newsletters/2026-04-18-sample-welcome.json`:

```json
{
  "slug": "2026-04-18-sample-welcome",
  "subject": "Welcome — a sample newsletter entry",
  "sender_name": "Sample Sender",
  "sender_email": "hello@example.com",
  "date": "2026-04-18T09:00:00Z",
  "snippet": "This is a sample newsletter used to verify the build script renders correctly. Replace it by running the sync tool.",
  "body_html": "<p>Hello.</p><p>This is a <strong>sample</strong> newsletter, used only to verify the build script. The sync app will replace this file with real content.</p><h2>Heading</h2><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p><ul><li>Point one</li><li>Point two</li></ul>",
  "body_text": "Hello.\n\nThis is a sample newsletter, used only to verify the build script.",
  "gmail_id": "sample-0001"
}
```

- [ ] **Step 2: Create index.json**

Write `e:/portfolio/content/newsletters/index.json`:

```json
[
  {
    "slug": "2026-04-18-sample-welcome",
    "subject": "Welcome — a sample newsletter entry",
    "sender_name": "Sample Sender",
    "date": "2026-04-18T09:00:00Z",
    "snippet": "This is a sample newsletter used to verify the build script renders correctly. Replace it by running the sync tool."
  }
]
```

- [ ] **Step 3: Short README describing the directory**

Write `e:/portfolio/content/README.md`:

```markdown
# content/

Content files committed to the repo and consumed by build scripts at Vercel's `prebuild` step.

## newsletters/

- `index.json` — flat array of every synced newsletter's metadata, newest-first. Read by the list page generator.
- `<slug>.json` — one file per email, full sanitized body. Read by the detail page generator.

Files here are written by `tools/newsletter-sync/` on Pranav's laptop and pushed via git. Do not hand-edit unless you know what you're doing — the sync app treats `index.json` as its dedupe source of truth.
```

- [ ] **Step 4: Commit**

```bash
cd e:/portfolio && git add content/ && git commit -m "feat(content): newsletters directory + sample fixture"
```

---

## Task 2: Build-newsletters pure-function lib (TDD)

**Files:**
- Create: `lib/build-newsletters.js`
- Create: `tests/build-newsletters.test.js`

**Interface:**
- `formatDate(iso) -> "Apr 19, 2026"`
- `escapeHtml(text) -> string`
- `renderListPage({ items, siteNav }) -> html string`
- `renderDetailPage({ item, siteNav }) -> html string`

Runtime-free pure functions; no filesystem, no network. The CLI wrapper (Task 3) handles I/O.

- [ ] **Step 1: Write the failing tests**

Write `e:/portfolio/tests/build-newsletters.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDate,
  escapeHtml,
  renderListPage,
  renderDetailPage,
} from '../lib/build-newsletters.js';

test('formatDate: renders ISO date as "Mon D, YYYY"', () => {
  assert.equal(formatDate('2026-04-19T08:32:00Z'), 'Apr 19, 2026');
  assert.equal(formatDate('2026-01-05T00:00:00Z'), 'Jan 5, 2026');
});

test('escapeHtml: escapes < > & " \'', () => {
  assert.equal(escapeHtml('a & b'), 'a &amp; b');
  assert.equal(escapeHtml('<script>'), '&lt;script&gt;');
  assert.equal(escapeHtml(`"it's"`), '&quot;it&#39;s&quot;');
});

test('renderListPage: emits one <article> per item with escaped subject and snippet', () => {
  const html = renderListPage({
    items: [
      { slug: 'a', subject: 'Hello & welcome', sender_name: 'OpenAI', date: '2026-04-19T00:00:00Z', snippet: 'snip' },
      { slug: 'b', subject: 'Second', sender_name: 'Anthropic', date: '2026-04-18T00:00:00Z', snippet: 's2' },
    ],
  });
  assert.match(html, /<!DOCTYPE html>/);
  assert.match(html, /<article[^>]*>[\s\S]*Hello &amp; welcome[\s\S]*<\/article>/);
  assert.match(html, /href="\/newsletter\/a"/);
  assert.match(html, /href="\/newsletter\/b"/);
  assert.match(html, /Apr 19, 2026/);
  assert.match(html, /Apr 18, 2026/);
});

test('renderListPage: empty items renders empty-state message', () => {
  const html = renderListPage({ items: [] });
  assert.match(html, /no newsletters yet/i);
});

test('renderDetailPage: injects sanitized body_html as-is', () => {
  const html = renderDetailPage({
    item: {
      slug: 's',
      subject: 'Title',
      sender_name: 'OpenAI',
      sender_email: 'x@openai.com',
      date: '2026-04-19T00:00:00Z',
      body_html: '<p>Hello <strong>there</strong></p>',
    },
  });
  assert.match(html, /<p>Hello <strong>there<\/strong><\/p>/);
  assert.match(html, /Title/);
  assert.match(html, /Apr 19, 2026/);
  assert.match(html, /← back to list/i);
});

test('renderDetailPage: escapes subject in <title> and <h1>', () => {
  const html = renderDetailPage({
    item: {
      slug: 's',
      subject: 'A & B',
      sender_name: 'x',
      date: '2026-04-19T00:00:00Z',
      body_html: '<p/>',
    },
  });
  assert.match(html, /<title>A &amp; B/);
  assert.match(html, /<h1[^>]*>A &amp; B/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd e:/portfolio && npm test -- tests/build-newsletters.test.js
```
Expected: `Cannot find module '../lib/build-newsletters.js'`.

- [ ] **Step 3: Implement `lib/build-newsletters.js`**

Write `e:/portfolio/lib/build-newsletters.js`:

```js
// Pure HTML-building helpers for the newsletter section.
// No filesystem, no network — the CLI wrapper (scripts/build-newsletters.mjs)
// handles I/O.

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function formatDate(iso) {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const NAV = `
  <nav>
    <div class="logo"><a href="/" style="text-decoration:none;color:inherit">pranav<span class="dot">.</span>p</a></div>
    <ul class="nav-links">
      <li><a href="/#work">Work</a></li>
      <li><a href="/#projects">Projects</a></li>
      <li><a href="/newsletter/" class="active">Reading</a></li>
      <li><a href="/#contact">Contact</a></li>
    </ul>
    <a class="nav-cta" href="/#chat"><span class="blip"></span>Ask my AI twin</a>
  </nav>
`;

function shell({ title, description, body }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)} — Pranav P</title>
<meta name="description" content="${escapeHtml(description)}" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="/styles.css" />
<link rel="stylesheet" href="/newsletter/styles.css" />
</head>
<body>
${NAV}
${body}
</body>
</html>`;
}

export function renderListPage({ items }) {
  const title = 'Reading';
  const description = "Newsletters I'm reading — synced from my inbox, cleaned up, shared.";

  if (!items || items.length === 0) {
    return shell({
      title,
      description,
      body: `
<main class="nl-wrap">
  <header class="nl-header">
    <div class="eyebrow"><span class="dot-sq"></span>Reading · what landed in my inbox</div>
    <h1 class="nl-display">What I&rsquo;m reading.</h1>
    <p class="nl-lede">A curated feed of newsletters I actually read &mdash; pulled from my Gmail, cleaned up, and mirrored here so you can browse them too.</p>
  </header>
  <div class="nl-empty">
    <p>No newsletters yet. Check back soon.</p>
  </div>
</main>`,
    });
  }

  const cards = items.map(it => `
    <a class="nl-card" href="/newsletter/${escapeHtml(it.slug)}">
      <div class="nl-card-meta">
        <span class="nl-sender">${escapeHtml(it.sender_name)}</span>
        <span class="nl-date">${formatDate(it.date)}</span>
      </div>
      <h2 class="nl-card-title">${escapeHtml(it.subject)}</h2>
      <p class="nl-card-snippet">${escapeHtml(it.snippet || '')}</p>
    </a>`).join('\n');

  return shell({
    title,
    description,
    body: `
<main class="nl-wrap">
  <header class="nl-header">
    <div class="eyebrow"><span class="dot-sq"></span>Reading · what landed in my inbox</div>
    <h1 class="nl-display">What I&rsquo;m reading.</h1>
    <p class="nl-lede">A curated feed of newsletters I actually read &mdash; pulled from my Gmail, cleaned up, and mirrored here so you can browse them too.</p>
  </header>
  <section class="nl-list">
    ${cards}
  </section>
</main>`,
  });
}

export function renderDetailPage({ item }) {
  return shell({
    title: item.subject,
    description: item.snippet || item.subject,
    body: `
<main class="nl-wrap nl-detail-wrap">
  <a class="nl-back" href="/newsletter/">← back to list</a>
  <article class="nl-detail">
    <header class="nl-detail-header">
      <div class="nl-card-meta">
        <span class="nl-sender">${escapeHtml(item.sender_name)}</span>
        <span class="nl-date">${formatDate(item.date)}</span>
      </div>
      <h1 class="nl-detail-title">${escapeHtml(item.subject)}</h1>
    </header>
    <div class="nl-detail-body">
      ${item.body_html || '<p>(no content)</p>'}
    </div>
  </article>
</main>`,
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd e:/portfolio && npm test -- tests/build-newsletters.test.js
```
Expected: 6/6 pass.

- [ ] **Step 5: Commit**

```bash
cd e:/portfolio && git add lib/build-newsletters.js tests/build-newsletters.test.js && git commit -m "feat(newsletters): pure HTML builders with TDD"
```

---

## Task 3: CLI wrapper (`scripts/build-newsletters.mjs`)

**Files:**
- Create: `scripts/build-newsletters.mjs`

- [ ] **Step 1: Write the CLI**

Write `e:/portfolio/scripts/build-newsletters.mjs`:

```js
// CLI: reads content/newsletters/*.json, writes public/newsletter/*.html.
import { readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderListPage, renderDetailPage } from '../lib/build-newsletters.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = join(ROOT, 'content', 'newsletters');
const OUT_DIR = join(ROOT, 'public', 'newsletter');

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function main() {
  // Load index + each detail file
  let index;
  try {
    index = await readJson(join(CONTENT_DIR, 'index.json'));
  } catch (err) {
    console.error(`Cannot read ${join(CONTENT_DIR, 'index.json')}: ${err.message}`);
    process.exit(1);
  }
  if (!Array.isArray(index)) {
    console.error('index.json must be an array');
    process.exit(1);
  }

  // Clear and recreate output dir (keep styles.css — see below)
  // Strategy: delete only .html files, leave styles.css alone.
  await mkdir(OUT_DIR, { recursive: true });
  const existing = await readdir(OUT_DIR).catch(() => []);
  for (const f of existing) {
    if (f.endsWith('.html')) await rm(join(OUT_DIR, f));
  }

  // Sort newest-first as a defensive measure; the sync app should already do this.
  index.sort((a, b) => new Date(b.date) - new Date(a.date));

  // List page
  await writeFile(join(OUT_DIR, 'index.html'), renderListPage({ items: index }));

  // Detail pages
  let wrote = 0;
  for (const meta of index) {
    if (!meta.slug) {
      console.warn(`Skipping entry with no slug: ${JSON.stringify(meta)}`);
      continue;
    }
    let detail;
    try {
      detail = await readJson(join(CONTENT_DIR, `${meta.slug}.json`));
    } catch (err) {
      console.warn(`Missing detail file for ${meta.slug}: ${err.message} — skipping`);
      continue;
    }
    await writeFile(join(OUT_DIR, `${meta.slug}.html`), renderDetailPage({ item: detail }));
    wrote++;
  }

  console.log(`Wrote ${OUT_DIR} — list + ${wrote} detail page${wrote === 1 ? '' : 's'}.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run the CLI against the sample fixture**

```bash
cd e:/portfolio && node scripts/build-newsletters.mjs
```
Expected stdout: `Wrote …/public/newsletter — list + 1 detail page.`

- [ ] **Step 3: Verify outputs exist**

```bash
cd e:/portfolio && ls public/newsletter/
```
Expected: `index.html` and `2026-04-18-sample-welcome.html`. Open each in a browser to eyeball.

- [ ] **Step 4: Commit (the generated HTML files are also committed so local `vercel dev` serves them identically to production)**

```bash
cd e:/portfolio && git add scripts/build-newsletters.mjs public/newsletter/ && git commit -m "feat(newsletters): build-newsletters CLI + initial generated pages"
```

---

## Task 4: Newsletter stylesheet

Matches the portfolio design system (warm cream, Instrument Serif, burnt-orange accent).

**Files:**
- Create: `public/newsletter/styles.css`

- [ ] **Step 1: Write the stylesheet**

Write `e:/portfolio/public/newsletter/styles.css`:

```css
/* Newsletter section — inherits CSS variables from /styles.css */

.nl-wrap{
  max-width:1100px;margin:0 auto;padding:7rem 2.5rem 5rem;
}
.nl-detail-wrap{max-width:780px}

.nl-header{margin-bottom:3.5rem;max-width:760px}
.nl-display{
  font-family:var(--serif);font-weight:400;
  font-size:clamp(3rem,7vw,5.5rem);line-height:.95;letter-spacing:-.02em;
  margin:1.4rem 0 1.2rem;
}
.nl-lede{font-size:1.1rem;color:var(--ink-2);max-width:620px;line-height:1.6}

.nl-empty{
  padding:3rem;background:var(--surface);border:1px dashed var(--border);border-radius:16px;
  color:var(--muted);text-align:center;font-family:var(--mono);font-size:.9rem;
}

.nl-list{
  display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1rem;
}

.nl-card{
  background:var(--surface);border:1px solid var(--border);border-radius:14px;
  padding:1.4rem 1.5rem;display:flex;flex-direction:column;gap:.7rem;
  text-decoration:none;color:inherit;transition:all .2s;
  position:relative;overflow:hidden;
}
.nl-card:hover{border-color:var(--ink);transform:translateY(-2px);box-shadow:0 20px 40px -24px rgba(14,14,12,.18)}
.nl-card::after{
  content:"";position:absolute;top:0;right:0;width:80px;height:80px;
  background:radial-gradient(circle at top right,var(--accent-soft),transparent 70%);
  opacity:0;transition:opacity .25s;
}
.nl-card:hover::after{opacity:1}

.nl-card-meta{
  display:flex;justify-content:space-between;align-items:center;
  font-family:var(--mono);font-size:.7rem;letter-spacing:.08em;color:var(--muted);
}
.nl-sender{color:var(--accent);text-transform:uppercase}
.nl-date{color:var(--muted-2)}

.nl-card-title{
  font-family:var(--serif);font-weight:400;font-size:1.5rem;line-height:1.15;
  letter-spacing:-.01em;color:var(--ink);
}
.nl-card-snippet{
  font-size:.93rem;line-height:1.55;color:var(--ink-2);
  display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;
}

/* Detail page */
.nl-back{
  font-family:var(--mono);font-size:.75rem;letter-spacing:.1em;color:var(--muted);
  text-decoration:none;display:inline-block;margin-bottom:2rem;transition:color .15s;
}
.nl-back:hover{color:var(--ink)}

.nl-detail{
  background:var(--surface);border:1px solid var(--border);border-radius:16px;
  padding:3rem 3rem 3.5rem;
}
.nl-detail-header{padding-bottom:1.8rem;border-bottom:1px solid var(--border);margin-bottom:2rem}
.nl-detail-title{
  font-family:var(--serif);font-weight:400;font-size:clamp(2rem,4vw,3rem);
  line-height:1.05;letter-spacing:-.015em;color:var(--ink);margin-top:.7rem;
}
.nl-detail-body{
  font-size:1rem;line-height:1.7;color:var(--ink-2);
}
.nl-detail-body h1,.nl-detail-body h2,.nl-detail-body h3{
  font-family:var(--serif);font-weight:400;color:var(--ink);
  margin:2rem 0 .9rem;line-height:1.2;
}
.nl-detail-body h1{font-size:1.8rem}
.nl-detail-body h2{font-size:1.4rem}
.nl-detail-body h3{font-size:1.15rem}
.nl-detail-body p{margin-bottom:1.1rem}
.nl-detail-body a{color:var(--accent);text-decoration:underline;text-underline-offset:2px}
.nl-detail-body a:hover{color:var(--ink)}
.nl-detail-body ul,.nl-detail-body ol{margin:0 0 1.1rem 1.6rem}
.nl-detail-body li{margin-bottom:.4rem}
.nl-detail-body img{max-width:100%;height:auto;border-radius:8px;margin:1rem 0}
.nl-detail-body blockquote{
  border-left:3px solid var(--accent);
  padding:.4rem 0 .4rem 1.2rem;margin:1.3rem 0;
  color:var(--ink-2);font-style:italic;
}
.nl-detail-body code{
  font-family:var(--mono);font-size:.88em;
  background:var(--surface-2);padding:2px 6px;border-radius:4px;
}
.nl-detail-body pre{
  background:var(--surface-2);border:1px solid var(--border);
  padding:1rem;border-radius:8px;overflow-x:auto;font-size:.85rem;
  margin:1.2rem 0;
}
.nl-detail-body pre code{background:transparent;padding:0}

@media (max-width:640px){
  .nl-wrap{padding:6rem 1.2rem 3rem}
  .nl-detail{padding:2rem 1.4rem 2.5rem}
  .nl-list{grid-template-columns:1fr}
}
```

- [ ] **Step 2: Rebuild + eyeball**

```bash
cd e:/portfolio && node scripts/build-newsletters.mjs
```
Open `public/newsletter/index.html` in a browser. Expected: warm cream background, big serif "What I'm reading" headline, one sample card. Click the card → detail page renders with serif heading, back link.

- [ ] **Step 3: Commit**

```bash
cd e:/portfolio && git add public/newsletter/styles.css && git commit -m "feat(newsletters): stylesheet matching portfolio design system"
```

---

## Task 5: Wire build into prebuild + add nav link on home page

**Files:**
- Modify: `package.json`
- Modify: `public/index.html` (add nav link)

- [ ] **Step 1: Update `package.json` scripts**

Replace the `scripts` block in `package.json` with:

```json
  "scripts": {
    "build-index": "node scripts/build-index.mjs",
    "build-newsletters": "node scripts/build-newsletters.mjs",
    "prebuild": "npm run build-index && npm run build-newsletters",
    "build": "echo 'static site — prebuild ran the generators'",
    "test": "node --test \"tests/**/*.test.js\""
  },
```

- [ ] **Step 2: Verify prebuild works end-to-end**

```bash
cd e:/portfolio && rm -rf public/newsletter/*.html tree.json && npm run build
```

Expected: output shows both `build-index` and `build-newsletters` ran; `tree.json`, `public/newsletter/index.html`, and `public/newsletter/2026-04-18-sample-welcome.html` all exist.

- [ ] **Step 3: Add nav link in `public/index.html`**

Find the `<ul class="nav-links">` in `public/index.html` and add one new `<li>`. Current state:

```html
  <ul class="nav-links">
    <li><a href="#work">Work</a></li>
    <li><a href="#projects">Projects</a></li>
    <li><a href="#stack">Stack</a></li>
    <li><a href="#contact">Contact</a></li>
  </ul>
```

Change to:

```html
  <ul class="nav-links">
    <li><a href="#work">Work</a></li>
    <li><a href="#projects">Projects</a></li>
    <li><a href="/newsletter/">Reading</a></li>
    <li><a href="#contact">Contact</a></li>
  </ul>
```

(Stack is dropped from nav to keep room; Stack section still exists on the page — the nav just doesn't link to it. If Pranav wants it back, keep it and drop Contact.)

- [ ] **Step 4: Verify home → /newsletter link works**

Start `vercel dev` (or `python3 -m http.server 3000 --directory public`), click the Reading link, confirm you land on the newsletter list.

- [ ] **Step 5: Commit**

```bash
cd e:/portfolio && git add package.json public/index.html && git commit -m "feat(newsletters): wire prebuild + add Reading nav link"
```

---

## Task 6: Python project scaffold

**Files:**
- Create: `tools/newsletter-sync/pyproject.toml`
- Create: `tools/newsletter-sync/.gitignore`
- Create: `tools/newsletter-sync/.env.example`
- Create: `tools/newsletter-sync/README.md`
- Create: `tools/newsletter-sync/app/__init__.py`
- Create: `tools/newsletter-sync/app/main.py` (skeleton)
- Create: `tools/newsletter-sync/tests/__init__.py`
- Create: `tools/newsletter-sync/data/.gitkeep`

- [ ] **Step 1: Create pyproject.toml**

Write `e:/portfolio/tools/newsletter-sync/pyproject.toml`:

```toml
[project]
name = "newsletter-sync"
version = "0.1.0"
description = "Local-only Gmail → portfolio newsletter sync tool."
readme = "README.md"
requires-python = ">=3.11"
dependencies = [
  "fastapi>=0.110",
  "uvicorn[standard]>=0.27",
  "jinja2>=3.1",
  "python-multipart>=0.0.9",
  "pydantic>=2.6",
  "pydantic-settings>=2.2",
  "google-auth>=2.28",
  "google-auth-oauthlib>=1.2",
  "google-api-python-client>=2.120",
  "beautifulsoup4>=4.12",
  "lxml>=5.1",
  "python-slugify>=8.0",
]

[project.optional-dependencies]
dev = ["pytest>=8.0", "pytest-cov>=4.1", "httpx>=0.27"]

[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[tool.setuptools.packages.find]
where = ["."]
include = ["app*"]

[tool.pytest.ini_options]
testpaths = ["tests"]
```

- [ ] **Step 2: Create `.gitignore`**

Write `e:/portfolio/tools/newsletter-sync/.gitignore`:

```
# secrets & state — never commit
.env
.env.*
data/token.json
data/last_sync.json

# Python junk
__pycache__/
*.pyc
*.egg-info/
.venv/
.pytest_cache/
.coverage
```

- [ ] **Step 3: Create `.env.example`**

Write `e:/portfolio/tools/newsletter-sync/.env.example`:

```
# Path to the portfolio repo that the sync tool will write into
PORTFOLIO_REPO_PATH=E:/portfolio

# OAuth client from Google Cloud Console (Desktop app type)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Optional — override the default bind
HOST=127.0.0.1
PORT=8000
```

- [ ] **Step 4: Create `data/.gitkeep`**

```bash
cd e:/portfolio && mkdir -p tools/newsletter-sync/data && touch tools/newsletter-sync/data/.gitkeep
```

- [ ] **Step 5: Create README**

Write `e:/portfolio/tools/newsletter-sync/README.md`:

```markdown
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
- `<PORTFOLIO>/content/newsletters/senders.json` — allowlist, stored in the portfolio repo and committed alongside synced content
- `<PORTFOLIO>/content/newsletters/index.json` + `<slug>.json` — synced content, committed to the portfolio repo

## Tests

```
pytest
```
```

- [ ] **Step 6: Create Python package skeletons**

Write `e:/portfolio/tools/newsletter-sync/app/__init__.py`:
```python
"""Newsletter sync app."""
```

Write `e:/portfolio/tools/newsletter-sync/tests/__init__.py` (empty file):
```python
```

Write `e:/portfolio/tools/newsletter-sync/app/main.py` as a placeholder FastAPI app:
```python
from fastapi import FastAPI

app = FastAPI(title="newsletter-sync")


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}
```

- [ ] **Step 7: Install and smoke-test**

In a PowerShell terminal (Windows):
```powershell
cd e:/portfolio/tools/newsletter-sync
python -m venv .venv
.venv\Scripts\activate
pip install -e ".[dev]"
pytest  # 0 tests collected is fine for now
uvicorn app.main:app --host 127.0.0.1 --port 8000 &
curl http://127.0.0.1:8000/healthz
# Expected: {"status":"ok"}
```

Stop the uvicorn process after verifying.

- [ ] **Step 8: Commit**

```bash
cd e:/portfolio && git add tools/newsletter-sync/ && git commit -m "feat(newsletter-sync): Python/FastAPI scaffold"
```

---

## Task 7: Sanitizer with comprehensive TDD

**Files:**
- Create: `tools/newsletter-sync/app/sanitize.py`
- Create: `tools/newsletter-sync/tests/test_sanitize.py`

The sanitizer is the highest-risk module — a false negative means personalization leaks onto a public site. Heavy test coverage is warranted.

**Interface:** `sanitize_html(html: str, personal_email: str, first_name: str) -> str`

- [ ] **Step 1: Write failing tests**

Write `e:/portfolio/tools/newsletter-sync/tests/test_sanitize.py`:

```python
from app.sanitize import sanitize_html


PERSONAL = "aikkara.pranav@gmail.com"
NAME = "Pranav"


def clean(html: str) -> str:
    return sanitize_html(html, PERSONAL, NAME)


def test_removes_1x1_tracking_pixel() -> None:
    html = '<p>hi</p><img src="https://track.io/p.gif" width="1" height="1" />'
    out = clean(html)
    assert "<img" not in out
    assert "<p>hi</p>" in out


def test_keeps_content_images() -> None:
    html = '<img src="https://cdn.example.com/cover.jpg" alt="cover" width="600">'
    out = clean(html)
    assert "<img" in out
    assert "cover.jpg" in out


def test_removes_unsubscribe_link() -> None:
    html = '<p><a href="https://x.com/unsubscribe?id=abc">unsubscribe</a></p>'
    out = clean(html)
    assert "unsubscribe" not in out.lower()


def test_removes_email_preferences_link() -> None:
    html = '<p><a href="https://x.com/email/preferences">manage preferences</a></p>'
    out = clean(html)
    assert "preferences" not in out.lower()


def test_removes_personalized_greeting_hi() -> None:
    html = "<p>Hi Pranav,</p><p>Welcome.</p>"
    out = clean(html)
    assert "Pranav" not in out
    assert "Welcome." in out


def test_removes_personalized_greeting_hello() -> None:
    html = "<p>Hello Pranav,</p><p>Welcome.</p>"
    out = clean(html)
    assert "Pranav" not in out


def test_removes_personalized_greeting_dear() -> None:
    html = "<p>Dear Pranav,</p><p>Welcome.</p>"
    out = clean(html)
    assert "Pranav" not in out


def test_strips_personal_email_anywhere() -> None:
    html = f"<p>You, {PERSONAL}, are subscribed.</p>"
    out = clean(html)
    assert PERSONAL not in out


def test_removes_view_in_browser_link() -> None:
    html = '<p><a href="https://x.com/view?id=abc">View in browser</a></p>'
    out = clean(html)
    assert "view in browser" not in out.lower()


def test_removes_footer_block_by_class() -> None:
    html = """
    <p>Body.</p>
    <div class="footer">
      <a href="https://x.com/unsub">unsubscribe</a>
      <p>Sender LLC, 123 Main St.</p>
    </div>
    """
    out = clean(html)
    assert "Body." in out
    assert "footer" not in out
    assert "Sender LLC" not in out


def test_preserves_headings_and_paragraphs() -> None:
    html = "<h1>Title</h1><h2>Sub</h2><p>Body.</p><ul><li>a</li><li>b</li></ul>"
    out = clean(html)
    assert "<h1>Title</h1>" in out
    assert "<h2>Sub</h2>" in out
    assert "<p>Body.</p>" in out
    assert "<li>a</li>" in out


def test_removes_script_tags_defensively() -> None:
    html = '<p>Hi.</p><script>alert(1)</script>'
    out = clean(html)
    assert "<script" not in out
    assert "<p>Hi.</p>" in out


def test_removes_style_tags() -> None:
    html = '<style>.a{color:red}</style><p>Hi.</p>'
    out = clean(html)
    assert "<style" not in out


def test_empty_input_returns_empty_string() -> None:
    assert clean("") == ""
    assert clean("   ") == ""


def test_no_dom_returns_cleaned_text() -> None:
    # Plain text through the sanitizer — returned wrapped or stripped, doesn't crash.
    out = clean("just some text")
    assert "just some text" in out
```

- [ ] **Step 2: Run tests — expect all failing**

```bash
cd e:/portfolio/tools/newsletter-sync && pytest tests/test_sanitize.py -v
```
Expected: `ModuleNotFoundError: app.sanitize`.

- [ ] **Step 3: Implement `app/sanitize.py`**

Write `e:/portfolio/tools/newsletter-sync/app/sanitize.py`:

```python
"""HTML sanitization for newsletter content before publishing.

Strategy:
    - Parse with BeautifulSoup (lxml backend).
    - Strip <script>, <style>, inline event handlers.
    - Remove 1x1 tracking pixels (width/height == 1 or src in known tracker domains).
    - Remove links whose href or text contains unsubscribe / preferences / view in browser.
    - Remove common footer blocks (class/id matches 'footer', 'unsubscribe').
    - Strip personalized greetings (Hi|Hello|Dear <FIRST_NAME>,).
    - Strip the personal email anywhere in the body.

This is best-effort — review output for new senders.
"""
from __future__ import annotations

import re

from bs4 import BeautifulSoup, Tag

_TRACKER_DOMAIN_SNIPPETS = (
    "track",
    "open.mail",
    "click.mail",
    "list-manage",
    "beacon",
    "pixel",
    "utm_source=",
)

_JUNK_LINK_MARKERS = (
    "unsubscribe",
    "preferences",
    "email/settings",
    "manage-preferences",
    "view in browser",
    "view online",
    "view this email",
)

_FOOTER_HINTS = ("footer", "unsubscribe", "email-footer", "mail-footer")


def _is_tracking_img(tag: Tag) -> bool:
    if tag.name != "img":
        return False
    # Tiny tracking pixel
    w = tag.get("width")
    h = tag.get("height")
    if (w in ("1", "1px", "0") or h in ("1", "1px", "0")):
        return True
    src = (tag.get("src") or "").lower()
    return any(snippet in src for snippet in _TRACKER_DOMAIN_SNIPPETS)


def _is_junk_link(tag: Tag) -> bool:
    if tag.name != "a":
        return False
    href = (tag.get("href") or "").lower()
    text = tag.get_text(" ", strip=True).lower()
    return any(m in href or m in text for m in _JUNK_LINK_MARKERS)


def _is_footer_block(tag: Tag) -> bool:
    if tag.name not in ("div", "section", "table", "tr", "td", "p"):
        return False
    hint = " ".join(
        filter(
            None,
            [
                " ".join(tag.get("class") or []),
                tag.get("id") or "",
                tag.get("role") or "",
            ],
        )
    ).lower()
    return any(h in hint for h in _FOOTER_HINTS)


_GREETING_RE = re.compile(
    r"^(?:hi|hello|hey|dear)\s+{name}\s*[,:\-]?\s*",
    re.IGNORECASE,
)


def _strip_greeting(text: str, first_name: str) -> str:
    pat = re.compile(
        rf"^(?:hi|hello|hey|dear)\s+{re.escape(first_name)}\s*[,:\-]?\s*",
        re.IGNORECASE,
    )
    return pat.sub("", text, count=1)


def sanitize_html(html: str, personal_email: str, first_name: str) -> str:
    """Return a cleaned HTML string safe to publish publicly."""
    if not html or not html.strip():
        return ""

    soup = BeautifulSoup(html, "lxml")

    # Drop dangerous / non-content tags.
    for tag in soup.find_all(["script", "style", "meta", "link", "noscript"]):
        tag.decompose()

    # Drop tracking images.
    for img in list(soup.find_all("img")):
        if _is_tracking_img(img):
            img.decompose()

    # Drop junk links (unsubscribe, preferences, view-in-browser).
    # Remove the whole <a> including its text, but leave surrounding content.
    for a in list(soup.find_all("a")):
        if _is_junk_link(a):
            a.decompose()

    # Drop footer-looking blocks.
    for t in list(soup.find_all(True)):  # all tags
        if _is_footer_block(t):
            t.decompose()

    # Strip personalized greeting from every <p> that starts with one.
    for p in soup.find_all(["p", "div", "span"]):
        text = p.get_text(" ", strip=True)
        if not text:
            continue
        stripped = _strip_greeting(text, first_name)
        if stripped != text:
            # If greeting removal leaves the block empty, drop it.
            if not stripped.strip():
                p.decompose()
            else:
                # Replace the visible text inside the tag.
                p.clear()
                p.append(stripped)

    # Strip the personal email anywhere it appears.
    if personal_email:
        walker = soup.find_all(string=True)
        for node in walker:
            if personal_email in node:
                node.replace_with(node.replace(personal_email, ""))

    # Return the body's inner HTML if present; otherwise the whole soup.
    body = soup.body
    if body is not None:
        return body.decode_contents().strip()
    return str(soup).strip()
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
cd e:/portfolio/tools/newsletter-sync && pytest tests/test_sanitize.py -v
```
Expected: 15/15 pass.

- [ ] **Step 5: Commit**

```bash
cd e:/portfolio && git add tools/newsletter-sync/app/sanitize.py tools/newsletter-sync/tests/test_sanitize.py && git commit -m "feat(newsletter-sync): sanitizer with comprehensive TDD"
```

---

## Task 8: Senders allowlist (TDD)

**Files:**
- Create: `tools/newsletter-sync/app/senders.py`
- Create: `tools/newsletter-sync/tests/test_senders.py`

Stores allowlist in `content/newsletters/senders.json` inside the portfolio repo (committed — the spec resolved this). A sender entry is either a bare email (`newsletter@openai.com`) or a domain (`@anthropic.com`).

- [ ] **Step 1: Write failing tests**

Write `e:/portfolio/tools/newsletter-sync/tests/test_senders.py`:

```python
from pathlib import Path

import pytest

from app.senders import SenderStore, Sender


def test_load_from_empty_path(tmp_path: Path) -> None:
    path = tmp_path / "senders.json"
    store = SenderStore(path)
    assert store.all() == []


def test_add_sender_persists(tmp_path: Path) -> None:
    path = tmp_path / "senders.json"
    store = SenderStore(path)
    store.add("newsletter@openai.com", display_name="OpenAI")
    reloaded = SenderStore(path)
    assert len(reloaded.all()) == 1
    assert reloaded.all()[0].value == "newsletter@openai.com"
    assert reloaded.all()[0].display_name == "OpenAI"


def test_add_domain_sender(tmp_path: Path) -> None:
    store = SenderStore(tmp_path / "s.json")
    store.add("@anthropic.com", display_name="Anthropic")
    assert store.all()[0].value == "@anthropic.com"
    assert store.all()[0].is_domain is True


def test_remove_sender(tmp_path: Path) -> None:
    store = SenderStore(tmp_path / "s.json")
    store.add("a@x.com")
    store.add("b@y.com")
    store.remove("a@x.com")
    assert {s.value for s in store.all()} == {"b@y.com"}


def test_duplicate_add_is_noop(tmp_path: Path) -> None:
    store = SenderStore(tmp_path / "s.json")
    store.add("a@x.com")
    store.add("a@x.com")
    assert len(store.all()) == 1


def test_gmail_query_for_email(tmp_path: Path) -> None:
    s = Sender(value="a@x.com")
    assert s.gmail_query() == "from:a@x.com"


def test_gmail_query_for_domain(tmp_path: Path) -> None:
    s = Sender(value="@anthropic.com")
    assert s.gmail_query() == "from:anthropic.com"


def test_rejects_empty_value(tmp_path: Path) -> None:
    store = SenderStore(tmp_path / "s.json")
    with pytest.raises(ValueError):
        store.add("")
    with pytest.raises(ValueError):
        store.add("   ")
```

- [ ] **Step 2: Run — expect module-not-found failures**

```bash
cd e:/portfolio/tools/newsletter-sync && pytest tests/test_senders.py -v
```

- [ ] **Step 3: Implement `app/senders.py`**

Write `e:/portfolio/tools/newsletter-sync/app/senders.py`:

```python
"""Sender allowlist persistence.

Storage format (one file, committed to portfolio repo):

    [
      { "value": "newsletter@openai.com", "display_name": "OpenAI" },
      { "value": "@anthropic.com", "display_name": "Anthropic" }
    ]
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from pathlib import Path


@dataclass
class Sender:
    value: str
    display_name: str | None = None

    @property
    def is_domain(self) -> bool:
        return self.value.startswith("@")

    def gmail_query(self) -> str:
        if self.is_domain:
            return f"from:{self.value.lstrip('@')}"
        return f"from:{self.value}"


@dataclass
class SenderStore:
    path: Path
    _items: list[Sender] = field(default_factory=list)

    def __post_init__(self) -> None:
        if self.path.exists():
            raw = json.loads(self.path.read_text(encoding="utf-8"))
            self._items = [Sender(**e) for e in raw]

    def all(self) -> list[Sender]:
        return list(self._items)

    def add(self, value: str, display_name: str | None = None) -> None:
        v = (value or "").strip()
        if not v:
            raise ValueError("sender value cannot be empty")
        if any(s.value == v for s in self._items):
            return
        self._items.append(Sender(value=v, display_name=display_name))
        self._save()

    def remove(self, value: str) -> None:
        self._items = [s for s in self._items if s.value != value]
        self._save()

    def _save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(
            json.dumps([asdict(s) for s in self._items], indent=2),
            encoding="utf-8",
        )
```

- [ ] **Step 4: Run — expect all pass**

```bash
cd e:/portfolio/tools/newsletter-sync && pytest tests/test_senders.py -v
```
Expected: 8/8 pass.

- [ ] **Step 5: Commit**

```bash
cd e:/portfolio && git add tools/newsletter-sync/app/senders.py tools/newsletter-sync/tests/test_senders.py && git commit -m "feat(newsletter-sync): sender allowlist with TDD"
```

---

## Task 9: Writer — slug + json + index + git commit (TDD where testable)

**Files:**
- Create: `tools/newsletter-sync/app/writer.py`
- Create: `tools/newsletter-sync/tests/test_writer.py`

**Interface:**
- `slugify(date_iso: str, sender_name: str, subject: str) -> str`
- `write_newsletter(content_dir: Path, entry: dict) -> bool` — returns True if new, False if dedupe
- `commit_and_push(repo_path: Path, count: int) -> None` — runs `git add … && git commit && git push`

- [ ] **Step 1: Write tests (git parts mocked)**

Write `e:/portfolio/tools/newsletter-sync/tests/test_writer.py`:

```python
import json
from pathlib import Path
from unittest.mock import patch

import pytest

from app.writer import slugify, write_newsletter


def test_slugify_format() -> None:
    slug = slugify("2026-04-19T08:32:00Z", "OpenAI", "The Future of Agents!")
    assert slug == "2026-04-19-openai-the-future-of-agents"


def test_slugify_empty_subject_falls_back_to_sender() -> None:
    slug = slugify("2026-04-19T08:32:00Z", "OpenAI", "")
    assert slug == "2026-04-19-openai"


def test_slugify_non_ascii_subject() -> None:
    slug = slugify("2026-04-19T00:00:00Z", "Anthropic", "日本語のテスト")
    # Should still produce a valid slug starting with the date.
    assert slug.startswith("2026-04-19-anthropic")


def test_write_newsletter_creates_files_and_updates_index(tmp_path: Path) -> None:
    content_dir = tmp_path / "content" / "newsletters"
    content_dir.mkdir(parents=True)

    entry = {
        "slug": "2026-04-19-openai-hello",
        "subject": "Hello",
        "sender_name": "OpenAI",
        "sender_email": "a@openai.com",
        "date": "2026-04-19T10:00:00Z",
        "snippet": "Hi there.",
        "body_html": "<p>Hello.</p>",
        "body_text": "Hello.",
        "gmail_id": "abc123",
    }

    created = write_newsletter(content_dir, entry)
    assert created is True

    detail_file = content_dir / "2026-04-19-openai-hello.json"
    index_file = content_dir / "index.json"
    assert detail_file.exists()
    assert index_file.exists()

    index = json.loads(index_file.read_text())
    assert len(index) == 1
    assert index[0]["slug"] == "2026-04-19-openai-hello"
    assert index[0]["sender_name"] == "OpenAI"


def test_write_newsletter_dedupes_by_gmail_id(tmp_path: Path) -> None:
    content_dir = tmp_path / "content" / "newsletters"
    content_dir.mkdir(parents=True)

    entry = {
        "slug": "s",
        "subject": "Hi",
        "sender_name": "X",
        "sender_email": "x@x.com",
        "date": "2026-04-19T00:00:00Z",
        "snippet": "",
        "body_html": "<p/>",
        "body_text": "",
        "gmail_id": "dup1",
    }

    assert write_newsletter(content_dir, entry) is True
    assert write_newsletter(content_dir, entry) is False  # dedupe


def test_write_newsletter_keeps_index_sorted_newest_first(tmp_path: Path) -> None:
    content_dir = tmp_path / "content" / "newsletters"
    content_dir.mkdir(parents=True)

    def mk(slug: str, date: str, gid: str) -> dict:
        return {
            "slug": slug, "subject": "S", "sender_name": "X", "sender_email": "x@x.com",
            "date": date, "snippet": "", "body_html": "<p/>", "body_text": "", "gmail_id": gid,
        }

    write_newsletter(content_dir, mk("a", "2026-04-10T00:00:00Z", "g1"))
    write_newsletter(content_dir, mk("b", "2026-04-19T00:00:00Z", "g2"))
    write_newsletter(content_dir, mk("c", "2026-04-15T00:00:00Z", "g3"))

    index = json.loads((content_dir / "index.json").read_text())
    assert [x["slug"] for x in index] == ["b", "c", "a"]  # newest first
```

- [ ] **Step 2: Run — expect failures**

```bash
cd e:/portfolio/tools/newsletter-sync && pytest tests/test_writer.py -v
```

- [ ] **Step 3: Implement `app/writer.py`**

Write `e:/portfolio/tools/newsletter-sync/app/writer.py`:

```python
"""Write synced newsletters into the portfolio repo.

- Slug = <ISO date>-<slug(sender)>-<slug(subject)>
- <slug>.json holds the full entry.
- index.json holds a metadata-only array (no body), newest-first.
- Dedupe by gmail_id against index.json.
- Optionally run git add/commit/push against the repo root.
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

from slugify import slugify as _slugify_lib

INDEX_NAME = "index.json"

META_KEYS = ("slug", "subject", "sender_name", "date", "snippet")


def slugify(date_iso: str, sender_name: str, subject: str) -> str:
    date_part = date_iso[:10]  # YYYY-MM-DD
    sender = _slugify_lib(sender_name, max_length=32) or "sender"
    subj = _slugify_lib(subject, max_length=80)
    if subj:
        return f"{date_part}-{sender}-{subj}"
    return f"{date_part}-{sender}"


def _load_index(content_dir: Path) -> list[dict]:
    path = content_dir / INDEX_NAME
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def _save_index(content_dir: Path, index: list[dict]) -> None:
    index.sort(key=lambda e: e.get("date", ""), reverse=True)
    (content_dir / INDEX_NAME).write_text(
        json.dumps(index, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def write_newsletter(content_dir: Path, entry: dict) -> bool:
    """Write one newsletter. Returns False if this gmail_id is already in the index."""
    index = _load_index(content_dir)

    gmail_id = entry.get("gmail_id")
    if gmail_id and any(e.get("_gmail_id") == gmail_id for e in index):
        return False

    detail_path = content_dir / f"{entry['slug']}.json"
    detail_path.write_text(
        json.dumps(entry, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    meta = {k: entry.get(k) for k in META_KEYS}
    meta["_gmail_id"] = gmail_id  # internal dedupe key
    index.append(meta)
    _save_index(content_dir, index)
    return True


def commit_and_push(repo_path: Path, count: int) -> None:
    """Run git add / commit / push for the newsletter content dir."""
    if count <= 0:
        return
    rel = Path("content") / "newsletters"
    subprocess.run(["git", "-C", str(repo_path), "add", str(rel)], check=True)
    subprocess.run(
        ["git", "-C", str(repo_path), "commit", "-m", f"sync: {count} newsletter{'s' if count != 1 else ''}"],
        check=True,
    )
    subprocess.run(["git", "-C", str(repo_path), "push"], check=True)
```

- [ ] **Step 4: Run — expect all pass**

```bash
cd e:/portfolio/tools/newsletter-sync && pytest tests/test_writer.py -v
```
Expected: 6/6 pass.

- [ ] **Step 5: Commit**

```bash
cd e:/portfolio && git add tools/newsletter-sync/app/writer.py tools/newsletter-sync/tests/test_writer.py && git commit -m "feat(newsletter-sync): writer with slug + index + git commit"
```

---

## Task 10: OAuth + Gmail fetch

This module integrates against a real external service (Gmail API). Unit-testing is thin — we write lightweight tests for pure helpers and rely on manual smoke.

**Files:**
- Create: `tools/newsletter-sync/app/oauth.py`
- Create: `tools/newsletter-sync/app/gmail.py`
- Create: `tools/newsletter-sync/tests/test_gmail.py`

- [ ] **Step 1: Write `app/oauth.py`**

```python
"""Gmail OAuth — desktop-app loopback flow.

Stores refresh token in data/token.json (gitignored).
"""
from __future__ import annotations

import json
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]


def _client_config(client_id: str, client_secret: str) -> dict:
    return {
        "installed": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": ["http://localhost"],
        }
    }


def get_credentials(
    token_path: Path,
    client_id: str,
    client_secret: str,
) -> Credentials:
    """Load cached credentials or run the loopback flow once."""
    creds: Credentials | None = None
    if token_path.exists():
        creds = Credentials.from_authorized_user_info(
            json.loads(token_path.read_text()), SCOPES
        )

    if creds and creds.valid:
        return creds

    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
    else:
        flow = InstalledAppFlow.from_client_config(
            _client_config(client_id, client_secret), SCOPES
        )
        # Opens the browser, catches the redirect on a local loopback port.
        creds = flow.run_local_server(port=0)

    token_path.parent.mkdir(parents=True, exist_ok=True)
    token_path.write_text(creds.to_json(), encoding="utf-8")
    return creds


def is_authorized(token_path: Path) -> bool:
    return token_path.exists()
```

- [ ] **Step 2: Write `app/gmail.py`**

```python
"""Gmail message fetch + payload parse."""
from __future__ import annotations

import base64
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterator

from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials


@dataclass
class Message:
    gmail_id: str
    sender_name: str
    sender_email: str
    subject: str
    date_iso: str
    body_html: str
    body_text: str


def _decode_part(data: str) -> str:
    # Gmail returns URL-safe base64 with no padding.
    return base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="replace")


def _walk_parts(payload: dict) -> Iterator[dict]:
    yield payload
    for p in payload.get("parts", []) or []:
        yield from _walk_parts(p)


def _extract_body(payload: dict) -> tuple[str, str]:
    """Return (html, text). Prefer text/html; fall back to text/plain."""
    html = ""
    text = ""
    for part in _walk_parts(payload):
        mime = part.get("mimeType", "")
        data = (part.get("body") or {}).get("data")
        if not data:
            continue
        decoded = _decode_part(data)
        if mime == "text/html" and not html:
            html = decoded
        elif mime == "text/plain" and not text:
            text = decoded
    return html, text


def _header(headers: list[dict], name: str) -> str:
    for h in headers:
        if h.get("name", "").lower() == name.lower():
            return h.get("value", "")
    return ""


def _parse_from(from_header: str) -> tuple[str, str]:
    """Parse "Name <email@x.com>" → ("Name", "email@x.com")."""
    if "<" in from_header and ">" in from_header:
        name = from_header.split("<", 1)[0].strip().strip('"')
        email = from_header.split("<", 1)[1].rsplit(">", 1)[0].strip()
        return name or email, email
    return from_header, from_header


def _date_to_iso(date_header: str) -> str:
    """RFC 2822 → ISO 8601 UTC."""
    from email.utils import parsedate_to_datetime
    try:
        dt = parsedate_to_datetime(date_header)
    except Exception:
        dt = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def fetch_recent(
    creds: Credentials,
    gmail_query: str,
    max_results: int = 50,
) -> list[Message]:
    """Run a Gmail search, return a list of parsed Message objects."""
    service = build("gmail", "v1", credentials=creds, cache_discovery=False)
    resp = (
        service.users()
        .messages()
        .list(userId="me", q=gmail_query, maxResults=max_results)
        .execute()
    )
    out: list[Message] = []
    for m in resp.get("messages", []):
        full = (
            service.users()
            .messages()
            .get(userId="me", id=m["id"], format="full")
            .execute()
        )
        payload = full.get("payload", {})
        headers = payload.get("headers", [])
        from_name, from_email = _parse_from(_header(headers, "From"))
        subject = _header(headers, "Subject")
        date_iso = _date_to_iso(_header(headers, "Date"))
        html, text = _extract_body(payload)
        out.append(
            Message(
                gmail_id=m["id"],
                sender_name=from_name,
                sender_email=from_email,
                subject=subject,
                date_iso=date_iso,
                body_html=html,
                body_text=text,
            )
        )
    return out


def snippet_from(text: str, limit: int = 280) -> str:
    text = " ".join((text or "").split())
    return text[:limit] + ("…" if len(text) > limit else "")
```

- [ ] **Step 3: Unit-test the pure helpers**

Write `e:/portfolio/tools/newsletter-sync/tests/test_gmail.py`:

```python
from app.gmail import _parse_from, _decode_part, _date_to_iso, snippet_from
import base64


def test_parse_from_with_name() -> None:
    assert _parse_from('"OpenAI" <newsletter@openai.com>') == ("OpenAI", "newsletter@openai.com")


def test_parse_from_without_name() -> None:
    assert _parse_from("x@y.com") == ("x@y.com", "x@y.com")


def test_decode_part_urlsafe_base64() -> None:
    raw = "hello world"
    encoded = base64.urlsafe_b64encode(raw.encode()).decode().rstrip("=")
    assert _decode_part(encoded) == raw


def test_date_to_iso_rfc2822() -> None:
    out = _date_to_iso("Sun, 19 Apr 2026 08:32:00 +0000")
    assert out == "2026-04-19T08:32:00Z"


def test_snippet_truncates_and_collapses_whitespace() -> None:
    text = "  line one\n\n\nline   two   " + ("x" * 400)
    out = snippet_from(text, limit=50)
    assert len(out) <= 51  # +1 for ellipsis
    assert out.endswith("…")
```

- [ ] **Step 4: Run — expect all pass**

```bash
cd e:/portfolio/tools/newsletter-sync && pytest tests/test_gmail.py -v
```
Expected: 5/5 pass.

- [ ] **Step 5: Commit**

```bash
cd e:/portfolio && git add tools/newsletter-sync/app/oauth.py tools/newsletter-sync/app/gmail.py tools/newsletter-sync/tests/test_gmail.py && git commit -m "feat(newsletter-sync): OAuth + Gmail fetch with header parsing"
```

---

## Task 11: FastAPI routes + templates (dashboard, auth, senders, sync)

**Files:**
- Create: `tools/newsletter-sync/app/config.py`
- Replace: `tools/newsletter-sync/app/main.py`
- Create: `tools/newsletter-sync/app/templates/base.html`
- Create: `tools/newsletter-sync/app/templates/dashboard.html`
- Create: `tools/newsletter-sync/app/templates/senders.html`

- [ ] **Step 1: Create `app/config.py`**

```python
"""Environment config for the sync app."""
from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PORTFOLIO_REPO_PATH: Path
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    PERSONAL_EMAIL: str = "aikkara.pranav@gmail.com"
    PERSONAL_FIRST_NAME: str = "Pranav"
    FIRST_SYNC_WINDOW_DAYS: int = 30

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def content_dir(self) -> Path:
        return self.PORTFOLIO_REPO_PATH / "content" / "newsletters"

    @property
    def senders_path(self) -> Path:
        return self.content_dir / "senders.json"

    @property
    def data_dir(self) -> Path:
        return Path(__file__).resolve().parent.parent / "data"

    @property
    def token_path(self) -> Path:
        return self.data_dir / "token.json"

    @property
    def last_sync_path(self) -> Path:
        return self.data_dir / "last_sync.json"


settings = Settings()
```

- [ ] **Step 2: Replace `app/main.py`**

```python
"""FastAPI entry — dashboard, auth, senders, sync."""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

from app import gmail as gmail_mod
from app import oauth
from app import sanitize
from app import writer
from app.config import settings
from app.senders import SenderStore

app = FastAPI(title="newsletter-sync")
templates = Jinja2Templates(directory=str(Path(__file__).parent / "templates"))


def _store() -> SenderStore:
    return SenderStore(settings.senders_path)


def _read_last_sync() -> str | None:
    p = settings.last_sync_path
    if not p.exists():
        return None
    return json.loads(p.read_text()).get("last_sync")


def _write_last_sync(iso: str) -> None:
    settings.last_sync_path.parent.mkdir(parents=True, exist_ok=True)
    settings.last_sync_path.write_text(json.dumps({"last_sync": iso}))


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/", response_class=HTMLResponse)
def dashboard(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        "dashboard.html",
        {
            "request": request,
            "authed": oauth.is_authorized(settings.token_path),
            "last_sync": _read_last_sync(),
            "sender_count": len(_store().all()),
        },
    )


@app.get("/auth")
def auth() -> RedirectResponse:
    oauth.get_credentials(
        settings.token_path,
        settings.GOOGLE_CLIENT_ID,
        settings.GOOGLE_CLIENT_SECRET,
    )
    return RedirectResponse("/", status_code=303)


@app.get("/senders", response_class=HTMLResponse)
def senders_page(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        "senders.html",
        {"request": request, "senders": _store().all()},
    )


@app.post("/senders/add")
def senders_add(value: str = Form(...), display_name: str = Form("")) -> RedirectResponse:
    _store().add(value, display_name=display_name or None)
    return RedirectResponse("/senders", status_code=303)


@app.post("/senders/remove")
def senders_remove(value: str = Form(...)) -> RedirectResponse:
    _store().remove(value)
    return RedirectResponse("/senders", status_code=303)


@app.post("/sync", response_class=HTMLResponse)
def sync(request: Request) -> HTMLResponse:
    creds = oauth.get_credentials(
        settings.token_path,
        settings.GOOGLE_CLIENT_ID,
        settings.GOOGLE_CLIENT_SECRET,
    )

    # Cutoff = last sync OR 30 days ago on first run.
    last = _read_last_sync()
    cutoff_dt = (
        datetime.fromisoformat(last.replace("Z", "+00:00"))
        if last
        else datetime.now(timezone.utc) - timedelta(days=settings.FIRST_SYNC_WINDOW_DAYS)
    )

    # Gmail search uses a date (YYYY/M/D), not ISO.
    cutoff_str = cutoff_dt.strftime("%Y/%m/%d")

    store = _store()
    settings.content_dir.mkdir(parents=True, exist_ok=True)

    written = 0
    for s in store.all():
        q = f"{s.gmail_query()} after:{cutoff_str}"
        for msg in gmail_mod.fetch_recent(creds, q):
            clean_html = sanitize.sanitize_html(
                msg.body_html or f"<p>{msg.body_text}</p>",
                settings.PERSONAL_EMAIL,
                settings.PERSONAL_FIRST_NAME,
            )
            entry = {
                "slug": writer.slugify(msg.date_iso, msg.sender_name, msg.subject),
                "subject": msg.subject,
                "sender_name": msg.sender_name or (s.display_name or s.value),
                "sender_email": msg.sender_email,
                "date": msg.date_iso,
                "snippet": gmail_mod.snippet_from(msg.body_text or clean_html, limit=280),
                "body_html": clean_html,
                "body_text": msg.body_text,
                "gmail_id": msg.gmail_id,
            }
            if writer.write_newsletter(settings.content_dir, entry):
                written += 1

    if written > 0:
        writer.commit_and_push(settings.PORTFOLIO_REPO_PATH, written)

    _write_last_sync(datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"))

    return templates.TemplateResponse(
        "dashboard.html",
        {
            "request": request,
            "authed": True,
            "last_sync": _read_last_sync(),
            "sender_count": len(store.all()),
            "flash": f"Synced {written} new newsletter{'s' if written != 1 else ''}.",
        },
    )
```

- [ ] **Step 3: Create templates**

Write `e:/portfolio/tools/newsletter-sync/app/templates/base.html`:

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>{% block title %}newsletter-sync{% endblock %}</title>
<style>
  *{box-sizing:border-box}
  body{font:14px/1.5 ui-sans-serif,system-ui,sans-serif;background:#faf8f2;color:#111;margin:0;padding:2rem;max-width:720px;margin-inline:auto}
  h1{font-size:1.6rem;margin:0 0 .5rem}
  h2{font-size:1.1rem;margin:2rem 0 .8rem}
  a{color:#d94b0c}
  button,input[type=submit]{font:inherit;background:#111;color:#faf8f2;border:0;padding:.5rem 1rem;border-radius:6px;cursor:pointer}
  button.secondary{background:#f4f1e8;color:#111;border:1px solid #e0dac6}
  input[type=text]{font:inherit;padding:.45rem .6rem;border:1px solid #e0dac6;border-radius:6px;background:#fff}
  .row{display:flex;gap:.5rem;align-items:center;margin:.35rem 0}
  .flash{background:#d94b0c;color:#fff;padding:.6rem .9rem;border-radius:6px;margin:1rem 0}
  .muted{color:#74706a;font-size:.9rem}
  table{border-collapse:collapse;width:100%}
  td{padding:.4rem 0;border-bottom:1px solid #e0dac6}
  .status{display:inline-block;padding:2px 8px;border-radius:999px;font-size:.75rem;font-family:ui-monospace,monospace}
  .status.ok{background:#d1fae5;color:#065f46}
  .status.warn{background:#fef3c7;color:#92400e}
</style>
</head>
<body>
{% if flash %}<div class="flash">{{ flash }}</div>{% endif %}
{% block body %}{% endblock %}
</body>
</html>
```

Write `e:/portfolio/tools/newsletter-sync/app/templates/dashboard.html`:

```html
{% extends "base.html" %}
{% block body %}
<h1>newsletter-sync</h1>
<p class="muted">Local Gmail → portfolio sync. Bound to 127.0.0.1 only.</p>

<h2>Gmail</h2>
<p>
  {% if authed %}
    <span class="status ok">authorized</span>
  {% else %}
    <span class="status warn">not authorized</span>
    &nbsp; <a href="/auth">Connect Gmail</a>
  {% endif %}
</p>

<h2>Senders</h2>
<p>{{ sender_count }} allowlisted sender{{ 's' if sender_count != 1 else '' }} &middot; <a href="/senders">manage</a></p>

<h2>Last sync</h2>
<p>{{ last_sync or 'never' }}</p>

<h2>Sync now</h2>
<form method="post" action="/sync">
  <button type="submit">Fetch + sanitize + commit + push</button>
</form>
{% endblock %}
```

Write `e:/portfolio/tools/newsletter-sync/app/templates/senders.html`:

```html
{% extends "base.html" %}
{% block body %}
<h1>Senders</h1>
<p class="muted"><a href="/">&larr; dashboard</a></p>

<form method="post" action="/senders/add" class="row">
  <input name="value" type="text" placeholder="newsletter@openai.com or @openai.com" required />
  <input name="display_name" type="text" placeholder="Display name (optional)" />
  <button type="submit">Add</button>
</form>

<table>
  {% for s in senders %}
  <tr>
    <td><strong>{{ s.display_name or s.value }}</strong>
      {% if s.display_name %}<span class="muted"> &middot; {{ s.value }}</span>{% endif %}
      {% if s.is_domain %}<span class="status">domain</span>{% endif %}
    </td>
    <td style="text-align:right">
      <form method="post" action="/senders/remove" style="display:inline">
        <input type="hidden" name="value" value="{{ s.value }}" />
        <button class="secondary" type="submit">remove</button>
      </form>
    </td>
  </tr>
  {% else %}
  <tr><td colspan="2" class="muted">No senders yet.</td></tr>
  {% endfor %}
</table>
{% endblock %}
```

- [ ] **Step 4: Run all Python tests**

```bash
cd e:/portfolio/tools/newsletter-sync && pytest -v
```
Expected: 28+ tests pass (15 sanitize + 8 senders + 6 writer + 5 gmail helpers, plus anything carried through).

- [ ] **Step 5: Smoke-run the FastAPI app (manual)**

In a second PowerShell terminal with `.env` populated:
```powershell
cd e:/portfolio/tools/newsletter-sync
.venv\Scripts\activate
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Browser: open `http://127.0.0.1:8000`. Expected: dashboard page, "not authorized" badge, Connect Gmail link, 0 senders, last sync "never".

Click Connect Gmail → OAuth consent → redirect back → dashboard now shows "authorized".

Go to /senders → add one real newsletter sender you actually subscribe to → return to dashboard → click "Fetch + sanitize + commit + push". Expected: flash message with N synced; commit appears in `git log`; Vercel auto-deploys; new cards show up at `/newsletter` once deploy is done.

- [ ] **Step 6: Commit**

```bash
cd e:/portfolio && git add tools/newsletter-sync/app/config.py tools/newsletter-sync/app/main.py tools/newsletter-sync/app/templates/ && git commit -m "feat(newsletter-sync): FastAPI routes + dashboard/senders templates"
```

---

## Task 12: Final gate + deploy

**Files:**
- None to create — all gates

- [ ] **Step 1: Run every test suite**

```bash
cd e:/portfolio && npm test
cd e:/portfolio/tools/newsletter-sync && pytest
```
Expected: Node `pass 40+ / fail 0`; Python `28+ passed`.

- [ ] **Step 2: Full prebuild dry-run**

```bash
cd e:/portfolio && rm -rf public/newsletter/*.html tree.json && npm run build
```
Expected: `tree.json` and all `public/newsletter/*.html` regenerated cleanly; no errors.

- [ ] **Step 3: Git state check**

```bash
cd e:/portfolio && git status --short
```
Expected: no tracked files modified, only intentional changes (e.g., regenerated `tree.json` if content changed).

- [ ] **Step 4: Deploy**

```bash
cd e:/portfolio && npx vercel --prod
```

Wait for deploy URL. Open it in a browser. Check:
- `/` — portfolio home still works, chatbot still streams
- `/newsletter/` — renders, empty state or real content
- `/newsletter/<slug>` — renders with back link
- Nav bar on home now shows Reading

---

## Acceptance criteria

The build is done when:

1. `public/newsletter/index.html` renders from `content/newsletters/index.json` on every build.
2. `public/newsletter/<slug>.html` exists for each entry in `index.json`.
3. Running `scripts/build-newsletters.mjs` is idempotent — same inputs produce the same outputs (except timestamps).
4. `tools/newsletter-sync` FastAPI app runs on `127.0.0.1:8000`, completes OAuth once, persists the token, and reuses it on subsequent runs.
5. The sync flow writes new `content/newsletters/<slug>.json` files, updates `index.json`, dedupes by `gmail_id`, and commits + pushes in a single `sync: N newsletters` commit.
6. Sanitizer strips personalized greetings, the personal email, tracking pixels, unsubscribe links, view-in-browser links, and footer blocks. All 15 sanitizer tests pass.
7. Pushing a sync commit triggers a Vercel rebuild and new cards appear at `/newsletter/` within minutes.
8. No Gmail credentials, tokens, or `.env` files are committed.
9. Home page nav includes a working link to `/newsletter/`.
10. `tests/**` passes cleanly under `node --test`; `tools/newsletter-sync/tests/` passes cleanly under `pytest`.
