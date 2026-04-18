// Hits a running vercel dev instance and prints every SSE event. Manual smoke.
const url = process.argv[2] || 'http://localhost:3000/api/chat';
const question = process.argv[3] || 'what did you ship at FarmwiseAI?';

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages: [{ role: 'user', content: question }] }),
});
console.log('status:', res.status);
if (!res.body) { console.log(await res.text()); process.exit(0); }

const reader = res.body.getReader();
const decoder = new TextDecoder();
let buf = '';
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  buf += decoder.decode(value, { stream: true });
  const parts = buf.split('\n\n');
  buf = parts.pop();
  for (const p of parts) {
    if (p.startsWith('data: ')) console.log(p.slice(6));
  }
}
