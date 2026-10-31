// 과학 쇼츠 EP003 (변기 소용돌이) 초안 렌더. Make Film 워크플로에서 film = sci-ep003 로 실행.
// 승인 A 전이라 FORCE=1 초안 렌더 (파일명 끝에 -draft). 승인 후에는 이 줄을 지우고 storyboard status를 APPROVED로.
process.env.FORCE = '1';
const { renderEpisode } = await import('../../science/video/render.mjs');
await renderEpisode('science/episodes/EP003-toilet-swirl', process.argv[2] || 'out');