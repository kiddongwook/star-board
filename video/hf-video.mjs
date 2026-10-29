#!/usr/bin/env node
// GitHub Star Board - HyperFrames video generator v3
//   node video/hf-video.mjs --type daily,spotlight,weekly --out out
// English narration (edge-tts) + Korean subtitles, a recurring host character (Starby),
// and "show, don't tell" scenes: why it's trending, what it is, when to use it, real screens/code, real-usage numbers.
// Needs: data/latest.json, Node 22+, ffmpeg/ffprobe, edge-tts, npm i hyperframes gsap playwright

const ENV = (typeof process !== 'undefined' && process.env) || {};
const VOICE = ENV.TTS_VOICE || 'en-US-AndrewNeural';
const RATE = ENV.TTS_RATE || '+4%';
const HEAD = 0.3, GAP = 0.16, TAIL = 0.4;

// ---------------- helpers ----------------
const tfetch = (u, o = {}) => fetch(u, { ...o, signal: (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? AbortSignal.timeout(20000) : undefined });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const short = n => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k' : String(Math.round(n || 0)));
const say = n => { n = Math.round(n || 0); if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, '')} million`; if (n >= 1e4) return `${Math.round(n / 1e3)} thousand`; return n.toLocaleString('en-US'); };
const noUrl = s => String(s || '').replace(/https?:\/\/\S+/g, '').replace(/\s+([.,])/g, '$1').trim();
const STOPW = /\s+(with|and|or|for|of|to|the|a|an|in|on|by|from|that|which|your|its)$/i;
const clause = (s, n) => { s = noUrl(s).split(/\s[—–]\s|\s-\s|:\s/)[0]; if (s.length <= n) return s.replace(/[.。]$/, ''); let t = s.slice(0, n).replace(/\s+\S*$/, ''); while (STOPW.test(t)) t = t.replace(STOPW, ''); return t.replace(/[,;:\s]+$/, ''); };
const cut = (s, n) => { s = noUrl(s); if (s.length <= n) return s; const m = s.slice(0, n).match(/^(.*[.。!?,，、;])\s/); return m && m[1].length > n * 0.5 ? m[1].replace(/[,;]$/, '') : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'; };
const hash = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const pickV = (arr, key) => arr[hash(key) % arr.length];
const repoName = n => n.split('/')[1].replace(/[-_]+/g, ' ');
const ownerName = n => n.split('/')[0];
const DAY = 864e5;
const VCOL = { good: '#3fb950', mature: '#a371f7', gem: '#a371f7', hype: '#e3b341', bad: '#f85149', doc: '#39c5cf', dead: '#8b949e', archived: '#8b949e', early: '#8b949e', quick: '#8b949e', na: '#8b949e' };
const VKO = { good: '실사용 확인', mature: '오래 쓰이는 중', gem: '숨은 실력파', hype: '스타만 많음', early: '아직 초기', bad: '참여 대비 스타 과다', doc: '학습 자료', dead: '업데이트 멈춤', archived: '보관됨', quick: '분석 대기', na: '데이터 부족' };
const MOOD = { good: 'happy', gem: 'wow', mature: 'happy', hype: 'skeptic', bad: 'skeptic', dead: 'skeptic', doc: 'think', early: 'think' };
const BIG_ORG = /^(google|google-research|google-deepmind|microsoft|openai|anthropics|meta-llama|facebook|facebookresearch|jetbrains|cloudflare|vercel|deepseek-ai|alibaba|qwenlm|bytedance|apple|aws|awslabs|nvidia|huggingface|mozilla|github|stripe|shopify|netflix|uber|airbnb|apache|hashicorp|docker|kubernetes|tencent|baidu|xai-org|mistralai|ollama|langchain-ai|heygen-com|supabase|astral-sh|oven-sh|denoland|nodejs|rust-lang|golang)$/i;
const TOPIC_USE = [
  [/claude-code|coding-agent|ai-coding|codex|cursor/, 'speed up coding with an AI agent', 'AI 에이전트로 코딩을 빨리 할 때'], [/ai-agents?|llm-agent|multi-agent|agent/, 'build or run AI agents', 'AI 에이전트를 만들거나 돌릴 때'],
  [/mcp|model-context-protocol/, 'plug new tools into your AI assistant', 'AI 비서에 새 도구를 붙일 때'], [/rag|vector|retrieval/, 'let AI answer from your own documents', '내 문서로 AI 답변을 받을 때'], [/llm|inference|local-llm|ollama/, 'run language models yourself', 'LLM을 직접 돌릴 때'],
  [/self-hosted|selfhost/, 'self-host it instead of paying for a SaaS', '유료 서비스 대신 직접 운영할 때'], [/security|pentest|audit/, 'check code or systems for security holes', '보안 취약점을 점검할 때'], [/cli|terminal|shell/, 'work faster in the terminal', '터미널 작업을 빠르게 할 때'],
  [/computer-vision|image|ocr/, 'process images or documents', '이미지나 문서를 처리할 때'], [/face|biometric|fingerprint/, 'add face or fingerprint recognition', '얼굴·지문 인식을 넣을 때'], [/embedded|iot|firmware/, 'build embedded or IoT devices', '임베디드·IoT 기기를 만들 때'],
  [/education|tutor|learning/, 'study with an AI tutor', 'AI 튜터와 공부할 때'], [/design|ui|css|frontend/, 'build better-looking interfaces', '화면 디자인을 다듬을 때'], [/video|audio|tts|speech/, 'create audio or video', '오디오·영상을 만들 때'], [/database|sql/, 'work with databases', '데이터베이스를 다룰 때'],
  [/trading|finance/, 'experiment with trading strategies', '트레이딩 전략을 실험할 때'], [/devops|kubernetes|docker/, 'deploy and run services', '서비스를 배포·운영할 때'], [/browser|scraping|crawler/, 'automate the web', '웹 작업을 자동화할 때'],
];
// evidence phrases (English, natural)
const EN = {
  c90hi: p => `${say(p.n)} commits in the last three months`, c90lo: p => `only ${p.n} commits in three months`, pplhi: p => `${say(p.n)} contributors`, ppllo: p => `just ${p.n} contributors`,
  iss: p => (p.p >= 80 ? `${p.p}% of issues get closed` : `only ${p.p}% of issues get closed`), ub: p => `used by ${say(p.r)} other projects`, dl: p => `${say(p.n)} downloads a month`,
  rel: p => `a stable release ${p.d <= 1 ? 'this week' : `${p.d} days ago`}`, norel: () => 'no releases yet', dead: () => 'no updates in over a year', inactive: () => 'no updates in six months',
};
const evd = (r, sign, max = 2) => (r.wc || []).filter(([s, c]) => s === sign && EN[c] && c !== 'g7' && !(c === 'iss' && sign === '+' && false)).slice(0, max).map(([, c, p]) => EN[c](p || {}));
function realityLine(r) {
  const v = r.sc?.v, pos = evd(r, '+'), neg = evd(r, '-'), k = r.n;
  const j = a => a.length > 1 ? `${a.slice(0, -1).join(', ')} and ${a.at(-1)}` : a[0];
  if (v === 'good') return pickV([`And it's not just hype: ${j(pos) || 'steady commits and real users'}.`, `The numbers back it up: ${j(pos) || 'it is actively maintained'}.`, `This one is the real deal: ${j(pos) || 'people actually use it'}.`], k);
  if (v === 'gem') return `Underrated: ${j(pos) || 'solid maintenance'}, with far fewer stars than it deserves.`;
  if (v === 'mature') return `It's mature. Development slowed down, but ${j(pos) || 'people still use it a lot'}.`;
  if (v === 'hype') return pickV([`But careful: ${j(neg) || 'there is not much activity behind the stars'}.`, `Here's the catch: ${j(neg) || 'the stars are ahead of the actual work'}.`], k);
  if (v === 'bad') return `One flag: it has far fewer watchers, forks and issues than repos with similar stars.`;
  if (v === 'dead') return `Heads up: there have been no updates in over a year.`;
  if (v === 'doc') return `It's more of a learning resource than a library you install.`;
  return `It's still early: ${j(neg) || j(pos) || 'too soon to tell'}.`;
}
function whyFacts(r, gain, info) {
  const now = Date.now(), age = r.c ? (now - Date.parse(r.c)) / DAY : null, out = [];
  if (age != null && age < 60) out.push([`It's brand new: only ${Math.max(1, Math.round(age))} days old.`, `${Math.round(age)}일 된 신규`]);
  else if (age != null && age < 180) out.push([`It's only ${Math.round(age / 30)} months old.`, `${Math.round(age / 30)}개월 차`]);
  if (BIG_ORG.test(ownerName(r.n))) out.push([`It comes from ${ownerName(r.n)}.`, `${ownerName(r.n)} 제작`]);
  const D = r.deep; const rd = D?.lr ? (now - Date.parse(D.lr)) / DAY : null;
  if (rd != null && rd <= 10) out.push([`A new release, ${D.tag || 'a new version'}, just shipped.`, `새 버전 ${D.tag || ''}`]);
  const tp = (r.t || []).join(' ');
  const hot = [[/claude-code|coding-agent|ai-coding/, 'AI coding agents'], [/ai-agents?|agent/, 'AI agents'], [/mcp/, 'MCP tools'], [/llm/, 'large language models'], [/rag/, 'RAG']].find(([re]) => re.test(tp));
  if (hot) out.push([`And it rides the ${hot[1]} wave.`, `${hot[1]} 흐름`]);
  if (r.dl?.m >= 1e5) out.push([`It already gets ${say(r.dl.m)} downloads a month.`, `월 ${short(r.dl.m)} 다운로드`]);
  return out.slice(0, 2);
}
function useCases(r, info) {
  const tp = ((r.t || []).join(' ') + ' ' + (r.d || '')).toLowerCase(), out = [];
  for (const [re, txt, ko] of TOPIC_USE) if (re.test(tp) && !out.some(o => o.en === txt)) out.push({ en: txt, ko });
  return out.slice(0, 2);
}
function cleanDesc(r, info) {
  let d = noUrl(r.d || info?.para || '');
  const nm = r.n.split('/')[1];
  d = d.replace(new RegExp('^' + nm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[:\\-–—]\\s*', 'i'), '').replace(/^[^A-Za-z0-9]+/, '');
  if (!/[a-z]/i.test(d)) return '';
  d = d.split(/\s[—–]\s|\s-\s/)[0];
  d = clause(d, 110);
  return d;
}

// ---------------- README ----------------
const FEAT_H = /(feature|highlight|why|what (it|does|can)|key|capabilit|overview)/i;
const INSTALL = /^(\$\s*)?(npm (i|install)|pnpm (add|i|dlx)|yarn (add|dlx)|npx |bunx? |pip3? install|pipx install|uv (add|tool install|pip install)|uvx |cargo (install|add)|brew install|go (install|get)|docker (run|pull|compose)|curl .*\|\s*(ba)?sh|winget install|scoop install|gem install|composer require|dotnet add|claude (plugin|mcp)|npx skills add)/i;
const BAD_IMG = /shields\.io|badge|trendshift|star-history|starchart|contrib\.rocks|readme-stats|visitor|komarev|codecov|hits\.|discord|twitter|x\.com\/|buymeacoffee|ko-fi|producthunt|sponsor|\.svg(\?|$)|avatars\.githubusercontent|gravatar|logo|icon|favicon/i;
function absUrl(u, n) {
  u = u.trim().replace(/^<|>$/g, '');
  if (/^https?:\/\//.test(u)) return u.replace(/^https:\/\/github\.com\/([^/]+\/[^/]+)\/blob\//, 'https://raw.githubusercontent.com/$1/');
  if (u.startsWith('//')) return 'https:' + u;
  return `https://raw.githubusercontent.com/${n}/HEAD/${u.replace(/^\.?\//, '')}`;
}
function cleanMd(t) {
  return t.replace(/<[^>]+>/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`~]+/g, '')
    .replace(/:[a-z0-9_+-]+:/g, '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim();
}
function extractReadme(md, n) {
  const s = md.replace(/<!--[\s\S]*?-->/g, '').replace(/<details[\s\S]*?<\/details>/gi, '').replace(/\r/g, '');
  const imgs = [];
  for (const m of s.matchAll(/!\[[^\]]*\]\(\s*([^)\s]+)[^)]*\)/g)) imgs.push(m[1]);
  for (const m of s.matchAll(/<(?:img|source|video)[^>]+src=["']([^"']+)["']/gi)) imgs.push(m[1]);
  for (const m of s.matchAll(/^(https:\/\/github\.com\/user-attachments\/assets\/[0-9a-f-]+)\s*$/gim)) imgs.push(m[1]);
  const media = [...new Set(imgs.map(u => absUrl(u, n)))].filter(u => !BAD_IMG.test(u)).slice(0, 6);
  const rn = n.split('/')[1].toLowerCase(), cmds = [], snippets = [];
  for (const m of s.matchAll(/```([^\n]*)\n([\s\S]*?)```/g)) {
    const lang = m[1].trim().toLowerCase(), ls = m[2].split('\n').map(l => l.replace(/\s+$/, ''));
    ls.forEach((l, i) => { const t = l.trim(); if (!INSTALL.test(t)) return; let c = t.replace(/^\$\s*/, ''); let k = i; while (c.endsWith('\\') && k + 1 < ls.length && k < i + 2) { k++; c = c.slice(0, -1).trim() + ' ' + ls[k].trim(); } cmds.push(c.replace(/\s*\\$/, '').replace(/\s+#.*$/, '').trim()); });
    const body = ls.filter(l => l.trim()).join('\n');
    if (/^(py|python|js|javascript|ts|typescript|go|rust|rs|java|kotlin|swift|ruby|rb|bash|sh|shell|console|yaml|json)?$/.test(lang) && body.length >= 30 && body.length <= 420 && ls.length <= 12
      && !ls.every(l => !l.trim() || INSTALL.test(l.trim()) || /^(cd|git clone|#)/.test(l.trim()))) snippets.push({ lang: lang || 'text', code: body });
  }
  const pri = c => (/--filter|\brun\s+(dev|build|test|lint|start)\b|build:|\b(dev|build|test|lint)$/.test(c) ? 4 : 0) + (c.toLowerCase().includes(rn) ? -1 : 0) + (/^(npm|pnpm|yarn|pip|pipx|uv|uvx|brew|cargo|go|npx|bunx?|gem|winget|scoop|claude|composer|dotnet)\b/.test(c) && !/^(bun|npm|pnpm|yarn) (install|i)$/.test(c) ? 0 : /^curl/.test(c) ? 1 : 2);
  cmds.sort((a, b) => pri(a) - pri(b) || a.length - b.length);
  const install = cmds[0] ? (cmds[0].length > 80 ? cmds[0].slice(0, 78) + '…' : cmds[0]) : null;
  const usage = snippets.find(x => /^(py|python|js|javascript|ts|typescript|go|rust|rs|java|kotlin|swift|ruby|rb)$/.test(x.lang)) || null;
  const lines = s.split('\n'); let feats = [], inSec = false;
  const bullet = l => (l.match(/^\s{0,3}(?:[-*+]|\d+[.)])\s+(.+)/) || [])[1];
  const split = raw => {
    const m = raw.match(/^\*\*([^*]{3,80})\*\*[\s:.\-—–]*(.*)$/) || raw.match(/^__([^_]{3,80})__[\s:.\-—–]*(.*)$/);
    if (m) return { t: cleanMd(m[1]).replace(/[.:]$/, ''), d: cleanMd(m[2]) };
    const c = cleanMd(raw), k = c.search(/\s[—–-]\s|:\s|\.\s/);
    return k > 8 && k < 70 ? { t: c.slice(0, k).trim(), d: c.slice(k).replace(/^[\s—–:.-]+/, '').trim() } : { t: c, d: '' };
  };
  const good = f => f.t && f.t.split(/\s+/).length >= 2 && f.t.length <= 70 && !/[:：]$/.test(f.t) && !/^(https?:|install|license|star|sponsor|register|run |see |click|note|step \d)/i.test(f.t) && (f.d.length >= 10 || f.t.split(/\s+/).length >= 4);
  for (const l of lines) {
    const h = l.match(/^#{1,4}\s+(.+)/);
    if (h) { if (feats.length >= 3) break; inSec = FEAT_H.test(h[1]); continue; }
    const b = inSec && bullet(l); if (b) { const f = split(b); if (good(f)) feats.push(f); }
  }
  if (feats.length < 3) { feats = []; for (const l of lines.slice(0, Math.ceil(lines.length * 0.5))) { const b = bullet(l); if (b) { const f = split(b); if (good(f) && f.d.length >= 10) feats.push(f); } if (feats.length >= 5) break; } }
  let para = '';
  for (const block of s.split(/\n\s*\n/)) { const t = cleanMd(block); if (!/^#/.test(block.trim()) && t.length >= 50 && !/^(\||-|\*)/.test(block.trim()) && !/```/.test(block)) { para = t; break; } }
  return { mediaUrls: media, install, usage, feats: feats.slice(0, 3).map(f => ({ t: f.t, d: f.d.slice(0, 160) })), para: noUrl(para).slice(0, 300) };
}

// ---------------- Starby (host character) ----------------
const STARBY = `<svg viewBox="0 0 200 200" width="100%" height="100%" style="overflow:visible">
<defs><radialGradient id="sbg" cx="40%" cy="32%" r="75%"><stop offset="0" stop-color="#fff2a8"/><stop offset=".55" stop-color="#ffc83d"/><stop offset="1" stop-color="#f29d12"/></radialGradient></defs>
<ellipse cx="100" cy="192" rx="54" ry="8" fill="#000" opacity=".25" id="sbshadow"/>
<g id="sbbody">
<path d="M100,17 L125.9,69.4 L183.7,77.8 L141.8,118.6 L151.7,176.2 L100,149 L48.3,176.2 L58.2,118.6 L16.3,77.8 L74.1,69.4 Z" fill="url(#sbg)" stroke="#e08a0b" stroke-width="12" stroke-linejoin="round"/>
<path d="M100,17 L125.9,69.4 L183.7,77.8 L141.8,118.6 L151.7,176.2 L100,149 L48.3,176.2 L58.2,118.6 L16.3,77.8 L74.1,69.4 Z" fill="url(#sbg)" stroke="#ffd85c" stroke-width="3" stroke-linejoin="round"/>
<ellipse cx="70" cy="120" rx="9" ry="5.5" fill="#ff7b54" opacity=".55"/><ellipse cx="130" cy="120" rx="9" ry="5.5" fill="#ff7b54" opacity=".55"/>
<g id="sbeyes"><ellipse cx="82" cy="100" rx="9.5" ry="12.5" fill="#1b1f24"/><ellipse cx="118" cy="100" rx="9.5" ry="12.5" fill="#1b1f24"/>
<g id="sbpupil"><circle cx="85" cy="95" r="3.6" fill="#fff"/><circle cx="121" cy="95" r="3.6" fill="#fff"/></g></g>
<path id="sbbrowL" d="M71,81 Q81,75 91,80" stroke="#7a4a05" stroke-width="4" fill="none" stroke-linecap="round"/>
<path id="sbbrowR" d="M109,80 Q119,75 129,81" stroke="#7a4a05" stroke-width="4" fill="none" stroke-linecap="round"/>
<ellipse id="sbmouth" cx="100" cy="124" rx="10" ry="4" fill="#7a2e12"/>
</g></svg>`;

// ---------------- styles ----------------
const css = F => `
*{box-sizing:border-box;margin:0;padding:0}
body,html{background:#0b0f17}
#root{position:relative;width:${F.W}px;height:${F.H}px;overflow:hidden;background:#0b0f17;color:#e6edf3;font-family:"Noto Sans CJK KR","Noto Sans KR","Malgun Gothic",sans-serif}
.bg{position:absolute;inset:-20%;opacity:.5}.blob{position:absolute;border-radius:50%}
.grid{position:absolute;inset:0;background-image:linear-gradient(#ffffff07 1px,transparent 1px),linear-gradient(90deg,#ffffff07 1px,transparent 1px);background-size:72px 72px}
.scene{position:absolute;left:0;right:0;top:0;height:${F.vert ? 1260 : 760}px;padding:${F.vert ? '150px 70px 0' : '70px 120px 0 460px'};display:flex;flex-direction:column;justify-content:center;align-items:${F.vert ? 'center' : 'flex-start'};text-align:${F.vert ? 'center' : 'left'}}
.brand{position:absolute;top:${F.vert ? 70 : 34}px;left:${F.vert ? 70 : 120}px;font-size:${F.vert ? 30 : 24}px;color:#8b949e}.brand b{color:#e6edf3}
.prog{position:absolute;top:0;left:0;height:9px;width:100%;background:linear-gradient(90deg,#ffc83d,#f78166,#a371f7);transform-origin:left center}
.cap{position:absolute;left:${F.vert ? 50 : 420}px;right:${F.vert ? 50 : 80}px;bottom:${F.vert ? 120 : 60}px;text-align:center}
.cap span{display:inline-block;background:#000000d0;border-radius:18px;padding:${F.vert ? '18px 28px' : '14px 26px'};font-size:${F.vert ? 48 : 38}px;line-height:1.35;font-weight:700;color:#fff;box-shadow:0 10px 40px #0008}
#bot{position:absolute;width:${F.vert ? 300 : 300}px;height:${F.vert ? 300 : 300}px;left:${F.vert ? 40 : 70}px;top:${F.vert ? 1300 : 560}px;transform-origin:50% 100%}
#bot svg #sbbody{transform-origin:100px 110px}#sbeyes{transform-origin:100px 100px;transform-box:fill-box}#sbbrowL,#sbbrowR{transform-box:fill-box;transform-origin:center}
.avatar{width:${F.vert ? 190 : 150}px;height:${F.vert ? 190 : 150}px;border-radius:40px;border:5px solid #30363d;object-fit:cover;background:#161b22}
.repo{font-size:${F.vert ? 96 : 84}px;font-weight:900;line-height:1.05;letter-spacing:-1px;word-break:break-word;margin-top:20px}
.owner{font-size:${F.vert ? 40 : 34}px;color:#8b949e;margin-top:10px}
.big{font-size:${F.vert ? 150 : 130}px;font-weight:900;line-height:1;color:#3fb950;margin-top:26px;text-shadow:0 10px 50px #3fb95055}
.lbl{font-size:${F.vert ? 34 : 28}px;color:#8b949e;margin-top:6px}
.bars{width:100%;max-width:900px;margin-top:20px}
.bar{display:flex;align-items:center;gap:18px;margin:22px 0}.bar .k{width:${F.vert ? 190 : 170}px;font-size:${F.vert ? 32 : 28}px;color:#8b949e;text-align:right}
.bar .t{flex:1;height:${F.vert ? 64 : 52}px;background:#21262d;border-radius:16px;overflow:hidden}.bar .t i{display:block;height:100%;border-radius:16px;transform-origin:left center}
.bar .v{width:${F.vert ? 190 : 170}px;font-size:${F.vert ? 44 : 38}px;font-weight:900;text-align:left}
.mult{font-size:${F.vert ? 120 : 100}px;font-weight:900;color:#ffc83d;line-height:1}
.pills{display:flex;gap:16px;flex-wrap:wrap;justify-content:center;margin-top:30px}.pill{background:#161b22e6;border:2px solid #30363d;border-radius:40px;padding:14px 28px;font-size:${F.vert ? 36 : 30}px;font-weight:700}
.frame{position:relative;width:${F.vert ? 940 : 1100}px;height:${F.vert ? 760 : 560}px;background:#161b22;border:2px solid #30363d;border-radius:24px;overflow:hidden;box-shadow:0 40px 100px #000a}
.frame .tb{background:#21262d;padding:14px 20px;display:flex;gap:10px;align-items:center;font-size:22px;color:#8b949e}.frame .tb i{width:15px;height:15px;border-radius:50%;display:block}
.frame .vp{position:absolute;inset:52px 0 0 0;overflow:hidden;background:#0d1117}
.frame .vp img.page{width:100%;display:block}.frame .vp img.shot,.frame .vp video{width:100%;height:100%;object-fit:contain;display:block}
.uses{display:flex;flex-direction:column;gap:22px;width:100%;max-width:960px;margin-top:30px}
.use{display:flex;gap:24px;align-items:center;background:#161b22e6;border:2px solid #30363d;border-radius:26px;padding:${F.vert ? '26px 30px' : '22px 28px'};text-align:left}
.use .n{flex:none;width:${F.vert ? 76 : 64}px;height:${F.vert ? 76 : 64}px;border-radius:22px;background:#ffc83d;color:#1b1f24;font-size:${F.vert ? 42 : 36}px;font-weight:900;display:flex;align-items:center;justify-content:center}
.use .t{font-size:${F.vert ? 44 : 38}px;font-weight:800;line-height:1.25}
.h{font-size:${F.vert ? 78 : 68}px;font-weight:900;line-height:1.1}
.code{width:${F.vert ? 940 : 1100}px;background:#0d1117;border:2px solid #30363d;border-radius:22px;overflow:hidden;box-shadow:0 30px 80px #0009;text-align:left;margin-top:26px}
.code .tb{background:#161b22;padding:14px 22px;display:flex;gap:10px;align-items:center;font-size:22px;color:#8b949e}.code .tb i{width:15px;height:15px;border-radius:50%;display:block}
.code pre{padding:26px 30px;font-family:"Noto Sans Mono CJK KR","DejaVu Sans Mono",monospace;font-size:${F.vert ? 30 : 30}px;line-height:1.45;color:#c9d1d9;white-space:pre-wrap;word-break:break-all}
.code pre.term{color:#3fb950;font-size:${F.vert ? 36 : 34}px}
.stats{display:flex;gap:${F.vert ? 20 : 26}px;justify-content:center;margin-top:30px;flex-wrap:wrap}
.stat{width:${F.vert ? 290 : 280}px;background:#161b22e6;border:2px solid #30363d;border-radius:26px;padding:24px 18px;text-align:center}
.stat .v{font-size:${F.vert ? 76 : 66}px;font-weight:900;line-height:1.1}.stat .k{font-size:${F.vert ? 28 : 24}px;color:#8b949e;margin-top:6px}
.verdict{display:inline-block;border:6px solid;border-radius:24px;padding:12px 34px;font-size:${F.vert ? 60 : 50}px;font-weight:900;margin-top:34px;transform:rotate(-3deg)}
.rank{font-size:${F.vert ? 200 : 170}px;font-weight:900;line-height:.9;color:#f78166;text-shadow:0 10px 50px #f7816655}
.url{font-size:${F.vert ? 54 : 46}px;color:#58a6ff;font-weight:900;margin-top:26px}
.starbtn{display:inline-flex;gap:14px;align-items:center;margin-top:34px;background:#238636;color:#fff;border-radius:18px;padding:18px 34px;font-size:${F.vert ? 40 : 34}px;font-weight:800}
.title{font-size:${F.vert ? 110 : 96}px;font-weight:900;line-height:1.05}.title .w{display:inline-block}
.sub2{font-size:${F.vert ? 44 : 36}px;color:#c9d1d9;margin-top:20px}
.list{width:100%;max-width:1200px;margin-top:20px}.row{display:flex;gap:20px;align-items:center;background:#161b22e6;border:2px solid #30363d;border-radius:20px;padding:18px 26px;margin-top:14px;text-align:left}
.row img{width:64px;height:64px;border-radius:16px}.row .n{font-size:36px;font-weight:800}.row .m{font-size:26px;color:#8b949e}
`;

// ---------------- animation snippets (seek-safe, no callbacks) ----------------
const unitOf = v => (v >= 1e6 ? [1e6, 'M', 0.1] : v >= 1e4 ? [1e3, 'k', 1] : v >= 1e3 ? [1e3, 'k', 0.1] : [1, '', 1]);
const num = (v, prefix = '', suffix = '') => `${prefix}<span class="num">0</span>${unitOf(Math.round(v || 0))[1]}${suffix}`;
const typed = t => [...String(t)].map(c => (c === '\n' ? '<br>' : `<span class="ch">${c === ' ' ? '&nbsp;' : esc(c)}</span>`)).join('');
const words = t => t.split(/\s+/).map(w => `<span class="w">${esc(w)}</span>`).join(' ');
const f2 = x => Number(x).toFixed(2);
const A = {
  enter: (p, S) => `tl.from('#${p}',{opacity:0,y:60,duration:.5,ease:'power3.out'},${f2(S)});`,
  exit: (p, S, D) => `tl.to('#${p}',{opacity:0,y:-40,duration:.3,ease:'power2.in'},${f2(S + D - 0.32)});`,
  count: (sel, to, at, dur = 1.3) => { const [div, , snap] = unitOf(Math.round(to || 0)); const v = +(Math.round(to || 0) / div).toFixed(snap < 1 ? 1 : 0); return `tl.fromTo('${sel} .num',{innerText:0},{innerText:${v},snap:{innerText:${snap}},duration:${dur},ease:'power2.out'},${f2(at)});`; },
  pop: (sel, at) => `tl.from('${sel}',{opacity:0,scale:.5,duration:.5,ease:'back.out(2)'},${f2(at)});`,
  up: (sel, at, st = 0.15) => `tl.from('${sel}',{opacity:0,y:50,duration:.45,stagger:${st},ease:'power3.out'},${f2(at)});`,
  type: (sel, text, at, dur) => `tl.from('${sel} .ch',{opacity:0,duration:.01,stagger:${(dur / Math.max(1, [...String(text)].length)).toFixed(4)},ease:'none'},${f2(at)});`,
  words: (sel, at) => `tl.from('${sel} .w',{opacity:0,y:80,rotate:5,duration:.55,stagger:.08,ease:'back.out(1.8)'},${f2(at)});`,
  stamp: (sel, at) => `tl.from('${sel}',{scale:2.4,opacity:0,rotate:-16,duration:.45,ease:'back.out(2.2)'},${f2(at)});`,
  bar: (sel, frac, at) => `tl.fromTo('${sel}',{scaleX:0},{scaleX:${Math.max(0.015, Math.min(1, frac)).toFixed(3)},duration:1,ease:'power3.out'},${f2(at)});`,
};
const brand = (extra = '') => `<div class="brand">★ <b>GitHub Star Board</b>${extra ? ' · ' + esc(extra) : ''}</div>`;
const winBar = t => `<div class="tb"><i style="background:#f85149"></i><i style="background:#e3b341"></i><i style="background:#3fb950"></i><span style="margin-left:10px">${esc(t)}</span></div>`;

// ---------------- scenes ----------------
// scene = { say:[en], html(p,F,t), anim(p,S,D,M,F), mood, bot:'center'|'corner'|'hide', media? }
function spotlightScenes(r, info, gain, site, F) {
  const n = r.n, v = r.sc?.v, col = VCOL[v] || '#8b949e', sc = [];
  const avatar = info.avatar || '';
  const ageDays = r.c ? Math.max(1, (Date.now() - Date.parse(r.c)) / DAY) : 365;
  const usual = Math.max(1, Math.round((r.s - gain) / ageDays)), mult = Math.round(gain / usual);
  // 1. hook
  sc.push({ mood: 'wow', bot: 'center',
    say: [`This repo got ${say(gain)} stars in a single day.`, `It's ${repoName(n)}, by ${ownerName(n)}. Let's see why.`],
    html: p => `${brand("today's pick")}${avatar ? `<img class="avatar" id="${p}a" src="${esc(avatar)}">` : ''}<div class="repo" id="${p}n">${esc(n.split('/')[1])}</div><div class="owner">by ${esc(ownerName(n))}</div>
      <div class="big" id="${p}g">${num(gain, '+')}</div><div class="lbl">⭐ stars today · 오늘 받은 스타</div>`,
    anim: (p, S, D, M) => [avatar ? A.pop(`#${p}a`, S + 0.1) : '', `tl.from('#${p}n',{opacity:0,y:60,duration:.5,ease:'back.out(1.6)'},${f2(S + 0.2)});`, A.pop(`#${p}g`, S + 0.4), A.count(`#${p}g`, gain, S + 0.45, 1.4)].join('\n') });
  // 2. why trending
  const facts = whyFacts(r, gain, info);
  sc.push({ mood: 'think', bot: 'corner',
    say: [mult >= 3 ? `That's about ${mult} times its usual daily pace.` : `That's a big day for it.`, ...facts.map(f => f[0])],
    html: p => `${brand('why it’s trending')}<div class="h">왜 뜨고 있을까?</div>
      <div class="bars"><div class="bar"><div class="k">평소 하루</div><div class="t"><i id="${p}b1" style="background:#8b949e"></i></div><div class="v">${esc(short(usual))}</div></div>
      <div class="bar"><div class="k">오늘</div><div class="t"><i id="${p}b2" style="background:#3fb950"></i></div><div class="v" style="color:#3fb950">${esc(short(gain))}</div></div></div>
      ${mult >= 3 ? `<div class="mult" id="${p}x">×${mult}</div>` : ''}<div class="pills">${facts.map((f, i) => `<div class="pill" id="${p}f${i}">${esc(f[1])}</div>`).join('')}</div>`,
    anim: (p, S, D, M) => [`tl.from('#${p} .h',{opacity:0,y:40,duration:.4},${f2(S + 0.05)});`, A.bar(`#${p}b1`, usual / gain, S + 0.3), A.bar(`#${p}b2`, 1, S + 0.6), mult >= 3 ? A.stamp(`#${p}x`, S + 1.3) : '',
      ...facts.map((_, i) => A.pop(`#${p}f${i}`, (M[i + 1] ?? S + 2) + 0.1))].join('\n') });
  // 3. what it is (show the real page / demo)
  const desc = cleanDesc(r, info);
  const media = info.media;
  sc.push({ mood: 'happy', bot: 'corner', media,
    say: [desc ? `In one line: ${desc}.` : `Here's what it looks like.`],
    html: (p, F2, t) => `${brand('what it is')}<div class="frame" id="${p}f">${winBar('github.com/' + n)}<div class="vp">
      ${media?.kind === 'page' ? `<img class="page" id="${p}pg" src="${esc(media.src)}">` : ''}
      ${media?.kind === 'image' ? `<img class="shot" id="${p}im" src="${esc(media.src)}">` : ''}
      ${media?.kind === 'video' && t ? `<video class="clip" id="${p}v" src="${esc(media.src)}" muted playsinline data-start="${f2(t.S + 0.3)}" data-duration="${f2(t.D - 0.3)}" data-track-index="3"></video>` : ''}</div></div>`,
    anim: (p, S, D) => [`tl.from('#${p}f',{opacity:0,y:140,rotateX:16,duration:.8,ease:'power3.out'},${f2(S + 0.1)});`,
      media?.kind === 'page' ? `tl.fromTo('#${p}pg',{y:0},{y:-${F.vert ? 900 : 700},duration:${f2(Math.max(1, D - 1.2))},ease:'power1.inOut'},${f2(S + 0.8)});` : '',
      media?.kind === 'image' ? `tl.fromTo('#${p}im',{scale:1.02},{scale:1.15,duration:${f2(D - 0.5)},ease:'none'},${f2(S + 0.3)});` : ''].join('\n') });
  // 4. second visual: README demo (if the page screenshot was used above)
  if (info.demo) {
    sc.push({ mood: 'wow', bot: 'corner', media: info.demo,
      say: [`And here it is in action.`],
      html: (p, F2, t) => `${brand('demo')}<div class="frame" id="${p}f">${winBar(n.split('/')[1] + ' demo')}<div class="vp">
        ${info.demo.kind === 'image' ? `<img class="shot" id="${p}im" src="${esc(info.demo.src)}">` : ''}
        ${info.demo.kind === 'video' && t ? `<video class="clip" id="${p}v" src="${esc(info.demo.src)}" muted playsinline data-start="${f2(t.S + 0.2)}" data-duration="${f2(t.D - 0.2)}" data-track-index="3"></video>` : ''}</div></div>`,
      anim: (p, S, D) => [`tl.from('#${p}f',{opacity:0,scale:.85,duration:.6,ease:'back.out(1.5)'},${f2(S + 0.1)});`, info.demo.kind === 'image' ? `tl.fromTo('#${p}im',{scale:1},{scale:1.18,x:-30,duration:${f2(D)},ease:'none'},${f2(S)});` : ''].join('\n') });
  }
  // 5. when to use it
  const uses = useCases(r, info), feats = (info.feats || []).slice(0, 3);
  if (uses.length || feats.length >= 2) {
    const items = uses.length ? uses.map(u => ({ en: u.en, ko: u.ko })) : feats.map((f, i) => ({ en: f.t, ko: info.featsKo?.[i] || f.t }));
    sc.push({ mood: 'happy', bot: 'corner',
      say: uses.length ? [`Reach for it when you want to ${uses.map(u => u.en).join(', or ')}.`] : [`What you get: ${feats.map(f => f.t.replace(/[.]$/, '')).join('; ')}.`],
      html: p => `${brand('when to use it')}<div class="h">${uses.length ? '이럴 때 쓰세요' : '이런 걸 해줘요'}</div><div class="uses">${items.map((it, i) => `<div class="use" id="${p}u${i}"><div class="n">${i + 1}</div><div class="t">${esc(cut(it.ko, 40))}</div></div>`).join('')}</div>`,
      anim: (p, S, D, M) => [`tl.from('#${p} .h',{opacity:0,y:40,duration:.4},${f2(S + 0.05)});`, `tl.from('#${p} .use',{opacity:0,x:140,duration:.5,stagger:${f2(Math.min(0.9, (D - 1) / Math.max(1, items.length)))},ease:'power3.out'},${f2(S + 0.4)});`].join('\n') });
  }
  // 6. try it: install + usage code
  if (info.install || info.usage) {
    const code = info.usage ? info.usage.code.split('\n').slice(0, 9).join('\n') : '';
    sc.push({ mood: 'happy', bot: 'corner',
      say: [info.install ? `Getting started takes one command.` : `Using it looks like this.`, ...(info.install && info.usage ? ['And using it looks like this.'] : [])],
      html: p => `${brand('try it')}${info.install ? `<div class="code" id="${p}t">${winBar('terminal')}<pre class="term"><span style="color:#8b949e">$ </span><span id="${p}c">${typed(info.install)}</span></pre></div>` : ''}
        ${info.usage ? `<div class="code" id="${p}u">${winBar(info.usage.lang)}<pre id="${p}uc">${typed(code)}</pre></div>` : ''}`,
      anim: (p, S, D, M) => [info.install ? `tl.from('#${p}t',{opacity:0,y:60,duration:.45},${f2(S + 0.05)});` + A.type(`#${p}c`, info.install, S + 0.35, Math.min(2, Math.max(0.8, info.install.length / 25))) : '',
        info.usage ? `tl.from('#${p}u',{opacity:0,y:60,duration:.45},${f2((M[1] ?? S + 0.2) - 0.1)});` + A.type(`#${p}uc`, code, (M[1] ?? S + 0.2) + 0.3, Math.min(3.2, Math.max(1.2, code.length / 70))) : ''].join('\n') });
  }
  // 7. reality check
  const D = r.deep || {}, iss = (D.oi || 0) + (D.ci || 0), issP = iss ? Math.round((D.ci / iss) * 100) : null;
  sc.push({ mood: MOOD[v] || 'think', bot: 'corner',
    say: [`So, do people actually use it?`, realityLine(r)],
    html: p => `${brand('reality check')}<div class="h">진짜 쓰일까?</div><div class="stats">
      <div class="stat"><div class="v" id="${p}s1">${num(D.c90)}</div><div class="k">커밋 (3개월)</div></div>
      <div class="stat"><div class="v" id="${p}s2">${num(D.ppl)}</div><div class="k">참여자</div></div>
      ${r.dl ? `<div class="stat"><div class="v" id="${p}s3">${num(r.dl.m)}</div><div class="k">월 다운로드</div></div>` : issP != null ? `<div class="stat"><div class="v" id="${p}s3">${num(issP, '', '%')}</div><div class="k">이슈 해결률</div></div>` : ''}</div>
      <div class="verdict" id="${p}v" style="color:${col};border-color:${col}">${esc(VKO[v] || '')}</div>`,
    anim: (p, S, D2, M) => [`tl.from('#${p} .h',{opacity:0,y:40,duration:.4},${f2(S + 0.05)});`, A.up(`#${p} .stat`, (M[1] ?? S + 1) - 0.2, 0.15),
      A.count(`#${p}s1`, D.c90, (M[1] ?? S + 1), 1.2), A.count(`#${p}s2`, D.ppl, (M[1] ?? S + 1) + 0.1, 1.2), r.dl ? A.count(`#${p}s3`, r.dl.m, (M[1] ?? S + 1) + 0.2, 1.2) : issP != null ? A.count(`#${p}s3`, issP, (M[1] ?? S + 1) + 0.2, 1.2) : '',
      A.stamp(`#${p}v`, S + D2 - 1.6)].join('\n') });
  sc.push(outroScene(site, F, `Full details and more repos are on Star Board, link below. See you tomorrow!`));
  return sc;
}
function outroScene(site, F, line) {
  const host = site.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return { mood: 'happy', bot: 'center', say: [line],
    html: p => `${brand()}<div class="title" id="${p}h">${words('GitHub Star Board')}</div><div class="url" id="${p}u">${typed(host)}</div><div class="starbtn" id="${p}b">★ Star on GitHub</div>`,
    anim: (p, S, D) => [A.words(`#${p}h`, S + 0.1), A.type(`#${p}u`, host, S + 0.6, 1), A.pop(`#${p}b`, S + 1.4),
      `tl.to('#${p}b',{scale:1.08,duration:.35,yoyo:true,repeat:${Math.max(1, Math.floor((D - 2) / 0.7) * 2 - 1)},ease:'sine.inOut'},${f2(S + 2)});`].join('\n') };
}
function introScene(F, en, title, sub) {
  return { mood: 'wow', bot: 'center', say: en,
    html: p => `${brand()}<div class="title" id="${p}h">${title.split('|').map(words).join('<br>')}</div><div class="sub2" id="${p}s">${esc(sub)}</div>`,
    anim: (p, S) => [A.words(`#${p}h`, S + 0.15), `tl.from('#${p}s',{opacity:0,y:30,duration:.5},${f2(S + 0.9)});`].join('\n') };
}
function rankScene(r, rank, gain, avatar, F, period) {
  const v = r.sc?.v, col = VCOL[v] || '#8b949e', D = r.deep || {}, desc = cleanDesc(r, {});
  const vs = { good: 'Actually used.', gem: 'Underrated.', mature: 'Mature and widely used.', hype: 'Lots of stars, not much activity.', bad: 'Stars outpace engagement.', dead: 'No updates in a year.', doc: 'A learning resource.', early: 'Still early.' };
  const ev = evd(r, v === 'hype' || v === 'early' ? '-' : '+', 1)[0];
  return { mood: MOOD[v] || 'think', bot: 'corner',
    say: [`Number ${rank}: ${repoName(r.n)}, up ${say(gain)} stars ${period === 'weekly' ? 'this week' : 'today'}.`, `${desc ? clause(desc, 64) + '. ' : ''}${ev ? ev.charAt(0).toUpperCase() + ev.slice(1) + '.' : vs[v] || ''}`],
    html: p => `${brand(period === 'weekly' ? 'this week' : 'today')}<div style="display:flex;align-items:center;gap:30px;justify-content:center"><div class="rank" id="${p}r">${rank}</div>${avatar ? `<img class="avatar" id="${p}a" src="${esc(avatar)}">` : ''}</div>
      <div class="repo" id="${p}n">${esc(r.n.split('/')[1])}</div><div class="owner">by ${esc(ownerName(r.n))}</div>
      <div class="stats"><div class="stat"><div class="v" style="color:#3fb950" id="${p}g">${num(gain, '+')}</div><div class="k">${period === 'weekly' ? '이번 주 스타' : '오늘 스타'}</div></div>
      <div class="stat"><div class="v" id="${p}c">${num(D.c90)}</div><div class="k">커밋 (3개월)</div></div><div class="stat"><div class="v" id="${p}p">${num(D.ppl)}</div><div class="k">참여자</div></div></div>
      <div class="verdict" id="${p}v" style="color:${col};border-color:${col}">${esc(VKO[v] || '')}</div>`,
    anim: (p, S, D2, M) => [`tl.from('#${p}r',{rotateX:-90,opacity:0,duration:.55,ease:'back.out(1.6)'},${f2(S + 0.05)});`, avatar ? A.pop(`#${p}a`, S + 0.2) : '', `tl.from('#${p}n',{opacity:0,y:50,duration:.45},${f2(S + 0.25)});`,
      A.up(`#${p} .stat`, S + 0.5, 0.12), A.count(`#${p}g`, gain, S + 0.55, 1.1), A.count(`#${p}c`, D.c90, S + 0.65, 1.1), A.count(`#${p}p`, D.ppl, S + 0.75, 1.1), A.stamp(`#${p}v`, (M[1] ?? S + 2) + 0.3)].join('\n') };
}

function buildSpecs(data, types, site, infos = {}) {
  const R = data.repos, gen = new Date(data.generatedAt), kst = new Date(gen.getTime() + 9 * 36e5), day = data.generatedAt.slice(0, 10);
  const mdEn = kst.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' }), mdKo = `${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일`;
  const P = { vert: true, W: 1080, H: 1920 }, L = { vert: false, W: 1920, H: 1080 };
  const pick = (k, n) => (data.trending[k] || []).filter(x => R[x.n]?.sc).slice(0, n).map(x => ({ r: R[x.n], g: x.g }));
  const av = n => infos[n]?.avatar || `https://github.com/${ownerName(n)}.png?size=200`;
  const specs = [];
  if (types.includes('daily')) {
    const top = pick('daily:all', 5);
    specs.push({ id: `daily-${day}`, F: P, title: `Today's fastest-rising GitHub repos (${mdEn}) · 오늘 GitHub 급상승 Top 5 #shorts`, list: top, scenes: [
      introScene(P, [`Hi, I'm Starby.`, `Here are today's five fastest-rising GitHub repos, and whether people actually use them.`], `Today's|Top ${top.length}`, `${mdKo} · GitHub 급상승`),
      ...top.map(({ r, g }, i) => rankScene(r, i + 1, g, av(r.n), P, 'daily')),
      outroScene(site, P, `Full ranking and details are on Star Board, link below. See you tomorrow!`)] });
  }
  if (types.includes('spotlight')) {
    for (const { r, g } of pick('daily:all', 12).filter(x => !['doc', 'archived', 'dead'].includes(x.r.sc.v)).slice(0, 3)) {
      specs.push({ id: `spotlight-${r.n.replace('/', '__')}-${day}`, F: P, repo: r.n, title: `${r.n.split('/')[1]}: why it's trending and when to use it · 오늘 스타 ${short(g)} #shorts`, list: [{ r, g }], scenes: spotlightScenes(r, infos[r.n] || {}, g, site, P) });
    }
  }
  if (types.includes('weekly')) {
    const top = pick('weekly:all', 10), all = Object.values(R).filter(r => r.sc);
    const gems = all.filter(r => r.sc.v === 'gem').sort((a, b) => b.sc.util - a.sc.util).slice(0, 3);
    const hype = all.filter(r => r.sc.v === 'hype' && r.sc.g7 != null).sort((a, b) => b.sc.g7 - a.sc.g7).slice(0, 3);
    const listScene = (koTitle, color, rows, en, mood) => ({ mood, bot: 'corner', say: en,
      html: p => `${brand('this week')}<div class="h" style="color:${color}">${esc(koTitle)}</div><div class="list">${rows.map(x => `<div class="row"><img src="${esc(av(x.n))}"><div><div class="n">${esc(x.n)}</div><div class="m">${esc(x.m)}</div></div></div>`).join('')}</div>`,
      anim: (p, S) => [`tl.from('#${p} .h',{opacity:0,y:40,duration:.4},${f2(S + 0.05)});`, `tl.from('#${p} .row',{opacity:0,x:-80,duration:.45,stagger:.3,ease:'power3.out'},${f2(S + 0.4)});`].join('\n') });
    const scenes = [introScene(L, [`Hi, I'm Starby.`, `This is your weekly GitHub star report: the ten fastest-rising repos, the hype, and the hidden gems.`], `Weekly|Star Report`, `${mdKo} 기준 주간 리포트`),
      ...top.map(({ r, g }, i) => rankScene(r, i + 1, g, av(r.n), L, 'weekly'))];
    if (hype.length) scenes.push(listScene('스타만 많은 곳', '#e3b341', hype.map(r => ({ n: r.n, m: `+${short(r.sc.g7)}/주 · 커밋(3개월) ${short(r.deep?.c90 || 0)}` })), [`Lots of stars, not much behind them yet: ${hype.map(r => repoName(r.n)).join(', ')}.`], 'skeptic'));
    if (gems.length) scenes.push(listScene('숨은 실력파', '#a371f7', gems.map(r => ({ n: r.n, m: `★${short(r.s)} · 커밋(3개월) ${short(r.deep?.c90 || 0)} · 참여자 ${short(r.deep?.ppl || 0)}` })), [`And the underrated ones, with real work behind fewer stars: ${gems.map(r => repoName(r.n)).join(', ')}.`], 'wow'));
    scenes.push(outroScene(site, L, `Full ranking and details are on Star Board, link below. See you next week!`));
    specs.push({ id: `weekly-${day}`, F: L, title: `Weekly GitHub Star Report (${mdEn}) · 주간 GitHub 스타 리포트`, list: top, scenes });
  }
  return specs;
}

// ---------------- composition ----------------
function compose(spec, timing, opts = {}) {
  const { F } = spec, total = timing.total, gsapSrc = opts.gsapSrc || 'assets/gsap.min.js';
  const parts = [], anims = [], audios = [], caps = [];
  spec.scenes.forEach((s, i) => {
    const t = timing.scenes[i], p = `s${i}`;
    parts.push(`<div id="${p}" class="clip scene" data-start="${f2(t.S)}" data-duration="${f2(t.D)}" data-track-index="1">${s.html(p, F, t)}</div>`);
    anims.push(A.enter(p, t.S), s.anim(p, t.S, t.D, t.M, F), i < spec.scenes.length - 1 ? A.exit(p, t.S, t.D) : '');
    // Starby: position, mood
    const center = F.vert ? { x: 350, y: -30, s: 1.5 } : { x: 30, y: -40, s: 1.4 };
    const pos = s.bot === 'center' ? center : s.bot === 'hide' ? { x: -500, y: 0, s: 1 } : { x: 0, y: 0, s: 1 };
    anims.push(`tl.to('#bot',{x:${pos.x},y:${pos.y},scale:${pos.s},duration:.6,ease:'back.out(1.4)'},${f2(t.S)});`);
    const mood = { happy: [-4, 0, 0, 1], wow: [-9, 0, 0, 1.15], think: [-2, -10, 6, 1], skeptic: [-8, -14, 10, 0.95] }[s.mood || 'happy'];
    anims.push(`tl.to('#sbbrowL',{y:${mood[0]},rotate:${mood[1]},duration:.3},${f2(t.S + 0.1)});tl.to('#sbbrowR',{y:${s.mood === 'skeptic' ? 2 : mood[0]},rotate:${mood[2]},duration:.3},${f2(t.S + 0.1)});tl.to('#sbeyes',{scale:${mood[3]},duration:.3},${f2(t.S + 0.1)});`);
    anims.push(`tl.fromTo('#sbbody',{rotate:0},{rotate:${i % 2 ? 8 : -8},duration:.25,yoyo:true,repeat:1,ease:'sine.inOut'},${f2(t.S)});`);
    t.sents.forEach((x, j) => {
      audios.push(`<audio data-start="${f2(x.start)}" data-duration="${f2(x.dur)}" data-track-index="${6 + (j % 2)}" data-volume="1" src="${esc(x.audio)}"></audio>`);
      const flaps = Math.max(1, Math.floor(x.dur / 0.2));
      anims.push(`tl.to('#sbmouth',{attr:{ry:11},duration:.1,yoyo:true,repeat:${flaps * 2 - 1},ease:'sine.inOut'},${f2(x.start)});`);
      const cap = noUrl(x.ko || x.text), max = F.vert ? 36 : 56;
      const pieces = []; let buf = '';
      for (const seg of cap.split(/(?<=[.!?。,，])\s+/)) { if ((buf + ' ' + seg).trim().length > max && buf) { pieces.push(buf.trim()); buf = seg; } else buf = (buf + ' ' + seg).trim(); }
      if (buf) pieces.push(buf.trim());
      for (let k = 0; k < pieces.length; k++) if (pieces[k].length > max + 8) { const w = pieces[k].split(' '); let a = '', rest = []; for (const x of w) { if ((a + ' ' + x).trim().length <= max || !a) a = (a + ' ' + x).trim(); else rest.push(x); } pieces.splice(k, 1, a, rest.join(' ')); }
      const tl0 = pieces.reduce((a, b) => a + b.length, 0) || 1; let off = 0;
      pieces.forEach((pc, k) => {
        const st = x.start + (x.dur * off) / tl0, du = (x.dur * pc.length) / tl0 + (k === pieces.length - 1 ? GAP : 0); off += pc.length;
        const id = `c${i}_${j}_${k}`;
        caps.push(`<div id="${id}" class="clip cap" data-start="${f2(st)}" data-duration="${f2(du)}" data-track-index="${8 + ((j + k) % 2)}"><span>${esc(cut(pc, max + 16))}</span></div>`);
        anims.push(`tl.from('#${id} span',{opacity:0,y:24,duration:.18,ease:'power2.out'},${f2(st)});`);
      });
    });
  });
  // blink every ~3.2s, idle bob
  for (let b = 1.6; b < total - 0.3; b += 3.2 + ((b * 7) % 1)) anims.push(`tl.to('#sbeyes',{scaleY:.1,duration:.06,yoyo:true,repeat:1},${f2(b)});`);
  anims.push(`tl.to('#botinner',{y:-14,duration:1.1,yoyo:true,repeat:${Math.max(1, Math.floor(total / 1.1))},ease:'sine.inOut'},0);`);
  const bgCols = ['#1f6feb', '#a371f7', '#f78166', '#ffc83d'];
  const blobs = bgCols.map((c, i) => `<div class="blob" id="b${i}" style="background:radial-gradient(circle,${c} 0%,${c}55 35%,transparent 70%);width:${F.W * 0.6}px;height:${F.W * 0.6}px;left:${[10, 55, 20, 60][i]}%;top:${[5, 15, 60, 55][i]}%"></div>`).join('');
  const bgAnim = bgCols.map((_, i) => `tl.to('#b${i}',{x:${[260, -220, 180, -260][i]},y:${[180, 240, -200, -160][i]},scale:${[1.25, 0.85, 1.2, 0.9][i]},duration:${f2(total / 2)},ease:'sine.inOut',yoyo:true,repeat:1},0);`).join('\n');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(spec.id)}</title><style>${css(F)}</style></head><body>
<div id="root" data-composition-id="root" data-start="0" data-width="${F.W}" data-height="${F.H}">
  <div id="bgwrap" class="clip" data-start="0" data-duration="${f2(total)}" data-track-index="0" style="position:absolute;inset:0"><div class="bg">${blobs}</div><div class="grid"></div></div>
  ${parts.join('\n  ')}
  <div id="botwrap" class="clip" data-start="0" data-duration="${f2(total)}" data-track-index="4" style="position:absolute;inset:0;pointer-events:none"><div id="bot"><div id="botinner" style="width:100%;height:100%">${STARBY}</div></div></div>
  ${caps.join('\n  ')}
  <div id="progwrap" class="clip" data-start="0" data-duration="${f2(total)}" data-track-index="10" style="position:absolute;inset:0;pointer-events:none"><div class="prog" id="prog"></div></div>
  ${audios.join('\n  ')}
  <script src="${gsapSrc}"></script>
  <script>
    const tl = gsap.timeline({ paused: true });
    tl.fromTo('#prog', { scaleX: 0 }, { scaleX: 1, duration: ${f2(total)}, ease: 'none' }, 0);
    ${bgAnim}
    ${anims.filter(Boolean).join('\n    ')}
    tl.set({}, {}, ${f2(total)});
    window.__timelines = window.__timelines || {};
    window.__timelines.root = tl;
  </script>
</div></body></html>`;
}
function estimateTiming(spec) {
  let cur = 0; const scenes = [];
  for (const s of spec.scenes) {
    const S = cur; let t = S + HEAD; const M = [], sents = [];
    s.say.forEach((txt, j) => { const d = Math.max(1.2, txt.split(/\s+/).length / 2.7); M.push(t); sents.push({ start: t, dur: d, audio: `assets/a${scenes.length}_${j}.mp3`, text: txt, ko: s.ko?.[j] }); t += d + GAP; });
    const D = t - S + TAIL; scenes.push({ S, D, M, sents }); cur = S + D;
  }
  return { total: cur, scenes };
}
const fixKo = s => String(s).replace(/별(을|를)/g, '스타를').replace(/별(이|가)/g, '스타가').replace(/별(은|는)/g, '스타는').replace(/별(의|에)/g, '스타$1').replace(/별/g, '스타').replace(/커밋과\s/g, '커밋, ');
async function translateKo(texts) {
  if (!texts.length) return [];
  try {
    const r = await tfetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=' + encodeURIComponent(texts.map(t => t.replace(/\n/g, ' ')).join('\n')));
    const j = await r.json(); const parts = j[0].map(x => x[0]).join('').split('\n').map(s => s.trim());
    return (parts.length === texts.length ? parts : texts).map(fixKo);
  } catch { return texts; }
}

// ---------------- main (Node) ----------------
async function main() {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const { execFile, spawn } = await import('node:child_process');
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
  const R = data.repos;
  let browser = null;
  try { const { chromium } = await import('playwright'); browser = await chromium.launch(); } catch (e) { console.log('playwright unavailable: ' + e.message); }
  const shoot = async (url, file, w = 1280, h = 2200) => {
    if (!browser) return false;
    const pg = await browser.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
    try { await pg.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {}); await pg.waitForTimeout(1200);
      await pg.evaluate(() => document.querySelectorAll('[class*=cookie],[id*=cookie],.js-header-wrapper ~ .flash').forEach(e => e.remove()));
      await pg.screenshot({ path: file, clip: { x: 0, y: 0, width: w, height: h }, fullPage: true }); return true;
    } catch { return false; } finally { await pg.close(); }
  };

  // README + media for spotlight candidates
  const infos = {};
  if (types.includes('spotlight')) {
    const cands = (data.trending['daily:all'] || []).filter(x => R[x.n]?.sc && !['doc', 'archived', 'dead'].includes(R[x.n].sc.v)).slice(0, 3);
    for (const { n } of cands) {
      try {
        const raw = await (await tfetch(`https://raw.githubusercontent.com/${n}/HEAD/README.md`)).text();
        const info = extractReadme(raw, n);
        const ko = await translateKo(info.feats.map(f => f.t));
        infos[n] = { ...info, featsKo: ko };
        console.log(`README ${n}: feats ${info.feats.length}, install ${info.install ? 'yes' : 'no'}, usage ${info.usage ? 'yes' : 'no'}, media ${info.mediaUrls.length}`);
      } catch (e) { console.log(`README failed ${n}: ${e.message}`); infos[n] = {}; }
    }
  }

  const specs0 = buildSpecs(data, types, site, infos);
  for (const spec0 of specs0) {
    const dir = path.join(OUT, 'projects', spec0.id), assets = path.join(dir, 'assets');
    await fs.mkdir(assets, { recursive: true });
    await fs.writeFile(path.join(assets, 'gsap.min.js'), gsapJs);
    const local = async (url, name) => { try { const r = await tfetch(url, { redirect: 'follow' }); if (!r.ok) return null; const b = Buffer.from(await r.arrayBuffer()); if (b.length < 500) return null; await fs.writeFile(path.join(assets, name), b); return `assets/${name}`; } catch { return null; } };
    // avatars
    console.log(`prep: ${spec0.id} avatars/media`);
    const avs = {};
    for (const { r } of spec0.list) avs[r.n] = await local(`https://github.com/${ownerName(r.n)}.png?size=200`, `av-${ownerName(r.n).replace(/[^\w-]/g, '')}.png`);
    if (spec0.repo) {
      const info = infos[spec0.repo] = { ...(infos[spec0.repo] || {}), avatar: avs[spec0.repo] };
      // page screenshot of the repo on GitHub (shows README as people see it)
      if (await shoot(`https://github.com/${spec0.repo}`, path.join(assets, 'page.png'))) info.media = { kind: 'page', src: 'assets/page.png' };
      // README demo: GIF/MP4 -> video clip, image -> zoom
      const cands = (await (async () => { try { const raw = await (await tfetch(`https://raw.githubusercontent.com/${spec0.repo}/HEAD/README.md`)).text(); return extractReadme(raw, spec0.repo).mediaUrls; } catch { return []; } })());
      let demo = null;
      for (const [k, u] of cands.entries()) {
        try {
          const r = await tfetch(u, { redirect: 'follow' }); if (!r.ok) continue;
          const ct = r.headers.get('content-type') || ''; const buf = Buffer.from(await r.arrayBuffer());
          if (buf.length < 8000 || buf.length > 25e6) continue;
          if (/gif/.test(ct) || /\.gif(\?|$)/i.test(u) || /video|mp4|quicktime|webm/.test(ct)) {
            const inF = path.join(assets, `m${k}.src`), outF = path.join(assets, `m${k}.mp4`);
            await fs.writeFile(inF, buf);
            await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', inF, '-t', '30', '-an', '-movflags', '+faststart', '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(min(1600\\,iw)/2)*2:-2', '-c:v', 'libx264', '-preset', 'veryfast', outF]);
            demo = { kind: 'video', src: `assets/m${k}.mp4` }; break;
          }
          if (/image\/(png|jpe?g|webp)/.test(ct)) { const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg'; await fs.writeFile(path.join(assets, `m${k}.${ext}`), buf); demo = { kind: 'image', src: `assets/m${k}.${ext}` }; break; }
        } catch {}
      }
      if (!info.media && demo) info.media = demo; else if (demo) info.demo = demo;
      if (!info.media) { const og = await local(`https://opengraph.githubassets.com/1/${spec0.repo}`, 'og.png'); if (og) info.media = { kind: 'image', src: og }; }
    }
    const spec = buildSpecs(data, types, site, { ...infos, ...Object.fromEntries(Object.entries(avs).map(([k, v]) => [k, { ...(infos[k] || {}), avatar: v }])) }).find(s => s.id === spec0.id);

    console.log(`prep: ${spec.id} assets ready, translating + tts`);
    // Korean subtitles
    const allSay = spec.scenes.flatMap(s => s.say), allKo = await translateKo(allSay);
    let q = 0; for (const s of spec.scenes) s.ko = s.say.map(() => allKo[q++]);
    // narration
    let cur = 0; const tsc = [];
    for (const [i, s] of spec.scenes.entries()) {
      const S = cur; let t = S + HEAD; const M = [], sents = [];
      for (const [j, txt] of s.say.entries()) {
        const f = `assets/a${i}_${j}.mp3`; let dur = 0;
        for (let a = 0; a < 3 && !dur; a++) {
          try { await run('edge-tts', ['--voice', VOICE, `--rate=${RATE}`, '--text', txt, '--write-media', path.join(dir, f)], { timeout: 30000 });
            const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(dir, f)]); dur = parseFloat(stdout) || 0;
          } catch (e) { console.log(`  tts retry ${a + 1} (${spec.id} ${i}.${j}): ${String(e.message).split('\n')[0].slice(0, 160)}`); await new Promise(r => setTimeout(r, 2500)); }
        }
        if (!dur) { dur = Math.max(1.5, txt.split(/\s+/).length / 2.6); await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', String(dur), path.join(dir, f)]); }
        M.push(t); sents.push({ start: t, dur, audio: f, text: txt, ko: s.ko[j] }); t += dur + GAP;
      }
      const D = t - S + TAIL; tsc.push({ S, D, M, sents }); cur = S + D;
    }
    const timing = { total: cur, scenes: tsc };
    await fs.writeFile(path.join(dir, 'index.html'), compose(spec, timing));
    const outFile = path.join(OUT, `${spec.id}.mp4`);
    console.log(`render: ${spec.id} (${timing.total.toFixed(1)}s, ${spec.scenes.length} scenes)`);
    const t0 = Date.now();
    await new Promise((res, rej) => {
      const ch = spawn('npx', ['hyperframes', 'render', dir, '--output', outFile, '--quality', 'standard', '--fps', ENV.HF_FPS || '24'], { stdio: ['ignore', 'pipe', 'pipe'] });
      let last = 0; const onData = d => { const s = String(d); const m = s.match(/(\d{1,3})%/g); if (m && Date.now() - last > 30000) { last = Date.now(); console.log(`  ${spec.id}: ${m.at(-1)} (${Math.round((Date.now() - t0) / 1000)}s)`); } if (/error/i.test(s)) console.log('  ' + s.trim().slice(0, 300)); };
      ch.stdout.on('data', onData); ch.stderr.on('data', onData);
      const killer = setTimeout(() => { ch.kill('SIGKILL'); rej(new Error('render timeout')); }, 30 * 60000);
      ch.on('close', code => { clearTimeout(killer); code === 0 ? res() : rej(new Error('render exit ' + code)); });
    });
    console.log(`  rendered in ${Math.round((Date.now() - t0) / 1000)}s`);
    await fs.writeFile(path.join(OUT, `${spec.id}-script.txt`), spec.scenes.map((s, i) => `[${i + 1}] ${s.say.join(' ')}\n    ${s.ko.join(' ')}`).join('\n\n'));
    const links = spec.list.map(({ r, g }, i) => `${spec.list.length > 1 ? `${i + 1}. ` : ''}${r.n} (+${short(g)}) ${site}r/${r.n}/`).join('\n');
    await fs.writeFile(path.join(OUT, `${spec.id}-youtube.txt`), `${spec.title}\n\n${spec.repo ? `Why ${spec.repo} is trending, what it does, when to use it, and whether people actually use it. / 왜 뜨는지, 언제 쓰면 좋은지, 실제로 쓰이는지까지.` : 'GitHub repos gaining stars fastest, checked against real usage. / 스타가 빠르게 늘어난 저장소를 실제 사용 지표로 확인했습니다.'}\n\n${links}\n\nGitHub Star Board: ${site}\n\n#GitHub #opensource #developer #AI${spec.F.vert ? ' #shorts' : ''}\n`);
    console.log(`done: ${outFile}`);
  }
  if (browser) await browser.close();
}

if (typeof process !== 'undefined' && /hf-video\.mjs$/.test(process.argv?.[1] || '')) {
  main().catch(e => { console.error(e); process.exit(1); });
}
