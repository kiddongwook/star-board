// nightly-labs/openbot: problem -> what you get -> how it works (flow) -> how to use (steps) -> use/skip. Facts from its README and Star Board data as of 2026-10-30 KST.
import * as H from '../hf-video.mjs';
import { runFilm } from './studio.mjs';
export const plan = {
  id: 'film-nightlyopenbot-2026-10-31', title: 'Codex, Claude and Grok as teammates in one desktop app. OpenBot #shorts',
  images: { card: { url: 'https://opengraph.githubassets.com/1/nightly-labs/openbot', w: 1200, h: 600 } },
  credits: 'Repo: github.com/nightly-labs/openbot (PolyForm Noncommercial 1.0.0); facts and architecture (Electron main, local CLI processes, SQLite event log and queues, per-agent workspaces, shared folder) from its README. Diagrams are illustrations of the README description. Music: "Lofi Loop Scoop" by Seth_Makes_Sounds (CC0). Sounds: CC0.',
  blocks: [
    { type: 'hookProblem', say: 'Codex in one terminal, Claude in another, Grok in a third. OpenBot puts them in one app.', ko: 'Codex는 이 터미널, Claude는 저 터미널, Grok은 또 다른 터미널. OpenBot은 이걸 앱 하나에 모아요.',
      img: 'card', r0: [0, 0, 1, 1], r1: [0, 0, 0.75, 0.75], title: 'nightly-labs/openbot', badge: '+709 ⭐ today',
      tells: [{ word: 'Codex', text: '🤖 Codex', pos: [560, 270] }, { word: 'Claude', text: '🤖 Claude', pos: [80, 270] }, { word: 'Grok', text: '🤖 Grok', pos: [600, 800] }] },
    { type: 'diagram', label: 'what you get', top: 220, say: 'Each agent gets its own workspace, a task queue, a browser, and messages to other agents.', ko: '에이전트마다 자기 작업 공간, 작업 대기열, 브라우저가 생기고, 다른 에이전트한테 메시지도 보내요.',
      steps: [{ label: 'own workspace', note: 'per agent', word: 'workspace' }, { label: 'task queue', note: 'pause · resume', word: 'queue' }, { label: 'embedded browser', note: 'it can control', word: 'browser' }, { label: 'agent-to-agent', note: 'messages · files', word: 'messages' }] },
    { type: 'flow', head: 'How it works', tag: 'diagram',
      say: ['One Electron app runs each agent, through a local CLI, using your existing login.', 'Messages queue in a SQLite log, each agent works in its own folder, and files move through a shared one.'],
      ko: ['Electron 앱 하나가 에이전트마다 로컬 CLI를 돌려요. 로그인은 원래 쓰던 걸 그대로 써요.', '메시지는 SQLite 로그에 대기열로 쌓이고, 에이전트는 각자 폴더에서 일하고, 파일은 공유 폴더로 주고받아요.'],
      tts: ['One Electron app runs each agent, through a local C L I, using your existing login.', 'Messages queue in an S Q Lite log, each agent works in its own folder, and files move through a shared one.'],
      nodes: [{ id: 'app', icon: '🖥️', label: 'OpenBot app', sub: 'Electron, on your machine', kind: 'dark', x: 60, y: 250, w: 430, word: 'Electron' }, { id: 'cli', icon: '⌨️', label: 'local CLI', sub: 'Codex · Claude · Grok…', x: 590, y: 250, w: 430, word: 'CLI' },
        { id: 'log', icon: '🗄️', label: 'SQLite log', sub: 'messages · queues', kind: 'hot', x: 60, y: 490, w: 430, word: 'SQLite', s: 1 }, { id: 'ws', icon: '📁', label: 'own folder', sub: '~/OpenBot/Agents/…', x: 590, y: 490, w: 430, word: 'folder', s: 1 },
        { id: 'sh', icon: '🔁', label: 'shared folder', sub: '~/OpenBot/Shared', x: 325, y: 730, w: 430, word: 'shared', s: 1 }],
      edges: [['app', 'cli'], ['app', 'log'], ['log', 'ws'], ['ws', 'sh']] },
    { type: 'usage', tag: 'how you use it',
      say: ['Download it from GitHub Releases, then pick a provider.', 'Then describe the agent in a prompt and queue its tasks.'],
      ko: ['GitHub Releases에서 내려받고, 쓸 모델 제공사를 골라요.', '그다음 원하는 에이전트를 프롬프트로 설명하고, 할 일을 대기열에 넣어요.'],
      steps: [{ text: 'download from GitHub Releases (mac, Windows, Linux)', word: 'Download' }, { text: 'pick Codex, Claude, Grok… it can fetch the CLI', word: 'provider' }, { text: 'describe the agent in a prompt', word: 'describe', s: 1 }, { text: 'queue tasks: pause, resume, cancel', word: 'queue', s: 1 }] },
    { type: 'useSkip', say: ['Use it if you juggle several coding agents.', 'Skip it for company work. The license is noncommercial.', 'And it is a preview: agents get full access, with no per-action approvals.'],
      ko: ['코딩 에이전트 여러 개를 오가며 쓴다면 쓰세요.', '회사 업무용이라면 건너뛰세요. 비상업용 라이선스예요.', '그리고 아직 미리보기 버전이라, 에이전트가 전체 권한으로 하나하나 승인 없이 움직여요.'],
      cards: [{ kind: 'use', text: 'you juggle several coding agents and want them in one app' }, { kind: 'skip', text: 'it is for company work: noncommercial license, commercial use is paid' }, { kind: 'warn', text: 'dev preview: agents get full access, no per-action approvals' }],
      evidence: ['2,354 commits · 90 days', '78% issues closed', '106 releases'], stamp: 'STILL EARLY', color: '#c98a00' },
    { type: 'end', say: 'Would you let three AI agents share one desktop?', ko: 'AI 에이전트 셋이 한 데스크톱을 같이 쓰게 할 거예요?', head: 'Three AI agents,<br>one desktop?' },
  ] };
if (/nightlyopenbot\.mjs$/.test(process.argv[1] || '')) runFilm(H, plan, process.argv[2]).catch(e => { console.error(e); process.exit(1); });
