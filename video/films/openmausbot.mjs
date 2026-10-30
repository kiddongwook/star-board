// Directed short (facts as of 2026-10-30 KST). Run: node video/films/openmausbot.mjs out
import * as H from '../hf-video.mjs';
import { runFilm } from './studio.mjs';
export const plan = {
  id: 'film-openmausbot-2026-10-30', title: 'OpenMausBot: a team of AI bots, each with its own computer #shorts',
  images: { hero: { url: 'https://raw.githubusercontent.com/milind-soni/OpenMausBot/HEAD/docs/screenshots/hero.png', w: 2880, h: 1800 }, computer: { url: 'https://raw.githubusercontent.com/milind-soni/OpenMausBot/HEAD/docs/screenshots/computer-panel.png', w: 2880, h: 1800 }, approval: { url: 'https://raw.githubusercontent.com/milind-soni/OpenMausBot/HEAD/docs/screenshots/approval-card.png', w: 2880, h: 1800 } },
  credits: 'Repo: github.com/milind-soni/OpenMausBot (Apache-2.0); screens from its README. Music: "Lofi Loop Scoop" by Seth_Makes_Sounds (CC0). Sounds: CC0.',
  blocks: [
    { type: 'hook', say: "A team of AI bots, each with its own computer, and it's open source.", ko: 'AI 봇 팀인데, 봇마다 자기 컴퓨터가 있어요. 게다가 오픈소스예요.', img: 'hero', imgBg: '#111', r0: [0, 0, 1, 1], r1: [0, 0.02, 0.5, 0.5], title: 'OpenMausBot', stat: '+1.2k <span style="font-size:.62em">⭐</span>', tag: 'open source', tagWord: 'open source', name: 'OpenMausBot', owner: 'milind-soni' },
    { type: 'promise', say: "Here's why OpenMausBot is trending, what it does, and whether it's real.", ko: 'OpenMausBot이 왜 뜨는지, 뭘 하는지, 진짜인지 볼게요.', items: [['why', 'Why is it trending?'], ['what it does', 'What does it do?'], ['whether', "Is it real?"]] },
    { type: 'why', say: "It's an open-source take on Grok Bot, only eleven weeks old, with 8,393 new stars this week.", ko: 'Grok Bot의 오픈소스 버전인데, 나온 지 11주 만에 이번 주에만 스타 8,393개가 붙었어요.', tts: "It's an open-source take on Grok Bot, only eleven weeks old, with eight thousand three hundred ninety-three new stars this week.",
      release: { tag: 'v0.1.133', when: 'Latest · Oct 29, 2026', notes: 'Open-source alternative to Grok Bot, Meta Muse, OpenAI dots and Cue', word: 'Grok' }, counter: { value: 8393, label: 'stars this week', word: '8,393' } },
    { type: 'cuts', intro: 'wow', say: 'Every bot is a real agent, Claude or Codex, running on your machine. Each one gets its own computer, and it asks before it acts.', ko: '봇 하나하나가 내 컴퓨터에서 돌아가는 진짜 에이전트(Claude나 Codex)예요. 봇마다 자기 컴퓨터가 있고, 행동하기 전에 먼저 물어봐요.', h: 700, imgBg: '#111',
      cuts: [{ word: 'Every bot', img: 'hero', r: [0, 0.02, 0.5, 0.5], label: 'REAL AGENTS' }, { word: 'own computer', img: 'computer', r: [0.6, 0.02, 1, 0.5], label: 'OWN COMPUTER' }, { word: 'asks', img: 'approval', r: [0.27, 0.08, 0.9, 0.58], label: 'ASKS FIRST' }] },
    { type: 'term', say: 'Install it with npm.', ko: 'npm으로 설치하면 돼요.', cmds: ['npm install -g openmausbot', 'openmausbot'] },
    { type: 'turn', say: 'Okay, but is it real?', ko: '좋아요. 근데 진짜일까요?', head: 'Okay,<br>but is it<br>real?', headWord: 'is it' },
    { type: 'verdict', say: ['7,416 commits in three months, from 161 contributors.', 'And a new release almost every day.', "That's a project moving fast."], ko: ['3개월 커밋 7,416개, 참여자 161명.', '거의 매일 새 버전이 나와요.', '엄청 빠르게 움직이는 프로젝트예요.'],
      tts: ['Seven thousand four hundred sixteen commits in three months, from one hundred sixty-one contributors.', 'And a new release almost every day.', "That's a project moving fast."],
      stats: [['commits', '7,416', 'commits · 90 days', 0], ['contributors', '161', 'contributors', 0], ['release', '90', 'releases in 11 weeks', 1]], stamp: 'MOVING FAST' },
    { type: 'end', say: 'Would you give an AI bot its own computer? Tell me below.', ko: 'AI 봇한테 자기 컴퓨터를 줄 거예요? 댓글로 알려 주세요.', head: 'Would you give an AI<br>its own computer?' },
  ] };
if (/openmausbot\.mjs$/.test(process.argv[1] || '')) runFilm(H, plan, process.argv[2]).catch(e => { console.error(e); process.exit(1); });
