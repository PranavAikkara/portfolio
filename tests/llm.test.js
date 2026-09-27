import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient, resolveModel, errorMessage, completionExtras, DEFAULT_BASE_URL, DEFAULT_MODEL } from '../lib/llm.js';

test('createClient: points at the NVIDIA endpoint by default and exposes chat.completions.create', () => {
  const client = createClient({ NVIDIA_API_KEY: 'test-key' });
  assert.equal(client.baseURL, DEFAULT_BASE_URL);
  assert.equal(DEFAULT_BASE_URL, 'https://integrate.api.nvidia.com/v1');
  assert.equal(typeof client.chat.completions.create, 'function');
});

test('createClient: LLM_BASE_URL overrides the endpoint', () => {
  const client = createClient({ NVIDIA_API_KEY: 'k', LLM_BASE_URL: 'https://api.groq.com/openai/v1' });
  assert.equal(client.baseURL, 'https://api.groq.com/openai/v1');
});

test('createClient: throws a clear error when no key is set', () => {
  assert.throws(() => createClient({}), /NVIDIA_API_KEY/);
});

test('resolveModel: defaults to gpt-oss-20b and honours LLM_MODEL', () => {
  assert.equal(resolveModel({}), DEFAULT_MODEL);
  assert.equal(DEFAULT_MODEL, 'openai/gpt-oss-20b');
  assert.equal(resolveModel({ LLM_MODEL: 'openai/gpt-oss-20b' }), 'openai/gpt-oss-20b');
});

test('errorMessage: 429 says busy, anything else says broken', () => {
  assert.match(errorMessage({ status: 429 }), /try again in a minute/);
  assert.match(errorMessage({ status: 500 }), /something broke/);
  assert.match(errorMessage(new Error('boom')), /something broke/);
});

test('completionExtras: asks for low reasoning effort by default, nothing when disabled', () => {
  assert.deepEqual(completionExtras({}), { reasoning_effort: 'low' });
  assert.deepEqual(completionExtras({ LLM_REASONING_EFFORT: 'medium' }), { reasoning_effort: 'medium' });
  assert.deepEqual(completionExtras({ LLM_REASONING_EFFORT: '' }), {});
});
