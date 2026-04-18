import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectNodes, ROUTER_MODEL } from '../lib/router.js';

// Tiny mock matching the subset of the Groq SDK we use.
function mockGroq(responseContent) {
  return {
    chat: {
      completions: {
        create: async () => ({
          choices: [{ message: { content: responseContent } }],
        }),
      },
    },
  };
}

const TOC = [
  { id: 'a', title: 'About', summary: 'intro', path: ['About'] },
  { id: 'a.pitch', title: 'Pitch', summary: 'elevator pitch', path: ['About', 'Pitch'] },
  { id: 'fw', title: 'FarmwiseAI', summary: 'current role', path: ['FarmwiseAI'] },
];

test('selectNodes: parses node_ids and off_topic from valid JSON', async () => {
  const groq = mockGroq(JSON.stringify({ node_ids: ['a.pitch'], off_topic: false }));
  const r = await selectNodes({ groq, toc: TOC, question: 'who are you' });
  assert.deepEqual(r, { node_ids: ['a.pitch'], off_topic: false });
});

test('selectNodes: returns empty + off_topic=true when router says so', async () => {
  const groq = mockGroq(JSON.stringify({ node_ids: [], off_topic: true }));
  const r = await selectNodes({ groq, toc: TOC, question: 'capital of france' });
  assert.deepEqual(r, { node_ids: [], off_topic: true });
});

test('selectNodes: defends against malformed JSON by returning empty + off_topic=false', async () => {
  const groq = mockGroq('this is not json');
  const r = await selectNodes({ groq, toc: TOC, question: 'hi' });
  assert.deepEqual(r, { node_ids: [], off_topic: false });
});

test('selectNodes: filters node_ids to only those present in ToC', async () => {
  const groq = mockGroq(JSON.stringify({ node_ids: ['a.pitch', 'nope'], off_topic: false }));
  const r = await selectNodes({ groq, toc: TOC, question: 'x' });
  assert.deepEqual(r.node_ids, ['a.pitch']);
});

test('ROUTER_MODEL is llama-3.3-70b-versatile', () => {
  assert.equal(ROUTER_MODEL, 'llama-3.3-70b-versatile');
});
