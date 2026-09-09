import { PRODUCTS } from './protocols.js';
import { computeSchedule, parseParam, toParam, formatTime, formatDateKo, addDays, startOfDay } from './schedule.js';
import { buildIcs } from './ics.js';
import { esc, toast, share } from './ui-utils.js';

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page === 'product') initProductForm();
  if (page === 'plan') initPlanPage();
});

function initProductForm() {
  const productId = document.body.dataset.product;
  if (!PRODUCTS[productId]) return;
  const form = document.getElementById('exam-form');
  const dateEl = form.elements.date;
  const timeEl = form.elements.time;

  const today = new Date();
  dateEl.min = toParam(today).slice(0, 10);
  if (!dateEl.value) dateEl.value = toParam(addDays(today, 1)).slice(0, 10);
  if (!timeEl.value) timeEl.value = '09:00';

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (!dateEl.value || !timeEl.value) {
      form.reportValidity();
      return;
    }
    const t = `${dateEl.value}T${timeEl.value.slice(0, 5)}`;
    location.href = `plan.html?p=${encodeURIComponent(productId)}&t=${encodeURIComponent(t)}`;
  });
}

function invalidMarkup() {
  return `
    <section class="card">
      <h1>시간표를 만들 수 없습니다</h1>
      <p class="muted">링크가 잘못되었습니다. 제품을 다시 선택해 주세요.</p>
      <a class="btn btn--primary" href="./">제품 선택으로</a>
    </section>`;
}

function renderEvent(e) {
  const end = e.end ? `<small>~${formatTime(e.end)}</small>` : '';
  return `
    <div class="event event--${e.kind}">
      <div class="event__time">${formatTime(e.at)}${end}</div>
      <div>
        <div class="event__title">${esc(e.title)}</div>
        <div class="event__detail">${esc(e.detail)}</div>
      </div>
    </div>`;
}

function renderPlan({ events, warnings, meta }) {
  const { product, examAt } = meta;
  const prevDay = addDays(startOfDay(examAt), -1);
  const group = (day) => events.filter((e) => e.day === day).map(renderEvent).join('');
  const warn = warnings.length
    ? `<div class="banner" role="alert"><ul>${warnings.map((w) => `<li>${esc(w.message)}</li>`).join('')}</ul></div>`
    : '';
  return `
    <section class="hero">
      <h1>${esc(product.name)} 복용 시간표</h1>
      <p class="muted">검사: ${formatDateKo(examAt)} ${formatTime(examAt)} · 2차 복용은 검사 2시간 전에 끝납니다.</p>
      <p class="muted">병원에서 다른 식이·복용 안내를 받았다면 그것을 따르세요.</p>
    </section>
    ${warn}
    <div class="timeline">
      <section class="day">
        <div class="day__title">검사 전날 <span class="muted">${formatDateKo(prevDay)}</span></div>
        ${group('D-1')}
      </section>
      <section class="day">
        <div class="day__title">검사 당일 <span class="muted">${formatDateKo(examAt)}</span></div>
        ${group('D0')}
      </section>
    </div>`;
}

function downloadIcs({ events, meta, tParam }) {
  const ics = buildIcs({ events, uidSeed: `${meta.product.id}-${tParam}` });
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `장비움-${meta.product.short}-${tParam.slice(0, 10)}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('캘린더 파일을 내려받았습니다');
}

function initPlanPage() {
  const params = new URLSearchParams(location.search);
  const productId = params.get('p') ?? '';
  const tParam = params.get('t') ?? '';
  const examAt = parseParam(tParam);
  const root = document.getElementById('plan');
  const bar = document.getElementById('bar');

  if (!Object.hasOwn(PRODUCTS, productId) || !examAt) {
    root.innerHTML = invalidMarkup();
    bar.hidden = true;
    return;
  }

  let result;
  try {
    result = computeSchedule({ examAt, productId });
  } catch {
    root.innerHTML = invalidMarkup();
    bar.hidden = true;
    return;
  }
  const { meta } = result;
  document.title = `${meta.product.short} 복용 시간표 · ${formatDateKo(examAt)} ${formatTime(examAt)} | 장비움`;
  root.innerHTML = renderPlan(result);
  const src = document.getElementById('source-line');
  src.innerHTML = `소화기내과 전문의 감수 · 복용법 출처: <a href="${esc(meta.product.source.url)}" rel="noopener" target="_blank">${esc(meta.product.source.label)}</a>`;
  bar.hidden = false;
  document.getElementById('btn-ics').addEventListener('click', () => downloadIcs({ events: result.events, meta, tParam: toParam(examAt) }));
  document.getElementById('btn-share').addEventListener('click', () => share({
    title: `${meta.product.name} 복용 시간표 (${formatDateKo(examAt)} ${formatTime(examAt)} 검사)`,
    url: location.href,
  }));
}
