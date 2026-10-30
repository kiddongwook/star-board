// deeptutor v3: how it works (animated flow) + how to use (steps), grounded in the README. Facts as of 2026-10-30 KST.
import * as H from '../hf-video.mjs';
import { runFilm } from './studio.mjs';
export const plan = {
  id: 'film-deeptutor-v3-2026-10-30', title: 'Notes, textbooks, lectures: one AI tutor you run yourself. DeepTutor #shorts',
  images: { chat: { url: 'https://raw.githubusercontent.com/HKUDS/DeepTutor/HEAD/assets/figs/web-dev/chat.png', w: 2940, h: 1800 }, quiz: { url: 'https://raw.githubusercontent.com/HKUDS/DeepTutor/HEAD/assets/figs/web-dev/book-quiz.png', w: 2940, h: 1800 }, overview: { url: 'https://raw.githubusercontent.com/HKUDS/DeepTutor/HEAD/assets/figs/web-dev/overview.png', w: 2940, h: 1800 }, memory: { url: 'https://raw.githubusercontent.com/HKUDS/DeepTutor/HEAD/assets/figs/web-dev/memory-graph.png', w: 2506, h: 1606 } },
  credits: 'Diagram illustrates the README feature descriptions. Repo: github.com/HKUDS/DeepTutor (Apache-2.0); screens from its README. Music: "Lofi Loop Scoop" by Seth_Makes_Sounds (CC0). Sounds: CC0.',
  blocks: [
    { type: 'hookProblem', say: 'Notes in one app, a textbook in another, lectures on YouTube. DeepTutor turns all of it into one AI tutor.', ko: '노트는 이 앱, 교재는 저 앱, 강의는 유튜브. DeepTutor는 이걸 전부 AI 튜터 하나로 묶어요.',
      img: 'chat', r0: [0.25, 0.06, 0.95, 0.75], r1: [0.42, 0.25, 0.76, 0.47], title: 'DeepTutor · tutoring', badge: '+1.9k ⭐ today',
      tells: [{ word: 'Notes', text: '📝 notes', pos: [600, 300] }, { word: 'textbook', text: '📘 textbook', pos: [80, 560] }, { word: 'lectures', text: '▶️ lectures', pos: [600, 800] }] },
    { type: 'cuts', intro: 'wow', say: "It tutors you, quizzes you, and remembers what you've learned.", ko: '가르쳐 주고, 퀴즈를 내고, 배운 걸 기억해 줘요.', h: 700,
      cuts: [{ word: 'tutors', img: 'chat', r: [0.27, 0.08, 0.92, 0.7], label: 'TUTORS YOU' }, { word: 'quizzes', img: 'quiz', r: [0.38, 0.3, 0.96, 0.92], label: 'QUIZZES YOU' }, { word: 'remembers', img: 'memory', r: [0.12, 0.08, 0.95, 0.95], label: 'REMEMBERS' }] },
    { type: 'flow', head: 'How it works', tag: 'diagram',
      say: ['Your knowledge bases, books and notes become one shared learning context.', 'Chat, quiz, research and solve all run on one runtime with that context, and a three-layer memory carries what you learned across them.'],
      ko: ['지식 베이스, 책, 노트가 하나의 학습 맥락으로 묶여요.', '채팅, 퀴즈, 리서치, 문제 풀이가 그 맥락을 가진 하나의 실행기에서 돌고, 3단 메모리가 배운 걸 기능 사이로 이어 줘요.'],
      nodes: [{ id: 'src', icon: '📚', label: 'books · notes · KBs', sub: 'your material', x: 60, y: 260, w: 430, word: 'books' }, { id: 'ctx', icon: '🗂️', label: 'shared context', sub: 'one learning context', x: 590, y: 260, w: 430, word: 'context' },
        { id: 'rt', icon: '⚙️', label: 'one runtime', sub: 'chat · quiz · research · solve', kind: 'dark', x: 590, y: 520, w: 430, word: 'runtime', s: 1 }, { id: 'mem', icon: '🧠', label: 'memory', sub: 'three layers (L1–L3)', kind: 'hot', x: 60, y: 520, w: 430, word: 'memory', s: 1 }],
      edges: [['src', 'ctx'], ['ctx', 'rt'], ['rt', 'mem'], ['mem', 'ctx']] },
    { type: 'usage', tag: 'how you use it',
      say: ['Install it, run init once, then start it.', 'Open the web app and add your material.'],
      ko: ['설치하고, init을 한 번 실행한 뒤 시작해요.', '웹 앱을 열고 자료를 넣으면 돼요.'],
      steps: [{ cmd: 'pip install -U "deeptutor[full]"', text: 'web app + CLI', word: 'Install' }, { cmd: 'deeptutor init', text: 'first-time setup, incl. your model key', word: 'init' }, { cmd: 'deeptutor start', text: 'starts the app', word: 'start' }, { text: 'open the web app, add your material', word: 'Open', s: 1 }] },
    { type: 'useSkip', say: ['Use it if you learn from your own notes, books or lectures. Skip it if you want zero setup.', 'And bring your own model API key; you set it on first run.'],
      ko: ['내 노트, 책, 강의로 공부한다면 쓰세요. 설정이 귀찮다면 건너뛰세요.', '그리고 AI 모델 API 키는 직접 넣어야 해요. 처음 실행할 때 설정해요.'],
      cards: [{ kind: 'use', text: 'you learn from your own notes, books or lectures', s: 0 }, { kind: 'skip', text: 'you want zero setup. You run it yourself', s: 0 }, { kind: 'warn', text: 'bring your own model API key (set on first run)', s: 1 }],
      evidence: ['1,980 commits · 90 days', '83% issues closed', '16.9k PyPI downloads/mo'], stamp: 'ACTUALLY USED' },
    { type: 'end', say: 'Would you let an AI plan your studying?', ko: 'AI한테 공부 계획 맡길 거예요?', head: 'Would you let an AI<br>plan your studying?' },
  ] };
if (/deeptutor3\.mjs$/.test(process.argv[1] || '')) runFilm(H, plan, process.argv[2]).catch(e => { console.error(e); process.exit(1); });
