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
  <nav class="nl-nav">
    <a class="nl-brand" href="/">Pranav&nbsp;P <span class="ast">✳︎</span></a>
    <div class="nl-navlinks">
      <a href="/#experience">Experience</a>
      <a href="/#projects">Projects</a>
      <a href="/#education">Education</a>
      <a href="/newsletter/" class="active">Reading</a>
      <a href="/#contact">Contact</a>
    </div>
    <a class="nl-cta" href="mailto:aikkara.pranav@gmail.com">Get in touch</a>
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
    <article class="nl-card">
      <a href="/newsletter/${escapeHtml(it.slug)}" style="text-decoration:none;color:inherit;display:block">
        <div class="nl-card-meta">
          <span class="nl-sender">${escapeHtml(it.sender_name)}</span>
          <span class="nl-date">${formatDate(it.date)}</span>
        </div>
        <h2 class="nl-card-title">${escapeHtml(it.subject)}</h2>
        <p class="nl-card-snippet">${escapeHtml(it.snippet || '')}</p>
      </a>
    </article>`).join('\n');

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
  <header class="nl-detail-header">
    <div class="nl-card-meta">
      <span class="nl-sender">${escapeHtml(item.sender_name)}</span>
      <span class="nl-date">${formatDate(item.date)}</span>
    </div>
    <h1 class="nl-detail-title">${escapeHtml(item.subject)}</h1>
  </header>
  <article class="nl-detail">
    <div class="nl-detail-body">
      ${item.body_html || '<p>(no content)</p>'}
    </div>
  </article>
</main>`,
  });
}
