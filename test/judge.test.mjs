import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resample, matchStroke } from '../src/judge.js';
import { KANJI_DATA } from '../data/kanji-data.js';

// Two parallel horizontal strokes only 18 apart in y (a hard, adjacent case,
// like the stacked horizontals of 音/雨). 8 points each, 109-space.
const top = Array.from({ length: 8 }, (_, i) => [10 + i * 12, 40]);
const bottom = Array.from({ length: 8 }, (_, i) => [10 + i * 12, 58]);
const MED = [top, bottom];

test('resample returns n points spanning the same endpoints', () => {
  const r = resample([[0, 0], [10, 0], [10, 10]], 5);
  assert.equal(r.length, 5);
  assert.deepEqual(r[0], [0, 0]);
  assert.deepEqual(r[4], [10, 10]);
});

test('resample does not crash on a zero-length (still-pen) stroke', () => {
  const r = resample([[20, 20], [20, 20]], 8);
  assert.equal(r.length, 8);
  assert.ok(r.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)));
});

test('a faithful stroke matches the expected index (ok)', () => {
  const drawn = top.map(([x, y]) => [x + 3, y - 2]); // small jitter
  assert.deepEqual(matchStroke(drawn, MED, 0), { ok: true, reason: 'ok' });
});

test('drawing an adjacent stroke of the same character is an order error', () => {
  // Expected the top stroke (index 0) but drew the bottom one (only 18 away).
  assert.equal(matchStroke(bottom, MED, 0).reason, 'order');
});

test('a reversed stroke is flagged as direction', () => {
  const drawn = top.slice().reverse();
  assert.equal(matchStroke(drawn, MED, 0).reason, 'direction');
});

test('a dot far from every stroke is not ok', () => {
  assert.equal(matchStroke([[100, 5], [101, 6]], MED, 0).ok, false);
});

test('too few points is not ok', () => {
  assert.equal(matchStroke([[10, 40]], MED, 0).ok, false);
});

test('a still pen (zero-length stroke) is not ok and does not crash', () => {
  assert.equal(matchStroke([[10, 40], [10, 40]], MED, 0).ok, false);
});

test('real data: an earlier stroke expected but a later stroke drawn is rejected', () => {
  const oto = KANJI_DATA.find((k) => k.kanji === '音');
  assert.ok(oto, '音 must be present in generated data');
  // Drawing stroke index 4 while index 1 is expected must be an order error…
  const res = matchStroke(oto.medians[4], oto.medians, 1);
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'order');
  // …and drawing the exact expected stroke must pass.
  assert.equal(matchStroke(oto.medians[1], oto.medians, 1).ok, true);
});
