#!/usr/bin/env node
// GitHub Star Board - 데이터 수집기 (Node 20+, 외부 의존성 없음)
// 사용: GITHUB_TOKEN=ghp_xxx node collect.mjs
// 결과: data/data.js (대시보드용), data/latest.json, data/history/YYYY-MM-DD.json (스타 스냅샷)

const DEFAULT_CONFIG = {
  // github.com/trending 스크래핑 (공식 API 없음)
  trending: { periods: ['daily', 'weekly', 'monthly'], languages: ['', 'python', 'typescript', 'javascript', 'rust', 'go', 'c++', 'java'] },
  // 누적 스타 순위
  top: { allPages: 2, languages: ['Python', 'TypeScript', 'JavaScript', 'Rust', 'Go', 'C++', 'Java', 'C', 'C#', 'Kotlin', 'Swift'], perLanguage: 50 },
  // 최근 생성된 신규 저장소
  rookies: { days: [7, 30], minStars: 30 },
  // 분야별 (GitHub topic 기준, 최근 1년 내 push된 것만)
  categoryPerTopic: 30,
  categories: [
    { id: 'coding-agent', name: 'AI 코딩 에이전트', topics: ['claude-code', 'coding-agent', 'ai-coding'] },
    { id: 'ai-agent', name: 'AI 에이전트 프레임워크', topics: ['ai-agents', 'llm-agent', 'multi-agent'] },
    { id: 'mcp', name: 'MCP 서버/도구', topics: ['mcp', 'model-context-protocol'] },
    { id: 'llm', name: 'LLM / 추론 엔진', topics: ['llm', 'llm-inference', 'local-llm'] },
    { id: 'rag', name: 'RAG / 벡터 DB', topics: ['rag', 'vector-database'] },
    { id: 'devtools', name: '개발 도구 / CLI', topics: ['developer-tools', 'cli'] },
    { id: 'selfhosted', name: '셀프호스팅', topics: ['self-hosted'] },
    { id: 'security', name: '보안', topics: ['security', 'security-tools'] },
    { id: 'biometrics', name: '생체인증 (얼굴·지문·정맥)', minStars: 10, topics: ['biometrics', 'face-recognition', 'fingerprint-recognition', 'finger-vein', 'vein-recognition', 'liveness-detection'] },
    { id: 'vision', name: '컴퓨터 비전', topics: ['computer-vision', 'image-processing'] },
    { id: 'embedded', name: '임베디드 / IoT', topics: ['embedded', 'iot', 'firmware'] },
  ],
  // 심층 분석 (GraphQL, 토큰 필요): 커밋/참여자/이슈/릴리스/스타 계정 표본
  enrich: { max: 600, batch: 12, stargazerSample: 30 },
  // npm / PyPI / crates.io 다운로드 조회 대상 수
  downloads: { max: 400 },
  historyKeepDays: 400,
};

const DAY = 864e5;
const wait = ms => new Promise(r => setTimeout(r, ms));
const isoDaysAgo = d => new Date(Date.now() - d * DAY).toISOString().slice(0, 10);
const clamp = (x, a = 0, b = 100) => Math.max(a, Math.min(b, x));
const logS = (v, full) => (v == null ? null : clamp((Math.log10(1 + Math.max(0, v)) / Math.log10(1 + full)) * 100));
const num = s => (s == null ? null : +String(s).replace(/,/g, ''));
const UA = 'github-star-board (+https://github.com)';

function makeCtx({ token = null, config = DEFAULT_CONFIG, log = console.log, snapshots = {} } = {}) {
  return { token, config, log, snapshots, repos: {}, trending: {}, lists: {}, searchDelay: token ? 2300 : 6500, lastSearch: 0, errors: [] };
}

function upsert(ctx, name, fields, authoritative) {
  const cur = ctx.repos[name] || { n: name };
  for (const [k, v] of Object.entries(fields)) if (v !== undefined && (authoritative || cur[k] == null)) cur[k] = v;
  ctx.repos[name] = cur;
}

// ---------------- GitHub REST ----------------
async function gh(ctx, url) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': UA };
  if (ctx.token) headers.Authorization = `Bearer ${ctx.token}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(url, { headers });
    if (r.status === 403 || r.status === 429) {
      const ra = +r.headers.get('retry-after'), reset = +r.headers.get('x-ratelimit-reset');
      const ms = ra ? ra * 1000 : reset ? reset * 1000 - Date.now() + 1500 : 30000;
      if (ms > 150000) throw new Error(`rate limited for ${Math.round(ms / 1000)}s`);
      ctx.log(`  rate limit, ${Math.round(ms / 1000)}s 대기`);
      await wait(Math.max(1000, ms));
      continue;
    }
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return r.json();
  }
  throw new Error('retries exhausted: ' + url);
}

async function search(ctx, q, per = 100, page = 1) {
  const gap = ctx.searchDelay - (Date.now() - ctx.lastSearch);
  if (gap > 0) await wait(gap);
  ctx.lastSearch = Date.now();
  const j = await gh(ctx, `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${per}&page=${page}`);
  const names = [];
  for (const it of j.items || []) {
    if (it.fork) continue;
    upsert(ctx, it.full_name, {
      d: it.description || '', l: it.language || null, s: it.stargazers_count, f: it.forks_count, c: it.created_at, p: it.pushed_at,
      a: it.archived || undefined, lic: it.license?.spdx_id && it.license.spdx_id !== 'NOASSERTION' ? it.license.spdx_id : null,
      t: (it.topics || []).slice(0, 8), hp: it.homepage || null, oi: it.open_issues_count,
    }, true);
    names.push(it.full_name);
  }
  return names;
}

// ---------------- Trending (HTML) ----------------
function parseTrending(html) {
  return html.split('<article class="Box-row"').slice(1).map(a => {
    const name = (a.match(/<h2[^>]*>\s*<a[^>]*href="\/([^"]+)"/) || [])[1];
    const desc = ((a.match(/<p class="[^"]*col-9[^"]*">([\s\S]*?)<\/p>/) || [])[1] || '')
      .replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
    const lang = (a.match(/itemprop="programmingLanguage">([^<]+)</) || [])[1];
    const stars = (a.match(/href="\/[^"]+\/stargazers"[^>]*>[\s\S]*?<\/svg>\s*([\d,]+)/) || [])[1];
    const forks = (a.match(/href="\/[^"]+\/forks"[^>]*>[\s\S]*?<\/svg>\s*([\d,]+)/) || [])[1];
    const gained = (a.match(/([\d,]+)\s+stars?\s+(today|this week|this month)/) || [])[1];
    return { name, desc, lang: lang || null, stars: num(stars), forks: num(forks), gained: num(gained) };
  }).filter(x => x.name);
}

async function trending(ctx, period, lang) {
  const url = `https://github.com/trending${lang ? '/' + encodeURIComponent(lang) : ''}?since=${period}`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 ' + UA, Accept: 'text/html' } });
  if (!r.ok) throw new Error(`trending ${r.status}`);
  const items = parseTrending(await r.text());
  for (const t of items) upsert(ctx, t.name, { d: t.desc, l: t.lang, s: t.stars, f: t.forks }, false);
  return items.map(t => ({ n: t.name, g: t.gained }));
}

// ---------------- 작업 목록 ----------------
function buildTasks(cfg) {
  const T = [];
  for (const lang of cfg.trending.languages) for (const period of cfg.trending.periods) T.push({ type: 'trending', period, lang });
  T.push({ type: 'search', key: 'top:all', q: 'stars:>10000', pages: cfg.top.allPages, per: 100 });
  for (const lang of cfg.top.languages) T.push({ type: 'search', key: `top:${lang}`, q: `language:"${lang}" stars:>500`, per: cfg.top.perLanguage });
  for (const d of cfg.rookies.days) T.push({ type: 'search', key: `new:${d}`, q: `created:>=${isoDaysAgo(d)} stars:>=${cfg.rookies.minStars}`, per: 100 });
  for (const c of cfg.categories) for (const t of c.topics)
    T.push({ type: 'search', key: `cat:${c.id}:${t}`, q: `topic:${t} stars:>=${c.minStars ?? 50} pushed:>=${isoDaysAgo(365)}`, per: cfg.categoryPerTopic });
  return T;
}

async function runTask(ctx, t) {
  if (t.type === 'trending') {
    ctx.trending[`${t.period}:${t.lang || 'all'}`] = await trending(ctx, t.period, t.lang);
    await wait(700);
  } else {
    let names = [];
    for (let p = 1; p <= (t.pages || 1); p++) names = names.concat(await search(ctx, t.q, t.per || 100, p));
    ctx.lists[t.key] = names;
  }
}

// ---------------- 심층 분석 (GraphQL) ----------------
const GQL_FIELDS = `nameWithOwner description homepageUrl stargazerCount forkCount isArchived createdAt pushedAt
 primaryLanguage{name} licenseInfo{spdxId} repositoryTopics(first:8){nodes{topic{name}}}
 watchers{totalCount} openIssues:issues(states:OPEN){totalCount} closedIssues:issues(states:CLOSED){totalCount}
 mergedPRs:pullRequests(states:MERGED){totalCount} mentionableUsers{totalCount}
 releases(first:1,orderBy:{field:CREATED_AT,direction:DESC}){totalCount nodes{publishedAt tagName}}
 defaultBranchRef{target{...on Commit{h90:history(since:$s90){totalCount} h365:history(since:$s365){totalCount}}}}
 stargazers(last:$sg,orderBy:{field:STARRED_AT,direction:ASC}){edges{starredAt node{login createdAt bio company location websiteUrl followers{totalCount} following{totalCount} repositories{totalCount}}}}`;

async function gql(ctx, query, variables) {
  for (let a = 0; a < 4; a++) {
    const r = await fetch('https://api.github.com/graphql', {
      method: 'POST', headers: { Authorization: `Bearer ${ctx.token}`, 'Content-Type': 'application/json', 'User-Agent': UA }, body: JSON.stringify({ query, variables }),
    });
    if (r.status === 502 || r.status === 504) { await wait(2500); throw new Error('timeout'); }
    if (r.status === 403 || r.status === 429) {
      const ra = +r.headers.get('retry-after'), reset = +r.headers.get('x-ratelimit-reset');
      const ms = ra ? ra * 1000 : reset ? reset * 1000 - Date.now() + 1500 : 60000;
      if (ms > 600000) throw new Error('graphql rate limit');
      ctx.log(`  GraphQL 한도, ${Math.round(ms / 1000)}s 대기`); await wait(ms); continue;
    }
    const j = await r.json();
    if (!j.data && j.errors) throw new Error(j.errors[0].message);
    return j;
  }
  throw new Error('graphql retries exhausted');
}

function suspScore(u) {
  let s = 0;
  if (u.followers === 0) s += 1;
  if (u.following === 0) s += 1;
  if (u.repos === 0) s += 1.5; else if (u.repos <= 2) s += 0.5;
  if (!u.hasProfile) s += 1;
  const age = (u.starredAt - u.createdAt) / DAY;
  if (age < 30) s += 2; else if (age < 180) s += 0.5;
  return s;
}
function maxIn24h(times) {
  const s = [...times].sort((a, b) => a - b); let best = 0, j = 0;
  for (let i = 0; i < s.length; i++) { while (s[i] - s[j] > DAY) j++; best = Math.max(best, i - j + 1); }
  return best;
}

function applyGql(ctx, name, d) {
  upsert(ctx, name, {
    d: d.description || '', hp: d.homepageUrl || null, s: d.stargazerCount, f: d.forkCount, a: d.isArchived || undefined,
    c: d.createdAt, p: d.pushedAt, l: d.primaryLanguage?.name || null, lic: d.licenseInfo?.spdxId && d.licenseInfo.spdxId !== 'NOASSERTION' ? d.licenseInfo.spdxId : null,
    t: d.repositoryTopics.nodes.map(x => x.topic.name),
  }, true);
  const users = (d.stargazers?.edges || []).filter(e => e.node).map(e => ({
    login: e.node.login, starredAt: Date.parse(e.starredAt), createdAt: Date.parse(e.node.createdAt), followers: e.node.followers.totalCount,
    following: e.node.following.totalCount, repos: e.node.repositories.totalCount, hasProfile: !!(e.node.bio || e.node.company || e.node.location || e.node.websiteUrl),
  }));
  const scored = users.map(u => ({ login: u.login, s: suspScore(u) }));
  const times = users.map(u => u.starredAt);
  const span = times.length > 1 ? (Math.max(...times) - Math.min(...times)) / DAY : 0;
  ctx.repos[name].deep = {
    w: d.watchers.totalCount, oi: d.openIssues.totalCount, ci: d.closedIssues.totalCount, mp: d.mergedPRs.totalCount, ppl: d.mentionableUsers.totalCount,
    rel: d.releases.totalCount, lr: d.releases.nodes[0]?.publishedAt || null, tag: d.releases.nodes[0]?.tagName || null,
    c90: d.defaultBranchRef?.target?.h90?.totalCount ?? null, c365: d.defaultBranchRef?.target?.h365?.totalCount ?? null,
    sgN: users.length, sgSusp: scored.filter(x => x.s >= 5).length, sgLow: scored.filter(x => x.s >= 3.5).length,
    sgBurst: times.length ? maxIn24h(times) : null, sgSpan: Math.round(span * 10) / 10,
    sgFlag: scored.filter(x => x.s >= 5).slice(0, 5).map(x => x.login),
  };
}

async function enrich(ctx, names) {
  const s90 = new Date(Date.now() - 90 * DAY).toISOString(), s365 = new Date(Date.now() - 365 * DAY).toISOString();
  let batch = ctx.config.enrich.batch, i = 0, done = 0;
  while (i < names.length) {
    const chunk = names.slice(i, i + batch);
    const body = chunk.map((n, j) => { const [o, r] = n.split('/'); return `r${j}:repository(owner:${JSON.stringify(o)},name:${JSON.stringify(r)}){${GQL_FIELDS}}`; }).join('\n');
    const q = `query($s90:GitTimestamp!,$s365:GitTimestamp!,$sg:Int!){${body}\nrateLimit{remaining cost}}`;
    try {
      const j = await gql(ctx, q, { s90, s365, sg: ctx.config.enrich.stargazerSample });
      chunk.forEach((n, k) => { const d = j.data?.[`r${k}`]; if (d) { applyGql(ctx, n, d); done++; } });
      i += chunk.length;
      if (batch < ctx.config.enrich.batch) batch++;
      if (j.data?.rateLimit && i % 120 < batch) ctx.log(`  심층 분석 ${i}/${names.length} (GraphQL 잔여 ${j.data.rateLimit.remaining})`);
    } catch (e) {
      if (batch > 1) { batch = Math.max(1, Math.floor(batch / 2)); }
      else { ctx.errors.push(`enrich ${chunk[0]}: ${e.message}`); i++; }
      if (/rate limit/.test(e.message)) { ctx.log('  GraphQL 한도 소진, 심층 분석 중단'); break; }
    }
  }
  ctx.log(`심층 분석 완료: ${done}개`);
}

// ---------------- 패키지 다운로드 ----------------
async function fetchText(url) { try { const r = await fetch(url, { headers: { 'User-Agent': UA } }); return r.ok ? await r.text() : null; } catch { return null; } }
async function pool(items, n, fn) { const q = [...items]; await Promise.all(Array.from({ length: n }, async () => { while (q.length) await fn(q.shift()); })); }

async function downloads(ctx, names) {
  const py = [];
  await pool(names, 6, async name => {
    const r = ctx.repos[name], l = r.l || '';
    const raw = f => fetchText(`https://raw.githubusercontent.com/${name}/HEAD/${f}`);
    try {
      if (/^(JavaScript|TypeScript|Vue|Svelte|CoffeeScript)$/.test(l)) {
        const t = await raw('package.json'); if (!t) return;
        const p = JSON.parse(t); if (!p.name || p.private) return;
        const d = JSON.parse((await fetchText(`https://api.npmjs.org/downloads/point/last-month/${p.name}`)) || '{}');
        if (d.downloads > 0) r.dl = { e: 'npm', k: p.name, m: d.downloads, u: `https://www.npmjs.com/package/${p.name}` };
      } else if (/^(Python|Jupyter Notebook)$/.test(l)) {
        const t = await raw('pyproject.toml'); if (!t) return;
        const m = t.match(/\[(?:project|tool\.poetry)\][^\[]*?\n\s*name\s*=\s*["']([^"']+)["']/);
        if (m) { const k = m[1].toLowerCase().replace(/[_.]+/g, '-'); if (/^[a-z0-9-]+$/.test(k)) py.push([name, k]); }
      } else if (l === 'Rust') {
        const t = await raw('Cargo.toml'); if (!t) return;
        const m = t.match(/\[package\][^\[]*?\n\s*name\s*=\s*["']([^"']+)["']/); if (!m) return;
        const d = JSON.parse((await fetchText(`https://crates.io/api/v1/crates/${m[1]}`)) || '{}');
        if (d.crate?.recent_downloads > 0) r.dl = { e: 'crates.io', k: m[1], m: Math.round(d.crate.recent_downloads / 3), u: `https://crates.io/crates/${m[1]}` };
      }
    } catch {}
  });
  // PyPI: pypistats.org 대신 ClickHouse 공개 PyPI 데이터셋(ClickPy)으로 한 번에 조회
  for (let i = 0; i < py.length; i += 80) {
    const part = py.slice(i, i + 80);
    const sql = `SELECT project, sum(count) AS c FROM pypi.pypi_downloads_per_day WHERE project IN (${part.map(x => `'${x[1]}'`).join(',')}) AND date >= today()-30 GROUP BY project FORMAT JSON`;
    try {
      const r = await fetch('https://sql-clickhouse.clickhouse.com/?user=demo', { method: 'POST', body: sql });
      if (!r.ok) continue;
      const j = await r.json(); const m = Object.fromEntries(j.data.map(x => [x.project, +x.c]));
      for (const [name, k] of part) if (m[k] > 0) ctx.repos[name].dl = { e: 'PyPI', k, m: m[k], u: `https://clickpy.clickhouse.com/dashboard/${k}` };
    } catch {}
  }
  ctx.log(`다운로드 확인: ${names.filter(n => ctx.repos[n].dl).length}개`);
}

// ---------------- 점수 / 판정 ----------------
function growthFromHistory(ctx, name, stars) {
  const g = {};
  const dates = Object.keys(ctx.snapshots).sort();
  for (const [k, back] of [['d1', 1], ['d7', 7], ['d30', 30]]) {
    const target = isoDaysAgo(back);
    const cand = dates.filter(d => Math.abs(Date.parse(d) - Date.parse(target)) <= 1.5 * DAY && ctx.snapshots[d][name] != null)
      .sort((a, b) => Math.abs(Date.parse(a) - Date.parse(target)) - Math.abs(Date.parse(b) - Date.parse(target)));
    if (cand.length) g[k] = stars - ctx.snapshots[cand[0]][name];
  }
  return Object.keys(g).length ? g : null;
}

function scoreRepo(r, tg) {
  const now = Date.now();
  const pushedDays = r.p ? (now - Date.parse(r.p)) / DAY : null;
  const ageDays = r.c ? Math.max(1, (now - Date.parse(r.c)) / DAY) : null;
  let g7 = null;
  if (r.g?.d7 != null) g7 = r.g.d7;
  else if (tg.weekly[r.n] != null) g7 = tg.weekly[r.n];
  else if (tg.daily[r.n] != null) g7 = tg.daily[r.n] * 7;
  else if (tg.monthly[r.n] != null) g7 = (tg.monthly[r.n] / 30) * 7;
  else if (ageDays && ageDays <= 90) g7 = (r.s / ageDays) * 7;
  const pop = Math.round(g7 == null ? logS(r.s, 1e5) : 0.6 * logS(r.s, 1e5) + 0.4 * logS(g7, 5000));

  const D = r.deep;
  const forkRatio = r.s ? (r.f ?? 0) / r.s : null;
  const issTot = D ? D.oi + D.ci : 0;
  const lrDays = D?.lr ? (now - Date.parse(D.lr)) / DAY : null;
  const comp = {
    activity: [0.22, D && D.c90 != null ? logS(D.c90, 300) : null],
    recency: [0.10, pushedDays == null ? null : pushedDays <= 14 ? 100 : pushedDays <= 60 ? 75 : pushedDays <= 180 ? 45 : pushedDays <= 365 ? 20 : 0],
    community: [0.15, D ? logS(D.ppl, 500) : null],
    issues: [0.13, D && issTot >= 10 ? (D.ci / issTot) * 100 : null],
    prs: [0.10, D ? logS(D.mp, 2000) : null],
    forks: [0.10, forkRatio == null ? null : clamp((forkRatio / 0.15) * 100)],
    adoption: [0.12, r.dl ? logS(r.dl.m, 1e7) : null],
    releases: [0.08, D ? (lrDays == null ? 0 : lrDays <= 90 ? 100 : lrDays <= 365 ? 60 : 30) : null],
  };
  let ws = 0, acc = 0;
  for (const [w, v] of Object.values(comp)) if (v != null) { ws += w; acc += w * v; }
  const util = ws ? Math.round(acc / ws) : null;

  let trust = null, suspPct = null;
  if (D && D.sgN >= 10) {
    suspPct = D.sgSusp / D.sgN; const lowPct = D.sgLow / D.sgN;
    const burst = D.sgSpan > 3 && D.sgBurst / D.sgN > 0.5;
    trust = Math.round(clamp(100 - Math.max(0, suspPct * 100 - 5) * 2 - Math.max(0, lowPct * 100 - 35) * 0.8 - (burst && suspPct > 0.15 ? 15 : 0)));
  }

  const isDoc = !r.l || r.l === 'Markdown' || (r.t || []).some(x => /^awesome/.test(x)) || /^awesome[-_]/i.test(r.n.split('/')[1]);
  let v;
  if (r.a) v = ['archived', '아카이브됨'];
  else if (trust != null && trust < 50) v = ['bad', '스타 조작 의심'];
  else if (isDoc) v = ['doc', '문서/큐레이션형'];
  else if (!D) v = ['quick', '심층 분석 대기'];
  else if (util == null) v = ['na', '데이터 부족'];
  else if (pop >= 55 && util >= 55) v = ['good', '검증된 인기'];
  else if (pop >= 55 && comp.adoption[1] != null && comp.adoption[1] >= 80) v = ['mature', '성숙/유지보수'];
  else if (pop >= 55) v = ['hype', '하이프 주의'];
  else if (util >= 55) v = ['gem', '숨은 보석'];
  else v = ['early', '초기/정체'];

  const why = [];
  const fmt = n => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(Math.round(n)));
  if (g7 != null && g7 >= 500) why.push(['+', `최근 7일 약 +${fmt(g7)} 스타`]);
  if (D?.c90 != null) D.c90 >= 50 ? why.push(['+', `90일 커밋 ${fmt(D.c90)}개`]) : D.c90 < 5 && why.push(['-', `90일 커밋 ${D.c90}개 (개발 정체)`]);
  if (D) D.ppl >= 100 ? why.push(['+', `참여자 ${fmt(D.ppl)}명`]) : D.ppl <= 3 && r.s > 2000 && why.push(['-', `스타 ${fmt(r.s)}개에 참여자 ${D.ppl}명`]);
  if (D && issTot >= 10) D.ci / issTot >= 0.8 ? why.push(['+', `이슈 해결률 ${Math.round((D.ci / issTot) * 100)}%`]) : D.ci / issTot < 0.4 && why.push(['-', `이슈 해결률 ${Math.round((D.ci / issTot) * 100)}%`]);
  if (r.dl) why.push([r.dl.m >= 1e5 ? '+' : '·', `${r.dl.e} 월 ${fmt(r.dl.m)} 다운로드`]);
  if (forkRatio != null && forkRatio < 0.03 && r.s > 2000 && !r.dl && !isDoc) why.push(['-', `포크/스타 ${(forkRatio * 100).toFixed(1)}% (북마크성 스타 가능성)`]);
  if (pushedDays != null && pushedDays > 365) why.push(['-', `마지막 push ${Math.round(pushedDays / 30)}개월 전`]);
  if (suspPct != null) suspPct >= 0.25 ? why.push(['-', `최근 스타 계정 ${Math.round(suspPct * 100)}%가 가짜 의심 패턴`]) : suspPct <= 0.08 && why.push(['+', '최근 스타 계정 품질 양호']);
  if (D && D.sgN >= 10 && D.sgSpan > 3 && D.sgBurst / D.sgN > 0.5) why.push(['-', `최근 스타 ${D.sgBurst}/${D.sgN}개가 24시간 안에 몰림`]);
  if (!r.lic && !isDoc) why.push(['·', '라이선스 없음 (상업적 사용 주의)']);

  r.sc = { pop, util, trust, g7: g7 == null ? null : Math.round(g7), v: v[0], vt: v[1], quick: !D, comp: Object.fromEntries(Object.entries(comp).map(([k, [, x]]) => [k, x == null ? null : Math.round(x)])) };
  r.why = why.slice(0, 7);
}

// ---------------- 결과 조립 ----------------
function finalize(ctx) {
  const cfg = ctx.config;
  // 전체 + 언어별 트렌딩의 기간별 증가 스타
  const tg = { daily: {}, weekly: {}, monthly: {} };
  for (const [k, list] of Object.entries(ctx.trending)) { const p = k.split(':')[0]; for (const x of list) if (x.g != null) tg[p][x.n] = Math.max(tg[p][x.n] || 0, x.g); }
  for (const r of Object.values(ctx.repos)) {
    if (r.s != null) r.g = growthFromHistory(ctx, r.n, r.s);
    scoreRepo(r, tg);
  }
  const categories = cfg.categories.map(c => {
    const set = new Set(); for (const t of c.topics) for (const n of ctx.lists[`cat:${c.id}:${t}`] || []) set.add(n);
    return { id: c.id, name: c.name, topics: c.topics, repos: [...set].sort((a, b) => (ctx.repos[b].s || 0) - (ctx.repos[a].s || 0)) };
  });
  const top = { all: ctx.lists['top:all'] || [] };
  for (const l of cfg.top.languages) top[l] = ctx.lists[`top:${l}`] || [];
  const rookies = {}; for (const d of cfg.rookies.days) rookies[d] = ctx.lists[`new:${d}`] || [];
  const snapDates = Object.keys(ctx.snapshots).sort();
  return {
    generatedAt: new Date().toISOString(), mode: ctx.token ? 'deep' : 'quick',
    deepCount: Object.values(ctx.repos).filter(r => r.deep).length,
    history: { days: snapDates.length, first: snapDates[0] || null },
    trendingLanguages: cfg.trending.languages, topLanguages: cfg.top.languages, rookieDays: cfg.rookies.days,
    trending: ctx.trending, top, rookies, categories, repos: ctx.repos, errors: ctx.errors.slice(0, 50),
  };
}

function enrichOrder(ctx) {
  const seen = new Set(), out = [];
  const push = n => { if (n && ctx.repos[n] && !seen.has(n)) { seen.add(n); out.push(n); } };
  for (const list of Object.values(ctx.trending)) list.forEach(x => push(x.n));
  for (const [k, list] of Object.entries(ctx.lists)) if (k.startsWith('new:')) list.slice(0, 60).forEach(push);
  for (const [k, list] of Object.entries(ctx.lists)) if (k.startsWith('cat:')) list.slice(0, 15).forEach(push);
  (ctx.lists['top:all'] || []).forEach(push);
  for (const [k, list] of Object.entries(ctx.lists)) if (k.startsWith('top:')) list.slice(0, 25).forEach(push);
  for (const list of Object.values(ctx.lists)) list.forEach(push);
  return out;
}

async function writeOutputs(fs, path, dir, out) {
  const day = out.generatedAt.slice(0, 10);
  await fs.mkdir(path.join(dir, 'history'), { recursive: true });
  const snap = Object.fromEntries(Object.values(out.repos).filter(r => r.s != null).map(r => [r.n, r.s]));
  await fs.writeFile(path.join(dir, 'history', `${day}.json`), JSON.stringify(snap));
  await fs.writeFile(path.join(dir, 'latest.json'), JSON.stringify(out));
  await fs.writeFile(path.join(dir, 'data.js'), 'window.STAR_BOARD = ' + JSON.stringify(out) + ';\n');
}

async function loadSnapshots(fs, path, dir, keepDays) {
  const snaps = {};
  const hdir = path.join(dir, 'history');
  let files = [];
  try { files = (await fs.readdir(hdir)).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort(); } catch { return snaps; }
  const cutoff = isoDaysAgo(keepDays);
  for (const f of files) {
    const d = f.slice(0, 10);
    if (d < cutoff) { await fs.unlink(path.join(hdir, f)).catch(() => {}); continue; }
    if (d >= isoDaysAgo(32)) { try { snaps[d] = JSON.parse(await fs.readFile(path.join(hdir, f), 'utf8')); } catch {} }
  }
  return snaps;
}

async function main() {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  let user = {};
  try { user = JSON.parse(await fs.readFile('config.json', 'utf8')); } catch {}
  const config = { ...DEFAULT_CONFIG, ...user, enrich: { ...DEFAULT_CONFIG.enrich, ...(user.enrich || {}) } };
  const dir = path.resolve('data');
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;
  const snapshots = await loadSnapshots(fs, path, dir, config.historyKeepDays);
  const ctx = makeCtx({ token, config, snapshots });
  delete snapshots[new Date().toISOString().slice(0, 10)];
  ctx.log(`토큰: ${token ? '있음 (심층 분석)' : '없음 (간이 모드)'}, 과거 스냅샷 ${Object.keys(snapshots).length}일`);
  const tasks = buildTasks(config);
  for (const [i, t] of tasks.entries()) {
    try { await runTask(ctx, t); } catch (e) { ctx.errors.push(`${t.type} ${t.key || t.period + ':' + t.lang}: ${e.message}`); ctx.log('  실패: ' + e.message); }
    if (i % 10 === 0) ctx.log(`수집 ${i + 1}/${tasks.length}, 저장소 ${Object.keys(ctx.repos).length}개`);
  }
  const order = enrichOrder(ctx);
  if (token) await enrich(ctx, order.slice(0, config.enrich.max));
  await downloads(ctx, order.slice(0, config.downloads.max));
  const out = finalize(ctx);
  await writeOutputs(fs, path, dir, out);
  ctx.log(`완료: 저장소 ${Object.keys(out.repos).length}개, 심층 ${out.deepCount}개, 오류 ${ctx.errors.length}건`);
}

if (typeof process !== 'undefined' && /collect\.mjs$/.test(process.argv?.[1] || '')) {
  main().catch(e => { console.error(e); process.exit(1); });
}
