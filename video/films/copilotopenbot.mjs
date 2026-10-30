// CopilotKit/OpenBot: problem -> architecture shot -> how it works (flow) -> how to use (steps) -> use/skip. Facts from its README and Star Board data as of 2026-10-30 KST.
import * as H from '../hf-video.mjs';
import { runFilm } from './studio.mjs';
export const plan = {
  id: 'film-copilotopenbot-2026-10-31', title: 'AI coworkers where every action is checked before it happens. OpenBot #shorts',
  images: { card: { url: 'https://opengraph.githubassets.com/1/CopilotKit/OpenBot', w: 1200, h: 600 }, arch: { url: 'https://raw.githubusercontent.com/CopilotKit/OpenBot/HEAD/assets/architecture-light.svg', w: 1420, h: 852, ext: 'svg' } },
  credits: 'Repo: github.com/CopilotKit/OpenBot (MIT); architecture image, quick start and gateway steps (resolve target, evaluate policy, write audit row, then act) from its README. Diagrams are illustrations of the README description. Music: "Lofi Loop Scoop" by Seth_Makes_Sounds (CC0). Sounds: CC0.',
  blocks: [
    { type: 'hookProblem', say: 'Giving an AI agent your browser, and your files, is easy. Letting it near them safely is not.', ko: 'AI 에이전트한테 브라우저랑 파일을 주는 건 쉬워요. 안전하게 맡기는 게 어렵죠.',
      img: 'card', r0: [0, 0, 1, 1], r1: [0, 0.1, 0.75, 0.7], title: 'CopilotKit/OpenBot', badge: '+247 ⭐ today',
      tells: [{ word: 'browser', text: '🌐 browser', pos: [600, 300] }, { word: 'files', text: '📁 files', pos: [80, 560] }, { word: 'safely', text: '🛑 safely?', pos: [600, 800] }] },
    { type: 'shot', say: 'Each coworker gets its own computer, a browser with its own logins, and its own files.', ko: 'OpenBot에서는 AI 동료마다 자기 컴퓨터가 생겨요. 자기 로그인이 든 브라우저와 자기 파일까지요.',
      img: 'arch', r0: [0, 0, 1, 1], r1: [0.73, 0.33, 1, 0.92], title: 'OpenBot architecture (README)',
      stickers: [{ word: 'computer', text: '💻 own computer', pos: [70, 190], size: 48 }, { word: 'logins', text: '🔑 own logins', pos: [600, 870], size: 48 }, { word: 'files', text: '📁 own files', pos: [110, 870], size: 48 }] },
    { type: 'flow', head: 'How it works', tag: 'diagram',
      say: ['Every tool call goes through one gateway.', 'It resolves the target, checks your policy, writes an audit row, and only then acts, or refuses and names the rule.'],
      ko: ['모든 도구 호출은 게이트웨이 하나를 거쳐요.', '대상을 확인하고, 내 정책으로 판단하고, 감사 기록을 남긴 뒤에야 실행해요. 아니면 거절하면서 어떤 규칙 때문인지 알려줘요.'],
      nodes: [{ id: 'bot', icon: '🤖', label: 'your Bot', sub: 'any AG-UI agent', kind: 'dark', x: 60, y: 250, w: 430, word: 'tool' }, { id: 'gw', icon: '🚪', label: 'the gateway', sub: 'the only way in', kind: 'hot', x: 590, y: 250, w: 430, word: 'gateway' },
        { id: 'res', icon: '🎯', label: 'resolve target', sub: 'page · file · MCP', x: 590, y: 480, w: 430, word: 'resolves', s: 1 }, { id: 'pol', icon: '📜', label: 'your policy', sub: 'deny before allow', x: 60, y: 480, w: 430, word: 'policy', s: 1 },
        { id: 'aud', icon: '🧾', label: 'audit row', sub: 'written first', x: 60, y: 710, w: 430, word: 'audit', s: 1 }, { id: 'act', icon: '✅', label: 'act or refuse', sub: 'a refusal names the rule', x: 590, y: 710, w: 430, word: 'acts', s: 1 }],
      edges: [['bot', 'gw'], ['gw', 'res'], ['res', 'pol'], ['pol', 'aud'], ['aud', 'act']] },
    { type: 'usage', tag: 'how you use it',
      say: ['Clone it, copy the env file, and connect a CopilotKit Intelligence project.', 'Add an OpenAI key, run the start script, and open localhost.'],
      ko: ['저장소를 받고, env 파일을 복사하고, CopilotKit Intelligence 프로젝트를 연결해요.', 'OpenAI 키를 넣고, 시작 스크립트를 돌리고, localhost를 열어요.'],
      tts: ['Clone it, copy the env file, and connect a CopilotKit Intelligence project.', 'Add an Open A I key, run the start script, and open local host.'],
      steps: [{ cmd: 'cp .env.example .env', text: 'then bun install (needs Docker + Bun)', word: 'Clone' }, { cmd: 'npx copilotkit@latest login', text: 'free plan available', word: 'connect' }, { text: 'add your OPENAI_API_KEY to .env', word: 'OpenAI', s: 1 }, { cmd: 'bash scripts/start.sh', text: 'open localhost:3010', word: 'start', s: 1 }] },
    { type: 'useSkip', say: ['Use it if you want agents on your own infrastructure, every action on record.', 'Skip it if you want a ready app; it is a template.', 'And it is beta, and needs a CopilotKit Intelligence project.'],
      ko: ['내 인프라에서 에이전트를 돌리고, 모든 행동을 기록으로 남기고 싶다면 쓰세요.', '바로 쓰는 앱을 원한다면 건너뛰세요. 직접 가져가서 고쳐 쓰는 템플릿이에요.', '그리고 아직 베타이고, CopilotKit Intelligence 프로젝트가 필요해요.'],
      cards: [{ kind: 'use', text: 'you want AI coworkers on your own infra, every action on record' }, { kind: 'skip', text: 'you want an app to sign up for. It is a template you clone' }, { kind: 'warn', text: 'beta, and it needs a CopilotKit Intelligence project + a model key' }],
      evidence: ['591 commits · 90 days', '82% issues closed', '46 contributors'], stamp: 'STILL EARLY', color: '#c98a00' },
    { type: 'end', say: 'Would you hand an AI your browser, if every action was logged?', ko: '모든 행동이 기록된다면, AI한테 내 브라우저를 맡길 거예요?', head: 'AI in your browser,<br>every action logged?' },
  ] };
if (/copilotopenbot\.mjs$/.test(process.argv[1] || '')) runFilm(H, plan, process.argv[2]).catch(e => { console.error(e); process.exit(1); });
