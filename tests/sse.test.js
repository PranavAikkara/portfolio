import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sseHeaders, formatEvent } from '../lib/sse.js';

test('sseHeaders: includes text/event-stream and no-cache', () => {
  const h = sseHeaders();
  assert.equal(h['Content-Type'], 'text/event-stream; charset=utf-8');
  assert.equal(h['Cache-Control'], 'no-cache, no-transform');
  assert.equal(h['X-Accel-Buffering'], 'no');
});

test('formatEvent: serializes JSON and ends with blank line', () => {
  const s = formatEvent({ type: 'token', text: 'hi' });
  assert.equal(s, 'data: {"type":"token","text":"hi"}\n\n');
});
