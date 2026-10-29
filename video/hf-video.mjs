#!/usr/bin/env node
// GitHub Star Board - HyperFrames 영상 생성기
//   node video/hf-video.mjs --type daily,spotlight,weekly --out out
// 영상 종류
//   daily     : 오늘 급상승 Top 5 쇼츠 (1080x1920)
//   spotlight : 오늘 급상승 저장소 3개를 각각 소개하는 쇼츠 (README의 설명/기능/설치/데모 이미지)
//   weekly    : 주간 리포트 (1920x1080)
// 필요: data/latest.json, Node 22+, ffmpeg/ffprobe, edge-tts, npm i hyperframes gsap

const VOICE = (typeof process !== 'undefined' && process.env.TTS_VOICE) || 'ko-KR-SunHiNeural';
const RATE = (typeof process !== 'undefined' && process.env.TTS_RATE) || '+6%';
const HEAD = 0.35, GAP = 0.18, TAIL = 0.45;

// ---------------- 공통 도우미 ----------------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const short = n => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k' : String(Math.round(n || 0)));
const nk = n => { n = Math.round(n || 0); if (n >= 1e4) { const a = Math.floor(n / 1e4), b = Math.floor((n % 1e4) / 1e3); return `${a}만${b ? ` ${b}천` : ''}`; } if (n >= 1e3) { const a = Math.floor(n / 1e3), b = Math.floor((n % 1e3) / 100); return `${a}천${b ? ` ${b}백` : ''}`; } return String(n); };
const spoken = n => { const [o, r] = n.split('/'); return `${o.replace(/[-_.]/g, ' ')}의 ${r.replace(/[-_.]/g, ' ')}`; };
const VKO = { good: '검증된 인기', mature: '성숙/유지보수', gem: '숨은 보석', hype: '하이프 주의', early: '초기/정체', bad: '참여 대비 스타 과다', doc: '학습/문서형', dead: '사실상 중단', archived: '아카이브됨', quick: '분석 대기', na: '데이터 부족' };
const VCOL = { good: '#3fb950', mature: '#a371f7', gem: '#a371f7', hype: '#e3b341', bad: '#f85149', doc: '#39c5cf', dead: '#8b949e', archived: '#8b949e', early: '#8b949e', quick: '#8b949e', na: '#8b949e' };
const SAY = {
  c90hi: p => `최근 90일 커밋이 ${nk(p.n)}개`, c90lo: p => `최근 90일 커밋은 ${p.n}개뿐`, pplhi: p => `참여자가 ${nk(p.n)}명`, ppllo: p => `참여자는 ${p.n}명뿐`,
  iss: p => `이슈 해결률 ${p.p}퍼센트`, ub: p => `${nk(p.r)}개 저장소가 가져다 쓰고 있고`, dl: p => `월 다운로드가 ${nk(p.n)}회`, rel: () => `최근 정식 버전도 냈어요`,
  norel: () => `정식 릴리스는 아직 없어요`, dead: () => `1년 넘게 업데이트가 없어요`, inactive: () => `6개월 넘게 업데이트가 없어요`,
  licnone: () => `라이선스가 없어서 사용에 주의가 필요해요`, copyleft: p => `${p.lic} 라이선스라 상업적으로 쓸 땐 확인이 필요해요`,
};
const ev = (r, sign, max = 1) => (r.wc || []).filter(([s, c]) => s === sign && SAY[c]).slice(0, max).map(([, c, p]) => SAY[c](p || {}));
function verdictLine(r, max = 1) {
  const v = r.sc?.v, pos = ev(r, '+', max), neg = ev(r, '-', max);
  if (v === 'good') return `${pos.length ? pos.join(', ') + '. ' : ''}검증된 인기예요.`;
  if (v === 'hype') return `그런데 ${neg.length ? neg.join(', ') : '실사용 신호가 약해요'}. 하이프 주의예요.`;
  if (v === 'gem') return `${pos.join(', ') || '관리가 탄탄해요'}. 숨은 보석이에요.`;
  if (v === 'mature') return `개발은 느려졌지만 ${pos.join(', ') || '실사용이 많아요'}. 성숙한 프로젝트예요.`;
  if (v === 'doc') return `코드보다는 읽는 자료에 가까운 학습형 저장소예요.`;
  if (v === 'dead') return `하지만 1년 넘게 업데이트가 없어요.`;
  if (v === 'bad') return `다만 스타에 비해 지켜보는 사람과 참여가 같은 규모보다 크게 적어요.`;
  return `${neg[0] || pos[0] || '아직 판단할 근거가 부족해요'}.`;
}
const chips = r => (r.why || []).filter(w => w[0] !== '·').slice(0, 3);
const noUrl = s => String(s || '').replace(/https?:\/\/\S+/g, '').replace(/\s+([.,])/g, '$1').trim();
const cut = (s, n) => { s = noUrl(s); if (s.length <= n) return s; const m = s.slice(0, n).match(/^(.*[.。!?,，、])\s/); return (m && m[1].length > n * 0.5 ? m[1] : s.slice(0, n - 1) + '…'); };

// ---------------- README 분석 ----------------
const FEAT_H = /(feature|highlight|why|what (it|does|can)|key|capabilit|overview|기능|특징|주요|특長|功能|特性|亮点)/i;
const INSTALL = /^(\$\s*)?(npm (i|install)|pnpm (add|i|dlx)|yarn (add|dlx)|npx |bunx? |pip3? install|pipx install|uv (add|tool install|pip install)|uvx |cargo (install|add)|brew install|go (install|get)|docker (run|pull|compose)|curl .*\|\s*(ba)?sh|winget install|scoop install|gem install|composer require|dotnet add|claude (plugin|mcp)|npx skills add)/i;
const BAD_IMG = /shields\.io|badge|trendshift|star-history|starchart|contrib\.rocks|readme-stats|visitor|komarev|codecov|hits\.|discord|twitter|x\.com\/|buymeacoffee|ko-fi|producthunt|sponsor|\.svg(\?|$)|avatars\.githubusercontent|gravatar|logo|icon|favicon|banner-small/i;
function absUrl(u, n, base = '') {
  u = u.trim().replace(/^<|>$/g, '');
  if (/^https?:\/\//.test(u)) return u.replace(/^https:\/\/github\.com\/([^/]+\/[^/]+)\/blob\//, 'https://raw.githubusercontent.com/$1/');
  if (u.startsWith('//')) return 'https:' + u;
  const p = (base + u).replace(/^\.\//, '').replace(/\/\.\//g, '/');
  return `https://raw.githubusercontent.com/${n}/HEAD/${p.replace(/^\//, '')}`;
}
function cleanMd(t) {
  return t.replace(/<[^>]+>/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`~]+/g, '')
    .replace(/:[a-z0-9_+-]+:/g, '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim();
}
function extractReadme(md, n) {
  let s = md.replace(/<!--[\s\S]*?-->/g, '').replace(/<details[\s\S]*?<\/details>/gi, '').replace(/\r/g, '');
  const imgs = [];
  for (const m of s.matchAll(/!\[[^\]]*\]\(\s*([^)\s]+)[^)]*\)/g)) imgs.push(m[1]);
  for (const m of s.matchAll(/<(?:img|source|video)[^>]+src=["']([^"']+)["']/gi)) imgs.push(m[1]);
  for (const m of s.matchAll(/^(https:\/\/github\.com\/user-attachments\/assets\/[0-9a-f-]+)\s*$/gim)) imgs.push(m[1]);
  const media = [...new Set(imgs.map(u => absUrl(u, n)))].filter(u => !BAD_IMG.test(u)).slice(0, 6);
  // 코드 블록에서 설치 명령
  let install = null; const cmds = [];
  for (const m of s.matchAll(/```[^\n]*\n([\s\S]*?)```/g)) {
    const ls = m[1].split('\n').map(l => l.trim());
    ls.forEach((l, i) => { if (!INSTALL.test(l)) return; let c = l.replace(/^\$\s*/, ''); let k = i; while (c.endsWith('\\') && k + 1 < ls.length && k < i + 2) { k++; c = c.slice(0, -1).trim() + ' ' + ls[k]; } cmds.push(c.replace(/\s*\\$/, '').trim()); });
  }
  const rn = n.split('/')[1].toLowerCase();
  const pri = c => (c.toLowerCase().includes(rn) ? -1 : 0) + (/^(npm|pnpm|yarn|pip|pipx|uv|uvx|brew|cargo|go|npx|bunx?|gem|winget|scoop|claude|composer|dotnet)\b/.test(c) && !/^(bun|npm|pnpm|yarn) (install|i)$/.test(c) ? 0 : /^curl/.test(c) ? 1 : 2);
  cmds.sort((a, b) => pri(a) - pri(b) || a.length - b.length);
  if (cmds.length) install = cmds[0].length > 90 ? cmds[0].slice(0, 88) + '…' : cmds[0];
  if (!install) { const m = s.match(/`((?:npm i|npm install|pip install|brew install|cargo install|npx |uvx |go install)[^`]{2,80})`/); if (m) install = m[1]; }
  // 기능 목록: 기능 관련 제목 아래 bullet, 없으면 문서 앞부분 bullet
  const lines = s.split('\n'); let feats = [], inSec = false;
  const bullet = l => (l.match(/^\s{0,3}(?:[-*+]|\d+[.)])\s+(.+)/) || [])[1];
  const split = raw => { // "**제목** — 설명" / "제목: 설명" / "제목. 설명"
    let m = raw.match(/^\*\*([^*]{3,80})\*\*[\s:.\-—–]*(.*)$/) || raw.match(/^__([^_]{3,80})__[\s:.\-—–]*(.*)$/);
    let t, d; if (m) { t = cleanMd(m[1]).replace(/[.:]$/, ''); d = cleanMd(m[2]); } else { const c = cleanMd(raw); const k = c.search(/\s[—–-]\s|:\s|\.\s/); if (k > 8 && k < 70) { t = c.slice(0, k).trim(); d = c.slice(k).replace(/^[\s—–:.-]+/, '').trim(); } else { t = c; d = ''; } }
    return { t, d };
  };
  const good = f => f.t && f.t.split(/\s+/).length >= 2 && !/[:：]$/.test(f.t) && !/^(https?:|install|license|star|sponsor|register|run |see |click|note|step \d)/i.test(f.t) && (f.d.length >= 10 || f.t.split(/\s+/).length >= 5);
  for (const l of lines) {
    const h = l.match(/^#{1,4}\s+(.+)/);
    if (h) { if (feats.length >= 3) break; inSec = FEAT_H.test(h[1]); continue; }
    const b = inSec && bullet(l);
    if (b) { const f = split(b); if (good(f)) feats.push(f); }
  }
  if (feats.length < 3) {
    feats = [];
    for (const l of lines.slice(0, Math.ceil(lines.length * 0.5))) { const b = bullet(l); if (b) { const f = split(b); if (good(f) && f.d.length >= 10) feats.push(f); } if (feats.length >= 5) break; }
  }
  // 첫 문단
  let para = '';
  for (const block of s.split(/\n\s*\n/)) { const t = cleanMd(block); if (!/^#/.test(block.trim()) && t.length >= 50 && !/^(\||-|\*)/.test(block.trim()) && !/```/.test(block)) { para = t; break; } }
  const ko = (s.match(/\(?(?:href=["'])?([^\s()"'<>]*README[._-]?(?:ko|kr|ko[-_]kr)[^\s()"'<>]*\.md)/i) || [])[1] || null;
  return { media, install, feats: feats.slice(0, 3).map(f => ({ t: f.t.slice(0, 90), d: f.d.slice(0, 200) })), para: para.replace(/https?:\/\/\S+/g, '').slice(0, 400), koReadme: ko ? absUrl(ko, n) : null };
}

// ---------------- 장면 구성 (HTML + GSAP) ----------------
// 각 장면: { say: [문장...], html: (p, F) => markup, anim: (p, S, D, M, F) => gsap 코드 문자열, media?: [{file,kind,box}] }
// F = { vert, W, H }
const css = F => `
*{box-sizing:border-box;margin:0;padding:0}
body,html{background:#0b0f17}
#root{position:relative;width:${F.W}px;height:${F.H}px;overflow:hidden;background:#0b0f17;color:#e6edf3;font-family:"Noto Sans CJK KR","Noto Sans KR","Malgun Gothic",sans-serif}
.bg{position:absolute;inset:-20%;opacity:.55}
.blob{position:absolute;border-radius:50%}
.grid{position:absolute;inset:0;background-image:linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px);background-size:${F.vert ? 72 : 80}px ${F.vert ? 72 : 80}px}
.scene{position:absolute;inset:0;padding:${F.vert ? '230px 76px 420px' : '90px 130px 170px'};display:flex;flex-direction:column;justify-content:center}
.brand{position:absolute;top:${F.vert ? 96 : 44}px;left:${F.vert ? 76 : 130}px;font-size:${F.vert ? 32 : 26}px;color:#8b949e;letter-spacing:.5px}.brand b{color:#e6edf3}
.prog{position:absolute;top:0;left:0;height:${F.vert ? 10 : 8}px;width:100%;background:linear-gradient(90deg,#2f81f7,#a371f7,#f78166);transform-origin:left center}
.cap{position:absolute;left:${F.vert ? 60 : 220}px;right:${F.vert ? 60 : 220}px;bottom:${F.vert ? 170 : 56}px;text-align:center}
.cap span{display:inline-block;background:#000000c8;border-radius:18px;padding:${F.vert ? '20px 30px' : '14px 26px'};font-size:${F.vert ? 46 : 36}px;line-height:1.35;font-weight:700;color:#fff;box-shadow:0 10px 40px #0008}
.kicker{font-size:${F.vert ? 36 : 30}px;color:#f78166;font-weight:700;letter-spacing:1px}
.h1{font-size:${F.vert ? 112 : 104}px;font-weight:900;line-height:1.05;letter-spacing:-1px}
.h1 .w{display:inline-block}
.sub{font-size:${F.vert ? 44 : 38}px;color:#c9d1d9;line-height:1.4;margin-top:24px}
.owner{font-size:${F.vert ? 42 : 36}px;color:#8b949e}
.repo{font-size:${F.vert ? 92 : 84}px;font-weight:900;line-height:1.05;word-break:break-all;letter-spacing:-1px}
.desc{font-size:${F.vert ? 40 : 32}px;color:#c9d1d9;line-height:1.45;margin-top:22px}
.tiles{display:flex;gap:${F.vert ? 18 : 22}px;margin-top:34px;flex-wrap:wrap}
.tile{background:#161b22d9;border:2px solid #30363d;border-radius:22px;padding:${F.vert ? '20px 26px' : '18px 26px'};min-width:${F.vert ? 200 : 220}px}
.tile .k{font-size:${F.vert ? 28 : 24}px;color:#8b949e}.tile .v{font-size:${F.vert ? 72 : 60}px;font-weight:900;line-height:1.1}
.gauge{height:${F.vert ? 28 : 22}px;background:#21262d;border-radius:30px;overflow:hidden;margin-top:30px;width:100%}.gauge i{display:block;height:100%;width:100%;border-radius:30px;transform-origin:left center}
.glabel{font-size:${F.vert ? 30 : 24}px;color:#8b949e;margin-top:10px}
.stamp{display:inline-block;align-self:flex-start;border:6px solid;border-radius:22px;padding:${F.vert ? '12px 30px' : '10px 26px'};font-size:${F.vert ? 58 : 48}px;font-weight:900;margin-top:30px;transform:rotate(-4deg)}
.chip{font-size:${F.vert ? 36 : 30}px;color:#c9d1d9;margin-top:14px}.chip b{margin-right:12px}
.rank{font-size:${F.vert ? 240 : 200}px;font-weight:900;line-height:.9;color:#f78166;text-shadow:0 10px 50px #f7816655}
.feat{display:flex;gap:26px;align-items:flex-start;background:#161b22d9;border:2px solid #30363d;border-radius:26px;padding:${F.vert ? '28px 30px' : '24px 30px'};margin-top:22px}
.feat .n{flex:none;width:${F.vert ? 72 : 64}px;height:${F.vert ? 72 : 64}px;border-radius:50%;background:#2f81f7;color:#fff;font-size:${F.vert ? 40 : 34}px;font-weight:900;display:flex;align-items:center;justify-content:center}
.feat .t{font-size:${F.vert ? 42 : 36}px;line-height:1.3;font-weight:800}.feat .fd{font-size:${F.vert ? 32 : 28}px;line-height:1.4;color:#a8b3bf;margin-top:8px}
.term{background:#0d1117;border:2px solid #30363d;border-radius:22px;overflow:hidden;box-shadow:0 30px 80px #0009;margin-top:34px}
.term .bar{background:#161b22;padding:16px 22px;display:flex;gap:10px}.term .bar i{width:18px;height:18px;border-radius:50%;display:block}
.term pre{padding:${F.vert ? '34px 30px' : '30px 34px'};font-family:"Noto Sans Mono CJK KR","DejaVu Sans Mono",monospace;font-size:${F.vert ? 40 : 38}px;color:#3fb950;white-space:pre-wrap;word-break:break-all;min-height:${F.vert ? 120 : 110}px}
.cursor{display:inline-block;width:.6em;height:1em;background:#3fb950;vertical-align:-.12em;margin-left:4px}
.frame{position:relative;background:#161b22;border:2px solid #30363d;border-radius:24px;overflow:hidden;box-shadow:0 40px 100px #000a}
.frame .bar{background:#21262d;padding:14px 20px;display:flex;gap:10px;align-items:center;font-size:24px;color:#8b949e}.frame .bar i{width:16px;height:16px;border-radius:50%;display:block}
.shot{width:100%;height:100%;object-fit:contain;background:#0d1117;display:block}
.row{display:flex;gap:22px;align-items:baseline;background:#161b22d9;border:2px solid #30363d;border-radius:20px;padding:20px 28px;margin-top:16px}
.row .n{font-size:${F.vert ? 46 : 40}px;font-weight:800;word-break:break-all}.row .m{font-size:${F.vert ? 30 : 26}px;color:#8b949e}
.cells{display:grid;grid-template-columns:repeat(${F.vert ? 2 : 3},1fr);gap:16px;margin-top:30px}
.cell{background:#161b22d9;border:2px solid #30363d;border-radius:18px;padding:18px 22px}.cell .t{font-size:24px;color:#8b949e}.cell .n{font-size:30px;font-weight:800;word-break:break-all;margin-top:4px}
.url{font-size:${F.vert ? 50 : 46}px;color:#58a6ff;font-weight:900;margin-top:30px;word-break:break-all}
.starbtn{display:inline-flex;align-self:flex-start;gap:14px;align-items:center;margin-top:36px;background:#238636;color:#fff;border-radius:18px;padding:18px 32px;font-size:${F.vert ? 40 : 34}px;font-weight:800}
`;

// 공통 애니메이션 조각
const A = {
  enter: (p, S) => `tl.from('#${p}',{opacity:0,y:70,duration:.55,ease:'power3.out'},${S});`,
  exit: (p, S, D) => `tl.to('#${p}',{opacity:0,y:-50,duration:.35,ease:'power2.in'},${(S + D - 0.36).toFixed(2)});`,
  words: (sel, at) => `tl.from('${sel} .w',{opacity:0,y:90,rotate:6,duration:.6,stagger:.08,ease:'back.out(1.8)'},${at});`,
  count: (sel, to, at, dur = 1.3) => { const [div, , snap] = unitOf(Math.round(to || 0)); const v = +(Math.round(to || 0) / div).toFixed(snap < 1 ? 1 : 0); return `tl.fromTo('${sel} .num',{innerText:0},{innerText:${v},snap:{innerText:${snap}},duration:${dur},ease:'power2.out'},${at.toFixed ? at.toFixed(2) : at});`; },
  gauge: (sel, pct, at) => `tl.fromTo('${sel}',{scaleX:0},{scaleX:${Math.max(0.02, (pct || 0) / 100)},duration:1.1,ease:'power3.out'},${at});`,
  stamp: (sel, at) => `tl.from('${sel}',{scale:2.4,opacity:0,rotate:-18,duration:.45,ease:'back.out(2.2)'},${at});`,
  stagger: (sel, at, st = 0.18) => `tl.from('${sel}',{opacity:0,x:-60,duration:.45,stagger:${st},ease:'power3.out'},${at});`,
  pop: (sel, at) => `tl.from('${sel}',{opacity:0,scale:.6,duration:.5,ease:'back.out(2)'},${at});`,
  type: (sel, text, at, dur) => `tl.from('${sel} .ch',{opacity:0,duration:.01,stagger:${(dur / Math.max(1, [...String(text)].length)).toFixed(3)},ease:'none'},${at.toFixed ? at.toFixed(2) : at});`,
};
const words = t => t.split(/\s+/).map(w => `<span class="w">${esc(w)}</span>`).join(' ');
const unitOf = v => (v >= 1e6 ? [1e6, 'M', 0.1] : v >= 1e4 ? [1e3, 'k', 1] : v >= 1e3 ? [1e3, 'k', 0.1] : [1, '', 1]);
const num = (v, prefix = '') => `${prefix}<span class="num">0</span>${unitOf(Math.round(v || 0))[1]}`;
const typed = t => [...String(t)].map(c => `<span class="ch">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('');

// 저장소 카드 (순위형)
function rankScene(r, rank, gainLabel, gain, F, sayMax = 1) {
  const [o, n] = r.n.split('/'), v = r.sc?.v, col = VCOL[v] || '#8b949e';
  return {
    say: [`${rank}위, ${spoken(r.n)}. ${gainLabel === '오늘' ? '하루 만에' : '이번 주'} 스타 ${nk(gain)}개.`, verdictLine(r, sayMax)],
    caps: [null, null],
    html: p => `<div class="brand">★ <b>GitHub Star Board</b> · ${gainLabel} 급상승</div>
      <div style="display:flex;align-items:flex-end;gap:34px"><div class="rank" id="${p}r">${rank}</div><div><div class="owner">${esc(o)} /</div><div class="repo">${esc(n)}</div></div></div>
      <div class="desc">${esc(cut(r.d, F.vert ? 120 : 170))}</div>
      <div class="tiles"><div class="tile" id="${p}t1"><div class="k">${gainLabel} 증가</div><div class="v" style="color:#3fb950" id="${p}g">${num(gain, '+')}</div></div>
        <div class="tile" id="${p}t2"><div class="k">누적 스타</div><div class="v" id="${p}s">${num(r.s)}</div></div>
        <div class="tile" id="${p}t3"><div class="k">실효성</div><div class="v" style="color:${col}" id="${p}u">${num(r.sc?.util)}</div></div></div>
      <div class="gauge"><i id="${p}gg" style="background:${col}"></i></div><div class="glabel">실효성 ${r.sc?.util ?? '-'} / 100 · 커밋 · 참여자 · 이슈 · 다운로드 기준</div>
      <div class="stamp" id="${p}st" style="color:${col};border-color:${col}">${esc(VKO[v] || v)}</div>
      ${chips(r).map(([s, t], i) => `<div class="chip" id="${p}c${i}"><b style="color:${s === '+' ? '#3fb950' : '#f85149'}">${s === '+' ? '▲' : '▼'}</b>${esc(t)}</div>`).join('')}`,
    anim: (p, S, D, M) => [
      `tl.from('#${p}r',{rotateX:-90,opacity:0,y:-40,duration:.6,ease:'back.out(1.6)'},${S + 0.05});`,
      `tl.from('#${p} .repo',{opacity:0,x:80,duration:.5,ease:'power3.out'},${S + 0.15});`,
      `tl.from(['#${p}t1','#${p}t2','#${p}t3'],{opacity:0,y:50,duration:.45,stagger:.12,ease:'power3.out'},${S + 0.35});`,
      A.count(`#${p}g`, gain, S + 0.45, 1.2), A.count(`#${p}s`, r.s, S + 0.55, 1.3), A.count(`#${p}u`, r.sc?.util ?? 0, S + 0.65, 1.2),
      A.gauge(`#${p}gg`, r.sc?.util, S + 0.7), A.stamp(`#${p}st`, M[1] ?? S + 2), A.stagger(`#${p} .chip`, (M[1] ?? S + 2) + 0.25, 0.16),
    ].join('\n'),
  };
}

function introScene(title1, title2, sub, kicker, sayLine) {
  return {
    say: [sayLine], caps: [null],
    html: p => `<div class="brand">★ <b>GitHub Star Board</b></div><div class="kicker" id="${p}k">${esc(kicker)}</div>
      <div class="h1" id="${p}h" style="margin-top:20px">${words(title1)}<br>${words(title2)}</div><div class="sub" id="${p}s">${sub}</div>`,
    anim: (p, S) => [`tl.from('#${p}k',{opacity:0,x:-40,duration:.4},${S + 0.05});`, A.words(`#${p}h`, S + 0.15), `tl.from('#${p}s',{opacity:0,y:30,duration:.5},${S + 0.9});`].join('\n'),
  };
}
function outroScene(site, F, line = '전체 순위와 판정 근거는 설명란 링크에서 확인하세요.') {
  const host = site.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return {
    say: [line], caps: [null],
    html: p => `<div class="brand">★ <b>GitHub Star Board</b></div><div class="h1" id="${p}h">${words('전체 순위와')}<br>${words('근거는 여기')}</div>
      <div class="url" id="${p}u">${typed(host)}</div><div class="sub" id="${p}s">매일 아침 자동 업데이트 · 저장소별 근거 페이지 · AI용 데이터(llms.txt)</div><div class="starbtn" id="${p}b">★ Star on GitHub</div>`,
    anim: (p, S, D) => [A.words(`#${p}h`, S + 0.1), A.type(`#${p}u`, host, S + 0.7, 1.1), `tl.from('#${p}s',{opacity:0,y:30,duration:.5},${S + 1.6});`,
      A.pop(`#${p}b`, S + 1.9), `tl.to('#${p}b',{scale:1.08,duration:.35,yoyo:true,repeat:${Math.max(1, Math.floor((D - 2.5) / 0.7) * 2 - 1)},ease:'sine.inOut'},${S + 2.5});`].join('\n'),
  };
}

// 저장소 소개 (스포트라이트) 장면들
function spotlightScenes(r, info, gain, site, F) {
  const [o, n] = r.n.split('/'), v = r.sc?.v, col = VCOL[v] || '#8b949e', sc = [];
  sc.push({
    say: [`오늘 스타 ${nk(gain)}개를 받은 ${spoken(r.n)}.`], caps: [null],
    html: p => `<div class="brand">★ <b>GitHub Star Board</b> · 오늘의 저장소</div><div class="kicker" id="${p}k">TODAY'S PICK</div>
      <div class="owner" style="margin-top:26px" id="${p}o">${esc(o)} /</div><div class="repo" id="${p}n" style="font-size:${F.vert ? 120 : 110}px">${words(n.replace(/[-_]/g, ' '))}</div>
      <div class="tiles"><div class="tile" id="${p}t1"><div class="k">오늘 증가</div><div class="v" style="color:#3fb950" id="${p}g">${num(gain, '+')}</div></div><div class="tile" id="${p}t2"><div class="k">누적 스타</div><div class="v" id="${p}s">${num(r.s)}</div></div>${r.l ? `<div class="tile" id="${p}t3"><div class="k">언어</div><div class="v" style="font-size:${F.vert ? 48 : 42}px;line-height:1.6">${esc(r.l)}</div></div>` : ''}</div>`,
    anim: (p, S) => [`tl.from('#${p}k',{opacity:0,letterSpacing:'20px',duration:.6},${S});`, `tl.from('#${p}o',{opacity:0,x:-40,duration:.4},${S + 0.15});`, A.words(`#${p}n`, S + 0.25),
      `tl.from('#${p} .tile',{opacity:0,y:50,duration:.45,stagger:.12},${S + 0.7});`, A.count(`#${p}g`, gain, S + 0.8, 1.1), A.count(`#${p}s`, r.s, S + 0.9, 1.3)].join('\n'),
  });
  const descKo = info.descKo || r.d || '';
  sc.push({
    say: [cut(descKo, 90)].filter(Boolean), caps: [null], media: info.media,
    html: (p, F2, t) => `<div class="brand">★ <b>GitHub Star Board</b> · ${esc(n)}</div><div class="kicker">무엇인가요?</div><div class="sub" id="${p}d" style="margin-top:14px;font-weight:700;color:#e6edf3">${esc(cut(descKo, 90))}</div>
      <div class="frame" id="${p}f" style="margin-top:34px;height:${F.vert ? 720 : 520}px"><div class="bar"><i style="background:#f85149"></i><i style="background:#e3b341"></i><i style="background:#3fb950"></i><span style="margin-left:10px">github.com/${esc(r.n)}</span></div>
      ${info.media?.kind === 'image' ? `<div style="position:absolute;inset:58px 0 0 0;overflow:hidden"><img class="shot" id="${p}img" src="${esc(info.media.src)}"></div>` : ''}${info.media?.kind === 'video' && t ? `<div style="position:absolute;inset:58px 0 0 0;overflow:hidden;background:#0d1117"><video class="clip shot" id="${p}v" src="${esc(info.media.src)}" muted playsinline data-start="${(t.S + 0.3).toFixed(2)}" data-duration="${(t.D - 0.3).toFixed(2)}" data-track-index="3"></video></div>` : ''}</div>`,
    anim: (p, S, D) => [`tl.from('#${p}d',{opacity:0,y:30,duration:.5},${S + 0.05});`, `tl.from('#${p}f',{opacity:0,y:120,rotateX:18,duration:.8,ease:'power3.out'},${S + 0.25});`,
      info.media?.kind === 'image' ? `tl.fromTo('#${p}img',{scale:1.02},{scale:1.14,duration:${(D - 0.6).toFixed(2)},ease:'none'},${S + 0.4});` : ''].join('\n'),
  });
  if (info.featsKo?.length >= 2) {
    const fs = info.featsKo.slice(0, 3).map(f => ({ t: cut(f.t, 34), d: cut(f.d, F.vert ? 60 : 80), full: f.d || '' }));
    sc.push({
      say: ['주요 기능은 이래요.', ...fs.map((f, i) => `${['첫째', '둘째', '셋째'][i]}, ${f.t}.${f.full && f.full.length <= 36 ? ' ' + f.full : ''}`)], caps: [null, ...fs.map(() => null)],
      html: p => `<div class="brand">★ <b>GitHub Star Board</b> · ${esc(n)}</div><div class="kicker">KEY FEATURES</div><div class="h1" style="font-size:${F.vert ? 84 : 76}px">${words('주요 기능')}</div>
        ${fs.map((f, i) => `<div class="feat" id="${p}f${i}"><div class="n">${i + 1}</div><div><div class="t">${esc(f.t)}</div>${f.d ? `<div class="fd">${esc(f.d)}</div>` : ''}</div></div>`).join('')}`,
      anim: (p, S, D, M) => [A.words(`#${p} .h1`, S + 0.05), ...fs.map((_, i) => `tl.from('#${p}f${i}',{opacity:0,x:120,duration:.5,ease:'power3.out'},${((M[i + 1] ?? S + 1 + i) - 0.1).toFixed(2)});tl.fromTo('#${p}f${i} .n',{background:'#2f81f7'},{background:'#3fb950',duration:.3},${((M[i + 1] ?? S + 1 + i) + 0.3).toFixed(2)});`)].join('\n'),
    });
  }
  if (info.install) {
    sc.push({
      say: ['시작은 명령어 한 줄이면 돼요.'], caps: [null],
      html: p => `<div class="brand">★ <b>GitHub Star Board</b> · ${esc(n)}</div><div class="kicker">GET STARTED</div><div class="h1" style="font-size:${F.vert ? 84 : 76}px">${words('설치는 한 줄')}</div>
        <div class="term" id="${p}t"><div class="bar"><i style="background:#f85149"></i><i style="background:#e3b341"></i><i style="background:#3fb950"></i></div><pre><span style="color:#8b949e">$ </span><span id="${p}c">${typed(info.install)}</span><span class="cursor" id="${p}cur"></span></pre></div>`,
      anim: (p, S, D) => [A.words(`#${p} .h1`, S + 0.05), `tl.from('#${p}t',{opacity:0,y:80,duration:.5,ease:'power3.out'},${S + 0.3});`, A.type(`#${p}c`, info.install, S + 0.7, Math.min(2.2, Math.max(1, info.install.length / 22))),
        `tl.to('#${p}cur',{opacity:0,duration:.01,repeat:${Math.max(1, Math.floor(D / 0.5))},yoyo:true,repeatDelay:.25},${S + 0.4});`].join('\n'),
    });
  }
  sc.push({
    say: [`스타 보드 판정은 ${VKO[v] || '분석 대기'}.`, verdictLine(r, 2)], caps: [null, null],
    html: p => `<div class="brand">★ <b>GitHub Star Board</b> · ${esc(n)}</div><div class="kicker">REALITY CHECK</div><div class="h1" style="font-size:${F.vert ? 84 : 76}px">${words('진짜 쓰일까?')}</div>
      <div class="tiles"><div class="tile"><div class="k">실효성</div><div class="v" style="color:${col}" id="${p}u">${num(r.sc?.util)}</div></div><div class="tile"><div class="k">인기도</div><div class="v" id="${p}p">${num(r.sc?.pop)}</div></div>${r.sc?.trust != null ? `<div class="tile"><div class="k">정합성</div><div class="v" id="${p}c">${num(r.sc.trust)}</div></div>` : ''}</div>
      <div class="gauge"><i id="${p}gg" style="background:${col}"></i></div>
      <div class="stamp" id="${p}st" style="color:${col};border-color:${col}">${esc(VKO[v] || v)}</div>
      ${chips(r).map(([s, t], i) => `<div class="chip"><b style="color:${s === '+' ? '#3fb950' : '#f85149'}">${s === '+' ? '▲' : '▼'}</b>${esc(t)}</div>`).join('')}`,
    anim: (p, S, D, M) => [A.words(`#${p} .h1`, S + 0.05), `tl.from('#${p} .tile',{opacity:0,y:50,duration:.45,stagger:.12},${S + 0.35});`, A.count(`#${p}u`, r.sc?.util ?? 0, S + 0.45, 1.2), A.count(`#${p}p`, r.sc?.pop ?? 0, S + 0.55, 1.2),
      r.sc?.trust != null ? A.count(`#${p}c`, r.sc.trust, S + 0.65, 1.2) : '', A.gauge(`#${p}gg`, r.sc?.util, S + 0.6), A.stamp(`#${p}st`, M[0] + 0.5), A.stagger(`#${p} .chip`, M[1] ?? S + 2.2, 0.18)].join('\n'),
  });
  sc.push(outroScene(site, F, '근거와 다른 저장소는 설명란 링크에서 확인하세요.'));
  return sc;
}

// ---------------- 영상 목록 ----------------
function buildSpecs(data, types, site, infos = {}) {
  const R = data.repos, gen = new Date(data.generatedAt), kst = new Date(gen.getTime() + 9 * 36e5), md = `${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일`, day = data.generatedAt.slice(0, 10);
  const P = { vert: true, W: 1080, H: 1920 }, L = { vert: false, W: 1920, H: 1080 };
  const pick = (k, n) => (data.trending[k] || []).filter(x => R[x.n]?.sc).slice(0, n).map(x => ({ r: R[x.n], g: x.g }));
  const specs = [];
  if (types.includes('daily')) {
    const top = pick('daily:all', 5);
    specs.push({ id: `daily-${day}`, F: P, title: `오늘 GitHub 급상승 Top 5 (${md}) | 스타 말고 실사용으로 본 순위 #shorts`, list: top, scenes: [
      introScene('오늘 GitHub', `급상승 Top ${top.length}`, `스타만 보지 말고 <b style="color:#3fb950">진짜 쓰이는지</b>까지`, md, `${md} 깃허브 급상승 톱 ${top.length}. 진짜 쓰이는지까지 확인합니다.`),
      ...top.map(({ r, g }, i) => rankScene(r, i + 1, '오늘', g, P)), outroScene(site, P)] });
  }
  if (types.includes('spotlight')) {
    for (const { r, g } of pick('daily:all', 12).filter(x => !['doc', 'archived', 'dead'].includes(x.r.sc.v)).slice(0, 3)) {
      const info = infos[r.n] || {};
      specs.push({ id: `spotlight-${r.n.replace('/', '__')}-${day}`, F: P, repo: r.n, title: `${r.n.split('/')[1]}: 오늘 스타 ${short(g)} 받은 GitHub 저장소, 진짜 쓸만할까? #shorts`, list: [{ r, g }], scenes: spotlightScenes(r, info, g, site, P) });
    }
  }
  if (types.includes('weekly')) {
    const top = pick('weekly:all', 10), all = Object.values(R).filter(r => r.sc);
    const hype = all.filter(r => r.sc.v === 'hype' && r.sc.g7 != null).sort((a, b) => b.sc.g7 - a.sc.g7).slice(0, 3);
    const gems = all.filter(r => r.sc.v === 'gem').sort((a, b) => b.sc.util - a.sc.util).slice(0, 3);
    const listScene = (title, color, rows, say) => ({ say: [say], caps: [null],
      html: p => `<div class="brand">★ <b>GitHub Star Board</b> · 주간 리포트</div><div class="h1" style="color:${color}">${words(title)}</div>${rows.map(([a, b]) => `<div class="row"><div class="n">${esc(a)}</div><div class="m">${esc(b)}</div></div>`).join('')}`,
      anim: (p, S) => [A.words(`#${p} .h1`, S + 0.05), A.stagger(`#${p} .row`, S + 0.5, 0.25)].join('\n') });
    const scenes = [introScene('이번 주 GitHub', '스타 리포트', `${md} 기준 · 급상승 Top ${top.length} · 하이프 주의 · 숨은 보석`, '주간 리포트', `${md} 기준, 이번 주 깃허브 스타 리포트입니다. 스타가 가장 많이 늘어난 저장소 ${top.length}개와 실속까지 정리했어요.`),
      ...top.map(({ r, g }, i) => rankScene(r, i + 1, '이번 주', g, L, 2))];
    if (hype.length) scenes.push(listScene('하이프 주의', '#e3b341', hype.map(r => [r.n, `+${short(r.sc.g7)}/주 · 실효성 ${r.sc.util} · ${chips(r).filter(w => w[0] === '-').map(w => w[1]).join(', ')}`]),
      `스타는 급증했는데 실사용 신호가 약한 저장소도 있어요. ${hype.map(r => `${spoken(r.n)}, ${ev(r, '-')[0] || '실사용 신호가 약해요'}`).join('. ')}.`));
    if (gems.length) scenes.push(listScene('숨은 보석', '#a371f7', gems.map(r => [r.n, `★${short(r.s)} · 실효성 ${r.sc.util} · ${chips(r).filter(w => w[0] === '+').map(w => w[1]).join(', ')}`]),
      `반대로 스타는 적지만 실속 있는 숨은 보석입니다. ${gems.map(r => `${spoken(r.n)}, ${ev(r, '+')[0] || '관리가 탄탄해요'}`).join('. ')}.`));
    const cats = data.categories.map(c => { const b = c.repos.map(n => R[n]).filter(r => r?.sc && r.sc.v !== 'doc').sort((a, b2) => (b2.sc.g7 || 0) - (a.sc.g7 || 0))[0]; return b ? { c, r: b } : null; }).filter(Boolean);
    if (cats.length) scenes.push({ say: [`분야별로 이번 주 가장 많이 성장한 저장소도 정리했어요. ${cats.slice(0, 4).map(({ c, r }) => `${c.name.replace(/\s*\/\s*/g, ' ')} 분야는 ${spoken(r.n)}`).join(', ')}.`], caps: [null],
      html: p => `<div class="brand">★ <b>GitHub Star Board</b> · 분야별 이번 주 1위</div><div class="h1" style="font-size:76px">${words('분야별 1위')}</div><div class="cells">${cats.map(({ c, r }) => `<div class="cell"><div class="t">${esc(c.name)}</div><div class="n">${esc(r.n)}</div><div class="t">+${short(r.sc.g7 || 0)}/주 · ${esc(VKO[r.sc.v] || '')}</div></div>`).join('')}</div>`,
      anim: (p, S) => [A.words(`#${p} .h1`, S + 0.05), `tl.from('#${p} .cell',{opacity:0,scale:.8,duration:.4,stagger:.1,ease:'back.out(1.8)'},${S + 0.4});`].join('\n') });
    scenes.push(outroScene(site, L, '전체 순위와 판정 근거는 설명란 링크에서 확인하세요. 다음 주에 또 만나요.'));
    specs.push({ id: `weekly-${day}`, F: L, title: `이번 주 GitHub 스타 리포트 (${md}) | 급상승 Top 10, 하이프 주의, 숨은 보석`, list: top, scenes });
  }
  return specs;
}

// ---------------- 컴포지션 조립 ----------------
// timing: scenes[i] = { S, D, M:[문장 시작], sents:[{start,dur,audio,text}] }
function compose(spec, timing, opts = {}) {
  const { F } = spec, total = timing.total, gsapSrc = opts.gsapSrc || 'assets/gsap.min.js';
  const parts = [], anims = [], audios = [], caps = [];
  spec.scenes.forEach((s, i) => {
    const t = timing.scenes[i], p = `s${i}`;
    parts.push(`<div id="${p}" class="clip scene" data-start="${t.S.toFixed(2)}" data-duration="${t.D.toFixed(2)}" data-track-index="1">${s.html(p, F, t)}</div>`);
    anims.push(A.enter(p, t.S), s.anim(p, t.S, t.D, t.M, F), i < spec.scenes.length - 1 ? A.exit(p, t.S, t.D) : '');
    t.sents.forEach((x, j) => {
      audios.push(`<audio data-start="${x.start.toFixed(2)}" data-duration="${x.dur.toFixed(2)}" data-track-index="${6 + (j % 2)}" data-volume="1" src="${esc(x.audio)}"></audio>`);
      const cap = noUrl(s.caps?.[j] ?? x.text), max = F.vert ? 44 : 64;
      // 긴 문장은 문장/쉼표 단위로 나눠 글자 수 비율로 시간 배분
      const pieces = []; let buf = '';
      for (const seg of cap.split(/(?<=[.!?。,，])\s+/)) { if ((buf + ' ' + seg).trim().length > max && buf) { pieces.push(buf.trim()); buf = seg; } else buf = (buf + ' ' + seg).trim(); }
      if (buf) pieces.push(buf.trim());
      const totalLen = pieces.reduce((a, b) => a + b.length, 0) || 1; let off = 0;
      pieces.forEach((pc, k) => {
        const st = x.start + (x.dur * off) / totalLen, du = (x.dur * pc.length) / totalLen + (k === pieces.length - 1 ? GAP : 0); off += pc.length;
        const id = `c${i}_${j}_${k}`;
        caps.push(`<div id="${id}" class="clip cap" data-start="${st.toFixed(2)}" data-duration="${du.toFixed(2)}" data-track-index="${8 + ((j + k) % 2)}"><span>${esc(cut(pc, max + 20))}</span></div>`);
        anims.push(`tl.from('#${id} span',{opacity:0,y:26,scale:.96,duration:.2,ease:'power2.out'},${st.toFixed(2)});`);
      });
    });
  });
  const bgCols = ['#1f6feb', '#a371f7', '#f78166', '#3fb950'];
  const blobs = bgCols.map((c, i) => `<div class="blob" id="b${i}" style="background:radial-gradient(circle,${c} 0%,${c}66 35%,transparent 70%);width:${F.W * 0.6}px;height:${F.W * 0.6}px;left:${[10, 55, 20, 60][i]}%;top:${[5, 15, 60, 55][i]}%"></div>`).join('');
  const bgAnim = bgCols.map((_, i) => `tl.to('#b${i}',{x:${[260, -220, 180, -260][i]},y:${[180, 240, -200, -160][i]},scale:${[1.25, 0.85, 1.2, 0.9][i]},duration:${(total / 2).toFixed(2)},ease:'sine.inOut',yoyo:true,repeat:1},0);`).join('\n');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(spec.id)}</title><style>${css(F)}</style></head><body>
<div id="root" data-composition-id="root" data-start="0" data-width="${F.W}" data-height="${F.H}">
  <div id="bgwrap" class="clip" data-start="0" data-duration="${total.toFixed(2)}" data-track-index="0" style="position:absolute;inset:0"><div class="bg">${blobs}</div><div class="grid"></div></div>
  ${parts.join('\n  ')}
  ${caps.join('\n  ')}
  <div id="progwrap" class="clip" data-start="0" data-duration="${total.toFixed(2)}" data-track-index="10" style="position:absolute;inset:0;pointer-events:none"><div class="prog" id="prog"></div></div>
  ${audios.join('\n  ')}
  <script src="${gsapSrc}"></script>
  <script>
    const q = s => document.querySelector(s);
    const tl = gsap.timeline({ paused: true });
    tl.fromTo('#prog', { scaleX: 0 }, { scaleX: 1, duration: ${total.toFixed(2)}, ease: 'none' }, 0);
    ${bgAnim}
    ${anims.filter(Boolean).join('\n    ')}
    tl.set({}, {}, ${total.toFixed(2)});
    window.__timelines = window.__timelines || {};
    window.__timelines.root = tl;
  </script>
</div></body></html>`;
}

// 문장 길이로 추정한 타이밍 (미리보기/테스트용)
function estimateTiming(spec) {
  let cur = 0; const scenes = [];
  for (const s of spec.scenes) {
    const S = cur; let t = S + HEAD; const M = [], sents = [];
    s.say.forEach((txt, j) => { const d = Math.max(1.2, txt.length / 7.2); M.push(t); sents.push({ start: t, dur: d, audio: `assets/a${scenes.length}_${j}.mp3`, text: txt }); t += d + GAP; });
    const D = t - S + TAIL; scenes.push({ S, D, M, sents }); cur = S + D;
  }
  return { total: cur, scenes };
}

// ---------------- 실행 (Node) ----------------
async function main() {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const { execFile } = await import('node:child_process');
  const run = (await import('node:util')).promisify(execFile);
  const arg = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : null; };
  const types = (arg('type') || 'daily,spotlight').split(',').flatMap(t => (t === 'all' ? ['daily', 'spotlight', 'weekly'] : [t.trim()]));
  const OUT = path.resolve(arg('out') || 'out');
  const data = JSON.parse(await fs.readFile('data/latest.json', 'utf8'));
  const repoEnv = data.repo || process.env.GITHUB_REPOSITORY || '';
  const site = process.env.SITE_URL || (repoEnv ? `https://${repoEnv.split('/')[0]}.github.io/${repoEnv.split('/')[1]}/` : '');
  const day = data.generatedAt.slice(0, 10);
  await fs.mkdir(OUT, { recursive: true });
  const gsapJs = await fs.readFile(path.resolve('node_modules/gsap/dist/gsap.min.js'), 'utf8');

  // 스포트라이트용 README 정보 수집 + 번역
  const translate = async (texts) => {
    if (!texts.length) return [];
    try {
      const q = texts.map(t => t.replace(/\n/g, ' ')).join('\n');
      const r = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ko&dt=t&q=' + encodeURIComponent(q));
      const j = await r.json(); const outText = j[0].map(x => x[0]).join('');
      const parts = outText.split('\n').map(s => s.trim());
      return parts.length === texts.length ? parts : texts;
    } catch { return texts; }
  };
  const infos = {};
  if (types.includes('spotlight')) {
    const R = data.repos;
    const cands = (data.trending['daily:all'] || []).filter(x => R[x.n]?.sc && !['doc', 'archived', 'dead'].includes(R[x.n].sc.v)).slice(0, 3);
    for (const { n } of cands) {
      try {
        const raw = await (await fetch(`https://raw.githubusercontent.com/${n}/HEAD/README.md`)).text();
        let info = extractReadme(raw, n), ko = false;
        if (info.koReadme) { try { const kr = await fetch(info.koReadme); if (kr.ok) { const ki = extractReadme(await kr.text(), n); if (ki.feats.length >= 2) { info = { ...info, feats: ki.feats, para: ki.para || info.para }; ko = true; } } } catch {} }
        const fc = info.feats.length;
        const src = [(R[n].d || info.para || '').replace(/https?:\/\/\S+/g, '').trim() || '-', ...info.feats.map(f => f.t), ...info.feats.map(f => f.d || '-')];
        const tr = ko ? src : await translate(src);
        infos[n] = { descKo: tr[0] === '-' ? '' : tr[0], featsKo: info.feats.map((f, i) => ({ t: tr[1 + i], d: tr[1 + fc + i] === '-' ? '' : tr[1 + fc + i] })), install: info.install, mediaCands: info.media };
        console.log(`README ${n}: 기능 ${info.feats.length}, 설치 ${info.install ? 'O' : 'X'}, 미디어 ${info.media.length}${ko ? ' (한국어 README)' : ''}`);
      } catch (e) { console.log(`README 실패 ${n}: ${e.message}`); infos[n] = {}; }
    }
  }

  const specs = buildSpecs(data, types, site, infos);
  for (const spec of specs) {
    const dir = path.join(OUT, 'projects', spec.id), assets = path.join(dir, 'assets');
    await fs.mkdir(assets, { recursive: true });
    await fs.writeFile(path.join(assets, 'gsap.min.js'), gsapJs);
    // 스포트라이트 미디어 다운로드 (GIF/MP4 -> 영상 클립, 이미지 -> 확대 이동)
    for (const s of spec.scenes) {
      const info = spec.repo ? infos[spec.repo] : null;
      if (!info || !('media' in s) || s.media?.ready) continue;
      const cands = [...(info.mediaCands || []), `https://opengraph.githubassets.com/1/${spec.repo}`];
      s.media = null;
      for (const [k, u] of cands.entries()) {
        try {
          const r = await fetch(u, { redirect: 'follow' }); if (!r.ok) continue;
          const ct = r.headers.get('content-type') || ''; const buf = Buffer.from(await r.arrayBuffer());
          if (buf.length < 8000 || buf.length > 25e6) continue;
          if (/gif/.test(ct) || /\.gif(\?|$)/i.test(u) || /video|mp4|quicktime|webm/.test(ct)) {
            const inF = path.join(assets, `m${k}.${/gif/.test(ct) || /\.gif/i.test(u) ? 'gif' : 'src'}`), outF = path.join(assets, `m${k}.mp4`);
            await fs.writeFile(inF, buf);
            await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', inF, '-t', '30', '-an', '-movflags', '+faststart', '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(min(1600\\,iw)/2)*2:-2', '-c:v', 'libx264', '-preset', 'veryfast', outF]);
            s.media = { kind: 'video', src: `assets/m${k}.mp4`, ready: true }; break;
          }
          if (/image\/(png|jpe?g|webp)/.test(ct)) { const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg'; await fs.writeFile(path.join(assets, `m${k}.${ext}`), buf); s.media = { kind: 'image', src: `assets/m${k}.${ext}`, ready: true }; break; }
        } catch {}
      }
    }
    // 스포트라이트 장면 HTML은 media 결정 후 다시 생성
    if (spec.repo) { const fresh = spotlightScenes(data.repos[spec.repo], { ...infos[spec.repo], media: spec.scenes[1]?.media }, spec.list[0].g, site, spec.F); fresh[1].media = spec.scenes[1]?.media; spec.scenes = fresh; }

    // 음성 생성 + 타이밍
    let cur = 0; const tscenes = [];
    for (const [i, s] of spec.scenes.entries()) {
      const S = cur; let t = S + HEAD; const M = [], sents = [];
      for (const [j, txt] of s.say.entries()) {
        const f = `assets/a${i}_${j}.mp3`; let dur = 0;
        for (let a = 0; a < 3 && !dur; a++) {
          try {
            await run('edge-tts', ['--voice', VOICE, `--rate=${RATE}`, '--text', txt, '--write-media', path.join(dir, f)], { timeout: 60000 });
            const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(dir, f)]); dur = parseFloat(stdout) || 0;
          } catch (e) { await new Promise(r => setTimeout(r, 2500)); }
        }
        if (!dur) { dur = Math.max(1.5, txt.length / 7); await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', String(dur), path.join(dir, f)]); }
        M.push(t); sents.push({ start: t, dur, audio: f, text: txt }); t += dur + GAP;
      }
      const D = t - S + TAIL; tscenes.push({ S, D, M, sents }); cur = S + D;
    }
    const timing = { total: cur, scenes: tscenes };
    await fs.writeFile(path.join(dir, 'index.html'), compose(spec, timing));
    const outFile = path.join(OUT, `${spec.id}.mp4`);
    console.log(`렌더: ${spec.id} (${timing.total.toFixed(1)}초, 장면 ${spec.scenes.length})`);
    await run('npx', ['hyperframes', 'render', dir, '--output', outFile, '--quality', 'standard', '--fps', process.env.HF_FPS || '24', '--quiet'], { maxBuffer: 1 << 26, timeout: 25 * 60000 });
    await fs.writeFile(path.join(OUT, `${spec.id}-script.txt`), spec.scenes.map((s, i) => `[${i + 1}] ${s.say.join(' ')}`).join('\n\n'));
    const links = spec.list.map(({ r, g }, i) => `${spec.list.length > 1 ? `${i + 1}. ` : ''}${r.n} (+${short(g)}, ${VKO[r.sc.v]}) ${site}r/${r.n}/`).join('\n');
    await fs.writeFile(path.join(OUT, `${spec.id}-youtube.txt`), `${spec.title}\n\n${spec.repo ? `${spec.repo} 저장소의 특징과 실제 사용 지표를 소개합니다.` : '스타가 가장 많이 늘어난 저장소를 커밋/참여자/이슈 해결률/다운로드로 실제 사용 여부까지 확인했습니다.'}\n\n${links}\n\n전체 순위와 근거: ${site}\nAI용 데이터: ${site}llms.txt\n\n#GitHub #오픈소스 #개발자 #깃허브 #AI${spec.F.vert ? ' #shorts' : ''}\n`);
    console.log(`완료: ${outFile}`);
  }
}

if (typeof process !== 'undefined' && /hf-video\.mjs$/.test(process.argv?.[1] || '')) {
  main().catch(e => { console.error(e); process.exit(1); });
}
