// One-off directed short: DeepTutor (facts as of 2026-10-30 KST). Run on Actions: node video/films/deeptutor.mjs
// Structure (lazyowen guide 21 + 58): hook -> promise -> why -> what (shown, compared by name) -> try -> delayed verdict -> question.
import * as H from '../hf-video.mjs';
export function filmSpec(H, C) {
  const { A, f2, esc, typed, brand, pushSfx } = H;
  const F = { vert: true, W: 1080, H: 1920, capB: 360, capL: 60, capR: 170, botTop: 1120, botL: 30 };
  const wAt = (x, w) => { const i = x.text.toLowerCase().indexOf(w.toLowerCase()); return x.start + (x.dur * Math.max(0, i)) / x.text.length; };
  const IMS = { chat: [2940, 1800], quiz: [2940, 1800], overview: [2940, 1800], memory: [2506, 1606], knowledge: [2940, 1800] };
  const focus = (key, R, vw, vh) => { const [iw, ih] = IMS[key], rw = (R[2] - R[0]) * iw, rh = (R[3] - R[1]) * ih, s = Math.min(vw / rw, vh / rh);
    return '{x:' + (-R[0] * iw * s + (vw - rw * s) / 2).toFixed(1) + ',y:' + (-R[1] * ih * s + (vh - rh * s) / 2).toFixed(1) + ',scale:' + s.toFixed(4) + ",transformOrigin:'0 0'}"; };
  const win = (id, title, x, y, w, h, imgs, style = '') => '<div class="fw" id="' + id + '" style="left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;' + style + '"><div class="fwb"><i style="background:#f85149"></i><i style="background:#e3b341"></i><i style="background:#3fb950"></i><span>' + esc(title) + '</span></div><div class="fwv">' +
    imgs.map(([k, iid, op]) => '<img id="' + iid + '" src="' + C.img(k) + '" style="width:' + IMS[k][0] + 'px;height:' + IMS[k][1] + 'px;opacity:' + (op ?? 1) + '">').join('') + '</div></div>';
  const stk = (id, txt, x, y, rot, bg = '#ffc83d', size = 52, col = '#1b1f24') => '<div class="fstk" id="' + id + '" style="left:' + x + 'px;top:' + y + 'px;transform:rotate(' + rot + 'deg);background:' + bg + ';color:' + col + ';font-size:' + size + 'px">' + txt + '</div>';
  const pop = (id, t, rot = -4, snd = 'pop') => { pushSfx(t, snd); return "tl.fromTo('#" + id + "',{opacity:0,scale:.3,rotation:" + (rot - 16) + "},{opacity:1,scale:1,rotation:" + rot + ",duration:.34,ease:'back.out(2.4)'}," + f2(t) + ');'; };
  const VW = 960, WH = 640, VH = WH - 44; // main window
  const sc = [];
  // 1. HOOK: real product on frame 1, big number already on screen
  sc.push({ first: true, mood: 'wow', bot: 'corner',
    say: ["Fifty thousand stars, and it's not even a year old."], ko: ['스타 5만 개인데, 나온 지 1년도 안 됐어요.'],
    html: p => '<div class="fz">' + brand("today's pick") + win(p + 'w', 'DeepTutor · Fourier transform tutoring', 60, 210, VW, WH, [['chat', p + 'i']], 'transform:perspective(1600px) rotateX(5deg) rotate(-2.5deg)') +
      stk(p + 'g', '50k <span style="font-size:.62em">⭐</span>', 90, 770, -6, '#ffc83d', 150) + stk(p + 'y', '&lt; 1 year old', 600, 830, 5, '#f78166', 56, '#fff') +
      '<div class="fname" style="top:1000px">DeepTutor <small>by HKUDS</small></div></div>',
    anim: (p, S, D, M, F2, t) => { const x = t.sents[0]; pushSfx(S + 0.12, 'stamp');
      return "tl.set('#" + p + "i'," + focus('chat', [0.26, 0.08, 0.92, 0.72], VW, VH) + ',' + f2(S) + ');' + "tl.to('#" + p + "i'," + focus('chat', [0.44, 0.27, 0.74, 0.45], VW, VH).replace('}', ",duration:" + f2(D) + ",ease:'power1.inOut'}") + ',' + f2(S) + ');' +
        "tl.fromTo('#" + p + "g',{scale:1.25},{scale:1,duration:.3,ease:'back.out(3)'}," + f2(S + 0.05) + ');' + "tl.to('#" + p + "g',{scale:1.1,duration:.14,yoyo:true,repeat:1}," + f2(wAt(x, 'stars')) + ');' + pop(p + 'y', wAt(x, 'year') - 0.1, 5); } });
  // 2. PROMISE: three questions get checked as they are spoken
  const Q = [['why', 'Why is it blowing up?'], ['what it does', 'What does it do?'], ['whether', 'Does anyone use it?']];
  sc.push({ mood: 'think', bot: 'corner',
    say: ["Here's why DeepTutor is blowing up, what it does, and whether anyone actually uses it."], ko: ['DeepTutor가 왜 뜨는지, 뭘 하는지, 진짜 쓰이는지 볼게요.'],
    html: p => '<div class="fz">' + brand('in 40 seconds') + '<div class="fh" style="top:250px">In 40 seconds</div><div class="fchk" style="top:420px">' +
      Q.map(([, q], i) => '<div class="fq" id="' + p + 'q' + i + '"><b id="' + p + 'b' + i + '"></b><span>' + esc(q) + '</span></div>').join('') + '</div></div>',
    anim: (p, S, D, M, F2, t) => { const x = t.sents[0]; return "tl.from('#" + p + " .fh',{opacity:0,y:40,duration:.35}," + f2(S + 0.05) + ');' +
      Q.map(([w], i) => { const at = wAt(x, w); pushSfx(at + 0.15, 'check'); return "tl.from('#" + p + "q" + i + "',{opacity:0,x:120,duration:.35,ease:'power3.out'}," + f2(at - 0.2) + ");tl.to('#" + p + "b" + i + "',{backgroundColor:'#3fb950',borderColor:'#3fb950',duration:.15}," + f2(at + 0.15) + ");tl.fromTo('#" + p + "b" + i + "',{scale:1.4},{scale:1,duration:.3,ease:'back.out(3)'}," + f2(at + 0.15) + ');'; }).join(''); } });
  // 3. WHY: real release + week counter
  sc.push({ mood: 'happy', bot: 'corner',
    say: ['Version 1.7 dropped two days ago, and it picked up seven and a half thousand stars this week.'], ko: ['이틀 전에 1.7 버전이 나왔고, 이번 주에만 스타 7,500개가 붙었어요.'],
    html: p => '<div class="fz">' + brand('why it’s trending') +
      '<div class="frel" id="' + p + 'r" style="top:230px"><div class="frt"><span class="ftag">v1.7.0</span><span>Latest · Oct 28, 2026</span></div><div class="frb">Modular installation · block notebooks · narrated video lessons · more reliable tutoring</div></div>' +
      '<div class="fnum" id="' + p + 'n" style="top:620px">+<span class="num">0</span></div><div class="flbl" style="top:800px">stars this week</div></div>',
    anim: (p, S, D, M, F2, t) => { const x = t.sents[0], a1 = wAt(x, 'Version'), a2 = wAt(x, 'seven'); pushSfx(a1, 'open'); pushSfx(a2 + 1.3, 'ding');
      return "tl.from('#" + p + "r',{opacity:0,y:80,scale:.9,duration:.45,ease:'back.out(1.6)'}," + f2(a1) + ');' + "tl.from('#" + p + "n,#" + p + " .flbl',{opacity:0,y:60,duration:.35}," + f2(a2 - 0.2) + ');' +
        "tl.fromTo('#" + p + "n .num',{innerText:0},{innerText:7509,snap:{innerText:1},duration:1.3,ease:'power2.out',onUpdate:function(){}}," + f2(a2) + ');'; } });
  // 4. WHAT: compared by name, real home screen
  sc.push({ mood: 'happy', bot: 'corner',
    say: ['Think NotebookLM, but open source, running on your own machine.'], ko: ['NotebookLM 같은 건데, 오픈소스고 내 컴퓨터에서 돌아가요.'],
    html: p => '<div class="fz">' + brand('what it is') + win(p + 'w', 'localhost:3782 · DeepTutor', 60, 260, VW, WH, [['overview', p + 'i']]) +
      stk(p + 'a', '≈ NotebookLM', 70, 190, -4, '#e6edf3', 54) + stk(p + 'b', 'open source', 120, 860, -5, '#3fb950', 58, '#fff') + stk(p + 'c', '💻 your machine', 560, 930, 4, '#58a6ff', 54, '#fff') + '</div>',
    anim: (p, S, D, M, F2, t) => { const x = t.sents[0]; return "tl.set('#" + p + "i'," + focus('overview', [0.18, 0.02, 1, 0.98], VW, VH) + ',' + f2(S) + ');' + "tl.to('#" + p + "i'," + focus('overview', [0.32, 0.1, 0.92, 0.6], VW, VH).replace('}', ",duration:" + f2(D) + ",ease:'power1.inOut'}") + ',' + f2(S) + ');' +
      pop(p + 'a', wAt(x, 'NotebookLM'), -4) + pop(p + 'b', wAt(x, 'open'), -5) + pop(p + 'c', wAt(x, 'own'), 4); } });
  // 5. WHAT: your material goes in
  const IN = [['notes', '📝 your notes'], ['textbook', '📘 a textbook'], ['YouTube', '▶️ a YouTube lecture']];
  sc.push({ mood: 'happy', bot: 'corner',
    say: ['Drop in your notes, a textbook, even a YouTube lecture.'], ko: ['내 노트, 교재, 유튜브 강의까지 넣으면,'],
    html: p => '<div class="fz">' + brand('what it does') + win(p + 'w', 'Knowledge base', 60, 470, VW, 560, [['knowledge', p + 'i']]) +
      IN.map(([, l], i) => '<div class="fchip" id="' + p + 'c' + i + '" style="left:' + [60, 230, 560][i] + 'px;top:' + [230, 330, 230][i] + 'px">' + l + '</div>').join('') + '</div>',
    anim: (p, S, D, M, F2, t) => { const x = t.sents[0]; return "tl.set('#" + p + "i'," + focus('knowledge', [0.18, 0.04, 0.62, 0.42], VW, 516) + ',' + f2(S) + ');' +
      IN.map(([w], i) => { const at = wAt(x, w); pushSfx(at, 'pop'); pushSfx(at + 0.75, 'snap', 0.35); return "tl.fromTo('#" + p + "c" + i + "',{opacity:0,y:-80,scale:.6},{opacity:1,y:0,scale:1,duration:.35,ease:'back.out(2)'}," + f2(at - 0.1) + ");tl.to('#" + p + "c" + i + "',{y:" + (380 - [230, 330, 230][i]) + ",x:" + (420 - [60, 230, 560][i]) + ",scale:.3,opacity:0,duration:.45,ease:'power2.in'}," + f2(at + 0.35) + ");"; }).join('') +
      "tl.to('#" + p + "w',{scale:1.03,duration:.12,yoyo:true,repeat:5,ease:'sine.inOut'}," + f2(wAt(x, 'notes') + 0.7) + ');'; } });
  // 6. WHAT: tutors / quizzes / remembers, three cuts in one window
  const CUT = [['tutors', 'chat', [0.27, 0.08, 0.92, 0.7], 'TUTORS YOU', '#ffc83d'], ['quizzes', 'quiz', [0.38, 0.5, 0.96, 0.9], 'QUIZZES YOU', '#3fb950'], ['remembers', 'memory', [0.12, 0.08, 0.95, 0.95], 'REMEMBERS', '#a371f7']];
  sc.push({ mood: 'wow', bot: 'corner',
    say: ["And it tutors you, quizzes you, and remembers what you've learned."], ko: ['가르쳐 주고, 퀴즈를 내고, 배운 걸 기억해 줘요.'],
    html: p => '<div class="fz">' + brand('what it does') + win(p + 'w', 'DeepTutor', 60, 250, VW, 700, CUT.map(([, k], i) => [k, p + 'i' + i, i ? 0 : 1])) +
      CUT.map(([, , , l, bg], i) => stk(p + 's' + i, l, 90 + i * 40, 190, [-5, 4, -3][i], bg, 58, i === 1 ? '#fff' : '#1b1f24')).join('') + '</div>',
    anim: (p, S, D, M, F2, t) => { const x = t.sents[0]; return CUT.map(([w, k, R], i) => { const at = wAt(x, w), nx = i < 2 ? wAt(x, CUT[i + 1][0]) : S + D; pushSfx(at, i ? 'snap' : 'pop');
      return "tl.set('#" + p + "i" + i + "'," + focus(k, R, VW, 656) + ',' + f2(S) + ');' + (i ? "tl.to('#" + p + "i" + (i - 1) + "',{opacity:0,duration:.12}," + f2(at - 0.05) + ");tl.to('#" + p + "i" + i + "',{opacity:1,duration:.12}," + f2(at - 0.05) + ');' : '') +
        "tl.to('#" + p + "i" + i + "',{scale:'+=0.06',duration:" + f2(Math.max(0.5, nx - at)) + ",ease:'none'}," + f2(at) + ');' + pop(p + 's' + i, at + 0.05, [-5, 4, -3][i], 'none') + (i < 2 ? "tl.to('#" + p + "s" + i + "',{opacity:0,duration:.12}," + f2(nx - 0.1) + ');' : ''); }).join(''); } });
  // 7. TRY: three commands typed
  const CMD = ['pip install -U "deeptutor[full]"', 'deeptutor init', 'deeptutor start'];
  sc.push({ mood: 'happy', bot: 'corner', tail: 3.8,
    say: ['Setup is three commands.'], ko: ['설치는 명령어 세 줄이에요.'],
    html: p => '<div class="fz">' + brand('try it') + '<div class="fterm" style="top:330px"><div class="fwb dark"><i style="background:#f85149"></i><i style="background:#e3b341"></i><i style="background:#3fb950"></i><span>terminal</span></div><pre>' +
      CMD.map((c, i) => '<div id="' + p + 'l' + i + '"><span class="pr">$ </span><span id="' + p + 'c' + i + '">' + typed(c) + '</span></div>').join('') + '</pre></div>' +
      [0, 1, 2].map(i => stk(p + 'k' + i, (i + 1) + '/3', 880, 352 + i * 81, 6, '#ffc83d', 36)).join('') + '</div>',
    anim: (p, S, D) => { let at = S + 0.5; return "tl.from('#" + p + " .fterm',{opacity:0,y:60,duration:.4}," + f2(S + 0.05) + ');' + CMD.map((c, i) => { const d = Math.max(0.5, c.length / 24); const s0 = at; at += d + 0.35;
      return "tl.from('#" + p + "l" + i + "',{opacity:0,duration:.01}," + f2(s0) + ');' + A.type('#' + p + 'c' + i, c, s0, d).replace(/^\(|\)$/g, '') + pop(p + 'k' + i, s0 + d, 6, 'check'); }).join(''); } });
  // 8. TURN: silence before the verdict (music drops out)
  sc.push({ mood: 'skeptic', bot: 'corner', noWhoosh: true, tail: 0.7,
    say: ['Now the part I actually check. Is anyone using it?'], ko: ['이제 제가 진짜 보는 부분이에요. 누가 쓰긴 할까요?'],
    html: p => '<div class="fz">' + brand('reality check') + '<div class="fspot"></div><div class="fh" style="top:430px;font-size:96px">Is anyone<br>actually<br>using it?</div><div class="fmag" id="' + p + 'm">🔍</div></div>',
    anim: (p, S, D, M, F2, t) => { const x = t.sents[0]; return "tl.from('#" + p + " .fh',{opacity:0,scale:.9,duration:.5,ease:'power2.out'}," + f2(wAt(x, 'Is anyone') - 0.1) + ');' + "tl.fromTo('#" + p + "m',{x:-120,y:40,rotation:-20},{x:120,y:-20,rotation:10,duration:" + f2(D) + ",ease:'sine.inOut'}," + f2(S) + ');'; } });
  // 9. VERDICT: numbers one by one, then the stamp
  const ST = [['commits', '1,980', 'commits · 90 days'], ['contributors', '228', 'contributors'], ['issues', '83%', 'issues closed']];
  sc.push({ mood: 'happy', bot: 'corner',
    say: ['1,980 commits in three months. 228 contributors. 83% of issues closed.', "That's a team that ships."], ko: ['3개월 커밋 1,980개, 참여자 228명, 이슈 83% 해결.', '계속 내놓는 팀이에요.'],
    tts: ['Nineteen hundred and eighty commits in three months. Two hundred twenty-eight contributors. Eighty-three percent of issues closed.', "That's a team that ships."],
    html: p => '<div class="fz">' + brand('reality check') + ST.map(([, v, k], i) => '<div class="fstat" id="' + p + 't' + i + '" style="top:' + (230 + i * 210) + 'px"><b>' + v + '</b><span>' + k + '</span></div>').join('') +
      '<div class="fstamp" id="' + p + 'v">ACTUALLY USED</div></div>',
    anim: (p, S, D, M, F2, t) => { const x = t.sents[0], y = t.sents[1]; pushSfx(y.start - 0.05, 'stamp'); pushSfx(y.start + 0.4, 'success', 0.4);
      return ST.map(([w], i) => { const at = wAt(x, w) - 0.35; pushSfx(at + 0.1, 'check'); return "tl.from('#" + p + "t" + i + "',{opacity:0,x:-160,duration:.4,ease:'back.out(1.6)'}," + f2(at) + ');'; }).join('') +
        "tl.fromTo('#" + p + "v',{opacity:0,scale:2.6,rotation:-18},{opacity:1,scale:1,rotation:-7,duration:.42,ease:'back.out(2.2)'}," + f2(y.start - 0.15) + ');'; } });
  // 10. END CARD (signature, same every film): Starby center, the question, the board
  sc.push({ mood: 'happy', bot: 'center', botPos: { x: 360, y: -390, s: 1.55 }, noExit: true, tail: 1.6,
    say: ['Would you let an AI plan your studying? Tell me below.'], ko: ['AI한테 공부 계획 맡길 거예요? 댓글로 알려 주세요.'],
    html: p => '<div class="fz"><div class="fh" style="top:200px;font-size:78px">Would you let an AI<br>plan your studying?</div><div class="fask" id="' + p + 'a">💬 Tell me below</div>' +
      '<div class="fend" id="' + p + 'e"><div class="fl">★ GitHub Star Board</div><div class="fs">daily GitHub picks, checked for real use</div><div class="fu">' + esc(C.siteHost) + '</div></div></div>',
    anim: (p, S, D, M, F2, t) => { const x = t.sents[0]; pushSfx(wAt(x, 'Tell') , 'pop'); pushSfx(S + D - 1.3, 'levelup', 0.45);
      return "tl.from('#" + p + " .fh',{opacity:0,y:40,duration:.4}," + f2(S + 0.1) + ');' + "tl.from('#" + p + "a',{opacity:0,scale:.6,duration:.35,ease:'back.out(2)'}," + f2(wAt(x, 'Tell') - 0.05) + ');' +
        "tl.from('#" + p + "e',{opacity:0,y:60,duration:.45,ease:'power3.out'}," + f2(S + D - 1.5) + ');' + "tl.to('#sbarmL',{rotation:44,svgOrigin:'76 134',duration:.22,yoyo:true,repeat:5,ease:'sine.inOut'}," + f2(S + 0.7) + ');'; } });
  const css = '.fz{position:absolute;left:0;top:0;width:1080px;height:1920px}' +
    '.fw{position:absolute;background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 40px 120px #000c,0 0 0 2px #30363d}.fwb{height:44px;background:#eef0f3;display:flex;align-items:center;gap:9px;padding:0 18px;font-weight:700;font-size:20px;color:#57606a}.fwb i{width:13px;height:13px;border-radius:50%;display:block}.fwb span{margin-left:8px}.fwb.dark{background:#161b22;color:#8b949e}' +
    '.fwv{position:absolute;left:0;right:0;top:44px;bottom:0;overflow:hidden;background:#fff}.fwv img{position:absolute;left:0;top:0;transform-origin:0 0;max-width:none}' +
    '.fstk{position:absolute;z-index:5;font-weight:900;padding:12px 28px;border-radius:14px;box-shadow:0 10px 0 #0007,0 20px 50px #0008;white-space:nowrap;line-height:1.1}' +
    '.fname{position:absolute;left:0;right:0;text-align:center;font-size:92px;font-weight:900;letter-spacing:-1px}.fname small{display:block;font-size:36px;color:#8b949e;font-weight:700;letter-spacing:0}' +
    '.fh{position:absolute;left:60px;right:60px;text-align:center;font-size:84px;font-weight:900;line-height:1.08}' +
    '.fchk{position:absolute;left:90px;right:90px;display:flex;flex-direction:column;gap:30px}.fq{display:flex;align-items:center;gap:30px;background:#161b22ee;border:2px solid #30363d;border-radius:28px;padding:30px 36px;font-size:52px;font-weight:800}.fq b{flex:none;width:64px;height:64px;border-radius:16px;border:5px solid #8b949e;display:block}' +
    '.frel{position:absolute;left:70px;right:70px;background:#161b22;border:2px solid #30363d;border-radius:28px;padding:36px 40px;box-shadow:0 30px 80px #0009}.frt{display:flex;align-items:center;gap:22px;font-size:34px;color:#8b949e;font-weight:700}.ftag{background:#238636;color:#fff;border-radius:40px;padding:8px 26px;font-size:46px;font-weight:900}.frb{margin-top:22px;font-size:40px;line-height:1.35;font-weight:700;color:#e6edf3}' +
    '.fnum{position:absolute;left:0;right:0;text-align:center;font-size:190px;font-weight:900;color:#3fb950;line-height:1;text-shadow:0 10px 60px #3fb95066}.flbl{position:absolute;left:0;right:0;text-align:center;font-size:48px;color:#8b949e;font-weight:700}' +
    '.fchip{position:absolute;z-index:5;background:#fff;color:#1b1f24;border-radius:22px;padding:18px 28px;font-size:44px;font-weight:800;box-shadow:0 16px 40px #000a;white-space:nowrap}' +
    '.fterm{position:absolute;left:60px;right:60px;background:#0d1117;border:2px solid #30363d;border-radius:22px;overflow:hidden;box-shadow:0 30px 80px #000a}.fterm pre{text-align:left;padding:34px 34px 40px;font-family:"DejaVu Sans Mono","Noto Sans Mono CJK KR",monospace;font-size:36px;line-height:2.25;color:#e6edf3;white-space:pre-wrap}.fterm .pr{color:#3fb950}' +
    '.fspot{position:absolute;inset:0;background:radial-gradient(circle at 50% 38%,transparent 0,transparent 260px,#000b 620px)}.fmag{position:absolute;left:470px;top:860px;font-size:150px}' +
    '.fstat{position:absolute;left:90px;right:90px;display:flex;align-items:baseline;gap:30px;background:#161b22ee;border:2px solid #30363d;border-radius:28px;padding:30px 40px}.fstat b{font-size:118px;font-weight:900;line-height:1;color:#e6edf3}.fstat span{font-size:44px;color:#8b949e;font-weight:700}' +
    '.fstamp{position:absolute;left:130px;top:880px;border:9px solid #3fb950;color:#3fb950;border-radius:26px;padding:16px 40px;font-size:92px;font-weight:900;letter-spacing:2px;background:#0b0f17cc}' +
    '.fask{position:absolute;left:0;right:0;top:420px;text-align:center;font-size:50px;font-weight:800;color:#ffc83d}' +
    '.fend{position:absolute;left:60px;right:60px;top:1250px;text-align:center}.fend .fl{font-size:64px;font-weight:900}.fend .fs{font-size:36px;color:#8b949e;margin-top:8px}.fend .fu{font-size:40px;color:#58a6ff;font-weight:800;margin-top:14px}';
  return { id: 'film-deeptutor-2026-10-30', F, title: 'DeepTutor: 50k stars in under a year. Is it actually used? #shorts', scenes: sc, css,
    drops: timing => { const a = timing.scenes[7], b = timing.scenes[8]; return [[a.S - 0.15, b.S + 0.25]]; },
    credits: 'Sounds: CC0. See video/sfx/LICENSES.md. Music: "Lofi Loop Scoop" by Seth_Makes_Sounds (CC0, freesound.org/s/653510).\nScreens: HKUDS/DeepTutor README (Apache-2.0).' };
}

if (/deeptutor\.mjs$/.test(process.argv[1] || '')) {
  const base = 'https://raw.githubusercontent.com/HKUDS/DeepTutor/HEAD/assets/figs/web-dev/';
  const C = { img: k => 'assets/' + k + '.png', siteHost: 'kiddongwook.github.io/star-board' };
  const spec = filmSpec(H, C);
  spec.assets = ['chat', 'quiz', 'overview', 'memory', 'knowledge'].map(k => ({ url: base + ({ quiz: 'book-quiz', memory: 'memory-graph' }[k] || k) + '.png', name: k + '.png' }));
  spec.music = { urls: ['https://cdn.freesound.org/previews/653/653510_13228046-hq.mp3'] };
  spec.sfxUrls = { 'fs-whoosh.mp3': 'https://cdn.freesound.org/previews/60/60007_71257-hq.mp3', 'fs-pop.mp3': 'https://cdn.freesound.org/previews/244/244654_3624044-hq.mp3' };
  H.produceFilm(spec, { OUT: process.argv[2] || 'out' }).catch(e => { console.error(e); process.exit(1); });
}
