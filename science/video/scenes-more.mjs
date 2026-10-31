// 추가 장면 템플릿 (EP002~EP004에서 만든 것). science.mjs의 모션 킷(k)을 받아 템플릿 맵을 돌려준다.
// 모든 템플릿은 rules/channel.md "모션" 원칙을 따른다: 내레이션 cue에서 등장, 도착 expo.out, 정지된 제목, 움직임은 카메라·데이터로.
// 화면 영역: y 250~1150, 오른쪽 아이콘 줄(x>960, y>900) 글자 금지.

export function moreTemplates(k) {
  const { f2, esc, pushSfx, S0, cueAt, has, words, blurIn, inkIn, pop, land, draw, punch, shake, count, stream, flash, tagHtml } = k;
  // 곡선(점 배열)을 따라 점들이 흐른다. 반복 횟수 유한, 시작 전·끝난 뒤 투명
  const along = (p, key, pts, n, period, start, end, cls = '') => {
    let html = '', a = ''; const step = period / (pts.length - 1);
    for (let i = 0; i < n; i++) { const id = p + key + i, st = start + (i * period) / n, reps = Math.floor((end - st) / period) - 1;
      html += `<i class="pt ${cls}" id="${id}"></i>`; if (reps < 0) continue;
      a += `tl.set('#${id}',{x:${pts[0][0]},y:${pts[0][1]}},${f2(st - 0.01)});` +
        `tl.to('#${id}',{keyframes:${JSON.stringify(pts.slice(1).map(q => ({ x: Math.round(q[0]), y: Math.round(q[1]), duration: +step.toFixed(4), ease: 'none' })))},repeat:${reps}},${f2(st)});` +
        `tl.fromTo('#${id}',{opacity:0},{opacity:1,duration:${f2(period / 2)},ease:'sine.inOut',yoyo:true,repeat:${2 * reps + 1}},${f2(st)});`; }
    return { html, a }; };
  const qbez = ([x0, y0], [cx, cy], [x1, y1], n = 16) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1]; });
  const dpath = pts => 'M' + pts.map(q => q[0].toFixed(0) + ' ' + q[1].toFixed(0)).join(' L');
  // 회전하는 소용돌이 (시계 방향 dir=1, 반대 -1). 일정 속도 회전이 의미이므로 linear
  const swirlSvg = (id, cx, cy, r, col) => `<svg class="mx-swirl" id="${id}" viewBox="-100 -100 200 200" style="left:${cx - r}px;top:${cy - r}px;width:${2 * r}px;height:${2 * r}px;color:${col}">` +
    [0, 120, 240].map(a => `<path d="M0 0 C 20 -10, 45 -20, 60 -50 S 70 -95, 30 -98" transform="rotate(${a})" />`).join('') + `<circle r="9"/></svg>`;
  const spin = (sel, dir, at, dur, rps = 0.5) => `tl.fromTo('${sel}',{rotation:0},{rotation:${Math.round(dir * 360 * rps * dur)},duration:${f2(dur)},ease:'none'},${f2(at)});`;
  const em = (txt, size = 220) => `<span class="mx-emo" style="font-size:${size}px">${txt}</span>`;

  const T = {
    // 범용 훅: 질문 + 아이콘 1~2개. 첫 프레임에 전부 보인다. fx: wave(소리 고리) / swirl(소용돌이, icons[i].spin) / drops(물방울)
    hook: s => { let cache = null;
      const xs = s.props.icons.length === 1 ? [540] : [290, 790];
      const mk = (p, t) => { const end = t.S + t.D; return s.props.fx === 'drops' ? s.props.icons.map((_, i) => stream(p, 'dr' + i, [xs[i] - 60, 640], [xs[i] - 90, 1000], 4, 0.9, t.S + 0.4, end, 'drop')) : []; };
      return { first: true,
        html: (p, _F, t) => { cache = mk(p, t);
          return `<div class="sx-h" style="top:290px">${words(s.props.question)}</div>` +
            s.props.icons.map((ic, i) => `<div class="mx-ico" id="${p}i${i}" style="left:${xs[i] - 200}px;top:640px">` +
              (s.props.fx === 'wave' ? `<b class="mx-ring" id="${p}r${i}a"></b><b class="mx-ring" id="${p}r${i}b"></b>` : '') +
              (s.props.fx === 'swirl' ? swirlSvg(p + 'sw' + i, 200, 150, 150, ic.spin > 0 ? S0.orange : S0.cold) : '') +
              `${em(ic.emoji)}<span class="mx-lb">${esc(ic.label)}</span></div>`).join('') +
            (s.props.mid ? `<div class="mx-mid" id="${p}m">${esc(s.props.mid)}</div>` : '') + cache.map(c => c.html).join(''); },
        anim: (p, S, D, _M, _F, t) => { let o = ''; const end = S + D;
          s.props.icons.forEach((ic, i) => { const c = has(t, ic.cue) ? cueAt(t, ic.cue) : S + 0.5 + i * 0.9;
            o += punch(p, c - 0.15, 1.06, (540 - xs[i]) * 0.25, 0, 0.5);
            if (s.props.fx === 'wave') { o += `tl.fromTo('#${p}r${i}a,#${p}r${i}b',{scale:.4,opacity:.9},{scale:1.9,opacity:0,duration:1.1,stagger:.35,repeat:${Math.max(0, Math.floor((end - c) / 1.45) - 1)},ease:'power1.out'},${f2(c)});`; pushSfx(c, 'pop', 0.3); }
            if (s.props.fx === 'swirl') o += spin(`#${p}sw${i}`, ic.spin || 1, S, D, 0.45); });
          if (s.props.mid) o += `tl.fromTo('#${p}m',{scale:1},{scale:1.4,duration:.2,yoyo:true,repeat:1,ease:'power2.out'},${f2(t.sents[1] ? t.sents[1].start : S + 1.5)});`;
          o += punch(p, S + D - 1.0, 1, 0, 0, 0.5);
          return o + (cache || mk(p, t)).map(c => c.a).join(''); } }; },

    // 머리 정면도 위 두 경로: 공기 길(입->밖->귀), 뼈 길(목->머리뼈->속귀). recorder:true면 공기 길은 마이크로, 뼈 길은 X
    routes: s => { const rec = !!s.props.recorder; let cache = null;
      const air = rec ? qbez([600, 805], [700, 860], [800, 900]) : qbez([600, 805], [800, 870], [770, 660]);
      const bone = qbez([540, 905], [420, 800], [360, 655]);
      const mk = (p, t) => { const ac = cueAt(t, s.props.airCue, 0.6), bc = cueAt(t, s.props.boneCue, 1.6), end = t.S + t.D - 0.1;
        return [along(p, 'a', air, 6, 0.9, ac, end, 'air'), along(p, 'b', bone, rec ? 0 : 7, 0.8, bc, end, 'bone')]; };
      return { trans: s.trans || 'blur',
        html: (p, _F, t) => { cache = mk(p, t);
          return `<svg class="mx-head" viewBox="0 0 1080 1920"><ellipse cx="540" cy="640" rx="210" ry="260" class="hd" id="${p}hd"/>` +
            `<ellipse cx="322" cy="655" rx="26" ry="52" class="ear"/><ellipse cx="758" cy="655" rx="26" ry="52" class="ear"/>` +
            `<path d="M500 805 Q540 830 580 805" class="mo"/><path d="M470 900 L470 1060 M610 900 L610 1060" class="nk"/>` +
            `<path id="${p}ap" d="${dpath(air)}" class="ap"/><path id="${p}bp" d="${dpath(bone)}" class="bp${rec ? ' off' : ''}"/>` +
            `<circle cx="360" cy="655" r="16" class="co" id="${p}e0"/><circle cx="770" cy="660" r="16" class="co" id="${p}e1"/></svg>` +
            `<b class="mx-ring sm" id="${p}mr0"></b><b class="mx-ring sm" id="${p}mr1"></b>` +
            (rec ? `<div class="mx-mic" id="${p}mic">🎙️</div><div class="mx-x" id="${p}x">✕</div>` : '') +
            `<div class="mx-tg air" id="${p}la" style="left:${rec ? 640 : 780}px;top:${rec ? 1000 : 830}px">${esc(s.props.airLabel || '공기')}</div>` +
            `<div class="mx-tg bone" id="${p}lb" style="left:120px;top:830px">${esc(s.props.boneLabel || '뼈')}</div>` +
            (s.props.title ? `<div class="sx-h sm" style="top:270px">${words(esc(s.props.title))}</div>` : '') + cache.map(c => c.html).join(''); },
        anim: (p, S, D, _M, _F, t) => { const ac = cueAt(t, s.props.airCue, 0.6), bc = cueAt(t, s.props.boneCue, 1.6); let o = '';
          // 소리가 입에서 나온다 (장면 시작) -> '두 길'에서 양쪽 귀가 반짝
          o += `tl.fromTo('#${p}mr0,#${p}mr1',{scale:.3,opacity:.9},{scale:1.8,opacity:0,duration:.9,stagger:.3,ease:'power1.out'},${f2(S + 0.35)});`; pushSfx(S + 0.35, 'pop', 0.25);
          const two = has(t, '두 길') ? cueAt(t, '두 길') : S + 1.2;
          o += `tl.fromTo('#${p}e0,#${p}e1',{scale:1},{scale:1.9,transformOrigin:'50% 50%',duration:.22,yoyo:true,repeat:3,stagger:.12,ease:'power2.out'},${f2(two)});`; pushSfx(two, 'tick', 0.3);
          o += draw(`#${p}ap`, ac - 0.2, 0.5, 'power2.out') + pop(`#${p}la`, ac, 'whoosh', 0.25);
          if (!rec) { o += draw(`#${p}bp`, bc - 0.2, 0.5, 'power2.out') + pop(`#${p}lb`, bc, 'pop', 0.3);
            o += `tl.to('#${p}hd',{keyframes:[{stroke:'${S0.orange}',duration:.15},{stroke:'#cfd8e6',duration:.6}],repeat:2},${f2(bc + 0.1)});`; }
          else { o += draw(`#${p}bp`, S + 0.2, 0.4) + pop(`#${p}mic`, ac - 0.3, 'pop', 0.35) + `tl.fromTo('#${p}x',{opacity:0,scale:2},{opacity:1,scale:1,duration:.35,ease:'back.out(2)'},${f2(ac + 0.4)});` + pop(`#${p}lb`, ac + 0.45, null); pushSfx(ac + 0.45, 'thud', 0.4); }
          return o + (cache || mk(p, t)).map(c => c.a).join(''); } }; },

    // 두 파형 비교: 위(낮고 굵은 소리) / 아래(높고 얇은 소리). 파형이 흐르며 소리가 나는 중임을 보여준다
    waves: s => ({ trans: s.trans || 'whip',
      html: p => `<div class="sx-h sm" style="top:280px">${words(esc(s.props.title))}</div>` + s.props.items.map((w, i) => { const y = 470 + i * 330, per = 1000 / w.freq, L = 480 + 2 * per;
        let d = 'M0 100'; for (let x = 0; x <= L; x += 10) d += ` L${x} ${(100 - w.amp * Math.sin((2 * Math.PI * x) / per)).toFixed(1)}`;
        return `<div class="mx-wl" id="${p}l${i}" style="top:${y}px">${esc(w.label)}${w.badge ? ` <em id="${p}bg${i}">${esc(w.badge)}</em>` : ''}</div>` +
          `<div class="mx-wv" style="top:${y + 70}px"><svg viewBox="0 0 1100 200" preserveAspectRatio="none"><g id="${p}g${i}"><path d="${d}" style="stroke:${w.color};stroke-width:${w.width || 10}" id="${p}w${i}"/></g></svg></div>`; }).join(''),
      anim: (p, S, D, _M, _F, t) => { let o = '';
        s.props.items.forEach((w, i) => { const c = has(t, w.cue) ? cueAt(t, w.cue) - 0.2 : S + 0.4 + i * 1.2, per = 1000 / w.freq;
          o += land(`#${p}l${i}`, c, -30) + draw(`#${p}w${i}`, c, 0.7, 'power2.out');
          const tp = 1 / (w.freq * 0.5), reps = Math.max(0, Math.floor((S + D - c) / tp) - 1); // 한 파장씩 밀며 반복 (이음새 없음)
          o += `tl.fromTo('#${p}g${i}',{x:0},{x:${-per.toFixed(2)},duration:${f2(tp)},ease:'none',repeat:${reps}},${f2(c)});`;
          if (w.badge) o += pop(`#${p}bg${i}`, c + 0.8, 'ding', 0.3); });
        return o; } }),

    // 블라인드 테스트: 여러 목소리 카드 중 하나가 사실 '내 목소리'. 몰래 들었을 때 더 좋게 평가
    blindTest: s => ({ trans: s.trans || 'rise',
      html: p => { const n = 6, cards = Array.from({ length: n }, (_, i) => { const x = 110 + (i % 3) * 290, y = 460 + Math.floor(i / 3) * 280;
          return `<div class="mx-card${i === s.props.own ? ' own' : ''}" id="${p}c${i}" style="left:${x}px;top:${y}px"><svg viewBox="0 0 200 80"><path d="M0 40 ${Array.from({ length: 20 }, (_, j) => `L${j * 10 + 5} ${40 - ((j * 37 + i * 11) % 30) + 15} L${j * 10 + 10} 40`).join(' ')}"/></svg>${i === s.props.own ? `<b id="${p}me">${esc(s.props.ownLabel)}</b>` : '<b>?</b>'}</div>`; }).join('');
        const oc = { x: 110 + (s.props.own % 3) * 290, y: 460 + Math.floor(s.props.own / 3) * 280 };
        return `<div class="sx-h sm" style="top:290px">${words(esc(s.props.title))}</div>${cards}<div class="mx-stars" id="${p}st" style="left:${oc.x}px;top:${oc.y - 70}px"><i>★</i><i>★</i><i>★</i></div><div class="mx-res" id="${p}r">👍 ${esc(s.props.result)}</div>` + tagHtml(s.props.tag); },
      anim: (p, S, D, _M, _F, t) => { let o = `tl.fromTo('#${p}cam .mx-card',{opacity:0,y:50,scale:.9},{opacity:1,y:0,scale:1,duration:.5,stagger:.07,ease:'expo.out'},${f2(S + 0.3)});`;
        const unk = has(t, s.props.cue) ? cueAt(t, s.props.cue) : S + 1.5, res = has(t, s.props.resCue) ? cueAt(t, s.props.resCue) - 0.2 : S + D - 1.5;
        o += `tl.to('#${p}cam .mx-card',{keyframes:[{borderColor:'#fca311',duration:.12},{borderColor:'#2a3b63',duration:.12}],stagger:.16},${f2(S + 0.9)});`; pushSfx(S + 0.9, 'tick', 0.25);
        o += `tl.to('#${p}c${s.props.own}',{scale:1.12,borderColor:'#fca311',boxShadow:'0 0 40px #fca31188',duration:.45,ease:'back.out(1.6)'},${f2(unk)});` + `tl.fromTo('#${p}me',{opacity:0},{opacity:1,duration:.3},${f2(unk + 0.2)});`; pushSfx(unk, 'shimmer', 0.35);
        o += pop(`#${p}r`, res, 'ding', 0.4) + punch(p, res - 0.1, 1.06, 0, -40, 0.5);
        // 내 목소리 카드 위로 별이 하나씩 (더 좋은 평가)
        o += `tl.fromTo('#${p}st i',{opacity:0,scale:0,y:20},{opacity:1,scale:1,y:0,duration:.35,stagger:.22,ease:'back.out(2)'},${f2(res + 0.5)});`; [0, 1, 2].forEach(j => pushSfx(res + 0.5 + j * 0.22, 'pop', 0.25));
        return o; } }),

    // 지구본 위 두 소용돌이: 북반구 시계 반대(↺), 남반구 시계 방향(↻)
    globeSpin: s => ({ trans: s.trans || 'whip',
      html: p => `<div class="mx-globe" id="${p}g"><div class="mx-land" id="${p}ld"></div><i class="eq"></i></div>` +
        swirlSvg(p + 'n', 540, 610, 105, S0.cold) + swirlSvg(p + 's', 540, 850, 105, S0.orange) +
        `<div class="mx-tg cold" id="${p}ln" style="left:0;width:1080px;text-align:center;top:385px">${esc(s.props.north)}</div><div class="mx-tg warm" id="${p}ls" style="left:0;width:1080px;text-align:center;top:1000px">${esc(s.props.south)}</div><div class="mx-eqL">적도</div>`,
      anim: (p, S, D, _M, _F, t) => { const n = has(t, '북반구') ? cueAt(t, '북반구') : S + 1, so = has(t, '남반구') ? cueAt(t, '남반구') : S + 2;
        let o = `tl.fromTo('#${p}ld',{x:0},{x:-560,duration:${f2(D)},ease:'none'},${f2(S)});`;
        o += pop(`#${p}n`, n - 0.1, 'whoosh', 0.25) + spin(`#${p}n`, -1, n - 0.1, S + D - n + 0.1, 0.6) + pop(`#${p}ln`, n, null);
        o += pop(`#${p}s`, so - 0.1, 'whoosh', 0.25) + spin(`#${p}s`, 1, so - 0.1, S + D - so + 0.1, 0.6) + pop(`#${p}ls`, so, null);
        return o; } }),

    // 변기를 위에서 본 그림: 테두리 물구멍이 비스듬해서 물이 그 방향으로 돈다. flip=true면 각도를 바꾸면 방향도 바뀐다
    drainJets: s => ({ trans: s.trans || 'blur',
      html: p => `<div class="sx-h sm" style="top:280px">${words(esc(s.props.title))}</div><div class="mx-bowl" id="${p}b"></div>` + swirlSvg(p + 'w', 540, 740, 170, S0.cold) +
        Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * 2 * Math.PI, x = 540 + 285 * Math.cos(a), y = 740 + 215 * Math.sin(a), deg = (a * 180) / Math.PI + 90 + 35;
          return `<i class="mx-jet" id="${p}j${i}" style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px;transform:rotate(${deg.toFixed(0)}deg)">➤</i>`; }).join('') +
        `<div class="mx-tg warm" id="${p}l" style="left:290px;top:1020px;width:500px;text-align:center">${esc(s.props.label)}</div>`,
      anim: (p, S, D, _M, _F, t) => { const c = has(t, s.props.cue) ? cueAt(t, s.props.cue) - 0.2 : S + 1.5;
        // '작아요'에서 변기가 작아졌다가 '각도'에서 다시 커지며 물구멍이 켜진다
        const sm = has(t, s.props.smallCue) ? cueAt(t, s.props.smallCue) - 0.2 : S + 0.8;
        let o = `tl.fromTo('#${p}cam .mx-bowl, #${p}cam .mx-jet',{scale:1.25,opacity:0},{scale:1,opacity:1,duration:.55,ease:'expo.out'},${f2(S + 0.25)});` +
          `tl.to('#${p}cam .mx-bowl',{scale:.62,duration:.5,ease:'power3.inOut'},${f2(sm)});tl.to('#${p}cam .mx-bowl',{scale:1,duration:.6,ease:'expo.out'},${f2(c - 0.1)});`; pushSfx(sm, 'thud', 0.3);
        o += `tl.fromTo('#${p}cam .mx-jet',{opacity:.25},{opacity:1,color:'${S0.orange}',duration:.25,stagger:.05},${f2(c)});`;
        o += `tl.fromTo('#${p}w',{opacity:0,scale:.6},{opacity:1,scale:1,duration:.5,ease:'expo.out'},${f2(c + 0.3)});` + spin(`#${p}w`, 1, c + 0.3, S + D - c - 0.3, 0.7);
        o += pop(`#${p}l`, c + 0.6, 'whoosh', 0.3) + punch(p, c + 0.2, 1.08, 0, 40, 0.6);
        return o; } }),

    // 크기 비교: 큰 힘(중력) vs 아주 작은 힘. 돋보기가 작은 쪽을 확대하고 배수를 센다
    scaleZoom: s => ({ trans: s.trans || 'rise',
      html: p => `<div class="sx-h sm" style="top:280px">${words(esc(s.props.title))}</div>` +
        `<div class="mx-big" id="${p}a"><b>⬇</b><span>${esc(s.props.big)}</span></div><div class="mx-dot" id="${p}d"></div><div class="mx-dotL" id="${p}dl">${esc(s.props.small)}</div>` +
        `<div class="mx-lens" id="${p}lz"><b>↻</b><span>${esc(s.props.small)}</span></div><div class="mx-ratio" id="${p}r">${esc(s.props.ratio)}</div>` + tagHtml(s.props.tag),
      anim: (p, S, D, _M, _F, t) => { const c = has(t, s.props.ratioCue) ? cueAt(t, s.props.ratioCue) - 0.3 : S + D * 0.55;
        const sc = has(t, s.props.smallCue) ? cueAt(t, s.props.smallCue) - 0.1 : S + 0.9;
        let o = land(`#${p}a`, S + 0.3, -80) + pop(`#${p}d`, sc, 'tick', 0.3) + pop(`#${p}dl`, sc + 0.1, null) + `tl.fromTo('#${p}d',{boxShadow:'0 0 0 0 #7fd3ff'},{boxShadow:'0 0 0 26px #7fd3ff00',duration:.7,repeat:1,ease:'power1.out'},${f2(sc + 0.2)});`;
        o += `tl.fromTo('#${p}lz',{opacity:0,scale:.1},{opacity:1,scale:1,duration:.55,ease:'expo.out'},${f2(c - 0.4)});`; pushSfx(c - 0.4, 'whoosh', 0.3);
        const num = parseFloat(String(s.props.ratio).replace(/[^\d.]/g, '')) || 0;
        o += `tl.fromTo('#${p}r',{opacity:0,scale:2,rotation:-12},{opacity:1,scale:1,rotation:-4,duration:.4,ease:'back.out(2)'},${f2(c)});`;
        if (num) o += `(()=>{const o={v:0},el=document.getElementById('${p}r');tl.to(o,{v:${num},duration:.8,ease:'power3.out',onUpdate:()=>{el.textContent=${JSON.stringify(String(s.props.ratio).split(/\d/)[0])}+Math.round(o.v).toLocaleString('en-US')+${JSON.stringify(String(s.props.ratio).replace(/^.*\d/, ''))}}},${f2(c)});})();`;
        o += shake(p, c + 0.8); pushSfx(c + 0.8, 'stamp', 0.45);
        // 문장 끝('약하'): 큰 힘(중력)이 한 번 더 내리누르고 작은 점은 흐려진다
        const ec = has(t, s.props.endCue || '약하') ? cueAt(t, s.props.endCue || '약하') : c + 1.4;
        if (ec - c > 1) { o += `tl.fromTo('#${p}a b',{y:0},{y:40,duration:.18,yoyo:true,repeat:1,ease:'power2.out'},${f2(ec)});tl.to('#${p}lz',{opacity:.35,scale:.9,duration:.4},${f2(ec + 0.2)});`; pushSfx(ec, 'thud', 0.4); }
        return o; } }),

    // 대야 실험 재현: 하루 기다림(시계), 물이 서서히 돌기 시작. 두 번째 대야(시드니)는 반대 방향
    basin: s => ({ trans: s.trans || 'blur',
      html: p => `<div class="mx-bs" id="${p}b0" style="left:230px;top:400px;width:620px;height:620px"><b class="mx-water" id="${p}wt"></b><i class="mx-dimL" id="${p}dm"></i><svg class="mx-swirlIn" id="${p}w0" viewBox="-100 -100 200 200">${[0, 120, 240].map(a => `<path d="M0 0 C 20 -10, 45 -20, 60 -50 S 70 -95, 30 -98" transform="rotate(${a})"/>`).join('')}</svg><i class="dim">${esc(s.props.size)}</i></div>` +
        `<div class="mx-cap" id="${p}c0" style="left:230px;width:620px">${esc(s.props.first.label)}</div>` +
        `<div class="mx-clock" id="${p}ck">⏱ <span id="${p}h">0</span>시간</div>` +
        `<div class="mx-bs sm" id="${p}b1" style="left:600px;top:520px;width:360px;height:360px"><b class="mx-water mx-water2"></b><svg class="mx-swirlIn" id="${p}w1" viewBox="-100 -100 200 200">${[0, 120, 240].map(a => `<path d="M0 0 C -20 -10, -45 -20, -60 -50 S -70 -95, -30 -98" transform="rotate(${a})"/>`).join('')}</svg></div>` +
        `<div class="mx-cap" id="${p}c1" style="left:600px;width:360px">${esc(s.props.second.label)}</div>` + tagHtml(s.props.tag),
      anim: (p, S, D, _M, _F, t) => { const wait = has(t, s.props.waitCue) ? cueAt(t, s.props.waitCue) - 0.4 : S + 1.2, turn = has(t, s.props.turnCue) ? cueAt(t, s.props.turnCue) - 0.3 : S + D * 0.45, sec = has(t, s.props.secondCue) ? cueAt(t, s.props.secondCue) - 0.3 : S + D - 2.5;
        const R1 = -Math.round(360 * 0.15 * (sec - turn)) - 120;
        const yc = has(t, s.props.yearCue) ? cueAt(t, s.props.yearCue) : S + 0.5, dc = has(t, s.props.dimCue) ? cueAt(t, s.props.dimCue) - 0.1 : S + 1.5, fc = has(t, s.props.fillCue) ? cueAt(t, s.props.fillCue) - 0.1 : S + 2;
        let o = land(`#${p}b0`, S + 0.25, 60) + pop(`#${p}c0`, yc, 'pop', 0.3);
        o += `tl.fromTo('#${p}b0 .dim',{opacity:0,y:20},{opacity:1,y:0,duration:.4,ease:'expo.out'},${f2(dc)});tl.fromTo('#${p}dm',{scaleX:0},{scaleX:1,duration:.5,ease:'expo.out'},${f2(dc)});`; pushSfx(dc, 'tick', 0.3);
        o += `tl.fromTo('#${p}wt',{opacity:0,scale:.3},{opacity:1,scale:1,duration:.7,ease:'power2.out'},${f2(fc)});`; pushSfx(fc, 'whoosh', 0.2);
        if (dc - yc > 1.2) o += punch(p, yc + 0.2, 1.06, 0, 30, 0.8) + punch(p, dc - 0.2, 1, 0, 0, 0.5);
        o += `tl.fromTo('#${p}ck',{opacity:0,y:-20},{opacity:1,y:0,duration:.35,ease:'expo.out'},${f2(wait)});` + count(`${p}h`, 0, 24, 0, wait + 0.1, Math.max(0.8, turn - wait - 0.2)); pushSfx(wait + 0.1, 'tick', 0.3);
        o += `tl.fromTo('#${p}w0',{opacity:0},{opacity:1,duration:.6},${f2(turn)});` + `tl.fromTo('#${p}w0',{rotation:0},{rotation:${R1},duration:${f2(sec - turn + 0.6)},ease:'power2.in'},${f2(turn)});`; pushSfx(turn, 'whoosh', 0.25);
        o += `tl.to('#${p}b0,#${p}c0,#${p}ck',{x:-150,scale:.62,transformOrigin:'0% 50%',duration:.6,ease:'power2.inOut'},${f2(sec - 0.2)});` + `tl.to('#${p}w0',{rotation:${R1 - 200},duration:${f2(S + D - sec - 0.6)},ease:'none'},${f2(sec + 0.6)});`;
        o += land(`#${p}b1`, sec + 0.2, 60) + `tl.set('#${p}b1 .mx-water2',{opacity:1},${f2(sec)});` + pop(`#${p}c1`, sec + 0.4, 'pop', 0.35) + `tl.fromTo('#${p}w1',{opacity:0,rotation:0},{opacity:1,rotation:${Math.round(360 * 0.25 * (S + D - sec))},duration:${f2(S + D - sec - 0.3)},ease:'none'},${f2(sec + 0.4)});`;
        return o; } }),

    // 통념 + 두 손가락 비교: 위에 통념(취소선), 아래 보통 손가락(주름 생김) vs 신경이 끊긴 손가락(매끈)
    fingerCompare: s => ({ trans: s.trans || 'whip',
      html: p => `<div class="sx-myth" id="${p}m" style="top:260px"><span>${words(esc(s.props.myth))}<i id="${p}x"></i></span></div>` +
        [0, 1].map(i => { const x = i ? 600 : 140, it = s.props.items[i];
          return `<div class="mx-fg" id="${p}f${i}" style="left:${x}px"><svg viewBox="0 0 340 560"><path d="M40 560 L40 170 Q40 30 170 30 Q300 30 300 170 L300 560" class="skin"/>` +
            (it.wrinkle ? Array.from({ length: 6 }, (_, j) => `<path class="wr" id="${p}w${i}_${j}" d="M80 ${110 + j * 34} Q130 ${96 + j * 34} 170 ${112 + j * 34} T260 ${108 + j * 34}"/>`).join('') : '') +
            (it.nerve ? `<path class="nv${it.cut ? ' cut' : ''}" d="M170 560 L170 ${it.cut ? 400 : 240}"/>${it.cut ? '<text x="140" y="390" class="cutx">✂</text>' : ''}` : '') + `</svg><b>${esc(it.label)}</b></div>`; }).join(''),
      anim: (p, S, D, _M, _F, t) => { const no = t.sents[1] ? t.sents[1].start : S + D * 0.5; let o = blurIn(`#${p}m .tw`, S + 0.3, 0.08);
        o += `tl.fromTo('#${p}x',{scaleX:0},{scaleX:1,transformOrigin:'0 50%',duration:.3,ease:'power3.out'},${f2(no)});` + `tl.to('#${p}m span',{color:'#56627c',duration:.3},${f2(no + 0.1)});`; pushSfx(no, 'thud', 0.4);
        o += `tl.fromTo('#${p}f0,#${p}f1',{opacity:0,y:80},{opacity:1,y:0,duration:.55,stagger:.12,ease:'expo.out'},${f2(S + 0.6)});`;
        // '불어서'에서 손가락이 부풀어 보이고, '주름'에서 보통 손가락에만 주름이 그려진다
        const sw = has(t, s.props.swellCue) ? cueAt(t, s.props.swellCue) - 0.1 : S + 1.2, wr = has(t, s.props.wrinkleCue) ? cueAt(t, s.props.wrinkleCue) - 0.1 : no + 1.5;
        const th = has(t, s.props.thinkCue || '생각') ? cueAt(t, s.props.thinkCue || '생각') : sw + 1;
        if (no - th > 0.6) o += `tl.fromTo('#${p}m>span',{rotation:0},{keyframes:[{rotation:-4,duration:.12},{rotation:4,duration:.12},{rotation:0,duration:.16}]},${f2(th)});`;
        o += `tl.fromTo('#${p}f0 svg,#${p}f1 svg',{scaleX:1},{scaleX:1.08,transformOrigin:'50% 100%',duration:.3,yoyo:true,repeat:1,ease:'sine.inOut'},${f2(sw)});`; pushSfx(sw, 'pop', 0.25);
        o += draw(`#${p}cam .wr`, wr, 0.5).replace(`},${f2(wr)});`, `,stagger:.12},${f2(wr)});`); pushSfx(wr, 'tick', 0.3);
        const cut = has(t, s.props.cue) ? cueAt(t, s.props.cue) : no + 0.8;
        o += punch(p, cut - 0.1, 1.05, -60, -20, 0.6) + `tl.fromTo('#${p}f1 .cutx',{opacity:0,scale:2},{opacity:1,scale:1,duration:.3,ease:'back.out(2)'},${f2(cut + 0.2)});`; pushSfx(cut + 0.2, 'pop', 0.35);
        return o; } }),

    // 손가락 끝 단면: 신경 신호 -> 혈관 수축 -> 겉 피부가 접힘
    finger: s => ({ trans: s.trans || 'blur',
      html: p => { let flat = 'M60 520', wav = 'M60 520'; for (let x = 60; x <= 1020; x += 12) { flat += ` L${x} 520`; wav += ` L${x} ${(520 + 26 * Math.sin((x - 60) / 38)).toFixed(1)}`; }
        return `<div class="sx-h sm" style="top:280px">${words(esc(s.props.title))}</div><svg class="mx-sec" viewBox="0 0 1080 1920">` +
          `<rect x="60" y="520" width="960" height="560" rx="30" class="tis" id="${p}ts"/><path d="${flat}" class="sf" id="${p}sf"/><path d="${wav}" class="sw" id="${p}sw"/>` +
          [640, 760, 880].map((y, i) => `<rect x="140" y="${y}" width="800" height="54" rx="27" class="vs" id="${p}v${i}"/>`).join('') +
          `<path d="M60 1000 L1020 1000" class="nv2" id="${p}n"/><circle r="16" class="sig" id="${p}sg" cx="60" cy="1000"/></svg>` +
          `<div class="mx-tg warm" style="left:80px;top:1020px" id="${p}ln">${esc(s.props.nerve)}</div><div class="mx-tg" style="left:620px;top:560px;color:#ff8f8f" id="${p}lv">${esc(s.props.vessel)}</div>`; },
      anim: (p, S, D, _M, _F, t) => { const nc = has(t, s.props.nerveCue) ? cueAt(t, s.props.nerveCue) - 0.2 : S + 0.6, vc = has(t, s.props.squeezeCue) ? cueAt(t, s.props.squeezeCue) - 0.2 : nc + 1.2, fc = has(t, s.props.foldCue) ? cueAt(t, s.props.foldCue) - 0.3 : S + D - 2;
        let o = pop(`#${p}ln`, nc, 'tick', 0.3) + `tl.fromTo('#${p}sg',{attr:{cx:60}},{attr:{cx:1020},duration:.8,ease:'power1.in',repeat:2},${f2(nc)});`;
        o += `tl.to('#${p}cam .vs',{scaleY:.35,transformOrigin:'50% 50%',duration:.7,stagger:.1,ease:'power3.inOut'},${f2(vc)});` + pop(`#${p}lv`, vc, null); pushSfx(vc, 'thud', 0.35);
        o += `tl.to('#${p}ts',{attr:{y:550,height:530},duration:.7,ease:'power2.inOut'},${f2(fc)});` + `tl.to('#${p}sf',{opacity:0,duration:.25},${f2(fc)});` + draw(`#${p}sw`, fc + 0.1, 0.7, 'power2.out') + punch(p, fc + 0.1, 1.05, 0, 50, 0.6); pushSfx(fc + 0.1, 'whoosh', 0.3);
        return o; } }),

    // 가설: 타이어 홈처럼 물을 빼서 잘 잡는다. 홈 사이로 물방울이 빠져나간다 (태그 '가설' 필수)
    tread: s => { let cache = null;
      const mk = (p, t) => { const c = has(t, s.props.cue) ? cueAt(t, s.props.cue) : t.S + 1.5, end = t.S + t.D - 0.1;
        return [0, 1, 2, 3].map(i => stream(p, 'q' + i, [300 + i * 160, 860], [300 + i * 160 + (i < 2 ? -120 : 120), 1060], 3, 0.9, c + 0.3, end, 'drop')); };
      return { trans: s.trans || 'whip',
        html: (p, _F, t) => { cache = mk(p, t);
          return `<div class="mx-qm2" id="${p}q">?</div><div class="mx-tire" id="${p}t">🛞</div><div class="mx-pad" id="${p}pd">${Array.from({ length: 5 }, (_, i) => `<i style="left:${40 + i * 130}px"></i>`).join('')}</div>` +
            `<div class="mx-tg cold" id="${p}l" style="left:190px;top:1080px;width:700px;text-align:center">${esc(s.props.label)}</div>` + cache.map(c => c.html).join('') + tagHtml(s.props.tag); },
        anim: (p, S, D, _M, _F, t) => { const c = has(t, s.props.cue) ? cueAt(t, s.props.cue) : S + 1.5;
          const qc = has(t, s.props.qCue) ? cueAt(t, s.props.qCue) - 0.1 : S + 1.2;
          let o = pop(`#${p}q`, qc, 'pop', 0.35) + `tl.to('#${p}q',{opacity:0,scale:.6,duration:.2,ease:'power2.in'},${f2(c - 0.5)});`;
          o += `tl.fromTo('#${p}t',{x:-500,rotation:-200,opacity:0},{x:0,rotation:0,opacity:1,duration:.7,ease:'expo.out'},${f2(c - 0.4)});`; pushSfx(c - 0.4, 'whoosh', 0.3);
          o += `tl.fromTo('#${p}pd',{opacity:0,y:60},{opacity:1,y:0,duration:.5,ease:'expo.out'},${f2(S + 0.4)});` + `tl.fromTo('#${p}pd i',{scaleY:0},{scaleY:1,transformOrigin:'50% 0%',duration:.4,stagger:.08,ease:'expo.out'},${f2(c)});`;
          o += pop(`#${p}l`, c + 0.8, 'pop', 0.3);
          return o + (cache || mk(p, t)).map(x => x.a).join(''); } }; },

    // 증거 저울: 지지 연구(왼쪽)와 반박 연구(오른쪽)가 차례로 올라가고 저울이 기울었다 돌아온다
    evidence: s => ({ trans: s.trans || 'rise',
      html: p => `<div class="mx-beam" id="${p}bm"><i class="l"></i><i class="r"></i></div><div class="mx-post"></div>` +
        s.props.items.map((it, i) => `<div class="mx-ev ${it.side}" id="${p}e${i}" style="left:${it.side === 'for' ? 80 : 560}px"><b>${it.side === 'for' ? '✔' : '✖'} ${esc(it.year)}</b><span>${esc(it.text)}</span>${it.num != null ? `<em id="${p}n${i}">0${esc(it.unit || '')}</em>` : ''}${it.badge ? `<u id="${p}bd${i}">${esc(it.badge)}</u>` : ''}</div>`).join('') +
        `<div class="mx-verd" id="${p}vd">${esc(s.props.verdict)}</div>`,
      anim: (p, S, D, _M, _F, t) => { let o = `tl.fromTo('#${p}bm',{opacity:0,scaleX:.3},{opacity:1,scaleX:1,duration:.5,ease:'expo.out'},${f2(S + 0.2)});`;
        s.props.items.forEach((it, i) => { const c = has(t, it.cue) ? cueAt(t, it.cue) - 0.2 : S + 0.6 + i * 2.5;
          const nc = has(t, it.numCue) ? cueAt(t, it.numCue) - 0.1 : c + 0.5; // 숫자를 말할 때 세고, 그때 저울이 기운다
          o += `tl.fromTo('#${p}e${i}',{opacity:0,y:-200},{opacity:1,y:0,duration:.5,ease:'power2.in'},${f2(c)});` + `tl.to('#${p}bm',{rotation:${i === 0 ? -7 : 0},duration:.8,ease:'elastic.out(1,0.6)'},${f2(nc)});`;
          pushSfx(c + 0.5, 'thud', 0.4); pushSfx(nc, 'tick', 0.3);
          if (it.badge) o += pop(`#${p}bd${i}`, c + 0.7, 'pop', 0.3);
          if (it.num != null) o += count(`${p}n${i}`, 0, it.num, 0, nc, 0.8, '', it.unit || ''); });
        o += pop(`#${p}vd`, S + D - 1.3, 'ding', 0.35);
        return o; } }),
  };
  return T;
}

export const MORE_CSS = (S0) => `
.mx-emo{display:block;line-height:1.05;filter:drop-shadow(0 20px 30px #0008)}
.mx-ico{position:absolute;width:400px;height:420px;text-align:center}.mx-ico .mx-lb{display:block;font-size:50px;font-weight:800;margin-top:6px}
.mx-ring{position:absolute;left:80px;top:10px;width:240px;height:240px;border-radius:50%;border:8px solid ${S0.cold};opacity:0}.mx-ring.sm{left:470px;top:740px;width:140px;height:140px;border-width:6px;border-color:${S0.ink}}
.mx-water{position:absolute;inset:6%;border-radius:50%;background:radial-gradient(closest-side,#5aa6d6,#2b6b9a);opacity:0}.mx-dimL{position:absolute;left:0;right:0;top:50%;height:4px;background:${S0.orange};transform-origin:50% 50%}.mx-dimL:before,.mx-dimL:after{content:'';position:absolute;top:-12px;width:4px;height:28px;background:${S0.orange}}.mx-dimL:after{right:0}
.mx-qm2{position:absolute;left:0;right:0;top:420px;text-align:center;font-size:220px;font-weight:900;color:${S0.orange};opacity:0}
.mx-swirl{position:absolute;overflow:visible}.mx-swirl path{fill:none;stroke:currentColor;stroke-width:9;stroke-linecap:round}.mx-swirl circle{fill:currentColor}
.mx-ico .mx-swirl{opacity:.85}
.mx-mid{position:absolute;left:470px;top:760px;width:140px;text-align:center;font-size:110px;font-weight:900;color:${S0.orange}}
.mx-head{position:absolute;left:0;top:0;width:1080px;height:1920px;overflow:visible}.mx-head .hd{fill:#ffffff0d;stroke:#cfd8e6;stroke-width:8}.mx-head .ear{fill:#ffffff10;stroke:#cfd8e6;stroke-width:6}.mx-head .mo{fill:none;stroke:#cfd8e6;stroke-width:8;stroke-linecap:round}.mx-head .nk{stroke:#cfd8e6;stroke-width:8}
.mx-head .ap{fill:none;stroke:${S0.cold};stroke-width:8;stroke-dasharray:2400;stroke-dashoffset:2400;stroke-linecap:round}.mx-head .bp{fill:none;stroke:${S0.orange};stroke-width:8;stroke-dasharray:2400;stroke-dashoffset:2400;stroke-linecap:round}.mx-head .bp.off{stroke:#56627c}
.mx-head .co{fill:#fca31155;stroke:${S0.orange};stroke-width:4}
.pt.air{background:${S0.cold};box-shadow:0 0 16px ${S0.cold};width:22px;height:22px;margin:-11px 0 0 -11px}.pt.bone{background:${S0.orange}}
.mx-tg{position:absolute;font-size:44px;font-weight:900;opacity:0}.mx-tg.air,.mx-tg.cold{color:${S0.cold}}.mx-tg.bone,.mx-tg.warm{color:${S0.orange}}
.mx-mic{position:absolute;left:760px;top:840px;font-size:120px;opacity:0}.mx-x{position:absolute;left:330px;top:700px;font-size:120px;font-weight:900;color:#ff5a5a;opacity:0}
.mx-wl{position:absolute;left:80px;right:80px;font-size:46px;font-weight:800;opacity:0}.mx-wl em{font-style:normal;display:inline-block;background:${S0.orange};color:#14213d;border-radius:14px;padding:2px 16px;font-size:36px;opacity:0}
.mx-wv{position:absolute;left:60px;width:960px;height:200px;overflow:hidden}.mx-wv svg{width:2200px;height:200px}.mx-wv path{fill:none;stroke-linecap:round;stroke-dasharray:9000;stroke-dashoffset:9000}
.mx-card{position:absolute;width:260px;height:230px;border-radius:26px;background:#ffffff0d;border:5px solid ${S0.line};text-align:center;padding-top:30px;opacity:0}.mx-card svg{width:200px;height:80px}.mx-card path{fill:none;stroke:${S0.mute};stroke-width:5}.mx-card b{display:block;font-size:46px;font-weight:900;color:${S0.mute};margin-top:10px}
.mx-card.own path{stroke:${S0.orange}}.mx-card.own b{color:${S0.orange};opacity:0}
.mx-res{position:absolute;left:70px;right:70px;top:1030px;text-align:center;font-size:50px;font-weight:900;color:${S0.ink};opacity:0}
.mx-globe{position:absolute;left:290px;top:480px;width:500px;height:500px;border-radius:50%;overflow:hidden;background:radial-gradient(circle at 35% 30%,#2f6fb1,#163b6b 70%);box-shadow:0 0 60px #7fd3ff33,inset -40px -30px 80px #0008}
.mx-land{position:absolute;left:0;top:0;width:1620px;height:500px;background:radial-gradient(60px 90px at 120px 160px,#3f9a5a 60%,transparent 62%),radial-gradient(90px 70px at 330px 320px,#3f9a5a 60%,transparent 62%),radial-gradient(70px 110px at 640px 200px,#3f9a5a 60%,transparent 62%),radial-gradient(60px 90px at 660px 160px,#3f9a5a 60%,transparent 62%),radial-gradient(90px 70px at 870px 320px,#3f9a5a 60%,transparent 62%),radial-gradient(70px 110px at 1180px 200px,#3f9a5a 60%,transparent 62%),radial-gradient(60px 90px at 1200px 160px,#3f9a5a 60%,transparent 62%),radial-gradient(90px 70px at 1410px 320px,#3f9a5a 60%,transparent 62%);opacity:.75}
.mx-globe .eq{position:absolute;left:0;right:0;top:248px;height:4px;background:#ffffffaa}.mx-eqL{position:absolute;left:800px;top:705px;font-size:34px;font-weight:800;color:${S0.mute}}
.mx-bowl{position:absolute;left:220px;top:500px;width:640px;height:480px;border-radius:50%;background:radial-gradient(closest-side,#bfe6ff 0%,#7fb8e0 55%,#e9eef5 57%,#cfd8e6 75%,#8c99aa 100%);box-shadow:0 30px 60px #0009}
.mx-jet{position:absolute;margin:-20px 0 0 -20px;font-style:normal;font-size:40px;color:#ffffff;opacity:.25}
.mx-big{position:absolute;left:120px;top:440px;width:380px;text-align:center;opacity:0}.mx-big b{display:block;font-size:380px;line-height:1;color:${S0.orange}}.mx-big span{font-size:50px;font-weight:900}
.mx-dot{position:absolute;left:760px;top:700px;width:10px;height:10px;border-radius:50%;background:${S0.cold};opacity:0}.mx-dotL{position:absolute;left:640px;top:740px;width:250px;text-align:center;font-size:36px;font-weight:800;color:${S0.cold};opacity:0}
.mx-lens{position:absolute;left:590px;top:420px;width:340px;height:340px;border-radius:50%;border:12px solid ${S0.ink};background:#14213dee;text-align:center;padding-top:60px;opacity:0;box-shadow:0 20px 60px #000a}.mx-lens b{display:block;font-size:130px;line-height:1;color:${S0.cold}}.mx-lens span{font-size:34px;font-weight:800;color:${S0.cold}}
.mx-ratio{position:absolute;left:150px;right:150px;top:930px;text-align:center;padding:10px 30px;border:9px solid ${S0.orange};border-radius:28px;color:${S0.orange};font-size:74px;font-weight:900;background:#14213dcc;opacity:0;font-variant-numeric:tabular-nums}
.mx-bs{position:absolute;border-radius:50%;background:radial-gradient(closest-side,#33465f,#24344a 80%,#cfd8e6 82%,#8c99aa 100%);box-shadow:0 30px 60px #0009;opacity:0}.mx-bs .dim{position:absolute;left:0;right:0;bottom:-70px;text-align:center;font-style:normal;font-size:40px;font-weight:800;color:${S0.mute}}
.mx-swirlIn{position:absolute;left:15%;top:15%;width:70%;height:70%;overflow:visible;opacity:0}.mx-swirlIn path{fill:none;stroke:#e8f6ff;stroke-width:8;stroke-linecap:round}
.mx-cap{position:absolute;top:300px;text-align:center;font-size:44px;font-weight:900;color:${S0.ink};opacity:0}
.mx-clock{position:absolute;left:0;right:0;top:1060px;text-align:center;font-size:50px;font-weight:900;color:${S0.orange};opacity:0;font-variant-numeric:tabular-nums}
.mx-fg{position:absolute;top:470px;width:340px;text-align:center;opacity:0}.mx-fg svg{width:340px;height:560px;overflow:visible}.mx-fg .skin{fill:#f2c9a5;stroke:#c48c66;stroke-width:6}.mx-fg .wr{fill:none;stroke:#b3785a;stroke-width:6;stroke-linecap:round;stroke-dasharray:2400;stroke-dashoffset:2400}
.mx-fg .nv{stroke:#ffd23f;stroke-width:8;stroke-dasharray:14 10}.mx-fg .cutx{font-size:56px;opacity:0}.mx-fg b{display:block;font-size:40px;font-weight:800;margin-top:-30px}
.mx-sec{position:absolute;left:0;top:0;width:1080px;height:1920px;overflow:visible}.mx-sec .tis{fill:#f2c9a5}.mx-sec .sf{fill:none;stroke:#c48c66;stroke-width:12}.mx-sec .sw{fill:none;stroke:#b3785a;stroke-width:12;stroke-dasharray:2400;stroke-dashoffset:2400}
.mx-sec .vs{fill:#e0575b;stroke:#a32c34;stroke-width:4}.mx-sec .nv2{stroke:#ffd23f;stroke-width:10;stroke-dasharray:18 12}.mx-sec .sig{fill:#fff6a8;filter:drop-shadow(0 0 12px #ffd23f)}
.mx-tire{position:absolute;left:390px;top:330px;font-size:300px;line-height:1;opacity:0}
.mx-pad{position:absolute;left:190px;top:760px;width:700px;height:120px;border-radius:60px 60px 20px 20px;background:#f2c9a5;opacity:0}.mx-pad i{position:absolute;top:0;width:28px;height:120px;background:#b3785a;border-radius:0 0 14px 14px}
.mx-beam{position:absolute;left:140px;top:820px;width:800px;height:18px;border-radius:9px;background:${S0.ink};transform-origin:50% 50%;opacity:0}.mx-post{position:absolute;left:525px;top:830px;width:30px;height:250px;background:${S0.line};border-radius:8px}
.mx-ev{position:absolute;top:470px;width:440px;min-height:300px;border-radius:26px;padding:24px;background:#ffffff0d;border:5px solid ${S0.line};opacity:0}.mx-ev b{display:block;font-size:44px;font-weight:900}.mx-ev.for b{color:#5fd38d}.mx-ev.against b{color:#ff7a7a}.mx-ev span{display:block;font-size:38px;font-weight:700;margin-top:10px;line-height:1.3}.mx-ev em{display:block;font-style:normal;font-size:72px;font-weight:900;color:${S0.orange};font-variant-numeric:tabular-nums}
.mx-ev u{display:inline-block;text-decoration:none;margin-top:12px;font-size:40px;font-weight:900;color:${S0.ink};background:#ffffff14;border-radius:16px;padding:4px 16px;opacity:0}
.mx-stars{position:absolute;width:260px;text-align:center}.mx-stars i{display:inline-block;font-style:normal;font-size:56px;color:${S0.orange};margin:0 4px;opacity:0;text-shadow:0 0 18px #fca31188}
.mx-verd{position:absolute;left:70px;right:130px;top:1090px;text-align:center;font-size:46px;font-weight:900;color:${S0.orange};opacity:0}
`;
