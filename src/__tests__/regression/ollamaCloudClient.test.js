/**
 * Ollama API client helpers — pure, no network, no API key.
 * Spec: https://github.com/ollama/ollama/blob/main/docs/api.md
 */
import { describe, it, expect } from 'vitest';
import {
  parseModelJson,
  buildChatBody,
  buildGenerateBody,
  normalizeChatResponse,
  isCloudHost,
  HOUSEKEEP_FORMAT_SCHEMA,
} from '../../../scripts/lib/ollamaCloud.mjs';

describe('parseModelJson', () => {
  it('parses bare JSON', () => {
    expect(parseModelJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('strips markdown fences', () => {
    expect(parseModelJson('```json\n{"ok":true}\n```')).toEqual({ ok: true });
  });

  it('extracts object from surrounding prose', () => {
    expect(parseModelJson('Here you go:\n{"x":"y"}\nThanks')).toEqual({ x: 'y' });
  });
});

describe('buildChatBody (POST /api/chat)', () => {
  it('requires messages', () => {
    expect(() => buildChatBody({})).toThrow(/messages/);
  });

  it('sets stream false by default and includes model + messages', () => {
    const body = buildChatBody({
      model: 'llama3.2',
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(body).toMatchObject({
      model: 'llama3.2',
      stream: false,
      messages: [{ role: 'user', content: 'hi' }],
    });
  });

  it('supports format json and JSON schema (structured outputs)', () => {
    const jsonMode = buildChatBody({
      messages: [{ role: 'user', content: 'Respond using JSON' }],
      format: 'json',
    });
    expect(jsonMode.format).toBe('json');

    const schemaMode = buildChatBody({
      messages: [{ role: 'user', content: 'Respond using JSON' }],
      format: HOUSEKEEP_FORMAT_SCHEMA,
      temperature: 0.2,
      seed: 42,
      keep_alive: '5m',
    });
    expect(schemaMode.format).toEqual(HOUSEKEEP_FORMAT_SCHEMA);
    expect(schemaMode.options.temperature).toBe(0.2);
    expect(schemaMode.options.seed).toBe(42);
    expect(schemaMode.keep_alive).toBe('5m');
  });

  it('passes tools for tool-calling models', () => {
    const tools = [{ type: 'function', function: { name: 'ping', parameters: { type: 'object' } } }];
    const body = buildChatBody({
      messages: [{ role: 'user', content: 'ping' }],
      tools,
    });
    expect(body.tools).toEqual(tools);
  });
});

describe('buildGenerateBody (POST /api/generate)', () => {
  it('builds non-streaming generate payload', () => {
    const body = buildGenerateBody({
      model: 'llama3.2',
      prompt: 'Why is the sky blue? Respond using JSON',
      format: 'json',
      temperature: 0,
    });
    expect(body.stream).toBe(false);
    expect(body.prompt).toMatch(/sky/);
    expect(body.format).toBe('json');
    expect(body.options.temperature).toBe(0);
  });
});

describe('normalizeChatResponse', () => {
  it('reads message.content from non-streaming chat response', () => {
    const n = normalizeChatResponse({
      model: 'llama3.2',
      message: { role: 'assistant', content: '{"ok":true}' },
      done: true,
      total_duration: 1e9,
      eval_count: 10,
    });
    expect(n.content).toBe('{"ok":true}');
    expect(n.done).toBe(true);
    expect(n.metrics.eval_count).toBe(10);
  });
});

describe('isCloudHost', () => {
  it('detects ollama.com as cloud', () => {
    expect(isCloudHost('https://ollama.com')).toBe(true);
    expect(isCloudHost('https://ollama.com/')).toBe(true);
  });

  it('detects local daemon as non-cloud', () => {
    expect(isCloudHost('http://127.0.0.1:11434')).toBe(false);
    expect(isCloudHost('http://localhost:11434')).toBe(false);
  });
});
