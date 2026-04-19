import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDate,
  escapeHtml,
  renderListPage,
  renderDetailPage,
} from '../lib/build-newsletters.js';

test('formatDate: renders ISO date as "Mon D, YYYY"', () => {
  assert.equal(formatDate('2026-04-19T08:32:00Z'), 'Apr 19, 2026');
  assert.equal(formatDate('2026-01-05T00:00:00Z'), 'Jan 5, 2026');
});

test('escapeHtml: escapes < > & " \'', () => {
  assert.equal(escapeHtml('a & b'), 'a &amp; b');
  assert.equal(escapeHtml('<script>'), '&lt;script&gt;');
  assert.equal(escapeHtml(`"it's"`), '&quot;it&#39;s&quot;');
});

test('renderListPage: emits one <article> per item with escaped subject and snippet', () => {
  const html = renderListPage({
    items: [
      { slug: 'a', subject: 'Hello & welcome', sender_name: 'OpenAI', date: '2026-04-19T00:00:00Z', snippet: 'snip' },
      { slug: 'b', subject: 'Second', sender_name: 'Anthropic', date: '2026-04-18T00:00:00Z', snippet: 's2' },
    ],
  });
  assert.match(html, /<!DOCTYPE html>/);
  assert.match(html, /<article[^>]*>[\s\S]*Hello &amp; welcome[\s\S]*<\/article>/);
  assert.match(html, /href="\/newsletter\/a"/);
  assert.match(html, /href="\/newsletter\/b"/);
  assert.match(html, /Apr 19, 2026/);
  assert.match(html, /Apr 18, 2026/);
});

test('renderListPage: empty items renders empty-state message', () => {
  const html = renderListPage({ items: [] });
  assert.match(html, /no newsletters yet/i);
});

test('renderDetailPage: injects sanitized body_html as-is', () => {
  const html = renderDetailPage({
    item: {
      slug: 's',
      subject: 'Title',
      sender_name: 'OpenAI',
      sender_email: 'x@openai.com',
      date: '2026-04-19T00:00:00Z',
      body_html: '<p>Hello <strong>there</strong></p>',
    },
  });
  assert.match(html, /<p>Hello <strong>there<\/strong><\/p>/);
  assert.match(html, /Title/);
  assert.match(html, /Apr 19, 2026/);
  assert.match(html, /← back to list/i);
});

test('renderDetailPage: escapes subject in <title> and <h1>', () => {
  const html = renderDetailPage({
    item: {
      slug: 's',
      subject: 'A & B',
      sender_name: 'x',
      date: '2026-04-19T00:00:00Z',
      body_html: '<p/>',
    },
  });
  assert.match(html, /<title>A &amp; B/);
  assert.match(html, /<h1[^>]*>A &amp; B/);
});
