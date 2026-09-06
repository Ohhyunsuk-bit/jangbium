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
  const dose1Start = clampDate(
    addMinutes(dose2Start, -DOSE_GAP_MIN),
    atClock(prevDay, DOSE1_EARLIEST),
    atClock(prevDay, DOSE1_LATEST),
  );
  const dose1End = addMinutes(dose1Start, totalMinutes(steps1));
  return { dose1Start, dose1End, dose2Start, dose2End };
}

// computeSchedule은 Task 3에서 추가한다. CLEAR_LIQUIDS import는 그때 사용.
export { CLEAR_LIQUIDS as _clearLiquids };
