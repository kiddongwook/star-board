// Directed short (facts as of 2026-10-30 KST). Run: node video/films/thinkrail.mjs out
import * as H from '../hf-video.mjs';
import { runFilm } from './studio.mjs';
export const plan = {
  id: 'film-thinkrail-2026-10-30', title: 'ThinkRail: JetBrains is building an IDE around an AI agent #shorts',
  images: { bench: { url: 'https://raw.githubusercontent.com/JetBrains/thinkrail/HEAD/.github/readme-assets/workbench-light.png', w: 2880, h: 1800 }, specs: { url: 'https://raw.githubusercontent.com/JetBrains/thinkrail/HEAD/.github/readme-assets/specs-light.png', w: 2880, h: 1800 } },
  credits: 'Repo: github.com/JetBrains/thinkrail (Apache-2.0); screens from its README. Music: "Lofi Loop Scoop" by Seth_Makes_Sounds (CC0). Sounds: CC0.',
  blocks: [
    { type: 'hook', say: "JetBrains is building an IDE around an AI agent, and it's open source.", ko: 'JetBrains가 AI 에이전트 중심의 IDE를 만들고 있어요. 그것도 오픈소스로.', img: 'bench', r0: [0, 0, 1, 1], r1: [0.2, 0.03, 0.7, 0.75], title: 'ThinkRail', stat: '+1.1k <span style="font-size:.62em">⭐</span>', tag: 'open source', tagWord: 'open source', name: 'ThinkRail', owner: 'JetBrains' },
    { type: 'promise', say: "Here's why ThinkRail is trending, what it does, and whether it's ready.", ko: 'ThinkRail이 왜 뜨는지, 뭘 하는지, 쓸 만한지 볼게요.', items: [['why', 'Why is it trending?'], ['what it does', 'What does it do?'], ['whether', 'Is it ready?']] },
    { type: 'why', say: 'Version 0.3 dropped yesterday, and it picked up almost five thousand stars this week.', ko: '어제 0.3 버전이 나왔고, 이번 주에만 스타가 5천 개 가까이 붙었어요.', release: { tag: 'v0.3.0', when: 'Latest · Oct 29, 2026', notes: 'A JetBrains incubator project · Apache-2.0', word: 'Version' }, counter: { value: 4850, label: 'stars this week', word: 'almost' } },
    { type: 'shot', say: 'Every task gets its own workspace, so several agents can work in parallel without touching your code.', ko: '작업마다 따로 워크스페이스가 생겨서, 에이전트 여러 개가 내 코드를 건드리지 않고 동시에 일해요.', img: 'bench', r0: [0, 0, 1, 1], r1: [0, 0.04, 0.46, 0.44], title: 'ThinkRail · workspaces',
      stickers: [{ word: 'own workspace', text: 'own workspace' }, { word: 'parallel', text: 'agents in parallel' }] },
    { type: 'shot', say: 'And it keeps living specs, so the agent actually remembers how your project works.', ko: '살아 있는 스펙 문서를 관리해서, 에이전트가 프로젝트 구조를 기억해요.', img: 'specs', r0: [0, 0, 1, 1], r1: [0.2, 0.05, 0.98, 0.58], title: 'ThinkRail · specs',
      stickers: [{ word: 'living specs', text: 'living specs' }, { word: 'remembers', text: 'remembers your project' }] },
    { type: 'term', say: 'Install is one command.', ko: '설치는 명령어 한 줄이에요.', cmds: ['curl -fsSL https://raw.githubusercontent.com/JetBrains/thinkrail/main/install.sh | bash'], badge: '1 line' },
    { type: 'turn', say: 'But is it ready for real work?', ko: '그런데 실제 일에 쓸 만할까요?', head: 'Ready for<br>real work?', headWord: 'ready' },
    { type: 'verdict', say: ['458 commits in three months, from 34 contributors.', 'But 200 issues are still open, more than it has closed.', 'Promising, but early.'], ko: ['3개월 커밋 458개, 참여자 34명.', '하지만 아직 열린 이슈가 200개로, 해결한 것보다 많아요.', '기대되지만, 아직 초기예요.'],
      tts: ['Four hundred fifty-eight commits in three months, from thirty-four contributors.', 'But two hundred issues are still open, more than it has closed.', 'Promising, but early.'],
      stats: [['commits', '458', 'commits · 90 days', 0], ['contributors', '34', 'contributors', 0], ['issues', '200', 'issues still open', 1]], stamp: 'STILL EARLY', color: '#c98a00' },
    { type: 'end', say: 'Would you switch IDEs for this? Tell me below.', ko: '이걸로 IDE 갈아탈 거예요? 댓글로 알려 주세요.', head: 'Would you switch<br>IDEs for this?' },
  ] };
if (/thinkrail\.mjs$/.test(process.argv[1] || '')) runFilm(H, plan, process.argv[2]).catch(e => { console.error(e); process.exit(1); });
