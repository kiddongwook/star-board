// Science Shorts scene templates (효과 셋팅). storyboard.json -> HyperFrames film spec.
// 엔진(hf-video 계열)의 compose/produceFilm에 넘기는 spec을 만든다. 캐릭터 없음(noHost), 네이비+오렌지.
// 템플릿: questionCard, thermometers, heatFlow, bars, skinCurves, iceMelt, answer, end
// 새 템플릿을 추가하면 rules/channel.md 표와 skills/03-design 템플릿 목록도 같이 고친다.

export const STYLE = {
  navy: '#14213d', deep: '#0b1426', orange: '#fca311', ink: '#f4f1ea', mute: '#9aa6bd', line: '#2a3b63',
  mat: { steel: ['#dfe6ee', '#8c99aa'], wood: ['#c98c55', '#8a5730'], plastic: ['#f1ece0', '#cfc6b2'] },
  safe: { top: 380, bottom: 1500 }, // 쇼츠 UI가 덮는 위·아래를 피한 핵심 영역
};

export function scienceFilm(H, plan) {
  const { f2, esc, pushSfx } = H;
  const S0 = STYLE, M = S0.mat;
  const F = { vert: true, W: 1080, H: 1920, capB: 400, capL: 70, capR: 70, bubble: false };
  const wAt = (x, w) => { if (!x) return 0; if (w == null) return x.start; const i = x.text.indexOf(String(w)); return x.start + (x.dur * Math.max(0, i)) / Math.max(1, x.text.length); };
  const cueAt = (t, w, fb = 0.2) => { for (const x of t.sents) if (w && x.text.includes(w)) return wAt(x, w); return t.S + fb; };
  const tagHtml = txt => txt ? '<div class="sx-tag">' + esc(txt) + '</div>' : '';
  const matBg = k => k === 'wood'
    ? 'repeating-linear-gradient(100deg,#0000 0 22px,#0000001a 22px 26px,#0000 26px 48px),linear-gradient(160deg,' + M.wood[0] + ',' + M.wood[1] + ')'
    : 'linear-gradient(135deg,' + (M[k] || M.steel)[0] + ' 0%,#ffffff 38%,' + (M[k] || M.steel)[1] + ' 100%)';
  const block = (id, k, label, x, y, w, h) => '<div class="sx-blk" id="' + id + '" style="left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;background:' + matBg(k) + '"></div>' +
    '<div class="sx-lbl" id="' + id + 'l" style="left:' + x + 'px;top:' + (y + h + 18) + 'px;width:' + w + 'px">' + esc(label) + '</div>';
  const chairSvg = '<svg viewBox="0 0 200 240" class="sx-ico"><defs><linearGradient id="gst" x1="0" x2="1"><stop offset="0" stop-color="#e6edf5"/><stop offset=".45" stop-color="#ffffff"/><stop offset="1" stop-color="#7f8ea3"/></linearGradient></defs>' +
    '<rect x="40" y="10" width="120" height="100" rx="14" fill="url(#gst)" stroke="#5d6b80" stroke-width="5"/><rect x="28" y="118" width="144" height="26" rx="10" fill="url(#gst)" stroke="#5d6b80" stroke-width="5"/>' +
    '<path d="M44 144 L34 232 M156 144 L166 232 M60 144 L64 210 M140 144 L136 210" stroke="#7f8ea3" stroke-width="10" stroke-linecap="round"/></svg>';
  const deskSvg = '<svg viewBox="0 0 260 200" class="sx-ico"><defs><pattern id="gwd" width="40" height="24" patternUnits="userSpaceOnUse"><rect width="40" height="24" fill="#c98c55"/><path d="M0 8 Q20 2 40 8 M0 18 Q20 12 40 18" stroke="#8a5730" stroke-width="2" fill="none" opacity=".6"/></pattern></defs>' +
    '<rect x="10" y="40" width="240" height="34" rx="8" fill="url(#gwd)" stroke="#6b4223" stroke-width="5"/><rect x="28" y="74" width="26" height="118" rx="6" fill="url(#gwd)" stroke="#6b4223" stroke-width="5"/><rect x="206" y="74" width="26" height="118" rx="6" fill="url(#gwd)" stroke="#6b4223" stroke-width="5"/></svg>';
  const pop = (sel, at, snd = 'pop') => { if (snd) pushSfx(at, snd, 0.45); return "tl.fromTo('" + sel + "',{opacity:0,scale:.5},{opacity:1,scale:1,duration:.32,ease:'back.out(2.2)'}," + f2(at) + ');'; };
  const rise = (sel, at, dy = 60) => "tl.fromTo('" + sel + "',{opacity:0,y:" + dy + "},{opacity:1,y:0,duration:.4,ease:'power3.out'}," + f2(at) + ');';

  const T = {
    // 첫 프레임에 질문과 대상이 전부 보인다 (enter 애니메이션 없음)
    questionCard: s => ({ first: true,
      html: p => '<div class="sx">' + '<div class="sx-h" style="top:400px">' + s.props.question + '</div>' +
        '<div class="sx-q2" id="' + p + 'a" style="left:120px;top:860px;height:420px">' + chairSvg + '<span>' + esc(s.props.left.label) + '</span></div>' +
        '<div class="sx-q2" id="' + p + 'b" style="left:580px;top:860px;height:420px">' + deskSvg + '<span>' + esc(s.props.right.label) + '</span></div>' +
        '<div class="sx-qm" id="' + p + 'q">?</div></div>',
      anim: (p, S, D, _M, _F, t) => "tl.to('#" + p + "q',{y:-24,duration:.5,yoyo:true,repeat:" + Math.max(1, Math.floor(D / 0.5) - 1) + ",ease:'sine.inOut'}," + f2(S) + ');' +
        "tl.to('#" + p + "a',{scale:1.06,duration:.3,yoyo:true,repeat:1}," + f2(cueAt(t, '철 의자')) + ');' + "tl.to('#" + p + "b',{scale:1.06,duration:.3,yoyo:true,repeat:1}," + f2(cueAt(t, '나무 책상')) + ');' }),

    // 두 온도계가 같은 높이로 차오른다
    thermometers: s => ({
      html: p => '<div class="sx">' + '<div class="sx-h sm" style="top:420px">온도계로 재 보면</div>' + s.props.items.map((it, i) => {
        const x = i ? 640 : 220;
        return '<div class="sx-th" style="left:' + x + 'px;top:640px"><div class="sx-tube"><i id="' + p + 'f' + i + '"></i></div><b></b></div>' +
          '<div class="sx-thv" id="' + p + 'v' + i + '" style="left:' + (x - 70) + 'px;top:1240px"><span class="num">0</span>' + esc(s.props.unit) + '</div>' +
          '<div class="sx-lbl big" style="left:' + (x - 70) + 'px;top:560px;width:220px">' + esc(it.label) + '</div>'; }).join('') +
        '<div class="sx-eq" id="' + p + 'e">=</div>' + tagHtml(s.props.tag) + '</div>',
      anim: (p, S, D, _M, _F, t) => { const a = cueAt(t, s.props.cue); pushSfx(a + 1.15, 'ding', 0.4);
        return s.props.items.map((it, i) => "tl.fromTo('#" + p + "f" + i + "',{scaleY:0},{scaleY:" + (it.value / 40).toFixed(3) + ",duration:1.1,ease:'power2.out'}," + f2(a) + ');' +
          "tl.fromTo('#" + p + "v" + i + " .num',{innerText:0},{innerText:" + it.value + ",snap:{innerText:1},duration:1.1,ease:'power2.out'}," + f2(a) + ');').join('') + pop('#' + p + 'e', a + 1.1, null); } }),

    // 손에서 물체로 열이 흐른다. 철은 굵고 빠르게, 나무는 가늘고 느리게
    heatFlow: s => ({
      html: p => { const tg = s.props.targets; let h = '<div class="sx">' + '<div class="sx-hand" id="' + p + 'h">✋<em>' + esc(s.props.source.temp) + '</em></div>';
        tg.forEach((g, i) => { const x = i ? 640 : 120; h += block(p + 'k' + i, g.kind, g.label, x, 1080, 320, 170);
          const n = g.rate === 'fast' ? 9 : 3; for (let d = 0; d < n; d++) h += '<i class="sx-dot ' + g.rate + '" id="' + p + 'd' + i + '_' + d + '"></i>';
          h += '<div class="sx-flow ' + g.rate + '" id="' + p + 'w' + i + '" style="left:' + (x + 140) + 'px"></div>'; });
        return h + '</div>'; },
      anim: (p, S, D, _M, _F, t) => { const a = cueAt(t, s.props.cue, 0.4), end = S + D; let out = rise('#' + p + 'h', S + 0.1, -40);
        s.props.targets.forEach((g, i) => { const x0 = 540, y0 = 760, x1 = (i ? 640 : 120) + 160, y1 = 1080; const fast = g.rate === 'fast', n = fast ? 9 : 3, dur = fast ? 0.55 : 1.7;
          out += pop('#' + p + 'k' + i, S + 0.25 + i * 0.15, i ? null : 'pop') + "tl.fromTo('#" + p + "w" + i + "',{scaleY:0},{scaleY:1,duration:.4}," + f2(a - 0.2) + ');';
          for (let d = 0; d < n; d++) { const st = a + (d * dur) / n, reps = Math.max(0, Math.floor((end - st) / dur) - 1);
            out += "tl.fromTo('#" + p + "d" + i + "_" + d + "',{x:" + x0 + ",y:" + y0 + ",opacity:1},{x:" + x1 + ",y:" + y1 + ",duration:" + f2(dur) + ",ease:'none',repeat:" + reps + "}," + f2(st) + ');'; }
          out += "tl.to('#" + p + "k" + i + "',{boxShadow:'0 0 0 " + (fast ? 14 : 4) + "px #fca31188',duration:.5}," + f2(a + 0.4) + ');'; });
        pushSfx(a, 'whoosh', 0.3); return out; } }),

    // 막대: 실제 비율 그대로 (나무 막대가 거의 안 보이는 것 자체가 메시지)
    bars: s => ({
      html: p => { const mx = Math.max(...s.props.items.map(i => i.value)); return '<div class="sx">' + '<div class="sx-h sm" style="top:430px">' + esc(s.props.title) + '</div>' +
        s.props.items.map((it, i) => '<div class="sx-bar" style="top:' + (720 + i * 230) + 'px"><span class="k">' + esc(it.label) + '</span><div class="t"><i id="' + p + 'b' + i + '" style="background:' + matBg(it.kind) + ';width:' + Math.max(0.8, (it.value / mx) * 100).toFixed(2) + '%"></i></div><span class="v" id="' + p + 'v' + i + '">' + esc(it.display) + '</span></div>').join('') +
        '<div class="sx-unit">단위 ' + esc(s.props.unit) + '</div><div class="sx-stamp" id="' + p + 's">' + esc(s.props.ratio) + '</div></div>'; },
      anim: (p, S, D, _M, _F, t) => { const a = cueAt(t, s.props.cue, 0.3), r = cueAt(t, s.props.ratioCue, 1.2); pushSfx(r, 'stamp', 0.5);
        return s.props.items.map((_, i) => "tl.fromTo('#" + p + "b" + i + "',{scaleX:0},{scaleX:1,transformOrigin:'0 50%',duration:.8,ease:'power2.out'}," + f2(a + i * 0.25) + ');' + rise('#' + p + 'v' + i, a + 0.6 + i * 0.25, 20)).join('') +
          "tl.fromTo('#" + p + "s',{opacity:0,scale:2.2,rotation:-16},{opacity:1,scale:1,rotation:-6,duration:.4,ease:'back.out(2)'}," + f2(r) + ');'; } }),

    // 피부 온도 곡선: 철은 급하강, 나무는 완만
    skinCurves: s => ({
      html: p => { const top = 33.5, bot = 22, Y = v => 160 + ((top - v) / (top - bot)) * 560, X0 = 140, X1 = 720;
        const path = (end, k) => { const pts = []; for (let i = 0; i <= 40; i++) { const x = i / 40, y = s.props.start - (s.props.start - end) * (1 - Math.exp(-x * (k === 'steel' ? 9 : 4))); pts.push((X0 + x * (X1 - X0)).toFixed(0) + ',' + Y(y).toFixed(0)); } return 'M' + pts.join(' L'); };
        return '<div class="sx">' + '<div class="sx-h sm" style="top:430px">' + esc(s.props.title) + '</div>' +
          '<svg class="sx-chart" viewBox="0 0 1000 800" style="top:600px"><line x1="140" y1="160" x2="140" y2="730" class="ax"/><line x1="140" y1="730" x2="920" y2="730" class="ax"/>' +
          '<text x="120" y="' + (Y(s.props.start) + 12) + '" class="yl">' + s.props.start + '°C</text><text x="900" y="780" class="xl">시간 →</text>' +
          s.props.series.map((se, i) => '<path id="' + p + 'c' + i + '" d="' + path(se.end, se.kind) + '" class="cv ' + se.kind + '"/>' +
            '<g id="' + p + 'g' + i + '"><circle cx="' + X1 + '" cy="' + Y(se.end).toFixed(0) + '" r="14" class="dt ' + se.kind + '"/><text x="' + (X1 + 30) + '" y="' + (Y(se.end) + 14).toFixed(0) + '" class="el">' + esc(se.label) + ' ' + se.end + '°</text></g>').join('') +
          '</svg>' + tagHtml(s.props.tag) + '</div>'; },
      anim: (p, S, D, _M, _F, t) => { const a = Math.min(Math.max(S + 0.3, cueAt(t, s.props.cue, 0.8) - 0.6), S + D - 2.2); // 장면 끝 전에 라벨까지 나오게
        return s.props.series.map((_, i) => "tl.fromTo('#" + p + "c" + i + "',{strokeDasharray:2000,strokeDashoffset:2000},{strokeDashoffset:0,duration:1.4,ease:'power1.inOut'}," + f2(a + i * 0.2) + ');' + pop('#' + p + 'g' + i, a + 1.4 + i * 0.2, i ? null : 'ding')).join(''); } }),

    // 얼음 녹이기 재현: 금속 쪽 얼음이 빨리 녹는다
    iceMelt: s => ({
      html: p => '<div class="sx">' + s.props.plates.map((pl, i) => { const x = i ? 600 : 100;
        return '<div class="sx-pl" style="left:' + x + 'px;top:1060px;background:' + matBg(pl.kind) + '"></div><div class="sx-lbl big" style="left:' + x + 'px;top:1150px;width:380px">' + esc(pl.label) + '</div>' +
          '<div class="sx-pud" id="' + p + 'w' + i + '" style="left:' + (x + 40) + 'px;top:1036px"></div><div class="sx-ice" id="' + p + 'i' + i + '" style="left:' + (x + 110) + 'px;top:880px"></div>'; }).join('') +
        '<div class="sx-h sm" style="top:430px">같은 온도의 두 판</div><div class="sx-clock" id="' + p + 't">⏱</div>' + tagHtml(s.props.tag) + '</div>',
      anim: (p, S, D, _M, _F, t) => { const a = cueAt(t, s.props.cue, 0.3), m = cueAt(t, s.props.meltCue, 2), T1 = S + D - 0.3; pushSfx(a, 'pop', 0.45); pushSfx(m, 'ding', 0.4);
        return s.props.plates.map((pl, i) => { const fast = pl.melt === 'fast';
          return "tl.fromTo('#" + p + "i" + i + "',{y:-300,opacity:0},{y:0,opacity:1,duration:.45,ease:'bounce.out'}," + f2(a + i * 0.12) + ');' +
            "tl.to('#" + p + "i" + i + "',{scaleY:" + (fast ? 0.18 : 0.85) + ",scaleX:" + (fast ? 1.25 : 1) + ",y:20,transformOrigin:'50% 100%',duration:" + f2(Math.max(0.8, T1 - (a + 0.6))) + ",ease:'power1.in'}," + f2(a + 0.6) + ');' +
            "tl.fromTo('#" + p + "w" + i + "',{scaleX:0},{scaleX:" + (fast ? 1 : 0.25) + ",duration:" + f2(Math.max(0.8, T1 - (a + 0.8))) + ",ease:'power1.in'}," + f2(a + 0.8) + ');'; }).join('') +
          "tl.to('#" + p + "t',{rotation:360,duration:" + f2(Math.max(1, T1 - a)) + ",ease:'none'}," + f2(a) + ');'; } }),

    // 한 문장 답 + 출처 칩
    answer: s => ({
      html: p => '<div class="sx">' + '<div class="sx-ans" id="' + p + 'a">' + s.props.text + '</div><div class="sx-src" id="' + p + 's">' + s.props.chips.map(c => '<i>' + esc(c) + '</i>').join('') + '</div></div>',
      anim: (p, S) => { pushSfx(S + 0.25, 'stamp', 0.4); return "tl.fromTo('#" + p + "a',{opacity:0,scale:.85},{opacity:1,scale:1,duration:.45,ease:'back.out(1.8)'}," + f2(S + 0.2) + ');' + "tl.from('#" + p + "s i',{opacity:0,y:20,duration:.3,stagger:.15}," + f2(S + 0.9) + ');'; } }),

    // 덤 정보 + 댓글 질문 + 시리즈명
    end: s => ({ noExit: true, tail: 1.4,
      html: p => '<div class="sx">' + '<div class="sx-h sm" style="top:420px">' + esc(s.props.head) + '</div><div class="sx-hot" id="' + p + 'r">🔥<span>' + esc(s.props.reverse.label) + '</span></div>' +
        '<div class="sx-ask" id="' + p + 'k">💬 ' + esc(s.props.ask) + '</div><div class="sx-series" id="' + p + 'e">' + esc(s.props.series) + '</div></div>',
      anim: (p, S, D, _M, _F, t) => { const k = t.sents[1] ? t.sents[1].start : S + D - 1.5; pushSfx(k, 'pop', 0.45);
        return pop('#' + p + 'r', S + 0.3) + "tl.fromTo('#" + p + "k',{opacity:0,y:40},{opacity:1,y:0,duration:.4}," + f2(k - 0.1) + ');' + rise('#' + p + 'e', S + D - 1.3, 30); } }),
  };

  const scenes = plan.scenes.map(sc => {
    const make = T[sc.template]; if (!make) throw new Error('unknown template ' + sc.template + ' in ' + sc.id);
    const base = make(sc);
    return Object.assign({ say: sc.lines.map(l => l.say), ko: sc.lines.map(l => l.say), tts: sc.lines.map(l => l.tts || l.say), sceneId: sc.id }, base);
  });

  const css = '.sx{position:absolute;left:0;top:0;width:1080px;height:1920px;word-break:keep-all;color:' + S0.ink + ';font-family:"Pretendard","Noto Sans CJK KR","Noto Sans KR",sans-serif}' +
    '.sx-h{position:absolute;left:70px;right:70px;text-align:center;font-size:104px;font-weight:900;line-height:1.12;letter-spacing:-2px}.sx-h.sm{font-size:62px;color:' + S0.ink + ';letter-spacing:-1px}.sx-h em,.sx-ans em{font-style:normal;color:' + S0.orange + '}' +
    '.sx-q2{position:absolute;width:380px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:18px}.sx-q2 .sx-ico{width:300px;height:auto;filter:drop-shadow(0 26px 40px #0008)}.sx-q2 span{font-size:52px;font-weight:800}' +
    '.sx-qm{position:absolute;left:480px;top:1240px;font-size:150px;font-weight:900;color:' + S0.orange + '}' +
    '.sx-th{position:absolute;width:80px}.sx-tube{position:relative;width:80px;height:460px;border-radius:40px;background:#ffffff14;border:6px solid #ffffff55;overflow:hidden}.sx-tube i{position:absolute;left:0;right:0;bottom:0;height:100%;background:linear-gradient(#ff6b4a,#e63946);transform-origin:50% 100%}' +
    '.sx-th b{position:absolute;left:-20px;top:430px;width:120px;height:120px;border-radius:50%;background:#e63946;border:6px solid #ffffff55}' +
    '.sx-thv{position:absolute;width:220px;text-align:center;font-size:80px;font-weight:900}.sx-eq{position:absolute;left:470px;top:1160px;font-size:140px;font-weight:900;color:' + S0.orange + '}' +
    '.sx-lbl{position:absolute;text-align:center;font-size:44px;font-weight:800;color:' + S0.ink + '}.sx-lbl.big{font-size:56px}' +
    '.sx-blk{position:absolute;border-radius:22px;box-shadow:0 30px 60px #0009}' +
    '.sx-hand{position:absolute;left:390px;top:440px;width:300px;text-align:center;font-size:150px;line-height:1}.sx-hand em{display:block;font-style:normal;font-size:46px;font-weight:900;color:' + S0.orange + ';margin-top:10px}' +
    '.sx-flow{position:absolute;top:780px;height:300px;width:0;border-left:6px dashed #fca31166;transform-origin:50% 0}' +
    '.sx-dot{position:absolute;left:-14px;top:-14px;width:28px;height:28px;border-radius:50%;background:' + S0.orange + ';box-shadow:0 0 18px #fca311;opacity:0}.sx-dot.slow{width:22px;height:22px;opacity:0}' +
    '.sx-bar{position:absolute;left:70px;right:70px;display:flex;align-items:center;gap:24px}.sx-bar .k{width:170px;font-size:52px;font-weight:900;text-align:right}.sx-bar .t{flex:1;height:110px;background:#ffffff12;border-radius:20px;overflow:hidden}.sx-bar .t i{display:block;height:100%;border-radius:20px}.sx-bar .v{width:170px;font-size:60px;font-weight:900;color:' + S0.orange + '}' +
    '.sx-unit{position:absolute;left:0;right:0;top:1200px;text-align:center;font-size:38px;color:' + S0.mute + '}' +
    '.sx-stamp{position:absolute;left:300px;top:1280px;padding:14px 46px;border:10px solid ' + S0.orange + ';border-radius:28px;color:' + S0.orange + ';font-size:100px;font-weight:900;background:#14213dcc}' +
    '.sx-chart{position:absolute;left:40px;width:1000px;height:800px}.sx-chart .ax{stroke:#ffffff55;stroke-width:5}.sx-chart .yl{fill:' + S0.mute + ';font-size:36px;text-anchor:end;font-weight:700}.sx-chart .xl{fill:' + S0.mute + ';font-size:34px;text-anchor:end}' +
    '.sx-chart .cv{fill:none;stroke-width:14;stroke-linecap:round}.sx-chart .cv.steel{stroke:#c9d4e2}.sx-chart .cv.wood{stroke:#d9935a}.sx-chart .dt.steel{fill:#c9d4e2}.sx-chart .dt.wood{fill:#d9935a}.sx-chart .el{fill:' + S0.ink + ';font-size:40px;font-weight:900}' +
    '.sx-pl{position:absolute;width:380px;height:70px;border-radius:16px;box-shadow:0 30px 50px #0009}' +
    '.sx-ice{position:absolute;width:160px;height:160px;border-radius:26px;background:linear-gradient(135deg,#ffffffee,#bfe9ffb0 50%,#8fd3ff90);border:4px solid #ffffffcc;box-shadow:inset 0 0 30px #ffffff,0 10px 30px #8fd3ff55}' +
    '.sx-pud{position:absolute;width:300px;height:30px;border-radius:50%;background:radial-gradient(closest-side,#8fd3ffcc,#8fd3ff33);transform-origin:50% 50%}' +
    '.sx-clock{position:absolute;left:470px;top:640px;font-size:120px}' +
    '.sx-ans{position:absolute;left:60px;right:60px;top:640px;text-align:center;font-size:110px;font-weight:900;line-height:1.15;letter-spacing:-2px}' +
    '.sx-src{position:absolute;left:80px;right:80px;top:1120px;display:flex;flex-wrap:wrap;gap:16px;justify-content:center}.sx-src i{font-style:normal;font-size:32px;font-weight:700;color:' + S0.mute + ';border:3px solid ' + S0.line + ';border-radius:40px;padding:8px 22px}' +
    '.sx-hot{position:absolute;left:0;right:0;top:600px;text-align:center;font-size:160px}.sx-hot span{display:block;font-size:64px;font-weight:900;color:' + S0.orange + '}' +
    '.sx-ask{position:absolute;left:0;right:0;top:1060px;text-align:center;font-size:60px;font-weight:900}.sx-series{position:absolute;left:0;right:0;top:1260px;text-align:center;font-size:40px;font-weight:800;color:' + S0.mute + ';letter-spacing:2px}' +
    '.sx-tag{position:absolute;right:70px;top:400px;font-size:30px;font-weight:800;color:' + S0.mute + ';border:3px solid ' + S0.line + ';border-radius:30px;padding:4px 18px}' +
    '.cap span{background:#0b1426e8;border:3px solid #fca31155;color:#fff;font-weight:800;word-break:keep-all}';
  const bgHtml = '<div style="position:absolute;inset:0;background:radial-gradient(120% 80% at 50% 30%,' + S0.navy + ' 0%,' + S0.deep + ' 70%)"></div>' +
    '<div style="position:absolute;inset:0;opacity:.07;background-image:linear-gradient(#fff 2px,transparent 2px),linear-gradient(90deg,#fff 2px,transparent 2px);background-size:90px 90px"></div>';
  return { id: 'science-' + plan.episode + '-v' + plan.version, F, bgHtml, sprites: null, noHost: true, lang: 'ko', title: plan.titles?.[0] || plan.episode, scenes, css, credits: plan.credits || '' };
}
