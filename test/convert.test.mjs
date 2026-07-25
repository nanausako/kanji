import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractStrokes } from '../tools/convert-kanjivg.mjs';

test('extractStrokes returns d strings ordered by stroke number', () => {
  const svg = `
    <svg><g id="kvg:StrokePaths_04e00">
      <path id="kvg:04e00-s2" d="D-SECOND"/>
      <path id="kvg:04e00-s1" d="D-FIRST"/>
    </g></svg>`;
  assert.deepEqual(extractStrokes(svg), ['D-FIRST', 'D-SECOND']);
});
