import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateList } from '../tools/validate-list.mjs';

const list = JSON.parse(
  await readFile(new URL('../tools/kanji-list.json', import.meta.url), 'utf8')
);

test('the real kanji-list.json is valid', () => {
  const { ok, errors } = validateList(list);
  assert.deepEqual(errors, []);
  assert.equal(ok, true);
});

test('id must be the codepoint of kanji', () => {
  const bad = [{ id: '00000', kanji: '一', grade: 1, reading: 'いち', strokeCount: 1, sentence: '〇' }];
  assert.equal(validateList(bad).ok, false);
});

test('sentence must contain the placeholder 〇', () => {
  const bad = [{ id: '04e00', kanji: '一', grade: 1, reading: 'いち', strokeCount: 1, sentence: 'ばんめ' }];
  assert.equal(validateList(bad).ok, false);
});

test('sentence must contain exactly one placeholder 〇', () => {
  const two = [{ id: '04e00', kanji: '一', grade: 1, reading: 'いち', strokeCount: 1, sentence: '〇と〇' }];
  assert.equal(validateList(two).ok, false);
});

test('duplicate ids are rejected', () => {
  const dup = [...list, list[0]];
  assert.equal(validateList(dup).ok, false);
});

test('a present-but-wrong-type field is rejected', () => {
  const bad = [{ id: '04e00', kanji: 123, grade: 1, reading: 'いち', strokeCount: 1, sentence: '〇' }];
  assert.equal(validateList(bad).ok, false);
});

test('unbalanced 《》 is rejected', () => {
  const bad = [{ id: '04e00', kanji: '一', grade: 1, reading: 'いち', strokeCount: 1, sentence: '〇と《' }];
  assert.equal(validateList(bad).ok, false);
});

test('non-positive strokeCount is rejected', () => {
  const bad = [{ id: '04e00', kanji: '一', grade: 1, reading: 'いち', strokeCount: 0, sentence: '〇' }];
  assert.equal(validateList(bad).ok, false);
});

test('placeholder 〇 inside ruby 《》 is rejected', () => {
  const bad = [{ id: '096e8', kanji: '雨', grade: 1, reading: 'あめ', strokeCount: 8, sentence: '明日《あ〇た》はさむい' }];
  assert.equal(validateList(bad).ok, false);
});
