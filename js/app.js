import { PRODUCTS } from './protocols.js';
import { addDays, toParam } from './schedule.js';

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

function initPlanPage() {
  // Task 7에서 구현
}
