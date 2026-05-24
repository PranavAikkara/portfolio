// Pure HTML-building helpers for the case-studies section.
// No filesystem, no network — the CLI wrapper (scripts/build-case-studies.mjs)
// handles I/O. Mirrors the shape of lib/build-newsletters.js.

import { marked } from 'marked';

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
      <li><a href="/#projects" class="active">Projects</a></li>
      <li><a href="/newsletter/">Reading</a></li>
      <li><a href="/#contact">Contact</a></li>
    </ul>
    <a class="nav-cta" href="/#chat"><span class="blip"></span>Ask my AI twin</a>
  </nav>
`;

// A marked renderer that lets ```mermaid blocks pass through as <div class="mermaid">,
// so the Mermaid CDN script can render them in the browser.
const mermaidRenderer = {
  code({ text, lang }) {
    if ((lang || '').trim() === 'mermaid') {
      return `<div class="mermaid">${text}</div>\n`;
    }
    return false;
  },
};

let markedConfigured = false;
function ensureMarked() {
  if (markedConfigured) return;
  marked.use({ renderer: mermaidRenderer, gfm: true, breaks: false });
  markedConfigured = true;
}

// Pull the first H1 and the first blockquote (used as lede) out of the markdown,
// then render the rest as the body. Falls back gracefully if either is missing.
export function parseCaseStudy(md) {
  const lines = md.split(/\r?\n/);
  let title = '';
  let lede = '';
  const bodyLines = [];

  let i = 0;
  // Skip leading blank lines
  while (i < lines.length && lines[i].trim() === '') i++;

  // Title: first H1
  if (i < lines.length && /^#\s+/.test(lines[i])) {
    title = lines[i].replace(/^#\s+/, '').trim();
    i++;
  }
  // Skip blank lines after title
  while (i < lines.length && lines[i].trim() === '') i++;

  // Lede: first blockquote (single line or contiguous lines starting with >)
  if (i < lines.length && /^>\s?/.test(lines[i])) {
    const quoteLines = [];
    while (i < lines.length && /^>\s?/.test(lines[i])) {
      quoteLines.push(lines[i].replace(/^>\s?/, ''));
      i++;
    }
    lede = quoteLines.join(' ').trim();
  }

  // Rest is body
  while (i < lines.length) {
    bodyLines.push(lines[i]);
    i++;
  }

  return { title, lede, body: bodyLines.join('\n') };
}

function shell({ title, description, body, hasMermaid }) {
  const mermaidScript = hasMermaid ? `
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  mermaid.initialize({
    startOnLoad: true,
    theme: 'base',
    themeVariables: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '14px',
      primaryColor: '#f4efe6',
      primaryTextColor: '#0e0e0c',
      primaryBorderColor: '#0e0e0c',
      lineColor: '#0e0e0c',
      secondaryColor: '#e9e2d4',
      tertiaryColor: '#fbf8f1'
    }
  });
</script>` : '';

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
<link rel="stylesheet" href="/projects/styles.css" />
</head>
<body>
${NAV}
${body}
${mermaidScript}
</body>
</html>`;
}

export function renderCaseStudyPage({ slug, md }) {
  ensureMarked();
  const { title, lede, body } = parseCaseStudy(md);
  const bodyHtml = marked.parse(body);
  const hasMermaid = bodyHtml.includes('class="mermaid"');

  const description = lede || `${title} — a case study by Pranav P.`;

  const main = `
<main class="cs-wrap">
  <a class="cs-back" href="/#projects">← Back to projects</a>
  <article class="cs-article">
    <header class="cs-header">
      <div class="eyebrow"><span class="dot-sq"></span>Case study · ${escapeHtml(slug)}</div>
      <h1 class="cs-title">${escapeHtml(title)}</h1>
      ${lede ? `<p class="cs-lede">${escapeHtml(lede)}</p>` : ''}
    </header>
    <div class="cs-body">
${bodyHtml}
    </div>
  </article>
</main>`;

  return shell({ title, description, body: main, hasMermaid });
}
