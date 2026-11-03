#!/usr/bin/env node
// GitHub Star Board MCP server (stdio, no dependencies, Node 18+)
// Reads the public board files: https://kiddongwook.github.io/star-board/
// Claude Desktop / Cursor config:
//   { "mcpServers": { "github-star-board": { "command": "npx", "args": ["-y", "github:kiddongwook/star-board"] } } }

const BASE = (globalThis.process?.env?.STAR_BOARD_URL || 'https://kiddongwook.github.io/star-board/').replace(/\/?$/, '/');
const VERSION = '1.1.0';
const MCP_INDEX_URL = globalThis.process?.env?.STAR_BOARD_MCP_INDEX || 'https://github.com/kiddongwook/star-board/releases/download/mcp-index/mcp-index.json.gz';
const MCP_TTL = 6 * 60 * 60 * 1000;
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

// ---------------- MCP index (official registry, checked against GitHub) ----------------
let mcpMem = null;
async function loadMcpIndex() {
  if (mcpMem && Date.now() - mcpMem.t < MCP_TTL) return mcpMem.v;
  const zlib = await import('node:zlib'), fs = await import('node:fs/promises'), os = await import('node:os'), path = await import('node:path');
  const file = path.join(os.tmpdir(), 'star-board-mcp-index.json.gz');
  let buf = null;
  try { const st = await fs.stat(file); if (Date.now() - st.mtimeMs < MCP_TTL) buf = await fs.readFile(file); } catch {}
  if (!buf) {
    try {
      const r = await fetch(MCP_INDEX_URL, { headers: { 'User-Agent': 'github-star-board-mcp/' + VERSION } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      buf = Buffer.from(await r.arrayBuffer()); await fs.writeFile(file, buf).catch(() => {});
    } catch (e) {
      try { buf = await fs.readFile(file); } catch {}
      if (!buf) { const top = await getJson('data/mcp/top.json'); if (!top) throw new Error('MCP index unavailable: ' + e.message); mcpMem = { t: Date.now(), v: top }; return top; }
    }
  }
  const v = JSON.parse(zlib.gunzipSync(buf).toString('utf8'));
  mcpMem = { t: Date.now(), v }; return v;
}

const STOP = new Set('a an the and or for to of in on with my me i we our your you that this it is are be can could would should want need let make give help please server mcp tool tools agent ai use using via from into so do does how what which some any get'.split(' '));
const SYN = { browser: ['browser', 'chrome', 'chromium', 'playwright', 'puppeteer', 'headless'], web: ['web', 'website', 'webpage', 'browser', 'scrape', 'crawl', 'fetch'], scrape: ['scrape', 'scraping', 'scraper', 'crawl', 'crawler', 'extract'],
  pdf: ['pdf', 'document', 'documents'], database: ['database', 'db', 'sql', 'postgres', 'postgresql', 'mysql', 'sqlite', 'mongodb'], db: ['database', 'db', 'sql'], sql: ['sql', 'database', 'postgres', 'mysql', 'sqlite'],
  file: ['file', 'files', 'filesystem', 'folder', 'directory'], files: ['file', 'files', 'filesystem'], email: ['email', 'mail', 'gmail', 'imap', 'smtp', 'outlook'], mail: ['email', 'mail', 'gmail'],
  calendar: ['calendar', 'schedule', 'events'], search: ['search', 'web-search', 'google', 'bing', 'brave', 'duckduckgo'], memory: ['memory', 'remember', 'knowledge', 'notes'],
  image: ['image', 'images', 'picture', 'photo', 'vision'], video: ['video', 'youtube'], code: ['code', 'repository', 'github', 'git'], git: ['git', 'github', 'gitlab'], github: ['github', 'git'],
  slack: ['slack'], notion: ['notion'], jira: ['jira', 'atlassian'], figma: ['figma', 'design'], design: ['design', 'figma', 'ui'], map: ['map', 'maps', 'geo', 'location'], weather: ['weather', 'forecast'],
  stock: ['stock', 'stocks', 'finance', 'market', 'trading'], finance: ['finance', 'stock', 'payments', 'accounting'], translate: ['translate', 'translation', 'language'], docs: ['docs', 'documentation', 'library'] };
const words = s => String(s || '').toLowerCase().split(/[^a-z0-9.+#-]+/).filter(Boolean);
function terms(q) { return [...new Set(words(q).filter(w => w.length > 1 && !STOP.has(w)))].map(w => ({ w, alts: SYN[w] || SYN[w.replace(/s$/, '')] || [w.replace(/s$/, '') === w ? w : w.replace(/s$/, ''), w] })); }
function textScore(e, T) {
  if (!T.length) return 0;
  const F = [[3, words(e.n.split('/').pop() + ' ' + (e.ti || ''))], [2, (e.g?.tp || []).concat(e.pk.map(p => p.id)).flatMap(words)], [1, words(e.d)]];
  let hit = 0, got = 0;
  for (const t of T) { let best = 0; for (const [w, ws] of F) if (ws.some(x => t.alts.some(a => x === a || (a.length > 3 && x.startsWith(a))))) best = Math.max(best, w); if (best) got++; hit += best; }
  return got ? (hit / (3 * T.length)) * (0.5 + 0.5 * got / T.length) : 0;
}
const VMCP = { proven: 'proven: real usage and active maintenance', active: 'active: maintained, moderate usage', early: 'early: new, little track record yet', weak: 'weak: little evidence of real use', risky: 'risky: see flags' };
const FLAGS = { 'bulk-publisher': 'publisher has 50+ servers in the registry (bulk publishing)', 'no-repo': 'no source repository listed', 'repo-missing': 'listed GitHub repo not found (deleted or private)',
  archived: 'repository archived', deprecated: 'marked deprecated in the registry', stale: 'no push in 6+ months', fork: 'repository is a fork', new: 'repository created < 30 days ago', unchecked: 'GitHub not checked this week',
  'not-in-registry': 'not in the official MCP Registry (found on GitHub Star Board); follow its README for setup' };
function evidence(e) {
  const g = e.g, b = [];
  if (g) b.push(`${fmt(g.s)} stars`, g.h90 != null ? `${fmt(g.h90)} commits in 90 days` : null, g.p ? `last push ${g.p}` : null, (g.oi + g.ci) >= 5 ? `${Math.round(100 * g.ci / (g.oi + g.ci))}% issues closed` : null, g.lic ? `license ${g.lic}` : 'no license');
  if (e.dl) b.push(`${fmt(e.dl.m)} npm downloads/month`);
  return b.filter(Boolean).join(', ');
}
function howRun(e) {
  const p = e.pk[0], r = e.rm[0], parts = [];
  if (p) parts.push(`local ${p.t} ${p.id}${p.tr && p.tr !== 'stdio' ? ' (' + p.tr + ')' : ''}`);
  if (r) parts.push(`remote ${r.t} ${r.u}`);
  return parts.join(' | ') || 'no package or remote listed';
}
function needs(e) {
  const env = [...e.pk.flatMap(p => p.env), ...e.rm.flatMap(r => r.h)].filter(x => x.r || x.s);
  return env.length ? 'needs ' + [...new Set(env.map(x => x.n + (x.s ? ' (secret)' : '')))].join(', ') : 'no keys listed';
}
const repoLink = e => e.repo ? 'https://github.com/' + e.repo : (e.web || '');
function findEntry(idx, q) {
  const s = String(q || '').trim(), low = s.toLowerCase().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/+$/, '');
  const L = idx.servers;
  let hits = L.filter(e => e.n.toLowerCase() === low);
  if (!hits.length) hits = L.filter(e => e.repo && e.repo.toLowerCase() === low);
  if (!hits.length) hits = L.filter(e => e.pk.some(p => String(p.id).toLowerCase() === low));
  if (!hits.length && /^https?:/i.test(s)) hits = L.filter(e => e.rm.some(r => r.u.toLowerCase().startsWith(s.toLowerCase())));
  if (!hits.length) hits = L.filter(e => e.n.toLowerCase().endsWith('/' + low) || (e.ti || '').toLowerCase() === low);
  return hits.sort((a, b) => b.sc - a.sc);
}
const short = e => e.n.split('/').pop().replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 40) || 'server';

function buildConfig(e, client, prefer) {
  const p = e.pk.find(x => x.t === 'npm') || e.pk.find(x => x.t === 'pypi') || e.pk.find(x => x.t === 'oci') || e.pk[0];
  const r = e.rm[0];
  const useRemote = r && (prefer === 'remote' || !p || (p.tr && p.tr !== 'stdio'));
  const name = short(e), out = [];
  const envReq = p ? p.env.filter(x => x.r || x.s) : [];
  const envObj = Object.fromEntries(envReq.map(x => [x.n, '<' + x.n + '>']));
  if (useRemote) {
    const hdr = r.h.filter(x => x.r || x.s), hdrObj = Object.fromEntries(hdr.map(x => [x.n, '<' + x.n + '>']));
    const http = r.t === 'sse' ? 'sse' : 'http';
    if (client === 'claude-code') out.push('```bash', `claude mcp add --transport ${http} ${name} ${r.u}` + hdr.map(x => ` --header "${x.n}: <${x.n}>"`).join(''), '```');
    else if (client === 'vscode') out.push('`.vscode/mcp.json`', '```json', JSON.stringify({ servers: { [name]: { type: http, url: r.u, ...(hdr.length ? { headers: hdrObj } : {}) } } }, null, 2), '```');
    else if (client === 'claude-desktop') out.push('`claude_desktop_config.json` (remote servers go through the mcp-remote bridge)', '```json', JSON.stringify({ mcpServers: { [name]: { command: 'npx', args: ['-y', 'mcp-remote', r.u, ...hdr.flatMap(x => ['--header', `${x.n}: <${x.n}>`])] } } }, null, 2), '```');
    else out.push(client === 'cursor' ? '`~/.cursor/mcp.json`' : client === 'windsurf' ? '`~/.codeium/windsurf/mcp_config.json`' : 'MCP client config', '```json', JSON.stringify({ mcpServers: { [name]: { url: r.u, ...(hdr.length ? { headers: hdrObj } : {}) } } }, null, 2), '```');
    return { name, kind: 'remote ' + r.t, text: out.join('\n'), secrets: hdr };
  }
  if (!p) return { name, kind: 'none', text: 'This server lists no package or remote endpoint in the registry. Check its repository README: ' + repoLink(e), secrets: [] };
  if (e.src === 'board') out.push('Not in the official MCP Registry: the package below is the one its repository publishes (from GitHub Star Board). Check the README for required arguments or keys: ' + repoLink(e));
  let cmd, args;
  if (p.t === 'npm') { cmd = 'npx'; args = ['-y', p.id + (p.v ? '@' + p.v : '')]; }
  else if (p.t === 'pypi') { cmd = 'uvx'; args = [p.id + (p.v ? '==' + p.v : '')]; }
  else if (p.t === 'oci') { cmd = 'docker'; args = ['run', '-i', '--rm', ...envReq.flatMap(x => ['-e', x.n]), p.id + (p.v && !/[:@]/.test(p.id.split('/').pop()) ? ':' + p.v : '')]; }
  else if (p.t === 'nuget') { cmd = 'dnx'; args = [p.id + (p.v ? '@' + p.v : ''), '--yes']; }
  else { return { name, kind: p.t, text: `Package type ${p.t} (${p.id}). Follow the repository README: ${repoLink(e)}`, secrets: envReq }; }
  for (const a of p.args || []) if (a.t === 'positional') args.push(a.v || '<' + a.n + '>'); else if (a.n) args.push('--' + String(a.n).replace(/^-+/, ''), a.v || '<value>');
  if (client === 'claude-code') out.push('```bash', `claude mcp add ${name}` + envReq.map(x => ` -e ${x.n}=<${x.n}>`).join('') + ` -- ${cmd} ${args.join(' ')}`, '```');
  else if (client === 'vscode') out.push('`.vscode/mcp.json`', '```json', JSON.stringify({ servers: { [name]: { type: 'stdio', command: cmd, args, ...(envReq.length ? { env: envObj } : {}) } } }, null, 2), '```');
  else out.push(client === 'cursor' ? '`~/.cursor/mcp.json`' : client === 'windsurf' ? '`~/.codeium/windsurf/mcp_config.json`' : client === 'claude-desktop' ? '`claude_desktop_config.json`' : 'MCP client config', '```json', JSON.stringify({ mcpServers: { [name]: { command: cmd, args, ...(envReq.length ? { env: envObj } : {}) } } }, null, 2), '```');
  const req = { npx: 'Node.js (npx)', uvx: 'uv (uvx)', docker: 'Docker', dnx: '.NET 10 SDK (dnx)' }[cmd];
  return { name, kind: `local ${p.t} (${req})`, text: out.join('\n'), secrets: envReq };
}

const TOOLS = [
  { name: 'find_mcp', description: 'Find MCP servers for a task (e.g. "let my agent read PDFs", "query Postgres", "control a headless browser"). Searches every server in the official MCP Registry and ranks them by real-world evidence (GitHub activity, stars, npm downloads) instead of keyword match alone. Flags bulk-published, archived, deprecated and stale servers. Use this before suggesting or installing any MCP server.',
    inputSchema: { type: 'object', properties: {
      task: { type: 'string', description: 'what the user wants the agent to be able to do, in plain words' },
      transport: { type: 'string', enum: ['any', 'local', 'remote'], default: 'any', description: 'local = runs on this machine (npx/uvx/docker), remote = hosted URL' },
      no_keys: { type: 'boolean', default: false, description: 'only servers that list no required API key' },
      include_risky: { type: 'boolean', default: false }, limit: { type: 'number', default: 5 } }, required: ['task'] },
    run: async ({ task, transport = 'any', no_keys = false, include_risky = false, limit = 5 }) => {
      const idx = await loadMcpIndex(), T = terms(task);
      if (!T.length) return 'Describe the task in a few words, e.g. "read PDF files" or "query a Postgres database".';
      let L = idx.servers.filter(e => (include_risky || e.v !== 'risky'));
      if (transport === 'local') L = L.filter(e => e.pk.length); if (transport === 'remote') L = L.filter(e => e.rm.length);
      if (no_keys) L = L.filter(e => !needs(e).startsWith('needs'));
      const ranked = L.map(e => ({ e, t: textScore(e, T) })).filter(x => x.t > 0.25).map(x => ({ ...x, r: x.t * (0.3 + 0.7 * (x.e.sc || 0) / 100) })).sort((a, b) => b.r - a.r);
      const seen = new Set(), out = [];
      for (const x of ranked) { const k = x.e.repo ? x.e.repo.toLowerCase() : x.e.n; if (seen.has(k)) continue; seen.add(k); out.push(x.e); if (out.length >= Math.min(limit, 15)) break; }
      if (!out.length) return `No MCP server in the registry matched "${task}"${include_risky ? '' : ' (risky ones hidden; try include_risky: true)'}. Index ${idx.generatedAt?.slice(0, 10)}, ${fmt(idx.servers.length)} servers.`;
      return `MCP servers for "${task}" (official registry, ${fmt(idx.servers.length)} servers, checked ${idx.generatedAt?.slice(0, 10)}). Ranked by match x trust score.\n\n` +
        out.map((e, i) => [`${i + 1}. ${e.ti || e.n}  [${e.n}]`, `   ${e.d}`, `   Trust ${e.sc}/100, ${VMCP[e.v] || e.v}${e.fl?.length ? '; flags: ' + e.fl.map(f => FLAGS[f] || f).join('; ') : ''}`,
          `   Evidence: ${evidence(e) || 'no GitHub data'}`, `   Runs: ${howRun(e)}; ${needs(e)}`, `   ${repoLink(e)}`].join('\n')).join('\n\n') +
        '\n\nNext: check_mcp for details, install_config for the exact setup in the user\'s client. Ask the user before installing.';
    } },
  { name: 'check_mcp', description: 'Check one MCP server before installing it: real-use evidence, maintenance, license, required keys, warning flags, and better-trusted alternatives. Accepts a registry name (io.github.owner/server), a GitHub repo, an npm/PyPI package or a remote URL.',
    inputSchema: { type: 'object', properties: { server: { type: 'string', description: 'registry name, owner/repo, GitHub URL, package id or remote URL' } }, required: ['server'] },
    run: async ({ server }) => {
      const idx = await loadMcpIndex(), hits = findEntry(idx, server);
      if (!hits.length) {
        const { name } = await resolveName(server).catch(() => ({}));
        if (name) return `${server} is not in the official MCP Registry, but it is on the Star Board:\n\n` + repoText(await getJson('api/repo/' + fileOf(name)));
        return `${server} is not in the official MCP Registry (${fmt(idx.servers.length)} servers, ${idx.generatedAt?.slice(0, 10)}). Treat it as unverified: check its repository, license and who publishes it before installing.`;
      }
      const e = hits[0], g = e.g;
      const alt = idx.servers.filter(x => x !== e && x.v !== 'risky' && x.sc > e.sc && textScore(x, terms(e.d)) > 0.45).sort((a, b) => b.sc - a.sc).slice(0, 3);
      return [`# ${e.ti || e.n}  [${e.n}] v${e.v}`, e.d, '',
        `Trust ${e.sc}/100: ${VMCP[e.v] || e.v}`, e.fl?.length ? 'Flags: ' + e.fl.map(f => FLAGS[f] || f).join('; ') : 'Flags: none',
        g ? `GitHub ${e.repo}: ${fmt(g.s)} stars, ${fmt(g.f)} forks, ${g.h90 != null ? fmt(g.h90) + ' commits in 90 days, ' : ''}last push ${g.p}, created ${g.c}, issues ${fmt(g.ci)} closed / ${fmt(g.oi)} open, license ${g.lic || 'none'}${g.tp?.length ? ', topics ' + g.tp.join(' ') : ''}` : (e.repo ? `GitHub ${e.repo}: not found or not checked` : 'No source repository listed'),
        e.dl ? `npm ${e.dl.k}: ${fmt(e.dl.m)} downloads last month` : '',
        `Publisher namespace: ${e.ns}${/^io\.github\./i.test(e.ns) ? ' (verified GitHub login)' : ' (verified domain)'}; registry status ${e.st}, updated ${e.up}`,
        `Runs: ${howRun(e)}`, `Keys: ${needs(e)}`, repoLink(e),
        hits.length > 1 ? `\nOther registry entries matching "${server}": ${hits.slice(1, 6).map(x => x.n).join(', ')}` : '',
        alt.length ? '\nBetter-trusted servers for similar work: ' + alt.map(x => `${x.ti || x.n} [${x.n}] trust ${x.sc}`).join('; ') : '',
        `\nData: official MCP Registry + GitHub + npm, checked ${idx.generatedAt?.slice(0, 10)}.`].filter(x => x !== '').join('\n');
    } },
  { name: 'install_config', description: 'Exact install command or config for one MCP server in a given client (claude-code, claude-desktop, cursor, vscode, windsurf, generic), from its official registry entry. Returns placeholders for secrets; never put real keys in chat.',
    inputSchema: { type: 'object', properties: { server: { type: 'string', description: 'registry name, owner/repo, package id or remote URL' },
      client: { type: 'string', enum: ['claude-code', 'claude-desktop', 'cursor', 'vscode', 'windsurf', 'generic'], default: 'claude-code' },
      prefer: { type: 'string', enum: ['local', 'remote'], default: 'local' } }, required: ['server'] },
    run: async ({ server, client = 'claude-code', prefer = 'local' }) => {
      const idx = await loadMcpIndex(), hits = findEntry(idx, server);
      if (!hits.length) return `${server} is not in the official MCP Registry, so there is no verified install entry. Use find_mcp to pick a registered server, or follow the project README.`;
      const e = hits[0], c = buildConfig(e, client, prefer);
      return [`# Install ${e.ti || e.n} in ${client}`, `Type: ${c.kind}. Trust ${e.sc}/100 (${e.v})${e.fl?.length ? ', flags: ' + e.fl.join(', ') : ''}.`, '', c.text, '',
        c.secrets.length ? 'Replace the placeholders: ' + c.secrets.map(x => `${x.n}${x.s ? ' (secret)' : ''}${x.d ? ': ' + x.d : ''}`).join('; ') + '. Keep secrets in the config or environment, not in chat.' : 'No required keys listed.',
        `Source: official MCP Registry entry ${e.n} v${e.v}${e.repo ? ', repo https://github.com/' + e.repo : ''}. Show this to the user and ask before running it.`].join('\n');
    } },
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
        instructions: 'When the user needs a capability you do not have (read PDFs, query a database, drive a browser, post to Slack...), call find_mcp first: it ranks every server in the official MCP Registry by real-world evidence and flags bulk-published or abandoned ones. Use check_mcp before installing any MCP server the user mentions, and install_config for the exact setup; always ask the user before installing. For GitHub repositories in general, use get_repo, search_repos, trending, category, compare and summary. Cite numbers and the data date.' } });
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
