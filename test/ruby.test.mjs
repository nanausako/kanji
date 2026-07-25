import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRuby, rubyToHtml } from '../src/ruby.js';

test('plain text without ruby', () => {
  assert.deepEqual(parseRuby('あめがふる'), [{ t: 'text', v: 'あめがふる' }]);
});

test('single ruby attaches to preceding kanji run', () => {
  assert.deepEqual(parseRuby('本《ほん》がある'), [
    { t: 'ruby', base: '本', rt: 'ほん' },
    { t: 'text', v: 'がある' },
  ]);
});

test('multi-kanji base is the maximal trailing run', () => {
  assert.deepEqual(parseRuby('海辺《うみべ》で'), [
    { t: 'ruby', base: '海辺', rt: 'うみべ' },
    { t: 'text', v: 'で' },
  ]);
});

test('explicit base marker ｜ overrides the run', () => {
  assert.deepEqual(parseRuby('き｜ら《き》ら'), [
    { t: 'text', v: 'き' },
    { t: 'ruby', base: 'ら', rt: 'き' },
    { t: 'text', v: 'ら' },
  ]);
});

test('placeholder 〇 is never part of a ruby base', () => {
  assert.deepEqual(parseRuby('百《ひゃく》〇のガムを買《か》う'), [
    { t: 'ruby', base: '百', rt: 'ひゃく' },
    { t: 'text', v: '〇のガムを' },
    { t: 'ruby', base: '買', rt: 'か' },
    { t: 'text', v: 'う' },
  ]);
});

test('rubyToHtml renders and escapes', () => {
  assert.equal(
    rubyToHtml('机《つくえ》の〇'),
    '<ruby>机<rt>つくえ</rt></ruby>の〇'
  );
});

test('a malformed 《 with no closing 》 is treated as literal text', () => {
  assert.deepEqual(parseRuby('本《ほん'), [{ t: 'text', v: '本《ほん' }]);
});
