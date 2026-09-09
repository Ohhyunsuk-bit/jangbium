# 장비움 — 대장내시경 장정결제 복용 시간표 계산기

검사 일시와 장정결제(쿨프렙산·오라팡정·플렌뷰산)를 입력하면 전날 식이부터 당일 복용 완료까지의 타임라인을 만들어 주는 정적 웹앱입니다. 서버·계정·데이터 저장이 없고, 결과는 URL만으로 재현됩니다.

- 설계 스펙: `docs/superpowers/specs/2026-09-06-jangbium-design.md`
- 구현 계획: `docs/superpowers/plans/2026-09-06-jangbium.md`

## 실행

빌드 없음. 로컬 확인:

    npm run serve      # http://localhost:8787

## 테스트

    npm test           # node --test (schedule / ics / protocols)

## 구조

- `js/protocols.js` — 제품별 복용 단계·식이 문구·출처(허가사항). 임상 내용은 여기에만.
- `js/schedule.js` — 순수 계산: 검사 시각 → 1차·2차 복용 시각, 타임라인, 경고.
- `js/ics.js` — 캘린더(.ics) 생성.
- `js/app.js` — 폼과 결과 렌더, 공유·저장 버튼.
- `index.html`, `coolprep.html`, `orapang.html`, `plenvu.html`, `plan.html`

## 규칙 요약

- 2차 복용 완료 = 검사 2시간 전. 1차 시작 = 2차 시작 − 11시간, 전날 18:00~22:00 범위.
- 식이는 제품 허가사항 문구를 우선하고, 비어 있는 시간대만 저잔사식으로 보완.

## 배포

GitHub Pages, `gh-pages` 브랜치. 공개 주소: https://jangbium.github.io/

`gh-pages`에는 배포 파일(HTML·CSS·JS·og.png·robots·sitemap·README)만 들어가고 설계 문서·테스트·로컬 도구는 제외된다. `main`에 커밋·푸시한 뒤 아래를 실행하면 반영된다:

    bash tools/deploy-pages.sh

- 저장소 Settings → Pages 에서 Branch가 `gh-pages` / `/ (root)` 로 켜져 있어야 한다(무료 플랜은 공개 저장소만 가능).
- 페이지의 canonical·og:image·sitemap은 현재 위 GitHub Pages 주소로 고정되어 있다. 나중에 도메인(`jangbium.com` 등)을 붙이면 Settings → Pages → Custom domain에 등록하고, `*.html`·`sitemap.xml`·`robots.txt`의 `https://jangbium.github.io`을 새 주소로 일괄 치환한 뒤 다시 배포한다.
- 방문 통계는 아직 없다(GitHub Pages 자체 통계 없음). 필요해지면 쿠키 없는 분석 도구를 붙인다.
