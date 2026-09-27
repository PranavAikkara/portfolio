import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectNodes, ROUTER_MODEL } from '../lib/router.js';
import { resolveModel } from '../lib/llm.js';

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
  const groq = mockGroq(JSON.stringify({ node_ids: ['a.pitch'], intent: 'about_me' }));
  const r = await selectNodes({ groq, toc: TOC, question: 'who are you' });
  assert.deepEqual(r, { node_ids: ['a.pitch'], intent: 'about_me', off_topic: false });
});

test('selectNodes: returns empty + off_topic=true when router says so', async () => {
  const groq = mockGroq(JSON.stringify({ node_ids: [], intent: 'off_topic' }));
  const r = await selectNodes({ groq, toc: TOC, question: 'capital of france' });
  assert.deepEqual(r, { node_ids: [], intent: 'off_topic', off_topic: true });
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

test('ROUTER_MODEL resolves from the LLM config', () => {
  assert.equal(ROUTER_MODEL, resolveModel(process.env));
});

test('selectNodes: extracts JSON even when the model wraps it in prose', async () => {
  const groq = mockGroq('Sure, here you go:\n{"node_ids":["a.pitch"],"intent":"about_me"}\nHope that helps.');
  const r = await selectNodes({ groq, toc: TOC, question: 'who are you' });
  assert.deepEqual(r, { node_ids: ['a.pitch'], intent: 'about_me', off_topic: false });
});

test('selectNodes: does not request response_format and uses the configured model', async () => {
  let params;
  const groq = { chat: { completions: { create: async (p) => { params = p; return { choices: [{ message: { content: '{"node_ids":[],"off_topic":true}' } }] }; } } } };
  await selectNodes({ groq, toc: TOC, question: 'x', model: 'test/model' });
  assert.equal(params.response_format, undefined);
  assert.equal(params.model, 'test/model');
  assert.equal(params.reasoning_effort, 'low');
});

test('selectNodes: returns the intent the router chose', async () => {
  const groq = mockGroq(JSON.stringify({ node_ids: [], intent: 'smalltalk' }));
  const r = await selectNodes({ groq, toc: TOC, question: 'hi' });
  assert.equal(r.intent, 'smalltalk');
  assert.equal(r.off_topic, false);
});

test('selectNodes: unknown or missing intent falls back to about_me, off_topic intent sets off_topic', async () => {
  let r = await selectNodes({ groq: mockGroq(JSON.stringify({ node_ids: ['a.pitch'], intent: 'banana' })), toc: TOC, question: 'x' });
  assert.equal(r.intent, 'about_me');
  r = await selectNodes({ groq: mockGroq(JSON.stringify({ node_ids: [], intent: 'off_topic' })), toc: TOC, question: 'weather' });
  assert.equal(r.intent, 'off_topic');
  assert.equal(r.off_topic, true);
});

test('selectNodes: domain_concept keeps its node_ids so the answer can tie back to real work', async () => {
  const r = await selectNodes({ groq: mockGroq(JSON.stringify({ node_ids: ['a.pitch'], intent: 'domain_concept' })), toc: TOC, question: 'what is rag' });
  assert.deepEqual(r.node_ids, ['a.pitch']);
  assert.equal(r.intent, 'domain_concept');
});
