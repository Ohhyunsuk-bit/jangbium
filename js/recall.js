// 순수 계산 모듈. DOM 없음.
// 근거: 「폴립 절제 후 추적 대장내시경 검사 진료 지침 개정안 2022」
// (대한소화기학회·대한소화기내시경학회·대한장연구학회·대한복부영상의학회,
//  Clinical Endoscopy 2022;55:703-725, doi: 10.5946/ce.2022.136, Table 4)

const pad = (n) => String(n).padStart(2, '0');

export function parseDateOnly(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? '');
  if (!m) return null;
  const [, y, mo, d] = m.map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, mo - 1, d, 0, 0, 0, 0);
  if (date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}

export function formatDateOnly(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addMonthsClamped(date, months) {
  const day = date.getDate();
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const daysInTarget = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, daysInTarget));
  return target;
}

export function formatYearMonthKo(d) {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

export function formatMonths(n) {
  return n % 12 === 0 ? `${n / 12}년` : `${n}개월`;
}
