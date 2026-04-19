// One-shot: re-generate the `snippet` field for every content/newsletters/*.json
// by extracting plaintext from the sanitized body_html (instead of raw body_text).
// Also updates content/newsletters/index.json to match.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'content', 'newsletters');
const INDEX = join(DIR, 'index.json');

const LIMIT = 240;

// Minimal HTML → plaintext: strip tags, collapse whitespace, decode basic entities.
function htmlToText(html) {
  if (!html) return '';
  return html
    // drop script/style just in case something slipped past the sanitizer
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    // keep block boundaries readable
    .replace(/<\/(p|div|h[1-6]|li|br)\s*\/?>/gi, '$& ')
    .replace(/<br\s*\/?>/gi, ' ')
    // strip all remaining tags
    .replace(/<[^>]+>/g, ' ')
    // decode the handful of entities we emit
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&rsquo;|&#8217;/g, '’')
    .replace(/&lsquo;|&#8216;/g, '‘')
    .replace(/&hellip;/g, '…')
    // strip markdown link syntax that sometimes leaks through email body_text copied into HTML
    .replace(/\[([^\]]+)\]\s*\([^)]+\)/g, '$1')
    // collapse
    .replace(/\s+/g, ' ')
    .trim();
}

function snippetFrom(text) {
  return text.length > LIMIT ? text.slice(0, LIMIT).trim() + '…' : text;
}

async function main() {
  const entries = await readdir(DIR);
  const detailFiles = entries.filter(f => f.endsWith('.json') && f !== 'index.json' && f !== 'senders.json');

  // Rewrite each detail file's snippet
  const fresh = new Map();
  for (const name of detailFiles) {
    const path = join(DIR, name);
    const entry = JSON.parse(await readFile(path, 'utf8'));
    const plain = htmlToText(entry.body_html || '') || (entry.body_text || '');
    entry.snippet = snippetFrom(plain);
    await writeFile(path, JSON.stringify(entry, null, 2));
    fresh.set(entry.slug, entry.snippet);
  }

  // Update index.json snippets + keep newest-first sort
  const index = JSON.parse(await readFile(INDEX, 'utf8'));
  for (const meta of index) {
    if (fresh.has(meta.slug)) meta.snippet = fresh.get(meta.slug);
  }
  index.sort((a, b) => new Date(b.date) - new Date(a.date));
  await writeFile(INDEX, JSON.stringify(index, null, 2));

  console.log(`Refreshed ${fresh.size} snippets.`);
}

main().catch(err => { console.error(err); process.exit(1); });
