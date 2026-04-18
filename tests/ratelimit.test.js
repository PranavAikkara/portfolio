import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCookie, nextCookieValue, LIMIT } from '../lib/ratelimit.js';

test('LIMIT is 15', () => assert.equal(LIMIT, 15));

test('parseCookie: returns null when header is missing or empty', () => {
  assert.equal(parseCookie(undefined), null);
  assert.equal(parseCookie(''), null);
});

test('parseCookie: extracts count+date from pp_chat_count cookie', () => {
  const header = 'foo=bar; pp_chat_count=7|20260418; baz=qux';
  assert.deepEqual(parseCookie(header), { count: 7, date: '20260418' });
});

test('parseCookie: returns null if value is malformed', () => {
  assert.equal(parseCookie('pp_chat_count=garbage'), null);
  assert.equal(parseCookie('pp_chat_count=7'), null);
});

test('nextCookieValue: allows first-of-day when current is null', () => {
  const r = nextCookieValue(null, '20260418');
  assert.equal(r.allowed, true);
  assert.equal(r.count, 1);
  assert.match(r.cookie, /^pp_chat_count=1\|20260418/);
});

test('nextCookieValue: resets count when date changed', () => {
  const r = nextCookieValue({ count: 14, date: '20260417' }, '20260418');
  assert.equal(r.allowed, true);
  assert.equal(r.count, 1);
});

test('nextCookieValue: increments when under limit', () => {
  const r = nextCookieValue({ count: 5, date: '20260418' }, '20260418');
  assert.equal(r.allowed, true);
  assert.equal(r.count, 6);
});

test('nextCookieValue: blocks when at or over limit', () => {
  const r = nextCookieValue({ count: 15, date: '20260418' }, '20260418');
  assert.equal(r.allowed, false);
  assert.equal(r.count, 15);
});

test('nextCookieValue: cookie has SameSite=Lax, Max-Age=86400, Path=/', () => {
  const r = nextCookieValue(null, '20260418');
  assert.match(r.cookie, /SameSite=Lax/);
  assert.match(r.cookie, /Max-Age=86400/);
  assert.match(r.cookie, /Path=\//);
});
