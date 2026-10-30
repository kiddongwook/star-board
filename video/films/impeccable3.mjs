// Impeccable v3: how it works (animated flow) + how to use (steps), grounded in the README. Facts as of 2026-10-30 KST.
import * as H from '../hf-video.mjs';
import { runFilm } from './studio.mjs';
export const plan = {
  id: 'film-impeccable-v3-2026-10-30', title: 'How Impeccable stops your AI from building the same website #shorts',
  images: { without: { url: 'https://github.com/pbakaus/impeccable/raw/main/docs/images/readme-without.webp', w: 1440, h: 1080, ext: 'webp' }, with: { url: 'https://github.com/pbakaus/impeccable/raw/main/docs/images/readme-with.webp', w: 1440, h: 891, ext: 'webp' } },
  credits: 'Repo: github.com/pbakaus/impeccable (Apache-2.0); before/after images, workflow (init -> PRODUCT.md, design hook with 62 rules, commands) from its README. Diagrams are illustrations of the README description. Music: "Lofi Loop Scoop" by Seth_Makes_Sounds (CC0). Sounds: CC0.',
  blocks: [
    { type: 'hookProblem', say: 'Ask an AI for a website, and you get this: cream page, thin serif, pill buttons.', ko: 'AI한테 웹사이트를 시키면 이렇게 나와요. 크림색 배경, 얇은 세리프, 알약 버튼.',
      img: 'without', r0: [0, 0, 1, 1], r1: [0, 0, 1, 0.75], title: 'what your agent builds', badge: '+2.9k ⭐ today',
      tells: [{ word: 'cream', text: 'cream page', pos: [600, 300] }, { word: 'serif', text: 'thin serif', pos: [80, 560] }, { word: 'pill', text: 'pill buttons', pos: [560, 800] }] },
    { type: 'beforeAfter', say: 'Same model, same brief, plus Impeccable. Now the page is built around one picture.', ko: '같은 모델, 같은 요청에 Impeccable만 더했어요. 이제 페이지가 사진 한 장을 중심으로 짜여요.',
      before: 'without', after: 'with', beforeWord: 'Same', afterWord: 'plus', beforeLabel: 'WITHOUT', afterLabel: 'WITH IMPECCABLE', afterX: 560, topChip: 'same model (Fable 5.1) · same brief' },
    { type: 'flow', head: 'How it works', tag: 'diagram',
      say: ['You run init once. It reads your code and writes a PRODUCT.md.', 'Then every UI file your agent edits is checked against 62 rules, no AI, and the findings go back before it is done.'],
      ko: ['init을 한 번 실행하면, 코드를 읽고 PRODUCT.md를 써요.', '그 뒤로 에이전트가 UI 파일을 고칠 때마다 62개 규칙으로 검사하고(AI 없이), 끝나기 전에 결과를 돌려줘요.'],
      tts: ['You run init once. It reads your code and writes a product dot M D.', 'Then every UI file your agent edits is checked against sixty-two rules, no AI, and the findings go back before it is done.'],
      nodes: [{ id: 'init', icon: '⌨️', label: '/impeccable init', sub: 'once per project', x: 60, y: 250, w: 430, word: 'init' }, { id: 'read', icon: '📂', label: 'reads your code', x: 590, y: 250, w: 430, word: 'reads' }, { id: 'prod', icon: '📄', label: 'PRODUCT.md', sub: "who it's for, constraints", x: 590, y: 450, w: 430, word: 'PRODUCT' },
        { id: 'edit', icon: '🤖', label: 'agent edits UI', kind: 'dark', x: 60, y: 650, w: 430, word: 'edits', s: 1 }, { id: 'hook', icon: '🔍', label: 'design hook', sub: '62 rules · no LLM', kind: 'hot', x: 590, y: 650, w: 430, word: 'rules', s: 1 }, { id: 'back', icon: '↩️', label: 'findings back', sub: 'before "done"', x: 325, y: 850, w: 430, word: 'findings', s: 1 }],
      edges: [['init', 'read'], ['read', 'prod'], ['edit', 'hook'], ['hook', 'back'], ['back', 'edit', -330]] },
    { type: 'usage', tag: 'how you use it',
      say: ['Install it once, then type bolder plus a target, and it loads a playbook for that one move.', 'Or run critique for a scored review, with the fixes ranked.'],
      ko: ['한 번 설치하고 bolder와 대상을 입력하면, 그 동작 전용 플레이북을 불러와요.', '아니면 critique로 점수 매긴 리뷰와 고칠 순서를 받아요.'],
      steps: [{ cmd: 'npx impeccable install', text: 'install once per project', word: 'Install' }, { cmd: '/impeccable bolder the pricing cards', text: 'name the move and the target', word: 'bolder' }, { text: 'loads a playbook for that one move', word: 'playbook' }, { cmd: '/impeccable critique the onboarding flow', text: 'scored review, fixes ranked', word: 'critique', s: 1 }] },
    { type: 'useSkip', say: ["Use it if your agent's UI all looks the same. Skip it for a brand-new site.", 'And note: in Claude Code its hooks run even if you deny a command.'],
      ko: ['에이전트가 만든 UI가 다 비슷해 보이면 쓰세요. 완전히 새 사이트라면 건너뛰세요.', '참고로 Claude Code에서는 명령을 거부해도 훅이 실행돼요.'],
      cards: [{ kind: 'use', text: 'your agent builds UI and it all looks the same', s: 0 }, { kind: 'skip', text: 'you need a brand-new site. It shines on pages you already have', s: 0 }, { kind: 'warn', text: 'in Claude Code its hooks run even when you deny a command', s: 1 }],
      evidence: ['1,241 commits · 90 days', '94% issues closed', 'used by 81 repos'], stamp: 'ACTUALLY USED' },
    { type: 'end', say: 'Bolder or polish, which would you try first?', ko: 'bolder랑 polish, 뭐부터 써 볼래요?', head: 'bolder or polish?<br>Which first?' },
  ] };
if (/impeccable3\.mjs$/.test(process.argv[1] || '')) runFilm(H, plan, process.argv[2]).catch(e => { console.error(e); process.exit(1); });
