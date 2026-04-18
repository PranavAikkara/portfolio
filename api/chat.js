import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Groq from 'groq-sdk';

import { buildToc, resolveNodes } from '../lib/tree.js';
import { parseCookie, nextCookieValue, todayYmd } from '../lib/ratelimit.js';
import { sseHeaders, formatEvent } from '../lib/sse.js';
import { selectNodes } from '../lib/router.js';
import { streamAnswer } from '../lib/answerer.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const TREE_PATH = join(ROOT, '..', 'tree.json');

let cachedTree = null;
let cachedToc = null;
async function loadTree() {
  if (cachedTree) return { tree: cachedTree, toc: cachedToc };
  const raw = await readFile(TREE_PATH, 'utf8');
  cachedTree = JSON.parse(raw);
  cachedToc = buildToc(cachedTree);
  return { tree: cachedTree, toc: cachedToc };
}

const CANNED_OFF_TOPIC = "ha, that's not really why we're here — ask me about my work or projects instead.";
const CANNED_NO_CONTEXT = "honestly, I don't remember that one — email me at aikkara.pranav@gmail.com.";
const CANNED_LIMIT = "we've been talking a lot today — ping me at aikkara.pranav@gmail.com for the rest.";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  // ---- rate limit ----
  const today = todayYmd();
  const current = parseCookie(req.headers.cookie);
  const limit = nextCookieValue(current, today);
  if (!limit.allowed) {
    res.setHeader('Set-Cookie', limit.cookie);
    res.status(429).json({ type: 'limit', message: CANNED_LIMIT });
    return;
  }

  // ---- body ----
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
  const messages = rawMessages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-4);
  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    res.status(400).json({ error: 'messages must end with a user turn' });
    return;
  }
  const question = messages[messages.length - 1].content;

  // ---- open SSE stream ----
  res.writeHead(200, { ...sseHeaders(), 'Set-Cookie': limit.cookie });
  const send = obj => res.write(formatEvent(obj));

  try {
    send({ type: 'thinking' });
    const { tree, toc } = await loadTree();

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Call #1 — router
    const { node_ids, off_topic } = await selectNodes({ groq, toc, question });

    // Off-topic short-circuit
    if (off_topic) {
      send({ type: 'selected_nodes', nodes: [] });
      send({ type: 'token', text: CANNED_OFF_TOPIC });
      send({ type: 'done' });
      res.end();
      return;
    }

    const nodes = resolveNodes(tree, node_ids);
    send({
      type: 'selected_nodes',
      nodes: nodes.map(n => ({ id: n.id, path: n.path })),
    });

    // No-context short-circuit
    if (nodes.length === 0) {
      send({ type: 'token', text: CANNED_NO_CONTEXT });
      send({ type: 'done' });
      res.end();
      return;
    }

    // Call #2 — streaming answer
    send({ type: 'answering' });
    for await (const chunk of streamAnswer({
      groq,
      contextNodes: nodes,
      messages,
    })) {
      send({ type: 'token', text: chunk.text });
    }
    send({ type: 'done' });
    res.end();
  } catch (err) {
    console.error('chat error', err);
    send({ type: 'error', message: 'my brain is rate-limited right now — try again in a minute.' });
    res.end();
  }
}
