import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify } from '../lib/build-index.js';

test('slugify: joins path parts with dots and lowercases', () => {
  assert.equal(
    slugify(['FarmwiseAI — current role', 'Vectorless RAG agentic system', 'What it is']),
    'farmwiseai-current-role.vectorless-rag-agentic-system.what-it-is'
  );
});

test('slugify: strips em-dash, commas, and extra whitespace', () => {
  assert.equal(slugify(['Hello,  World — !!'])[0], 'h');
  assert.equal(slugify(['Hello,  World — !!']), 'hello-world');
});

import { parseMarkdownFile } from '../lib/build-index.js';

const SAMPLE = `# FarmwiseAI — current role
> Associate Data Scientist, Apr 2025 – now.

## Vectorless RAG agentic system
> PageIndex-style retrieval — no vector DB.

### What it is
I built a retrieval pipeline that walks a hierarchical index.

### Why it beats semantic search
Similarity ≠ relevance.
`;

test('parseMarkdownFile: top-level has title, summary, and children', () => {
  const tree = parseMarkdownFile(SAMPLE);
  assert.equal(tree.title, 'FarmwiseAI — current role');
  assert.equal(tree.summary, 'Associate Data Scientist, Apr 2025 – now.');
  assert.equal(tree.children.length, 1);
});

test('parseMarkdownFile: leaves carry content, not summary', () => {
  const tree = parseMarkdownFile(SAMPLE);
  const leaves = tree.children[0].children;
  assert.equal(leaves.length, 2);
  assert.equal(leaves[0].title, 'What it is');
  assert.match(leaves[0].content, /retrieval pipeline/);
  assert.equal(leaves[0].children, undefined);
});

test('parseMarkdownFile: assigns dotted IDs built from heading path', () => {
  const tree = parseMarkdownFile(SAMPLE);
  assert.equal(tree.id, 'farmwiseai-current-role');
  assert.equal(tree.children[0].id, 'farmwiseai-current-role.vectorless-rag-agentic-system');
  assert.equal(
    tree.children[0].children[0].id,
    'farmwiseai-current-role.vectorless-rag-agentic-system.what-it-is'
  );
});

test('parseMarkdownFile: path arrays are populated at every level', () => {
  const tree = parseMarkdownFile(SAMPLE);
  assert.deepEqual(tree.path, ['FarmwiseAI — current role']);
  assert.deepEqual(tree.children[0].children[0].path, [
    'FarmwiseAI — current role',
    'Vectorless RAG agentic system',
    'What it is',
  ]);
});

import { buildTree } from '../lib/build-index.js';

test('buildTree: wraps all file trees under one document with generated_at', () => {
  const files = [
    { path: '01-a.md', content: '# A\n\n## A1\n### A1a\nhello' },
    { path: '02-b.md', content: '# B\n## B1\n### B1a\nworld' },
  ];
  const out = buildTree(files);
  assert.equal(out.nodes.length, 2);
  assert.equal(out.nodes[0].title, 'A');
  assert.equal(out.nodes[1].title, 'B');
  assert.match(out.generated_at, /^\d{4}-\d{2}-\d{2}T/);
});

test('parseMarkdownFile: throws on duplicate sibling headings', () => {
  const md = `# Root\n\n## Section\n\n### Overview\nfirst\n\n### Overview\nsecond\n`;
  assert.throws(() => parseMarkdownFile(md), /Duplicate node id/);
});

test('parseMarkdownFile: throws on multiple H1 headings', () => {
  const md = `# First\n\n## Sub\n### Leaf\nhi\n\n# Second\n\n## Sub\n### Leaf\nbye\n`;
  assert.throws(() => parseMarkdownFile(md), /Multiple H1 headings/);
});
