// CLI: reads content/newsletters/*.json, writes public/newsletter/index.html
// and public/newsletter/<slug>/index.html per entry so URLs like
// /newsletter/<slug> resolve without any rewrite config.
import { readdir, readFile, writeFile, mkdir, rm, stat } from 'node:fs/promises';
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

  // Clear prior generated output. Keep styles.css (hand-authored).
  await mkdir(OUT_DIR, { recursive: true });
  const existing = await readdir(OUT_DIR).catch(() => []);
  for (const name of existing) {
    if (name === 'styles.css') continue;
    const p = join(OUT_DIR, name);
    const s = await stat(p);
    if (s.isDirectory()) {
      await rm(p, { recursive: true, force: true });
    } else if (name.endsWith('.html')) {
      await rm(p);
    }
  }

  // Sort newest-first defensively; the sync app should already do this.
  index.sort((a, b) => new Date(b.date) - new Date(a.date));

  // List page
  await writeFile(join(OUT_DIR, 'index.html'), renderListPage({ items: index }));

  // Detail pages — each slug becomes its own directory with index.html inside,
  // so /newsletter/<slug> resolves directly on any static host.
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
    const dir = join(OUT_DIR, meta.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'index.html'), renderDetailPage({ item: detail }));
    wrote++;
  }

  console.log(`Wrote ${OUT_DIR} — list + ${wrote} detail page${wrote === 1 ? '' : 's'}.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
