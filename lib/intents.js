// What the router decided a message is, and the replies that need no model call.
export const INTENTS = new Set(['about_me', 'domain_concept', 'smalltalk', 'off_topic']);

const GREETING =
  "hey — I'm Pranav's AI twin. ask me about vectorless RAG, the voice agents I ship at FarmwiseAI, or the loan-officer model I fine-tuned.";
const THANKS =
  "anytime — if there's something else about my work you want to dig into, ask away.";
const OFF_TOPIC =
  "ha, that's not really why we're here — ask me about my work or projects instead.";

// Returns the fixed reply for intents that don't need the answerer, else null.
export function cannedReply(intent, text = '') {
  if (intent === 'smalltalk') return /thank|cheers|helpful/i.test(text) ? THANKS : GREETING;
  if (intent === 'off_topic') return OFF_TOPIC;
  return null;
}
