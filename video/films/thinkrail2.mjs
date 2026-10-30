// v2 format (problem -> result -> use/skip). Facts as of 2026-10-30 KST. Run: node video/films/thinkrail2.mjs out
import * as H from '../hf-video.mjs';
import { runFilm } from './studio.mjs';
export const plan = {
  id: 'film-thinkrail-v2-2026-10-30', title: 'Running several AI agents on one repo? JetBrains ThinkRail #shorts',
  images: { bench: { url: 'https://raw.githubusercontent.com/JetBrains/thinkrail/HEAD/.github/readme-assets/workbench-light.png', w: 2880, h: 1800 }, specs: { url: 'https://raw.githubusercontent.com/JetBrains/thinkrail/HEAD/.github/readme-assets/specs-light.png', w: 2880, h: 1800 } },
  credits: 'Repo: github.com/JetBrains/thinkrail (Apache-2.0); screens from its README. Music: "Lofi Loop Scoop" by Seth_Makes_Sounds (CC0). Sounds: CC0.',
  blocks: [
    { type: 'hookProblem', say: "Run several AI agents on one repo, and they trip over each other's edits.", ko: '한 레포에서 AI 에이전트 여러 개를 돌리면, 서로 수정한 걸 밟고 넘어져요.',
      img: 'specs', r0: [0.2, 0.05, 0.7, 0.7], r1: [0.2, 0.37, 0.7, 0.63], title: 'ThinkRail · the problem', badge: '+1.1k ⭐ today',
      tells: [{ word: 'several', text: 'parallel agents', pos: [560, 300] }, { word: 'trip', text: 'collide', pos: [100, 800] }] },
    { type: 'shot', say: 'ThinkRail, from JetBrains, gives each agent its own workspace on its own branch.', ko: 'JetBrains의 ThinkRail은 에이전트마다 자기 브랜치에 자기 워크스페이스를 줘요.', img: 'bench', r0: [0, 0, 1, 1], r1: [0, 0.04, 0.46, 0.44], title: 'ThinkRail · workspaces',
      stickers: [{ word: 'JetBrains', text: 'by JetBrains', pos: [70, 190] }, { word: 'workspace', text: 'own workspace', pos: [500, 885] }, { word: 'branch', text: 'own branch', pos: [70, 885] }] },
    { type: 'shot', say: 'And living specs, so the agent remembers how your project works.', ko: '그리고 살아 있는 스펙 문서로, 에이전트가 프로젝트 구조를 기억해요.', img: 'specs', r0: [0, 0, 1, 1], r1: [0.2, 0.05, 0.98, 0.58], title: 'ThinkRail · specs',
      stickers: [{ word: 'living specs', text: 'living specs', pos: [70, 190] }, { word: 'remembers', text: 'remembers', pos: [440, 885] }] },
    { type: 'term', say: 'Install is one command.', ko: '설치는 명령어 한 줄이에요.', cmds: ['curl -fsSL https://raw.githubusercontent.com/JetBrains/thinkrail/main/install.sh | bash'], badge: '1 line' },
    { type: 'useSkip', say: ['Use it if you run several coding agents on one git repo.', "Skip it if you need something stable today. It's version 0.3, with 200 open issues.", 'And it sends usage events and crash reports. Never your code, and extra sharing can be turned off.'],
      ko: ['한 git 레포에서 코딩 에이전트 여러 개를 돌린다면 쓰세요.', '당장 안정적인 도구가 필요하면 건너뛰세요. 아직 0.3 버전이고, 열린 이슈가 200개예요.', '그리고 사용 기록과 오류 보고를 보내요. 코드는 절대 안 보내고, 추가 공유는 끌 수 있어요.'],
      cards: [{ kind: 'use', text: 'you run several coding agents on one git repo' }, { kind: 'skip', text: 'you need stable today: v0.3, 200 open issues' }, { kind: 'warn', text: 'sends usage events and crash reports (never your code; extra sharing can be turned off)' }],
      evidence: ['458 commits · 90 days', '34 contributors', '200 open issues'], stamp: 'STILL EARLY', color: '#c98a00' },
    { type: 'end', say: 'Would you switch IDEs for this?', ko: '이걸로 IDE 갈아탈 거예요?', head: 'Would you switch<br>IDEs for this?' },
  ] };
if (/thinkrail2\.mjs$/.test(process.argv[1] || '')) runFilm(H, plan, process.argv[2]).catch(e => { console.error(e); process.exit(1); });
