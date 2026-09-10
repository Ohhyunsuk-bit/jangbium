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

export const FLAG_CHARS = {
  villous: 'V',
  highGrade: 'H',
  tsa: 'T',
  sslDysplasia: 'D',
  serrated10: 'L',
  piecemeal: 'P',
};

export const SSL_BANDS = ['0', '1', '3', '5']; // 0개 / 1~2개 / 3~4개 / 5개 이상

const FLAG_TEXT = {
  villous: '관융모 또는 융모샘종이 있습니다.',
  highGrade: '고도이형성이 동반되었습니다.',
  tsa: '전통톱니선종(TSA)이 있습니다.',
  sslDysplasia: '이형성이 동반된 톱니병변(SSL)이 있습니다.',
  serrated10: '톱니용종이 10mm 이상입니다.',
};

export function computeRecall({ examDate, adenomaCount = 0, maxSizeMm = 0, flags = new Set(), sslBand = '0', prepInadequate = false }) {
  if (!(examDate instanceof Date) || Number.isNaN(examDate.getTime())) throw new Error('invalid examDate');
  if (!Number.isInteger(adenomaCount) || adenomaCount < 0) throw new Error('invalid adenomaCount');
  if (!Number.isInteger(maxSizeMm) || maxSizeMm < 0) throw new Error('invalid maxSizeMm');
  if (!SSL_BANDS.includes(sslBand)) throw new Error('invalid sslBand');

  const has = (k) => flags.has(k);
  const reasons = [];
  const caveats = [];
  if (prepInadequate) {
    caveats.push('이번 검사의 장정결 상태가 불량했습니다. 추적 간격이 단축될 수 있으니 병원에 확인하세요.');
  }

  let risk, minMonths, maxMonths;

  if (has('piecemeal')) {
    risk = 'piecemeal';
    minMonths = maxMonths = 6;
    reasons.push('20mm 이상의 폴립을 분할 절제했습니다.');
    caveats.push('6개월 이후의 추적 간격은 그때 소견을 반영해 병원에서 다시 정합니다.');
  } else if (adenomaCount > 10) {
    risk = 'veryhigh';
    minMonths = maxMonths = 12;
    reasons.push(`선종이 ${adenomaCount}개로 10개를 초과했습니다.`);
  } else {
    const highReasons = [];
    if (maxSizeMm >= 10) highReasons.push(`선종 최대 크기가 ${maxSizeMm}mm로 10mm 이상입니다.`);
    if (adenomaCount >= 5) highReasons.push(`선종이 ${adenomaCount}개로 5개 이상입니다.`);
    for (const key of ['villous', 'highGrade', 'tsa', 'sslDysplasia', 'serrated10']) {
      if (has(key)) highReasons.push(FLAG_TEXT[key]);
    }
    if (sslBand === '5') highReasons.push('톱니병변(SSL)이 5개 이상입니다.');

    if (highReasons.length > 0) {
      risk = 'high';
      minMonths = maxMonths = 36;
      reasons.push(...highReasons);
    } else {
      const modReasons = [];
      if (adenomaCount >= 3) modReasons.push(`선종이 ${adenomaCount}개입니다.`);
      if (sslBand === '3') modReasons.push('톱니병변(SSL)이 3~4개입니다.');

      if (modReasons.length > 0) {
        risk = 'moderate';
        minMonths = 36;
        maxMonths = 60;
        reasons.push(...modReasons);
      } else if (adenomaCount === 0 && sslBand === '0') {
        risk = 'none';
        minMonths = maxMonths = null;
        reasons.push('이번 검사에서 절제한 용종이 없습니다.');
      } else {
        risk = 'low';
        minMonths = 60;
        maxMonths = 120;
        reasons.push('특별한 위험 소견이 없습니다.');
      }
    }
  }

  const dates =
    risk === 'none' ? []
    : minMonths === maxMonths ? [addMonthsClamped(examDate, minMonths)]
    : [addMonthsClamped(examDate, minMonths), addMonthsClamped(examDate, maxMonths)];

  return { risk, months: risk === 'none' ? null : [minMonths, maxMonths], dates, reasons, caveats };
}

export function buildRecallEvents(result, examDate) {
  if (result.risk === 'none' || result.dates.length === 0) return [];
  const target = result.dates[0];
  const at = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 9, 0, 0, 0);
  const end = new Date(at.getTime() + 30 * 60_000);
  const events = [
    {
      at,
      end,
      calendar: true,
      title: '대장내시경 추적검사 예정',
      detail: `${result.reasons.join(' ')} 병원에서 정해준 날짜가 있으면 그것을 따르세요.`,
    },
  ];
  const reminderMonths = result.months[0] <= 6 ? 1 : 3;
  const remindAt = addMonthsClamped(at, -reminderMonths);
  if (remindAt > examDate) {
    events.push({
      at: remindAt,
      end: new Date(remindAt.getTime() + 30 * 60_000),
      calendar: true,
      title: '대장내시경 예약할 때',
      detail: '다음 대장내시경 추적검사를 예약할 시기입니다.',
    });
  }
  return events;
}

export function formatMonthsRange(min, max) {
  if (min === max) return formatMonths(min);
  if (min % 12 === 0 && max % 12 === 0) return `${min / 12}~${max / 12}년`;
  return `${formatMonths(min)}~${formatMonths(max)}`;
}

export function buildReportText(result, examDate) {
  if (result.risk === 'none') {
    const base = `${formatDateOnly(examDate)} 검사: 절제한 용종 없음. 일반 검진 주기를 따르세요.`;
    return result.caveats.length ? `${base} ${result.caveats.join(' ')}` : base;
  }
  const when = `${formatMonthsRange(result.months[0], result.months[1])} 후`;
  const whenDate =
    result.dates.length > 1 ? `${formatYearMonthKo(result.dates[0])} ~ ${formatYearMonthKo(result.dates[1])}`
    : `${formatYearMonthKo(result.dates[0])}`;
  return `${result.reasons.join(' ')} 2022 한국 폴립절제 후 추적 대장내시경 검사 지침에 따라 ${when} 추적 대장내시경을 권고합니다 (${whenDate}).`;
}

export function parseRecallParams(params) {
  const examDate = parseDateOnly(params.get('d'));
  if (!examDate) return null;

  const nRaw = params.get('n');
  if (!/^\d{1,3}$/.test(nRaw ?? '')) return null;
  const adenomaCount = Number(nRaw);

  const sRaw = params.get('s');
  if (!/^\d{1,3}$/.test(sRaw ?? '')) return null;
  const maxSizeMm = Number(sRaw);

  const fRaw = params.get('f') ?? '';
  const validChars = new Set(Object.values(FLAG_CHARS));
  if ([...fRaw].some((c) => !validChars.has(c))) return null;
  const flags = new Set();
  for (const [key, ch] of Object.entries(FLAG_CHARS)) {
    if (fRaw.includes(ch)) flags.add(key);
  }

  const sslBand = params.get('ssl') ?? '0';
  if (!SSL_BANDS.includes(sslBand)) return null;

  const bRaw = params.get('b') ?? '0';
  if (bRaw !== '0' && bRaw !== '1') return null;

  return { examDate, adenomaCount, maxSizeMm, flags, sslBand, prepInadequate: bRaw === '1' };
}

export function buildRecallQuery(input) {
  const p = new URLSearchParams();
  p.set('d', formatDateOnly(input.examDate));
  p.set('n', String(input.adenomaCount));
  p.set('s', String(input.maxSizeMm));
  const f = Object.entries(FLAG_CHARS).filter(([key]) => input.flags.has(key)).map(([, ch]) => ch).join('');
  if (f) p.set('f', f);
  if (input.sslBand && input.sslBand !== '0') p.set('ssl', input.sslBand);
  if (input.prepInadequate) p.set('b', '1');
  return p.toString();
}
