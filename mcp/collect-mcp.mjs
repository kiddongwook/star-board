#!/usr/bin/env node
// Star Board MCP index: every server in the official MCP Registry, checked against its GitHub repo.
// Usage: GITHUB_TOKEN=... node mcp/collect-mcp.mjs   (Node 20+, no dependencies)
// Env: MCP_LIMIT=<n> only check the first n repos (testing), NPM_MAX=<n> cap on scoped npm download lookups.
// Writes:
//   out/mcp-index.json.gz  full index (published as the release asset "mcp-index", too big for the repo)
//   data/mcp/top.json      top servers by trust score (served by Pages)
//   data/mcp/summary.json  counts, verdict mix, bulk publishers, monthly growth
import fs from 'node:fs/promises';
import zlib from 'node:zlib';

const REG = 'https://registry.modelcontextprotocol.io/v0.1/servers';
const UA = 'github-star-board-mcp-collector';
const TOKEN = process.env.GITHUB_TOKEN || '';
const LIMIT = +process.env.MCP_LIMIT || 0;
const NPM_MAX = +(process.env.NPM_MAX || 1500);
const DAY = 864e5, NOW = Date.now();
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function getJson(url, opt = {}, tries = 5) {
  for (let a = 0; a < tries; a++) {
    try {
      const r = await fetch(url, { ...opt, headers: { 'User-Agent': UA, ...(opt.headers || {}) } });
      if (r.status === 429 || r.status >= 500) { await wait(2000 * (a + 1)); continue; }
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url);
      return await r.json();
    } catch (e) { if (a === tries - 1) throw e; await wait(1500 * (a + 1)); }
  }
  return null;
}

// ---------------- 1. registry (latest version of every server) ----------------
async function fetchRegistry() {
  const out = []; let cursor = null, pages = 0;
  do {
    const j = await getJson(REG + '?version=latest&limit=100' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
    if (!j) break;
    out.push(...j.servers); cursor = j.metadata?.nextCursor; pages++;
    if (pages % 100 === 0) log('registry pages', pages, 'servers', out.length);
  } while (cursor);
  log('registry done:', out.length, 'servers in', pages, 'pages');
  return out;
}

const GH = /github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/i;
const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const envOf = list => (list || []).map(e => ({ n: e.name, r: e.isRequired ? 1 : 0, s: e.isSecret ? 1 : 0, d: clip(e.description, 90) })).filter(e => e.n);

function normalize(x) {
  const s = x.server, m = x._meta?.['io.modelcontextprotocol.registry/official'] || {};
  const g = (s.repository?.url || '').match(GH);
  const repo = g ? (g[1] + '/' + g[2].replace(/\.git$/i, '')) : null;
  return {
    n: s.name, ti: clip(s.title, 60) || undefined, d: clip(s.description, 220), ver: s.version, ns: s.name.split('/')[0],
    repo, sub: s.repository?.subfolder || undefined, web: s.websiteUrl || undefined,
    st: m.status || 'active', pub: (m.publishedAt || '').slice(0, 10), up: (m.updatedAt || m.publishedAt || '').slice(0, 10),
    pk: (s.packages || []).map(p => ({ t: p.registryType, id: p.identifier, v: p.version, tr: p.transport?.type || 'stdio', rh: p.runtimeHint || undefined,
      env: envOf(p.environmentVariables), args: (p.packageArguments || []).filter(a => a.isRequired).map(a => ({ n: a.name || a.valueHint || a.value, t: a.type, v: a.value || a.default || undefined })) })),
    rm: (s.remotes || []).map(r => ({ t: r.type, u: r.url, h: envOf(r.headers) })),
  };
}

// ---------------- 2. GitHub repos (light, all of them) ----------------
const FIELDS = `nameWithOwner stargazerCount forkCount isArchived isFork createdAt pushedAt licenseInfo{spdxId}
 repositoryTopics(first:6){nodes{topic{name}}}
 openIssues:issues(states:OPEN){totalCount} closedIssues:issues(states:CLOSED){totalCount}
 defaultBranchRef{target{...on Commit{h90:history(since:$s90){totalCount}}}}`;

async function gql(query, variables) {
  for (let a = 0; a < 6; a++) {
    let r;
    try { r = await fetch('https://api.github.com/graphql', { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json', 'User-Agent': UA }, body: JSON.stringify({ query, variables }) }); }
    catch (e) { await wait(3000); continue; }
    if (r.status === 502 || r.status === 504) { await wait(3000 * (a + 1)); continue; }
    if (r.status === 403 || r.status === 429) {
      const ra = +r.headers.get('retry-after'), reset = +r.headers.get('x-ratelimit-reset');
      const ms = ra ? ra * 1000 : reset ? reset * 1000 - Date.now() + 2000 : 60000;
      if (ms > 1800000) throw new Error('graphql rate limit (reset too far)');
      log('GraphQL limit, waiting', Math.round(ms / 1000), 's'); await wait(ms); continue;
    }
    const j = await r.json();
    if (j.data) return j;
    if (j.errors && /timeout|something went wrong/i.test(j.errors[0]?.message || '')) { await wait(3000); continue; }
    throw new Error(j.errors?.[0]?.message || 'graphql error');
  }
  throw new Error('graphql retries exhausted');
}

async function fetchRepos(names) {
  const out = new Map(), s90 = new Date(NOW - 90 * DAY).toISOString();
  let batch = 60, i = 0, lastRem = null;
  while (i < names.length) {
    const part = names.slice(i, i + batch);
    const body = part.map((n, k) => { const [o, r] = n.split('/'); return `r${k}:repository(owner:${JSON.stringify(o)},name:${JSON.stringify(r)}){${FIELDS}}`; }).join('\n');
    let j;
    try { j = await gql(`query($s90:GitTimestamp!){${body}\nrateLimit{remaining cost}}`, { s90 }); }
    catch (e) { if (batch > 10) { batch = Math.max(10, batch >> 1); log('batch error, smaller batch', batch, e.message); continue; } log('skip batch', i, e.message); i += part.length; continue; }
    part.forEach((n, k) => { const d = j.data['r' + k]; out.set(n.toLowerCase(), d ? {
      nw: d.nameWithOwner, s: d.stargazerCount, f: d.forkCount, a: d.isArchived ? 1 : 0, fk: d.isFork ? 1 : 0, c: d.createdAt?.slice(0, 10), p: d.pushedAt?.slice(0, 10),
      lic: d.licenseInfo?.spdxId && d.licenseInfo.spdxId !== 'NOASSERTION' ? d.licenseInfo.spdxId : null,
      tp: d.repositoryTopics.nodes.map(x => x.topic.name), oi: d.openIssues.totalCount, ci: d.closedIssues.totalCount, h90: d.defaultBranchRef?.target?.h90?.totalCount ?? null } : null); });
    lastRem = j.data.rateLimit; i += part.length;
    if ((i / batch | 0) % 25 === 0) log('repos', i, '/', names.length, 'graphql remaining', lastRem?.remaining, 'cost', lastRem?.cost);
  }
  log('repos done', out.size, 'graphql remaining', lastRem?.remaining);
  return out;
}

// ---------------- 3. npm downloads (last month) ----------------
async function fetchNpm(pkgs) {
  const out = new Map(), plain = pkgs.filter(p => !p.startsWith('@')), scoped = pkgs.filter(p => p.startsWith('@')).slice(0, NPM_MAX);
  for (let i = 0; i < plain.length; i += 120) {
    const part = plain.slice(i, i + 120);
    const j = await getJson('https://api.npmjs.org/downloads/point/last-month/' + part.map(encodeURIComponent).join(','));
    if (j) for (const p of part) { const v = part.length === 1 ? j : j[p]; if (v && v.downloads != null) out.set(p, v.downloads); }
    await wait(250);
  }
  let k = 0;
  const worker = async () => { while (k < scoped.length) { const p = scoped[k++]; const j = await getJson('https://api.npmjs.org/downloads/point/last-month/' + p.replace('/', '%2F')).catch(() => null); if (j && j.downloads != null) out.set(p, j.downloads); await wait(120); } };
  await Promise.all(Array.from({ length: 8 }, worker));
  log('npm downloads', out.size, 'of', plain.length + scoped.length);
  return out;
}

// ---------------- 4. score ----------------
const lg = (x, top) => Math.min(1, Math.log10((x || 0) + 1) / top);
function score(e, nsCount) {
  const g = e.g, fl = [];
  if (e.st === 'deprecated') fl.push('deprecated');
  if (nsCount >= 50) fl.push('bulk-publisher');
  if (!e.repo) fl.push('no-repo'); else if (g === null) fl.push('repo-missing'); else if (g === undefined) fl.push('unchecked');
  if (g?.a) fl.push('archived');
  if (g?.fk) fl.push('fork');
  const pushedDays = g?.p ? (NOW - Date.parse(g.p)) / DAY : null, ageDays = g?.c ? (NOW - Date.parse(g.c)) / DAY : null;
  if (pushedDays != null && pushedDays > 180) fl.push('stale');
  if (ageDays != null && ageDays < 30) fl.push('new');
  const domainNs = !/^io\.github\./i.test(e.ns);
  let sc = 0;
  if (g) {
    sc += 40 * lg(g.s, 4);                     // 10k stars = full
    sc += 22 * lg(g.h90, 2);                   // 100 commits in 90 days = full
    if (pushedDays != null && pushedDays <= 30) sc += 6;
    const it = (g.oi || 0) + (g.ci || 0); if (it >= 5) sc += 8 * (g.ci / it);
    if (ageDays != null && ageDays >= 90) sc += 4;
    if (g.lic) sc += 3;
  } else sc += 8;
  if (e.dl) sc += 15 * lg(e.dl.m, 5);           // 100k downloads/month = full
  if (domainNs) sc += 2;                       // publisher proved a domain (not just a GitHub login)
  const nsOwner = (/^io\.github\.(.+)$/i.exec(e.ns || '') || [])[1];
  if (nsOwner && e.repo && e.repo.split('/')[0].toLowerCase() !== nsOwner.toLowerCase() && !fl.includes('bulk-publisher')) fl.push('repo-not-owned');
  if (g?.nw && e.repo && g.nw.toLowerCase() !== e.repo.toLowerCase()) fl.push('repo-renamed');
  if (fl.includes('bulk-publisher')) sc -= 25;
  if (fl.includes('repo-not-owned')) sc = Math.min(sc, 30);
  if (fl.includes('repo-renamed')) sc = Math.min(sc, 35);
  if (fl.includes('archived') || fl.includes('deprecated')) sc -= 40;
  if (fl.includes('stale')) sc -= 15;
  if (fl.includes('fork')) sc -= 8;
  sc = Math.max(0, Math.min(100, Math.round(sc)));
  let v = 'weak';
  if (fl.some(f => ['deprecated', 'archived', 'bulk-publisher', 'repo-missing'].includes(f))) v = 'risky';
  else if (fl.includes('repo-not-owned')) v = 'weak';
  else if (sc >= 62) v = 'proven';
  else if (sc >= 40) v = 'active';
  else if (fl.includes('new')) v = 'early';
  return { sc, v, fl, domainNs };
}

// ---------------- main ----------------
async function main() {
  if (!TOKEN) log('warning: no GITHUB_TOKEN, GitHub checks will fail');
  const raw = await fetchRegistry();
  const E = raw.map(normalize);
  const nsCount = {}; for (const e of E) nsCount[e.ns] = (nsCount[e.ns] || 0) + 1;
  let names = [...new Set(E.filter(e => e.repo).map(e => e.repo))];
  if (LIMIT) names = names.slice(0, LIMIT);
  log('unique repos', names.length);
  // GitHub results are the slow part (about an hour): reuse a cache file if given, and always save one
  let repos;
  if (process.env.MCP_REPOS_CACHE) { try { repos = new Map(Object.entries(JSON.parse(zlib.gunzipSync(await fs.readFile(process.env.MCP_REPOS_CACHE)).toString()))); log('repos from cache', repos.size); } catch (e) { log('cache unreadable:', e.message); } }
  if (!repos) repos = await fetchRepos(names);
  await fs.mkdir('out', { recursive: true });
  await fs.writeFile('out/repos-cache.json.gz', zlib.gzipSync(JSON.stringify(Object.fromEntries(repos))));
  for (const e of E) e.g = e.repo ? (repos.get(e.repo.toLowerCase()) ?? (repos.has(e.repo.toLowerCase()) ? null : undefined)) : undefined;
  // npm downloads only where the repo is real (keeps the scoped lookups bounded)
  // only packages whose repo shows some life (stars or recent commits); zero-star bulk packages are skipped
  const npmIds = [...new Set(E.filter(e => e.g && !e.g.a && (e.g.s >= 3 || (e.g.h90 || 0) >= 5)).sort((a, b) => b.g.s - a.g.s).flatMap(e => e.pk.filter(p => p.t === 'npm').map(p => p.id)))];
  let npm = new Map();
  try { npm = await fetchNpm(npmIds); } catch (e) { log('npm step failed, continuing without downloads:', e.message); }
  for (const e of E) { const p = e.pk.find(q => q.t === 'npm' && npm.has(q.id)); if (p) e.dl = { e: 'npm', k: p.id, m: npm.get(p.id) }; }
  // well-known MCP servers that are on the Star Board but not (under that repo) in the official registry
  const inReg = new Set(E.filter(e => e.repo).map(e => e.repo.toLowerCase()));
  let board = null; try { board = JSON.parse(await fs.readFile('data/latest.json', 'utf8')); } catch { log('no data/latest.json, skipping board merge'); }
  if (board) {
    const MCPRE = /\bmcp\b|model context protocol|mcp-server/i; let added = 0;
    for (const [name, r] of Object.entries(board.repos || {})) {
      if (inReg.has(name.toLowerCase()) || !MCPRE.test(name + ' ' + (r.d || '') + ' ' + (r.t || []).join(' '))) continue;
      const D = r.deep || {};
      const e = { n: 'github:' + name, ti: name.split('/')[1], d: clip(r.d, 220), ver: D.tag || '', ns: 'github', repo: name, st: 'active', pub: (r.c || '').slice(0, 10), up: (r.p || '').slice(0, 10), src: 'board',
        pk: r.dl?.e === 'npm' && r.dl.k ? [{ t: 'npm', id: r.dl.k, tr: 'stdio', env: [], args: [] }] : r.dl?.e === 'pypi' && r.dl.k ? [{ t: 'pypi', id: r.dl.k, tr: 'stdio', env: [], args: [] }] : [], rm: [],
        g: { s: r.s, f: r.f, a: r.a ? 1 : 0, fk: 0, c: (r.c || '').slice(0, 10), p: (r.p || '').slice(0, 10), lic: r.lic || null, tp: (r.t || []).slice(0, 6), oi: D.oi ?? r.oi ?? 0, ci: D.ci ?? 0, h90: D.c90 ?? null },
        dl: r.dl?.m != null ? { e: r.dl.e, k: r.dl.k, m: r.dl.m } : undefined };
      E.push(e); nsCount.github = 0; added++;
    }
    log('board MCP repos added (not in registry):', added);
  }
  for (const e of E) { if (e.g === undefined && e.repo && LIMIT) continue; Object.assign(e, score(e, nsCount[e.ns])); if (e.src === 'board') e.fl.push('not-in-registry'); }
  const scored = E.filter(e => e.sc != null).sort((a, b) => b.sc - a.sc);

  const generatedAt = new Date().toISOString();
  await fs.mkdir('out', { recursive: true }); await fs.mkdir('data/mcp', { recursive: true });
  const index = { generatedAt, source: 'registry.modelcontextprotocol.io v0.1 (latest versions) + GitHub + npm', count: scored.length, servers: scored };
  const gz = zlib.gzipSync(JSON.stringify(index), { level: 9 });
  await fs.writeFile('out/mcp-index.json.gz', gz);
  const top = scored.filter(e => e.v === 'proven' || e.v === 'active').slice(0, 1500);
  await fs.writeFile('data/mcp/top.json', JSON.stringify({ generatedAt, count: top.length, servers: top }));
  const vmix = {}; for (const e of scored) vmix[e.v] = (vmix[e.v] || 0) + 1;
  const months = {}; for (const e of E) { const k = (e.pub || '').slice(0, 7); if (k) months[k] = (months[k] || 0) + 1; }
  const bulk = Object.entries(nsCount).filter(([, c]) => c >= 50).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([ns, c]) => ({ ns, servers: c }));
  const summary = { generatedAt, servers: E.length, withGithub: E.filter(e => e.repo).length, uniqueRepos: names.length, reposFound: [...repos.values()].filter(Boolean).length,
    remotes: E.filter(e => e.rm.length).length, packages: E.filter(e => e.pk.length).length, verdicts: vmix, firstSeenByMonth: months, bulkPublishers: bulk, indexBytesGz: gz.length,
    indexUrl: 'https://github.com/kiddongwook/star-board/releases/download/mcp-index/mcp-index.json.gz' };
  await fs.writeFile('data/mcp/summary.json', JSON.stringify(summary, null, 1));
  log('done', JSON.stringify({ servers: summary.servers, verdicts: vmix, gzMB: (gz.length / 1e6).toFixed(1), top: top.length }));
}

main().catch(e => { console.error(e); process.exit(1); });
