import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cannedReply, INTENTS } from '../lib/intents.js';

test('cannedReply: smalltalk gets a greeting with suggestions, no brush-off', () => {
  const r = cannedReply('smalltalk');
  assert.match(r, /hey|hi/i);
  assert.match(r, /vectorless|voice|ask/i);
  assert.doesNotMatch(r, /not really why we're here/);
});

test('cannedReply: off_topic gets the brush-off', () => {
  assert.match(cannedReply('off_topic'), /not really why we're here/);
});

test('cannedReply: about_me and domain_concept are answered by the model, so no canned text', () => {
  assert.equal(cannedReply('about_me'), null);
  assert.equal(cannedReply('domain_concept'), null);
});

test('INTENTS lists the four router categories', () => {
  assert.deepEqual([...INTENTS].sort(), ['about_me', 'domain_concept', 'off_topic', 'smalltalk']);
});

test('cannedReply: a thank-you gets a sign-off, not the greeting', () => {
  const r = cannedReply('smalltalk', 'thanks, that was helpful');
  assert.match(r, /anytime|glad/i);
  assert.doesNotMatch(r, /I'm Pranav's AI twin/);
  assert.match(cannedReply('smalltalk', 'hello there'), /AI twin/);
});
