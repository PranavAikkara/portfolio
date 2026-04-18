import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildToc, resolveNodes } from '../lib/tree.js';

const FIXTURE = {
  generated_at: '2026-04-18T00:00:00Z',
  nodes: [
    {
      id: 'a',
      title: 'A',
      summary: 'top-a',
      path: ['A'],
      children: [
        { id: 'a.b', title: 'B', summary: 'child-b', path: ['A', 'B'], content: 'body-b' },
      ],
    },
    {
      id: 'c',
      title: 'C',
      path: ['C'],
      children: [
        { id: 'c.d', title: 'D', path: ['C', 'D'], content: 'body-d' },
      ],
    },
  ],
};

test('buildToc: flattens every node with title/summary/path', () => {
  const toc = buildToc(FIXTURE);
  assert.equal(toc.length, 4);
  assert.deepEqual(toc[0], { id: 'a', title: 'A', summary: 'top-a', path: ['A'] });
  assert.deepEqual(toc[3], { id: 'c.d', title: 'D', summary: undefined, path: ['C', 'D'] });
});

test('resolveNodes: returns content for leaves matching given IDs', () => {
  const found = resolveNodes(FIXTURE, ['a.b', 'c.d']);
  assert.equal(found.length, 2);
  assert.equal(found[0].content, 'body-b');
  assert.equal(found[1].content, 'body-d');
});

test('resolveNodes: unknown IDs are silently dropped', () => {
  const found = resolveNodes(FIXTURE, ['a.b', 'nope']);
  assert.equal(found.length, 1);
  assert.equal(found[0].id, 'a.b');
});

test('resolveNodes: an internal node with no content is skipped', () => {
  const found = resolveNodes(FIXTURE, ['a']);
  assert.equal(found.length, 0);
});
