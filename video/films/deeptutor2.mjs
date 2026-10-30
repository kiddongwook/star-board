// v2 format (problem -> result -> use/skip). Facts as of 2026-10-30 KST. Run: node video/films/deeptutor2.mjs out
import * as H from '../hf-video.mjs';
import { runFilm } from './studio.mjs';
export const plan = {
  id: 'film-deeptutor-v2-2026-10-30', title: 'Notes, textbooks, lectures: one AI tutor you run yourself. DeepTutor #shorts',
  images: { chat: { url: 'https://raw.githubusercontent.com/HKUDS/DeepTutor/HEAD/assets/figs/web-dev/chat.png', w: 2940, h: 1800 }, quiz: { url: 'https://raw.githubusercontent.com/HKUDS/DeepTutor/HEAD/assets/figs/web-dev/book-quiz.png', w: 2940, h: 1800 }, overview: { url: 'https://raw.githubusercontent.com/HKUDS/DeepTutor/HEAD/assets/figs/web-dev/overview.png', w: 2940, h: 1800 }, memory: { url: 'https://raw.githubusercontent.com/HKUDS/DeepTutor/HEAD/assets/figs/web-dev/memory-graph.png', w: 2506, h: 1606 } },
  credits: 'Repo: github.com/HKUDS/DeepTutor (Apache-2.0); screens from its README. Music: "Lofi Loop Scoop" by Seth_Makes_Sounds (CC0). Sounds: CC0.',
  blocks: [
    { type: 'hookProblem', say: 'Notes in one app, a textbook in another, lectures on YouTube. DeepTutor turns all of it into one AI tutor.', ko: '노트는 이 앱, 교재는 저 앱, 강의는 유튜브. DeepTutor는 이걸 전부 AI 튜터 하나로 묶어요.',
      img: 'chat', r0: [0.25, 0.06, 0.95, 0.75], r1: [0.42, 0.25, 0.76, 0.47], title: 'DeepTutor · tutoring', badge: '+1.9k ⭐ today',
      tells: [{ word: 'Notes', text: '📝 notes', pos: [600, 300] }, { word: 'textbook', text: '📘 textbook', pos: [80, 560] }, { word: 'lectures', text: '▶️ lectures', pos: [600, 800] }] },
    { type: 'cuts', intro: 'wow', say: "It tutors you, quizzes you, and remembers what you've learned.", ko: '가르쳐 주고, 퀴즈를 내고, 배운 걸 기억해 줘요.', h: 700,
      cuts: [{ word: 'tutors', img: 'chat', r: [0.27, 0.08, 0.92, 0.7], label: 'TUTORS YOU' }, { word: 'quizzes', img: 'quiz', r: [0.38, 0.3, 0.96, 0.92], label: 'QUIZZES YOU' }, { word: 'remembers', img: 'memory', r: [0.12, 0.08, 0.95, 0.95], label: 'REMEMBERS' }] },
    { type: 'shot', say: 'Think NotebookLM, but open source, on your own machine.', ko: 'NotebookLM 같은 건데, 오픈소스고 내 컴퓨터에서 돌아가요.', img: 'overview', r0: [0.18, 0.02, 1, 0.98], r1: [0.32, 0.1, 0.92, 0.6], title: 'localhost:3782 · DeepTutor',
      stickers: [{ word: 'NotebookLM', text: '≈ NotebookLM', pos: [70, 190] }, { word: 'open', text: 'open source', pos: [110, 885] }, { word: 'own', text: '💻 your machine', pos: [520, 885] }] },
    { type: 'term', say: 'Three commands to set up.', ko: '설치는 명령어 세 줄이에요.', tail: 3.2, cmds: ['pip install -U "deeptutor[full]"', 'deeptutor init', 'deeptutor start'] },
    { type: 'useSkip', say: ['Use it if you learn from your own notes, books or lectures.', 'Skip it if you want zero setup. You run it yourself.', 'And bring your own model API key; you set it up on first run.'],
      ko: ['내 노트, 책, 강의로 공부한다면 쓰세요.', '설정이 귀찮다면 건너뛰세요. 직접 돌려야 해요.', '그리고 AI 모델 API 키는 직접 넣어야 해요. 처음 실행할 때 설정해요.'],
      cards: [{ kind: 'use', text: 'you learn from your own notes, books or lectures' }, { kind: 'skip', text: 'you want zero setup. You run it yourself' }, { kind: 'warn', text: 'bring your own model API key (set on first run)' }],
      evidence: ['1,980 commits · 90 days', '83% issues closed', '16.9k PyPI downloads/mo'], stamp: 'ACTUALLY USED' },
    { type: 'end', say: 'Would you let an AI plan your studying?', ko: 'AI한테 공부 계획 맡길 거예요?', head: 'Would you let an AI<br>plan your studying?' },
  ] };
if (/deeptutor2\.mjs$/.test(process.argv[1] || '')) runFilm(H, plan, process.argv[2]).catch(e => { console.error(e); process.exit(1); });
