import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDateOnly, formatDateOnly, addMonthsClamped, formatYearMonthKo, formatMonths,
} from '../js/recall.js';

const at = (y, mo, d) => new Date(y, mo - 1, d, 0, 0, 0, 0);

test('parseDateOnly/formatDateOnly', () => {
  const d = parseDateOnly('2026-09-09');
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 8);
  assert.equal(d.getDate(), 9);
  assert.equal(formatDateOnly(d), '2026-09-09');
  assert.equal(parseDateOnly(''), null);
  assert.equal(parseDateOnly(null), null);
  assert.equal(parseDateOnly('2026-2-30'), null);
  assert.equal(parseDateOnly('2026-02-30'), null); // 2월 30일은 없음(오버플로 거름)
  assert.equal(parseDateOnly('2026-13-01'), null);
});

test('addMonthsClamped: 월 길이가 다를 때 말일로 클램프', () => {
  assert.equal(formatDateOnly(addMonthsClamped(at(2026, 1, 31), 1)), '2026-02-28'); // 2026은 평년
  assert.equal(formatDateOnly(addMonthsClamped(at(2026, 9, 9), 6)), '2027-03-09');
  assert.equal(formatDateOnly(addMonthsClamped(at(2026, 9, 9), 12)), '2027-09-09');
  assert.equal(formatDateOnly(addMonthsClamped(at(2026, 9, 9), 36)), '2029-09-09');
  assert.equal(formatDateOnly(addMonthsClamped(at(2026, 9, 9), 60)), '2031-09-09');
  assert.equal(formatDateOnly(addMonthsClamped(at(2026, 9, 9), 120)), '2036-09-09');
});

test('formatYearMonthKo', () => {
  assert.equal(formatYearMonthKo(at(2029, 9, 12)), '2029년 9월');
  assert.equal(formatYearMonthKo(at(2031, 1, 1)), '2031년 1월');
});

test('formatMonths: 12로 나뉘면 년, 아니면 개월', () => {
  assert.equal(formatMonths(6), '6개월');
  assert.equal(formatMonths(12), '1년');
  assert.equal(formatMonths(36), '3년');
  assert.equal(formatMonths(60), '5년');
  assert.equal(formatMonths(120), '10년');
});

import { FLAG_CHARS, SSL_BANDS, computeRecall, buildRecallEvents, formatMonthsRange, buildReportText } from '../js/recall.js';

const base = { examDate: at(2026, 9, 9), adenomaCount: 0, maxSizeMm: 0, flags: new Set(), sslBand: '0', prepInadequate: false };

test('computeRecall: 절제한 용종 없음', () => {
  const r = computeRecall(base);
  assert.equal(r.risk, 'none');
  assert.equal(r.months, null);
  assert.deepEqual(r.dates, []);
});

test('computeRecall: 저위험 (1~2개, 10mm 미만)', () => {
  const r = computeRecall({ ...base, adenomaCount: 2, maxSizeMm: 8 });
  assert.equal(r.risk, 'low');
  assert.deepEqual(r.months, [60, 120]);
  assert.equal(formatDateOnly(r.dates[0]), '2031-09-09');
  assert.equal(formatDateOnly(r.dates[1]), '2036-09-09');
});

test('computeRecall: 중등도 (선종 3~4개)', () => {
  assert.equal(computeRecall({ ...base, adenomaCount: 3 }).risk, 'moderate');
  assert.deepEqual(computeRecall({ ...base, adenomaCount: 3 }).months, [36, 60]);
  assert.equal(computeRecall({ ...base, adenomaCount: 4 }).risk, 'moderate');
});

test('computeRecall: 고위험 (선종 5~10개)', () => {
  assert.equal(computeRecall({ ...base, adenomaCount: 5 }).risk, 'high');
  assert.deepEqual(computeRecall({ ...base, adenomaCount: 5 }).months, [36, 36]);
  assert.equal(computeRecall({ ...base, adenomaCount: 10 }).risk, 'high');
});

test('computeRecall: 매우 고위험 (선종 10개 초과)', () => {
  const r = computeRecall({ ...base, adenomaCount: 11 });
  assert.equal(r.risk, 'veryhigh');
  assert.deepEqual(r.months, [12, 12]);
  assert.equal(formatDateOnly(r.dates[0]), '2027-09-09');
});

test('computeRecall: 선종 크기 10mm는 개수와 무관하게 고위험 (각주 a)', () => {
  assert.equal(computeRecall({ ...base, adenomaCount: 1, maxSizeMm: 10 }).risk, 'high');
  assert.equal(computeRecall({ ...base, adenomaCount: 1, maxSizeMm: 9 }).risk, 'low');
});

test('computeRecall: 조직 소견 플래그는 개수와 무관하게 고위험', () => {
  for (const key of ['villous', 'highGrade', 'tsa', 'sslDysplasia', 'serrated10']) {
    const r = computeRecall({ ...base, flags: new Set([key]) });
    assert.equal(r.risk, 'high', `${key} 는 고위험이어야 함`);
    assert.ok(r.reasons.length > 0);
  }
});

test('computeRecall: SSL 개수 구간 (각주 b)', () => {
  assert.equal(computeRecall({ ...base, sslBand: '1' }).risk, 'low'); // 1~2개는 위험 소견 아님
  assert.equal(computeRecall({ ...base, sslBand: '3' }).risk, 'moderate');
  assert.deepEqual(computeRecall({ ...base, sslBand: '3' }).months, [36, 60]);
  assert.equal(computeRecall({ ...base, sslBand: '5' }).risk, 'high');
  assert.deepEqual(computeRecall({ ...base, sslBand: '5' }).months, [36, 36]);
});

test('computeRecall: 20mm 이상 분할절제는 다른 소견보다 우선하는 6개월', () => {
  const r = computeRecall({ ...base, adenomaCount: 11, flags: new Set(['piecemeal']) });
  assert.equal(r.risk, 'piecemeal');
  assert.deepEqual(r.months, [6, 6]);
  assert.equal(formatDateOnly(r.dates[0]), '2027-03-09');
  assert.ok(r.caveats.some((c) => c.includes('6개월 이후')));
});

test('computeRecall: 장정결 불량이면 caveat이 붙는다', () => {
  const r = computeRecall({ ...base, adenomaCount: 2, prepInadequate: true });
  assert.ok(r.caveats.some((c) => c.includes('장정결')));
});

test('computeRecall: 잘못된 입력은 던진다', () => {
  assert.throws(() => computeRecall({ ...base, examDate: new Date('invalid') }));
  assert.throws(() => computeRecall({ ...base, adenomaCount: -1 }));
  assert.throws(() => computeRecall({ ...base, sslBand: '2' }));
});

test('buildRecallEvents: 해당 없음이면 이벤트 없음', () => {
  assert.deepEqual(buildRecallEvents(computeRecall(base), base.examDate), []);
});

test('buildRecallEvents: 고위험(3년)은 3개월 전 알림을 만든다', () => {
  const result = computeRecall({ ...base, adenomaCount: 5 });
  const events = buildRecallEvents(result, base.examDate);
  assert.equal(events.length, 2);
  assert.equal(formatDateOnly(events[0].at), '2029-09-09');
  assert.equal(events[0].title, '대장내시경 추적검사 예정');
  assert.equal(formatDateOnly(events[1].at), '2029-06-09');
  assert.equal(events[1].title, '대장내시경 예약할 때');
});

test('buildRecallEvents: 분할절제(6개월)는 1개월 전 알림', () => {
  const result = computeRecall({ ...base, flags: new Set(['piecemeal']) });
  const events = buildRecallEvents(result, base.examDate);
  assert.equal(formatDateOnly(events[0].at), '2027-03-09');
  assert.equal(formatDateOnly(events[1].at), '2027-02-09');
});

test('formatMonthsRange', () => {
  assert.equal(formatMonthsRange(36, 60), '3~5년');
  assert.equal(formatMonthsRange(60, 120), '5~10년');
  assert.equal(formatMonthsRange(6, 6), '6개월');
  assert.equal(formatMonthsRange(12, 12), '1년');
});

test('buildReportText: 결과지 문구', () => {
  const result = computeRecall({ ...base, adenomaCount: 3 });
  const text = buildReportText(result, base.examDate);
  assert.match(text, /3~5년/);
  assert.match(text, /2022 한국/);
  assert.match(text, /2029년 9월/);
});

test('buildReportText: 절제한 용종 없음', () => {
  const text = buildReportText(computeRecall(base), base.examDate);
  assert.match(text, /절제한 용종 없음/);
});

import { parseRecallParams, buildRecallQuery } from '../js/recall.js';

test('buildRecallQuery ↔ parseRecallParams 왕복', () => {
  const input = {
    examDate: at(2026, 9, 9),
    adenomaCount: 4,
    maxSizeMm: 8,
    flags: new Set(['villous', 'piecemeal']),
    sslBand: '3',
    prepInadequate: true,
  };
  const query = buildRecallQuery(input);
  const parsed = parseRecallParams(new URLSearchParams(query));
  assert.equal(formatDateOnly(parsed.examDate), '2026-09-09');
  assert.equal(parsed.adenomaCount, 4);
  assert.equal(parsed.maxSizeMm, 8);
  assert.deepEqual([...parsed.flags].sort(), ['piecemeal', 'villous']);
  assert.equal(parsed.sslBand, '3');
  assert.equal(parsed.prepInadequate, true);
});

test('buildRecallQuery: 기본값(플래그 없음, ssl 0, 불량 아님)은 짧게', () => {
  const query = buildRecallQuery({ examDate: at(2026, 9, 9), adenomaCount: 0, maxSizeMm: 0, flags: new Set(), sslBand: '0', prepInadequate: false });
  assert.equal(query, 'd=2026-09-09&n=0&s=0');
});

test('parseRecallParams: 잘못된 값은 null', () => {
  const bad = (s) => parseRecallParams(new URLSearchParams(s));
  assert.equal(bad(''), null); // 날짜 없음
  assert.equal(bad('d=2026-13-01&n=0&s=0'), null); // 잘못된 날짜
  assert.equal(bad('d=2026-09-09&n=abc&s=0'), null); // 개수 아님
  assert.equal(bad('d=2026-09-09&n=0&s=0&f=Z'), null); // 알 수 없는 플래그
  assert.equal(bad('d=2026-09-09&n=0&s=0&ssl=2'), null); // 잘못된 ssl 구간
  assert.equal(bad('d=2026-09-09&n=0&s=0&b=9'), null); // 잘못된 장정결 값
});
