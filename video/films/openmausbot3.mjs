// openmausbot v3: how it works (animated flow) + how to use (steps), grounded in the README. Facts as of 2026-10-30 KST.
import * as H from '../hf-video.mjs';
import { runFilm } from './studio.mjs';
export const plan = {
  id: 'film-openmausbot-v3-2026-10-30', title: 'A team of AI bots, each with its own computer. OpenMausBot #shorts',
  images: { hero: { url: 'https://raw.githubusercontent.com/milind-soni/OpenMausBot/HEAD/docs/screenshots/hero.png', w: 2880, h: 1800 }, computer: { url: 'https://raw.githubusercontent.com/milind-soni/OpenMausBot/HEAD/docs/screenshots/computer-panel.png', w: 2880, h: 1800 }, approval: { url: 'https://raw.githubusercontent.com/milind-soni/OpenMausBot/HEAD/docs/screenshots/approval-card.png', w: 2880, h: 1800 } },
  credits: 'Diagram follows the README How it works architecture (app, harness server, CLIs, permission broker, cloud computer). Repo: github.com/milind-soni/OpenMausBot (Apache-2.0); screens from its README. Music: "Lofi Loop Scoop" by Seth_Makes_Sounds (CC0). Sounds: CC0.',
  blocks: [
    { type: 'hookProblem', say: "One AI assistant in one chat box. OpenMausBot says that's the wrong shape for agents.", ko: 'AI 비서 하나, 채팅창 하나. OpenMausBot은 그게 에이전트한테 맞지 않는 모양이래요.',
      img: 'hero', imgBg: '#111', r0: [0.2, 0, 0.8, 0.95], r1: [0.22, 0.03, 0.75, 0.6], title: 'OpenMausBot', badge: '+1.2k ⭐ today',
      tells: [{ word: 'One AI', text: 'one assistant', pos: [80, 300] }, { word: 'one chat', text: 'one box', pos: [600, 560] }] },
    { type: 'cuts', intro: 'wow', say: 'Instead you get a team of bots, each a real Claude or Codex agent, with its own computer, and they ask before they act.', ko: '대신 봇 팀이 생겨요. 봇마다 진짜 Claude나 Codex 에이전트고, 자기 컴퓨터가 있고, 행동하기 전에 물어봐요.', h: 700, imgBg: '#111',
      cuts: [{ word: 'team', img: 'hero', r: [0, 0.02, 0.5, 0.5], label: 'A TEAM OF BOTS' }, { word: 'own computer', img: 'computer', r: [0.6, 0.02, 1, 0.5], label: 'OWN COMPUTER' }, { word: 'ask', img: 'approval', r: [0.27, 0.08, 0.9, 0.58], label: 'ASKS FIRST' }] },
    { type: 'flow', head: 'How it works', tag: 'diagram',
      say: ['The app talks to a local harness server, which runs Claude, Codex or Grok from their CLIs.', 'Risky actions go through a permission broker, and each bot can get its own cloud computer.'],
      ko: ['앱은 로컬 하네스 서버와 통신하고, 서버가 Claude, Codex, Grok을 각자의 CLI로 돌려요.', '위험한 동작은 권한 브로커를 거치고, 봇마다 클라우드 컴퓨터를 붙일 수 있어요.'],
      nodes: [{ id: 'app', icon: '💬', label: 'chat app', x: 60, y: 260, w: 430, word: 'app' }, { id: 'hs', icon: '🧩', label: 'harness server', sub: 'local · 127.0.0.1', kind: 'dark', x: 590, y: 260, w: 430, word: 'harness' },
        { id: 'cli', icon: '⌨️', label: 'claude · codex · grok', sub: 'your own CLIs', x: 590, y: 500, w: 430, word: 'CLIs' }, { id: 'pb', icon: '🙋', label: 'permission broker', sub: 'asks you first', kind: 'hot', x: 60, y: 500, w: 430, word: 'permission', s: 1 },
        { id: 'pc', icon: '🖥️', label: 'cloud computer', sub: 'one per bot', x: 325, y: 750, w: 430, word: 'computer', s: 1 }],
      edges: [['app', 'hs'], ['hs', 'cli'], ['cli', 'pb'], ['pb', 'app'], ['hs', 'pc']] },
    { type: 'usage', tag: 'how you use it',
      say: ['Install it with npm and run it.', 'Pick your AI access and a model, then chat with your bots.'],
      ko: ['npm으로 설치하고 실행해요.', 'AI 접속 방식과 모델을 고르고, 봇들과 대화하면 돼요.'],
      steps: [{ cmd: 'npm install -g openmausbot', text: 'install (Node 24 or newer)', word: 'Install' }, { cmd: 'openmausbot', text: 'first launch guides you', word: 'run' }, { text: 'choose AI access and a model', word: 'Pick', s: 1 }, { text: 'chat with your bots', word: 'chat', s: 1 }] },
    { type: 'useSkip', say: ["Use it if you already run Claude Code or Codex. Skip it if you want polished; it's early.", 'On Windows, expect a warning: the installer is not code-signed yet.'],
      ko: ['이미 Claude Code나 Codex를 쓴다면 쓰세요. 완성도를 원하면 건너뛰세요. 아직 초기예요.', '윈도우에선 경고가 떠요. 설치 파일이 아직 서명 전이에요.'],
      cards: [{ kind: 'use', text: 'you use Claude Code or Codex and want a team of bots', s: 0 }, { kind: 'skip', text: 'you want polished. The team calls it early', s: 0 }, { kind: 'warn', text: "the Windows installer isn't code-signed yet", s: 1 }],
      evidence: ['7,416 commits · 90 days', '161 contributors', '90 releases in 11 weeks'], stamp: 'MOVING FAST' },
    { type: 'end', say: 'Would you give an AI bot its own computer?', ko: 'AI 봇한테 자기 컴퓨터를 줄 거예요?', head: 'Would you give an AI<br>its own computer?' },
  ] };
if (/openmausbot3\.mjs$/.test(process.argv[1] || '')) runFilm(H, plan, process.argv[2]).catch(e => { console.error(e); process.exit(1); });
