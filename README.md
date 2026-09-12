# 장비움 — 대장내시경 장정결제 복용 시간표 계산기

검사 일시와 장정결제(쿨프렙산·오라팡정·플렌뷰산)를 입력하면 전날 식이부터 당일 복용 완료까지의 타임라인을 만들어 주는 정적 웹앱입니다. 서버·계정·데이터 저장이 없고, 결과는 URL만으로 재현됩니다.

- 설계 스펙: `docs/superpowers/specs/2026-09-06-jangbium-design.md`
- 구현 계획: `docs/superpowers/plans/2026-09-06-jangbium.md`

## 실행

빌드 없음. 로컬 확인:

    npm run serve      # http://localhost:8787

## 테스트

    npm test           # node --test (schedule / ics / protocols / recall)

## 구조

- `js/protocols.js` — 제품별 복용 단계·식이 문구·출처(허가사항). 임상 내용은 여기에만.
- `js/schedule.js` — 순수 계산: 검사 시각 → 1차·2차 복용 시각, 타임라인, 경고.
- `js/ics.js` — 캘린더(.ics) 생성.
- `js/app.js` — 폼과 결과 렌더, 공유·저장 버튼.
- `js/ui-utils.js` — esc·toast·share 등 공용 DOM 도우미(app.js·recall-app.js 공유).
- `js/recall.js` — 순수 계산: 2022 한국 지침 Table 4 기준 추적 간격.
- `js/recall-app.js` — 추적검사 계산기 폼과 결과 렌더.
- `js/vendor/qrcode.js` — 벤더링한 QR 인코더(MIT, 손으로 고치지 않음).
- `index.html`, `coolprep.html`, `orapang.html`, `plenvu.html`, `plan.html`, `recall.html`, `recall-plan.html`

## 도구 (배포 대상 아님)

- `tools/batch-prep.mjs` — 예약 명단 CSV(이름·제품·검사일시) → 환자별 복용 안내문 `.txt` 일괄 생성. 접수 데스크가 문자 발송 시스템에 복붙할 때 쓴다. `js/schedule.js`·`protocols.js`를 그대로 재사용해 웹앱과 문구가 항상 일치한다. 사용: `node tools/batch-prep.mjs 예약명단.csv`

## 예정 — 환자 포털 (개원 후)

검사 전 안내(현재 장비움) → 검사 결과 → 다음 방문(추적검사 계산기) → 생활습관 관리를 환자가 로그인해서 한 화면에서 보고, 재방문으로 이어지게 만드는 포털. 2026-09-10에 화면 디자인만 확정해 둔 상태(실제 로그인·서버·데이터 저장 없음):

- 확정 목업: `tools/mockups/portal-a-warm3.html` (카드형 구조 + 료칸 로비 무드 — 어두운 우드톤, 여러 지점의 은은한 조명, 저조도 입자감)
- 과정 기록: `tools/mockups/portal-a.html`·`portal-b.html`(구조 시안), `portal-a-warm.html`·`portal-a-warm2.html`(디자인 과정)

실제로 만들려면 개원 시점에 먼저 정해야 할 것:
1. 환자를 어떻게 식별할지 (이름+생년월일? 예약번호?)
2. 검사 결과를 누가 언제 입력할지 (간호사 직접 입력? EMR 연동?)
3. 이런 기록을 어디에 안전하게 영속화할지 (localStorage 단독 금지 — CLAUDE.md 데이터 영속성 규칙)

## 규칙 요약

- 2차 복용 완료 = 검사 2시간 전. 1차 시작 = 2차 시작 − 11시간, 전날 18:00~22:00 범위.
- 식이는 제품 허가사항 문구를 우선하고, 비어 있는 시간대만 저잔사식으로 보완.

## 배포

GitHub Pages, `gh-pages` 브랜치. 공개 주소: https://jangbium.github.io/

`gh-pages`에는 배포 파일(HTML·CSS·JS·og.png·robots·sitemap·README)만 들어가고 설계 문서·테스트·로컬 도구는 제외된다. `main`에 커밋·푸시한 뒤 아래를 실행하면 반영된다:

    bash tools/deploy-pages.sh

- 새 페이지(html)를 추가할 때는 `tools/deploy-pages.sh`와 `.github/workflows/deploy.yml` 양쪽의 파일 목록(`FILES=(...)` / `cp ... /tmp/deploy/`)을 같이 갱신해야 한다 — 둘 중 하나만 고치면 그 경로에서만 배포가 빠져 라이브 사이트에서 조용히 404가 난다.
- 저장소 Settings → Pages 에서 Branch가 `gh-pages` / `/ (root)` 로 켜져 있어야 한다(무료 플랜은 공개 저장소만 가능).
- 페이지의 canonical·og:image·sitemap은 현재 위 GitHub Pages 주소로 고정되어 있다. 나중에 도메인(`jangbium.com` 등)을 붙이면 Settings → Pages → Custom domain에 등록하고, `*.html`·`sitemap.xml`·`robots.txt`의 `https://jangbium.github.io`을 새 주소로 일괄 치환한 뒤 다시 배포한다.
- 방문 통계는 아직 없다(GitHub Pages 자체 통계 없음). 필요해지면 쿠키 없는 분석 도구를 붙인다.
