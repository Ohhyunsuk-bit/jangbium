// 예약자 명단 CSV → 환자별 복용 안내문 .txt 일괄 생성. 계산 로직은 js/schedule.js·protocols.js를 그대로 재사용한다.
// 사용: node tools/batch-prep.mjs <csv경로>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PRODUCTS } from '../js/protocols.js';
import { computeSchedule, formatTime, formatDateKo, parseParam, toParam } from '../js/schedule.js';

export function parseExamAt(s) {
  return parseParam((s ?? '').trim().replace(' ', 'T'));
}

export function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  const [, ...dataLines] = lines; // 첫 줄은 헤더
  return dataLines.map((line, i) => {
    const [name, productId, examAtRaw] = line.split(',').map((s) => (s ?? '').trim());
    return { lineNo: i + 2, name, productId, examAtRaw };
  });
}

export function buildPatient(row) {
  if (!row.name) return { ok: false, lineNo: row.lineNo, name: '', reason: '이름 없음' };
  const product = PRODUCTS[row.productId];
  if (!product) return { ok: false, lineNo: row.lineNo, name: row.name, reason: `알 수 없는 제품: ${row.productId}` };
  const examAt = parseExamAt(row.examAtRaw);
  if (!examAt) return { ok: false, lineNo: row.lineNo, name: row.name, reason: `검사일시 형식 오류: ${row.examAtRaw}` };
  const schedule = computeSchedule({ examAt, productId: row.productId });
  return { ok: true, name: row.name, product, examAt, schedule };
}

export function formatPatientBlock({ name, product, examAt, schedule }) {
  const lines = [`■ ${name}님 · ${formatDateKo(examAt)} ${formatTime(examAt)} 대장내시경 · ${product.short}`, ''];
  let currentDay = null;
  for (const event of schedule.events) {
    const dayLabel = formatDateKo(event.at);
    if (dayLabel !== currentDay) {
      if (currentDay !== null) lines.push('');
      lines.push(`[${dayLabel}]`);
      currentDay = dayLabel;
    }
    lines.push(`${formatTime(event.at)}  ${event.title}`);
  }
  lines.push('', '※ 병원에서 받은 안내가 있으면 그것이 우선입니다.');
  return lines.join('\n');
}

function sanitizeFileName(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_');
}

export function run(csvPath) {
  const text = readFileSync(csvPath, 'utf-8');
  const rows = parseCsv(text);
  const results = rows.map(buildPatient);
  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  if (ok.length === 0) {
    console.log('유효한 환자가 없습니다.');
    for (const r of failed) console.log(`  ✗ ${r.lineNo}행 ${r.name || '(이름 없음)'} — ${r.reason}`);
    process.exitCode = 1;
    return;
  }

  const folderDate = toParam(ok[0].examAt).slice(0, 10);
  const outDir = path.join(path.dirname(csvPath), `안내문_${folderDate}`);
  mkdirSync(outDir, { recursive: true });

  console.log(`CSV ${rows.length}명 확인`);
  console.log(`출력 폴더: ${outDir}`);

  const nameCounts = new Map();
  for (const patient of ok) {
    const base = sanitizeFileName(patient.name);
    const count = (nameCounts.get(base) ?? 0) + 1;
    nameCounts.set(base, count);
    const fileName = count === 1 ? `${base}.txt` : `${base}_${count}.txt`;
    writeFileSync(path.join(outDir, fileName), formatPatientBlock(patient), 'utf-8');
    console.log(`  ✓ ${fileName}`);
  }
  for (const r of failed) console.log(`  ✗ ${r.lineNo}행 ${r.name || '(이름 없음)'} — ${r.reason}`);
  console.log('완료 — 문자 발송 시스템에 복붙하세요.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('사용: node tools/batch-prep.mjs <csv경로>');
    process.exitCode = 1;
  } else {
    run(csvPath);
  }
}
