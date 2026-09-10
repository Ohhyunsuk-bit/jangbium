import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseCsv, buildPatient, formatPatientBlock, run } from '../tools/batch-prep.mjs';

const SAMPLE_CSV = `이름,제품,검사일시
김민수,coolprep,2026-09-11 09:00
이영희,orapang,2026-09-11 10:30
김민수,plenvu,2026-09-11 14:00
박준호,unknown,2026-09-11 09:00
최지우,coolprep,2026-9-11 9:00
`;

test('parseCsv: 헤더 제외, 행마다 이름·제품·검사일시 추출', () => {
  const rows = parseCsv(SAMPLE_CSV);
  assert.equal(rows.length, 5);
  assert.deepEqual(rows[0], { lineNo: 2, name: '김민수', productId: 'coolprep', examAtRaw: '2026-09-11 09:00' });
});

test('buildPatient: 정상 행은 schedule.js 계산 결과를 그대로 담는다', () => {
  const p = buildPatient({ lineNo: 2, name: '김민수', productId: 'coolprep', examAtRaw: '2026-09-11 09:00' });
  assert.equal(p.ok, true);
  assert.equal(p.product.short, '쿨프렙');
  assert.equal(p.schedule.events.at(-1).title, '대장내시경 검사');
});

test('buildPatient: 알 수 없는 제품은 실패로 보고한다', () => {
  const p = buildPatient({ lineNo: 5, name: '박준호', productId: 'unknown', examAtRaw: '2026-09-11 09:00' });
  assert.equal(p.ok, false);
  assert.match(p.reason, /알 수 없는 제품/);
});

test('buildPatient: 형식이 틀린 검사일시는 실패로 보고한다', () => {
  const p = buildPatient({ lineNo: 6, name: '최지우', productId: 'coolprep', examAtRaw: '2026-9-11 9:00' });
  assert.equal(p.ok, false);
  assert.match(p.reason, /검사일시 형식 오류/);
});

test('buildPatient: 이름이 없으면 실패로 보고한다', () => {
  const p = buildPatient({ lineNo: 7, name: '', productId: 'coolprep', examAtRaw: '2026-09-11 09:00' });
  assert.equal(p.ok, false);
  assert.equal(p.reason, '이름 없음');
});

test('formatPatientBlock: 날짜별로 묶이고 마지막에 안내 문구가 붙는다', () => {
  const p = buildPatient({ lineNo: 2, name: '김민수', productId: 'coolprep', examAtRaw: '2026-09-10 09:00' });
  const block = formatPatientBlock(p);
  assert.ok(block.startsWith('■ 김민수님 · 9월 10일 (목) 09:00 대장내시경 · 쿨프렙'));
  assert.ok(block.includes('[9월 9일 (수)]'));
  assert.ok(block.includes('[9월 10일 (목)]'));
  assert.ok(block.includes('18:30  1차 복용 1/2: 조제 용액 1L 마시기'));
  assert.ok(block.endsWith('※ 병원에서 받은 안내가 있으면 그것이 우선입니다.'));
});

test('run: 유효한 환자마다 .txt를 쓰고, 동명이인은 번호를 붙이고, 실패 행은 건너뛴다', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'batch-prep-'));
  const csvPath = path.join(dir, '내일예약.csv');
  writeFileSync(csvPath, SAMPLE_CSV, 'utf-8');

  run(csvPath);

  const outDir = path.join(dir, '안내문_2026-09-11');
  const files = readdirSync(outDir).sort();
  assert.deepEqual(files, ['김민수.txt', '김민수_2.txt', '이영희.txt']);

  const first = readFileSync(path.join(outDir, '김민수.txt'), 'utf-8');
  assert.ok(first.includes('쿨프렙'));
  const second = readFileSync(path.join(outDir, '김민수_2.txt'), 'utf-8');
  assert.ok(second.includes('플렌뷰'));
});

test('run: 유효한 환자가 하나도 없으면 폴더를 만들지 않고 exitCode 1을 남긴다', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'batch-prep-empty-'));
  const csvPath = path.join(dir, '전부틀림.csv');
  writeFileSync(csvPath, '이름,제품,검사일시\n박준호,unknown,2026-09-11 09:00\n', 'utf-8');

  const before = process.exitCode;
  run(csvPath);
  assert.equal(process.exitCode, 1);
  process.exitCode = before;

  assert.deepEqual(readdirSync(dir).sort(), ['전부틀림.csv']);
});
