// CLI: reads content/case-studies/*.md, writes public/projects/<slug>/index.html.
// Mirrors scripts/build-newsletters.mjs.
import { readdir, readFile, writeFile, mkdir, rm, stat } from 'node:fs/promises';
import { join, resolve, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderCaseStudyPage } from '../lib/build-case-studies.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = join(ROOT, 'content', 'case-studies');
const OUT_DIR = join(ROOT, 'public', 'projects');

async function main() {
  let entries;
  try {
    entries = await readdir(CONTENT_DIR);
  } catch (err) {
    console.error(`Cannot read ${CONTENT_DIR}: ${err.message}`);
    process.exit(1);
  }

  const mdFiles = entries.filter(f => extname(f).toLowerCase() === '.md');
  if (mdFiles.length === 0) {
    console.warn(`No .md files in ${CONTENT_DIR} — nothing to build.`);
    return;
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

  let wrote = 0;
  for (const file of mdFiles) {
    const slug = basename(file, extname(file));
    const md = await readFile(join(CONTENT_DIR, file), 'utf8');
    const html = renderCaseStudyPage({ slug, md });
    const dir = join(OUT_DIR, slug);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'index.html'), html);
    wrote++;
  }

  console.log(`Wrote ${OUT_DIR} — ${wrote} case stud${wrote === 1 ? 'y' : 'ies'}.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
