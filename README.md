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

Cloudflare Pages (프레임워크 없음, 빌드 명령 비움, 출력 디렉터리 `/`). Web Analytics는 Pages 프로젝트 설정에서 켠다.
