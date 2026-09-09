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
