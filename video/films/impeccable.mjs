// Directed short (facts as of 2026-10-30 KST). Run: node video/films/impeccable.mjs out
import * as H from '../hf-video.mjs';
import { runFilm } from './studio.mjs';
export const plan = {
  id: 'film-impeccable-2026-10-30', title: 'Impeccable: stop your AI from building the same ugly website #shorts',
  images: { without: { url: 'https://github.com/pbakaus/impeccable/raw/main/docs/images/readme-without.webp', w: 1440, h: 1080, ext: 'webp' }, with: { url: 'https://github.com/pbakaus/impeccable/raw/main/docs/images/readme-with.webp', w: 1440, h: 891, ext: 'webp' } },
  credits: 'Repo: github.com/pbakaus/impeccable (Apache-2.0); before/after images from its README. Music: "Lofi Loop Scoop" by Seth_Makes_Sounds (CC0). Sounds: CC0.',
  blocks: [
    { type: 'hook', say: 'Your AI keeps building the same boring website. This fixes it.', ko: 'AI가 자꾸 똑같은 뻔한 웹사이트를 만들죠. 이게 고쳐 줘요.', img: 'with', imgBg: '#0b1020', r0: [0, 0, 1, 1], r1: [0.12, 0.12, 0.88, 0.62], title: 'built with Impeccable', stat: '+2.9k <span style="font-size:.62em">⭐</span>', statSize: 130, tag: '#1 today', tagWord: 'fixes', name: 'Impeccable', owner: 'pbakaus' },
    { type: 'promise', say: "Here's why Impeccable blew up, how it works, and whether people actually use it.", ko: 'Impeccable이 왜 터졌는지, 어떻게 쓰는지, 진짜 쓰이는지 볼게요.', items: [['why', 'Why did it blow up?'], ['how it works', 'How does it work?'], ['whether', 'Does anyone use it?']] },
    { type: 'why', say: 'It just pulled in 2,870 stars in one day, more than any other repo today.', ko: '하루 만에 스타 2,870개, 오늘 어떤 레포보다 많아요.', tts: 'It just pulled in two thousand eight hundred seventy stars in one day, more than any other repo today.', counter: { value: 2870, label: 'stars in one day · #1 today', word: '2,870' } },
    { type: 'beforeAfter', say: 'Same prompt, same agent. Without it, you get this. With it, this.', ko: '같은 프롬프트, 같은 에이전트. 없으면 이렇고, 있으면 이래요.', before: 'without', after: 'with', beforeWord: 'Without', afterWord: 'With it', beforeLabel: 'WITHOUT', afterLabel: 'WITH IMPECCABLE', h: 720 },
    { type: 'chips', say: 'You get design commands your agent understands: bolder, quieter, polish, and critique, which scores your UI.', ko: '에이전트가 알아듣는 디자인 명령이 생겨요. bolder, quieter, polish, 그리고 UI 점수를 매기는 critique.', head: 'Words your agent<br>understands',
      chips: [{ cmd: 'bolder', desc: 'amplifies safe designs', word: 'bolder' }, { cmd: 'quieter', desc: 'tones down loud ones', word: 'quieter' }, { cmd: 'polish', desc: 'final pass before shipping', word: 'polish' }, { cmd: 'critique', desc: 'a scored UX review', word: 'critique' }], badge: { text: '24 commands', word: 'scores' } },
    { type: 'term', say: 'Install it from your project folder.', ko: '프로젝트 폴더에서 설치하면 돼요.', cmds: ['npx impeccable install', '/impeccable critique the pricing cards'] },
    { type: 'turn', say: 'So, is anyone actually using it?', ko: '그래서, 진짜 쓰는 사람이 있을까요?', head: 'Is anyone<br>actually<br>using it?', headWord: 'is anyone' },
    { type: 'verdict', say: ['1,241 commits in three months. 94% of issues closed.', 'And 81 other repos already use it.', "That's real adoption."], ko: ['3개월 커밋 1,241개, 이슈 94% 해결.', '이미 다른 레포 81곳이 쓰고 있어요.', '진짜로 쓰이고 있어요.'],
      tts: ['Twelve hundred forty-one commits in three months. Ninety-four percent of issues closed.', 'And eighty-one other repos already use it.', "That's real adoption."],
      stats: [['commits', '1,241', 'commits · 90 days', 0], ['issues', '94%', 'issues closed', 0], ['repos', '81', 'repos already use it', 1]], stamp: 'ACTUALLY USED' },
    { type: 'end', say: 'Which would you run first, bolder or polish? Tell me below.', ko: 'bolder랑 polish 중에 뭐부터 돌려 볼래요? 댓글로 알려 주세요.', head: 'bolder or polish?<br>Which first?' },
  ] };
if (/impeccable\.mjs$/.test(process.argv[1] || '')) runFilm(H, plan, process.argv[2]).catch(e => { console.error(e); process.exit(1); });
