// Impeccable v2: use/skip verdict, less format, more product (facts as of 2026-10-30 KST)
import * as H from '../hf-video.mjs';
import { runFilm } from './studio.mjs';
export const plan = {
  id: 'film-impeccable-v2-2026-10-30', title: 'Your AI makes every website look the same. Impeccable fixes it #shorts',
  images: { without: { url: 'https://github.com/pbakaus/impeccable/raw/main/docs/images/readme-without.webp', w: 1440, h: 1080, ext: 'webp' }, with: { url: 'https://github.com/pbakaus/impeccable/raw/main/docs/images/readme-with.webp', w: 1440, h: 891, ext: 'webp' } },
  credits: 'Repo: github.com/pbakaus/impeccable (Apache-2.0); before/after images and the comparison setup (same model, same brief) from its README. Music: "Lofi Loop Scoop" by Seth_Makes_Sounds (CC0). Sounds: CC0.',
  blocks: [
    { type: 'hookProblem', say: 'Ask an AI for a website, and you get this: cream page, thin serif, pill buttons.', ko: 'AI한테 웹사이트를 시키면 이렇게 나와요. 크림색 배경, 얇은 세리프, 알약 버튼.',
      img: 'without', r0: [0, 0, 1, 1], r1: [0, 0, 1, 0.75], title: 'what your agent builds', badge: '+2.9k ⭐ today',
      tells: [{ word: 'Cream', text: 'cream page', pos: [600, 300] }, { word: 'serif', text: 'thin serif', pos: [80, 560] }, { word: 'pill', text: 'pill buttons', pos: [560, 800] }] },
    { type: 'beforeAfter', say: 'Same model, same brief, plus Impeccable. Now the whole page is built around one picture.', ko: '같은 모델, 같은 요청에 Impeccable만 더했어요. 이제 페이지 전체가 사진 한 장을 중심으로 짜여요.',
      before: 'without', after: 'with', beforeWord: 'Same', afterWord: 'plus', beforeLabel: 'WITHOUT', afterLabel: 'WITH IMPECCABLE', afterX: 560, h: 720, topChip: 'same model (Fable 5.1) · same brief' },
    { type: 'chips', say: 'Then steer it with words: bolder, quieter, polish, critique.', ko: '그다음엔 말로 다듬어요. bolder, quieter, polish, critique.', head: 'Steer it with words',
      chips: [{ cmd: 'bolder', desc: 'amplifies safe designs', word: 'bolder' }, { cmd: 'quieter', desc: 'tones down loud ones', word: 'quieter' }, { cmd: 'polish', desc: 'final pass before shipping', word: 'polish' }, { cmd: 'critique', desc: 'a scored UX review', word: 'critique' }] },
    { type: 'term', tail: 1.9, say: 'Installing takes one command.', ko: '설치는 명령어 한 줄이에요.', cmds: ['npx impeccable install', '/impeccable critique the pricing cards'] },
    { type: 'useSkip', say: ['Use it if your agent builds UI and it all looks the same.', "Skip it for a brand-new site. It's best at polishing pages you already have.", 'And check its hooks: in Claude Code, they run even if you deny a command.'],
      ko: ['에이전트로 UI를 만드는데 다 비슷해 보인다면 쓰세요.', '완전히 새 사이트라면 건너뛰세요. 이미 있는 페이지를 다듬는 데 가장 강해요.', '그리고 훅을 확인하세요. Claude Code에서는 명령을 거부해도 훅이 실행돼요.'],
      cards: [{ kind: 'use', text: 'your agent builds UI and it all looks the same' }, { kind: 'skip', text: 'you need a brand-new site. It shines on pages you already have' }, { kind: 'warn', text: 'in Claude Code its hooks run even when you deny a command' }],
      evidence: ['1,241 commits · 90 days', '94% issues closed', 'used by 81 repos'], stamp: 'ACTUALLY USED' },
    { type: 'end', say: 'Bolder or polish, which would you try first?', ko: 'bolder랑 polish, 뭐부터 써 볼래요?', head: 'bolder or polish?<br>Which first?' },
  ] };
if (/impeccable2\.mjs$/.test(process.argv[1] || '')) runFilm(H, plan, process.argv[2]).catch(e => { console.error(e); process.exit(1); });
