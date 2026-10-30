// thedotmack/claude-mem: problem -> viewer shot -> how it works (flow) -> how to use (steps) -> use/skip. Facts from its README and Star Board data as of 2026-10-30 KST.
import * as H from '../hf-video.mjs';
import { runFilm } from './studio.mjs';
export const plan = {
  id: 'film-claudemem-2026-10-31', title: 'Claude Code forgets every session. Claude-Mem fixes that #shorts',
  images: { demo: { url: 'https://raw.githubusercontent.com/thedotmack/claude-mem/main/docs/public/cm-preview.gif', w: 640, h: 360, ext: 'gif' } },
  credits: 'Repo: github.com/thedotmack/claude-mem (Apache-2.0); preview GIF, install steps, how it works (lifecycle hooks, worker service, SQLite and Chroma, mem-search 3-layer workflow) from its README. Diagrams are illustrations of the README description. Music: "Lofi Loop Scoop" by Seth_Makes_Sounds (CC0). Sounds: CC0.',
  blocks: [
    { type: 'hookProblem', say: 'Every new session, Claude Code starts from zero. Claude-Mem gives it a memory.', ko: 'Claude Code는 새 세션마다 처음부터 시작해요. Claude-Mem은 여기에 기억을 붙여 줘요.',
      img: 'demo', r0: [0, 0, 1, 1], r1: [0, 0.05, 0.52, 0.95], title: 'Claude Code + claude-mem', badge: '+336 ⭐ today', imgBg: '#0d1117',
      tells: [{ word: 'session', text: '🆕 new session', pos: [600, 300] }, { word: 'zero', text: '0️⃣ starts from zero', pos: [80, 560] }, { word: 'memory', text: '🧠 memory', pos: [600, 800] }] },
    { type: 'shot', say: 'Your tool calls become short notes: a change, a discovery, a feature, all in a local viewer.', ko: '도구를 쓴 기록이 짧은 노트가 돼요. 변경, 발견, 기능별로요. 전부 로컬 뷰어에서 볼 수 있어요.',
      img: 'demo', r0: [0.5, 0, 1, 1], r1: [0.52, 0.12, 0.95, 0.62], title: 'localhost:37777 · claude-mem viewer', imgBg: '#0d1117',
      stickers: [{ word: 'change', text: 'CHANGE', pos: [70, 190] }, { word: 'discovery', text: 'DISCOVERY', pos: [560, 190] }, { word: 'viewer', text: '🖥️ local viewer', pos: [110, 870] }] },
    { type: 'flow', head: 'How it works', tag: 'diagram',
      say: ['Hooks watch every session: your prompts and each tool call.', 'A local worker compresses that with AI, stores it in SQLite, and the next session starts with the relevant context.'],
      ko: ['훅이 세션마다 프롬프트와 도구 호출을 지켜봐요.', '로컬 워커가 그걸 AI로 압축해서 SQLite에 저장하고, 다음 세션은 필요한 맥락을 받은 채로 시작해요.'],
      tts: ['Hooks watch every session: your prompts and each tool call.', 'A local worker compresses that with AI, stores it in S Q Lite, and the next session starts with the relevant context.'],
      nodes: [{ id: 'hook', icon: '🪝', label: 'lifecycle hooks', sub: 'prompt · tool call · end', kind: 'dark', x: 60, y: 250, w: 430, word: 'Hooks' }, { id: 'wk', icon: '⚙️', label: 'local worker', sub: 'compresses with AI', x: 590, y: 250, w: 430, word: 'worker', s: 1 },
        { id: 'db', icon: '🗄️', label: 'SQLite + Chroma', sub: 'observations · summaries', x: 590, y: 520, w: 430, word: 'SQLite', s: 1 }, { id: 'nx', icon: '🔁', label: 'next session', sub: 'relevant context injected', kind: 'hot', x: 60, y: 520, w: 430, word: 'next', s: 1 }],
      edges: [['hook', 'wk'], ['wk', 'db'], ['db', 'nx'], ['nx', 'hook']] },
    { type: 'usage', tag: 'how you use it',
      say: ['Install it with one npx command, then restart Claude Code.', 'Claude searches a small index first, then fetches only the full notes it needs.'],
      ko: ['npx 명령 한 줄로 설치하고, Claude Code를 다시 시작해요.', 'Claude는 먼저 작은 색인을 검색하고, 필요한 노트만 전체를 불러와요.'],
      tts: ['Install it with one N P X command, then restart Claude Code.', 'Claude searches a small index first, then fetches only the full notes it needs.'],
      steps: [{ cmd: 'npx claude-mem install', text: 'install once (Node 20+)', word: 'Install' }, { text: 'restart Claude Code: past context shows up', word: 'restart' }, { cmd: 'search(query="authentication bug")', text: 'compact index first', word: 'searches', s: 1 }, { cmd: 'get_observations(ids=[123, 456])', text: 'full notes only for those IDs', word: 'fetches', s: 1 }] },
    { type: 'useSkip', say: ['Use it if you live in Claude Code.', 'Skip it if you want nothing extra running in the background.', 'Heads up, the installer asks you to sign in, for a trial, unless you pass a provider flag.'],
      ko: ['Claude Code를 늘 쓴다면 쓰세요.', '백그라운드에 뭔가 더 돌아가는 게 싫다면 건너뛰세요.', '참고로 설치할 때 체험판 로그인을 물어봐요. provider 옵션을 주면 건너뛸 수 있어요.'],
      cards: [{ kind: 'use', text: 'you live in Claude Code and want it to remember past sessions' }, { kind: 'skip', text: 'you want nothing extra running: it adds a local worker and database' }, { kind: 'warn', text: 'install asks for a sign-in (30-day hosted trial); a provider flag skips it' }],
      evidence: ['75.5k npm downloads/mo', '307 contributors', '98% issues closed'], stamp: 'ACTUALLY USED' },
    { type: 'end', say: 'Should your AI remember everything you did?', ko: 'AI가 내가 한 걸 전부 기억하는 게 좋을까요?', head: 'Should your AI<br>remember everything?' },
  ] };
if (/claudemem\.mjs$/.test(process.argv[1] || '')) runFilm(H, plan, process.argv[2]).catch(e => { console.error(e); process.exit(1); });
