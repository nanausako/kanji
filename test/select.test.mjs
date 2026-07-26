import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shuffle, pickQuestions } from '../src/select.js';

// Deterministic RNG for reproducible tests.
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

test('shuffle keeps all elements and does not mutate input', () => {
  const input = [1, 2, 3, 4, 5];
  const out = shuffle(input, seeded(1));
  assert.deepEqual(input, [1, 2, 3, 4, 5]);
  assert.deepEqual([...out].sort((a, b) => a - b), [1, 2, 3, 4, 5]);
});

test('pickQuestions returns count items with no duplicates', () => {
  const data = Array.from({ length: 20 }, (_, i) => ({ id: i }));
  const picked = pickQuestions(data, 10, seeded(7));
  assert.equal(picked.length, 10);
  assert.equal(new Set(picked.map((d) => d.id)).size, 10);
});

test('pickQuestions clamps to data length when fewer than count', () => {
  const data = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const picked = pickQuestions(data, 10, seeded(3));
  assert.equal(picked.length, 3);
});
