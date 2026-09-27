import { resolveModel, completionExtras } from './llm.js';
import { INTENTS } from './intents.js';

export const ROUTER_MODEL = resolveModel();
export const MAX_NODES = 3;

const SYSTEM = `You are a retrieval router for a portfolio chatbot.

You are given:
1. A hierarchical table-of-contents over a knowledge base about a person named Pranav P. Each entry has an id, a title, and often a summary.
2. A user question.

Your job: classify the message and pick the 1-3 most relevant node ids.

Output STRICT JSON with this exact shape and NOTHING else:
{ "node_ids": ["id1","id2"], "intent": "about_me" }

intent is one of:
- "about_me": about Pranav, his work, projects, skills, background, or how he thinks. Pick 1-3 nodes.
- "domain_concept": a question about a concept from his field (RAG, agents, vector search, fine-tuning, voice agents, LLM evaluation) that isn't directly about him. Pick 1-3 nodes where his work touches that concept.
- "smalltalk": greetings, thanks, "how are you", "who are you" with no real question. node_ids = [].
- "off_topic": unrelated to Pranav or his field (capital cities, weather, recipes, homework). node_ids = [].

Rules:
- Open-ended questions about him ("best project", "tell me about yourself") are about_me: pick 2-3 representative nodes that showcase his most impressive work.
- Prefer the most specific leaf-level nodes that directly answer the question.
- Never invent node ids that are not in the ToC.`;

// Pull the first {...} block out of a reply; small models sometimes add prose around the JSON.
export function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function selectNodes({ groq, toc, question, model = ROUTER_MODEL }) {
  const tocText = toc
    .map(n => `- ${n.id} :: ${n.title}${n.summary ? ' — ' + n.summary : ''}`)
    .join('\n');
  const userMsg = `TOC:\n${tocText}\n\nQUESTION: ${question}`;

  const resp = await groq.chat.completions.create({
    model,
    ...completionExtras(),
    temperature: 0,
    max_tokens: 256,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: userMsg },
    ],
  });

  const raw = resp.choices?.[0]?.message?.content ?? '';
  const parsed = extractJson(raw);
  if (!parsed) return { node_ids: [], off_topic: false };
  const known = new Set(toc.map(n => n.id));
  const node_ids = Array.isArray(parsed.node_ids)
    ? parsed.node_ids.filter(id => typeof id === 'string' && known.has(id)).slice(0, MAX_NODES)
    : [];
  const intent = INTENTS.has(parsed.intent) ? parsed.intent : 'about_me';
  return { node_ids, intent, off_topic: intent === 'off_topic' };
}
