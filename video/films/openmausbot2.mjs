// v2 format (problem -> result -> use/skip). Facts as of 2026-10-30 KST. Run: node video/films/openmausbot2.mjs out
import * as H from '../hf-video.mjs';
import { runFilm } from './studio.mjs';
export const plan = {
  id: 'film-openmausbot-v2-2026-10-30', title: 'A team of AI bots, each with its own computer. OpenMausBot #shorts',
  images: { hero: { url: 'https://raw.githubusercontent.com/milind-soni/OpenMausBot/HEAD/docs/screenshots/hero.png', w: 2880, h: 1800 }, computer: { url: 'https://raw.githubusercontent.com/milind-soni/OpenMausBot/HEAD/docs/screenshots/computer-panel.png', w: 2880, h: 1800 }, approval: { url: 'https://raw.githubusercontent.com/milind-soni/OpenMausBot/HEAD/docs/screenshots/approval-card.png', w: 2880, h: 1800 } },
  credits: 'Repo: github.com/milind-soni/OpenMausBot (Apache-2.0); screens from its README. Music: "Lofi Loop Scoop" by Seth_Makes_Sounds (CC0). Sounds: CC0.',
  blocks: [
    { type: 'hookProblem', say: "One AI assistant in one chat box. OpenMausBot says that's the wrong shape for agents.", ko: 'AI 비서 하나, 채팅창 하나. OpenMausBot은 그게 에이전트한테 맞지 않는 모양이래요.',
      img: 'hero', imgBg: '#111', r0: [0.2, 0, 0.8, 0.95], r1: [0.22, 0.03, 0.75, 0.6], title: 'OpenMausBot', badge: '+1.2k ⭐ today',
      tells: [{ word: 'One AI', text: 'one assistant', pos: [80, 300] }, { word: 'one chat', text: 'one box', pos: [600, 560] }] },
    { type: 'cuts', intro: 'wow', say: 'Instead you get a team of bots, each a real Claude or Codex agent, with its own computer, and they ask before they act.', ko: '대신 봇 팀이 생겨요. 봇마다 진짜 Claude나 Codex 에이전트고, 자기 컴퓨터가 있고, 행동하기 전에 물어봐요.', h: 700, imgBg: '#111',
      cuts: [{ word: 'team', img: 'hero', r: [0, 0.02, 0.5, 0.5], label: 'A TEAM OF BOTS' }, { word: 'own computer', img: 'computer', r: [0.6, 0.02, 1, 0.5], label: 'OWN COMPUTER' }, { word: 'ask', img: 'approval', r: [0.27, 0.08, 0.9, 0.58], label: 'ASKS FIRST' }] },
    { type: 'term', say: 'Install it with npm.', ko: 'npm으로 설치하면 돼요.', cmds: ['npm install -g openmausbot', 'openmausbot'] },
    { type: 'useSkip', say: ['Use it if you already use Claude Code or Codex and want a team of bots on your own logins.', 'Skip it if you want something polished. The team calls it early.', "And on Windows, the installer isn't code-signed yet, so expect a warning."],
      ko: ['이미 Claude Code나 Codex를 쓰고, 내 계정으로 봇 팀을 돌리고 싶다면 쓰세요.', '완성도 높은 걸 원하면 건너뛰세요. 개발팀도 아직 초기라고 해요.', '그리고 윈도우 설치 파일은 아직 서명이 안 돼서 경고가 떠요.'],
      cards: [{ kind: 'use', text: 'you use Claude Code or Codex and want a team of bots on your own logins' }, { kind: 'skip', text: 'you want polished. The team calls it early' }, { kind: 'warn', text: "the Windows installer isn't code-signed yet (SmartScreen warning)" }],
      evidence: ['7,416 commits · 90 days', '161 contributors', '90 releases in 11 weeks'], stamp: 'MOVING FAST' },
    { type: 'end', say: 'Would you give an AI bot its own computer?', ko: 'AI 봇한테 자기 컴퓨터를 줄 거예요?', head: 'Would you give an AI<br>its own computer?' },
  ] };
if (/openmausbot2\.mjs$/.test(process.argv[1] || '')) runFilm(H, plan, process.argv[2]).catch(e => { console.error(e); process.exit(1); });
