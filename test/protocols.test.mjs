import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS, PRODUCT_IDS, CLEAR_LIQUIDS, LOW_RESIDUE } from '../js/protocols.js';

test('제품 3종이 정의되어 있다', () => {
  assert.deepEqual(PRODUCT_IDS.sort(), ['coolprep', 'orapang', 'plenvu']);
});

test('각 제품은 필수 필드와 두 회차의 단계를 가진다', () => {
  for (const id of PRODUCT_IDS) {
    const p = PRODUCTS[id];
    assert.equal(p.id, id);
    assert.ok(p.name && p.short && p.form);
    assert.equal(p.doses.length, 2);
    for (const steps of p.doses) {
      assert.ok(steps.length >= 1);
      for (const s of steps) {
        assert.ok(Number.isInteger(s.minutes) && s.minutes > 0);
        assert.ok(s.title && s.detail);
      }
    }
    assert.ok(p.source.url.startsWith('https://'));
    assert.ok(p.source.label);
    assert.ok(Array.isArray(p.diet) && p.diet.length >= 2);
  }
});

test('2차 복용 소요 시간이 허가사항과 일치한다 (스펙 5.2)', () => {
  const total = (steps) => steps.reduce((s, st) => s + st.minutes, 0);
  assert.equal(total(PRODUCTS.coolprep.doses[1]), 90);
  assert.equal(total(PRODUCTS.orapang.doses[1]), 90);
  assert.equal(total(PRODUCTS.plenvu.doses[1]), 60);
});

test('오라팡만 최대 복용 간격 12시간을 가진다', () => {
  assert.equal(PRODUCTS.orapang.maxIntervalHours, 12);
  assert.equal(PRODUCTS.coolprep.maxIntervalHours, null);
  assert.equal(PRODUCTS.plenvu.maxIntervalHours, null);
});

test('식이 항목은 시각 기준(clock) 또는 1차 복용 기준(beforeDose1Min) 중 하나를 가진다', () => {
  for (const id of PRODUCT_IDS) {
    for (const d of PRODUCTS[id].diet) {
      const hasClock = typeof d.clock === 'string';
      const hasRel = Number.isInteger(d.beforeDose1Min);
      assert.ok(hasClock !== hasRel, `${id}/${d.slot}: clock 또는 beforeDose1Min 중 하나만`);
      assert.ok(['label', 'guide'].includes(d.basis));
    }
  }
});

test('쿨프렙 아침·점심은 보완(guide), 저녁은 허가(label)', () => {
  const bySlot = Object.fromEntries(PRODUCTS.coolprep.diet.map((d) => [d.slot, d]));
  assert.equal(bySlot.breakfast.basis, 'guide');
  assert.equal(bySlot.lunch.basis, 'guide');
  assert.equal(bySlot.dinner.basis, 'label');
  assert.equal(bySlot.dinner.beforeDose1Min, 60);
});

test('플렌뷰 점심은 1차 복용 3시간 전 마감을 가진다', () => {
  const lunch = PRODUCTS.plenvu.diet.find((d) => d.slot === 'lunch');
  assert.equal(lunch.deadlineBeforeDose1Min, 180);
  assert.ok(lunch.detail.includes('{deadline}'));
});

test('공통 문구가 존재한다', () => {
  assert.ok(CLEAR_LIQUIDS.includes('물'));
  assert.ok(LOW_RESIDUE.ok.length > 0 && LOW_RESIDUE.avoid.length > 0);
});
