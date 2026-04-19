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
