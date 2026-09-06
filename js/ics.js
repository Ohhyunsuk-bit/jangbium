// RFC 5545 최소 구현. DOM 없음.
const CRLF = '\r\n';
const pad = (n) => String(n).padStart(2, '0');

export function icsLocal(d) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

export function icsUtc(d) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

export function escapeText(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// RFC 5545 3.1: 한 줄은 75옥텟 이하, 이어지는 줄은 공백 하나로 시작. UTF-8 바이트 기준으로 접는다.
const encoder = new TextEncoder();
export function foldLine(line) {
  const LIMIT = 75;
  const out = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const b = encoder.encode(ch).length;
    if (bytes + b > LIMIT) {
      out.push(cur);
      cur = ' ' + ch;
      bytes = 1 + b;
    } else {
      cur += ch;
      bytes += b;
    }
  }
  out.push(cur);
  return out.join(CRLF);
}

export function buildIcs({ events, uidSeed, now = new Date(), tzid = 'Asia/Seoul', alarmMinutes = 30 }) {
  const items = events.filter((e) => e.calendar);
  const stamp = icsUtc(now);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//jangbium//장정결 스케줄러//KO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  items.forEach((e, i) => {
    const end = e.end ?? new Date(e.at.getTime() + 30 * 60_000);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uidSeed}-${i}@jangbium`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=${tzid}:${icsLocal(e.at)}`,
      `DTEND;TZID=${tzid}:${icsLocal(end)}`,
      `SUMMARY:${escapeText('[장비움] ' + e.title)}`,
      `DESCRIPTION:${escapeText(e.detail)}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(e.title)}`,
      `TRIGGER:-PT${alarmMinutes}M`,
      'END:VALARM',
      'END:VEVENT',
    );
  });
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join(CRLF) + CRLF;
}
