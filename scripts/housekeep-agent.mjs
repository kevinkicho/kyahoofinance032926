#!/usr/bin/env node
/**
 * AI housekeeping agent (Ollama Cloud) for panel health + test resilience.
 *
 * Deterministic collectors run first (always). Ollama Cloud only *analyzes*
 * and proposes next actions / draft regression tests — it does not push code
 * or commit secrets.
 *
 * Usage:
 *   npm run housekeep              # collect + cloud analysis → report
 *   npm run housekeep -- --dry     # collectors only (no cloud call)
 *   npm run housekeep -- --tests   # also run npm run test:health first
 *   npm run housekeep -- --write-drafts  # write draft test stubs under src/__tests__/regression/drafts/
 *
 * Env:
 *   OLLAMA_API_KEY   required for cloud analysis (https://ollama.com/settings/keys)
 *   OLLAMA_MODEL     optional, default gpt-oss:120b
 *   OLLAMA_HOST      optional, default https://ollama.com
 *
 * Docs:
 *   API  https://github.com/ollama/ollama/blob/main/docs/api.md
 *   Cloud https://docs.ollama.com/cloud
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, statSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ollamaChat,
  parseModelJson,
  DEFAULT_MODEL,
  getOllamaApiKey,
  isCloudHost,
  OLLAMA_HOST,
  HOUSEKEEP_FORMAT_SCHEMA,
} from './lib/ollamaCloud.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWin = process.platform === 'win32';
const npm = isWin ? 'npm.cmd' : 'npm';

const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry') || args.has('--dry-run');
const RUN_TESTS = args.has('--tests') || args.has('--with-tests');
const WRITE_DRAFTS = args.has('--write-drafts');

function runCapture(command, argv, opts = {}) {
  const r = spawnSync(command, argv, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: isWin,
    env: process.env,
    maxBuffer: 12 * 1024 * 1024,
    ...opts,
  });
  return {
    status: r.status ?? 1,
    stdout: r.stdout || '',
    stderr: r.stderr || '',
  };
}

function readJsonSafe(p) {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

/** Static catalog drift without spinning Vite. */
function collectCatalogDrift() {
  const marketPanelsPath = path.join(ROOT, 'src/data/marketPanels.js');
  const registryPath = path.join(ROOT, 'src/panels/registry.js');
  const placeholdersPath = path.join(ROOT, 'src/data/panelPlaceholders.js');
  const mp = readFileSync(marketPanelsPath, 'utf8');
  const byM = {};
  let cur = null;
  for (const line of mp.split('\n')) {
    const mh = line.match(/^  ([a-zA-Z0-9_]+): \[/);
    if (mh) cur = mh[1];
    const id = line.match(/id: '([^']+)'/);
    if (id && cur) {
      byM[cur] = byM[cur] || [];
      byM[cur].push(id[1]);
    }
  }
  const missingFiles = [];
  for (const [marketId, ids] of Object.entries(byM)) {
    for (const panelId of ids) {
      const candidates = [
        path.join(ROOT, 'src/panels', marketId, `${panelId}.jsx`),
        path.join(ROOT, 'src/panels', marketId, `${panelId}.js`),
      ];
      // known aliases
      if (marketId === 'bonds' && panelId === 'ecb-yields') {
        candidates.push(path.join(ROOT, 'src/panels/bonds/ecbYields.jsx'));
      }
      if (marketId === 'bonds' && panelId === 'global-rates') {
        candidates.push(path.join(ROOT, 'src/panels/bonds/globalRates.jsx'));
      }
      if (marketId === 'bonds' && panelId === 'realYield') {
        candidates.push(path.join(ROOT, 'src/panels/bonds/realYield.jsx'));
      }
      if (!candidates.some((c) => existsSync(c))) {
        missingFiles.push(`${marketId}:${panelId}`);
      }
    }
  }

  const ph = readFileSync(placeholdersPath, 'utf8');
  const noPlaceholder = [];
  for (const [marketId, ids] of Object.entries(byM)) {
    for (const panelId of ids) {
      const key = `${marketId}:${panelId}`;
      if (!ph.includes(`'${key}'`) && !ph.includes(`"${key}"`)) {
        noPlaceholder.push(key);
      }
    }
  }

  const totalPanels = Object.values(byM).reduce((n, a) => n + a.length, 0);
  return {
    totalMarkets: Object.keys(byM).length,
    totalPanels,
    missingPanelFiles: missingFiles.slice(0, 40),
    missingPanelFilesCount: missingFiles.length,
    panelsWithoutPlaceholders: noPlaceholder.length,
    sampleNoPlaceholder: noPlaceholder.slice(0, 30),
    registryExists: existsSync(registryPath),
  };
}

/** Scan market dashboards for early-return-before-hooks risk (Bls pattern). */
function collectHooksRisk() {
  const marketsRoot = path.join(ROOT, 'src/markets');
  const risks = [];
  function walk(dir) {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const p = path.join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (/\.(jsx|js)$/.test(name) && /Dashboard|Market\.jsx$/.test(name)) {
        const src = readFileSync(p, 'utf8');
        // Conditional early return that references loading/empty, then a later hook
        if (/if\s*\([^)]*(?:!isLive|!hasData|!centralData|length\s*===\s*0)[^)]*\)\s*\{?\s*return/.test(src)
          && /useMemo\s*\(|useState\s*\(/.test(src)) {
          // only flag if a return appears before the last useMemo in file (rough)
          const firstReturn = src.search(/if\s*\([^)]*(?:!isLive|!hasData)[^)]*\)[\s\S]{0,120}?return\s*\(/);
          const lastMemo = src.lastIndexOf('useMemo(');
          if (firstReturn >= 0 && lastMemo > firstReturn) {
            risks.push(path.relative(ROOT, p).replace(/\\/g, '/'));
          }
        }
      }
    }
  }
  walk(marketsRoot);
  return { candidateFiles: risks.slice(0, 25), count: risks.length };
}

function collectFailureClassesFromVitest(stdout, stderr) {
  const text = `${stdout}\n${stderr}`;
  const failedFiles = [...text.matchAll(/FAIL\s+([^\s]+)/g)].map((m) => m[1]);
  const assertions = [...text.matchAll(/AssertionError:([^\n]+)/g)].map((m) => m[1].trim());
  const timeouts = [...text.matchAll(/Test timed out[^\n]*/g)].map((m) => m[0]);
  return {
    failedFiles: [...new Set(failedFiles)].slice(0, 40),
    assertionSamples: assertions.slice(0, 20),
    timeouts: timeouts.slice(0, 10),
    summaryLine: (text.match(/Tests\s+\d+[^\n]*/)?.[0]) || null,
  };
}

function buildSystemPrompt() {
  return `You are the housekeeping agent for kyahoofinance032926, a multi-market financial React hub.

Your job: given DETERministic collector output (tests, catalog drift, hooks risk), produce a prioritized housekeeping plan to prevent regressions we have already hit:

1. DataProvider wave mutex / isLoading stuck forever
2. Bento layout keys (.0:$kpi) → empty panel shells
3. Panel catalog drift (MARKET_PANELS vs src/panels registry)
4. Splash health false reds (date axes, letter ratings, fill rate)
5. Hooks after early return (hub crash)
6. Server killed by ECONNRESET / Census HTML-as-JSON
7. Yahoo quote chunk validation wiping equities

Rules:
- Prefer adding/adjusting Vitest under src/__tests__/regression/ and server/__tests__/
- Never invent API keys or print secrets
- Do not claim live FRED/IMF outages are unit-test failures
- Output STRICT JSON only (no markdown) matching the schema provided
- Keep draft test code small and runnable; mark environment-dependent cases skippable`;
}

function buildUserPayload(collectors) {
  return {
    schema: {
      summary: 'string',
      severity: 'critical|high|medium|low',
      topIssues: [{ id: 'string', symptom: 'string', likelyCause: 'string', testGap: 'string', action: 'string' }],
      recommendedCommands: ['string'],
      draftTests: [{
        file: 'src/__tests__/regression/drafts/....test.js',
        title: 'string',
        rationale: 'string',
        code: 'string // full vitest file content',
      }],
      doNotAutomate: ['string'],
    },
    collectors,
    existingHealthSuite: [
      'npm run test:health',
      'src/__tests__/regression/*',
      'docs/TEST_HEALTH_SUITE.md',
    ],
    instruction: 'Fill schema. Max 5 draftTests. Prefer strengthening collectors over vague e2e.',
  };
}

async function main() {
  console.log('🏠 Housekeep agent (Ollama API)');
  console.log(`   host=${OLLAMA_HOST}  cloud=${isCloudHost()}  model=${DEFAULT_MODEL}`);
  console.log(`   dry=${DRY}  tests=${RUN_TESTS}`);

  const collectors = {
    collectedAt: new Date().toISOString(),
    catalog: collectCatalogDrift(),
    hooksRisk: collectHooksRisk(),
    vitestHealth: null,
  };

  if (RUN_TESTS) {
    console.log('\n▶ Running npm run test:health …');
    const r = runCapture(npm, ['run', 'test:health']);
    collectors.vitestHealth = {
      status: r.status,
      ...collectFailureClassesFromVitest(r.stdout, r.stderr),
      // Cap logs so we never send huge dumps (or accidental secrets) to the cloud.
      logTail: `${r.stdout}\n${r.stderr}`.slice(-6000),
    };
    console.log(r.status === 0 ? '  test:health OK' : '  test:health FAILED (see analysis)');
  } else {
    console.log('  (skip vitest — pass --tests to include)');
  }

  const outDir = path.join(ROOT, 'reports');
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const collectorsPath = path.join(outDir, `housekeep-collectors-${stamp}.json`);
  writeFileSync(collectorsPath, JSON.stringify(collectors, null, 2));
  console.log(`\n📦 Collectors → ${path.relative(ROOT, collectorsPath)}`);

  if (DRY) {
    console.log('\n--dry: skipping Ollama Cloud. Review collectors JSON and re-run without --dry.');
    process.exit(collectors.vitestHealth?.status ? collectors.vitestHealth.status : 0);
  }

  if (!getOllamaApiKey()) {
    console.error('\n❌ OLLAMA_API_KEY not set. Add it to .env (https://ollama.com/settings/keys).');
    console.error('   Collectors still wrote; re-run after setting the key.');
    process.exit(2);
  }

  console.log('\n▶ Asking Ollama (/api/chat) for housekeeping plan…');
  // Official API: format may be "json" OR a JSON Schema (structured outputs).
  // We use a schema so the model is constrained; still instruct JSON in the prompt
  // (api.md: important for reliable structured replies).
  let analysis;
  try {
    const chat = await ollamaChat({
      model: DEFAULT_MODEL,
      format: HOUSEKEEP_FORMAT_SCHEMA,
      temperature: 0.2,
      seed: 42,
      keep_alive: '5m',
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        {
          role: 'user',
          content:
            `${JSON.stringify(buildUserPayload(collectors))}\n\n`
            + 'Respond using JSON that matches the schema (severity, topIssues, recommendedCommands, draftTests, doNotAutomate).',
        },
      ],
    });
    analysis = parseModelJson(chat.content);
    analysis._meta = {
      model: chat.model || DEFAULT_MODEL,
      host: OLLAMA_HOST,
      analyzedAt: new Date().toISOString(),
      metrics: chat.metrics,
    };
  } catch (e) {
    console.error('Ollama analysis failed:', e.message);
    process.exit(3);
  }

  const reportPath = path.join(outDir, `housekeep-report-${stamp}.json`);
  writeFileSync(reportPath, JSON.stringify(analysis, null, 2));
  // Human-readable markdown summary
  const md = [
    `# Housekeep report`,
    ``,
    `- When: ${analysis._meta?.analyzedAt}`,
    `- Model: ${analysis._meta?.model}`,
    `- Severity: **${analysis.severity || 'n/a'}**`,
    ``,
    `## Summary`,
    ``,
    analysis.summary || '_no summary_',
    ``,
    `## Top issues`,
    ``,
    ...(analysis.topIssues || []).map((i, n) =>
      `### ${n + 1}. ${i.id || i.symptom}\n- Symptom: ${i.symptom}\n- Cause: ${i.likelyCause}\n- Test gap: ${i.testGap}\n- Action: ${i.action}\n`),
    `## Recommended commands`,
    ``,
    ...((analysis.recommendedCommands || []).map((c) => `- \`${c}\``)),
    ``,
    `## Do not automate`,
    ``,
    ...((analysis.doNotAutomate || []).map((c) => `- ${c}`)),
    ``,
    `_Collectors: \`${path.relative(ROOT, collectorsPath)}\`_`,
  ].join('\n');
  const mdPath = path.join(outDir, `housekeep-report-${stamp}.md`);
  writeFileSync(mdPath, md);
  console.log(`📝 Report → ${path.relative(ROOT, mdPath)}`);

  if (WRITE_DRAFTS && Array.isArray(analysis.draftTests)) {
    const draftDir = path.join(ROOT, 'src/__tests__/regression/drafts');
    mkdirSync(draftDir, { recursive: true });
    let n = 0;
    for (const d of analysis.draftTests) {
      if (!d?.code || !d?.file) continue;
      // Only allow drafts under regression/drafts
      const base = path.basename(d.file).replace(/[^\w.-]+/g, '_');
      if (!base.endsWith('.js') && !base.endsWith('.jsx') && !base.endsWith('.mjs')) continue;
      const dest = path.join(draftDir, base.startsWith('draft-') ? base : `draft-${base}`);
      writeFileSync(dest, `// AUTO-DRAFT from housekeep-agent — review before promoting.\n// ${d.title || ''}\n// ${d.rationale || ''}\n\n${d.code}\n`);
      console.log(`  draft → ${path.relative(ROOT, dest)}`);
      n += 1;
    }
    console.log(`✏️  Wrote ${n} draft test file(s) under src/__tests__/regression/drafts/`);
  }

  console.log('\n✅ Housekeep complete.');
  if (analysis.severity === 'critical' || (collectors.vitestHealth && collectors.vitestHealth.status !== 0)) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
