#!/usr/bin/env node
// GitHub Star Board - 소개 영상 자동 생성기
// 사용: node video/make-video.mjs --type shorts|weekly|both --out out
// 필요: data/latest.json (collect.mjs 결과), playwright(chromium), ffmpeg/ffprobe, edge-tts (pip install edge-tts)
// 결과: out/shorts-YYYY-MM-DD.mp4 (1080x1920), out/weekly-YYYY-MM-DD.mp4 (1920x1080), 각 영상의 *-script.txt / *-youtube.txt

const DAYMS = 864e5;
const VOICE = (typeof process !== 'undefined' && process.env.TTS_VOICE) || 'ko-KR-SunHiNeural';
const RATE = (typeof process !== 'undefined' && process.env.TTS_RATE) || '+8%';
const FPS = 30;

// ---------------- 문장/숫자 도우미 ----------------
const nk = n => { // 한국어로 읽기 좋은 숫자 (12,345 -> 1만 2천)
  n = Math.round(n || 0);
  if (n >= 1e4) { const man = Math.floor(n / 1e4), chun = Math.floor((n % 1e4) / 1e3); return `${man}만${chun ? ` ${chun}천` : ''}`; }
  if (n >= 1e3) { const chun = Math.floor(n / 1e3), baek = Math.floor((n % 1e3) / 100); return `${chun}천${baek ? ` ${baek}백` : ''}`; }
  return String(n);
};
const short = n => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k' : String(Math.round(n || 0)));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const spokenName = n => { const [o, r] = n.split('/'); return `${o.replace(/[-_.]/g, ' ')}의 ${r.replace(/[-_.]/g, ' ')}`; };
const VKO = { good: '검증된 인기', mature: '성숙/유지보수', gem: '숨은 보석', hype: '하이프 주의', early: '초기/정체', bad: '참여 대비 스타 과다', doc: '학습/문서형', dead: '사실상 중단', archived: '아카이브됨', quick: '분석 대기', na: '데이터 부족' };
const VCOLOR = { good: '#3fb950', mature: '#a371f7', gem: '#a371f7', hype: '#d29922', bad: '#f85149', doc: '#39c5cf', dead: '#8b949e', archived: '#8b949e', early: '#8b949e', quick: '#8b949e', na: '#8b949e' };

// 근거 코드 -> 읽기 좋은 한국어 문장
const SAY = {
  c90hi: p => `최근 90일 커밋이 ${nk(p.n)}개`, c90lo: p => `최근 90일 커밋은 ${p.n}개뿐`, pplhi: p => `참여자가 ${nk(p.n)}명`, ppllo: p => `참여자는 ${p.n}명뿐`,
  iss: p => `이슈 해결률 ${p.p}퍼센트`, ub: p => `${nk(p.r)}개 저장소가 가져다 쓰고`, dl: p => `월 다운로드 ${nk(p.n)}회`, rel: () => `최근에 정식 버전도 냈어요`,
  norel: () => `정식 릴리스는 아직 없어요`, dead: () => `1년 넘게 업데이트가 없어요`, inactive: () => `6개월 넘게 업데이트가 없어요`, licnone: () => `라이선스가 없어서 사용에 주의가 필요해요`,
  copyleft: p => `${p.lic} 라이선스라 상업적으로 쓸 땐 확인이 필요해요`,
};
function evidence(r, sign, max = 2) {
  return (r.wc || []).filter(([s, c]) => s === sign && SAY[c] && c !== 'g7').slice(0, max).map(([, c, p]) => SAY[c](p || {}));
}
function verdictLine(r, max = 2) {
  const v = r.sc?.v, pos = evidence(r, '+', max), neg = evidence(r, '-', max);
  if (v === 'good') return `${pos.length ? pos.join(', ') + '. ' : ''}검증된 인기예요.`;
  if (v === 'hype') return `그런데 ${neg.length ? neg.join(', ') : '실사용 신호가 약해요'}. 하이프 주의예요.`;
  if (v === 'gem') return `${pos.join(', ') || '관리가 탄탄해요'}. 스타에 비해 실속 있는 숨은 보석이에요.`;
  if (v === 'mature') return `개발은 느려졌지만 ${pos.join(', ') || '실사용이 많아요'}. 성숙한 프로젝트예요.`;
  if (v === 'doc') return `코드보다는 읽는 자료에 가까운 학습형 저장소예요.`;
  if (v === 'dead') return `하지만 1년 넘게 업데이트가 없어서 사실상 멈춘 프로젝트예요.`;
  if (v === 'bad') return `그런데 스타에 비해 지켜보는 사람, 포크, 이슈 같은 참여가 같은 규모 저장소보다 크게 적어요. 참여 대비 스타 과다예요.`;
  return `${neg[0] || pos[0] || '아직 판단할 근거가 부족해요'}.`;
}
const reasonChips = r => (r.why || []).filter(w => w[0] !== '·').slice(0, 3);

// ---------------- 장면 HTML ----------------
const FONT = `"Noto Sans CJK KR","Noto Sans KR","Malgun Gothic","Apple SD Gothic Neo",sans-serif`;
function frame(W, H, body, caption) {
  const vert = H > W;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;width:${W}px;height:${H}px;overflow:hidden;font-family:${FONT};color:#e6edf3;
background:radial-gradient(circle at 80% 10%,#1f6feb40,transparent 45%),radial-gradient(circle at 10% 90%,#a371f733,transparent 45%),#0d1117}
.wrap{position:absolute;inset:0;padding:${vert ? '200px 70px 420px' : '70px 110px 0'}${vert ? ';display:flex;flex-direction:column;justify-content:center' : ''}}
.brand{${vert ? 'position:absolute;top:110px;left:70px;' : ''}}
.gauge{height:${vert ? 26 : 20}px;background:#21262d;border-radius:20px;overflow:hidden;margin:${vert ? '34px 0 6px' : '24px 0 4px'};max-width:${vert ? 940 : 780}px}.gauge i{display:block;height:100%;border-radius:20px}
.gl{font-size:${vert ? 30 : 24}px;color:#8b949e}
.brand{font-size:${vert ? 34 : 28}px;color:#8b949e;letter-spacing:1px}.brand b{color:#e6edf3}
.cap{position:absolute;left:${vert ? 50 : 160}px;right:${vert ? 50 : 160}px;bottom:${vert ? 150 : 60}px;background:#000000b3;border-radius:18px;padding:${vert ? '26px 32px' : '18px 28px'};
font-size:${vert ? 46 : 36}px;line-height:1.35;font-weight:700;text-align:center;color:#fff}
.rank{font-size:${vert ? 190 : 150}px;font-weight:900;line-height:1;color:#f78166}
.name{font-size:${vert ? 82 : 64}px;font-weight:800;word-break:break-all;line-height:1.15;margin:14px 0}
.owner{font-size:${vert ? 40 : 34}px;color:#8b949e}
.desc{font-size:${vert ? 40 : 30}px;color:#c9d1d9;line-height:1.45;margin:18px 0 28px}
.stats{display:flex;gap:18px;flex-wrap:wrap}.st{background:#161b22;border:2px solid #30363d;border-radius:20px;padding:18px 26px;font-size:${vert ? 30 : 26}px;color:#8b949e}
.st b{display:block;font-size:${vert ? 70 : 50}px;color:#e6edf3}.gain b{color:#3fb950}
.v{display:inline-block;align-self:flex-start;border:3px solid;border-radius:40px;padding:10px 30px;font-size:${vert ? 44 : 38}px;font-weight:800;margin:26px 0 18px}
.chip{font-size:${vert ? 40 : 28}px;margin:12px 0;color:#c9d1d9}.chip i{font-style:normal;font-weight:900;margin-right:10px}
.big{font-size:${vert ? 96 : 92}px;font-weight:900;line-height:1.1}.sub{font-size:${vert ? 44 : 40}px;color:#c9d1d9;margin-top:20px;line-height:1.4}
.list .it{display:flex;gap:22px;align-items:baseline;background:#161b22;border:2px solid #30363d;border-radius:18px;padding:20px 26px;margin-bottom:16px}
.list .it .n{font-size:${vert ? 46 : 40}px;font-weight:800;word-break:break-all}.list .it .m{font-size:${vert ? 30 : 26}px;color:#8b949e}
.grid{display:grid;grid-template-columns:1fr 1fr${vert ? '' : ' 1fr'};gap:16px}.cell{background:#161b22;border:2px solid #30363d;border-radius:16px;padding:16px 20px}
.cell .t{font-size:24px;color:#8b949e}.cell .n{font-size:30px;font-weight:800;word-break:break-all;margin-top:4px}
.url{font-size:${vert ? 44 : 40}px;color:#2f81f7;font-weight:800;margin-top:30px}
</style></head><body><div class="wrap">${body}</div>${caption ? `<div class="cap">${esc(caption)}</div>` : ''}</body></html>`;
}

function repoCard(r, rank, gainLabel, gain, vert) {
  const [o, n] = r.n.split('/'); const v = r.sc?.v;
  return `<div class="brand">★ <b>GitHub Star Board</b> · ${esc(gainLabel)}</div>
  <div style="display:flex;align-items:flex-end;gap:30px;margin-top:${vert ? 60 : 30}px"><div class="rank">${rank}</div><div><div class="owner">${esc(o)} /</div><div class="name">${esc(n)}</div></div></div>
  <div class="desc">${esc((r.d || '').slice(0, vert ? 140 : 180))}</div>
  <div class="stats"><div class="st gain">${esc(gainLabel)}<b>+${short(gain)}</b></div><div class="st">누적 스타<b>${short(r.s)}</b></div><div class="st">실효성<b style="color:${VCOLOR[v] || '#e6edf3'}">${r.sc?.util ?? '-'}</b></div>${r.l ? `<div class="st">언어<b style="font-size:${vert ? 40 : 36}px">${esc(r.l)}</b></div>` : ''}</div>
  <div class="gauge"><i style="width:${r.sc?.util ?? 0}%;background:${VCOLOR[v] || '#8b949e'}"></i></div><div class="gl">실효성 ${r.sc?.util ?? '-'} / 100 · 커밋·참여자·이슈·다운로드 기준</div>
  <div class="v" style="color:${VCOLOR[v]};border-color:${VCOLOR[v]}">${esc(VKO[v] || v)}</div>
  ${reasonChips(r).map(([s, t]) => `<div class="chip"><i style="color:${s === '+' ? '#3fb950' : '#f85149'}">${s === '+' ? '▲' : '▼'}</i>${esc(t)}</div>`).join('')}`;
}

// ---------------- 장면 구성 ----------------
function buildScenes(data, type, site) {
  const R = data.repos, gen = new Date(data.generatedAt), kst = new Date(gen.getTime() + 9 * 36e5);
  const md = `${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일`;
  const vert = type === 'shorts', W = vert ? 1080 : 1920, H = vert ? 1920 : 1080;
  const siteShort = (site || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const pick = (k, n) => (data.trending[k] || []).filter(x => R[x.n]?.sc).slice(0, n).map(x => ({ r: R[x.n], g: x.g }));
  const scenes = [];
  const add = (body, say, caption = say) => scenes.push({ html: frame(W, H, body, caption), say });

  if (type === 'shorts') {
    const top = pick('daily:all', 5);
    add(`<div class="brand">★ <b>GitHub Star Board</b> · ${md}</div><div style="margin-top:300px" class="big">오늘 GitHub<br>급상승 Top ${top.length}</div>
      <div class="sub">스타만 보지 말고<br><b style="color:#3fb950">진짜 쓰이는지</b>까지 확인</div>`,
      `${md} 깃허브 급상승 톱 ${top.length}. 진짜 쓰이는지까지 확인합니다.`);
    top.forEach(({ r, g }, i) => add(repoCard(r, i + 1, '오늘 증가', g, true),
      `${i + 1}위, ${spokenName(r.n)}. 하루 만에 스타 ${nk(g)}개. ${verdictLine(r, 1)}`,
      `${i + 1}위 ${r.n.split('/')[1]}: ${VKO[r.sc.v] || ''}`));
    add(`<div class="brand">★ <b>GitHub Star Board</b></div><div style="margin-top:320px" class="big">전체 순위와<br>판정 근거는</div><div class="url">${esc(siteShort)}</div>
      <div class="sub">매일 아침 자동 업데이트<br>저장소마다 근거 페이지 제공</div>`,
      `전체 순위와 근거는 설명란 링크에서 확인하세요.`, `전체 순위: ${siteShort}`);
  } else {
    const top = pick('weekly:all', 10);
    const all = Object.values(R).filter(r => r.sc);
    const hype = all.filter(r => r.sc.v === 'hype' && r.sc.g7 != null).sort((a, b) => b.sc.g7 - a.sc.g7).slice(0, 3);
    const gems = all.filter(r => r.sc.v === 'gem').sort((a, b) => b.sc.util - a.sc.util).slice(0, 3);
    add(`<div class="brand">★ <b>GitHub Star Board</b> · 주간 리포트</div><div style="margin-top:160px" class="big">이번 주 GitHub<br>스타 리포트</div>
      <div class="sub">${md} 기준 · 급상승 Top ${top.length} · 하이프 주의 · 숨은 보석</div>`,
      `${md} 기준, 이번 주 깃허브 스타 리포트입니다. 스타가 가장 많이 늘어난 저장소 ${top.length}개와, 스타만큼 실속이 있는지까지 정리했어요.`);
    top.forEach(({ r, g }, i) => add(repoCard(r, i + 1, '이번 주 증가', g, false),
      `${i + 1}위, ${spokenName(r.n)}. 이번 주 스타 ${nk(g)}개 증가. ${verdictLine(r)}`,
      `${i + 1}위 ${r.n.split('/')[1]}: ${VKO[r.sc.v] || ''}`));
    if (hype.length) add(`<div class="brand">★ <b>GitHub Star Board</b></div><div class="big" style="margin:40px 0 30px;color:#d29922">하이프 주의</div><div class="list">${hype.map(r => `<div class="it"><div class="n">${esc(r.n)}</div><div class="m">+${short(r.sc.g7)}/주 · 실효성 ${r.sc.util} · ${esc(reasonChips(r).filter(w => w[0] === '-').map(w => w[1]).join(', '))}</div></div>`).join('')}</div>`,
      `스타는 급증했는데 실사용 신호가 약한 하이프 주의 저장소도 있어요. ${hype.map(r => `${spokenName(r.n)}, ${evidence(r, '-', 1)[0] || '실사용 신호가 약해요'}`).join('. ')}.`, '스타는 급증, 실사용 신호는 약함');
    if (gems.length) add(`<div class="brand">★ <b>GitHub Star Board</b></div><div class="big" style="margin:40px 0 30px;color:#a371f7">숨은 보석</div><div class="list">${gems.map(r => `<div class="it"><div class="n">${esc(r.n)}</div><div class="m">★${short(r.s)} · 실효성 ${r.sc.util} · ${esc(reasonChips(r).filter(w => w[0] === '+').map(w => w[1]).join(', '))}</div></div>`).join('')}</div>`,
      `반대로 스타는 적지만 실속 있는 숨은 보석입니다. ${gems.map(r => `${spokenName(r.n)}, ${evidence(r, '+', 1)[0] || '관리가 탄탄해요'}`).join('. ')}.`, '스타는 적지만 실속 있는 프로젝트');
    const cats = data.categories.map(c => { const best = c.repos.map(n => R[n]).filter(r => r?.sc && r.sc.v !== 'doc').sort((a, b) => (b.sc.g7 || 0) - (a.sc.g7 || 0))[0]; return best ? { c, r: best } : null; }).filter(Boolean);
    if (cats.length) add(`<div class="brand">★ <b>GitHub Star Board</b> · 분야별 이번 주 1위</div><div class="grid" style="margin-top:40px">${cats.map(({ c, r }) => `<div class="cell"><div class="t">${esc(c.name)}</div><div class="n">${esc(r.n)}</div><div class="t">+${short(r.sc.g7 || 0)}/주 · ${esc(VKO[r.sc.v] || '')}</div></div>`).join('')}</div>`,
      `분야별로 이번 주 가장 많이 성장한 저장소도 정리했어요. ${cats.slice(0, 4).map(({ c, r }) => `${c.name.replace(/\s*\/\s*/g, ' ')} 분야는 ${spokenName(r.n)}`).join(', ')}. 나머지는 화면과 사이트에서 확인하세요.`, '분야별 이번 주 1위');
    add(`<div class="brand">★ <b>GitHub Star Board</b></div><div style="margin-top:170px" class="big">전체 순위와 근거는</div><div class="url">${esc(siteShort)}</div><div class="sub">매일 자동 업데이트 · 저장소별 근거 페이지 · AI용 데이터(llms.txt)</div>`,
      `전체 순위와 판정 근거는 설명란의 깃허브 스타 보드에서 확인하세요. 매일 업데이트되고, 저장소마다 근거 페이지가 있어요. 다음 주에 또 만나요.`, `전체 순위: ${siteShort}`);
  }
  return { scenes, W, H, md };
}

function youtubeText(data, type, site, md) {
  const R = data.repos;
  const list = (data.trending[type === 'shorts' ? 'daily:all' : 'weekly:all'] || []).filter(x => R[x.n]?.sc).slice(0, type === 'shorts' ? 5 : 10);
  const title = type === 'shorts' ? `오늘 GitHub 급상승 Top 5 (${md}) | 스타 말고 실사용으로 본 순위 #shorts` : `이번 주 GitHub 스타 리포트 (${md}) | 급상승 Top 10, 하이프 주의, 숨은 보석`;
  const lines = list.map((x, i) => `${i + 1}. ${x.n} (+${short(x.g)}, ${VKO[R[x.n].sc.v]}) ${site}r/${x.n}/`);
  return `${title}\n\n${type === 'shorts' ? '오늘' : '이번 주'} GitHub에서 스타가 가장 많이 늘어난 저장소를, 커밋/참여자/이슈 해결률/다운로드로 실제 사용 여부까지 확인했습니다.\n\n${lines.join('\n')}\n\n전체 순위와 근거: ${site}\nAI용 데이터: ${site}llms.txt\n\n#GitHub #오픈소스 #개발자 #깃허브 #AI #개발도구${type === 'shorts' ? ' #shorts' : ''}\n`;
}

// ---------------- 실행 (Node 전용) ----------------
async function main() {
  const { readFile, writeFile, mkdir, rm } = await import('node:fs/promises');
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const path = await import('node:path');
  const run = promisify(execFile);
  const { chromium } = await import('playwright');
  const arg = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : null; };
  const types = (arg('type') || 'shorts') === 'both' ? ['shorts', 'weekly'] : [arg('type') || 'shorts'];
  const OUT = path.resolve(arg('out') || 'out'), WORK = path.join(OUT, 'work');
  const data = JSON.parse(await readFile('data/latest.json', 'utf8'));
  const repoEnv = data.repo || process.env.GITHUB_REPOSITORY || '';
  const site = process.env.SITE_URL || (repoEnv ? `https://${repoEnv.split('/')[0]}.github.io/${repoEnv.split('/')[1]}/` : '');
  const day = data.generatedAt.slice(0, 10);
  await mkdir(WORK, { recursive: true });
  const browser = await chromium.launch();

  for (const type of types) {
    const { scenes, W, H, md } = buildScenes(data, type, site);
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1.5 });
    const segs = [];
    for (const [i, s] of scenes.entries()) {
      const base = path.join(WORK, `${type}-${String(i).padStart(2, '0')}`);
      await page.setContent(s.html, { waitUntil: 'load' });
      await page.waitForTimeout(150);
      await page.screenshot({ path: base + '.png' });
      // 음성 (edge-tts, 실패 시 3회 재시도 후 무음)
      let dur = 0;
      for (let a = 0; a < 3 && !dur; a++) {
        try {
          await run('edge-tts', ['--voice', VOICE, `--rate=${RATE}`, '--text', s.say, '--write-media', base + '.mp3'], { timeout: 60000 });
          const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', base + '.mp3']);
          dur = parseFloat(stdout) || 0;
        } catch (e) { console.log(`  TTS 재시도 ${a + 1}: ${e.message.split('\n')[0]}`); await new Promise(r => setTimeout(r, 3000)); }
      }
      if (!dur) { dur = Math.max(3, s.say.length / 7); await run('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', String(dur), base + '.mp3']); }
      const total = dur + 0.45, frames = Math.ceil(total * FPS);
      const vf = `scale=${W * 2}:${H * 2},zoompan=z='min(zoom+0.0004,1.05)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${W}x${H}:fps=${FPS},format=yuv420p`;
      await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', base + '.png', '-i', base + '.mp3', '-filter_complex', `[0:v]${vf}[v];[1:a]apad=pad_dur=0.45,aresample=44100[a]`,
        '-map', '[v]', '-map', '[a]', '-t', total.toFixed(2), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-r', String(FPS), '-c:a', 'aac', '-b:a', '160k', '-ac', '2', base + '.mp4'], { maxBuffer: 1 << 26 });
      segs.push(base + '.mp4');
      console.log(`[${type}] 장면 ${i + 1}/${scenes.length} (${total.toFixed(1)}s)`);
    }
    await page.close();
    const listFile = path.join(WORK, `${type}-list.txt`);
    await writeFile(listFile, segs.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));
    const outFile = path.join(OUT, `${type}-${day}.mp4`);
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', '-movflags', '+faststart', outFile]);
    await writeFile(path.join(OUT, `${type}-${day}-script.txt`), scenes.map((s, i) => `[${i + 1}] ${s.say}`).join('\n\n'));
    await writeFile(path.join(OUT, `${type}-${day}-youtube.txt`), youtubeText(data, type, site, md));
    const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', outFile]);
    console.log(`완료: ${outFile} (${parseFloat(stdout).toFixed(1)}초)`);
  }
  await browser.close();
  await rm(WORK, { recursive: true, force: true });
}

if (typeof process !== 'undefined' && /make-video\.mjs$/.test(process.argv?.[1] || '')) {
  main().catch(e => { console.error(e); process.exit(1); });
}
