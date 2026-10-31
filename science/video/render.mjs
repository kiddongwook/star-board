// 에피소드 렌더: node video/render.mjs episodes/EP001-metal-wood [out]
// storyboard.json이 APPROVED(승인 A)가 아니면 렌더하지 않는다 (FORCE=1로 시험 렌더만 허용, 파일명에 -draft).
// 결과: out/science-EPxxx-vN.mp4, .ko.srt, -timing.txt
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { H, produceFilm } from './engine.mjs';
import { scienceFilm } from './science.mjs';

export async function renderEpisode(dir, out = 'out') {
  const sb = JSON.parse(fs.readFileSync(path.join(dir, 'storyboard.json'), 'utf8'));
  const force = process.env.FORCE === '1';
  if (sb.status !== 'APPROVED' && !force) throw new Error(`${sb.episode}: storyboard 상태 ${sb.status}. 승인 A 전에는 렌더하지 않음 (시험 렌더는 FORCE=1)`);
  const spec = scienceFilm(H, sb);
  spec.voice = sb.voice;
  spec.motionBlur = sb.motionBlur !== false;
  if (sb.status !== 'APPROVED') spec.id += '-draft';
  return produceFilm(spec, { OUT: out });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [dir, out] = process.argv.slice(2);
  if (!dir) { console.error('usage: node video/render.mjs <episode-dir> [out]'); process.exit(2); }
  renderEpisode(dir, out || 'out').catch(e => { console.error(e); process.exit(1); });
}
