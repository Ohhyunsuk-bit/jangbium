import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS } from '../js/protocols.js';
import {
  addMinutes, addDays, atClock, formatTime, formatDateKo, toParam, parseParam,
  computeDoseTimes,
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
