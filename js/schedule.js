// 순수 계산 모듈. DOM·전역 상태 없음. 시간대는 실행 환경의 로컬 시간(한국은 서머타임 없음).
import { PRODUCTS, CLEAR_LIQUIDS } from './protocols.js';

export const EXAM_OFFSET_MIN = 120;      // 2차 복용 완료 = 검사 2시간 전 (스펙 5.1)
export const DOSE_GAP_MIN = 11 * 60;     // 1차 시작 = 2차 시작 − 11시간
export const DOSE1_EARLIEST = '18:00';   // 1차 시작 clamp 하한 (전날)
export const DOSE1_LATEST = '22:00';     // 1차 시작 clamp 상한 (전날)
export const EARLY_MORNING_HOUR = 5;     // 2차 시작이 이보다 이르면 EARLY_MORNING 경고

const pad = (n) => String(n).padStart(2, '0');

export function addMinutes(d, m) {
  return new Date(d.getTime() + m * 60_000);
}

export function addDays(d, n) {
  const r = new Date(d.getTime());
  r.setDate(r.getDate() + n);
  return r;
}

export function startOfDay(d) {
  const r = new Date(d.getTime());
  r.setHours(0, 0, 0, 0);
  return r;
}

export function atClock(day, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const r = startOfDay(day);
  r.setHours(h, m, 0, 0);
  return r;
}

export function sameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatTime(d) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

export function formatDateKo(d) {
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYS_KO[d.getDay()]})`;
}

export function toParam(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${formatTime(d)}`;
}

export function parseParam(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(s ?? '');
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  const date = new Date(y, mo - 1, d, h, mi, 0, 0);
  // new Date(2026, 1, 31)처럼 넘치는 날짜를 거른다
  if (date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}

const clampDate = (d, lo, hi) => (d < lo ? lo : d > hi ? hi : d);
const totalMinutes = (steps) => steps.reduce((s, st) => s + st.minutes, 0);

export function computeDoseTimes({ examAt, product }) {
  const [steps1, steps2] = product.doses;
  const dose2End = addMinutes(examAt, -EXAM_OFFSET_MIN);
  const dose2Start = addMinutes(dose2End, -totalMinutes(steps2));
  const prevDay = addDays(startOfDay(examAt), -1);
  const dose1Ideal = addMinutes(dose2Start, -DOSE_GAP_MIN);
  const dose1Start = clampDate(
    dose1Ideal,
    atClock(prevDay, DOSE1_EARLIEST),
    atClock(prevDay, DOSE1_LATEST),
  );
  const dose1Clamped = dose1Start.getTime() !== dose1Ideal.getTime();
  const dose1End = addMinutes(dose1Start, totalMinutes(steps1));
  return { dose1Start, dose1End, dose2Start, dose2End, dose1Clamped };
}

function pushDose(push, steps, start, label) {
  let t = start;
  steps.forEach((st, i) => {
    const end = addMinutes(t, st.minutes);
    push({
      at: t,
      end,
      kind: 'dose',
      title: `${label} ${i + 1}/${steps.length}: ${st.title}`,
      detail: st.detail,
      calendar: i === 0,
    });
    t = end;
  });
}

export function computeSchedule({ examAt, productId, now = new Date() }) {
  const product = Object.hasOwn(PRODUCTS, productId) ? PRODUCTS[productId] : undefined;
  if (!product) throw new Error(`unknown product: ${productId}`);
  if (!(examAt instanceof Date) || Number.isNaN(examAt.getTime())) throw new Error('invalid examAt');

  const [steps1, steps2] = product.doses;
  const { dose1Start, dose1End, dose2Start, dose2End, dose1Clamped } = computeDoseTimes({ examAt, product });
  const prevDay = addDays(startOfDay(examAt), -1);

  const events = [];
  const push = (e) => events.push({ calendar: false, ...e, day: sameDate(e.at, examAt) ? 'D0' : 'D-1' });

  for (const d of product.diet) {
    const deadline =
      d.deadlineBeforeDose1Min != null ? addMinutes(dose1Start, -d.deadlineBeforeDose1Min)
      : d.beforeDose1Min != null ? addMinutes(dose1Start, -d.beforeDose1Min)
      : null;
    const at = d.clock ? atClock(prevDay, d.clock) : deadline;
    push({
      at,
      kind: 'diet',
      title: d.title,
      detail: d.detail.replace('{deadline}', deadline ? formatTime(deadline) : ''),
      calendar: d.slot === 'breakfast',
    });
  }

  pushDose(push, steps1, dose1Start, '1차 복용');
  push({ at: dose1End, kind: 'fast', title: '1차 완료 — 이후 맑은 음료만', detail: CLEAR_LIQUIDS });
  pushDose(push, steps2, dose2Start, '2차 복용');
  push({ at: dose2End, kind: 'fast', title: '2차 완료 — 검사까지 금식', detail: '물을 포함해 아무것도 드시지 마세요.' });
  push({ at: examAt, kind: 'exam', title: '대장내시경 검사', detail: '검사 시작 시각입니다. 늦지 않게 도착하세요.' });

  events.sort((a, b) => a.at - b.at);

  const warnings = [];
  if (examAt < now) {
    warnings.push({ code: 'PAST', message: '검사 시각이 이미 지났습니다. 참고용으로만 보세요.' });
  } else if (dose2Start < now) {
    warnings.push({ code: 'TOO_SOON', message: '2차 복용 시작 시각이 이미 지났습니다. 병원에 바로 문의하세요.' });
  }
  if (dose2Start.getHours() < EARLY_MORNING_HOUR) {
    warnings.push({ code: 'EARLY_MORNING', message: `2차 복용이 새벽 ${formatTime(dose2Start)}에 시작됩니다. 알람을 맞춰 두세요.` });
  }
  const h = examAt.getHours();
  if (h < 6 || h >= 20) {
    warnings.push({ code: 'ODD_TIME', message: '검사 시각이 일반적인 진료 시간을 벗어났습니다. 입력한 시간이 맞는지 확인하세요.' });
  }
  if (product.maxIntervalHours != null && (dose2Start - dose1Start) / 3_600_000 > product.maxIntervalHours) {
    warnings.push({
      code: 'INTERVAL_LONG',
      message: `1차와 2차 복용 간격이 ${product.maxIntervalHours}시간을 넘습니다. 병원에서 안내한 복용 시각이 있으면 그것을 따르세요.`,
    });
  }
  if (dose1Clamped) {
    warnings.push({
      code: 'DOSE1_CLAMPED',
      message: `1차 복용 시각이 ${DOSE1_EARLIEST}~${DOSE1_LATEST} 범위로 조정되어, 2차보다 정확히 11시간 전은 아닙니다. 병원에서 안내받은 시각과 다를 수 있습니다.`,
    });
  }

  return { events, warnings, meta: { product, examAt, dose1Start, dose1End, dose2Start, dose2End } };
}
