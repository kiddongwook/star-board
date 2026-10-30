// v2 format (problem -> result -> use/skip). Facts as of 2026-10-30 KST. Run: node video/films/superpowers2.mjs out
import * as H from '../hf-video.mjs';
import { runFilm } from './studio.mjs';
export const plan = {
  id: 'film-superpowers-v2-2026-10-30', title: 'Stop your coding agent from jumping straight into code. Superpowers #shorts',
  images: { og: { url: 'https://opengraph.githubassets.com/1/obra/superpowers', w: 1200, h: 600 } },
  credits: 'Repo: github.com/obra/superpowers (MIT). Music: "Lofi Loop Scoop" by Seth_Makes_Sounds (CC0). Sounds: CC0.',
  blocks: [
    { type: 'hookProblem', say: 'Most coding agents jump straight into code. Superpowers makes yours stop and ask first.', ko: '코딩 에이전트는 대부분 바로 코드부터 짜요. Superpowers는 먼저 멈추고 물어보게 해요.',
      img: 'og', r0: [0, 0, 1, 1], r1: [0.03, 0.08, 0.7, 0.62], title: 'github.com/obra/superpowers', badge: '308k ⭐',
      tells: [{ word: 'jump', text: '❌ jumps into code', pos: [80, 560] }, { word: 'ask', text: '✅ asks first', pos: [560, 800] }] },
    { type: 'diagram', say: "It asks what you're building, writes a plan, writes tests first, then sends subagents and reviews every task.", ko: '뭘 만들지 묻고, 계획을 쓰고, 테스트부터 짜고, 서브에이전트를 보내고, 작업마다 리뷰해요.',
      top: 190, steps: [{ word: 'asks', label: 'Brainstorm', note: 'asks first' }, { word: 'plan', label: 'Write a plan', note: '2–5 min tasks' }, { word: 'tests', label: 'Tests first', note: 'TDD' }, { word: 'subagents', label: 'Subagents build' }, { word: 'reviews', label: 'Review every task' }] },
    { type: 'why', say: 'It works with Claude Code, Codex, Cursor, Gemini CLI, and more.', ko: 'Claude Code, Codex, Cursor, Gemini CLI 등에서 다 돼요.', chipsWord: 'Claude', chips: ['Claude Code', 'Codex', 'Cursor', 'Gemini CLI', 'Copilot CLI', 'OpenCode', '+ 10 more'] },
    { type: 'term', say: "In Claude Code, it's one line.", ko: 'Claude Code에서는 한 줄이면 돼요.', cmds: ['/plugin install superpowers@claude-plugins-official'], badge: '1 line' },
    { type: 'useSkip', say: ['Use it for real features where you want a plan, tests and reviews.', "Skip it if you'd rather your agent just start coding.", 'And heads up: its test-first skill deletes code written before the tests.'],
      ko: ['계획, 테스트, 리뷰가 필요한 진짜 기능을 만들 때 쓰세요.', '에이전트가 그냥 바로 코딩하길 원한다면 건너뛰세요.', '주의: 테스트 우선 스킬은 테스트보다 먼저 쓴 코드를 지워요.'],
      cards: [{ kind: 'use', text: 'you build real features and want a plan, tests and reviews' }, { kind: 'skip', text: "you'd rather your agent just start coding" }, { kind: 'warn', text: 'its TDD skill deletes code written before the tests' }],
      evidence: ['6 commits · 90 days', '82% issues closed', 'v7.0.1 · 9 days ago'], stamp: 'QUIET BUT ALIVE', color: '#c98a00' },
    { type: 'end', say: 'Would you let your AI ask before it codes?', ko: 'AI가 코딩 전에 먼저 묻게 할 거예요?', head: 'Would you let your AI<br>ask before it codes?' },
  ] };
if (/superpowers2\.mjs$/.test(process.argv[1] || '')) runFilm(H, plan, process.argv[2]).catch(e => { console.error(e); process.exit(1); });
