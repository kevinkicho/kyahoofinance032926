# Housekeep agent (Ollama API)

Deterministic collectors + Ollama analysis for panel health, test gaps, and regression hygiene.

- **API reference:** [ollama/ollama docs/api.md](https://github.com/ollama/ollama/blob/main/docs/api.md)
- **Cloud host + API keys:** [docs.ollama.com/cloud](https://docs.ollama.com/cloud)

The model **does not** replace Vitest. It ranks issues and can draft regression tests under `src/__tests__/regression/drafts/` for human review.

## Setup

### Cloud (recommended for large models)

1. Create an API key: [ollama.com/settings/keys](https://ollama.com/settings/keys)
2. Put it in **local** `.env` only (gitignored):

```bash
OLLAMA_API_KEY=your_key_here
OLLAMA_HOST=https://ollama.com
OLLAMA_MODEL=gpt-oss:120b
```

Cloud access uses the same REST shapes as local Ollama, with:

```http
POST https://ollama.com/api/chat
Authorization: Bearer $OLLAMA_API_KEY
Content-Type: application/json
```

### Local daemon (optional)

```bash
# no API key required
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2
```

## Commands

```bash
# Collectors only (no model call) + run health tests
npm run housekeep:dry

# Collectors + /api/chat analysis → reports/housekeep-report-*.md
npm run housekeep

# Always run test:health first
npm run housekeep:tests

# Write draft Vitest stubs for review
npm run housekeep -- --tests --write-drafts
```

## Endpoints we use

| Method | Path | Role |
|--------|------|------|
| `POST` | `/api/chat` | Housekeep analysis (`stream: false`) |
| `GET` | `/api/tags` | Optional model list (`scripts/lib/ollamaCloud.mjs`) |
| `POST` | `/api/generate` | Available helper; housekeep uses chat |

### Chat body (non-streaming)

Per [Generate a chat completion](https://github.com/ollama/ollama/blob/main/docs/api.md#generate-a-chat-completion):

```json
{
  "model": "gpt-oss:120b",
  "messages": [
    { "role": "system", "content": "…" },
    { "role": "user", "content": "… Respond using JSON …" }
  ],
  "stream": false,
  "format": { "type": "object", "properties": { "…": "JSON Schema" } },
  "options": { "temperature": 0.2, "seed": 42 },
  "keep_alive": "5m"
}
```

**Notes from the official API docs:**

- `format` may be `"json"` **or** a **JSON Schema** (structured outputs).
- When using JSON mode / structured outputs, **also instruct the model in the prompt** to respond with JSON.
- Non-streaming responses include `message.content` plus timing metrics (`total_duration`, `eval_count`, …) in **nanoseconds**.
- Streaming is available but housekeep disables it (`stream: false`) for simpler parsing.

### Example cURL (cloud)

```bash
curl https://ollama.com/api/chat \
  -H "Authorization: Bearer $OLLAMA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-oss:120b",
    "messages": [{ "role": "user", "content": "Reply with JSON: {\"ping\": true}" }],
    "stream": false,
    "format": "json"
  }'
```

## Client module

`scripts/lib/ollamaCloud.mjs` exposes:

| Export | Purpose |
|--------|---------|
| `ollamaChat` / `ollamaCloudChat` | `POST /api/chat` |
| `ollamaGenerate` | `POST /api/generate` |
| `ollamaListTags` | `GET /api/tags` |
| `buildChatBody` / `buildGenerateBody` | Pure body builders (unit-tested) |
| `parseModelJson` | Fence/prose-tolerant JSON parse |
| `HOUSEKEEP_FORMAT_SCHEMA` | Structured output schema for housekeep |

## Output

| Path | Content |
|------|---------|
| `reports/housekeep-collectors-*.json` | Raw collectors |
| `reports/housekeep-report-*.md` | Human summary |
| `reports/housekeep-report-*.json` | Full model JSON + metrics |
| `src/__tests__/regression/drafts/` | Optional drafts (gitignored) |

## Fit with hard gates

```text
npm run test:health     # hard gate
npm run housekeep:tests # soft advisor (needs key for cloud)
npm run preflight       # secrets + full vitest
```

Promote a draft only after review; move it out of `drafts/` into `src/__tests__/regression/`.
