import {
  computeRecall, buildReportText, buildRecallEvents, formatMonthsRange, formatDateLine,
  parseDateOnly, formatDateOnly, buildRecallQuery, parseRecallParams,
} from './recall.js';
import { buildIcs } from './ics.js';
import { esc, toast, share, copyText } from './ui-utils.js';

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page === 'recall') initRecallForm();
  if (page === 'recall-plan') initRecallPlanPage();
});

const RISK_LABEL = {
  none: '해당 없음',
  low: '저위험',
  moderate: '중등도 위험',
  high: '고위험',
  veryhigh: '고위험(1년 간격)',
  piecemeal: '분할절제 후',
};

function formatRange(result) {
  const big = `${formatMonthsRange(result.months[0], result.months[1])} 뒤`;
  const dateLine = formatDateLine(result, { withApprox: true });
  return { big, dateLine };
}

// alert: true면 role="alert"로 즉시 재고지(환자 화면처럼 한 번만 렌더될 때).
// 의사 화면(recall.html)은 입력할 때마다 결과 카드를 통째로 다시 그리므로
// role="alert"를 붙이면 키 입력마다 스크린리더가 같은 배너를 재안내하게 된다 — 그래서 false로 호출한다.
function caveatsMarkup(result, { alert = false } = {}) {
  return result.caveats.length
    ? `<div class="banner"${alert ? ' role="alert"' : ''}><ul>${result.caveats.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div>`
    : '';
}

function renderResultCard(el, input, result) {
  if (result.risk === 'none') {
    el.innerHTML = `
      <span class="tag">${esc(RISK_LABEL.none)}</span>
      <p class="muted">${esc(result.reasons[0])} 일반 검진 주기를 따르세요.</p>
      ${caveatsMarkup(result)}`;
    return;
  }
  const { big, dateLine } = formatRange(result);
  const reasons = result.reasons.map((r) => `<li>${esc(r)}</li>`).join('');
  el.innerHTML = `
    <span class="tag">${esc(RISK_LABEL[result.risk])}</span>
    <div class="big">${esc(big)}<small>${esc(dateLine)}</small></div>
    <ul class="why">${reasons}</ul>
    ${caveatsMarkup(result)}
    <div class="copybox">${esc(buildReportText(result, input.examDate))}</div>`;
}

function readInput(form) {
  const flags = new Set();
  form.querySelectorAll('.chip.on').forEach((btn) => flags.add(btn.dataset.flag));
  return {
    examDate: parseDateOnly(form.elements['r-date'].value) ?? new Date(),
    adenomaCount: Math.min(999, Math.max(0, Math.trunc(Number(form.elements['r-count'].value)) || 0)),
    maxSizeMm: Math.min(999, Math.max(0, Math.trunc(Number(form.elements['r-size'].value)) || 0)),
    flags,
    sslBand: form.elements['r-ssl'].value,
    prepInadequate: form.elements['r-prep'].value === '1',
  };
}

function initRecallForm() {
  const form = document.getElementById('recall-form');
  const resultEl = document.getElementById('recall-result');
  const bar = document.getElementById('bar');
  const dateEl = form.elements['r-date'];
  dateEl.max = formatDateOnly(new Date());
  if (!dateEl.value) dateEl.value = formatDateOnly(new Date());

  let lastInput = null;
  let lastResult = null;

  function update() {
    lastInput = readInput(form);
    lastResult = computeRecall(lastInput);
    renderResultCard(resultEl, lastInput, lastResult);
    bar.hidden = false;
  }

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.querySelectorAll('.chip').forEach((btn) => {
    btn.setAttribute('aria-pressed', btn.classList.contains('on'));
    btn.addEventListener('click', () => {
      btn.classList.toggle('on');
      btn.setAttribute('aria-pressed', btn.classList.contains('on'));
      update();
    });
  });
  update();

  document.getElementById('btn-copy').addEventListener('click', () => {
    if (!lastResult) return;
    copyText(buildReportText(lastResult, lastInput.examDate), '결과지 문구를 복사했습니다');
  });
  document.getElementById('btn-patient-link').addEventListener('click', () => {
    if (!lastInput) return;
    const url = new URL(`recall-plan.html?${buildRecallQuery(lastInput)}`, location.href).href;
    copyText(url, '환자용 링크를 복사했습니다');
    window.open(url, '_blank', 'noopener');
  });
}

function invalidRecallMarkup() {
  return `
    <section class="card">
      <h1>다음 검사 시기를 계산할 수 없습니다</h1>
      <p class="muted">링크가 잘못되었습니다. 병원에서 다시 링크를 받아 주세요.</p>
      <a class="btn btn--primary" href="recall.html">계산기로</a>
    </section>`;
}

function renderQr(url) {
  const holder = document.getElementById('qr-holder');
  if (!holder) return;
  if (typeof window.qrcode !== 'function') {
    holder.innerHTML = `<p class="muted">QR을 표시할 수 없습니다. 아래 링크를 사용하세요.</p><p class="muted">${esc(url)}</p>`;
    return;
  }
  const qr = window.qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  holder.innerHTML = qr.createSvgTag(4, 8);
}

function renderPatientPlan(result) {
  const root = document.getElementById('plan');
  if (result.risk === 'none') {
    root.innerHTML = `
      <section class="hero">
        <h1>이번 계산기의 대상이 아닙니다</h1>
        <p class="muted">${esc(result.reasons[0])} 일반 검진 주기를 따르세요.</p>
        <p class="muted">병원에서 따로 정해준 날짜가 있으면 그것을 따르세요.</p>
      </section>
      ${caveatsMarkup(result, { alert: true })}`;
    return;
  }
  const { big, dateLine } = formatRange(result);
  root.innerHTML = `
    <section class="hero">
      <h1>다음 대장내시경은 ${esc(big)}</h1>
      <p class="muted">${esc(dateLine)}</p>
      <p>${esc(result.reasons.join(' '))} 2022년 한국 폴립절제 후 추적 대장내시경 검사 지침에 따른 계산입니다.</p>
      <p class="muted">병원에서 따로 정해준 날짜가 있으면 그것을 따르세요.</p>
    </section>
    ${caveatsMarkup(result, { alert: true })}
    <section class="card">
      <p class="muted">이 화면을 QR로 저장하거나 인쇄할 수 있습니다.</p>
      <div id="qr-holder"></div>
    </section>`;
  renderQr(location.href);
}

function downloadRecallIcs({ result, input }) {
  const events = buildRecallEvents(result, input.examDate);
  const ics = buildIcs({ events, uidSeed: `recall-${formatDateOnly(input.examDate)}-${result.risk}` });
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `장비움-추적검사-${formatDateOnly(input.examDate)}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('캘린더 파일을 내려받았습니다');
}

function initRecallPlanPage() {
  const params = new URLSearchParams(location.search);
  const input = parseRecallParams(params);
  const root = document.getElementById('plan');
  const bar = document.getElementById('bar');

  if (!input) {
    root.innerHTML = invalidRecallMarkup();
    bar.hidden = true;
    return;
  }

  let result;
  try {
    result = computeRecall(input);
  } catch {
    root.innerHTML = invalidRecallMarkup();
    bar.hidden = true;
    return;
  }

  renderPatientPlan(result);

  if (result.risk === 'none') {
    bar.hidden = true;
    return;
  }
  bar.hidden = false;
  document.getElementById('btn-ics').addEventListener('click', () => downloadRecallIcs({ result, input }));
  document.getElementById('btn-share').addEventListener('click', () => share({
    title: '대장내시경 다음 검사 시기 | 장비움',
    url: location.href,
  }));
}
