// CLI: reads knowledge/*.md, writes tree.json at repo root.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTree } from '../lib/build-index.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const KNOWLEDGE_DIR = join(ROOT, 'knowledge');
const OUT = join(ROOT, 'tree.json');

async function main() {
  let entries;
  try {
    entries = await readdir(KNOWLEDGE_DIR);
  } catch (err) {
    console.error(`Cannot read ${KNOWLEDGE_DIR}: ${err.message}`);
    process.exit(1);
  }
  const mdFiles = entries.filter(f => f.endsWith('.md')).sort();
  if (mdFiles.length === 0) {
    console.error(`No .md files in ${KNOWLEDGE_DIR}`);
    process.exit(1);
  }

  const files = await Promise.all(
    mdFiles.map(async name => ({
      path: name,
      content: await readFile(join(KNOWLEDGE_DIR, name), 'utf8'),
    }))
  );

  const tree = buildTree(files);
  await writeFile(OUT, JSON.stringify(tree, null, 2));
  const leafCount = countLeaves(tree.nodes);
  console.log(`Wrote ${OUT} — ${tree.nodes.length} top-level nodes, ${leafCount} leaves.`);
}

function countLeaves(nodes) {
  let n = 0;
  for (const node of nodes) {
    if (!node.children || node.children.length === 0) n++;
    else n += countLeaves(node.children);
  }
  return n;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
