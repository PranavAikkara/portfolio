import { test } from 'node:test';
import assert from 'node:assert/strict';
import { streamAnswer, buildContextBlock, ANSWER_MODEL, PERSONA } from '../lib/answerer.js';

async function* fakeGroqStream(chunks) {
  for (const c of chunks) yield { choices: [{ delta: { content: c } }] };
}
function mockGroq(chunks) {
  return {
    chat: {
      completions: {
        create: async () => fakeGroqStream(chunks),
      },
    },
  };
}

test('streamAnswer: yields each Groq delta as a { text } chunk', async () => {
  const groq = mockGroq(['Hel', 'lo ', 'world']);
  const out = [];
  for await (const chunk of streamAnswer({
    groq,
    persona: 'be brief',
    contextNodes: [{ id: 'x', path: ['x'], content: 'abc' }],
    messages: [{ role: 'user', content: 'hi' }],
  })) out.push(chunk.text);
  assert.deepEqual(out, ['Hel', 'lo ', 'world']);
});

test('streamAnswer: skips chunks with no delta content', async () => {
  async function* mixed() {
    yield { choices: [{ delta: {} }] };
    yield { choices: [{ delta: { content: 'hi' } }] };
    yield { choices: [{ delta: { content: '' } }] };
  }
  const groq = { chat: { completions: { create: async () => mixed() } } };
  const out = [];
  for await (const c of streamAnswer({
    groq, persona: PERSONA, contextNodes: [], messages: [{ role: 'user', content: 'q' }],
  })) out.push(c.text);
  assert.deepEqual(out, ['hi']);
});

test('buildContextBlock: formats nodes with paths for the model', () => {
  const s = buildContextBlock([
    { id: 'a', path: ['About', 'Pitch'], content: 'hello' },
  ]);
  assert.match(s, /About › Pitch/);
  assert.match(s, /hello/);
});

test('buildContextBlock: returns "(no context)" when empty', () => {
  assert.match(buildContextBlock([]), /no context/i);
});

test('ANSWER_MODEL is llama-3.3-70b-versatile', () => {
  assert.equal(ANSWER_MODEL, 'llama-3.3-70b-versatile');
});
