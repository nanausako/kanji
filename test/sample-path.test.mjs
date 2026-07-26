import { test } from 'node:test';
import assert from 'node:assert/strict';
import { samplePath } from '../tools/sample-path.mjs';

test('samples n points along a straight horizontal line', () => {
  const pts = samplePath('M 0 5 L 70 5', 8);
  assert.equal(pts.length, 8);
  assert.deepEqual(pts[0], [0, 5]);
  assert.deepEqual(pts[7], [70, 5]);
  // evenly spaced: midpoint at ~35
  assert.ok(Math.abs(pts[3][0] + pts[4][0] - 70) < 1);
  assert.ok(pts.every((p) => p[1] === 5));
});

test('endpoints are the true path endpoints for a curve', () => {
  const pts = samplePath('M 10 10 C 40 10 40 90 90 90', 8);
  assert.deepEqual(pts[0], [10, 10]);
  assert.deepEqual(pts[7], [90, 90]);
});
