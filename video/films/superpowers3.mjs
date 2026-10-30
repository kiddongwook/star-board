// superpowers v3: how it works (animated flow) + how to use (steps), grounded in the README. Facts as of 2026-10-30 KST.
import * as H from '../hf-video.mjs';
import { runFilm } from './studio.mjs';
export const plan = {
  id: 'film-superpowers-v3-2026-10-30', title: 'Stop your coding agent from jumping straight into code. Superpowers #shorts',
  images: { og: { url: 'https://opengraph.githubassets.com/1/obra/superpowers', w: 1200, h: 600 } },
  credits: 'Diagram illustrates the README How it works / Basic Workflow sections. Repo: github.com/obra/superpowers (MIT). Music: "Lofi Loop Scoop" by Seth_Makes_Sounds (CC0). Sounds: CC0.',
  blocks: [
    { type: 'hookProblem', say: 'Most coding agents jump straight into code. Superpowers makes yours stop and ask first.', ko: '코딩 에이전트는 대부분 바로 코드부터 짜요. Superpowers는 먼저 멈추고 물어보게 해요.',
      img: 'og', r0: [0, 0, 1, 1], r1: [0.03, 0.08, 0.7, 0.62], title: 'github.com/obra/superpowers', badge: '308k ⭐',
      tells: [{ word: 'jump', text: '❌ jumps into code', pos: [80, 560] }, { word: 'ask', text: '✅ asks first', pos: [560, 800] }] },
    { type: 'flow', head: 'How it works', tag: 'diagram',
      say: ['When you start building, it asks what you really want, then shows a design in short chunks for you to sign off.', 'Next it writes a plan of tiny tasks, and subagents build each one test-first, with a review after every task.'],
      ko: ['만들기 시작하면 먼저 진짜 원하는 게 뭔지 묻고, 설계를 짧게 나눠 보여 주며 승인을 받아요.', '그다음 작은 작업 계획을 쓰고, 서브에이전트가 작업마다 테스트부터 짜서 만들고, 작업이 끝날 때마다 리뷰해요.'],
      nodes: [{ id: 'idea', icon: '💬', label: 'you start building', x: 60, y: 250, w: 430, word: 'building' }, { id: 'ask', icon: '❓', label: 'brainstorm', sub: 'asks first', x: 590, y: 250, w: 430, word: 'asks' }, { id: 'des', icon: '📝', label: 'design', sub: 'you sign off', x: 590, y: 450, w: 430, word: 'design' },
        { id: 'plan', icon: '🗒️', label: 'plan', sub: '2–5 min tasks', x: 60, y: 650, w: 430, word: 'plan', s: 1 }, { id: 'sub', icon: '🤖', label: 'subagent builds', sub: 'test-first', kind: 'dark', x: 590, y: 650, w: 430, word: 'subagents', s: 1 }, { id: 'rev', icon: '✅', label: 'review', sub: 'after every task', kind: 'hot', x: 325, y: 850, w: 430, word: 'review', s: 1 }],
      edges: [['idea', 'ask'], ['ask', 'des'], ['des', 'plan'], ['plan', 'sub'], ['sub', 'rev'], ['rev', 'sub', 300]] },
    { type: 'usage', tag: 'how you use it',
      say: ['Install it in one line, then just describe what you want to build.', 'Approve the design, say go, and let it work.'],
      ko: ['한 줄로 설치하고, 만들고 싶은 걸 그냥 설명하면 돼요.', '설계를 승인하고 "go"라고 하면 알아서 진행해요.'],
      steps: [{ cmd: '/plugin install superpowers@claude-plugins-official', text: 'install in Claude Code', word: 'Install' }, { text: 'describe what you want to build', word: 'describe' }, { text: 'approve the design', word: 'Approve', s: 1 }, { text: 'say "go" and it runs the plan', word: 'go', s: 1 }] },
    { type: 'useSkip', say: ["Use it for real features where you want a plan, tests and reviews. Skip it if you'd rather your agent just start coding.", 'Heads up: its test-first skill deletes code written before the tests.'],
      ko: ['계획, 테스트, 리뷰가 필요한 진짜 기능에 쓰세요. 그냥 바로 코딩하길 원하면 건너뛰세요.', '주의: 테스트 우선 스킬은 테스트보다 먼저 쓴 코드를 지워요.'],
      cards: [{ kind: 'use', text: 'you build real features and want a plan, tests and reviews', s: 0 }, { kind: 'skip', text: "you'd rather your agent just start coding", s: 0 }, { kind: 'warn', text: 'its TDD skill deletes code written before the tests', s: 1 }],
      evidence: ['6 commits · 90 days', '82% issues closed', 'v7.0.1 · 9 days ago'], stamp: 'QUIET BUT ALIVE', color: '#c98a00' },
    { type: 'end', say: 'Would you let your AI ask before it codes?', ko: 'AI가 코딩 전에 먼저 묻게 할 거예요?', head: 'Would you let your AI<br>ask before it codes?' },
  ] };
if (/superpowers3\.mjs$/.test(process.argv[1] || '')) runFilm(H, plan, process.argv[2]).catch(e => { console.error(e); process.exit(1); });
