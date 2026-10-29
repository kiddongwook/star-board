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
  enrich: { max: 2500, batch: 12, stargazerSample: 30 },
  // npm / PyPI / crates.io 다운로드 조회 대상 수
  downloads: { max: 2500 },
  // GitHub "Used by" (의존 저장소/패키지 수) HTML 파싱 대상 수 (스타순)
  dependents: { max: 400 },
  historyKeepDays: 400,
};

const DAY = 864e5;
const wait = ms => new Promise(r => setTimeout(r, ms));
const isoDaysAgo = d => new Date(Date.now() - d * DAY).toISOString().slice(0, 10);
const clamp = (x, a = 0, b = 100) => Math.max(a, Math.min(b, x));
const logS = (v, full) => (v == null ? null : clamp((Math.log10(1 + Math.max(0, v)) / Math.log10(1 + full)) * 100));
const num = s => (s == null ? null : +String(s).replace(/,/g, ''));
const UA = 'github-star-board (+https://github.com)';
const normLic = s => (!s ? null : s === 'NOASSERTION' ? 'Other' : s);
// 라이선스 위험도: perm(허용형) / weak(약한 카피레프트) / copyleft / none / other(비표준·소스공개형 등, 확인 필요)
function licKind(spdx) {
  if (!spdx) return 'none';
  if (/^(MIT|MIT-0|Apache-2\.0|BSD-[0-4]-Clause.*|ISC|0BSD|Unlicense|Zlib|BSL-1\.0|CC0-1\.0|WTFPL|PostgreSQL|BlueOak-1\.0\.0|NCSA|X11|PSF-2\.0|Python-2\.0)$/i.test(spdx)) return 'perm';
  if (/^(LGPL|MPL|EPL|CDDL|EUPL|OSL|CPL)/i.test(spdx)) return 'weak';
  if (/^(GPL|AGPL)/i.test(spdx)) return 'copyleft';
  return 'other';
}
const starsOf = v => (Array.isArray(v) ? v[0] : v);

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
      a: it.archived || undefined, lic: normLic(it.license?.spdx_id),
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
 releases(first:10,orderBy:{field:CREATED_AT,direction:DESC}){totalCount nodes{publishedAt tagName isPrerelease isDraft}}
 defaultBranchRef{target{...on Commit{h90:history(since:$s90){totalCount} h365:history(since:$s365){totalCount}}}}`;
// 스타 누른 계정 목록은 Actions 기본 GITHUB_TOKEN으로는 접근 불가(FORBIDDEN) -> 개인 토큰(STAR_BOARD_TOKEN)이 있을 때만 사용
const GQL_SG = ` stargazers(last:$sg,orderBy:{field:STARRED_AT,direction:ASC}){edges{starredAt node{login createdAt bio company location websiteUrl followers{totalCount} following{totalCount} repositories{totalCount}}}}`;

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
    c: d.createdAt, p: d.pushedAt, l: d.primaryLanguage?.name || null, lic: normLic(d.licenseInfo?.spdxId),
    t: d.repositoryTopics.nodes.map(x => x.topic.name),
  }, true);
  const users = (d.stargazers?.edges || []).filter(e => e.node).map(e => ({
    login: e.node.login, starredAt: Date.parse(e.starredAt), createdAt: Date.parse(e.node.createdAt), followers: e.node.followers.totalCount,
    following: e.node.following.totalCount, repos: e.node.repositories.totalCount, hasProfile: !!(e.node.bio || e.node.company || e.node.location || e.node.websiteUrl),
  }));
  const scored = users.map(u => ({ login: u.login, s: suspScore(u) }));
  const rels = (d.releases?.nodes || []).filter(x => !x.isDraft && x.publishedAt);
  // 안정 릴리스: 프리릴리스가 아니고 태그가 메이저 1 이상의 semver (best-of의 stable release 기준)
  const stable = rels.some(x => { if (x.isPrerelease) return false; const m = x.tagName.match(/(\d+)\.(\d+)(?:\.(\d+))?$/); return m && +m[1] >= 1; });
  const times = users.map(u => u.starredAt);
  const span = times.length > 1 ? (Math.max(...times) - Math.min(...times)) / DAY : 0;
  ctx.repos[name].deep = {
    w: d.watchers.totalCount, oi: d.openIssues.totalCount, ci: d.closedIssues.totalCount, mp: d.mergedPRs.totalCount, ppl: d.mentionableUsers.totalCount,
    rel: d.releases.totalCount, lr: rels[0]?.publishedAt || null, tag: rels[0]?.tagName || null, stable,
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
    const withSG = !ctx.noSG;
    const body = chunk.map((n, j) => { const [o, r] = n.split('/'); return `r${j}:repository(owner:${JSON.stringify(o)},name:${JSON.stringify(r)}){${GQL_FIELDS}${withSG ? GQL_SG : ''}}`; }).join('\n');
    const q = `query($s90:GitTimestamp!,$s365:GitTimestamp!${withSG ? ',$sg:Int!' : ''}){${body}\nrateLimit{remaining cost}}`;
    try {
      const j = await gql(ctx, q, withSG ? { s90, s365, sg: ctx.config.enrich.stargazerSample } : { s90, s365 });
      if (withSG && (j.errors || []).some(er => (er.path || []).includes('stargazers') && /FORBIDDEN|not accessible/i.test(`${er.type} ${er.message}`))) {
        ctx.noSG = true;
        ctx.log('  스타 계정 목록 접근 불가 (기본 GITHUB_TOKEN). 가짜 스타 검사 없이 진행합니다. 개인 토큰을 STAR_BOARD_TOKEN 시크릿으로 등록하면 활성화됩니다.');
        continue; // 같은 묶음을 stargazers 없이 다시 요청
      }
      chunk.forEach((n, k) => { const d = j.data?.[`r${k}`]; if (d) { applyGql(ctx, n, d); done++; } });
      for (const er of j.errors || []) { const msg = `${(er.path || []).slice(1).join('.')}: ${er.type || ''} ${er.message}`.slice(0, 200); if (!ctx.gqlErr) ctx.gqlErr = new Set(); if (ctx.gqlErr.size < 8 && !ctx.gqlErr.has(msg)) { ctx.gqlErr.add(msg); ctx.log('  GraphQL 오류: ' + msg); } }
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

// ---------------- GitHub "Used by" (dependents) ----------------
async function dependents(ctx, names) {
  let ok = 0;
  await pool(names, 4, async name => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null; const tm = setTimeout(() => ctl?.abort(), 20000);
      try {
        const r = await fetch(`https://github.com/${name}/network/dependents`, { headers: { 'User-Agent': 'Mozilla/5.0 ' + UA, Accept: 'text/html' }, signal: ctl?.signal });
        if (r.status === 429 || r.status >= 500) { await wait(8000); continue; }
        if (!r.ok) return;
        const t = (await r.text()).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        const repos = num((t.match(/([\d,]+) Repositories/) || [])[1]), pkgs = num((t.match(/([\d,]+) Packages/) || [])[1]);
        if (repos != null) { ctx.repos[name].ub = { r: repos, p: pkgs ?? 0 }; ok++; }
        return;
      } catch { await wait(3000); } finally { clearTimeout(tm); }
    }
  });
  ctx.log(`Used by 확인: ${ok}개`);
}

// ---------------- 점수 / 판정 ----------------
function growthFromHistory(ctx, name, stars) {
  const g = {};
  const dates = Object.keys(ctx.snapshots).sort();
  for (const [k, back] of [['d1', 1], ['d7', 7], ['d30', 30]]) {
    const target = isoDaysAgo(back);
    const cand = dates.filter(d => Math.abs(Date.parse(d) - Date.parse(target)) <= 1.5 * DAY && ctx.snapshots[d][name] != null)
      .sort((a, b) => Math.abs(Date.parse(a) - Date.parse(target)) - Math.abs(Date.parse(b) - Date.parse(target)));
    if (cand.length) g[k] = stars - starsOf(ctx.snapshots[cand[0]][name]);
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
  const lk = licKind(r.lic);
  // 실사용량: 패키지 다운로드와 GitHub "Used by" 중 큰 값 (의존 패키지는 저장소보다 가중)
  const adDl = r.dl ? logS(r.dl.m, 1e7) : null;
  // Used by 0은 모노레포(다른 하위 패키지가 기본 선택)나 앱형 저장소일 수 있어 '신호 없음'으로 취급
  const adUb = r.ub && r.ub.r + r.ub.p > 0 ? logS(r.ub.r + r.ub.p * 20, 1e5) : null;
  const adoption = adDl == null && adUb == null ? null : Math.max(adDl ?? 0, adUb ?? 0);
  // 릴리스 품질 (best-of): 2개 이상 / 안정판 / 6개월 내 릴리스
  const relQ = D ? (((D.rel >= 2 ? 1 : 0) + (D.stable ? 1 : 0) + (lrDays != null && lrDays <= 180 ? 1 : 0)) / 3) * 100 : null;
  const comp = {
    activity: [0.18, D && D.c90 != null ? logS(D.c90, 300) : null],
    recency: [0.08, pushedDays == null ? null : pushedDays <= 14 ? 100 : pushedDays <= 60 ? 75 : pushedDays <= 180 ? 45 : pushedDays <= 365 ? 20 : 0],
    community: [0.13, D ? logS(D.ppl, 500) : null],
    issues: [0.10, D && issTot >= 10 ? (D.ci / issTot) * 100 : null],
    closed: [0.04, D ? logS(D.ci, 5000) : null],
    prs: [0.08, D ? logS(D.mp, 2000) : null],
    forks: [0.08, forkRatio == null ? null : clamp((forkRatio / 0.15) * 100)],
    adoption: [0.15, adoption],
    releases: [0.10, relQ],
    watchers: [0.03, D ? logS(D.w, 2000) : null],
    age: [0.03, ageDays == null ? null : ageDays >= 180 ? 100 : 30],
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

  // 활동 상태 (best-of 기본값): 6개월 무활동 = 비활성, 12개월 = 사실상 중단
  const act = pushedDays == null ? null : pushedDays > 365 ? 'dead' : pushedDays > 180 ? 'inactive' : 'active';
  const isNew = ageDays != null && ageDays < 180;
  // 문서/학습형: 코드를 가져다 쓰는 게 아니라 읽는 저장소 (awesome 리스트, 튜토리얼, 면접 대비, 강의, 책, 로드맵)
  const LEARN = /^(awesome.*|tutorials?|education|educational|learning|learn-to-code|interview|interview-questions|interview-preparation|coding-interviews|course|courses|book|books|ebook|roadmap|cheatsheet|guide|resources|study|lecture-notes|exercises|algorithms-and-data-structures|system-design)$/;
  const isDoc = !r.l || r.l === 'Markdown' || (r.t || []).some(x => LEARN.test(x)) || /^awesome[-_]/i.test(r.n.split('/')[1])
    || /\b(tutorials?|interview (questions|preparation|handbook)|learn(ing)? (to|how)|course|curriculum|roadmap|cheat ?sheet|primer)\b/i.test(r.d || '');
  let v;
  if (r.a) v = ['archived', '아카이브됨'];
  else if (trust != null && trust < 50) v = ['bad', '스타 조작 의심'];
  else if (isDoc) v = ['doc', '학습/문서형'];
  else if (act === 'dead') v = ['dead', '사실상 중단'];
  else if (!D) v = ['quick', '심층 분석 대기'];
  else if (util == null) v = ['na', '데이터 부족'];
  else if (pop >= 55 && util >= 55) v = ['good', '검증된 인기'];
  else if (pop >= 55 && adoption != null && adoption >= 80) v = ['mature', '성숙/유지보수'];
  else if (pop >= 55) v = ['hype', '하이프 주의'];
  else if (util >= 55) v = ['gem', '숨은 보석'];
  else v = ['early', '초기/정체'];

  // best-of-lists 방식 프로젝트 품질 점수 (projectrank): 체크 항목 +1, 수치 항목 floor(ln(count/2))
  const ln2 = x => (x == null || x <= 2 ? 0 : Math.floor(Math.log(x / 2)));
  let bo = 0;
  if (r.hp) bo++;
  if (r.d) bo++;
  if (r.lic) bo++;
  if (['perm', 'weak', 'copyleft'].includes(lk)) bo++;
  if (D?.rel >= 2) bo++;
  if (D?.stable) bo++;
  if (lrDays != null && lrDays <= 180) bo++;
  if (pushedDays != null && pushedDays <= 90) bo++;
  if (ageDays != null && ageDays >= 180) bo++;
  bo += ln2(r.s) + ln2(D?.ppl) + ln2(D?.c365) + ln2(r.f) + ln2(r.dl?.m) + ln2(r.ub?.r) + ln2(D?.w) + ln2(D?.ci);

  const why = [];
  const fmt = n => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(Math.round(n)));
  if (g7 != null && g7 >= 500) why.push(['+', `최근 7일 약 +${fmt(g7)} 스타`]);
  if (D?.c90 != null) D.c90 >= 50 ? why.push(['+', `90일 커밋 ${fmt(D.c90)}개`]) : D.c90 < 5 && why.push(['-', `90일 커밋 ${D.c90}개 (개발 정체)`]);
  if (D) D.ppl >= 100 ? why.push(['+', `참여자 ${fmt(D.ppl)}명`]) : D.ppl <= 3 && r.s > 2000 && why.push(['-', `스타 ${fmt(r.s)}개에 참여자 ${D.ppl}명`]);
  if (D && issTot >= 10) D.ci / issTot >= 0.8 ? why.push(['+', `이슈 해결률 ${Math.round((D.ci / issTot) * 100)}%`]) : D.ci / issTot < 0.4 && why.push(['-', `이슈 해결률 ${Math.round((D.ci / issTot) * 100)}%`]);
  if (r.ub && r.ub.r + r.ub.p > 0) why.push([r.ub.r >= 1000 || r.ub.p >= 50 ? '+' : '·', `Used by 저장소 ${fmt(r.ub.r)}개 · 패키지 ${fmt(r.ub.p)}개`]);
  if (r.dl) why.push([r.dl.m >= 1e5 ? '+' : '·', `${r.dl.e} 월 ${fmt(r.dl.m)} 다운로드`]);
  if (D) { if (D.stable && lrDays != null && lrDays <= 180) why.push(['+', `안정 릴리스 ${D.tag || ''} (${Math.round(lrDays)}일 전)`]); else if (!D.rel && !isDoc && r.s > 2000) why.push(['·', '릴리스 없음']); }
  if (forkRatio != null && forkRatio < 0.03 && r.s > 2000 && !r.dl && !r.ub?.r && !isDoc) why.push(['-', `포크/스타 ${(forkRatio * 100).toFixed(1)}% (북마크성 스타 가능성)`]);
  if (act === 'dead') why.push(['-', `1년 넘게 push 없음 (사실상 중단)`]); else if (act === 'inactive') why.push(['-', `6개월 넘게 push 없음 (비활성)`]);
  if (isNew) why.push(['·', `생성 ${Math.round(ageDays)}일차 신규 프로젝트 (검증 기간 짧음)`]);
  if (suspPct != null) suspPct >= 0.25 ? why.push(['-', `최근 스타 계정 ${Math.round(suspPct * 100)}%가 가짜 의심 패턴`]) : suspPct <= 0.08 && why.push(['+', '최근 스타 계정 품질 양호']);
  if (D && D.sgN >= 10 && D.sgSpan > 3 && D.sgBurst / D.sgN > 0.5) why.push(['-', `최근 스타 ${D.sgBurst}/${D.sgN}개가 24시간 안에 몰림`]);
  if (!isDoc) {
    if (lk === 'none') why.push(['-', '라이선스 없음 (원칙적으로 사용 권한 없음)']);
    else if (lk === 'copyleft') why.push(['·', `${r.lic}: 카피레프트 (배포 시 소스 공개 의무 검토)`]);
    else if (lk === 'other') why.push(['·', `라이선스 ${r.lic}: 비표준/제한형일 수 있어 원문 확인 필요`]);
  }

  r.sc = { pop, util, trust, g7: g7 == null ? null : Math.round(g7), v: v[0], vt: v[1], quick: !D, bo, lk, act, isNew,
    comp: Object.fromEntries(Object.entries(comp).map(([k, [, x]]) => [k, x == null ? null : Math.round(x)])) };
  r.why = why.slice(0, 9);
}

// ---------------- 결과 조립 ----------------
function nearestSnap(ctx, back, before) {
  const dates = Object.keys(ctx.snapshots).filter(d => !before || d < before).sort();
  if (!dates.length) return null;
  if (back == null) return dates.at(-1);
  const target = Date.parse(isoDaysAgo(back));
  const best = dates.reduce((a, d) => (Math.abs(Date.parse(d) - target) < Math.abs(Date.parse(a) - target) ? d : a), dates[0]);
  return Math.abs(Date.parse(best) - target) <= 2 * DAY ? best : null;
}

function finalize(ctx) {
  const cfg = ctx.config;
  // 전체 + 언어별 트렌딩의 기간별 증가 스타
  const tg = { daily: {}, weekly: {}, monthly: {} };
  for (const [k, list] of Object.entries(ctx.trending)) { const p = k.split(':')[0]; for (const x of list) if (x.g != null) tg[p][x.n] = Math.max(tg[p][x.n] || 0, x.g); }
  for (const r of Object.values(ctx.repos)) {
    if (r.s != null) r.g = growthFromHistory(ctx, r.n, r.s);
    scoreRepo(r, tg);
  }
  // 점수 변화 (best-of trending up/down): 직전 수집 대비, 7일 전 대비
  const prevD = nearestSnap(ctx, null), wkD = nearestSnap(ctx, 7);
  for (const r of Object.values(ctx.repos)) {
    const sd = {};
    for (const [key, d] of [['1', prevD], ['7', wkD]]) {
      const old = d && ctx.snapshots[d][r.n];
      if (Array.isArray(old)) { if (old[1] != null) sd['p' + key] = r.sc.pop - old[1]; if (old[2] != null && r.sc.util != null) sd['u' + key] = r.sc.util - old[2]; }
    }
    if (Object.keys(sd).length) r.sd = sd;
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
    generatedAt: new Date().toISOString(), mode: ctx.token ? 'deep' : 'quick', starCheck: !!ctx.token && !ctx.noSG,
    deepCount: Object.values(ctx.repos).filter(r => r.deep).length,
    history: { days: snapDates.length, first: snapDates[0] || null, prev: prevD, week: wkD },
    trendingLanguages: cfg.trending.languages, topLanguages: cfg.top.languages, rookieDays: cfg.rookies.days,
    trending: ctx.trending, top, rookies, categories, repos: ctx.repos, errors: ctx.errors.slice(0, 50),
  };
}

// 실행마다 변경 사항 요약 (Release 노트로도 게시)
function buildChanges(ctx, out, siteUrl) {
  const R = out.repos, prevD = out.history.prev, prev = prevD ? ctx.snapshots[prevD] : null;
  const fmt = n => (Math.abs(n) >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(Math.round(n)));
  const link = n => `[${n}](https://github.com/${n})`;
  const line = r => `${link(r.n)} ★${fmt(r.s)} · ${r.sc.vt} · 실효 ${r.sc.util ?? '-'}${r.d ? ` · ${r.d.slice(0, 80)}` : ''}`;
  const L = [`# Star Board ${out.generatedAt.slice(0, 10)}`, '',
    `저장소 ${Object.keys(R).length}개 · 심층 분석 ${out.deepCount}개 · ${prevD ? `비교 기준 ${prevD}` : '첫 수집 (다음 실행부터 변화 비교)'}${siteUrl ? ` · [대시보드](${siteUrl})` : ''}`, ''];
  const sec = (title, rows) => { if (rows.length) L.push(`## ${title}`, '', ...rows.map(x => `- ${x}`), ''); };
  const byG1 = Object.values(R).filter(r => r.g?.d1 > 0).sort((a, b) => b.g.d1 - a.g.d1).slice(0, 15);
  if (byG1.length) sec('스타 급상승 (1일)', byG1.map(r => `+${fmt(r.g.d1)} ${line(r)}`));
  else sec('오늘의 Trending', (ctx.trending['daily:all'] || []).slice(0, 15).map(x => `+${fmt(x.g || 0)} ${line(R[x.n])}`));
  if (prev) sec('신규 진입', Object.values(R).filter(r => !(r.n in prev)).sort((a, b) => b.s - a.s).slice(0, 15).map(line));
  const up = Object.values(R).filter(r => r.sd?.u1 >= 5).sort((a, b) => b.sd.u1 - a.sd.u1).slice(0, 10);
  const down = Object.values(R).filter(r => r.sd?.u1 <= -5).sort((a, b) => a.sd.u1 - b.sd.u1).slice(0, 10);
  sec('실효성 점수 상승', up.map(r => `+${r.sd.u1} ${line(r)}`));
  sec('실효성 점수 하락', down.map(r => `${r.sd.u1} ${line(r)}`));
  sec('새 루키 (7일 내 생성, 스타순)', (out.rookies[7] || []).slice(0, 10).map(n => line(R[n])));
  const flagged = Object.values(R).filter(r => r.sc.v === 'bad').sort((a, b) => b.s - a.s).slice(0, 10);
  sec('스타 조작 의심', flagged.map(line));
  return L.join('\n');
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

async function writeOutputs(fs, path, dir, out, changes) {
  const day = out.generatedAt.slice(0, 10);
  await fs.mkdir(path.join(dir, 'history'), { recursive: true });
  // 스냅샷: [스타, 인기도, 실효성]
  const snap = Object.fromEntries(Object.values(out.repos).filter(r => r.s != null).map(r => [r.n, [r.s, r.sc?.pop ?? null, r.sc?.util ?? null]]));
  await fs.writeFile(path.join(dir, 'history', `${day}.json`), JSON.stringify(snap));
  await fs.writeFile(path.join(dir, 'latest.json'), JSON.stringify(out));
  await fs.writeFile(path.join(dir, 'data.js'), 'window.STAR_BOARD = ' + JSON.stringify(out) + ';\n');
  if (changes) await fs.writeFile(path.join(dir, 'changes.md'), changes);
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
  delete snapshots[new Date().toISOString().slice(0, 10)];
  const ctx = makeCtx({ token, config, snapshots });
  ctx.log(`토큰: ${token ? '있음 (심층 분석)' : '없음 (간이 모드)'}, 과거 스냅샷 ${Object.keys(snapshots).length}일`);
  const tasks = buildTasks(config);
  for (const [i, t] of tasks.entries()) {
    try { await runTask(ctx, t); } catch (e) { ctx.errors.push(`${t.type} ${t.key || t.period + ':' + t.lang}: ${e.message}`); ctx.log('  실패: ' + e.message); }
    if (i % 10 === 0) ctx.log(`수집 ${i + 1}/${tasks.length}, 저장소 ${Object.keys(ctx.repos).length}개`);
  }
  const order = enrichOrder(ctx);
  if (token) await enrich(ctx, order.slice(0, config.enrich.max));
  await downloads(ctx, order.slice(0, config.downloads.max));
  const ubTargets = Object.values(ctx.repos).filter(r => !r.a && r.l && r.l !== 'Markdown').sort((a, b) => (b.s || 0) - (a.s || 0)).slice(0, config.dependents.max).map(r => r.n);
  await dependents(ctx, ubTargets);
  const out = finalize(ctx);
  const repoEnv = process.env.GITHUB_REPOSITORY;
  const siteUrl = repoEnv ? `https://${repoEnv.split('/')[0]}.github.io/${repoEnv.split('/')[1]}/` : null;
  await writeOutputs(fs, path, dir, out, buildChanges(ctx, out, siteUrl));
  ctx.log(`완료: 저장소 ${Object.keys(out.repos).length}개, 심층 ${out.deepCount}개, 오류 ${ctx.errors.length}건`);
}

if (typeof process !== 'undefined' && /collect\.mjs$/.test(process.argv?.[1] || '')) {
  main().catch(e => { console.error(e); process.exit(1); });
}
