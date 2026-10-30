// thinkrail v3: how it works (animated flow) + how to use (steps), grounded in the README. Facts as of 2026-10-30 KST.
import * as H from '../hf-video.mjs';
import { runFilm } from './studio.mjs';
export const plan = {
  id: 'film-thinkrail-v3-2026-10-30', title: 'Running several AI agents on one repo? JetBrains ThinkRail #shorts',
  images: { bench: { url: 'https://raw.githubusercontent.com/JetBrains/thinkrail/HEAD/.github/readme-assets/workbench-light.png', w: 2880, h: 1800 }, specs: { url: 'https://raw.githubusercontent.com/JetBrains/thinkrail/HEAD/.github/readme-assets/specs-light.png', w: 2880, h: 1800 } },
  credits: 'Diagram illustrates the README Under the hood / What you get sections. Repo: github.com/JetBrains/thinkrail (Apache-2.0); screens from its README. Music: "Lofi Loop Scoop" by Seth_Makes_Sounds (CC0). Sounds: CC0.',
  blocks: [
    { type: 'hookProblem', say: "Run several AI agents on one repo, and they trip over each other's edits.", ko: '한 레포에서 AI 에이전트 여러 개를 돌리면, 서로 수정한 걸 밟고 넘어져요.',
      img: 'specs', r0: [0.2, 0.05, 0.7, 0.7], r1: [0.2, 0.37, 0.7, 0.63], title: 'ThinkRail · the problem', badge: '+1.1k ⭐ today',
      tells: [{ word: 'several', text: 'parallel agents', pos: [560, 300] }, { word: 'trip', text: 'collide', pos: [100, 800] }] },
    { type: 'shot', say: 'ThinkRail, from JetBrains, gives each agent its own workspace on its own branch.', ko: 'JetBrains의 ThinkRail은 에이전트마다 자기 브랜치에 자기 워크스페이스를 줘요.', img: 'bench', r0: [0, 0, 1, 1], r1: [0, 0.04, 0.46, 0.44], title: 'ThinkRail · workspaces',
      stickers: [{ word: 'JetBrains', text: 'by JetBrains', pos: [70, 190] }, { word: 'workspace', text: 'own workspace', pos: [500, 885] }, { word: 'branch', text: 'own branch', pos: [70, 885] }] },
    { type: 'flow', head: 'How it works', tag: 'diagram',
      say: ['A thin host runs the pi coding agent, one session per chat, each in its own git worktree.', 'A graph of SPEC.md files beside the code keeps what the project is for.'],
      tts: ['A thin host runs the pi coding agent, one session per chat, each in its own git worktree.', 'A graph of spec dot M D files beside the code keeps what the project is for.'],
      ko: ['얇은 앱이 pi 코딩 에이전트를 돌려요. 채팅마다 세션 하나, 각자 자기 git 워크트리에서요.', '코드 옆 SPEC.md 파일 그래프가 프로젝트의 의도를 기억해요.'],
      nodes: [{ id: 'app', icon: '🖥️', label: 'ThinkRail app', sub: 'editor · chats · diffs', x: 60, y: 260, w: 430, word: 'host' }, { id: 'pi', icon: '🤖', label: 'pi agent', sub: 'one session per chat', kind: 'dark', x: 590, y: 260, w: 430, word: 'session' },
        { id: 'wt', icon: '🌿', label: 'git worktree', sub: 'own branch per workspace', x: 590, y: 520, w: 430, word: 'worktree' }, { id: 'spec', icon: '📄', label: 'SPEC.md graph', sub: 'beside the code', kind: 'hot', x: 60, y: 520, w: 430, word: 'SPEC', s: 1 }],
      edges: [['app', 'pi'], ['pi', 'wt'], ['spec', 'pi']] },
    { type: 'usage', tag: 'how you use it',
      say: ['Install it, open a git repo, and cut a workspace.', 'Chat, then push or open a PR.'],
      ko: ['설치하고, git 레포를 열고, 워크스페이스를 만들어요.', '대화한 뒤 푸시하거나 PR을 열면 끝이에요.'],
      steps: [{ cmd: 'curl -fsSL https://raw.githubusercontent.com/JetBrains/thinkrail/main/install.sh | bash', text: 'install', word: 'Install' }, { text: 'open a git repo as a project', word: 'open' }, { text: 'cut a workspace (its own branch)', word: 'workspace' }, { text: 'chat, then push or open a PR', word: 'Chat', s: 1 }] },
    { type: 'useSkip', say: ["Use it for several agents on one repo. Skip it if you need stable today; it's version 0.3.", 'It sends usage and crash reports, never your code.'],
      ko: ['한 레포에 에이전트 여럿을 돌린다면 쓰세요. 당장 안정성이 필요하면 건너뛰세요. 아직 0.3 버전이에요.', '사용 기록과 오류 보고를 보내지만, 코드는 절대 안 보내요.'],
      cards: [{ kind: 'use', text: 'you run several coding agents on one git repo', s: 0 }, { kind: 'skip', text: 'you need stable today: v0.3, 200 open issues', s: 0 }, { kind: 'warn', text: 'sends usage events and crash reports (never your code)', s: 1 }],
      evidence: ['458 commits · 90 days', '34 contributors', '200 open issues'], stamp: 'STILL EARLY', color: '#c98a00' },
    { type: 'end', say: 'Would you switch IDEs for this?', ko: '이걸로 IDE 갈아탈 거예요?', head: 'Would you switch<br>IDEs for this?' },
  ] };
if (/thinkrail3\.mjs$/.test(process.argv[1] || '')) runFilm(H, plan, process.argv[2]).catch(e => { console.error(e); process.exit(1); });
