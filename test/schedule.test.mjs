import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS } from '../js/protocols.js';
import {
  addMinutes, addDays, atClock, formatTime, formatDateKo, toParam, parseParam,
  computeDoseTimes, computeSchedule,
} from '../js/schedule.js';

const at = (y, mo, d, h, mi) => new Date(y, mo - 1, d, h, mi, 0, 0);
const hm = (d) => formatTime(d);
const ymd = (d) => toParam(d).slice(0, 10);

test('헬퍼: addMinutes/addDays/atClock', () => {
  const base = at(2026, 9, 10, 9, 0);
  assert.equal(hm(addMinutes(base, -90)), '07:30');
  assert.equal(ymd(addDays(base, -1)), '2026-09-09');
  assert.equal(hm(atClock(base, '18:30')), '18:30');
  assert.equal(ymd(atClock(base, '18:30')), '2026-09-10');
});

test('포맷: formatTime/formatDateKo/toParam/parseParam', () => {
  const d = at(2026, 9, 9, 5, 7);
  assert.equal(formatTime(d), '05:07');
  assert.equal(formatDateKo(d), '9월 9일 (수)');
  assert.equal(toParam(d), '2026-09-09T05:07');
  assert.equal(parseParam('2026-09-09T05:07').getTime(), d.getTime());
  assert.equal(parseParam('2026-9-9T5:7'), null);
  assert.equal(parseParam(''), null);
  assert.equal(parseParam(null), null);
  assert.equal(parseParam('2026-13-40T99:99'), null);
  assert.equal(parseParam('2026-02-31T09:00'), null);
});

test('09:00 쿨프렙 → 2차 05:30~07:00, 1차 전날 18:30', () => {
  const t = computeDoseTimes({ examAt: at(2026, 9, 10, 9, 0), product: PRODUCTS.coolprep });
  assert.equal(hm(t.dose2Start), '05:30');
  assert.equal(hm(t.dose2End), '07:00');
  assert.equal(ymd(t.dose2Start), '2026-09-10');
  assert.equal(hm(t.dose1Start), '18:30');
  assert.equal(ymd(t.dose1Start), '2026-09-09');
  assert.equal(hm(t.dose1End), '20:00');
});

test('14:00 오라팡 → 2차 10:30, 1차는 22:00으로 clamp', () => {
  const t = computeDoseTimes({ examAt: at(2026, 9, 10, 14, 0), product: PRODUCTS.orapang });
  assert.equal(hm(t.dose2Start), '10:30');
  assert.equal(hm(t.dose1Start), '22:00');
  assert.equal(ymd(t.dose1Start), '2026-09-09');
});

test('09:00 플렌뷰 → 2차 06:00, 1차 19:00', () => {
  const t = computeDoseTimes({ examAt: at(2026, 9, 10, 9, 0), product: PRODUCTS.plenvu });
  assert.equal(hm(t.dose2Start), '06:00');
  assert.equal(hm(t.dose2End), '07:00');
  assert.equal(hm(t.dose1Start), '19:00');
});

test('08:00 쿨프렙 → 2차 04:30, 1차는 18:00으로 clamp(하한)', () => {
  const t = computeDoseTimes({ examAt: at(2026, 9, 10, 8, 0), product: PRODUCTS.coolprep });
  assert.equal(hm(t.dose2Start), '04:30');
  assert.equal(hm(t.dose1Start), '18:00');
});

test('월초 검사의 1차 복용일은 전월 말일', () => {
  const t = computeDoseTimes({ examAt: at(2026, 10, 1, 9, 0), product: PRODUCTS.coolprep });
  assert.equal(ymd(t.dose1Start), '2026-09-30');
});

const NOW = at(2026, 9, 1, 12, 0);
const run = (examAt, productId, now = NOW) => computeSchedule({ examAt, productId, now });

test('이벤트는 시각순이고 마지막은 검사', () => {
  const { events } = run(at(2026, 9, 10, 9, 0), 'coolprep');
  for (let i = 1; i < events.length; i++) assert.ok(events[i - 1].at <= events[i].at);
  assert.equal(events.at(-1).kind, 'exam');
  assert.equal(hm(events.at(-1).at), '09:00');
});

test('day 라벨: 전날은 D-1, 검사일은 D0', () => {
  const { events } = run(at(2026, 9, 10, 9, 0), 'coolprep');
  const d1 = events.filter((e) => e.day === 'D-1');
  const d0 = events.filter((e) => e.day === 'D0');
  assert.ok(d1.length > 0 && d0.length > 0);
  for (const e of d1) assert.equal(ymd(e.at), '2026-09-09');
  for (const e of d0) assert.equal(ymd(e.at), '2026-09-10');
});

test('쿨프렙 09:00: 복용 단계 4개(1차 2 + 2차 2), 금식 2개, 식이 3개', () => {
  const { events } = run(at(2026, 9, 10, 9, 0), 'coolprep');
  const kinds = (k) => events.filter((e) => e.kind === k);
  assert.equal(kinds('dose').length, 4);
  assert.equal(kinds('fast').length, 2);
  assert.equal(kinds('diet').length, 3);
  const dose = kinds('dose');
  assert.equal(hm(dose[0].at), '18:30'); assert.equal(hm(dose[0].end), '19:30');
  assert.equal(hm(dose[1].at), '19:30'); assert.equal(hm(dose[1].end), '20:00');
  assert.equal(hm(dose[2].at), '05:30'); assert.equal(hm(dose[3].end), '07:00');
  assert.ok(dose[0].title.startsWith('1차 복용 1/2'));
  assert.ok(dose[2].title.startsWith('2차 복용 1/2'));
});

test('쿨프렙 저녁 식이 이벤트는 1차 복용 1시간 전이고 마감 시각이 문구에 들어간다', () => {
  const { events } = run(at(2026, 9, 10, 9, 0), 'coolprep');
  const dinner = events.find((e) => e.kind === 'diet' && e.title.startsWith('저녁'));
  assert.equal(hm(dinner.at), '17:30');
  assert.ok(dinner.detail.includes('17:30'));
  assert.ok(!dinner.detail.includes('{deadline}'));
});

test('플렌뷰 점심 문구에 1차 복용 3시간 전 마감이 들어간다', () => {
  const { events, meta } = run(at(2026, 9, 10, 9, 0), 'plenvu');
  const lunch = events.find((e) => e.kind === 'diet' && e.title.startsWith('점심'));
  assert.equal(hm(lunch.at), '12:00');
  assert.equal(hm(meta.dose1Start), '19:00');
  assert.ok(lunch.detail.includes('16:00'));
});

test('오라팡은 식이 이벤트 2개(아침·점심), 저녁 없음', () => {
  const { events } = run(at(2026, 9, 10, 9, 0), 'orapang');
  const diet = events.filter((e) => e.kind === 'diet');
  assert.equal(diet.length, 2);
  assert.ok(diet.every((e) => !e.title.startsWith('저녁')));
});

test('캘린더 대상 이벤트는 정확히 3개: 아침 식이, 1차 시작, 2차 시작', () => {
  for (const id of ['coolprep', 'orapang', 'plenvu']) {
    const { events, meta } = run(at(2026, 9, 10, 9, 0), id);
    const cal = events.filter((e) => e.calendar);
    assert.equal(cal.length, 3, id);
    assert.equal(hm(cal[0].at), '08:00');
    assert.equal(cal[1].at.getTime(), meta.dose1Start.getTime());
    assert.equal(cal[2].at.getTime(), meta.dose2Start.getTime());
  }
});

test('금식 이벤트: 1차 완료 후 "맑은 음료만", 2차 완료 후 "금식"', () => {
  const { events, meta } = run(at(2026, 9, 10, 9, 0), 'coolprep');
  const fasts = events.filter((e) => e.kind === 'fast');
  assert.equal(fasts[0].at.getTime(), meta.dose1End.getTime());
  assert.ok(fasts[0].title.includes('맑은 음료'));
  assert.equal(fasts[1].at.getTime(), meta.dose2End.getTime());
  assert.ok(fasts[1].title.includes('금식'));
});

test('경고: 정상 케이스는 경고 없음', () => {
  assert.deepEqual(run(at(2026, 9, 10, 9, 0), 'coolprep').warnings, []);
  assert.deepEqual(run(at(2026, 9, 10, 14, 0), 'coolprep').warnings, []);
});

test('경고: 14:00 오라팡 → INTERVAL_LONG', () => {
  const codes = run(at(2026, 9, 10, 14, 0), 'orapang').warnings.map((w) => w.code);
  assert.deepEqual(codes, ['INTERVAL_LONG']);
});

test('경고: 07:00 검사 → EARLY_MORNING (2차 03:30)', () => {
  const { warnings, meta } = run(at(2026, 9, 10, 7, 0), 'coolprep');
  assert.equal(hm(meta.dose2Start), '03:30');
  assert.deepEqual(warnings.map((w) => w.code), ['EARLY_MORNING']);
  assert.ok(warnings[0].message.includes('03:30'));
});

test('경고: 05:00 검사 → EARLY_MORNING + ODD_TIME', () => {
  const codes = run(at(2026, 9, 10, 5, 0), 'coolprep').warnings.map((w) => w.code).sort();
  assert.deepEqual(codes, ['EARLY_MORNING', 'ODD_TIME']);
});

test('경고: 과거 검사 → PAST만 (TOO_SOON 중복 없음)', () => {
  const codes = run(at(2026, 8, 30, 9, 0), 'coolprep').warnings.map((w) => w.code);
  assert.deepEqual(codes, ['PAST']);
});

test('경고: 2차 시작이 이미 지난 임박 검사 → TOO_SOON', () => {
  const codes = run(at(2026, 9, 1, 14, 0), 'coolprep', at(2026, 9, 1, 11, 0)).warnings.map((w) => w.code);
  assert.deepEqual(codes, ['TOO_SOON']);
});

test('잘못된 입력은 throw', () => {
  assert.throws(() => run(at(2026, 9, 10, 9, 0), 'nope'), /unknown product/);
  assert.throws(() => run(at(2026, 9, 10, 9, 0), 'constructor'), /unknown product/);
  assert.throws(() => computeSchedule({ examAt: new Date('x'), productId: 'coolprep' }), /invalid examAt/);
  assert.throws(() => computeSchedule({ examAt: '2026-09-10', productId: 'coolprep' }), /invalid examAt/);
});
