import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSchedule } from '../js/schedule.js';
import { buildIcs, escapeText, icsLocal, icsUtc, foldLine } from '../js/ics.js';

const at = (y, mo, d, h, mi) => new Date(y, mo - 1, d, h, mi, 0, 0);
const NOW = new Date(Date.UTC(2026, 8, 1, 3, 0, 0));

function sample() {
  const { events } = computeSchedule({ examAt: at(2026, 9, 10, 9, 0), productId: 'coolprep', now: at(2026, 9, 1, 12, 0) });
  return buildIcs({ events, uidSeed: 'coolprep-2026-09-10T09:00', now: NOW });
}

test('escapeText: 역슬래시·세미콜론·쉼표·줄바꿈', () => {
  assert.equal(escapeText('a;b,c\\d\ne'), 'a\\;b\\,c\\\\d\\ne');
});

test('icsLocal/icsUtc 형식', () => {
  assert.equal(icsLocal(at(2026, 9, 9, 18, 30)), '20260909T183000');
  assert.equal(icsUtc(NOW), '20260901T030000Z');
});

test('foldLine: UTF-8 75옥텟 단위로 접고 이어지는 줄은 공백으로 시작, 짧은 줄은 그대로', () => {
  const s = '가'.repeat(60); // 180옥텟
  const parts = foldLine(s).split('\r\n');
  assert.equal(parts.length, 3);
  assert.equal(parts[0].length, 25); // 25자 × 3옥텟 = 75
  assert.ok(parts[1].startsWith(' ') && parts[2].startsWith(' '));
  assert.equal(parts[1].length, 25); // 공백 1 + 24자(72옥텟) = 73옥텟
  assert.equal(foldLine('short'), 'short');
  const ascii = 'DTSTART;TZID=Asia/Seoul:20260909T080000';
  assert.equal(foldLine(ascii), ascii); // 40옥텟은 접지 않는다
});

test('VEVENT 3개, CRLF, TZID, VALARM 30분 전', () => {
  const ics = sample();
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 3);
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.ok(!/[^\r]\n/.test(ics), 'LF 단독 줄바꿈이 없어야 한다');
  assert.ok(ics.includes('DTSTART;TZID=Asia/Seoul:20260909T080000'));
  assert.ok(ics.includes('DTSTART;TZID=Asia/Seoul:20260909T183000'));
  assert.ok(ics.includes('DTSTART;TZID=Asia/Seoul:20260910T053000'));
  assert.equal((ics.match(/TRIGGER:-PT30M/g) || []).length, 3);
  assert.equal((ics.match(/DTSTAMP:20260901T030000Z/g) || []).length, 3);
});

test('UID는 uidSeed로 결정적이다', () => {
  const a = sample();
  const b = sample();
  assert.equal(a, b);
  assert.ok(a.includes('UID:coolprep-2026-09-10T09:00-0@jangbium'));
  assert.ok(a.includes('UID:coolprep-2026-09-10T09:00-2@jangbium'));
});

test('SUMMARY에 [장비움] 접두어, DESCRIPTION은 이스케이프됨', () => {
  const ics = sample();
  assert.ok(ics.includes('SUMMARY:[장비움] 1차 복용 1/2'));
  // 쿨프렙 아침 식이 detail에는 쉼표가 있으므로 "\," 로 나와야 한다
  assert.ok(ics.includes('\\,'));
});

test('end가 없는 이벤트는 30분 길이', () => {
  const ics = sample();
  assert.ok(ics.includes('DTEND;TZID=Asia/Seoul:20260909T083000'));
});
