export const ROUTER_MODEL = 'llama-3.3-70b-versatile';
export const MAX_NODES = 3;

const SYSTEM = `You are a retrieval router for a portfolio chatbot.

You are given:
1. A hierarchical table-of-contents over a knowledge base about a person named Pranav P. Each entry has an id, a title, and often a summary.
2. A user question.

Your job: pick the 1-3 most relevant node ids that would help answer the question, OR decide the question is off-topic (not about Pranav, his work, or his projects).

Output STRICT JSON with this exact shape and NOTHING else:
{ "node_ids": ["id1","id2"], "off_topic": false }

Rules:
- If the question is not about Pranav or his work (e.g. general knowledge, capital cities, weather), return { "node_ids": [], "off_topic": true }.
- If the question IS about Pranav but is open-ended ("best project", "tell me about yourself", "what do you do", "what's interesting about you"), pick 2-3 representative nodes that showcase his most impressive work — don't return empty.
- Prefer the most specific leaf-level nodes that directly answer the question.
- Never invent node ids that are not in the ToC.
- Return empty node_ids ONLY if the question is clearly off-topic (in which case also set off_topic=true).`;

export async function selectNodes({ groq, toc, question }) {
  const tocText = toc
    .map(n => `- ${n.id} :: ${n.title}${n.summary ? ' — ' + n.summary : ''}`)
    .join('\n');
  const userMsg = `TOC:\n${tocText}\n\nQUESTION: ${question}`;

  const resp = await groq.chat.completions.create({
    model: ROUTER_MODEL,
    temperature: 0,
    response_format: { type: 'json_object' },
    max_tokens: 256,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: userMsg },
    ],
  });

  const raw = resp.choices?.[0]?.message?.content ?? '';
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { node_ids: [], off_topic: false };
  }
  const known = new Set(toc.map(n => n.id));
  const node_ids = Array.isArray(parsed.node_ids)
    ? parsed.node_ids.filter(id => typeof id === 'string' && known.has(id)).slice(0, MAX_NODES)
    : [];
  const off_topic = parsed.off_topic === true;
  return { node_ids, off_topic };
}
