// One OpenAI-compatible client for whichever provider LLM_BASE_URL points at.
// Default is NVIDIA's free hosted endpoints (build.nvidia.com).
import OpenAI from 'openai';

export const DEFAULT_BASE_URL = 'https://integrate.api.nvidia.com/v1';
export const DEFAULT_MODEL = 'openai/gpt-oss-20b';

export function createClient(env = process.env) {
  const apiKey = env.NVIDIA_API_KEY || env.LLM_API_KEY;
  if (!apiKey) throw new Error('NVIDIA_API_KEY is not set');
  return new OpenAI({ apiKey, baseURL: env.LLM_BASE_URL || DEFAULT_BASE_URL });
}

export function resolveModel(env = process.env) {
  return env.LLM_MODEL || DEFAULT_MODEL;
}

// Extra request fields. gpt-oss models think before answering; "low" keeps
// that to a second or two. Set LLM_REASONING_EFFORT="" for models that
// reject the field.
export function completionExtras(env = process.env) {
  const effort = env.LLM_REASONING_EFFORT === undefined ? 'low' : env.LLM_REASONING_EFFORT;
  return effort ? { reasoning_effort: effort } : {};
}

// The message a visitor sees when a model call fails. 429 is the only
// error worth explaining differently; everything else is "my side".
export function errorMessage(err) {
  if (err && err.status === 429) {
    return "I'm getting a lot of questions right now — try again in a minute.";
  }
  return 'something broke on my side — email me at aikkara.pranav@gmail.com.';
}
