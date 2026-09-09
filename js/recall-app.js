import {
  computeRecall, buildReportText, formatYearMonthKo, formatMonthsRange,
  parseDateOnly, formatDateOnly, buildRecallQuery,
} from './recall.js';
import { esc, toast, copyText } from './ui-utils.js';

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page === 'recall') initRecallForm();
});

const RISK_LABEL = {
  none: '해당 없음',
  low: '저위험',
  moderate: '중등도 위험',
  high: '고위험',
  veryhigh: '매우 고위험',
  piecemeal: '분할절제 후',
};

function formatRange(result) {
  const big = `${formatMonthsRange(result.months[0], result.months[1])} 뒤`;
  const dateLine =
    result.dates.length > 1 ? `${formatYearMonthKo(result.dates[0])} ~ ${formatYearMonthKo(result.dates[1])}`
    : `${formatYearMonthKo(result.dates[0])} 무렵`;
  return { big, dateLine };
}

function renderResultCard(el, input, result) {
  if (result.risk === 'none') {
    el.innerHTML = `
      <span class="tag">${esc(RISK_LABEL.none)}</span>
      <p class="muted">${esc(result.reasons[0])} 일반 검진 주기를 따르세요.</p>`;
    return;
  }
  const { big, dateLine } = formatRange(result);
  const reasons = result.reasons.map((r) => `<li>${esc(r)}</li>`).join('');
  const caveats = result.caveats.length
    ? `<div class="banner"><ul>${result.caveats.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div>`
    : '';
  el.innerHTML = `
    <span class="tag">${esc(RISK_LABEL[result.risk])}</span>
    <div class="big">${esc(big)}<small>${esc(dateLine)}</small></div>
    <ul class="why">${reasons}</ul>
    ${caveats}
    <div class="copybox">${esc(buildReportText(result, input.examDate))}</div>`;
}

function readInput(form) {
  const flags = new Set();
  form.querySelectorAll('.chip.on').forEach((btn) => flags.add(btn.dataset.flag));
  return {
    examDate: parseDateOnly(form.elements['r-date'].value) ?? new Date(),
    adenomaCount: Math.max(0, Math.trunc(Number(form.elements['r-count'].value)) || 0),
    maxSizeMm: Math.max(0, Math.trunc(Number(form.elements['r-size'].value)) || 0),
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
    btn.addEventListener('click', () => {
      btn.classList.toggle('on');
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
    const base = location.href.replace(/recall\.html.*$/, '');
    const url = `${base}recall-plan.html?${buildRecallQuery(lastInput)}`;
    window.open(url, '_blank', 'noopener');
    copyText(url, '환자용 링크를 복사했습니다');
  });
}
