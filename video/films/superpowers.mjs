// Directed short (facts as of 2026-10-30 KST). Run: node video/films/superpowers.mjs out
import * as H from '../hf-video.mjs';
import { runFilm } from './studio.mjs';
export const plan = {
  id: 'film-superpowers-2026-10-30', title: 'Superpowers: 308k stars for a set of AI instructions. Still alive? #shorts',
  images: { og: { url: 'https://opengraph.githubassets.com/1/obra/superpowers', w: 1200, h: 600 } },
  credits: 'Repo: github.com/obra/superpowers (MIT). Music: "Lofi Loop Scoop" by Seth_Makes_Sounds (CC0). Sounds: CC0 (video/sfx/LICENSES.md).',
  blocks: [
    { type: 'hook', say: "Three hundred thousand stars, and it's just a set of instructions for your AI.", ko: '스타 30만 개인데, AI한테 주는 지침 모음이에요.', img: 'og', r0: [0, 0, 1, 1], r1: [0.03, 0.08, 0.7, 0.62], title: 'github.com/obra/superpowers', stat: '308k <span style="font-size:.62em">⭐</span>', tag: 'just skills', tagWord: 'instructions', name: 'Superpowers', owner: 'obra' },
    { type: 'promise', say: "Here's why Superpowers keeps climbing, what it actually does, and whether it's still alive.", ko: 'Superpowers가 왜 계속 오르는지, 뭘 하는지, 아직 살아 있는지 볼게요.', items: [['why', 'Why is it still climbing?'], ['what it actually', 'What does it do?'], ['whether', 'Is it still alive?']] },
    { type: 'why', say: 'It plugs into almost every coding agent: Claude Code, Codex, Cursor, Gemini CLI, and more.', ko: 'Claude Code, Codex, Cursor, Gemini CLI까지 거의 모든 코딩 에이전트에 붙어요.', chipsWord: 'Claude', chips: ['Claude Code', 'Codex', 'Cursor', 'Gemini CLI', 'Copilot CLI', 'OpenCode', 'Kimi Code', '+ 9 more'] },
    { type: 'diagram', say: "Before your agent writes any code, it asks what you're really building, writes a plan, tests first, then sends subagents, with a review after every task.", ko: '코드를 쓰기 전에 뭘 만들려는지 묻고, 계획을 쓰고, 테스트부터 짜고, 서브에이전트를 보내고, 작업마다 리뷰해요.',
      top: 190, steps: [{ word: 'asks', label: 'Brainstorm', note: 'asks first' }, { word: 'plan', label: 'Write a plan', note: '2–5 min tasks' }, { word: 'tests', label: 'Tests first', note: 'TDD' }, { word: 'subagents', label: 'Subagents build' }, { word: 'review', label: 'Review every task' }] },
    { type: 'term', say: "In Claude Code, it's one line.", ko: 'Claude Code에서는 한 줄이면 돼요.', cmds: ['/plugin install superpowers@claude-plugins-official'], badge: '1 line' },
    { type: 'turn', say: "But here's the odd part. Is anyone still working on it?", ko: '그런데 이상한 점이 있어요. 아직 누가 손보고 있을까요?', head: 'Is it<br>still<br>alive?', headWord: 'Is anyone' },
    { type: 'verdict', say: ['Only 6 commits in the last three months.', 'Yet 82% of issues get closed, and a new release shipped nine days ago.', 'Quiet, but alive.'], ko: ['최근 3개월 커밋은 6개뿐이에요.', '그래도 이슈 82%가 해결되고, 9일 전에 새 버전이 나왔어요.', '조용하지만, 살아 있어요.'],
      tts: ['Only six commits in the last three months.', 'Yet eighty-two percent of issues get closed, and a new release shipped nine days ago.', 'Quiet, but alive.'],
      stats: [['commits', '6', 'commits · 90 days', 0], ['issues', '82%', 'issues closed', 1], ['release', 'v7.0.1', 'released 9 days ago', 1]], stamp: 'QUIET BUT ALIVE', color: '#c98a00' },
    { type: 'end', say: 'Would you let your AI ask questions before it codes? Tell me below.', ko: 'AI가 코딩 전에 먼저 질문하게 할 거예요? 댓글로 알려 주세요.', head: 'Would you let your AI<br>ask before it codes?' },
  ] };
if (/superpowers\.mjs$/.test(process.argv[1] || '')) runFilm(H, plan, process.argv[2]).catch(e => { console.error(e); process.exit(1); });
