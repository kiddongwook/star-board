#!/usr/bin/env node
// GitHub Star Board - HyperFrames video generator v4 (English narration + English on-screen text; VIDEO_SUBS=ko for Korean captions)
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
const clause = (s, n) => { s = noUrl(s).split(/(?<=[a-z0-9)][.!?])\s+/i)[0].split(/\s[—–]\s|\s-\s|:\s/)[0]; if (s.length <= n) return s.replace(/[.。]$/, ''); let t = s.slice(0, n).replace(/\s+\S*$/, ''); while (STOPW.test(t)) t = t.replace(STOPW, ''); return t.replace(/[,;:\s]+$/, ''); };
const cut = (s, n) => { s = noUrl(s); if (s.length <= n) return s; const m = s.slice(0, n).match(/^(.*[.。!?,，、;])\s/); return m && m[1].length > n * 0.5 ? m[1].replace(/[,;]$/, '') : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'; };
const hash = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const pickV = (arr, key) => arr[hash(key) % arr.length];
const repoName = n => n.split('/')[1].replace(/[-_]+/g, ' ');
const ownerName = n => n.split('/')[0];
const DAY = 864e5;
const VCOL = { good: '#3fb950', mature: '#a371f7', gem: '#a371f7', hype: '#e3b341', bad: '#f85149', doc: '#39c5cf', dead: '#8b949e', archived: '#8b949e', early: '#8b949e', quick: '#8b949e', na: '#8b949e' };
const VKO = { good: '실사용 확인', mature: '오래 쓰이는 중', gem: '숨은 실력파', hype: '스타만 많음', early: '아직 초기', bad: '참여 대비 스타 과다', doc: '학습 자료', dead: '업데이트 멈춤', archived: '보관됨', quick: '분석 대기', na: '데이터 부족' };
const VEN = { good: 'ACTUALLY USED', mature: 'MATURE & USED', gem: 'HIDDEN GEM', hype: 'MOSTLY HYPE', early: 'TOO EARLY', bad: 'STARS > ENGAGEMENT', doc: 'LEARNING RESOURCE', dead: 'NOT MAINTAINED', archived: 'ARCHIVED', quick: 'PENDING', na: 'NO DATA' };
const SUBS = ENV.VIDEO_SUBS || 'en'; // 'en' = English captions (default); 'ko' = Korean captions via translation
const cap1 = s => String(s).charAt(0).toUpperCase() + String(s).slice(1);
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
  if (age != null && age < 60) out.push([`It's brand new: only ${Math.max(1, Math.round(age))} days old.`, `${Math.max(1, Math.round(age))} days old`, `나온 지 겨우 ${Math.max(1, Math.round(age))}일 된 새 프로젝트예요.`]);
  else if (age != null && age < 180) out.push([`It's only ${Math.round(age / 30)} months old.`, `${Math.round(age / 30)} months old`, `나온 지 ${Math.round(age / 30)}개월밖에 안 됐어요.`]);
  if (BIG_ORG.test(ownerName(r.n))) out.push([`It comes from ${ownerName(r.n)}.`, `by ${ownerName(r.n)}`, `${ownerName(r.n)}에서 만들었어요.`]);
  const D = r.deep; const rd = D?.lr ? (now - Date.parse(D.lr)) / DAY : null;
  if (rd != null && rd <= 10) out.push([`A new release, ${D.tag || 'a new version'}, just shipped.`, `new ${D.tag || 'release'}`, `새 버전${D.tag ? ' ' + D.tag : ''}도 막 나왔고요.`]);
  const tp = (r.t || []).join(' ');
  const hot = [[/claude-code|coding-agent|ai-coding/, 'AI coding agents', 'AI 코딩 에이전트'], [/ai-agents?|agent/, 'AI agents', 'AI 에이전트'], [/mcp/, 'MCP tools', 'MCP'], [/\bllm/, 'large language models', 'LLM'], [/\brag\b/, 'RAG', 'RAG']].find(([re]) => re.test(tp));
  if (hot) out.push([`And it rides the ${hot[1]} wave.`, `${hot[1]} wave`, `요즘 뜨는 ${hot[2]} 흐름도 탔어요.`]);
  if (r.dl?.m >= 1e5) out.push([`It already gets ${say(r.dl.m)} downloads a month.`, `${short(r.dl.m)} downloads/mo`, `벌써 한 달 다운로드가 ${short(r.dl.m)}예요.`]);
  return out.slice(0, 2);
}
// description match first (what the repo says it is), topics only if the description says nothing; word-start boundaries ("ui" must not match "build")
function useCases(r, info) {
  const d = ((r.d || '') + ' ' + (info?.para || '')).toLowerCase(), tp = (r.t || []).join(' ').toLowerCase();
  const hit = src => TOPIC_USE.filter(([re]) => new RegExp('(^|[^a-z0-9])(?:' + re.source + ')').test(src)).map(([, en, ko]) => ({ en, ko }));
  const a = hit(d); return (a.length ? a : hit(tp)).slice(0, 2).map(u => ({ ...u, strong: a.length > 0 }));
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
  cmds.sort((a, b) => (pri(a) + (a.length > 60 ? 3 : 0)) - (pri(b) + (b.length > 60 ? 3 : 0)) || a.length - b.length);
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
// ---------------- Starby (host character, drawn in code; rig parts are animated by GSAP) ----------------
// rig ids: #sbrig (whole body, origin feet 120 255) #sbarmL (origin 76 134) #sbarmR (origin 166 136) .sbpup (eye look) .sblid (blink)
// #sbbrowL/#sbbrowR, #sbmo (mouth opening, attr ry 1..17) + #sbtg (tongue, attr cy)
const starPts = (cx, cy, R, r) => Array.from({ length: 10 }, (_, k) => { const a = (-90 + k * 36) * Math.PI / 180, rr = k % 2 ? r : R; return (cx + rr * Math.cos(a)).toFixed(1) + ',' + (cy + rr * Math.sin(a)).toFixed(1); }).join(' ');
const SKIN = '#f3b230';
function starbySvg() {
  const P = starPts(120, 122, 90, 50);
  const eye = (x, k) => '<g><ellipse cx="' + x + '" cy="108" rx="17.5" ry="20.5" fill="#fff" stroke="#b9770f" stroke-width="1.3"/>' +
    '<g clip-path="url(#sbce' + k + ')"><g class="sbpup"><circle cx="' + x + '" cy="110" r="13.5" fill="url(#sbir)"/><circle cx="' + x + '" cy="110" r="6.8" fill="#0b0712"/><circle cx="' + (x - 4.8) + '" cy="103" r="4.8" fill="#fff"/><circle cx="' + (x + 4.8) + '" cy="116.5" r="2.1" fill="#fff" opacity=".85"/></g>' +
    '<g class="sblid"><rect x="' + (x - 19) + '" y="86" width="38" height="44" fill="#ffcb45"/><path d="M' + (x - 15) + ',127 Q' + x + ',132 ' + (x + 15) + ',127" stroke="#7a4a08" stroke-width="3" fill="none" stroke-linecap="round"/></g></g></g>';
  const shoe = (x0) => '<g><path d="M' + x0 + ',248 Q' + x0 + ',228 ' + (x0 + 18) + ',229 Q' + (x0 + 32) + ',230 ' + (x0 + 34) + ',246 Z" fill="#2f6fe0"/><rect x="' + (x0 - 2) + '" y="245" width="38" height="9" rx="4.5" fill="#f2f4f8"/><path d="M' + (x0 + 11) + ',234 l9,0 M' + (x0 + 10) + ',239 l10,0" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></g>';
  return '<svg viewBox="0 0 240 280" width="100%" height="100%" style="overflow:visible"><defs>' +
    '<radialGradient id="sbg" gradientUnits="userSpaceOnUse" cx="96" cy="84" r="132"><stop offset="0" stop-color="#fff0a0"/><stop offset=".45" stop-color="#ffc93c"/><stop offset="1" stop-color="#e8941a"/></radialGradient>' +
    '<radialGradient id="sbir" cx="45%" cy="38%" r="62%"><stop offset="0" stop-color="#6d5c8c"/><stop offset=".6" stop-color="#2c2140"/><stop offset="1" stop-color="#140e20"/></radialGradient>' +
    '<filter id="sbbl" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="7"/></filter>' +
    '<clipPath id="sbce0"><ellipse cx="98" cy="108" rx="17.5" ry="20.5"/></clipPath><clipPath id="sbce1"><ellipse cx="142" cy="108" rx="17.5" ry="20.5"/></clipPath>' +
    '<clipPath id="sbcm"><rect x="96" y="141" width="48" height="36"/></clipPath></defs>' +
    '<ellipse id="sbshadow" cx="120" cy="262" rx="62" ry="9" fill="#000" opacity=".3"/>' +
    '<g id="sbrig"><g id="sblegs"><path d="M104,168 L101,236" stroke="#f0ac2a" stroke-width="15" stroke-linecap="round"/><path d="M137,168 L141,236" stroke="#f0ac2a" stroke-width="15" stroke-linecap="round"/>' + shoe(84) + shoe(124) + '</g>' +
    '<g id="sbbody"><polygon points="' + P + '" fill="#c9790f" stroke="#c9790f" stroke-width="30" stroke-linejoin="round" transform="translate(0,5)"/>' +
    '<polygon points="' + P + '" fill="url(#sbg)" stroke="url(#sbg)" stroke-width="30" stroke-linejoin="round"/>' +
    '<ellipse cx="90" cy="66" rx="26" ry="15" fill="#fff" opacity=".5" filter="url(#sbbl)" transform="rotate(-25 90 66)"/>' +
    '<g id="sbarmL"><path d="M76,134 Q56,130 42,120" stroke="' + SKIN + '" stroke-width="13" stroke-linecap="round" fill="none"/>' +
    '<g id="sbhandL"><circle cx="37" cy="117" r="12" fill="#f4f5fa" stroke="#c9cbd6" stroke-width="1.5"/><ellipse cx="30" cy="106" rx="4.5" ry="7" fill="#f4f5fa" stroke="#c9cbd6" stroke-width="1.5" transform="rotate(-20 30 106)"/></g></g>' +
    '<g id="sbface"><ellipse cx="74" cy="134" rx="10" ry="5.5" fill="#ff6f86" opacity=".55"/><ellipse cx="166" cy="134" rx="10" ry="5.5" fill="#ff6f86" opacity=".55"/>' +
    '<g id="sbeyes">' + eye(98, 0) + eye(142, 1) + '</g>' +
    '<path id="sbbrowL" d="M83,81 Q97,74 111,79" stroke="#5a3608" stroke-width="3.8" fill="none" stroke-linecap="round"/><path id="sbbrowR" d="M129,79 Q143,74 157,81" stroke="#5a3608" stroke-width="3.8" fill="none" stroke-linecap="round"/>' +
    '<g id="sbmouth"><g clip-path="url(#sbcm)"><ellipse id="sbmo" cx="120" cy="141" rx="17" ry="7" fill="#6e1622"/><ellipse id="sbtg" cx="120" cy="147" rx="9.5" ry="5.5" fill="#ff7d8e"/></g>' +
    '<path d="M101,140.5 Q120,146 139,140.5" stroke="#5a2410" stroke-width="3" fill="none" stroke-linecap="round"/></g>' +
    '<g id="sbbow"><path d="M120,162 L101,153 Q97,162 101,171 Z" fill="#e2473b"/><path d="M120,162 L139,153 Q143,162 139,171 Z" fill="#e2473b"/><rect x="115" y="157" width="10" height="10" rx="3" fill="#c8352b"/></g></g>' +
    '<g id="sbhead"><path d="M118,40 Q160,44 178,96" stroke="#1f2a4d" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M120,38 Q158,42 175,90" stroke="#4a5c94" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".8"/>' +
    '<rect x="168" y="94" width="20" height="30" rx="10" fill="#2b3a6a"/><rect x="172" y="99" width="9" height="20" rx="4.5" fill="#56689f"/>' +
    '<path d="M174,122 Q172,146 152,150" stroke="#1f2a4d" stroke-width="4.5" fill="none" stroke-linecap="round"/><rect x="143" y="145" width="12" height="9" rx="4.5" fill="#1f2a4d"/></g>' +
    '<g id="sbarmR"><path d="M166,136 Q180,150 176,166" stroke="' + SKIN + '" stroke-width="13" stroke-linecap="round" fill="none"/>' +
    '<g transform="rotate(12 182 168)"><rect x="160" y="140" width="44" height="58" rx="5" fill="#6d7a93"/><rect x="164" y="146" width="36" height="48" rx="3" fill="#9aa6bd"/><rect x="174" y="136" width="16" height="9" rx="3" fill="#4a556b"/><path d="M169,158 h22 M169,166 h18 M169,174 h22" stroke="#e8ecf4" stroke-width="2.4" stroke-linecap="round"/></g>' +
    '<circle cx="174" cy="170" r="12" fill="#f4f5fa" stroke="#c9cbd6" stroke-width="1.5"/></g></g></g></svg>';
}

// Acting (lemo-opuscar DIRECTOR §9): anticipation -> action -> follow-through, poses blended with easing, eyes look at what matters.
const POSE = { happy: { by: -2, bl: 0, br: 0, lid: 0, px: 4, py: -5, arm: 22, rot: 2 }, wow: { by: -7, bl: 0, br: 0, lid: 0, px: 0, py: -2, arm: 30, rot: 0 },
  think: { by: -3, bl: -8, br: 6, lid: 0.15, px: 5, py: -6, arm: 8, rot: -4 }, skeptic: { by: -2, bl: -12, br: 8, lid: 0.32, px: 5, py: 0, arm: 0, rot: 5 } };
function starbyAct(mood, S) {
  const P = POSE[mood] || POSE.happy, a = [], T = (sel, v, at) => a.push("tl.to('" + sel + "'," + v + ',' + f2(at) + ');');
  T('#sbrig', "{scaleY:.94,scaleX:1.04,svgOrigin:'120 255',duration:.12,ease:'power2.in'}", S);
  if (mood === 'wow') {
    T('#sbrig', "{y:-46,scaleY:1.07,scaleX:.95,svgOrigin:'120 255',duration:.22,ease:'power2.out'}", S + 0.12);
    T('#sbrig', "{y:0,scaleY:1,scaleX:1,svgOrigin:'120 255',duration:.2,ease:'power2.in'}", S + 0.34);
    T('#sbrig', "{scaleY:.93,scaleX:1.05,svgOrigin:'120 255',duration:.08,ease:'power1.out'}", S + 0.54);
    T('#sbrig', "{scaleY:1,scaleX:1,rotation:" + P.rot + ",svgOrigin:'120 255',duration:.5,ease:'elastic.out(1,.5)'}", S + 0.62);
    SFXQ.push([S + 0.54, 'thud', 0.3]);
  } else T('#sbrig', "{scaleY:1,scaleX:1,rotation:" + P.rot + ",svgOrigin:'120 255',duration:.5,ease:'back.out(2)'}", S + 0.12);
  T('#sbarmL', "{rotation:" + (P.arm - 14) + ",svgOrigin:'76 134',duration:.14,ease:'power2.in'}", S + 0.02);
  T('#sbarmL', "{rotation:" + P.arm + ",svgOrigin:'76 134',duration:.45,ease:'back.out(2.2)'}", S + 0.16);
  T('#sbbrowL', "{y:" + P.by + ",rotation:" + P.bl + ",svgOrigin:'97 80',duration:.3,ease:'power2.out'}", S + 0.1);
  T('#sbbrowR', "{y:" + (mood === 'skeptic' ? 2 : P.by) + ",rotation:" + P.br + ",svgOrigin:'143 80',duration:.3,ease:'power2.out'}", S + 0.1);
  T('.sblid', "{scaleY:" + P.lid + ",duration:.25}", S + 0.1);
  T('.sbpup', "{x:0,y:0,duration:.15,ease:'power2.out'}", S + 0.05);
  T('.sbpup', "{x:" + P.px + ",y:" + P.py + ",duration:.22,ease:'power2.out'}", S + 0.75);
  return a.join('\n');
}
// mouth from the narration loudness (12 fps, like 2D animation on twos); text-based fallback when no envelope
function mouthEnv(x) {
  if (x.env?.length) return x.env;
  const n = Math.max(2, Math.round(x.dur * 12)), syl = Math.max(1, (String(x.text).match(/[aeiouy]+/gi) || []).length), per = n / syl;
  return Array.from({ length: n }, (_, k) => (k >= n - 1 ? 0 : 0.2 + 0.65 * Math.sin(Math.PI * ((k % per) / per))));
}
function lipSync(x) {
  const a = []; let prev = -1;
  mouthEnv(x).forEach((o, k) => { o = Math.round(Math.max(0, Math.min(1, o)) * 8) / 8; if (Math.abs(o - prev) < 0.1) return; prev = o; const ry = 2 + 15 * o, at = f2(x.start + k / 12);
    a.push("tl.to('#sbmo',{attr:{ry:" + ry.toFixed(1) + "},duration:.07,ease:'sine.out'}," + at + ");tl.to('#sbtg',{attr:{cy:" + (144.5 + 0.6 * ry).toFixed(1) + "},duration:.07}," + at + ');'); });
  const end = f2(x.start + x.dur);
  a.push("tl.to('#sbmo',{attr:{ry:5},duration:.12}," + end + ");tl.to('#sbtg',{attr:{cy:147.5},duration:.12}," + end + ');');
  a.push("tl.to('#sbface',{y:2.5,duration:.12,yoyo:true,repeat:1,ease:'sine.inOut'}," + f2(x.start) + ');');
  return a.join('');
}
// procedural foley (lemo-opuscar TECHNIQUE §6 idea): every visible action gets a sound
let SFXQ = [];
const SFX_VOL = { pop: 0.4, whoosh: 0.28, stamp: 0.5, thud: 0.35, keys: 0.32, ding: 0.3 };
function synthSfx(kind) {
  const sr = 44100; let seed = 9187; const noise = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x3fffffff - 1; };
  const mk = (sec, fn) => { const n = Math.round(sr * sec), s = new Float32Array(n); for (let i = 0; i < n; i++) s[i] = fn(i / sr, i); return s; };
  let ph = 0, lp = 0, lp2 = 0;
  if (kind === 'pop') return mk(0.13, t => { ph += 2 * Math.PI * (480 + 1300 * Math.min(1, t / 0.05)) / sr; return Math.sin(ph) * Math.exp(-t * 34) * 0.8; });
  if (kind === 'whoosh') return mk(0.4, t => { const e = Math.sin(Math.PI * t / 0.4) ** 2, al = 0.03 + 0.3 * (t / 0.4); lp += al * (noise() - lp); lp2 += 0.4 * (lp - lp2); return (lp - 0.6 * lp2) * e * 1.6; });
  if (kind === 'stamp') return mk(0.32, t => { ph += 2 * Math.PI * (120 - 60 * Math.min(1, t / 0.15)) / sr; lp += 0.35 * (noise() - lp); return Math.sin(ph) * Math.exp(-t * 13) * 0.9 + lp * Math.exp(-t * 55) * 0.9; });
  if (kind === 'thud') return mk(0.22, t => { ph += 2 * Math.PI * (95 - 40 * Math.min(1, t / 0.12)) / sr; return Math.sin(ph) * Math.exp(-t * 20) * 0.8; });
  if (kind === 'ding') return mk(0.9, t => (Math.sin(2 * Math.PI * 1568 * t) + 0.5 * Math.sin(2 * Math.PI * 2352 * t) + 0.25 * Math.sin(2 * Math.PI * 3136 * t)) * Math.exp(-t * 5) * 0.3);
  if (kind === 'keys') { const s = new Float32Array(sr * 3); let t0 = 0.02, k = 0; while (t0 < 2.95) { const st = Math.round(t0 * sr); for (let i = 0; i < sr * 0.03 && st + i < s.length; i++) { const t = i / sr; s[st + i] += noise() * Math.exp(-t * 260) * 0.55 + Math.sin(2 * Math.PI * (2600 + (k % 3) * 300) * t) * Math.exp(-t * 140) * 0.25; } t0 += 0.07 + ((k * 0.618) % 1) * 0.06; k++; } return s; }
  return new Float32Array(1);
}
function wavBuf(s, sr = 44100) { const n = s.length, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40); for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s[i])) * 32767), 44 + i * 2); return b; }

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
.cap{position:absolute;left:${F.capL ?? (F.vert ? 50 : 420)}px;right:${F.capR ?? (F.vert ? 50 : 80)}px;bottom:${F.capB ?? (F.vert ? 120 : 60)}px;text-align:center}
.cap span{display:inline-block;background:#000000d0;border-radius:18px;padding:${F.vert ? '18px 28px' : '14px 26px'};font-size:${F.vert ? 48 : 38}px;line-height:1.35;font-weight:700;color:#fff;box-shadow:0 10px 40px #0008}
#bot{position:absolute;width:${F.vert ? 300 : 300}px;height:${F.vert ? 300 : 300}px;left:${F.botL ?? (F.vert ? 40 : 70)}px;top:${F.botTop ?? (F.vert ? 1300 : 560)}px;transform-origin:50% 100%}

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
.stk{display:inline-block;background:#ffc83d;color:#1b1f24;font-weight:900;font-size:${F.vert ? 50 : 42}px;padding:12px 26px;border-radius:12px;box-shadow:0 10px 0 #0007,0 20px 50px #0008;white-space:nowrap}.stk small{font-size:.6em;font-weight:800;opacity:.75}
.stk.big{font-size:${F.vert ? 110 : 92}px;padding:16px 40px;border-radius:18px}.stk.tag{position:absolute;left:${F.vert ? 60 : 480}px;top:${F.vert ? 150 : 60}px;z-index:5}
.scene>.repo,.scene>.owner,.scene>.avatar,.scene>.stk:not(.tag),.scene>.frame{position:relative;z-index:2}
.hook{isolation:isolate}.stk.tag.long{font-size:${F.vert ? 40 : 34}px}
.hook .frame{transform:perspective(1600px) rotateX(8deg) rotate(-2deg)}.hook .stk.big{margin-top:-60px}
.hero{position:absolute;left:0;top:0;width:${F.W}px;height:${F.H}px;overflow:hidden;z-index:0;transform-origin:50% 40%}.hero img.cov,.hero video{width:100%;height:100%;object-fit:cover;display:block;filter:blur(28px) brightness(.38) saturate(1.3);transform:scale(1.2)}.hero img.pg{width:100%;display:block}
.heroshade{position:absolute;left:0;top:0;width:${F.W}px;height:${F.H}px;z-index:1;background:linear-gradient(180deg,#0b0f17cc 0%,#0b0f1744 40%,#0b0f17aa 70%,#0b0f17f2 88%)}
.pw{position:relative;transform-origin:0 0}.hl{position:absolute;border:5px solid #ffc83d;border-radius:12px;box-shadow:0 0 0 4000px #0009,0 0 30px #ffc83d88;opacity:0}
.cur{color:#3fb950}

.row img{width:64px;height:64px;border-radius:16px}.row .n{font-size:36px;font-weight:800}.row .m{font-size:26px;color:#8b949e}
`;

// ---------------- animation snippets (seek-safe, no callbacks) ----------------
const unitOf = v => (v >= 1e6 ? [1e6, 'M', 0.1] : v >= 1e4 ? [1e3, 'k', 1] : v >= 1e3 ? [1e3, 'k', 0.1] : [1, '', 1]);
const num = (v, prefix = '', suffix = '') => `${prefix}<span class="num">0</span>${unitOf(Math.round(v || 0))[1]}${suffix}`;
const typed = t => [...String(t)].map(c => (c === '\n' ? '<br>' : `<span class="ch">${c === ' ' ? '&nbsp;' : esc(c)}</span>`)).join('');
const words = t => t.split(/\s+/).map(w => `<span class="w">${esc(w)}</span>`).join(' ');
const f2 = x => Number(x).toFixed(2);
// lowercase a sentence-case phrase ("One runtime for x" -> "one runtime for x"), keep Title Case names ("Task Board")
const lcFirst = s => { const w = String(s).split(/\s+/); const title = w.length > 1 && w.filter(x => /^[a-z]/i.test(x)).every(x => /^[A-Z]/.test(x)); return !title && /^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s; };
const A = {
  enter: (p, S) => `tl.from('#${p}',{opacity:0,y:60,duration:.5,ease:'power3.out'},${f2(S)});`,
  exit: (p, S, D) => `tl.to('#${p}',{opacity:0,y:-40,duration:.3,ease:'power2.in'},${f2(S + D - 0.32)});`,
  count: (sel, to, at, dur = 1.3) => { const [div, , snap] = unitOf(Math.round(to || 0)); const v = +(Math.round(to || 0) / div).toFixed(snap < 1 ? 1 : 0); return `tl.fromTo('${sel} .num',{innerText:0},{innerText:${v},snap:{innerText:${snap}},duration:${dur},ease:'power2.out'},${f2(at)});`; },
  pop: (sel, at) => (SFXQ.push([at, 'pop']), `tl.from('${sel}',{opacity:0,scale:.5,duration:.5,ease:'back.out(2)'},${f2(at)});`),
  up: (sel, at, st = 0.15) => `tl.from('${sel}',{opacity:0,y:50,duration:.45,stagger:${st},ease:'power3.out'},${f2(at)});`,
  type: (sel, text, at, dur) => (SFXQ.push([at, 'keys', 0, dur]), `tl.from('${sel} .ch',{opacity:0,duration:.01,stagger:${(dur / Math.max(1, [...String(text)].length)).toFixed(4)},ease:'none'},${f2(at)});`),
  words: (sel, at) => `tl.from('${sel} .w',{opacity:0,y:80,rotate:5,duration:.55,stagger:.08,ease:'back.out(1.8)'},${f2(at)});`,
  stamp: (sel, at) => (SFXQ.push([at + 0.3, 'stamp']), `tl.from('${sel}',{scale:2.4,opacity:0,rotate:-16,duration:.45,ease:'back.out(2.2)'},${f2(at)});`),
  sticker: (sel, at, hold = 1.8, rot = -4) => (SFXQ.push([at, 'pop']), `tl.fromTo('${sel}',{opacity:0,scale:.3,rotation:${rot - 14}},{opacity:1,scale:1,rotation:${rot},duration:.32,ease:'back.out(2.4)'},${f2(at)});` + (hold ? `tl.to('${sel}',{opacity:0,scale:.85,duration:.18},${f2(at + hold)});` : '')),
  bar: (sel, frac, at) => `tl.fromTo('${sel}',{scaleX:0},{scaleX:${Math.max(0.015, Math.min(1, frac)).toFixed(3)},duration:1,ease:'power3.out'},${f2(at)});`,
};
const brand = (extra = '') => `<div class="brand">★ <b>GitHub Star Board</b>${extra ? ' · ' + esc(extra) : ''}</div>`;
const winBar = t => `<div class="tb"><i style="background:#f85149"></i><i style="background:#e3b341"></i><i style="background:#3fb950"></i><span style="margin-left:10px">${esc(t)}</span></div>`;

// ---------------- scenes ----------------
// scene = { say:[en], html(p,F,t), anim(p,S,D,M,F), mood, bot:'center'|'corner'|'hide', media? }
function spotlightScenes(r, info, gain, site, F) {
  const n = r.n, v = r.sc?.v, col = VCOL[v] || '#8b949e', sc = [], G = info.script || {};
  const avatar = info.avatar || '';
  const ageDays = r.c ? Math.max(1, (Date.now() - Date.parse(r.c)) / DAY) : 365;
  const usual = Math.max(1, Math.round((r.s - gain) / ageDays)), mult = Math.round(gain / usual);
  const uses = useCases(r, info), page = info.media?.kind === 'page' ? info.media : null;
  const prod = info.demo || (info.media && !page ? info.media : null) || page; // most "product-looking" visual
  const VW = F.vert ? 960 : 1100, FH = F.vert ? 980 : 600, VH = FH - 52;
  const mediaTag = (m, id, t, extra = '') => !m ? '' : m.kind === 'video' ? (t ? '<video class="clip" id="' + id + '" src="' + esc(m.src) + '" muted playsinline data-start="' + f2(t.S) + '" data-duration="' + f2(t.D) + '" data-track-index="3" ' + extra + '></video>' : '') : '<img id="' + id + '" src="' + esc(m.src) + '" ' + extra + '>';
  // 1. HOOK: real product on frame 1, big number sticker, no intro animation
  const hookSay = G.hook ? [G.hook] : [uses[0]?.strong ? 'Want to ' + uses[0].en + '? This got ' + say(gain) + ' stars in one day.' : say(gain) + ' stars in a single day.'];
  hookSay.push('Meet ' + repoName(n) + (BIG_ORG.test(ownerName(n)) ? ', from ' + ownerName(n) : '') + '. Here\'s why it\'s blowing up.');
  const gainTxt = Math.round(gain).toLocaleString('en-US');
  const hookKo = G.hook ? [null] : [uses[0]?.strong ? '하루 만에 스타 ' + gainTxt + '개. ' + uses[0].ko + ' 쓰는 도구예요.' : '하루 만에 스타 ' + gainTxt + '개를 받았어요.'];
  hookKo.push('주인공은 ' + n.split('/')[1] + '. 왜 이렇게 뜨는지 볼까요?');
  const pfH = F.vert ? 700 : 520;
  sc.push({ mood: 'wow', bot: 'corner', first: true, say: hookSay, ko0: hookKo,
    html: (p, F2, t) => '<div class="hero" id="' + p + 'hb">' + (prod ? mediaTag(prod, p + 'hbm', t, 'class="cov"' + (prod === page ? ' style="object-position:50% ' + Math.round(((page.top || 0) / (page.h || 4000)) * 100) + '%"' : '')) : '') + '</div><div class="heroshade"></div>' + brand("today's pick") +
      (prod ? '<div class="frame" id="' + p + 'pf" style="width:' + VW + 'px;height:' + pfH + 'px">' + winBar(prod === page ? 'github.com/' + n : n.split('/')[1]) + '<div class="vp">' +
        (prod === page ? '<img src="' + esc(page.src) + '" style="width:100%;display:block;transform:translateY(-' + Math.round((page.top || 0) * (VW / (page.w || 1280))) + 'px)">' : mediaTag(prod, p + 'pm', t, 'class="shot"')) + '</div></div>' : (avatar ? '<img class="avatar" src="' + esc(avatar) + '">' : '')) +
      '<div class="stk big" id="' + p + 'g" style="transform:rotate(-4deg)">+' + esc(short(gain)) + ' ⭐ <small>in 24h</small></div>' +
      '<div class="repo" id="' + p + 'n" style="margin-top:26px">' + esc(n.split('/')[1]) + '</div><div class="owner">by ' + esc(ownerName(n)) + '</div>',
    anim: (p, S, D) => [prod ? "tl.fromTo('#" + p + "pf',{scale:1},{scale:1.06,duration:" + f2(D) + ",ease:'none'}," + f2(S) + ');' : '',
      "tl.fromTo('#" + p + "g',{scale:1},{scale:1.12,duration:.18,yoyo:true,repeat:3,ease:'sine.inOut'}," + f2(S + 0.15) + ');'].join('\n') });
  // 2. WHY: usual vs today, multiplier stamp, fact stickers
  const facts = whyFacts(r, gain, info);
  sc.push({ mood: 'think', bot: 'corner',
    say: [mult >= 3 ? 'That\'s ' + mult + ' times its usual daily pace.' : 'That\'s a big day for it.', ...facts.map(f => f[0])],
    ko0: [mult >= 3 ? '평소 하루 평균의 ' + mult + '배예요.' : '오늘 제대로 터졌어요.', ...facts.map(f => f[2] || null)],
    html: p => brand('why it’s trending') + '<div class="bars"><div class="bar"><div class="k">Usual day</div><div class="t"><i id="' + p + 'b1" style="background:#8b949e"></i></div><div class="v">' + esc(short(usual)) + '</div></div>' +
      '<div class="bar"><div class="k">Today</div><div class="t"><i id="' + p + 'b2" style="background:#3fb950"></i></div><div class="v" style="color:#3fb950">' + esc(short(gain)) + '</div></div></div>' +
      (mult >= 3 ? '<div class="mult" id="' + p + 'x">×' + mult + '</div>' : '') + '<div class="pills">' + facts.map((f, i) => '<div class="stk" id="' + p + 'f' + i + '" style="transform:rotate(' + (i % 2 ? 4 : -5) + 'deg);background:' + ['#58a6ff', '#f78166'][i % 2] + '">' + esc(f[1]) + '</div>').join('') + '</div>',
    anim: (p, S, D, M) => [A.bar('#' + p + 'b1', usual / gain, S + 0.2), A.bar('#' + p + 'b2', 1, S + 0.45), mult >= 3 ? A.stamp('#' + p + 'x', S + 1.0) : '',
      ...facts.map((_, i) => A.stamp('#' + p + 'f' + i, (M[i + 1] ?? S + 2) + 0.05))].join('\n') });
  // 3. WHAT + FEATURE TOUR: zoom into the real README at each feature, highlight + sticker
  const desc = G.what || cleanDesc(r, info);
  const feats = (G.features?.length ? G.features : (info.feats || []).map((f, i) => ({ en: f.t, ko: info.featsKo?.[i] || f.t }))).slice(0, 3);
  const stkTxt = f => cut(f.sticker || (f.match && f.match.length <= 26 ? f.match : '') || f.en, 26);
  if (page) {
    const k = VW / (page.w || 1280), top0 = Math.max(0, (page.top || 0) * k - 10);
    const fsay = feats.map((f, i) => G.features?.length ? f.en : ['First, ' + lcFirst(f.en) + '.', 'Then, ' + lcFirst(f.en) + '.', 'And ' + lcFirst(f.en) + '.'][i]);
    const boxes = feats.map((_, i) => page.boxes?.[i] || null);
    const focus = (b, i) => { if (!b) return { x: 0, y: -(top0 + (i + 1) * VH * 0.8), s: 1.15 }; const bx = b.x * k, by = b.y * k, bw = Math.max(80, b.w * k), bh = Math.max(40, b.h * k);
      const s = Math.max(1.15, Math.min(1.9, (VW * 0.86) / bw, (VH * 0.6) / bh)); return { x: Math.min(0, Math.max(VW - VW * s, VW / 2 - (bx + bw / 2) * s)), y: Math.min(0, VH / 2 - (by + bh / 2) * s), s }; };
    sc.push({ mood: 'happy', bot: 'corner',
      say: [desc ? 'In one line: ' + desc + '.' : 'Here\'s what it is.', ...fsay],
      ko0: [desc ? null : '어떤 건지 볼게요.', ...feats.map((f, i) => G.features?.length ? null : ['첫째, ', '둘째, ', '셋째, '][i] + f.ko + '.')],
      html: p => brand('what it does') + '<div class="frame" id="' + p + 'f" style="width:' + VW + 'px;height:' + FH + 'px">' + winBar('github.com/' + n) + '<div class="vp"><div class="pw" id="' + p + 'w" style="width:' + VW + 'px">' +
        '<img src="' + esc(page.src) + '" style="width:' + VW + 'px;display:block">' +
        boxes.map((b, i) => b ? '<div class="hl" id="' + p + 'h' + i + '" style="left:' + Math.round(b.x * k - 8) + 'px;top:' + Math.round(b.y * k - 6) + 'px;width:' + Math.round(b.w * k + 16) + 'px;height:' + Math.round(Math.min(b.h, 300) * k + 12) + 'px"></div>' : '').join('') + '</div></div></div>' +
        feats.map((f, i) => '<div class="stk tag' + (stkTxt(f).length > 18 ? ' long' : '') + '" id="' + p + 's' + i + '" style="transform:rotate(' + [-5, 4, -3][i] + 'deg);background:' + ['#ffc83d', '#3fb950', '#f78166'][i] + '">' + (i + 1) + '. ' + esc(stkTxt(f)) + '</div>').join(''),
      anim: (p, S, D, M) => ["tl.set('#" + p + "w',{x:0,y:" + (-top0).toFixed(0) + ",scale:1,transformOrigin:'0 0'}," + f2(S) + ');',
        "tl.from('#" + p + "f',{opacity:0,y:120,duration:.5,ease:'power3.out'}," + f2(S + 0.05) + ');',
        "tl.to('#" + p + "w',{y:" + (-top0 - VH * 0.25).toFixed(0) + ",duration:" + f2(Math.max(0.8, (M[1] ?? S + 2) - S - 0.6)) + ",ease:'sine.inOut'}," + f2(S + 0.5) + ');',
        ...feats.map((_, i) => { const at = M[i + 1] ?? S + 2 + i * 2, fo = focus(boxes[i], i), nx = M[i + 2] ?? S + D;
          return "tl.to('#" + p + "w',{x:" + fo.x.toFixed(0) + ',y:' + fo.y.toFixed(0) + ',scale:' + fo.s.toFixed(2) + ",duration:.55,ease:'power3.inOut'}," + f2(at - 0.25) + ');' +
            (boxes[i] ? "tl.fromTo('#" + p + "h" + i + "',{opacity:0,scale:1.3},{opacity:1,scale:1,duration:.3,ease:'back.out(2)'}," + f2(at + 0.25) + ");tl.to('#" + p + "h" + i + "',{opacity:0,duration:.2}," + f2(nx - 0.3) + ');' : '') +
            A.sticker('#' + p + 's' + i, at + 0.2, Math.max(0.8, nx - at - 0.5), [-5, 4, -3][i]); })].join('\n') });
  } else {
    const media = info.media;
    sc.push({ mood: 'happy', bot: 'corner', say: [desc ? 'In one line: ' + desc + '.' : 'Here\'s what it looks like.'],
      html: (p, F2, t) => brand('what it is') + '<div class="frame" id="' + p + 'f">' + winBar('github.com/' + n) + '<div class="vp">' + (media ? mediaTag(media, p + 'im', t && { S: t.S + 0.3, D: t.D - 0.3 }, 'class="shot"') : '') + '</div></div>',
      anim: (p, S, D) => ["tl.from('#" + p + "f',{opacity:0,y:140,duration:.6,ease:'power3.out'}," + f2(S + 0.05) + ');', media?.kind === 'image' ? "tl.fromTo('#" + p + "im',{scale:1.02},{scale:1.18,duration:" + f2(D - 0.4) + ",ease:'none'}," + f2(S + 0.3) + ');' : ''].join('\n') });
  }
  // 4. DEMO (README GIF/MP4/image) when available and different from the hero page
  if (info.demo && page) {
    sc.push({ mood: 'wow', bot: 'corner', say: [G.demo || 'And here it is in action.'], ko0: [G.demo ? null : '실제로 돌아가는 화면이에요.'],
      html: (p, F2, t) => brand('demo') + '<div class="frame" id="' + p + 'f" style="width:' + VW + 'px;height:' + (info.demo.kind === 'video' ? FH : Math.round(FH * 0.72)) + 'px">' + winBar(n.split('/')[1] + ' demo') + '<div class="vp">' + mediaTag(info.demo, p + 'im', t && { S: t.S + 0.15, D: t.D - 0.15 }, 'class="shot"') + '</div></div><div class="stk tag" id="' + p + 's" style="transform:rotate(-6deg);background:#f78166">LIVE DEMO</div>',
      anim: (p, S, D) => ["tl.from('#" + p + "f',{opacity:0,scale:.85,duration:.45,ease:'back.out(1.5)'}," + f2(S + 0.05) + ');', info.demo.kind === 'image' ? "tl.fromTo('#" + p + "im',{scale:1},{scale:1.2,x:-30,duration:" + f2(D) + ",ease:'none'}," + f2(S) + ');' : '', A.sticker('#' + p + 's', S + 0.4, 0, -6)].join('\n') });
  }
  // 5. WHEN to use it
  const items = G.when ? [{ en: G.when.en.replace(/^use it when\s*/i, ''), ko: G.when.ko }] : uses.map(u => ({ en: u.en, ko: u.ko }));
  if (items.length) {
    sc.push({ mood: 'happy', bot: 'corner', say: [G.when ? G.when.en : 'Reach for it when you want to ' + uses.map(u => u.en).join(', or ') + '.'],
      ko0: [G.when ? G.when.ko : '이럴 때 써보세요. ' + uses.map(u => u.ko).join(', 또는 ') + '.'],
      html: p => brand('when to use it') + '<div class="h">Use it when…</div><div class="uses">' + items.map((it, i) => '<div class="use" id="' + p + 'u' + i + '"><div class="n">' + (i + 1) + '</div><div class="t">' + esc(cut(cap1(it.en), 46)) + '</div></div>').join('') + '</div>',
      anim: (p, S, D) => ["tl.from('#" + p + " .h',{opacity:0,y:40,duration:.35}," + f2(S + 0.05) + ');', "tl.from('#" + p + " .use',{opacity:0,x:140,duration:.45,stagger:.5,ease:'power3.out'}," + f2(S + 0.3) + ');'].join('\n') });
  }
  // 6. TRY IT: typed install + usage snippet, label sticker
  if (info.install || info.usage) {
    const code = info.usage ? info.usage.code.split('\n').slice(0, 9).join('\n') : '';
    sc.push({ mood: 'happy', bot: 'corner',
      say: [info.install ? 'Getting started takes one command.' : 'Using it looks like this.', ...(info.install && info.usage ? ['And using it looks like this.'] : [])],
      ko0: [info.install ? '설치는 명령어 한 줄이면 끝.' : '쓰는 법은 이 정도예요.', ...(info.install && info.usage ? ['쓰는 법은 이 정도예요.'] : [])],
      html: p => brand('try it') + (info.install ? '<div class="code" id="' + p + 't">' + winBar('terminal') + '<pre class="term"><span style="color:#8b949e">$ </span><span id="' + p + 'c">' + typed(info.install) + '</span><span class="cur" id="' + p + 'k">▋</span></pre></div><div class="stk tag" id="' + p + 's" style="transform:rotate(-4deg)">1-line install</div>' : '') +
        (info.usage ? '<div class="code" id="' + p + 'u">' + winBar(info.usage.lang) + '<pre id="' + p + 'uc">' + typed(code) + '</pre></div>' : ''),
      anim: (p, S, D, M) => [info.install ? "tl.from('#" + p + "t',{opacity:0,y:60,duration:.4}," + f2(S + 0.05) + ');' + A.type('#' + p + 'c', info.install, S + 0.3, Math.min(2, Math.max(0.8, info.install.length / 25))) + A.sticker('#' + p + 's', S + 0.6, 0, -4) + "tl.to('#" + p + "k',{opacity:0,duration:.01,repeat:" + Math.max(1, Math.floor(D / 0.5)) + ",yoyo:true,repeatDelay:.45}," + f2(S) + ');' : '',
        info.usage ? "tl.from('#" + p + "u',{opacity:0,y:60,duration:.4}," + f2((M[1] ?? S + 0.2) - 0.1) + ');' + A.type('#' + p + 'uc', code, (M[1] ?? S + 0.2) + 0.25, Math.min(3, Math.max(1.2, code.length / 70))) : ''].join('\n') });
  }
  // 7. REALITY CHECK: big numbers
  const D = r.deep || {}, iss = (D.oi || 0) + (D.ci || 0), issP = iss ? Math.round((D.ci / iss) * 100) : null;
  sc.push({ mood: MOOD[v] || 'think', bot: 'corner',
    say: ['So, do people actually use it?', realityLine(r)], ko0: ['그래서, 진짜 쓰일까요?', null],
    html: p => brand('reality check') + '<div class="h">Actually used?</div><div class="stats">' +
      '<div class="stat"><div class="v" id="' + p + 's1">' + num(D.c90) + '</div><div class="k">commits (90d)</div></div>' +
      '<div class="stat"><div class="v" id="' + p + 's2">' + num(D.ppl) + '</div><div class="k">contributors</div></div>' +
      (r.dl ? '<div class="stat"><div class="v" id="' + p + 's3">' + num(r.dl.m) + '</div><div class="k">downloads/mo</div></div>' : issP != null ? '<div class="stat"><div class="v" id="' + p + 's3">' + num(issP, '', '%') + '</div><div class="k">issues closed</div></div>' : '') + '</div>' +
      '<div class="verdict" id="' + p + 'v" style="color:' + col + ';border-color:' + col + '">' + esc(VEN[v] || '') + '</div>',
    anim: (p, S, D2, M) => ["tl.from('#" + p + " .h',{opacity:0,y:40,duration:.35}," + f2(S + 0.05) + ');', A.up('#' + p + ' .stat', (M[1] ?? S + 1) - 0.2, 0.12),
      A.count('#' + p + 's1', D.c90, (M[1] ?? S + 1), 1.0), A.count('#' + p + 's2', D.ppl, (M[1] ?? S + 1) + 0.1, 1.0), r.dl ? A.count('#' + p + 's3', r.dl.m, (M[1] ?? S + 1) + 0.2, 1.0) : issP != null ? A.count('#' + p + 's3', issP, (M[1] ?? S + 1) + 0.2, 1.0) : '',
      A.stamp('#' + p + 'v', S + D2 - 1.4)].join('\n') });
  sc.push({ ...outroScene(site, F, 'More repos like this on Star Board. Link below!'), ko0: ['이런 저장소, Star Board에 더 있어요. 링크는 아래!'] });
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
      <div class="stats"><div class="stat"><div class="v" style="color:#3fb950" id="${p}g">${num(gain, '+')}</div><div class="k">${period === 'weekly' ? 'stars this week' : 'stars today'}</div></div>
      <div class="stat"><div class="v" id="${p}c">${num(D.c90)}</div><div class="k">commits (90d)</div></div><div class="stat"><div class="v" id="${p}p">${num(D.ppl)}</div><div class="k">contributors</div></div></div>
      <div class="verdict" id="${p}v" style="color:${col};border-color:${col}">${esc(VEN[v] || '')}</div>`,
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
    specs.push({ id: `daily-${day}`, F: P, title: `Today's fastest-rising GitHub repos (${mdEn}) #shorts`, list: top, scenes: [
      introScene(P, [`Hi, I'm Starby.`, `Here are today's five fastest-rising GitHub repos, and whether people actually use them.`], `Today's|Top ${top.length}`, `${mdEn} · fastest-rising on GitHub`),
      ...top.map(({ r, g }, i) => rankScene(r, i + 1, g, av(r.n), P, 'daily')),
      outroScene(site, P, `Full ranking and details are on Star Board, link below. See you tomorrow!`)] });
  }
  if (types.includes('spotlight')) {
    for (const { r, g } of pick('daily:all', 12).filter(x => !['doc', 'archived', 'dead'].includes(x.r.sc.v)).slice(0, 3)) {
      specs.push({ id: `spotlight-${r.n.replace('/', '__')}-${day}`, F: P, repo: r.n, title: `${r.n.split('/')[1]}: +${short(g)} stars in a day. Why, and when to use it #shorts`, list: [{ r, g }], scenes: spotlightScenes(r, infos[r.n] || {}, g, site, P) });
    }
  }
  if (types.includes('weekly')) {
    const top = pick('weekly:all', 10), all = Object.values(R).filter(r => r.sc);
    const gems = all.filter(r => r.sc.v === 'gem').sort((a, b) => b.sc.util - a.sc.util).slice(0, 3);
    const hype = all.filter(r => r.sc.v === 'hype' && r.sc.g7 != null).sort((a, b) => b.sc.g7 - a.sc.g7).slice(0, 3);
    const listScene = (koTitle, color, rows, en, mood) => ({ mood, bot: 'corner', say: en,
      html: p => `${brand('this week')}<div class="h" style="color:${color}">${esc(koTitle)}</div><div class="list">${rows.map(x => `<div class="row"><img src="${esc(av(x.n))}"><div><div class="n">${esc(x.n)}</div><div class="m">${esc(x.m)}</div></div></div>`).join('')}</div>`,
      anim: (p, S) => [`tl.from('#${p} .h',{opacity:0,y:40,duration:.4},${f2(S + 0.05)});`, `tl.from('#${p} .row',{opacity:0,x:-80,duration:.45,stagger:.3,ease:'power3.out'},${f2(S + 0.4)});`].join('\n') });
    const scenes = [introScene(L, [`Hi, I'm Starby.`, `This is your weekly GitHub star report: the ten fastest-rising repos, the hype, and the hidden gems.`], `Weekly|Star Report`, `Week of ${mdEn}`),
      ...top.map(({ r, g }, i) => rankScene(r, i + 1, g, av(r.n), L, 'weekly'))];
    if (hype.length) scenes.push(listScene('Mostly hype', '#e3b341', hype.map(r => ({ n: r.n, m: `+${short(r.sc.g7)}/week · ${short(r.deep?.c90 || 0)} commits (90d)` })), [`Lots of stars, not much behind them yet: ${hype.map(r => repoName(r.n)).join(', ')}.`], 'skeptic'));
    if (gems.length) scenes.push(listScene('Hidden gems', '#a371f7', gems.map(r => ({ n: r.n, m: `★${short(r.s)} · ${short(r.deep?.c90 || 0)} commits (90d) · ${short(r.deep?.ppl || 0)} contributors` })), [`And the underrated ones, with real work behind fewer stars: ${gems.map(r => repoName(r.n)).join(', ')}.`], 'wow'));
    scenes.push(outroScene(site, L, `Full ranking and details are on Star Board, link below. See you next week!`));
    specs.push({ id: `weekly-${day}`, F: L, title: `Weekly GitHub Star Report (${mdEn})`, list: top, scenes });
  }
  return specs;
}

// ---------------- composition ----------------
function compose(spec, timing, opts = {}) {
  const { F } = spec, total = timing.total, gsapSrc = opts.gsapSrc || 'assets/gsap.min.js';
  const parts = [], anims = [], audios = [], caps = []; SFXQ = [];
  anims.push("tl.set('.sblid',{scaleY:0,transformOrigin:'50% 0%'},0);tl.set('#sbmo',{attr:{ry:5}},0);tl.set('#sbtg',{attr:{cy:147.5}},0);");
  spec.scenes.forEach((s, i) => {
    const t = timing.scenes[i], p = `s${i}`;
    parts.push(`<div id="${p}" class="clip scene${s.first ? ' hook' : ''}" data-start="${f2(t.S)}" data-duration="${f2(t.D)}" data-track-index="1">${s.html(p, F, t)}</div>`);
    if (i > 0 && !s.noWhoosh) SFXQ.push([t.S - 0.08, 'whoosh']);
    anims.push(s.first || s.noEnter ? '' : A.enter(p, t.S), s.anim(p, t.S, t.D, t.M, F, t), i < spec.scenes.length - 1 && !s.noExit ? A.exit(p, t.S, t.D) : '');
    // Starby: position, mood
    const center = F.vert ? { x: 350, y: -30, s: 1.5 } : { x: 30, y: -40, s: 1.4 };
    const pos = s.botPos || (s.bot === 'center' ? center : s.bot === 'hide' ? { x: -500, y: 0, s: 1 } : { x: 0, y: 0, s: 1 });
    anims.push(`tl.to('#bot',{x:${pos.x},y:${pos.y},scale:${pos.s},duration:.7,ease:'power3.inOut'},${f2(Math.max(0, t.S - 0.1))});`);
    anims.push(starbyAct(s.mood || 'happy', t.S));
    t.sents.forEach((x, j) => {
      audios.push(`<audio data-start="${f2(x.start)}" data-duration="${f2(x.dur)}" data-track-index="${6 + (j % 2)}" data-volume="1" src="${esc(x.audio)}"></audio>`);
      anims.push(lipSync(x));
      const cap = noUrl(SUBS === 'ko' ? (x.ko || x.text) : x.text), max = F.vert ? (SUBS === 'ko' ? 36 : 44) : 64;
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
  // irregular blinks (sometimes a double blink) + slow breathing; no fast bobbing
  for (let b = 1.4, k = 0; b < total - 0.3; k++) { anims.push("tl.to('.sblid',{scaleY:1,duration:.07,yoyo:true,repeat:" + (k % 5 === 3 ? 3 : 1) + "}," + f2(b) + ');'); b += 2.3 + ((k * 0.618) % 1) * 2.6; }
  anims.push("tl.to('#sbbody',{scaleY:1.014,scaleX:.996,svgOrigin:'120 250',duration:1.7,yoyo:true,repeat:" + Math.max(1, Math.floor(total / 1.7)) + ",ease:'sine.inOut'},0);");
  const sfx = opts.bed ? ['<audio data-start="0" data-duration="' + f2(total) + '" data-track-index="5" data-volume="1" src="' + esc(opts.bed) + '"></audio>'] : SFXQ.filter(([at]) => at >= 0 && at < total - 0.2).sort((a, b) => a[0] - b[0]).map(([at, kind, vol, dur], k) =>
    '<audio data-start="' + f2(at) + '" data-duration="' + f2(Math.min(kind === 'keys' ? Math.min(2.9, dur || 1) : kind === 'ding' ? 0.9 : 0.4, total - at)) + '" data-track-index="' + (12 + (k % 6)) + '" data-volume="' + (vol || SFX_VOL[kind] || 0.3) + '" src="assets/sfx-' + kind + '.wav"></audio>');
  const bgCols = ['#1f6feb', '#a371f7', '#f78166', '#ffc83d'];
  const blobs = bgCols.map((c, i) => `<div class="blob" id="b${i}" style="background:radial-gradient(circle,${c} 0%,${c}55 35%,transparent 70%);width:${F.W * 0.6}px;height:${F.W * 0.6}px;left:${[10, 55, 20, 60][i]}%;top:${[5, 15, 60, 55][i]}%"></div>`).join('');
  const bgAnim = bgCols.map((_, i) => `tl.to('#b${i}',{x:${[260, -220, 180, -260][i]},y:${[180, 240, -200, -160][i]},scale:${[1.25, 0.85, 1.2, 0.9][i]},duration:${f2(total / 2)},ease:'sine.inOut',yoyo:true,repeat:1},0);`).join('\n');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(spec.id)}</title><style>${css(F)}${spec.css || ''}</style></head><body>
<div id="root" data-composition-id="root" data-start="0" data-width="${F.W}" data-height="${F.H}">
  <div id="bgwrap" class="clip" data-start="0" data-duration="${f2(total)}" data-track-index="0" style="position:absolute;inset:0"><div class="bg">${blobs}</div><div class="grid"></div></div>
  ${parts.join('\n  ')}
  <div id="botwrap" class="clip" data-start="0" data-duration="${f2(total)}" data-track-index="4" style="position:absolute;inset:0;pointer-events:none"><div id="bot"><div id="botinner" style="width:100%;height:100%">${starbySvg()}</div></div></div>
  ${caps.join('\n  ')}
  <div id="progwrap" class="clip" data-start="0" data-duration="${f2(total)}" data-track-index="10" style="position:absolute;inset:0;pointer-events:none"><div class="prog" id="prog"></div></div>
  ${audios.join('\n  ')}
  ${sfx.join('\n  ')}
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
// runs inside the GitHub page: README top + box of the smallest element containing each feature title
function featGeo(titles) {
  const art = document.querySelector('article.markdown-body'), sy = window.scrollY;
  const top = art ? art.getBoundingClientRect().top + sy : 0;
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9가-힣]+/g, ' ').trim();
  const els = art ? [...art.querySelectorAll('li,p,h1,h2,h3,h4,td,dt')] : [];
  const boxes = titles.map(t => { const k = norm(t).slice(0, 40); if (k.length < 4) return null;
    let best = null; for (const e of els) { const tx = norm(e.textContent); if (!tx.includes(k) || e.closest('nav,[role=navigation]')) continue; const sc = (tx.startsWith(k) ? 0 : 1e5) + (tx.length <= k.length + 8 ? 5e4 : 0) + tx.length; if (!best || sc < best.l) best = { e, l: sc }; }
    if (!best) return null; const b = best.e.getBoundingClientRect(); return { x: b.left, y: b.top + sy, w: b.width, h: Math.min(b.height, 420) }; });
  return { top, boxes, H: document.documentElement.scrollHeight };
}
// optional: Gemini writes the hook/one-liner/features/when + natural Korean (GEMINI_API_KEY). Falls back to templates.
async function gemini(prompt) {
  const key = ENV.GEMINI_API_KEY; if (!key) return null;
  const model = ENV.GEMINI_MODEL || 'gemini-flash-latest';
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', signal: AbortSignal.timeout(45000),
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.5 } }) });
    if (!r.ok) { console.log(`  gemini http ${r.status}`); return null; }
    const j = await r.json(); return JSON.parse(j.candidates?.[0]?.content?.parts?.map(x => x.text).join('') || 'null');
  } catch (e) { console.log(`  gemini failed: ${String(e.message).slice(0, 120)}`); return null; }
}
async function scriptFor(r, info, gain) {
  if (!ENV.GEMINI_API_KEY) return null;
  const o = await gemini(`You write narration for a 40-second YouTube Short about a GitHub repo, voiced by a friendly host. English narration, Korean on-screen text.
Facts (use ONLY these, never invent features, numbers or claims):
repo: ${r.n}
description: ${r.d || ''}
topics: ${(r.t || []).join(', ')}
README intro: ${info.para || ''}
README features: ${(info.feats || []).map(f => '- ' + f.t + (f.d ? ': ' + f.d : '')).join('\n')}
stars gained in the last day: ${gain}
Return JSON: {"hook": "first line, max 14 words, lead with the problem it solves or the concrete outcome, no greeting, no repo name", "what": "what it is in plain words, max 16 words, no marketing", "features": [{"en": "one short spoken sentence about one README feature, max 11 words", "sticker": "1-3 word English sticker label", "ko": "2-4 word Korean label", "match": "exact feature title copied from README features"}] (2-3 items, only from README features), "when": {"en": "Use it when ..., max 14 words", "ko": "Korean, max 22 chars, ends with ~할 때"}}`);
  if (!o || typeof o !== 'object') return null;
  const ok = (s, n) => typeof s === 'string' && s.trim() && s.length <= n;
  return { hook: ok(o.hook, 110) ? o.hook.trim() : null, what: ok(o.what, 130) ? o.what.trim().replace(/[.]$/, '') : null,
    features: Array.isArray(o.features) ? o.features.filter(f => ok(f?.en, 90)).map(f => ({ ...f, ko: f.ko || f.en, sticker: ok(f.sticker, 28) ? f.sticker : null })).slice(0, 3) : [],
    when: o.when && ok(o.when.en, 110) ? { en: o.when.en, ko: o.when.ko || o.when.en } : null };
}
async function translateKo(texts) {
  if (!texts.length) return [];
  if (ENV.GEMINI_API_KEY) {
    const o = await gemini(`Translate these English narration lines of a developer YouTube Short into natural, casual Korean subtitles (해요체). Short and spoken, not literal. Keep repo names, numbers and code as-is. "stars" = "스타". Return a JSON array of strings with exactly ${texts.length} items.\n` + JSON.stringify(texts));
    if (Array.isArray(o) && o.length === texts.length && o.every(s => typeof s === 'string')) return o.map(fixKo);
  }
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
  // screenshot of the repo page + where the README and each feature sit on it (for zoom-ins)
  const shoot = async (url, file, titles = [], w = 1280) => {
    if (!browser) return null;
    const pg = await browser.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
    try { await pg.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {}); await pg.waitForTimeout(1200);
      await pg.evaluate(() => document.querySelectorAll('[class*=cookie],[id*=cookie],.js-header-wrapper ~ .flash').forEach(e => e.remove()));
      const geo = await pg.evaluate(featGeo, titles).catch(() => ({ top: 0, boxes: [], H: 2200 }));
      const h = Math.round(Math.min(geo.H, 6000, Math.max(2200, geo.top + 1800, ...geo.boxes.filter(Boolean).map(b => b.y + b.h + 600))));
      await pg.screenshot({ path: file, clip: { x: 0, y: 0, width: w, height: h }, fullPage: true });
      return { w, h, top: geo.top, boxes: geo.boxes };
    } catch { return null; } finally { await pg.close(); }
  };

  // README + media for spotlight candidates
  const infos = {};
  if (types.includes('spotlight')) {
    const cands = (data.trending['daily:all'] || []).filter(x => R[x.n]?.sc && !['doc', 'archived', 'dead'].includes(R[x.n].sc.v)).slice(0, 3);
    for (const { n } of cands) {
      try {
        const raw = await (await tfetch(`https://raw.githubusercontent.com/${n}/HEAD/README.md`)).text();
        const info = extractReadme(raw, n);
        const ko = SUBS === 'ko' ? await translateKo(info.feats.map(f => f.t)) : info.feats.map(f => f.t);
        const script = await scriptFor(R[n], info, (data.trending['daily:all'].find(x => x.n === n) || {}).g || 0);
        infos[n] = { ...info, featsKo: ko, script };
        if (script) console.log(`  gemini script ok: ${n}`);
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
      const titles = (info.script?.features?.length ? info.script.features.map(f => f.match || f.en) : (info.feats || []).map(f => f.t));
      const geo = await shoot(`https://github.com/${spec0.repo}`, path.join(assets, 'page.png'), titles);
      if (geo) { info.media = { kind: 'page', src: 'assets/page.png', ...geo }; console.log(`  page: ${geo.h}px, readme@${Math.round(geo.top)}, features found ${geo.boxes.filter(Boolean).length}/${titles.length}`); }
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
    const need = SUBS === 'ko' ? spec.scenes.flatMap(s => s.say.filter((_, j) => !s.ko0?.[j])) : [], tr = await translateKo(need);
    let q = 0; for (const s of spec.scenes) s.ko = s.say.map((_, j) => s.ko0?.[j] || tr[q++]);
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
        let env = null;
        try { const { stdout } = await run('ffmpeg', ['-v', 'error', '-i', path.join(dir, f), '-ac', '1', '-ar', '8000', '-f', 's16le', '-'], { encoding: 'buffer', maxBuffer: 64e6 });
          const win = Math.round(8000 / 12), n = Math.floor(stdout.length / 2), raw = [];
          for (let i = 0; i + win <= n; i += win) { let q2 = 0; for (let k = 0; k < win; k++) { const v = stdout.readInt16LE((i + k) * 2) / 32768; q2 += v * v; } raw.push(Math.sqrt(q2 / win)); }
          const mx = Math.max(1e-4, ...raw); env = raw.map(v => Math.max(0, Math.min(1, (v / mx - 0.08) / 0.62)));
        } catch (e) { console.log('  envelope failed: ' + String(e.message).slice(0, 80)); }
        M.push(t); sents.push({ start: t, dur, audio: f, text: txt, ko: s.ko[j], env }); t += dur + GAP;
      }
      const D = t - S + TAIL; tsc.push({ S, D, M, sents }); cur = S + D;
    }
    const timing = { total: cur, scenes: tsc };
    for (const kind of ['pop', 'whoosh', 'stamp', 'thud', 'keys', 'ding']) await fs.writeFile(path.join(assets, 'sfx-' + kind + '.wav'), wavBuf(synthSfx(kind)));
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
    await fs.writeFile(path.join(OUT, `${spec.id}-youtube.txt`), `${spec.title}\n\n${spec.repo ? `Why ${spec.repo} is trending, what it does, when to use it, and whether people actually use it.` : 'GitHub repos gaining stars fastest, checked against real usage.'}\n\n${links}\n\nGitHub Star Board: ${site}\n\n#GitHub #opensource #developer #AI${spec.F.vert ? ' #shorts' : ''}\n`);
    console.log(`done: ${outFile}`);
  }
  if (browser) await browser.close();
}


// ---------------- one-off films (hand-directed spec, same renderer) ----------------
const pushSfx = (at, kind, vol, dur) => SFXQ.push([at, kind, vol, dur]);
const getSfxQ = () => SFXQ;

// fallback music bed written in code (84 BPM lo-fi: e-piano 7th chords, bass with harmonics, soft kick/snare/hats, vinyl)
function synthLofi(sec, SR = 44100) {
  const N = Math.ceil(sec * SR), out = new Float32Array(N), beat = 60 / 84, bar = beat * 4;
  let seed = 4242; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const CH = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
  const note = (t0, f, len, g, kind) => { const s0 = Math.round(t0 * SR), n = Math.round(len * SR);
    for (let i = 0; i < n && s0 + i < N; i++) { const t = i / SR, a = Math.min(1, t / 0.012);
      let v; if (kind === 'ep') v = (Math.sin(2 * Math.PI * f * t) + 0.32 * Math.sin(2 * Math.PI * 2 * f * t) * Math.exp(-t * 3) + 0.5 * Math.sin(2 * Math.PI * f * 1.003 * t)) * Math.exp(-t * 1.5);
      else v = (Math.sin(2 * Math.PI * f * t) + 0.45 * Math.sin(2 * Math.PI * 2 * f * t) + 0.25 * Math.sin(2 * Math.PI * 3 * f * t)) * Math.exp(-t * 2.2);
      out[s0 + i] += v * a * g; } };
  for (let b = 0; b * bar < sec; b++) {
    const c = CH[b % 4], t0 = b * bar;
    c.forEach((m, k) => { note(t0 + k * 0.018, hz(m), bar * 0.95, 0.07, 'ep'); note(t0 + beat * 2.5 + k * 0.015, hz(m), beat * 1.4, 0.035, 'ep'); });
    note(t0, hz(c[0] - 12), beat * 1.6, 0.16, 'bass'); note(t0 + beat * 2, hz(c[0] - 12), beat * 1.2, 0.12, 'bass'); note(t0 + beat * 3.5, hz(c[2] - 12), beat * 0.45, 0.08, 'bass');
    for (let q = 0; q < 4; q++) { const tb = t0 + q * beat, s0 = Math.round(tb * SR);
      if (q % 2 === 0) { let ph = 0; for (let i = 0; i < SR * 0.25 && s0 + i < N; i++) { const t = i / SR; ph += 2 * Math.PI * (45 + 70 * Math.exp(-t * 28)) / SR; out[s0 + i] += Math.sin(ph) * Math.exp(-t * 11) * 0.42; } }
      else { let lp = 0; for (let i = 0; i < SR * 0.18 && s0 + i < N; i++) { const t = i / SR, w = rnd() * 2 - 1; lp += 0.5 * (w - lp); out[s0 + i] += (w - lp) * Math.exp(-t * 22) * 0.16 + Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 30) * 0.08; } }
      for (const h of [0, 0.58]) { const sh = Math.round((tb + h * beat) * SR); let lp = 0; for (let i = 0; i < SR * 0.04 && sh + i < N; i++) { const w = rnd() * 2 - 1; lp += 0.7 * (w - lp); out[sh + i] += (w - lp) * Math.exp(-(i / SR) * 90) * (h ? 0.05 : 0.07); } }
    }
  }
  let lp = 0, pk = 1e-4; for (let i = 0; i < N; i++) { lp += 0.35 * (out[i] - lp); out[i] = lp + (rnd() < 0.0004 ? (rnd() - 0.5) * 0.15 : 0) + (rnd() - 0.5) * 0.004; pk = Math.max(pk, Math.abs(out[i])); }
  for (let i = 0; i < N; i++) out[i] *= 0.55 / pk;
  return out;
}
// sound bed: CC0 music (ducked under narration, with deliberate silences) + CC0 UI sound effects, mixed in JS
async function mixBed({ total, sents, events, drops = [], musicFile, sfxDir, out, run }) {
  const fsP = await import('node:fs/promises'), path = await import('node:path');
  const SR = 44100, N = Math.ceil(total * SR), bed = new Float32Array(N), cache = {};
  const pcm = async f => { if (cache[f] !== undefined) return cache[f]; try { const { stdout } = await run('ffmpeg', ['-v', 'error', '-i', f, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { encoding: 'buffer', maxBuffer: 256e6 }); const ab = stdout.buffer.slice(stdout.byteOffset, stdout.byteOffset + Math.floor(stdout.length / 4) * 4); cache[f] = new Float32Array(ab); } catch { cache[f] = null; } return cache[f]; };
  const has = async f => fsP.access(f).then(() => true, () => false);
  const pick = async (...names) => { for (const n of names) { const f = path.join(sfxDir, n); if (await has(f)) return f; } return null; };
  const MAP = { whoosh: ['fs-whoosh.mp3', 'ui-swipe.mp3'], pop: ['fs-pop.mp3', 'ui-reaction.mp3'], stamp: ['ui-badge.mp3'], thud: ['ui-snap.mp3'], ding: ['ui-ding.mp3'], check: ['ui-check.mp3'], open: ['ui-open.mp3'], success: ['ui-success.mp3'], levelup: ['ui-levelup.mp3'], snap: ['ui-snap.mp3'], keys: ['ui-typing.mp3'] };
  const VOL = { whoosh: 0.5, pop: 0.6, stamp: 0.8, thud: 0.6, ding: 0.55, check: 0.6, open: 0.5, success: 0.6, levelup: 0.6, snap: 0.5, keys: 0.45 };
  const add = (buf, at, g) => { const o = Math.round(at * SR); for (let i = 0; i < buf.length && o + i < N; i++) if (o + i >= 0) bed[o + i] += buf[i] * g; };
  for (const [at, kind, vol, dur] of events) {
    const f = await pick(...(MAP[kind] || [])); const b = f && await pcm(f); if (!b) continue;
    const g = vol || VOL[kind] || 0.5;
    if (kind === 'keys') { let t = at, k = 0; const end = at + (dur || 1); while (t < end) { add(b, t, g * (0.7 + 0.3 * ((k * 0.618) % 1))); t += 0.075 + ((k * 0.37) % 1) * 0.05; k++; } }
    else add(b, at, g);
  }
  let m = musicFile && await pcm(musicFile), synth = false;
  if (!m || m.length < SR) { m = synthLofi(Math.min(total + 1, 120), SR); synth = true; }
  if (m && m.length > SR) {
    const talk = new Uint8Array(Math.ceil(total * 20) + 1); for (const x of sents) for (let k = Math.floor(x.start * 20); k < Math.min(talk.length, Math.ceil((x.start + x.dur) * 20)); k++) talk[k] = 1;
    let gPrev = 0;
    for (let i = 0; i < N; i++) {
      const t = i / SR; let g = talk[Math.floor(t * 20)] ? 0.11 : 0.2;
      for (const [a, b] of drops) if (t >= a && t < b) g = 0;
      g *= Math.min(1, t / 0.4) * Math.max(0, Math.min(1, (total - t) / 1.2));
      gPrev += (g - gPrev) * 0.0006;
      bed[i] += m[i % m.length] * gPrev;
    }
  }
  for (let i = 0; i < N; i++) bed[i] = Math.tanh(bed[i] * 1.1) / 1.1;
  await fsP.writeFile(out, wavBuf(bed, SR));
  return synth ? 'synth lo-fi (download failed)' : 'file';
}
const srtTime = s => { const ms = Math.max(0, Math.round(s * 1000)), h = Math.floor(ms / 36e5), mi = Math.floor(ms / 6e4) % 60, se = Math.floor(ms / 1000) % 60; return String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0') + ':' + String(se).padStart(2, '0') + ',' + String(ms % 1000).padStart(3, '0'); };
const toSrt = (sents, key) => sents.map((x, i) => (i + 1) + '\n' + srtTime(x.start) + ' --> ' + srtTime(x.start + Math.max(1.8, x.dur + 0.3)) + '\n' + (x[key] || x.text) + '\n').join('\n');
// spec: { id, F, title, scenes:[{say:[en], ko:[ko], tts?:[..], html, anim, mood, bot}], assets:[{url|file, name}], music:{urls:[]}, sfxUrls:{name:url}, drops(timing)=>[[a,b]] }
async function produceFilm(spec, { OUT = 'out', sfxDir = 'video/sfx' } = {}) {
  const fs = await import('node:fs/promises'), path = await import('node:path');
  const { execFile, spawn } = await import('node:child_process'); const run = (await import('node:util')).promisify(execFile);
  const dir = path.resolve(OUT, 'projects', spec.id), assets = path.join(dir, 'assets'); await fs.mkdir(assets, { recursive: true });
  await fs.writeFile(path.join(assets, 'gsap.min.js'), await fs.readFile(path.resolve('node_modules/gsap/dist/gsap.min.js'), 'utf8'));
  for (const a of spec.assets || []) { try { const b = a.file ? await fs.readFile(a.file) : Buffer.from(await (await tfetch(a.url, { redirect: 'follow' })).arrayBuffer()); await fs.writeFile(path.join(assets, a.name), b); } catch (e) { console.log('asset failed ' + a.name + ': ' + e.message); } }
  const okAudio = (r, b) => r.ok && b.length > 1500 && !/^\s*</.test(b.slice(0, 20).toString());
  let musicFile = null;
  for (const u of spec.music?.urls || []) { try { const r = await tfetch(u, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36', Referer: 'https://freesound.org/' } }); const b = Buffer.from(await r.arrayBuffer()); console.log('music ' + r.status + ' ' + b.length + 'B ' + u); if (okAudio(r, b) && b.length > 50000) { musicFile = path.join(assets, 'music.mp3'); await fs.writeFile(musicFile, b); break; } } catch (e) { console.log('music fetch failed: ' + e.message); } }
  for (const [n, u] of Object.entries(spec.sfxUrls || {})) { try { const r = await tfetch(u, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36', Referer: 'https://freesound.org/' } }); console.log('sfx ' + n + ' ' + r.status); const b = Buffer.from(await r.arrayBuffer()); if (okAudio(r, b)) await fs.writeFile(path.join(sfxDir, n), b); } catch {} }
  let cur = 0; const tsc = [];
  for (const [i, s] of spec.scenes.entries()) {
    const S = cur; let t = S + (s.head ?? HEAD); const M = [], sents = [];
    for (const [j, txt] of s.say.entries()) {
      const f = 'assets/a' + i + '_' + j + '.mp3'; let dur = 0;
      for (let a = 0; a < 3 && !dur; a++) { try { await run('edge-tts', ['--voice', VOICE, '--rate=' + RATE, '--text', s.tts?.[j] || txt, '--write-media', path.join(dir, f)], { timeout: 30000 }); const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(dir, f)]); dur = parseFloat(stdout) || 0; } catch (e) { await new Promise(r => setTimeout(r, 2500)); } }
      if (!dur) { dur = Math.max(1.5, txt.split(/\s+/).length / 2.6); await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', String(dur), path.join(dir, f)]); }
      let env = null;
      try { const { stdout } = await run('ffmpeg', ['-v', 'error', '-i', path.join(dir, f), '-ac', '1', '-ar', '8000', '-f', 's16le', '-'], { encoding: 'buffer', maxBuffer: 64e6 }); const win = Math.round(8000 / 12), n = Math.floor(stdout.length / 2), raw = []; for (let q = 0; q + win <= n; q += win) { let q2 = 0; for (let k = 0; k < win; k++) { const v = stdout.readInt16LE((q + k) * 2) / 32768; q2 += v * v; } raw.push(Math.sqrt(q2 / win)); } const mx = Math.max(1e-4, ...raw); env = raw.map(v => Math.max(0, Math.min(1, (v / mx - 0.08) / 0.62))); } catch {}
      M.push(t); sents.push({ start: t, dur, audio: f, text: txt, ko: s.ko?.[j], env }); t += dur + (s.gap?.[j] ?? GAP);
    }
    const D = t - S + (s.tail ?? TAIL); tsc.push({ S, D, M, sents }); cur = S + D;
  }
  const timing = { total: cur, scenes: tsc };
  const html = compose(spec, timing, { bed: 'assets/bed.wav' });
  const allS = tsc.flatMap(x => x.sents);
  const hadMusic = await mixBed({ total: timing.total, sents: allS, events: getSfxQ().filter(([at]) => at >= 0 && at < timing.total), drops: spec.drops ? spec.drops(timing) : [], musicFile, sfxDir, out: path.join(assets, 'bed.wav'), run });
  console.log('bed: music ' + hadMusic + ', sfx events ' + getSfxQ().length);
  await fs.writeFile(path.join(dir, 'index.html'), html);
  const outFile = path.join(path.resolve(OUT), spec.id + '.mp4');
  console.log('render: ' + spec.id + ' (' + timing.total.toFixed(1) + 's)');
  await new Promise((res, rej) => { const ch = spawn('npx', ['hyperframes', 'render', dir, '--output', outFile, '--quality', 'standard', '--fps', ENV.HF_FPS || '30'], { stdio: 'inherit' }); ch.on('close', c => (c === 0 ? res() : rej(new Error('render exit ' + c)))); });
  await fs.writeFile(path.join(path.resolve(OUT), spec.id + '.en.srt'), toSrt(allS, 'text'));
  await fs.writeFile(path.join(path.resolve(OUT), spec.id + '.ko.srt'), toSrt(allS, 'ko'));
  await fs.writeFile(path.join(path.resolve(OUT), spec.id + '-script.txt'), spec.scenes.map((s, i) => '[' + (i + 1) + '] ' + s.say.join(' ') + '\n    ' + (s.ko || []).join(' ')).join('\n\n') + '\n\n' + (spec.credits || ''));
  console.log('done: ' + outFile);
  return { outFile, timing };
}
export { A, f2, esc, brand, winBar, typed, num, words, short, say, compose, estimateTiming, starbySvg, pushSfx, getSfxQ, produceFilm, toSrt, HEAD, GAP, TAIL };

if (typeof process !== 'undefined' && /hf-video\.mjs$/.test(process.argv?.[1] || '')) {
  main().catch(e => { console.error(e); process.exit(1); });
}
