// Science Shorts 렌더 엔진 (HyperFrames: HTML + GSAP -> headless Chrome + FFmpeg -> MP4)
// 스타보드 엔진(video/hf-video.mjs)에서 과학 채널에 필요한 부분만 옮겨 정리했다.
//   - 캐릭터(Starby) 없음: 립싱크·깜빡임·말풍선 코드 전부 제거 (noHost)
//   - 한국어 자막은 대사(say) 그대로. "별->스타" 치환(fixKo) 없음. 자막 한 조각 최대 36자 (lessons 2026-10-31)
//   - 목소리는 storyboard.voice (임시 edge-tts)
//   - 효과음은 코드로 합성 (외부 파일·다운로드 없음): pop, ding, stamp, whoosh, check, tick, thud, shimmer
//   - 장면 전환 6종, 카메라(#pcam)·무대(#pst) 래퍼, 단어별 자막 + 숫자·키워드 강조 (v2 모션)
// 미리보기(tools/preview.mjs)도 같은 compose()를 쓴다. 미리보기와 렌더 결과가 달라지지 않게 하기 위해서다.

const ENV = (typeof process !== 'undefined' && process.env) || {};
export const HEAD = 0.3, GAP = 0.2, TAIL = 0.4, CAP_MAX = 36;
export const f2 = x => Number(x).toFixed(2);
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let SFXQ = [];
export const pushSfx = (at, kind, vol) => { SFXQ.push([at, kind, vol]); };
export const getSfxQ = () => SFXQ;
export const H = { f2, esc, pushSfx };

// 자막 조각: 쉼표·마침표 뒤에서만 자르고, 한 조각 CAP_MAX자 이하로 합친다
export function capPieces(text, max = CAP_MAX) {
  const out = []; let buf = '';
  for (const seg of String(text).split(/(?<=[.!?,])\s+/)) {
    if (buf && (buf + ' ' + seg).length > max) { out.push(buf); buf = seg; } else buf = (buf ? buf + ' ' : '') + seg;
  }
  if (buf) out.push(buf);
  return out;
}

// 음성 없이 길이 추정. 미리보기용. Hyunsu +0%가 실측 약 4.7자/초 (EP001 렌더, 공백 제외)
export const CPS = 4.7;
export const rateFactor = r => 1 + (parseFloat(String(r || '0').replace('%', '')) || 0) / 100;
export function estimateTiming(spec) {
  let cur = 0; const scenes = []; const cps = CPS * rateFactor(spec.voice?.rate);
  for (const s of spec.scenes) {
    const S = cur; let t = S + (s.head ?? HEAD); const sents = [];
    s.say.forEach(txt => { const d = Math.max(1.3, txt.replace(/\s/g, '').length / cps); sents.push({ start: t, dur: d, text: txt }); t += d + GAP; });
    const D = t - S + (s.tail ?? TAIL); scenes.push({ S, D, sents }); cur = S + D;
  }
  return { total: cur, scenes };
}

const BASE_CSS = F => `*{box-sizing:border-box;margin:0;padding:0}html,body{background:#000}
#root{position:relative;width:${F.W}px;height:${F.H}px;overflow:hidden;color:#fff;font-family:"Noto Sans KR","Pretendard","Malgun Gothic",sans-serif;word-break:keep-all}
.scn,.stage,.cam{position:absolute;left:0;top:0;width:${F.W}px;height:${F.H}px}
.cap{position:absolute;left:${F.capL ?? 70}px;right:${F.capR ?? 130}px;bottom:${F.capB ?? 590}px;text-align:center;z-index:50}
.cap .box{display:inline-block;border-radius:18px;padding:14px 26px;font-size:46px;line-height:1.38;font-weight:800;word-break:keep-all;background:#0b1426e0;border:3px solid #fca31144;color:#fff}
.cap .cw{display:inline-block}.cap .cw.hl{color:#fca311}`;

// 장면 전환 (HyperFrames motion 가이드의 "원인이 있는 전환"). 퇴장은 짧게 가속, 등장은 길게 감속.
// whip: 가로로 휙 / rise: 세로로 휙 / blur: 같은 무대에서 흐려졌다 선명 / iris: 앞 장면의 한 점에서 원으로 열림 / flood: 배경색이 번지며 바뀜 / cut
const TRANS_OUT = {
  whip: (p, T) => `tl.to('#${p}cam',{x:-260,filter:'blur(14px)',opacity:0,duration:.24,ease:'power3.in'},${f2(T - 0.24)});`,
  rise: (p, T) => `tl.to('#${p}cam',{y:-300,filter:'blur(14px)',opacity:0,duration:.24,ease:'power3.in'},${f2(T - 0.24)});`,
  blur: (p, T) => `tl.to('#${p}cam',{opacity:0,filter:'blur(8px)',duration:.18,ease:'power2.in'},${f2(T - 0.18)});`,
};
const TRANS_IN = {
  whip: (p, S) => (SFXQ.push([S - 0.2, 'whoosh', 0.35]), `tl.fromTo('#${p}cam',{x:300,filter:'blur(14px)',opacity:0},{x:0,filter:'blur(0px)',opacity:1,duration:.45,ease:'expo.out'},${f2(S)});`),
  rise: (p, S) => (SFXQ.push([S - 0.2, 'whoosh', 0.35]), `tl.fromTo('#${p}cam',{y:320,filter:'blur(14px)',opacity:0},{y:0,filter:'blur(0px)',opacity:1,duration:.45,ease:'expo.out'},${f2(S)});`),
  blur: (p, S) => `tl.fromTo('#${p}cam',{opacity:0,filter:'blur(8px)'},{opacity:1,filter:'blur(0px)',duration:.26,ease:'power2.out'},${f2(S)});`,
  iris: (p, S, s) => { const [x, y] = s.irisAt || [540, 760]; SFXQ.push([S, 'shimmer', 0.35]); return `tl.fromTo('#${p}st',{clipPath:'circle(0px at ${x}px ${y}px)'},{clipPath:'circle(2300px at ${x}px ${y}px)',duration:.5,ease:'power3.in'},${f2(S)});`; },
  flood: (p, S, s) => { const [x, y] = s.floodAt || [540, 760]; SFXQ.push([S, 'whoosh', 0.25]); return `tl.fromTo('#${p}st',{clipPath:'circle(0px at ${x}px ${y}px)'},{clipPath:'circle(2300px at ${x}px ${y}px)',duration:.65,ease:'power2.inOut'},${f2(S)});`; },
  cut: () => '',
};
const HOLD = { iris: 0.55, flood: 0.7 }; // 앞 장면이 열리는 원 뒤에 남아 있도록 클립을 늘리는 시간

// spec: scienceFilm() 결과. timing: { total, scenes:[{S,D,sents:[{start,dur,text,audio?}]}] }
// opts: { gsapSrc, bed, preview } preview=true면 클립 표시 토글과 window.TL/SCENES를 넣는다 (일반 브라우저용)
export function compose(spec, timing, opts = {}) {
  const F = spec.F, total = timing.total, gsapSrc = opts.gsapSrc || 'assets/gsap.min.js';
  const parts = [], anims = [], audios = [], caps = []; SFXQ = [];
  const KW = (spec.keywords || []).map(String);
  const hl = w => /\d/.test(w) || KW.some(k => k && w.startsWith(k));
  spec.scenes.forEach((s, i) => {
    const t = timing.scenes[i], p = 's' + i, next = spec.scenes[i + 1];
    const inK = i ? (s.trans || 'blur') : 'cut', nextK = next ? (next.trans || 'blur') : null;
    const ownBg = inK === 'iris' || inK === 'flood' ? (s.under ? s.under(p) : (spec.bgHtml || '')) : (s.under ? s.under(p) : '');
    parts.push(`<div id="${p}" class="clip scn" data-start="${f2(t.S)}" data-duration="${f2(t.D + (HOLD[nextK] || 0))}" data-track-index="1" style="z-index:${10 + i}"><div class="stage" id="${p}st">${ownBg}<div class="cam" id="${p}cam">${s.html(p, F, t)}</div></div></div>`);
    if (i) anims.push((TRANS_IN[inK] || TRANS_IN.blur)(p, t.S, s));
    if (next && TRANS_OUT[nextK] && !s.noExit) anims.push(TRANS_OUT[nextK](p, t.S + t.D));
    anims.push(s.anim(p, t.S, t.D, null, F, t));
    t.sents.forEach((x, j) => {
      if (x.audio) audios.push(`<audio id="v${i}_${j}" data-start="${f2(x.start)}" data-duration="${f2(x.dur)}" data-track-index="${6 + (j % 2)}" data-volume="1" src="${esc(x.audio)}"></audio>`);
      const pieces = capPieces(x.text), tl0 = pieces.reduce((a, b) => a + b.length, 0) || 1; let off = 0;
      pieces.forEach((pc, k) => {
        const st = x.start + (x.dur * off) / tl0, du = (x.dur * pc.length) / tl0 + (k === pieces.length - 1 ? 0.1 : 0); off += pc.length;
        const id = `c${i}_${j}_${k}`, ws = pc.split(/\s+/);
        caps.push(`<div id="${id}" class="clip cap" data-start="${f2(st)}" data-duration="${f2(du)}" data-track-index="${8 + ((j + k) % 2)}"><span class="box">${ws.map(w => `<span class="cw${hl(w) ? ' hl' : ''}">${esc(w)}</span>`).join(' ')}</span></div>`);
        // 단어가 말하는 속도에 맞춰 차례로 선명해진다 (단어 사이 0.06~0.12초)
        anims.push(`tl.fromTo('#${id} .cw',{opacity:0,filter:'blur(5px)'},{opacity:1,filter:'blur(0px)',duration:.14,stagger:${f2(Math.min(0.12, Math.max(0.06, (du * 0.45) / ws.length)))},ease:'power2.out'},${f2(st)});`);
      });
    });
  });
  const bed = opts.bed ? `<audio id="bed" data-start="0" data-duration="${f2(total)}" data-track-index="5" data-volume="1" src="${esc(opts.bed)}"></audio>` : '';
  const drift = spec.bgDrift ? `tl.fromTo('${spec.bgDrift}',{y:0},{y:90,duration:${f2(total)},ease:'none'},0);` : '';
  const pv = opts.preview
    ? `document.querySelectorAll('#root [data-start]').forEach(el=>{if(el.tagName==='AUDIO')return;const a=+el.dataset.start,d=+el.dataset.duration;if(a>.001){gsap.set(el,{autoAlpha:0});tl.set(el,{autoAlpha:1},a);}if(a+d<${f2(total)}-.01)tl.set(el,{autoAlpha:0},a+d);});
    window.TL=tl;window.SCENES=${JSON.stringify(timing.scenes.map((t, i) => ({ id: spec.scenes[i].sceneId, S: +f2(t.S), D: +f2(t.D) })))};` : '';
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(spec.id)}</title><style>${BASE_CSS(F)}${spec.css || ''}</style></head><body>
<div id="root" data-composition-id="root" data-start="0" data-duration="${f2(total)}" data-width="${F.W}" data-height="${F.H}"${spec.motionBlur ? ' data-motion-blur="on"' : ''}>
  <div id="bgwrap" class="clip" data-start="0" data-duration="${f2(total)}" data-track-index="0" style="position:absolute;inset:0;z-index:0">${spec.bgHtml || ''}</div>
  ${parts.join('\n  ')}
  ${caps.join('\n  ')}
  ${audios.join('\n  ')}
  ${bed}
  <script src="${gsapSrc}"></script>
  <script>
    (() => { // 함수로 감싼다: 같은 탭에 document.write를 다시 해도 'const tl' 중복 선언으로 멈추지 않게
    const tl = gsap.timeline({ paused: true });
    ${drift}
    ${anims.filter(Boolean).join('\n    ')}
    tl.set({}, {}, ${f2(total)});
    ${pv}
    window.__timelines = window.__timelines || {};
    window.__timelines.root = tl;
    })();
  </script>
</div></body></html>`;
}
// ---------------- 소리 (코드 합성) ----------------
function synthSfx(kind) {
  const sr = 44100; let seed = 9187; const noise = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x3fffffff - 1; };
  const mk = (sec, fn) => { const n = Math.round(sr * sec), s = new Float32Array(n); for (let i = 0; i < n; i++) s[i] = fn(i / sr, i); return s; };
  let ph = 0, lp = 0, lp2 = 0;
  if (kind === 'pop') return mk(0.13, t => { ph += 2 * Math.PI * (480 + 1300 * Math.min(1, t / 0.05)) / sr; return Math.sin(ph) * Math.exp(-t * 34) * 0.8; });
  if (kind === 'whoosh') return mk(0.4, t => { const e = Math.sin(Math.PI * t / 0.4) ** 2, al = 0.03 + 0.3 * (t / 0.4); lp += al * (noise() - lp); lp2 += 0.4 * (lp - lp2); return (lp - 0.6 * lp2) * e * 1.6; });
  if (kind === 'stamp') return mk(0.32, t => { ph += 2 * Math.PI * (120 - 60 * Math.min(1, t / 0.15)) / sr; lp += 0.35 * (noise() - lp); return Math.sin(ph) * Math.exp(-t * 13) * 0.9 + lp * Math.exp(-t * 55) * 0.9; });
  if (kind === 'ding') return mk(0.9, t => (Math.sin(2 * Math.PI * 1568 * t) + 0.5 * Math.sin(2 * Math.PI * 2352 * t) + 0.25 * Math.sin(2 * Math.PI * 3136 * t)) * Math.exp(-t * 5) * 0.3);
  if (kind === 'tick') return mk(0.03, t => Math.sin(2 * Math.PI * 2400 * t) * Math.exp(-t * 160) * 0.5);
  if (kind === 'thud') return mk(0.22, t => { ph += 2 * Math.PI * (95 - 40 * Math.min(1, t / 0.12)) / sr; return Math.sin(ph) * Math.exp(-t * 20) * 0.8; });
  if (kind === 'shimmer') return mk(0.9, t => [2637, 3136, 3951, 4699].reduce((a, f, k) => a + Math.sin(2 * Math.PI * f * t) * Math.exp(-Math.max(0, t - k * 0.06) * 6) * (t >= k * 0.06 ? 1 : 0), 0) * 0.12);
  if (kind === 'check') return mk(0.35, t => (t < 0.09 ? Math.sin(2 * Math.PI * 1047 * t) : Math.sin(2 * Math.PI * 1568 * t)) * Math.exp(-(t % 0.09) * 18) * 0.35);
  return new Float32Array(1);
}
function wavBuf(s, sr = 44100) { const n = s.length, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40); for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s[i])) * 32767), 44 + i * 2); return b; }
// 잔잔한 배경음 (코드 합성, 저작권 문제 없음): 느린 일렉 피아노 화음
function synthPad(sec, SR = 44100) {
  const N = Math.ceil(sec * SR), out = new Float32Array(N), bar = 60 / 76 * 4;
  const hz = m => 440 * Math.pow(2, (m - 69) / 12), CH = [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 66], [52, 55, 59, 62]];
  for (let b = 0; b * bar < sec; b++) CH[b % 4].forEach((m, k) => { const s0 = Math.round((b * bar + k * 0.02) * SR), n = Math.round(bar * 1.1 * SR), f = hz(m);
    for (let i = 0; i < n && s0 + i < N; i++) { const t = i / SR; out[s0 + i] += (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * 2 * f * t) * Math.exp(-t * 3)) * Math.min(1, t / 0.03) * Math.exp(-t * 0.9) * 0.08; } });
  let pk = 1e-4; for (const v of out) pk = Math.max(pk, Math.abs(v)); for (let i = 0; i < N; i++) out[i] *= 0.5 / pk;
  return out;
}
// 효과음 + 배경음 (대사 중에는 낮춤) -> bed.wav
function mixBed({ total, sents, events, music = true }) {
  const SR = 44100, N = Math.ceil(total * SR), bed = new Float32Array(N), cache = {};
  const add = (buf, at, g) => { const o = Math.round(at * SR); for (let i = 0; i < buf.length && o + i < N; i++) if (o + i >= 0) bed[o + i] += buf[i] * g; };
  for (const [at, kind, vol] of events) add(cache[kind] ||= synthSfx(kind), at, vol ?? 0.4);
  if (music) {
    const m = synthPad(total + 1, SR), talk = new Uint8Array(Math.ceil(total * 20) + 1);
    for (const x of sents) for (let k = Math.floor(x.start * 20); k < Math.min(talk.length, Math.ceil((x.start + x.dur) * 20)); k++) talk[k] = 1;
    let g0 = 0;
    for (let i = 0; i < N; i++) { const t = i / SR; let g = talk[Math.floor(t * 20)] ? 0.1 : 0.18; g *= Math.min(1, t / 0.4) * Math.max(0, Math.min(1, (total - t) / 1.2)); g0 += (g - g0) * 0.0006; bed[i] += m[i] * g0; }
  }
  for (let i = 0; i < N; i++) bed[i] = Math.tanh(bed[i] * 1.1) / 1.1;
  return wavBuf(bed, SR);
}
const srtTime = s => { const ms = Math.max(0, Math.round(s * 1000)), h = Math.floor(ms / 36e5), mi = Math.floor(ms / 6e4) % 60, se = Math.floor(ms / 1000) % 60; return String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0') + ':' + String(se).padStart(2, '0') + ',' + String(ms % 1000).padStart(3, '0'); };
export const toSrt = sents => sents.map((x, i) => (i + 1) + '\n' + srtTime(x.start) + ' --> ' + srtTime(x.start + Math.max(1.5, x.dur + 0.2)) + '\n' + x.text + '\n').join('\n');

// ---------------- 렌더 (GitHub Actions: ffmpeg, edge-tts, npx hyperframes 필요) ----------------
export async function produceFilm(spec, { OUT = 'out' } = {}) {
  const fs = await import('node:fs/promises'), path = await import('node:path');
  const { execFile, spawn } = await import('node:child_process'); const run = (await import('node:util')).promisify(execFile);
  const voice = spec.voice?.voice || 'ko-KR-HyunsuMultilingualNeural', rate = spec.voice?.rate || '+0%';
  const dir = path.resolve(OUT, 'projects', spec.id), assets = path.join(dir, 'assets'); await fs.mkdir(assets, { recursive: true });
  await fs.copyFile(path.resolve('node_modules/gsap/dist/gsap.min.js'), path.join(assets, 'gsap.min.js'));
  const probe = async f => { const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]); return parseFloat(stdout) || 0; };
  let cur = 0; const tsc = [];
  for (const [i, s] of spec.scenes.entries()) {
    const S = cur; let t = S + (s.head ?? HEAD); const sents = [];
    for (const [j, txt] of s.say.entries()) {
      const f = 'assets/a' + i + '_' + j + '.mp3', fp = path.join(dir, f); let dur = 0;
      for (let a = 0; a < 3 && !dur; a++) { try { await run('edge-tts', ['--voice', voice, '--rate=' + rate, '--text', s.tts?.[j] || txt, '--write-media', fp], { timeout: 30000 }); dur = await probe(fp); } catch (e) { console.log('tts retry ' + (a + 1) + ': ' + e.message); await new Promise(r => setTimeout(r, 2500)); } }
      if (!dur) { dur = Math.max(1.5, txt.replace(/\s/g, '').length / 7); console.log('TTS FAILED, silence for: ' + txt); await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', String(dur), fp]); }
      sents.push({ start: t, dur, audio: f, text: txt }); t += dur + GAP;
    }
    const D = t - S + (s.tail ?? TAIL); tsc.push({ S, D, sents }); cur = S + D;
  }
  const timing = { total: cur, scenes: tsc };
  const html = compose(spec, timing, { bed: 'assets/bed.wav' });
  const allS = tsc.flatMap(x => x.sents);
  await fs.writeFile(path.join(assets, 'bed.wav'), mixBed({ total: timing.total, sents: allS, events: getSfxQ().filter(([at]) => at >= 0 && at < timing.total - 0.2), music: spec.music !== false }));
  await fs.writeFile(path.join(dir, 'index.html'), html);
  try { const { stdout, stderr } = await run('npx', ['hyperframes', 'lint', dir], { timeout: 120000 }); console.log('--- hyperframes lint ---\n' + stdout + stderr); } catch (e) { console.log('--- hyperframes lint (issues) ---\n' + (e.stdout || '') + (e.stderr || e.message)); }
  const outFile = path.join(path.resolve(OUT), spec.id + '.mp4');
  console.log('render: ' + spec.id + ' (' + timing.total.toFixed(1) + 's, voice ' + voice + ', sfx ' + getSfxQ().length + ')');
  await new Promise((res, rej) => { const ch = spawn('npx', ['hyperframes', 'render', dir, '--output', outFile, '--quality', 'standard', '--fps', ENV.HF_FPS || '30'], { stdio: 'inherit' }); ch.on('close', c => (c === 0 ? res() : rej(new Error('render exit ' + c)))); });
  // 끝 검은 프레임 방지: 컴포지션 길이보다 길면 잘라낸다 (lessons 2026-10-31)
  try { const d = await probe(outFile);
    if (d > timing.total + 0.15) { const tmp = outFile.replace(/\.mp4$/, '.trim.mp4'); await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', outFile, '-t', timing.total.toFixed(2), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', tmp]); await fs.rename(tmp, outFile); console.log('trimmed ' + d.toFixed(2) + 's -> ' + timing.total.toFixed(2) + 's'); } } catch (e) { console.log('trim skipped: ' + e.message); }
  await fs.writeFile(path.join(path.resolve(OUT), spec.id + '.ko.srt'), toSrt(allS));
  await fs.writeFile(path.join(path.resolve(OUT), spec.id + '-timing.txt'), timing.scenes.map((t, i) => spec.scenes[i].sceneId + ' ' + t.S.toFixed(2) + 's +' + t.D.toFixed(2) + 's\n' + t.sents.map(x => '   ' + x.start.toFixed(2) + ' ' + x.dur.toFixed(2) + ' ' + x.text).join('\n')).join('\n') + '\ntotal ' + timing.total.toFixed(2) + 's\n');
  console.log('done: ' + outFile);
  return { outFile, timing };
}
