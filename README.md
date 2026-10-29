# GitHub Star Board

GitHub 스타 순위표 + 실효성 검증 대시보드. 매일 자동으로 수집해서 GitHub Pages에 게시합니다.

## 보여주는 것

| 탭 | 내용 |
|-|-|
| 급상승 | GitHub Trending (오늘 / 이번 주 / 이번 달, 언어별) + 기간 내 증가 스타 |
| 스타 순위 | 누적 스타 Top 200, 언어별 Top 50 |
| 신규 루키 | 최근 7일 / 30일 생성 저장소, 하루 평균 스타순 |
| 분야별 | AI 코딩 에이전트, MCP, LLM, RAG, 보안, 생체인증, 컴퓨터 비전, 임베디드 등 |
| 성장 순위 | 매일 저장한 스타 스냅샷으로 계산한 실측 1일 / 7일 / 30일 증가량 |
| 실속 분석 | 인기도 x 실효성 분포, 숨은 보석 / 하이프 주의 / 스타 조작 의심 목록 |

각 저장소마다 인기도, 실효성(커밋, 참여자, 이슈 해결률, PR, 다운로드, 릴리스), 신뢰도(최근 스타 계정 표본의 가짜 패턴) 점수와 판정, 근거가 붙습니다.

## 설치 (5분)

1. GitHub에서 새 저장소를 만듭니다 (예: `star-board`, Public 권장: Actions 무료).
2. 이 폴더의 파일을 모두 올립니다 (`.github/workflows/collect.yml` 포함).
3. 저장소 **Settings > Pages > Source**를 **GitHub Actions**로 선택합니다.
4. **Actions** 탭 > `Collect & Deploy Star Board` > **Run workflow**로 첫 수집을 실행합니다 (약 5~10분).
5. 완료되면 `https://<내아이디>.github.io/star-board/`에서 대시보드를 볼 수 있습니다.

이후 매일 06:00(KST)에 자동 수집됩니다. 커밋/참여자/이슈/다운로드 분석은 Actions 기본 `GITHUB_TOKEN`으로 동작합니다.

**가짜 스타 검사(신뢰도)**는 기본 토큰으로는 스타 누른 계정 목록을 읽을 수 없어 꺼져 있습니다. 켜려면 개인 토큰(Fine-grained, Public repositories 읽기 전용)을 만들어 저장소 **Settings > Secrets and variables > Actions**에 `STAR_BOARD_TOKEN` 이름으로 등록하세요.

## 로컬 실행

```bash
GITHUB_TOKEN=github_pat_xxx node collect.mjs   # Node 20+
# index.html을 브라우저로 열기 (data/data.js를 읽음)
```

토큰 없이도 실행되지만 간이 모드(Trending + 검색 순위만, 심층 분석 없음)로 수집됩니다.

## 설정 바꾸기

`collect.mjs` 맨 위 `DEFAULT_CONFIG`를 수정하거나, 같은 구조의 `config.json`을 만들어 덮어쓸 수 있습니다.

- `categories`: 분야 추가/삭제 (GitHub topic 기준)
- `trending.languages`: 수집할 Trending 언어
- `top.languages`: 언어별 순위 대상
- `enrich.max`: 심층 분석 저장소 수 (기본 2500, 1,500개 기준 GraphQL 약 250포인트 사용)

## 참고

- 공개 저장소는 60일간 활동이 없으면 예약 워크플로가 멈출 수 있는데, 매일 데이터 커밋이 생기므로 보통 유지됩니다.
- Trending은 공식 API가 없어 HTML을 파싱합니다. GitHub 페이지 구조가 바뀌면 `parseTrending`을 수정해야 합니다.
- 가짜 스타 판정은 휴리스틱입니다.
