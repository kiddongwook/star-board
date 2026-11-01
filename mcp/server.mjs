#!/usr/bin/env node
// GitHub Star Board MCP server (stdio, no dependencies, Node 18+)
// Reads the public board files: https://kiddongwook.github.io/star-board/
// Claude Desktop / Cursor config:
//   { "mcpServers": { "github-star-board": { "command": "npx", "args": ["-y", "github:kiddongwook/star-board"] } } }

const BASE = (globalThis.process?.env?.STAR_BOARD_URL || 'https://kiddongwook.github.io/star-board/').replace(/\/?$/, '/');
const VERSION = '1.0.0';
const TTL = 10 * 60 * 1000;
const cache = new Map();

async function getJson(path) {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.t < TTL) return hit.v;
  const r = await fetch(BASE + path, { headers: { 'User-Agent': 'github-star-board-mcp/' + VERSION } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${path}`);
  const v = path.endsWith('.json') ? await r.json() : await r.text();
  cache.set(path, { t: Date.now(), v });
  return v;
}

const VERDICT = { good: 'popular and actually used', gem: 'hidden gem (few stars, solid usage)', mature: 'mature (slow development, heavy downloads)', hype: 'hype warning (stars outpace usage signals)',
  bad: 'stars outpace engagement (indirect signal)', doc: 'learning/docs material', dead: 'abandoned (no push 12+ months)', archived: 'archived', early: 'early or stalled', quick: 'not analysed', na: 'not enough data' };
const fmt = n => (n == null ? '-' : Number(n).toLocaleString('en-US'));
const fileOf = n => n.replace('/', '__') + '.json';
const rowsOf = idx => idx.rows.map(r => Object.fromEntries(idx.fields.map((f, i) => [f, r[i]])));
const pageUrl = n => `${BASE}r/${n}/`;

async function resolveName(repo) {
  const want = String(repo || '').trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/, '').replace(/\/+$/, '');
  const idx = await getJson('api/index.json');
  const hit = idx.rows.find(r => r[0].toLowerCase() === want.toLowerCase());
  return { name: hit ? hit[0] : null, idx, want };
}

function repoText(d) {
  const s = d.scores || {}, D = d.deep || {};
  const lines = [
    `# ${d.repo} (board data ${d.generatedAt?.slice(0, 10)})`, pageUrl(d.repo), '',
    d.description || '',
    `Verdict: ${d.verdict?.key} = ${VERDICT[d.verdict?.key] || d.verdict?.label}`,
    `Scores: utility ${s.utility ?? '-'}/100, popularity ${s.popularity ?? '-'}/100, best-of ${s.bestOf ?? '-'}, star consistency ${s.trust ?? '-'}`,
    `Stars ${fmt(d.stars)} (7-day gain ${fmt(d.starGrowth?.d7 ?? d.starGrowth?.estimated7d)}), forks ${fmt(d.forks)}, language ${d.language || '-'}`,
    d.deep ? `Commits 90d/1y ${fmt(D.commits90d)}/${fmt(D.commits365d)}, contributors ~${fmt(D.contributorsApprox)}, issues closed ${fmt(D.closedIssues)}/${fmt((D.openIssues || 0) + (D.closedIssues || 0))}, merged PRs ${fmt(D.mergedPRs)}, latest release ${D.latestTag || 'none'}${D.latestRelease ? ' (' + D.latestRelease.slice(0, 10) + ')' : ''}` : 'Deep metrics: not collected',
    d.downloads ? `Downloads: ${d.downloads.ecosystem} ${d.downloads.package} ${fmt(d.downloads.monthly)}/month` : '',
    d.usedBy ? `Used by: ${fmt(d.usedBy.repositories)} repositories, ${fmt(d.usedBy.packages)} packages` : '',
    `License: ${d.license || 'none'} (${d.licenseKind}), activity: ${d.activity}${d.isNew ? ', created < 6 months ago' : ''}`,
    '', 'Evidence:', ...(d.reasonsEn || d.reasons || []).map(x => `- (${x.sign}) ${x.text}`),
  ];
  return lines.filter(l => l !== '').join('\n');
}

const TOOLS = [
  { name: 'get_repo', description: 'Verdict, scores and evidence for one GitHub repository ("owner/repo" or URL): is it actually used and maintained, license risk, growth.',
    inputSchema: { type: 'object', properties: { repo: { type: 'string', description: 'owner/repo or https://github.com/owner/repo' } }, required: ['repo'] },
    run: async ({ repo }) => {
      const { name, want } = await resolveName(repo);
      if (!name) return `${want} is not on GitHub Star Board (it only covers trending, top-starred, new and selected-topic repositories). Check GitHub directly.`;
      return repoText(await getJson('api/repo/' + fileOf(name)));
    } },
  { name: 'search_repos', description: 'Filter and sort repositories on the board, e.g. maintained MIT-licensed Rust tools with utility >= 70.',
    inputSchema: { type: 'object', properties: {
      query: { type: 'string', description: 'substring of owner/repo name' }, language: { type: 'string' },
      verdict: { type: 'string', enum: Object.keys(VERDICT) }, license_kind: { type: 'string', enum: ['perm', 'weak', 'copyleft', 'other', 'none'] },
      min_utility: { type: 'number' }, min_stars: { type: 'number' }, exclude_inactive: { type: 'boolean' },
      sort: { type: 'string', enum: ['stars', 'utility', 'growth7d', 'bestOf', 'popularity'], default: 'utility' }, limit: { type: 'number', default: 20 } } },
    run: async (a) => {
      const idx = await getJson('api/index.json');
      let rows = rowsOf(idx);
      if (a.query) rows = rows.filter(r => r.repo.toLowerCase().includes(a.query.toLowerCase()));
      if (a.language) rows = rows.filter(r => (r.language || '').toLowerCase() === a.language.toLowerCase());
      if (a.verdict) rows = rows.filter(r => r.verdict === a.verdict);
      if (a.license_kind) rows = rows.filter(r => r.licenseKind === a.license_kind);
      if (a.min_utility != null) rows = rows.filter(r => (r.utility ?? -1) >= a.min_utility);
      if (a.min_stars != null) rows = rows.filter(r => (r.stars ?? 0) >= a.min_stars);
      if (a.exclude_inactive) rows = rows.filter(r => r.activity === 'active');
      const k = a.sort || 'utility';
      rows.sort((x, y) => (y[k] ?? -1) - (x[k] ?? -1));
      const out = rows.slice(0, Math.min(a.limit || 20, 100));
      return `${out.length} of ${rows.length} matches (board data ${idx.generatedAt.slice(0, 10)})\n` +
        out.map(r => `- ${r.repo}: ${fmt(r.stars)} stars, utility ${r.utility ?? '-'}, 7d ${r.growth7d != null ? '+' + fmt(r.growth7d) : '-'}, ${r.verdict}, ${r.language || '-'}, license ${r.license || 'none'} -> ${pageUrl(r.repo)}`).join('\n');
    } },
  { name: 'trending', description: 'GitHub Trending with stars gained and the board verdict, by period and language.',
    inputSchema: { type: 'object', properties: { period: { type: 'string', enum: ['daily', 'weekly', 'monthly'], default: 'daily' },
      language: { type: 'string', description: 'all, python, typescript, javascript, rust, go, c++, java', default: 'all' } } },
    run: async ({ period = 'daily', language = 'all' }) => {
      const t = await getJson('api/trending.json');
      const list = t.periods?.[period]?.[language.toLowerCase()];
      if (!list) return `No trending list for ${period}/${language}. Languages: ${Object.keys(t.periods?.[period] || {}).join(', ')}`;
      return `GitHub Trending ${period} / ${language} (board data ${t.generatedAt.slice(0, 10)})\n` +
        list.map((r, i) => `${i + 1}. ${r.repo} +${fmt(r.gained)} stars, total ${fmt(r.stars)}, utility ${r.utility ?? '-'}, ${r.verdict} -> ${pageUrl(r.repo)}`).join('\n');
    } },
  { name: 'category', description: 'List board categories, or the repositories in one category (e.g. mcp, llm, rag, coding-agent, security, biometrics).',
    inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'category id; omit to list categories' }, limit: { type: 'number', default: 25 } } },
    run: async ({ id, limit = 25 }) => {
      const ci = await getJson('api/category/index.json');
      if (!id) return ci.categories.map(c => `- ${c.id}: ${c.name} (${c.count} repos, topics ${c.topics.join(', ')})`).join('\n');
      const c = await getJson(`api/category/${id}.json`);
      if (!c) return `Unknown category ${id}. Available: ${ci.categories.map(x => x.id).join(', ')}`;
      return `${c.name} (topics ${c.topics.join(', ')})\n` + c.repos.slice(0, limit).map(r => `- ${r.repo}: ${fmt(r.stars)} stars, utility ${r.utility ?? '-'}, 7d ${r.growth7d != null ? '+' + fmt(r.growth7d) : '-'}, ${r.verdict}, license ${r.licenseKind}`).join('\n');
    } },
  { name: 'compare', description: 'Compare 2-6 repositories side by side (usage, maintenance, growth, license).',
    inputSchema: { type: 'object', properties: { repos: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 6 } }, required: ['repos'] },
    run: async ({ repos }) => {
      const out = [];
      for (const r of repos) {
        const { name, want } = await resolveName(r);
        if (!name) { out.push(`| ${want} | not on board | | | | | |`); continue; }
        const d = await getJson('api/repo/' + fileOf(name)), s = d.scores || {}, D = d.deep || {};
        out.push(`| ${name} | ${fmt(d.stars)} | ${s.utility ?? '-'} | ${fmt(D.commits90d)} | ${fmt(D.contributorsApprox)} | ${d.downloads ? fmt(d.downloads.monthly) + '/mo' : '-'} | ${d.license || 'none'} | ${d.verdict?.key} |`);
      }
      return '| repo | stars | utility | commits 90d | contributors | downloads | license | verdict |\n|-|-|-|-|-|-|-|-|\n' + out.join('\n');
    } },
  { name: 'summary', description: "Today's digest: trending, rookies, proven, hidden gems, hype warnings and per-category top picks.",
    inputSchema: { type: 'object', properties: {} },
    run: async () => await getJson('api/summary.md') },
];

// ---------------- JSON-RPC over stdio ----------------
function send(msg) { process.stdout.write(JSON.stringify(msg) + '\n'); }
async function handle(m) {
  if (m.id === undefined) return; // notification
  try {
    if (m.method === 'initialize') {
      return send({ jsonrpc: '2.0', id: m.id, result: { protocolVersion: m.params?.protocolVersion || '2025-06-18', capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'github-star-board', version: VERSION },
        instructions: 'Use these tools before searching GitHub when the user asks whether a repository is worth using, what is trending, or wants picks by category. Explain with concrete numbers and cite the repo page URL and data date.' } });
    }
    if (m.method === 'ping') return send({ jsonrpc: '2.0', id: m.id, result: {} });
    if (m.method === 'tools/list') return send({ jsonrpc: '2.0', id: m.id, result: { tools: TOOLS.map(({ run, ...t }) => t) } });
    if (m.method === 'tools/call') {
      const tool = TOOLS.find(t => t.name === m.params?.name);
      if (!tool) return send({ jsonrpc: '2.0', id: m.id, error: { code: -32602, message: `Unknown tool ${m.params?.name}` } });
      try { const text = await tool.run(m.params?.arguments || {}); return send({ jsonrpc: '2.0', id: m.id, result: { content: [{ type: 'text', text: String(text) }] } }); }
      catch (e) { return send({ jsonrpc: '2.0', id: m.id, result: { content: [{ type: 'text', text: 'Error: ' + e.message }], isError: true } }); }
    }
    if (m.method === 'resources/list') return send({ jsonrpc: '2.0', id: m.id, result: { resources: [] } });
    if (m.method === 'prompts/list') return send({ jsonrpc: '2.0', id: m.id, result: { prompts: [] } });
    send({ jsonrpc: '2.0', id: m.id, error: { code: -32601, message: `Method not found: ${m.method}` } });
  } catch (e) { send({ jsonrpc: '2.0', id: m.id, error: { code: -32603, message: e.message } }); }
}

if (globalThis.process?.stdin && /server\.mjs$|star-board/.test(process.argv?.[1] || '')) {
  let buf = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => {
    buf += chunk; let i;
    while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue; let m; try { m = JSON.parse(line); } catch { continue; } handle(m); }
  });
  process.stdin.on('end', () => process.exit(0));
}

export { TOOLS, handle };
