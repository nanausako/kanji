import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldIgnore } from '../src/ink.js';

test('touch is ignored once a pen has been seen', () => {
  assert.equal(shouldIgnore('touch', true), true);
});

test('touch is allowed when no pen has been seen (finger fallback)', () => {
  assert.equal(shouldIgnore('touch', false), false);
});

test('pen is always allowed', () => {
  assert.equal(shouldIgnore('pen', true), false);
  assert.equal(shouldIgnore('pen', false), false);
});

test('mouse is always allowed (desktop dev)', () => {
  assert.equal(shouldIgnore('mouse', true), false);
});
