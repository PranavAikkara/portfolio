// Manual check of a model against the real knowledge base, no server needed.
//   node --env-file=.env scripts/try-model.mjs meta/llama-3.1-8b-instruct
import { readFile } from 'node:fs/promises';
import { createClient } from '../lib/llm.js';
import { buildToc, resolveNodes } from '../lib/tree.js';
import { selectNodes } from '../lib/router.js';
import { streamAnswer } from '../lib/answerer.js';

const model = process.argv[2];
if (!model) { console.error('usage: node --env-file=.env scripts/try-model.mjs <model>'); process.exit(1); }
const questions = process.argv.slice(3).length ? process.argv.slice(3) : [
  'What is vectorless RAG and why use it?',
  "what's your current role?",
  'capital of france?',
  'tell me about yourself',
];

const tree = JSON.parse(await readFile(new URL('../tree.json', import.meta.url), 'utf8'));
const toc = buildToc(tree);
const groq = createClient();

console.log(`model: ${model}`);
for (const question of questions) {
  const t0 = Date.now();
  let routed;
  try {
    routed = await selectNodes({ groq, toc, question, model });
  } catch (err) {
    console.log(`\nQ: ${question}\n  router error: ${err.status ?? ''} ${err.message}`); continue;
  }
  const t1 = Date.now();
  const nodes = resolveNodes(tree, routed.node_ids);
  let answer = '';
  if (!routed.off_topic && routed.intent !== 'smalltalk') {
    try {
      for await (const c of streamAnswer({ groq, contextNodes: nodes, messages: [{ role: 'user', content: question }], model })) answer += c.text;
    } catch (err) { answer = `answer error: ${err.status ?? ''} ${err.message}`; }
  }
  const t2 = Date.now();
  console.log(`\nQ: ${question}`);
  console.log(`  intent: ${routed.intent}  routed: ${routed.node_ids.join(', ') || '(none)'}  [router ${t1 - t0} ms, answer ${t2 - t1} ms]`);
  if (answer) console.log(`  A: ${answer.replace(/\s+/g, ' ').slice(0, 400)}`);
}
