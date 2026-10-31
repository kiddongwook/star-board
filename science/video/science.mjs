// Science Shorts 장면 템플릿 v2 (모션 그래픽). storyboard.json -> 렌더 엔진(engine.mjs)용 spec.
// 모션 원칙은 rules/channel.md "모션" 절 (HyperFrames 공식 motion/explainer/vertical 가이드 기준):
//   - 도착은 길게 감속(expo.out), 퇴장은 짧게 가속. 같은 power2.out을 모든 곳에 쓰지 않는다
//   - 설명 요소는 내레이션이 그 단어를 말할 때 나타난다 (cue). 완성된 도식을 한 번에 띄우지 않는다
//   - 자리 잡은 제목은 정지. 움직임은 카메라(펀치인), 데이터(카운트업, 입자, 곡선)로 옮긴다
//   - 둥둥 떠다니기·숨쉬기 반복, 모든 장면 같은 등장, 페이드+슬라이드업 남발 금지
//   - 장면 전환은 화면 속 원인이 있게: whip, rise, blur, iris(물체에서 열림), flood(배경색이 바뀜)
// 화면 영역: 내용 y 250~1150, 자막 1180~1330, 오른쪽 아이콘 줄(x>960, y>900)에는 글자 금지.
// 새 템플릿을 추가하면 rules/channel.md 표와 skills/03-design 템플릿 목록도 같이 고친다.

export const STYLE = {
  navy: '#14213d', deep: '#0b1426', orange: '#fca311', ink: '#f4f1ea', mute: '#9aa6bd', line: '#2a3b63', cold: '#7fd3ff', warm: '#ff7a45',
  mat: { steel: ['#dfe6ee', '#8c99aa'], wood: ['#c98c55', '#8a5730'], plastic: ['#f1ece0', '#cfc6b2'] },
  band: { top: 250, bottom: 1150, capTop: 1180, capBottom: 1330, railX: 960, railY: 900 },
};

export function scienceFilm(H, plan) {
  const { f2, esc, pushSfx } = H;
  const S0 = STYLE, M = S0.mat;
  const F = { vert: true, W: 1080, H: 1920, capB: 590, capL: 70, capR: 130 };
  const wAt = (x, w) => { if (!x) return 0; if (w == null) return x.start; const i = x.text.indexOf(String(w)); return x.start + (x.dur * Math.max(0, i)) / Math.max(1, x.text.length); };
  const cueAt = (t, w, fb = 0.2) => { for (const x of t.sents) if (w && x.text.includes(w)) return wAt(x, w); return t.S + fb; };
  const has = (t, w) => !!w && t.sents.some(x => x.text.includes(w));
  const tagHtml = txt => txt ? `<div class="sx-tag">${esc(txt)}</div>` : '';
  const matBg = k => k === 'wood'
    ? `repeating-linear-gradient(100deg,#0000 0 22px,#0000001a 22px 26px,#0000 26px 48px),linear-gradient(160deg,${M.wood[0]},${M.wood[1]})`
    : `linear-gradient(135deg,${(M[k] || M.steel)[0]} 0%,#ffffff 38%,${(M[k] || M.steel)[1]} 100%)`;

  // ---------------- 모션 킷 ----------------
  // 글자를 단어 단위 span으로 (<br>, <em> 유지)
  const words = (html, cls = 'tw') => { let em = false; const out = [];
    for (const tok of String(html).split(/(<br>|<em>|<\/em>|\s+)/)) { if (!tok) continue;
      if (tok === '<br>') out.push('<br>'); else if (tok === '<em>') em = true; else if (tok === '</em>') em = false;
      else if (/^\s+$/.test(tok)) out.push(' '); else out.push(`<span class="${cls}${em ? ' em' : ''}">${esc(tok)}</span>`); }
    return out.join(''); };
  const blurIn = (sel, at, st = 0.067) => `tl.fromTo('${sel}',{opacity:0,filter:'blur(6px)'},{opacity:1,filter:'blur(0px)',duration:.16,stagger:${st},ease:'power2.out'},${f2(at)});`;
  const blurOut = (sel, at) => `tl.to('${sel}',{opacity:0,filter:'blur(8px)',duration:.18,ease:'power2.in'},${f2(at)});`;
  const inkIn = (sel, at, col, st = 0.09) => `tl.fromTo('${sel}',{color:'#56627c'},{color:'${col}',duration:.22,stagger:${st},ease:'power1.out'},${f2(at)});`;
  const pop = (sel, at, snd = 'pop', vol = 0.45) => { if (snd) pushSfx(at, snd, vol); return `tl.fromTo('${sel}',{opacity:0,scale:.6},{opacity:1,scale:1,duration:.45,ease:'back.out(1.6)'},${f2(at)});`; };
  const land = (sel, at, dy = -60) => `tl.fromTo('${sel}',{opacity:0,y:${dy},filter:'blur(6px)'},{opacity:1,y:0,filter:'blur(0px)',duration:.55,ease:'expo.out'},${f2(at)});`;
  // 번쩍이는 링: to+keyframes라서 같은 요소에 여러 번 써도 시작 전 상태(투명)가 유지된다 (fromTo 반복은 lint 경고)
  const flash = (sel, at, peak = 0.85, s0 = 0.45, s1 = 1.7, dur = 1) => `tl.to('${sel}',{keyframes:[{opacity:${peak},scale:${s0},duration:.02},{opacity:0,scale:${s1},duration:${dur},ease:'expo.out'}]},${f2(at)});`;
  const draw = (sel, at, dur = 0.6, ease = 'power2.inOut') => `tl.fromTo('${sel}',{strokeDasharray:2400,strokeDashoffset:2400},{strokeDashoffset:0,duration:${f2(dur)},ease:'${ease}'},${f2(at)});`;
  // 카메라: 장면 전체를 감싼 #pcam의 scale/x/y. 원점은 (540,700)
  const punch = (p, at, s, x = 0, y = 0, d = 0.6) => `tl.to('#${p}cam',{scale:${s},x:${x},y:${y},duration:${f2(d)},ease:'power2.inOut'},${f2(at)});`;
  const shake = (p, at) => `tl.to('#${p}st',{keyframes:[{x:12,duration:.035},{x:-9,duration:.035},{x:5,duration:.035},{x:0,duration:.06}]},${f2(at)});`;
  // 숫자 카운트업 (시점에 따라 값이 정해지므로 어느 프레임으로 seek해도 같은 값)
  const count = (id, from, to, dec, at, dur, pre = '', suf = '') =>
    `(()=>{const o={v:${from}},el=document.getElementById('${id}');tl.to(o,{v:${to},duration:${f2(dur)},ease:'power2.out',onUpdate:()=>{el.textContent='${pre}'+o.v.toFixed(${dec})+'${suf}'}},${f2(at)});})();`;
  // 입자 흐름: n개 점이 from->to로 period마다 반복 (반복 횟수 유한, 시작 전·끝난 뒤 투명)
  const stream = (p, key, [x0, y0], [x1, y1], n, period, start, end, cls = '') => {
    let html = '', a = '';
    for (let k = 0; k < n; k++) { const id = p + key + k, st = start + (k * period) / n, reps = Math.floor((end - st) / period) - 1;
      html += `<i class="pt ${cls}" id="${id}"></i>`; if (reps < 0) continue;
      a += `tl.fromTo('#${id}',{x:${x0},y:${y0}},{x:${x1},y:${y1},duration:${f2(period)},ease:'none',repeat:${reps}},${f2(st)});` +
        `tl.fromTo('#${id}',{opacity:0},{opacity:1,duration:${f2(period / 2)},ease:'sine.inOut',yoyo:true,repeat:${2 * reps + 1}},${f2(st)});`; }
    return { html, a }; };

  const chairSvg = '<svg viewBox="0 0 200 240" class="sx-ico"><defs><linearGradient id="gst" x1="0" x2="1"><stop offset="0" stop-color="#e6edf5"/><stop offset=".45" stop-color="#ffffff"/><stop offset="1" stop-color="#7f8ea3"/></linearGradient></defs>' +
    '<rect x="40" y="10" width="120" height="100" rx="14" fill="url(#gst)" stroke="#5d6b80" stroke-width="5"/><rect x="28" y="118" width="144" height="26" rx="10" fill="url(#gst)" stroke="#5d6b80" stroke-width="5"/>' +
    '<path d="M44 144 L34 232 M156 144 L166 232 M60 144 L64 210 M140 144 L136 210" stroke="#7f8ea3" stroke-width="10" stroke-linecap="round"/></svg>';
  const deskSvg = '<svg viewBox="0 0 260 200" class="sx-ico"><defs><pattern id="gwd" width="40" height="24" patternUnits="userSpaceOnUse"><rect width="40" height="24" fill="#c98c55"/><path d="M0 8 Q20 2 40 8 M0 18 Q20 12 40 18" stroke="#8a5730" stroke-width="2" fill="none" opacity=".6"/></pattern></defs>' +
    '<rect x="10" y="40" width="240" height="34" rx="8" fill="url(#gwd)" stroke="#6b4223" stroke-width="5"/><rect x="28" y="74" width="26" height="118" rx="6" fill="url(#gwd)" stroke="#6b4223" stroke-width="5"/><rect x="206" y="74" width="26" height="118" rx="6" fill="url(#gwd)" stroke="#6b4223" stroke-width="5"/></svg>';
  const block = (id, k, label, x, y, w, h) => `<div class="sx-blk" id="${id}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:${matBg(k)}"></div>` +
    `<div class="sx-lbl" id="${id}l" style="left:${x}px;top:${y + h + 18}px;width:${w}px">${esc(label)}</div>`;

  const T = {
    // 훅: 첫 프레임에 질문과 두 대상이 전부 보인다. 카메라가 철 의자 -> 나무 책상 -> 차가운 철 의자로 옮겨 간다
    questionCard: s => ({ first: true,
      html: p => {
        let sp = ''; const SP = [[150, 610], [430, 640], [120, 820], [460, 860], [210, 560], [380, 990], [95, 950]];
        SP.forEach(([x, y], k) => { sp += `<i class="sx-spark" id="${p}sp${k}" style="left:${x}px;top:${y}px">✦</i>`; });
        return `<div class="sx-h" style="top:290px">${words(s.props.question)}</div>` +
          `<div class="sx-aura" id="${p}au" style="left:40px;top:560px"></div>` +
          `<svg class="sx-cold" id="${p}cw" viewBox="0 0 300 170" style="left:140px;top:500px"><path d="M60 160 C40 120 80 100 60 60 S70 10 60 0"/><path d="M150 165 C130 125 170 105 150 65 S160 15 150 5"/><path d="M240 160 C220 120 260 100 240 60 S250 10 240 0"/></svg>` +
          `<div class="sx-q2" id="${p}a" style="left:100px;top:640px;height:420px">${chairSvg}<span>${esc(s.props.left.label)}</span></div>` +
          `<div class="sx-q2" id="${p}b" style="left:600px;top:640px;height:420px">${deskSvg}<span>${esc(s.props.right.label)}</span></div>` +
          `<div class="sx-qm" id="${p}q">?</div>` + sp; },
      anim: (p, S, D, _M, _F, t) => { let a = '';
        const c1 = cueAt(t, s.props.left.label, 0.4), c2 = cueAt(t, s.props.right.label, 1.6), q = t.sents[1] ? t.sents[1].start : S + D * 0.5, cold = has(t, '차갑') ? cueAt(t, '차갑') : q + 0.6;
        a += punch(p, c1 - 0.15, 1.06, 80, 0, 0.55) + punch(p, c2 - 0.15, 1.06, -80, 0, 0.6);
        a += `tl.fromTo('#${p}q',{scale:1},{scale:1.35,duration:.18,yoyo:true,repeat:1,ease:'power2.out'},${f2(q)});`; pushSfx(q, 'pop', 0.35);
        a += punch(p, cold - 0.35, 1.08, 90, -10, 0.7);
        a += `tl.fromTo('#${p}au',{opacity:0,scale:.6},{opacity:1,scale:1,duration:.7,ease:'expo.out'},${f2(cold)});`;
        a += draw(`#${p}cw path`, cold + 0.1, 0.9, 'power1.out').replace(`},${f2(cold + 0.1)});`, `,stagger:.15},${f2(cold + 0.1)});`);
        a += `tl.fromTo('#${p}sp0,#${p}sp1,#${p}sp2,#${p}sp3,#${p}sp4,#${p}sp5,#${p}sp6',{opacity:0,scale:.3},{opacity:1,scale:1,duration:.3,yoyo:true,repeat:3,stagger:.11,ease:'sine.inOut'},${f2(cold + 0.15)});`;
        pushSfx(cold, 'shimmer', 0.4);
        return a; } }),

    // 두 온도계가 같은 높이로 차오르고 숫자가 같이 올라간다
    thermometers: s => ({ trans: 'whip',
      html: p => s.props.items.map((it, i) => { const xc = i ? 750 : 330;
        return `<div class="sx-lbl big" style="left:${xc - 150}px;top:320px;width:300px">${esc(it.label)}</div>` +
          `<div class="sx-th" style="left:${xc - 40}px;top:420px"><div class="sx-tube"><i id="${p}f${i}"></i></div><b id="${p}bb${i}"></b></div>` +
          `<div class="sx-thv" id="${p}v${i}" style="left:${xc - 130}px;top:1010px">0${esc(s.props.unit)}</div>`; }).join('') +
        `<div class="sx-eq" id="${p}e">=</div>` + tagHtml(s.props.tag),
      anim: (p, S, D, _M, _F, t) => { const a = Math.max(S + 0.35, cueAt(t, s.props.cue) - 0.2); let o = '';
        s.props.items.forEach((it, i) => { const at = a + i * 0.12;
          o += `tl.fromTo('#${p}f${i}',{scaleY:0},{scaleY:${(it.value / 40).toFixed(3)},duration:1.2,ease:'expo.out'},${f2(at)});` + count(`${p}v${i}`, 0, it.value, 0, at, 1.2, '', s.props.unit);
          pushSfx(at, 'tick', 0.3); });
        o += `tl.fromTo('#${p}e',{opacity:0,scale:2.2},{opacity:1,scale:1,duration:.4,ease:'back.out(2)'},${f2(a + 1.25)});`; pushSfx(a + 1.3, 'ding', 0.4);
        if (has(t, '그대로')) o += punch(p, cueAt(t, '그대로') - 0.1, 1.05, 0, -30, 0.5);
        return o; } }),

    // 손이 내려오고, 손에서 두 물체로 열 입자가 흐른다. 철 쪽은 촘촘하고 빠르게, 나무 쪽은 드문드문 느리게
    heatFlow: s => {
      const tg = s.props.targets, xs = [100, 600], W = 340, BY = 820;
      const mk = (p, t) => { const a = Math.max(t.S + 0.6, cueAt(t, s.props.cue, 1)), end = t.S + t.D - 0.15;
        return tg.map((g, i) => { const fast = g.rate === 'fast'; return stream(p, 'd' + i, [540, 540], [xs[i] + W / 2, BY + 20], fast ? 12 : 4, fast ? 0.7 : 1.7, a, end, fast ? 'fast' : 'slow'); }); };
      let cache = null;
      return { trans: 'blur',
        html: (p, _F, t) => { cache = mk(p, t);
          return `<div class="sx-glow" id="${p}g"></div><div class="sx-hand" id="${p}h">✋<em id="${p}t">${esc(s.props.source.temp)}</em></div>` +
            `<svg class="sx-guide" viewBox="0 0 1080 1920"><path id="${p}l0" d="M540 540 L${xs[0] + W / 2} ${BY}"/><path id="${p}l1" d="M540 540 L${xs[1] + W / 2} ${BY}"/></svg>` +
            tg.map((g, i) => block(p + 'k' + i, g.kind, g.label, xs[i], BY, W, 150) +
              `<div class="sx-rate ${g.rate}" id="${p}r${i}" style="left:${xs[i]}px;top:1050px;width:${W}px">${g.rate === 'fast' ? '열이 빠르게 ▶▶▶' : '열이 천천히 ▶'}</div>`).join('') +
            cache.map(c => c.html).join(''); },
        anim: (p, S, D, _M, _F, t) => { let o = land(`#${p}h`, S + 0.15, -120);
          const c34 = has(t, '34') ? cueAt(t, '34') : S + 1;
          // 카메라가 손에서 시작해 "34도"에서 물체까지 보이도록 물러난다
          if (c34 - S > 1.2) o += punch(p, S + 0.45, 1.12, 0, 60, 0.7) + punch(p, c34 - 0.2, 1, 0, 0, 0.6);
          if (has(t, '손에서')) { const cs = cueAt(t, '손에서'); o += flash(`#${p}g`, cs, 0.8, 0.5, 1.6, 1.1); }
          o += `tl.fromTo('#${p}t',{scale:1,color:'${S0.orange}'},{scale:1.3,duration:.2,yoyo:true,repeat:1,ease:'power2.out'},${f2(c34)});`;
          o += flash(`#${p}g`, c34, 0.9, 0.4, 1.8, 1); pushSfx(c34, 'pop', 0.35);
          const a = Math.max(S + 0.6, cueAt(t, s.props.cue, 1));
          o += draw(`#${p}l0`, a - 0.35, 0.35, 'power2.out') + draw(`#${p}l1`, a - 0.25, 0.35, 'power2.out'); pushSfx(a - 0.3, 'whoosh', 0.25);
          o += (cache || mk(p, t)).map(c => c.a).join('');
          o += pop(`#${p}r0`, a + 0.8, 'pop', 0.3) + pop(`#${p}r1`, a + 1.1, null);
          return o; } }; },

    // 막대: 실제 비율 그대로. 카메라가 거의 안 보이는 나무 막대로 다가갔다가, 도장이 찍힌다
    bars: s => ({ trans: 'rise',
      html: p => { const mx = Math.max(...s.props.items.map(i => i.value));
        return `<div class="sx-h sm" style="top:290px">${words(esc(s.props.title))}</div>` +
          s.props.items.map((it, i) => `<div class="sx-bar" style="top:${450 + i * 200}px"><span class="k">${esc(it.label)}</span><div class="t"><i id="${p}b${i}" style="background:${matBg(it.kind)};width:${Math.max(0.8, (it.value / mx) * 100).toFixed(2)}%"></i></div><span class="v" id="${p}v${i}">0</span></div>`).join('') +
          `<div class="sx-unit">단위 ${esc(s.props.unit)}</div><div class="sx-stamp" id="${p}s">${esc(s.props.ratio)}</div>`; },
      anim: (p, S, D, _M, _F, t) => { const r = cueAt(t, s.props.ratioCue, 1.4); let o = '';
        s.props.items.forEach((it, i) => { const at = i === 0 ? S + 0.35 : Math.max(S + 0.6, has(t, it.label) ? cueAt(t, it.label) : S + 0.6);
          const dec = String(it.display).includes('.') ? String(it.display).split('.')[1].length : 0;
          o += `tl.fromTo('#${p}b${i}',{scaleX:0},{scaleX:1,transformOrigin:'0 50%',duration:.9,ease:'expo.out'},${f2(at)});` + count(`${p}v${i}`, 0, it.value, dec, at, 0.9);
          pushSfx(at, 'tick', 0.3);
          if (i === 1 && r - at > 1.0) o += punch(p, at + 0.15, 1.25, 300, -40, 0.5) + punch(p, r - 0.35, 1, 0, 0, 0.35); });
        const num = parseFloat(String(s.props.ratio).replace(/[^\d.]/g, '')) || 0;
        o += `tl.fromTo('#${p}s',{opacity:0,scale:2.2,rotation:-16},{opacity:1,scale:1,rotation:-6,duration:.4,ease:'back.out(2)'},${f2(r)});`;
        if (num) o += count(`${p}s`, 0, num, 0, r, 0.45, String(s.props.ratio).split(/\d/)[0], String(s.props.ratio).replace(/^.*\d/, ''));
        o += shake(p, r + 0.38); pushSfx(r + 0.35, 'stamp', 0.5);
        return o; } }),

    // 통념을 지우고(취소선) 진짜 답을 쓴 뒤, 피부 온도 곡선이 그려진다. 곡선 끝의 점이 온도를 세며 내려간다
    skinCurves: s => {
      const top = 33.5, bot = 22, Y = v => 120 + ((top - v) / (top - bot)) * 480, X0 = 140, X1 = 700, K = { steel: 9, wood: 4 };
      const val = (u, end, k) => s.props.start - (s.props.start - end) * (1 - Math.exp(-u * k)) / (1 - Math.exp(-k));
      const pts = (end, k) => Array.from({ length: 41 }, (_, i) => [X0 + (i / 40) * (X1 - X0), Y(val(i / 40, end, k))]);
      return { trans: 'whip',
        html: p => `${s.props.myth ? `<div class="sx-myth" id="${p}m">${s.props.lead ? `<b>${words(esc(s.props.lead))}</b>` : ''}<span>${words(esc(s.props.myth))}<i id="${p}x"></i></span></div>` : ''}` +
          `<div class="sx-h sm" id="${p}tr" style="top:270px">${words(s.props.truth || esc(s.props.title))}</div>` +
          `<svg class="sx-chart" id="${p}ch" viewBox="0 0 1000 700" style="top:440px"><line x1="140" y1="100" x2="140" y2="620" class="ax" id="${p}ay"/><line x1="140" y1="620" x2="920" y2="620" class="ax" id="${p}ax"/>` +
          `<text x="150" y="70" class="yl2">${esc(s.props.title)}</text><text x="120" y="${(Y(s.props.start) + 12).toFixed(0)}" class="yl">${s.props.start}°C</text><text x="920" y="670" class="xl">시간 →</text>` +
          s.props.series.map((se, i) => `<path id="${p}c${i}" d="M${pts(se.end, K[se.kind] || 5).map(q => q[0].toFixed(0) + ',' + q[1].toFixed(0)).join(' L')}" class="cv ${se.kind}"/>` +
            `<circle id="${p}dt${i}" cx="${X0}" cy="${Y(s.props.start).toFixed(0)}" r="16" class="dt ${se.kind}"/><text id="${p}tx${i}" x="${X0 + 28}" y="${(Y(s.props.start) + 14 + (se.kind === 'wood' ? -30 : 44)).toFixed(0)}" class="el" opacity="0">${esc(se.label)} ${s.props.start}°</text>`).join('') +
          `</svg>` + tagHtml(s.props.tag),
        anim: (p, S, D, _M, _F, t) => { let o = '';
          const s2 = t.sents[1] ? t.sents[1].start : S + D * 0.45;
          if (s.props.myth) { const no = has(t, '아니에요') ? cueAt(t, '아니에요') : S + 1.2;
            o += `tl.set('#${p}tr .tw',{opacity:0},${f2(S)});`;
            // 내레이션을 따라: "피부가 느끼는 건" -> "물체의 온도" -> (아니에요) 취소선
            if (s.props.lead) o += blurIn(`#${p}m b .tw`, S + 0.3);
            const myAt = has(t, String(s.props.myth).split(' ')[0]) ? cueAt(t, String(s.props.myth).split(' ')[0]) - 0.1 : S + 0.6;
            o += `tl.fromTo('#${p}m span .tw',{opacity:0,scale:1.25,filter:'blur(8px)'},{opacity:1,scale:1,filter:'blur(0px)',duration:.4,stagger:.08,ease:'expo.out'},${f2(myAt)});`; pushSfx(myAt, 'pop', 0.3);
            o += `tl.fromTo('#${p}x',{scaleX:0},{scaleX:1,transformOrigin:'0 50%',duration:.3,ease:'power3.out'},${f2(no)});` +
              `tl.to('#${p}m span',{color:'#56627c',duration:.3},${f2(no + 0.1)});`; pushSfx(no, 'thud', 0.45);
            o += blurOut(`#${p}m`, s2 - 0.2); }
          o += blurIn(`#${p}tr .tw`, s2) + `tl.fromTo('#${p}tr .em',{color:'${S0.ink}'},{color:'${S0.orange}',duration:.25},${f2(s2 + 0.5)});`;
          o += `tl.fromTo('#${p}ch',{opacity:0},{opacity:1,duration:.25},${f2(s2 - 0.1)});` + draw(`#${p}ay`, s2, 0.3, 'power2.out') + draw(`#${p}ax`, s2 + 0.1, 0.35, 'power2.out');
          const a = Math.min(Math.max(s2 + 0.35, cueAt(t, s.props.cue, 0.8) - 0.9), S + D - 2.4), dur = 1.6;
          s.props.series.forEach((se, i) => { const k = K[se.kind] || 5, ps = pts(se.end, k), at = a + i * 0.15, step = dur / (ps.length - 1);
            o += draw(`#${p}c${i}`, at, dur, 'none') + `tl.fromTo('#${p}tx${i}',{opacity:0},{opacity:1,duration:.2},${f2(at)});`;
            o += `tl.to('#${p}dt${i}',{keyframes:${JSON.stringify(ps.slice(1).map(q => ({ attr: { cx: +q[0].toFixed(1), cy: +q[1].toFixed(1) }, duration: +step.toFixed(4), ease: 'none' })))}},${f2(at)});`;
            o += `tl.to('#${p}tx${i}',{keyframes:${JSON.stringify(ps.slice(1).map(q => ({ attr: { x: +(q[0] + 28).toFixed(1), y: +(q[1] + 14 + (se.kind === 'wood' ? -30 : 44)).toFixed(1) }, duration: +step.toFixed(4), ease: 'none' })))}},${f2(at)});`;
            o += `(()=>{const o={u:0},el=document.getElementById('${p}tx${i}');tl.to(o,{u:1,duration:${f2(dur)},ease:'none',onUpdate:()=>{el.textContent=${JSON.stringify(se.label + ' ')}+(${s.props.start}-(${s.props.start}-${se.end})*(1-Math.exp(-o.u*${k}))/(1-Math.exp(-${k}))).toFixed(1)+'°'}},${f2(at)});})();`;
            pushSfx(at + dur, i ? 'pop' : 'ding', 0.35); });
          return o; } }; },

    // 얼음 실험 재현: 두 얼음이 떨어져 착지(찌그러짐 후 복원)하고, 금속 쪽이 물방울을 떨구며 빨리 녹는다
    iceMelt: s => {
      const xs = [90, 560];
      let cache = null;
      const mk = (p, t) => { const m = cueAt(t, s.props.meltCue, 2), T1 = t.S + t.D - 0.2, a = cueAt(t, s.props.cue, 0.3);
        return s.props.plates.map((pl, i) => pl.melt === 'fast' ? [stream(p, 'dl' + i, [xs[i] + 30, 905], [xs[i] + 10, 1060], 3, 0.8, a + 1.0, T1, 'drop'), stream(p, 'dr' + i, [xs[i] + 350, 905], [xs[i] + 370, 1060], 3, 0.9, a + 1.3, T1, 'drop')] : []).flat(); };
      return { trans: 'blur',
        html: (p, _F, t) => { cache = mk(p, t);
          return s.props.plates.map((pl, i) => { const x = xs[i];
            return `<div class="sx-pud" id="${p}w${i}" style="left:${x + 40}px;top:826px"></div><div class="sx-pl" style="left:${x}px;top:840px;background:${matBg(pl.kind)}"></div><div class="sx-lbl big" style="left:${x}px;top:935px;width:380px">${esc(pl.label)}</div>` +
              `<div class="sx-ice" id="${p}i${i}" style="left:${x + 110}px;top:680px"></div>`; }).join('') +
            `<div class="sx-h sm" id="${p}hd" style="top:290px">${words('같은 온도의 두 판')}</div>` +
            `<svg class="sx-clock" viewBox="0 0 120 120"><circle cx="60" cy="64" r="48"/><rect x="52" y="4" width="16" height="10" rx="3"/><line id="${p}hand" x1="60" y1="64" x2="60" y2="26"/></svg>` +
            cache.map(c => c.html).join('') + tagHtml(s.props.tag); },
        anim: (p, S, D, _M, _F, t) => { const a = cueAt(t, s.props.cue, 0.3), m = cueAt(t, s.props.meltCue, 2), T1 = S + D - 0.3; let o = blurIn(`#${p}hd .tw`, S + 0.3);
          const two = has(t, '두 판') ? cueAt(t, '두 판') : S + 0.8;
          o += `tl.fromTo('#${p}cam .sx-pl, #${p}cam .sx-lbl',{opacity:0,y:60},{opacity:1,y:0,duration:.5,stagger:.08,ease:'expo.out'},${f2(two - 0.2)});`; pushSfx(two - 0.2, 'pop', 0.3);
          o += `tl.fromTo('#${p}cam .sx-clock',{opacity:0,scale:.5},{opacity:1,scale:1,duration:.4,ease:'back.out(1.6)'},${f2(a - 0.3)});`;
          s.props.plates.forEach((pl, i) => { const fast = pl.melt === 'fast', at = a + i * 0.14;
            o += `tl.fromTo('#${p}i${i}',{y:-420,opacity:0},{y:0,opacity:1,duration:.38,ease:'power2.in'},${f2(at)});` +
              `tl.to('#${p}i${i}',{keyframes:[{scaleY:.78,scaleX:1.14,duration:.08,ease:'power2.out'},{scaleY:1,scaleX:1,duration:.35,ease:'elastic.out(1,0.5)'}]},${f2(at + 0.38)});`;
            pushSfx(at + 0.38, 'thud', 0.5);
            o += `tl.to('#${p}i${i}',{scaleY:${fast ? 0.16 : 0.86},scaleX:${fast ? 1.3 : 1},y:20,duration:${f2(Math.max(0.8, T1 - (a + 0.9)))},ease:'power1.in'},${f2(a + 0.9)});` +
              `tl.fromTo('#${p}w${i}',{scaleX:0,opacity:0},{scaleX:${fast ? 1.15 : 0.3},opacity:1,duration:${f2(Math.max(0.8, T1 - (a + 1)))},ease:'power1.in'},${f2(a + 1)});`; });
          o += `tl.fromTo('#${p}hand',{rotation:0},{rotation:${Math.round((T1 - a) * 120)},svgOrigin:'60 64',duration:${f2(T1 - a)},ease:'none'},${f2(a)});`; pushSfx(a + 0.1, 'tick', 0.3);
          o += (cache || mk(p, t)).map(c => c.a).join('');
          if (has(t, s.props.meltCue)) { o += punch(p, m - 0.4, 1.15, 300, -70, 0.6); pushSfx(m, 'ding', 0.35); }
          return o; } }; },

    // 한 문장 답: 단어가 차례로 선명해지고, 강조어만 주황으로 물든다. 출처 칩은 그 뒤에. 자리 잡으면 정지
    answer: s => ({ trans: 'iris', irisAt: [290, 760],
      html: p => `<div class="sx-ans" id="${p}a">${words(s.props.text)}</div><div class="sx-src" id="${p}s">${s.props.chips.map(c => `<i>${esc(c)}</i>`).join('')}</div>`,
      // 내레이션을 따라: 강조 아닌 단어는 바로, 강조어(em)는 cue 단어에서, 출처 칩은 문장 끝에서
      anim: (p, S, D, _M, _F, t) => { pushSfx(S + 0.3, 'stamp', 0.3);
        const emAt = s.props.emCue && has(t, s.props.emCue) ? cueAt(t, s.props.emCue) - 0.1 : S + 1.0;
        const chipAt = s.props.chipCue && has(t, s.props.chipCue) ? cueAt(t, s.props.chipCue) : S + D - 1.4;
        return blurIn(`#${p}a .tw:not(.em)`, S + 0.35, 0.1) + blurIn(`#${p}a .em`, emAt, 0.12) + inkIn(`#${p}a .em`, emAt + 0.35, S0.orange, 0.1) +
          `tl.fromTo('#${p}s i',{opacity:0,y:24},{opacity:1,y:0,duration:.45,stagger:.07,ease:'expo.out'},${f2(chipAt)});`; } }),

    // 마무리: 배경이 뜨거운 색으로 물들고(flood), 불꽃이 자라며 "반대" 상황을 보여준 뒤 댓글 질문
    end: s => ({ trans: 'flood', floodAt: [540, 500], noExit: true, tail: 1.0,
      under: () => `<div style="position:absolute;inset:0;background:radial-gradient(120% 80% at 50% 28%,#5b1f1a 0%,#2a0f14 55%,#14080c 100%)"></div>`,
      html: p => `<div class="sx-h sm" id="${p}hd" style="top:290px">${words(esc(s.props.head))}</div>` +
        `<div class="sx-hot" id="${p}r"><b id="${p}fl">🔥</b><span>${words(esc(s.props.reverse.label))}</span></div>` +
        `<div class="sx-ask" id="${p}k">💬 ${esc(s.props.ask)}</div><div class="sx-dots" id="${p}dd"><i></i><i></i><i></i></div><div class="sx-series" id="${p}e">${esc(s.props.series)}</div>`,
      anim: (p, S, D, _M, _F, t) => { const k = t.sents[1] ? t.sents[1].start : S + D - 1.5; let o = blurIn(`#${p}hd .tw`, S + 0.35);
        o += `tl.fromTo('#${p}fl',{scale:0,opacity:0},{scale:1,opacity:1,duration:.6,ease:'back.out(1.7)'},${f2(S + 0.8)});` +
          `tl.to('#${p}fl',{scaleY:1.06,scaleX:.97,transformOrigin:'50% 90%',duration:.22,yoyo:true,repeat:5,ease:'sine.inOut'},${f2(S + 1.4)});`; pushSfx(S + 0.8, 'whoosh', 0.3);
        const hot = has(t, '뜨겁게') ? cueAt(t, '뜨겁게') : S + 1.6;
        o += blurIn(`#${p}r .tw`, hot - 0.4) + inkIn(`#${p}r .tw`, hot - 0.1, S0.orange);
        o += `tl.fromTo('#${p}dd',{opacity:0},{opacity:1,duration:.2},${f2(k + 0.6)});tl.fromTo('#${p}dd i',{y:0,opacity:.35},{y:-14,opacity:1,duration:.22,yoyo:true,repeat:5,stagger:.12,ease:'sine.inOut'},${f2(k + 0.7)});`;
        o += pop(`#${p}k`, k - 0.05) + `tl.fromTo('#${p}e',{opacity:0,y:20},{opacity:1,y:0,duration:.5,ease:'expo.out'},${f2(S + D - 1.3)});`;
        return o; } }),
  };

  const scenes = plan.scenes.map(sc => {
    const make = T[sc.template]; if (!make) throw new Error('unknown template ' + sc.template + ' in ' + sc.id);
    const base = make(sc);
    if (sc.trans) base.trans = sc.trans;
    return Object.assign({ say: sc.lines.map(l => l.say), ko: sc.lines.map(l => l.say), tts: sc.lines.map(l => l.tts || l.say), sceneId: sc.id }, base);
  });

  const css = `.sx{position:absolute;left:0;top:0;width:1080px;height:1920px;word-break:keep-all;color:${S0.ink};font-family:"Noto Sans KR","Pretendard",sans-serif}
.cam{transform-origin:540px 700px}
.tw{display:inline-block}
.sx-h{position:absolute;left:70px;right:70px;text-align:center;font-size:100px;font-weight:900;line-height:1.14;letter-spacing:-2px}.sx-h.sm{font-size:62px;letter-spacing:-1px}.sx-h .em,.sx-ans .em{color:${S0.orange}}
.sx-q2{position:absolute;width:380px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:18px}.sx-q2 .sx-ico{width:300px;height:auto;filter:drop-shadow(0 26px 40px #0008)}.sx-q2 span{font-size:50px;font-weight:800}
.sx-qm{position:absolute;left:498px;top:780px;font-size:140px;font-weight:900;color:${S0.orange}}
.sx-aura{position:absolute;width:500px;height:520px;border-radius:50%;background:radial-gradient(closest-side,#7fd3ff55,#7fd3ff22 55%,transparent);opacity:0}
.sx-cold{position:absolute;width:300px;height:170px;overflow:visible}.sx-cold path{fill:none;stroke:${S0.cold};stroke-width:7;stroke-linecap:round;opacity:.85;stroke-dasharray:2400;stroke-dashoffset:2400}
.sx-spark{position:absolute;font-style:normal;font-size:40px;color:#cfeeff;text-shadow:0 0 14px #7fd3ff;opacity:0}
.sx-th{position:absolute;width:80px}.sx-tube{position:relative;width:80px;height:460px;border-radius:40px;background:#ffffff14;border:6px solid #ffffff55;overflow:hidden}.sx-tube i{position:absolute;left:0;right:0;bottom:0;height:100%;background:linear-gradient(#ff6b4a,#e63946);transform-origin:50% 100%}
.sx-th b{position:absolute;left:-20px;top:430px;width:120px;height:120px;border-radius:50%;background:#e63946;border:6px solid #ffffff55}
.sx-thv{position:absolute;width:260px;text-align:center;font-size:84px;font-weight:900;font-variant-numeric:tabular-nums}.sx-eq{position:absolute;left:500px;top:990px;font-size:130px;font-weight:900;color:${S0.orange};opacity:0}
.sx-lbl{position:absolute;text-align:center;font-size:44px;font-weight:800;color:${S0.ink}}.sx-lbl.big{font-size:54px}
.sx-blk{position:absolute;border-radius:22px;box-shadow:0 30px 60px #0009}
.sx-hand{position:absolute;left:390px;top:270px;width:300px;text-align:center;font-size:150px;line-height:1}.sx-hand em{display:inline-block;font-style:normal;font-size:48px;font-weight:900;color:${S0.orange};margin-top:6px}
.sx-glow{position:absolute;left:390px;top:200px;width:300px;height:300px;border-radius:50%;background:radial-gradient(closest-side,#fca311aa,#fca31122 60%,transparent);opacity:0}
.sx-guide{position:absolute;left:0;top:0;width:1080px;height:1920px;overflow:visible}.sx-guide path{fill:none;stroke:#fca31155;stroke-width:5;stroke-dasharray:2400;stroke-dashoffset:2400}
.pt{position:absolute;left:0;top:0;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:${S0.orange};box-shadow:0 0 18px #fca311;opacity:0}.pt.slow{width:20px;height:20px;margin:-10px 0 0 -10px}
.pt.drop{width:16px;height:22px;margin:-11px 0 0 -8px;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;background:#9fdcff;box-shadow:0 0 10px #7fd3ff}
.sx-rate{position:absolute;text-align:center;font-size:36px;font-weight:800;opacity:0}.sx-rate.fast{color:${S0.orange}}.sx-rate.slow{color:${S0.mute}}
.sx-bar{position:absolute;left:70px;right:70px;display:flex;align-items:center;gap:24px}.sx-bar .k{width:170px;font-size:52px;font-weight:900;text-align:right}.sx-bar .t{flex:1;height:110px;background:#ffffff12;border-radius:20px;overflow:hidden}.sx-bar .t i{display:block;height:100%;border-radius:20px}.sx-bar .v{width:170px;font-size:60px;font-weight:900;color:${S0.orange};font-variant-numeric:tabular-nums}
.sx-unit{position:absolute;left:0;right:0;top:800px;text-align:center;font-size:36px;color:${S0.mute}}
.sx-stamp{position:absolute;left:300px;top:880px;padding:14px 46px;border:10px solid ${S0.orange};border-radius:28px;color:${S0.orange};font-size:100px;font-weight:900;background:#14213dcc;opacity:0;font-variant-numeric:tabular-nums}
.sx-myth{position:absolute;left:0;right:0;top:250px;text-align:center}.sx-myth>b{display:block;font-size:52px;font-weight:800;color:${S0.mute};margin-bottom:10px}.sx-myth>span{display:inline-block;font-size:96px;font-weight:900;letter-spacing:-2px;color:${S0.ink}}.sx-myth>span{position:relative}.sx-myth i{position:absolute;left:-14px;right:-14px;top:50%;height:12px;border-radius:6px;background:#ff5a5a;transform:scaleX(0)}
.sx-chart{position:absolute;left:40px;width:1000px;height:700px;overflow:visible;opacity:0}.sx-chart .ax{stroke:#ffffff55;stroke-width:5}.sx-chart .yl{fill:${S0.mute};font-size:36px;text-anchor:end;font-weight:700}.sx-chart .yl2{fill:${S0.mute};font-size:32px;font-weight:700}.sx-chart .xl{fill:${S0.mute};font-size:34px;text-anchor:end}
.sx-chart .cv{fill:none;stroke-width:14;stroke-linecap:round}.sx-chart .cv.steel{stroke:#c9d4e2}.sx-chart .cv.wood{stroke:#d9935a}.sx-chart .dt.steel{fill:#ffffff}.sx-chart .dt.wood{fill:#ffb27a}.sx-chart .el{fill:${S0.ink};font-size:42px;font-weight:900}
.sx-pl{position:absolute;width:380px;height:70px;border-radius:16px;box-shadow:0 30px 50px #0009}
.sx-ice{position:absolute;transform-origin:50% 100%;width:160px;height:160px;border-radius:26px;background:linear-gradient(135deg,#ffffffee,#bfe9ffb0 50%,#8fd3ff90);border:4px solid #ffffffcc;box-shadow:inset 0 0 30px #ffffff,0 10px 30px #8fd3ff55;opacity:0}
.sx-pud{position:absolute;width:300px;height:30px;border-radius:50%;background:radial-gradient(closest-side,#8fd3ffcc,#8fd3ff33);transform-origin:50% 50%;opacity:0}
.sx-clock{position:absolute;left:480px;top:400px;width:120px;height:120px;overflow:visible}.sx-clock circle{fill:none;stroke:${S0.ink};stroke-width:7}.sx-clock rect{fill:${S0.ink}}.sx-clock line{stroke:${S0.orange};stroke-width:8;stroke-linecap:round}
.sx-ans{position:absolute;left:60px;right:60px;top:470px;text-align:center;font-size:110px;font-weight:900;line-height:1.15;letter-spacing:-2px}
.sx-src{position:absolute;left:80px;right:80px;top:820px;display:flex;flex-wrap:wrap;gap:16px;justify-content:center}.sx-src i{font-style:normal;font-size:32px;font-weight:700;color:${S0.mute};border:3px solid ${S0.line};border-radius:40px;padding:8px 22px}
.sx-hot{position:absolute;left:0;right:0;top:400px;text-align:center}.sx-hot b{display:inline-block;font-size:170px;line-height:1.1}.sx-hot>span{display:block;font-size:66px;font-weight:900;color:${S0.ink}}
.sx-ask{position:absolute;left:70px;right:70px;top:800px;text-align:center;font-size:58px;font-weight:900;opacity:0}.sx-series{position:absolute;left:70px;right:130px;top:1010px;text-align:center;font-size:38px;font-weight:800;color:${S0.mute};letter-spacing:2px;opacity:0}
.sx-dots{position:absolute;left:0;right:0;top:900px;text-align:center;opacity:0}.sx-dots i{display:inline-block;width:20px;height:20px;margin:0 9px;border-radius:50%;background:#f4f1ea}
.sx-tag{position:absolute;right:80px;top:240px;font-size:30px;font-weight:800;color:${S0.mute};border:3px solid ${S0.line};border-radius:30px;padding:4px 18px}`;
  const bgHtml = `<div style="position:absolute;inset:0;background:radial-gradient(120% 80% at 50% 30%,${S0.navy} 0%,${S0.deep} 70%)"></div>` +
    `<div class="bggrid" style="position:absolute;left:0;top:-90px;width:1080px;height:2010px;opacity:.07;background-image:linear-gradient(#fff 2px,transparent 2px),linear-gradient(90deg,#fff 2px,transparent 2px);background-size:90px 90px"></div>`;
  return { id: 'science-' + plan.episode + '-v' + plan.version, F, bgHtml, bgDrift: '.bggrid', sprites: null, noHost: true, lang: 'ko', title: plan.titles?.[0] || plan.episode,
    keywords: plan.keywords || [], scenes, css, credits: plan.credits || '' };
}
