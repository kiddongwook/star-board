// 과학 쇼츠 EP002 (녹음된 내 목소리) 초안 렌더. Make Film 워크플로에서 film = sci-ep002 로 실행.
// 승인 A 전이라 FORCE=1 초안 렌더 (파일명 끝에 -draft). 승인 후에는 이 줄을 지우고 storyboard status를 APPROVED로.
process.env.FORCE = '1';
const { renderEpisode } = await import('../../science/video/render.mjs');
await renderEpisode('science/episodes/EP002-own-voice', process.argv[2] || 'out');