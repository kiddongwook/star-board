// 과학 쇼츠 EP001 (금속 vs 나무) 렌더. Make Film 워크플로에서 film = sci-ep001 로 실행.
// 엔진과 장면 템플릿은 science/video/, 대본은 science/episodes/ 에 있다.
import { renderEpisode } from '../../science/video/render.mjs';
await renderEpisode('science/episodes/EP001-metal-wood', process.argv[2] || 'out');