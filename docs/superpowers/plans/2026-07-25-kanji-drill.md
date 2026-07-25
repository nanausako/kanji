# iPad 漢字ドリル Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** iPad + Apple Pencil で使える漢字テスト web アプリを作る。例文（総ルビ）とともに漢字を出題し、書き順を自動判定し、止めはねはらいは「本人の筆跡にお手本を重ねて気づく」方式で学習させる。

**Architecture:** ビルド不要のバニラ HTML/CSS/JS 静的サイト（ES モジュール）。GitHub Pages で配布。KanjiVG（日本語書き順）の中心線を SVG でそのまま描画し、判定用 median（点列）を生成、自前の書き順マッチャで判定する。Hanzi Writer には依存しない。本人の筆跡は透明キャンバスに残す。

**Tech Stack:** HTML5 Canvas + SVG、Pointer Events、ES Modules。ビルドツールのみ Node.js（`svg-path-properties` で median 生成、`node --test` で単体テスト、`@playwright/test` で E2E）。ランタイムは第三者ライブラリ・CDN 依存なし。

## Global Constraints

- ビルドステップなし。バニラ HTML/CSS/JS、ES モジュール。GitHub Pages（`https://nanausako.github.io/kanji`）で配信。
- ランタイムに第三者ライブラリ・CDN を含めない（完全オフライン）。ビルドツールの devDependencies（`svg-path-properties`, `@playwright/test`）は配信物に含めない。
- 座標系は KanjiVG の **109×109 viewBox** で統一（strokes / medians / judge / ink→judge 変換すべて）。
- 書き順は **日本語（KanjiVG）**。「右」は ノ→一 であることを必ず検証する。
- 例文は **総ルビ**。`漢字《よみ》` 記法（青空文庫式）、`｜` で base 開始を明示可。`〇` は出題字の空欄でルビなし。語彙の学年制限はしない。
- スコア・履歴を保存しない。セッション開始時に登録字から重複なしランダム抽出（Fisher-Yates）。進捗表示の分母は抽出配列長。
- パームリジェクション: `pointerType` で分岐。一度 `pen` を観測したらその字の間 `touch` を無視。pen 未観測時のみ touch 描画。
- ライセンス: アプリコード = MIT（`LICENSE`）。KanjiVG 由来の派生データ = CC BY-SA 3.0（`LICENSE-DATA`）。帰属表示（KanjiVG / Ulrich Apel / https://kanjivg.tagaini.net/ ）を `data/NOTICE`・画面フッター・README に明示。
- コード・コメントは英語。コミットメッセージは日本語（prefix は英語 feat/fix/docs 等）。作業ブランチは `feat/kanji-drill`。push はしない。
- 対象漢字と正しい画数: 下=3, 一=1, 雨=8, 王=4, 円=4, 右=5, 音=9, 火=4, 花=7, 貝=7。
- KanjiVG ファイル名（コードポイント 5 桁 hex 小文字）: 下=04e0b, 一=04e00, 雨=096e8, 王=0738b, 円=05186, 右=053f3, 音=097f3, 火=0706b, 花=082b1, 貝=08c9d。

---

## File Structure

```
kanji/
├── index.html                 # 画面（ES モジュールを読み込むだけ）
├── style.css                  # レイアウト・スタイル
├── src/
│   ├── ruby.js                # 例文ルビ記法 → <ruby> 変換（純粋）
│   ├── select.js              # 出題字の重複なしランダム抽出（純粋）
│   ├── judge.js               # 書き順判定（drawn polyline ↔ median）（純粋）
│   ├── ink.js                 # ペン入力キャプチャ + パームリジェクション + 筆跡描画
│   ├── overlay.js             # お手本アニメーション・お手本重ね表示（SVG）
│   └── app.js                 # 出題フロー・結線（initApp をエクスポート）
├── data/
│   ├── kanji-data.js          # 生成物: KANJI_DATA（strokes/medians/ルビ例文）
│   └── NOTICE                 # KanjiVG 帰属表示
├── tools/
│   ├── kanji-list.json        # 人手管理の字リスト（単一の情報源）
│   ├── kanjivg-src/           # KanjiVG 元 SVG（10 字。再生成用に同梱）
│   ├── sample-path.mjs        # SVG path → median 点列サンプリング
│   ├── validate-list.mjs      # kanji-list.json の形式検証
│   └── convert-kanjivg.mjs    # list + SVG → data/kanji-data.js 生成 + 検証
├── test/
│   ├── ruby.test.mjs
│   ├── select.test.mjs
│   ├── judge.test.mjs
│   ├── ink.test.mjs
│   ├── sample-path.test.mjs
│   ├── validate-list.test.mjs
│   ├── convert.test.mjs
│   ├── smoke.test.mjs
│   └── e2e.spec.mjs           # Playwright
├── package.json               # devDependencies + test scripts
├── .gitignore
├── README.md
├── LICENSE                    # MIT（アプリコード）
└── LICENSE-DATA               # CC BY-SA 3.0（派生データ）
```

---

## Task 1: プロジェクト雛形・ツール・ライセンス

**Files:**
- Create: `package.json`, `.gitignore`, `README.md`, `LICENSE`, `LICENSE-DATA`, `data/NOTICE`
- Create: `test/smoke.test.mjs`

**Interfaces:**
- Consumes: なし
- Produces: `node --test` が動く環境。`npm test`（node の単体テスト）と `npm run e2e`（Playwright）スクリプト。

- [ ] **Step 1: `.gitignore` を作成**

```gitignore
node_modules/
.DS_Store
test-results/
playwright-report/
```

- [ ] **Step 2: `package.json` を作成**

```json
{
  "name": "kanji-drill",
  "version": "0.1.0",
  "description": "iPad + Apple Pencil 漢字ドリル",
  "type": "module",
  "private": true,
  "license": "MIT",
  "scripts": {
    "test": "node --test test/*.test.mjs",
    "e2e": "playwright test test/e2e.spec.mjs",
    "convert": "node tools/convert-kanjivg.mjs"
  },
  "devDependencies": {
    "svg-path-properties": "^1.3.0",
    "@playwright/test": "^1.48.0"
  }
}
```

- [ ] **Step 3: ライセンス・NOTICE を作成**

`LICENSE`（MIT 全文。`<year>`=2026、`<owner>`=nanausako に置換）:

```
MIT License

Copyright (c) 2026 nanausako

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

`LICENSE-DATA`:

```
Kanji stroke data in data/kanji-data.js (fields "strokes" and "medians") and
the source SVGs in tools/kanjivg-src/ are derived from KanjiVG.

KanjiVG is copyright (c) 2009-2024 Ulrich Apel and released under the
Creative Commons Attribution-ShareAlike 3.0 license (CC BY-SA 3.0):
https://creativecommons.org/licenses/by-sa/3.0/

As a derivative work, this stroke data is likewise distributed under
CC BY-SA 3.0. Attribution: KanjiVG, Ulrich Apel, https://kanjivg.tagaini.net/
```

`data/NOTICE`:

```
Stroke-order data in this directory is derived from KanjiVG
(https://kanjivg.tagaini.net/), copyright (c) Ulrich Apel,
licensed under CC BY-SA 3.0. See ../LICENSE-DATA.
```

- [ ] **Step 4: `README.md` を作成**

```markdown
# 漢字ドリル

iPad + Apple Pencil で使う漢字テスト web アプリ。例文（総ルビ）とともに出題し、
書き順を自動判定、止めはねはらいはお手本を重ねて自分で気づく方式。

公開: https://nanausako.github.io/kanji （iPad Safari で開き、ホーム画面に追加）

## 開発

- `npm install` — ビルドツール（テスト・データ生成）を入れる
- `npm test` — 単体テスト（node --test）
- `npm run e2e` — Playwright E2E
- `npm run convert` — tools/kanji-list.json + KanjiVG SVG から data/kanji-data.js を再生成

ランタイムは第三者ライブラリ・CDN を使わない（完全オフライン）。devDependencies は配信物に含まれない。

## ライセンス

- アプリコード（html/css/js）: MIT（[LICENSE](LICENSE)）
- 漢字書き順データ（data/kanji-data.js の strokes/medians, tools/kanjivg-src/）:
  KanjiVG 由来の派生物として CC BY-SA 3.0（[LICENSE-DATA](LICENSE-DATA)）。
  帰属: KanjiVG, Ulrich Apel, https://kanjivg.tagaini.net/
```

- [ ] **Step 5: スモークテストを作成**

`test/smoke.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('node test runner works', () => {
  assert.equal(1 + 1, 2);
});
```

- [ ] **Step 6: 依存インストール & テスト実行**

Run: `npm install && npm test`
Expected: svg-path-properties と @playwright/test が入り、`smoke.test.mjs` が PASS（`tests 1 ... pass 1`）。

- [ ] **Step 7: Commit**

```bash
git add .gitignore package.json package-lock.json README.md LICENSE LICENSE-DATA data/NOTICE test/smoke.test.mjs
git commit -m "chore: プロジェクト雛形とライセンス・テスト環境を用意"
```

---

## Task 2: ルビ変換モジュール（src/ruby.js）

**Files:**
- Create: `src/ruby.js`
- Test: `test/ruby.test.mjs`

**Interfaces:**
- Produces:
  - `parseRuby(text: string): Array<{t:'text', v:string} | {t:'ruby', base:string, rt:string}>`
  - `rubyToHtml(text: string): string` — HTML エスケープ済みの `<ruby>base<rt>rt</rt></ruby>` 混じり文字列

- [ ] **Step 1: 失敗するテストを書く**

`test/ruby.test.mjs`:

```javascript
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
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `node --test test/ruby.test.mjs`
Expected: FAIL（`Cannot find module '../src/ruby.js'`）

- [ ] **Step 3: 実装を書く**

`src/ruby.js`:

```javascript
// Parse Aozora-style ruby notation: 漢字《よみ》 with optional ｜ base marker.
// The placeholder 〇 (the blank for the quiz kanji) is never treated as a base.

const PLACEHOLDER = '〇';

function isKanji(ch) {
  return ch !== PLACEHOLDER && /\p{Script=Han}/u.test(ch);
}

export function parseRuby(text) {
  const tokens = [];
  let buf = '';
  let baseStart = -1; // index in buf where an explicit ｜ base begins, -1 if none

  const flush = () => {
    if (buf) tokens.push({ t: 'text', v: buf });
    buf = '';
    baseStart = -1;
  };

  let i = 0;
  while (i < text.length) {
    const ch = text[i];

    if (ch === '｜') {
      baseStart = buf.length;
      i++;
      continue;
    }

    if (ch === '《') {
      const close = text.indexOf('》', i);
      if (close === -1) { buf += ch; i++; continue; } // malformed → literal
      const rt = text.slice(i + 1, close);

      let base;
      if (baseStart >= 0) {
        base = buf.slice(baseStart);
        buf = buf.slice(0, baseStart);
      } else {
        let k = buf.length;
        while (k > 0 && isKanji(buf[k - 1])) k--;
        base = buf.slice(k);
        buf = buf.slice(0, k);
      }
      if (buf) tokens.push({ t: 'text', v: buf });
      buf = '';
      tokens.push({ t: 'ruby', base, rt });
      baseStart = -1;
      i = close + 1;
      continue;
    }

    buf += ch;
    i++;
  }
  flush();
  return tokens;
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])
  );
}

export function rubyToHtml(text) {
  return parseRuby(text)
    .map((tok) =>
      tok.t === 'ruby'
        ? `<ruby>${escapeHtml(tok.base)}<rt>${escapeHtml(tok.rt)}</rt></ruby>`
        : escapeHtml(tok.v)
    )
    .join('');
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `node --test test/ruby.test.mjs`
Expected: PASS（6 tests pass）

- [ ] **Step 5: Commit**

```bash
git add src/ruby.js test/ruby.test.mjs
git commit -m "feat: 例文ルビ記法を <ruby> に変換するモジュールを追加"
```

---

## Task 3: 字リストと形式検証（tools/kanji-list.json, tools/validate-list.mjs）

**Files:**
- Create: `tools/kanji-list.json`, `tools/validate-list.mjs`
- Test: `test/validate-list.test.mjs`

**Interfaces:**
- Consumes: `parseRuby` from `src/ruby.js`
- Produces:
  - `validateList(list: Array<object>): { ok: boolean, errors: string[] }`
  - `tools/kanji-list.json`: 各要素 `{ id, kanji, grade, reading, strokeCount, sentence }`

- [ ] **Step 1: 字リストを作成**

`tools/kanji-list.json`:

```json
[
  { "id": "04e0b", "kanji": "下", "grade": 1, "reading": "した", "strokeCount": 3, "sentence": "机《つくえ》の〇に本《ほん》がある。" },
  { "id": "04e00", "kanji": "一", "grade": 1, "reading": "いち", "strokeCount": 1, "sentence": "かけっこで〇番《ばん》になった。" },
  { "id": "096e8", "kanji": "雨", "grade": 1, "reading": "あめ", "strokeCount": 8, "sentence": "明日《あした》は〇がふるそうだ。" },
  { "id": "0738b", "kanji": "王", "grade": 1, "reading": "おう", "strokeCount": 4, "sentence": "ライオンは百獣《ひゃくじゅう》の〇さまだ。" },
  { "id": "05186", "kanji": "円", "grade": 1, "reading": "えん", "strokeCount": 4, "sentence": "百《ひゃく》〇のガムを買《か》う。" },
  { "id": "053f3", "kanji": "右", "grade": 1, "reading": "みぎ", "strokeCount": 5, "sentence": "次《つぎ》の信号《しんごう》を〇にまがる。" },
  { "id": "097f3", "kanji": "音", "grade": 1, "reading": "おと", "strokeCount": 9, "sentence": "きれいなピアノの〇がする。" },
  { "id": "0706b", "kanji": "火", "grade": 1, "reading": "ひ", "strokeCount": 4, "sentence": "キャンプで〇をおこす。" },
  { "id": "082b1", "kanji": "花", "grade": 1, "reading": "はな", "strokeCount": 7, "sentence": "春《はる》になって〇が咲《さ》いた。" },
  { "id": "08c9d", "kanji": "貝", "grade": 1, "reading": "かい", "strokeCount": 7, "sentence": "海辺《うみべ》できれいな〇を拾《ひろ》う。" }
]
```

- [ ] **Step 2: 失敗するテストを書く**

`test/validate-list.test.mjs`:

```javascript
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
```

- [ ] **Step 3: テストが失敗することを確認**

Run: `node --test test/validate-list.test.mjs`
Expected: FAIL（`Cannot find module '../tools/validate-list.mjs'`）

- [ ] **Step 4: 実装を書く**

`tools/validate-list.mjs`:

```javascript
import { parseRuby } from '../src/ruby.js';

const REQUIRED = ['id', 'kanji', 'grade', 'reading', 'strokeCount', 'sentence'];

// Codepoint of a single-character string as 5-digit lowercase hex.
export function codepointId(kanji) {
  return [...kanji][0].codePointAt(0).toString(16).padStart(5, '0');
}

export function validateList(list) {
  const errors = [];
  if (!Array.isArray(list)) return { ok: false, errors: ['list is not an array'] };

  const seen = new Set();
  for (const [idx, e] of list.entries()) {
    const where = `entry[${idx}] (${e?.kanji ?? '?'})`;
    for (const key of REQUIRED) {
      if (e[key] === undefined || e[key] === null) errors.push(`${where}: missing "${key}"`);
    }
    if (typeof e.kanji === 'string' && [...e.kanji].length !== 1) {
      errors.push(`${where}: kanji must be exactly one character`);
    }
    if (typeof e.kanji === 'string' && typeof e.id === 'string' && codepointId(e.kanji) !== e.id) {
      errors.push(`${where}: id "${e.id}" != codepoint "${codepointId(e.kanji)}"`);
    }
    if (seen.has(e.id)) errors.push(`${where}: duplicate id "${e.id}"`);
    seen.add(e.id);
    if (typeof e.strokeCount !== 'number' || e.strokeCount < 1) {
      errors.push(`${where}: strokeCount must be a positive number`);
    }
    if (typeof e.sentence === 'string') {
      const blanks = (e.sentence.match(/〇/g) || []).length;
      if (blanks !== 1) {
        errors.push(`${where}: sentence must contain exactly one placeholder 〇 (found ${blanks})`);
      }
    }
    if (typeof e.sentence === 'string') {
      // ruby notation must be well-formed (parse must not throw and 《 must be balanced)
      const opens = (e.sentence.match(/《/g) || []).length;
      const closes = (e.sentence.match(/》/g) || []).length;
      if (opens !== closes) errors.push(`${where}: unbalanced 《》 in sentence`);
      parseRuby(e.sentence); // smoke: must not throw
    }
  }
  return { ok: errors.length === 0, errors };
}
```

- [ ] **Step 5: テストが通ることを確認**

Run: `node --test test/validate-list.test.mjs`
Expected: PASS（4 tests pass）

- [ ] **Step 6: Commit**

```bash
git add tools/kanji-list.json tools/validate-list.mjs test/validate-list.test.mjs
git commit -m "feat: 字リスト(単一の情報源)と形式検証を追加"
```

---

## Task 4: median サンプリング（tools/sample-path.mjs）

**Files:**
- Create: `tools/sample-path.mjs`
- Test: `test/sample-path.test.mjs`

**Interfaces:**
- Consumes: `svg-path-properties`（devDependency）
- Produces: `samplePath(d: string, n = 8): Array<[number, number]>` — path 上を等間隔（弧長）で n 点サンプリング、小数第 2 位に丸め

- [ ] **Step 1: 失敗するテストを書く**

`test/sample-path.test.mjs`:

```javascript
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
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `node --test test/sample-path.test.mjs`
Expected: FAIL（`Cannot find module '../tools/sample-path.mjs'`）

- [ ] **Step 3: 実装を書く**

`tools/sample-path.mjs`:

```javascript
// svg-path-properties exposes the class as a named export in ESM (v1.3+).
import { svgPathProperties } from 'svg-path-properties';

const round2 = (v) => Math.round(v * 100) / 100;

export function samplePath(d, n = 8) {
  const props = new svgPathProperties(d);
  const len = props.getTotalLength();
  const pts = [];
  for (let i = 0; i < n; i++) {
    const at = n === 1 ? 0 : (len * i) / (n - 1);
    const { x, y } = props.getPointAtLength(at);
    pts.push([round2(x), round2(y)]);
  }
  return pts;
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `node --test test/sample-path.test.mjs`
Expected: PASS（2 tests pass）

> 補足: `svg-path-properties` の export 形は版で揺れがある。Step 4 が import/コンストラクタ関連で落ちたら（`is not a constructor` / `Cannot destructure ... undefined` など）、`import pkg from 'svg-path-properties'; const { svgPathProperties } = pkg;`（default 経由）に切り替えて再実行する。

- [ ] **Step 5: Commit**

```bash
git add tools/sample-path.mjs test/sample-path.test.mjs
git commit -m "feat: SVG path を median 点列にサンプリングするツールを追加"
```

---

## Task 5: KanjiVG 取得とデータ生成（tools/convert-kanjivg.mjs, data/kanji-data.js）

**Files:**
- Create: `tools/kanjivg-src/*.svg`（10 字）, `tools/convert-kanjivg.mjs`
- Create (generated): `data/kanji-data.js`

**Interfaces:**
- Consumes: `validateList`, `codepointId` from `tools/validate-list.mjs`; `samplePath` from `tools/sample-path.mjs`; `tools/kanji-list.json`
- Produces: `data/kanji-data.js` に `export const KANJI_DATA = [{ id, kanji, grade, reading, sentence, strokes: string[], medians: number[][][] }, ...]`（座標系 109×109）

- [ ] **Step 1: KanjiVG 元 SVG を取得**

10 字の SVG を `tools/kanjivg-src/` に取得する（ファイル名 = コードポイント 5 桁 hex）。ネットワークが必要なので、サンドボックス無効での実行が要る:

Run:
```bash
mkdir -p tools/kanjivg-src
for id in 04e0b 04e00 096e8 0738b 05186 053f3 097f3 0706b 082b1 08c9d; do
  curl -fsSL "https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${id}.svg" -o "tools/kanjivg-src/${id}.svg"
done
ls tools/kanjivg-src
```
Expected: 10 個の `.svg` が並ぶ。取得失敗（404 等）した字があれば、KanjiVG リポジトリで正しいファイル名を確認して修正する。

- [ ] **Step 2: 変換スクリプトを書く**

`tools/convert-kanjivg.mjs`:

```javascript
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { validateList, codepointId } from './validate-list.mjs';
import { samplePath } from './sample-path.mjs';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const MEDIAN_POINTS = 8;

// Extract stroke path `d` strings from a KanjiVG SVG, ordered by stroke number.
export function extractStrokes(svg) {
  const re = /<path[^>]*\bid="kvg:[0-9a-f]+-s(\d+)"[^>]*\bd="([^"]+)"/g;
  const found = [];
  let m;
  while ((m = re.exec(svg)) !== null) {
    found.push({ n: Number(m[1]), d: m[2] });
  }
  found.sort((a, b) => a.n - b.n);
  return found.map((s) => s.d);
}

async function main() {
  const list = JSON.parse(await readFile(here('kanji-list.json'), 'utf8'));

  const { ok, errors } = validateList(list);
  if (!ok) {
    console.error('kanji-list.json validation failed:');
    for (const e of errors) console.error('  - ' + e);
    process.exit(1);
  }

  const out = [];
  for (const entry of list) {
    const svg = await readFile(here(`kanjivg-src/${entry.id}.svg`), 'utf8');
    const strokes = extractStrokes(svg);

    // Validation: stroke count must match the expected count in the list.
    if (strokes.length !== entry.strokeCount) {
      console.error(
        `[${entry.kanji}] stroke count mismatch: SVG has ${strokes.length}, expected ${entry.strokeCount}`
      );
      process.exit(1);
    }
    if (codepointId(entry.kanji) !== entry.id) {
      console.error(`[${entry.kanji}] id/codepoint mismatch`);
      process.exit(1);
    }

    const medians = strokes.map((d) => samplePath(d, MEDIAN_POINTS));

    out.push({
      id: entry.id,
      kanji: entry.kanji,
      grade: entry.grade,
      reading: entry.reading,
      sentence: entry.sentence,
      strokes,
      medians,
    });
  }

  const banner =
    '// AUTO-GENERATED by tools/convert-kanjivg.mjs — do not edit by hand.\n' +
    '// Stroke data derived from KanjiVG (Ulrich Apel), CC BY-SA 3.0. See ../LICENSE-DATA.\n';
  const body = 'export const KANJI_DATA = ' + JSON.stringify(out, null, 0) + ';\n';
  await writeFile(here('../data/kanji-data.js'), banner + body, 'utf8');
  console.log(`Wrote data/kanji-data.js (${out.length} kanji).`);
}

// Only run when executed directly (so tests can import extractStrokes).
if (process.argv[1] === here('convert-kanjivg.mjs')) {
  await main();
}
```

- [ ] **Step 3: 変換ロジックのテストを書く**

`test/convert.test.mjs`:

```javascript
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
```

Run: `node --test test/convert.test.mjs`
Expected: PASS（1 test）。もし FAIL するなら Step 2 の正規表現・実行ガードを見直す。

- [ ] **Step 4: データを生成**

Run: `npm run convert`
Expected: `Wrote data/kanji-data.js (10 kanji).`（画数不一致があればエラー終了するので、その字の SVG を確認）

- [ ] **Step 5: 生成データの妥当性を目視確認（特に「右」）**

Run:
```bash
node -e '
import("./data/kanji-data.js").then(({KANJI_DATA}) => {
  const migi = KANJI_DATA.find(k => k.kanji === "右");
  console.log("右 stroke count:", migi.strokes.length);
  // 日本語の書き順では 1画目が左払い(ノ)＝左下方向、2画目が横棒(一)。
  // median[0] の始点→終点ベクトルで 1画目が左下向き(x減 or y増)であることを確認。
  console.log("右 stroke1 median:", JSON.stringify(migi.medians[0]));
  console.log("右 stroke2 median:", JSON.stringify(migi.medians[1]));
});
'
```
Expected: `右 stroke count: 5`。1 画目 median が左払い（ノ）、2 画目が横棒（一, y がほぼ一定で x が増加）になっていること。中国語順（1 画目が横棒）になっていたら KanjiVG ファイルが異体字版でないか確認する。

- [ ] **Step 6: Commit**

```bash
git add tools/kanjivg-src tools/convert-kanjivg.mjs test/convert.test.mjs data/kanji-data.js
git commit -m "feat: KanjiVGからdata/kanji-data.jsを生成(日本語書き順)"
```

---

## Task 6: 出題字ランダム抽出（src/select.js）

**Files:**
- Create: `src/select.js`
- Test: `test/select.test.mjs`

**Interfaces:**
- Produces:
  - `shuffle(arr: T[], rng = Math.random): T[]` — 非破壊 Fisher-Yates
  - `pickQuestions(data: T[], count: number, rng = Math.random): T[]` — 重複なしで `min(count, data.length)` 件

- [ ] **Step 1: 失敗するテストを書く**

`test/select.test.mjs`:

```javascript
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
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `node --test test/select.test.mjs`
Expected: FAIL（`Cannot find module '../src/select.js'`）

- [ ] **Step 3: 実装を書く**

`src/select.js`:

```javascript
// Non-mutating Fisher-Yates shuffle. rng() must return [0, 1).
export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Pick min(count, data.length) items at random, no duplicates.
export function pickQuestions(data, count, rng = Math.random) {
  return shuffle(data, rng).slice(0, Math.min(count, data.length));
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `node --test test/select.test.mjs`
Expected: PASS（3 tests pass）

- [ ] **Step 5: Commit**

```bash
git add src/select.js test/select.test.mjs
git commit -m "feat: 出題字の重複なしランダム抽出を追加"
```

---

## Task 7: 書き順判定（src/judge.js）

**Files:**
- Create: `src/judge.js`
- Test: `test/judge.test.mjs`

**Interfaces:**
- Produces:
  - `resample(points: number[][], n: number): number[][]` — 弧長等間隔の n 点
  - `matchStroke(drawn: number[][], median: number[][], opts?): { ok: boolean, reason: 'ok'|'order'|'direction'|'shape' }` — drawn/median はいずれも 109 座標系の `[x,y]` 列

- [ ] **Step 1: 失敗するテストを書く**

`test/judge.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resample, matchStroke } from '../src/judge.js';

// A horizontal reference stroke (like 一) in 109-space, 8 points.
const H = Array.from({ length: 8 }, (_, i) => [10 + i * 12, 55]);

test('resample returns n points spanning the same endpoints', () => {
  const r = resample([[0, 0], [10, 0], [10, 10]], 5);
  assert.equal(r.length, 5);
  assert.deepEqual(r[0], [0, 0]);
  assert.deepEqual(r[4], [10, 10]);
});

test('a faithful stroke matches (ok)', () => {
  const drawn = H.map(([x, y]) => [x + 3, y - 2]); // small jitter
  assert.deepEqual(matchStroke(drawn, H), { ok: true, reason: 'ok' });
});

test('a reversed stroke is flagged as direction', () => {
  const drawn = H.slice().reverse();
  assert.equal(matchStroke(drawn, H).reason, 'direction');
});

test('a stroke starting far from the expected start is not ok', () => {
  const drawn = H.map(([x, y]) => [x, y + 45]); // shifted far down
  assert.equal(matchStroke(drawn, H).ok, false);
});

test('too few points is not ok', () => {
  assert.equal(matchStroke([[10, 55]], H).ok, false);
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `node --test test/judge.test.mjs`
Expected: FAIL（`Cannot find module '../src/judge.js'`）

- [ ] **Step 3: 実装を書く**

`src/judge.js`:

```javascript
// Stroke-order matcher in the 109x109 KanjiVG coordinate space.
// Lenient thresholds tuned for young children; refine on device (§4.3).

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// Resample a polyline to n points evenly spaced by arc length.
export function resample(points, n) {
  if (points.length === 0) return [];
  if (points.length === 1) return Array.from({ length: n }, () => points[0].slice());

  const cum = [0];
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + dist(points[i - 1], points[i]));
  const total = cum[cum.length - 1] || 1;

  const out = [];
  for (let k = 0; k < n; k++) {
    const target = (total * k) / (n - 1);
    let i = 1;
    while (i < points.length && cum[i] < target) i++;
    const seg = cum[i] - cum[i - 1] || 1;
    const t = (target - cum[i - 1]) / seg;
    out.push([
      points[i - 1][0] + (points[i][0] - points[i - 1][0]) * t,
      points[i - 1][1] + (points[i][1] - points[i - 1][1]) * t,
    ]);
  }
  return out;
}

function avgDist(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += dist(a[i], b[i]);
  return sum / a.length;
}

export function matchStroke(drawn, median, opts = {}) {
  const { startTol = 30, endTol = 30, shapeTol = 28 } = opts;
  if (!drawn || drawn.length < 2) return { ok: false, reason: 'shape' };

  const n = median.length;
  const r = resample(drawn, n);

  const fwd = avgDist(r, median);
  const rev = avgDist(r, median.slice().reverse());
  if (rev + 8 < fwd && rev < shapeTol + 10) return { ok: false, reason: 'direction' };

  if (dist(r[0], median[0]) > startTol || dist(r[n - 1], median[n - 1]) > endTol) {
    return { ok: false, reason: 'order' };
  }
  if (fwd > shapeTol) return { ok: false, reason: 'shape' };
  return { ok: true, reason: 'ok' };
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `node --test test/judge.test.mjs`
Expected: PASS（5 tests pass）

- [ ] **Step 5: Commit**

```bash
git add src/judge.js test/judge.test.mjs
git commit -m "feat: 書き順判定(median マッチ)を追加"
```

---

## Task 8: ペン入力・パームリジェクション（src/ink.js）

**Files:**
- Create: `src/ink.js`
- Test: `test/ink.test.mjs`

**Interfaces:**
- Consumes: なし（DOM は実行時のみ）
- Produces:
  - `shouldIgnore(pointerType: string, penSeen: boolean): boolean` — パームリジェクション判定（純粋）
  - `class InkPad`: `new InkPad(canvasEl, { size })`。プロパティ `onStroke: (poly109: number[][]) => void`。メソッド `clear()`, `undoLast()`, `strokeCount(): number`。内部で 1 ストローク完了時に canvas 座標→109 座標へ変換して `onStroke` を呼ぶ。

- [ ] **Step 1: 失敗するテストを書く（純粋部分）**

`test/ink.test.mjs`:

```javascript
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
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `node --test test/ink.test.mjs`
Expected: FAIL（`Cannot find module '../src/ink.js'`）

- [ ] **Step 3: 実装を書く**

`src/ink.js`:

```javascript
// Palm rejection: once a real pen (Apple Pencil) is seen, ignore touch input.
export function shouldIgnore(pointerType, penSeen) {
  return pointerType === 'touch' && penSeen;
}

// Captures the child's raw ink on a transparent canvas overlay, preserving
// stops/hooks/sweeps (止めはねはらい). Reports each completed stroke as a
// polyline in the 109x109 KanjiVG coordinate space.
export class InkPad {
  constructor(canvasEl, { size = 109 } = {}) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.size = size; // logical square size in CSS px
    this.onStroke = () => {};
    this.penSeen = false;
    this.strokes = []; // array of strokes; each stroke is array of [xCss, yCss]
    this.drawing = null;

    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = '#222';
    this.ctx.lineWidth = 6;

    canvasEl.style.touchAction = 'none';
    canvasEl.addEventListener('pointerdown', (e) => this._down(e));
    canvasEl.addEventListener('pointermove', (e) => this._move(e));
    canvasEl.addEventListener('pointerup', (e) => this._up(e));
    canvasEl.addEventListener('pointercancel', (e) => this._up(e));
  }

  _pos(e) {
    const r = this.canvas.getBoundingClientRect();
    return [
      ((e.clientX - r.left) / r.width) * this.size,
      ((e.clientY - r.top) / r.height) * this.size,
    ];
  }

  _down(e) {
    if (e.pointerType === 'pen') this.penSeen = true;
    if (shouldIgnore(e.pointerType, this.penSeen)) return;
    e.preventDefault();
    this.canvas.setPointerCapture?.(e.pointerId);
    this.drawing = { id: e.pointerId, pts: [this._pos(e)] };
    this._render();
  }

  _move(e) {
    if (!this.drawing || e.pointerId !== this.drawing.id) return;
    if (shouldIgnore(e.pointerType, this.penSeen)) return;
    e.preventDefault();
    this.drawing.pts.push(this._pos(e));
    this._render();
  }

  _up(e) {
    if (!this.drawing || e.pointerId !== this.drawing.id) return;
    const stroke = this.drawing.pts;
    this.drawing = null;
    if (stroke.length >= 2) {
      this.strokes.push(stroke);
      const scale = 109 / this.size;
      this.onStroke(stroke.map(([x, y]) => [x * scale, y * scale]));
    }
    this._render();
  }

  strokeCount() {
    return this.strokes.length;
  }

  undoLast() {
    this.strokes.pop();
    this._render();
  }

  clear() {
    this.strokes = [];
    this.drawing = null;
    this._render();
  }

  _render() {
    const c = this.ctx;
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const px = this.canvas.width / this.size;
    const drawStroke = (pts) => {
      c.beginPath();
      c.moveTo(pts[0][0] * px, pts[0][1] * px);
      for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0] * px, pts[i][1] * px);
      c.stroke();
    };
    for (const s of this.strokes) drawStroke(s);
    if (this.drawing && this.drawing.pts.length > 0) drawStroke(this.drawing.pts);
  }
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `node --test test/ink.test.mjs`
Expected: PASS（4 tests pass）。`InkPad` の DOM 挙動は Task 11 の E2E で確認する。

- [ ] **Step 5: Commit**

```bash
git add src/ink.js test/ink.test.mjs
git commit -m "feat: ペン入力キャプチャとパームリジェクションを追加"
```

---

## Task 9: お手本表示・重ね（src/overlay.js）

**Files:**
- Create: `src/overlay.js`

**Interfaces:**
- Consumes: なし（DOM は実行時のみ）
- Produces:
  - `class Overlay`: `new Overlay(svgEl, { size = 109 })`。メソッド:
    - `setCharacter({ strokes, medians })` — 内部状態を更新（未描画）
    - `reveal()` — 全画を薄く表示（答え合わせ）
    - `hint(index)` — 指定画のみ薄く表示（書き順ヒント）
    - `animate()` — 1 画ずつ順に描くアニメーション（お手本）
    - `clear()` — 全消去

- [ ] **Step 1: 実装を書く**

`src/overlay.js`:

```javascript
// Renders the model character over the child's ink (KanjiVG centerlines).
// Used for お手本 animation (書き方) and 答え合わせ overlay (止めはねはらい比較).
const SVGNS = 'http://www.w3.org/2000/svg';

export class Overlay {
  constructor(svgEl, { size = 109 } = {}) {
    this.svg = svgEl;
    this.size = size;
    this.char = { strokes: [], medians: [] };
    this.svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  }

  setCharacter(char) {
    this.char = char;
    this.clear();
  }

  clear() {
    while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);
  }

  _pathEl(d, { opacity = 1, color = '#e91e63' } = {}) {
    const p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', color);
    p.setAttribute('stroke-width', '4');
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-linejoin', 'round');
    p.setAttribute('opacity', String(opacity));
    this.svg.appendChild(p);
    return p;
  }

  // Faint full character over the ink (答え合わせ).
  reveal() {
    this.clear();
    for (const d of this.char.strokes) this._pathEl(d, { opacity: 0.35 });
  }

  // Faint single stroke as a next-stroke hint.
  hint(index) {
    const d = this.char.strokes[index];
    if (d) this._pathEl(d, { opacity: 0.3, color: '#2196f3' });
  }

  // Draw each stroke in order with a dash animation (お手本).
  animate() {
    this.clear();
    const strokes = this.char.strokes;
    const perStroke = 650; // ms
    strokes.forEach((d, i) => {
      const p = this._pathEl(d, { opacity: 1 });
      const len = p.getTotalLength ? p.getTotalLength() : 100;
      p.style.strokeDasharray = String(len);
      p.style.strokeDashoffset = String(len);
      p.style.transition = `stroke-dashoffset ${perStroke}ms linear`;
      // Stagger each stroke after the previous finishes.
      setTimeout(() => {
        p.style.strokeDashoffset = '0';
      }, i * perStroke + 30);
    });
  }
}
```

- [ ] **Step 2: 構文チェック**

Run: `node --check src/overlay.js`
Expected: エラーなし（終了コード 0）。DOM 挙動は Task 11 の E2E で確認する。

- [ ] **Step 3: Commit**

```bash
git add src/overlay.js
git commit -m "feat: お手本アニメーションと重ね表示を追加"
```

---

## Task 10: 画面と結線（index.html, style.css, src/app.js）

**Files:**
- Create: `index.html`, `style.css`, `src/app.js`

**Interfaces:**
- Consumes: `KANJI_DATA` from `data/kanji-data.js`; `pickQuestions` from `src/select.js`; `rubyToHtml` from `src/ruby.js`; `matchStroke` from `src/judge.js`; `InkPad` from `src/ink.js`; `Overlay` from `src/overlay.js`
- Produces: `initApp()`（`src/app.js`）— 画面初期化のエントリポイント

- [ ] **Step 1: `index.html` を作成**

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>漢字ドリル</title>
  <link rel="stylesheet" href="./style.css" />
</head>
<body>
  <main class="app">
    <div class="progress" id="progress">問題 1 / 10</div>
    <p class="sentence" id="sentence">よみこみ中…</p>

    <div class="pad" id="pad">
      <svg class="model" id="model" aria-hidden="true"></svg>
      <canvas class="ink" id="ink" width="600" height="600"></canvas>
      <div class="guide" aria-hidden="true"></div>
    </div>

    <p class="message" id="message">&nbsp;</p>

    <div class="controls">
      <button type="button" id="btn-model">おてほん</button>
      <button type="button" id="btn-clear">やりなおす</button>
      <button type="button" id="btn-check">こたえあわせ</button>
      <button type="button" id="btn-next" class="primary" hidden>つぎへ</button>
    </div>
  </main>

  <footer class="credit">
    書き順データ: <a href="https://kanjivg.tagaini.net/" target="_blank" rel="noopener">KanjiVG</a>
    (Ulrich Apel) / CC BY-SA 3.0
  </footer>

  <script type="module">
    import { initApp } from './src/app.js';
    initApp();
  </script>
</body>
</html>
```

- [ ] **Step 2: `style.css` を作成**

```css
:root { --pad: 320px; }
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif;
  color: #333;
  background: #f4f7f6;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
}
.app {
  background: #fff;
  margin: 16px;
  padding: 16px 20px 24px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-width: 520px;
  width: 100%;
  text-align: center;
}
.progress { color: #888; font-size: 15px; }
.sentence { font-size: 24px; line-height: 1.6; margin: 12px 0 16px; }
.sentence ruby rt { font-size: 11px; color: #666; }
.sentence .blank {
  color: #e91e63;
  font-weight: bold;
  border-bottom: 3px solid #e91e63;
  padding: 0 4px;
}
.pad {
  position: relative;
  width: var(--pad);
  height: var(--pad);
  margin: 0 auto 12px;
  border: 3px dashed #ccc;
  border-radius: 8px;
  background: #fafafa;
  touch-action: none;
}
.pad .model, .pad .ink, .pad .guide {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.pad .guide::before, .pad .guide::after {
  content: "";
  position: absolute;
  background: #eee;
}
.pad .guide::before { left: 50%; top: 0; width: 2px; height: 100%; }
.pad .guide::after { top: 50%; left: 0; height: 2px; width: 100%; }
.pad .ink { touch-action: none; z-index: 2; }
.pad .model { z-index: 1; }
.message { min-height: 26px; font-size: 18px; font-weight: bold; color: #e91e63; }
.message.ok { color: #4caf50; }
.controls { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
.controls button {
  border: none;
  border-radius: 8px;
  padding: 12px 20px;
  font-size: 16px;
  background: #2196f3;
  color: #fff;
  cursor: pointer;
}
.controls button.primary { background: #4caf50; }
.controls button:active { filter: brightness(0.9); }
.credit { color: #999; font-size: 12px; margin: 8px 16px 24px; text-align: center; }
.credit a { color: #999; }
@media (min-width: 700px) { :root { --pad: 380px; } }
```

- [ ] **Step 3: `src/app.js` を作成**

```javascript
import { KANJI_DATA } from '../data/kanji-data.js';
import { pickQuestions } from './select.js';
import { rubyToHtml } from './ruby.js';
import { matchStroke } from './judge.js';
import { InkPad } from './ink.js';
import { Overlay } from './overlay.js';

const QUESTION_COUNT = 10;
const HINT_AFTER_MISSES = 2;

export function initApp() {
  const el = (id) => document.getElementById(id);
  const dom = {
    progress: el('progress'),
    sentence: el('sentence'),
    message: el('message'),
    model: el('model'),
    ink: el('ink'),
    btnModel: el('btn-model'),
    btnClear: el('btn-clear'),
    btnCheck: el('btn-check'),
    btnNext: el('btn-next'),
  };

  // Only kanji with valid stroke data can be asked. Warn about excluded ones (§6).
  const pool = KANJI_DATA.filter((k) => {
    const valid = Array.isArray(k.medians) && k.medians.length > 0;
    if (!valid) console.warn(`Skipping kanji with invalid stroke data: ${k.kanji ?? k.id}`);
    return valid;
  });
  const questions = pickQuestions(pool, QUESTION_COUNT);

  const overlay = new Overlay(dom.model);
  const ink = new InkPad(dom.ink, { size: 109 });
  // Expose the ink pad for E2E tests (harmless in production).
  if (typeof window !== 'undefined') window.__ink = ink;

  const state = { index: 0, expected: 0, misses: 0, done: false };

  function renderSentence(entry) {
    // Apply ruby to the text around the blank; validateList guarantees exactly one 〇.
    const [before, after] = entry.sentence.split('〇');
    dom.sentence.innerHTML =
      rubyToHtml(before) +
      `<span class="blank">〇（${entry.reading}）</span>` +
      rubyToHtml(after);
  }

  function loadQuestion() {
    const entry = questions[state.index];
    state.expected = 0;
    state.misses = 0;
    dom.progress.textContent = `問題 ${state.index + 1} / ${questions.length}`;
    renderSentence(entry);
    setMessage('', false);
    dom.btnNext.hidden = true;
    overlay.setCharacter(entry);
    ink.clear();
  }

  function setMessage(text, ok) {
    dom.message.textContent = text || ' ';
    dom.message.classList.toggle('ok', !!ok);
  }

  ink.onStroke = (poly109) => {
    if (state.done) return;
    const entry = questions[state.index];
    if (state.expected >= entry.medians.length) return; // character already complete
    const median = entry.medians[state.expected];
    const result = matchStroke(poly109, median);
    if (result.ok) {
      state.expected++;
      state.misses = 0;
      if (state.expected >= entry.medians.length) {
        setMessage('大せいかい！よくできました💮', true);
        dom.btnNext.hidden = false;
      } else {
        setMessage('', false);
      }
    } else {
      ink.undoLast(); // let the child retry this stroke
      state.misses++;
      const why = result.reason === 'direction' ? 'むきをたしかめてね' : 'じゅんばんをたしかめてね';
      setMessage('おっと！' + why, false);
      if (state.misses >= HINT_AFTER_MISSES) overlay.hint(state.expected);
    }
  };

  dom.btnModel.addEventListener('click', () => overlay.animate());
  dom.btnClear.addEventListener('click', () => {
    state.expected = 0;
    state.misses = 0;
    ink.clear();
    overlay.clear();
    setMessage('', false);
    dom.btnNext.hidden = true;
  });
  dom.btnCheck.addEventListener('click', () => overlay.reveal());
  dom.btnNext.addEventListener('click', () => {
    state.index++;
    if (state.index >= questions.length) return finish();
    loadQuestion();
  });

  function finish() {
    state.done = true;
    dom.sentence.textContent = 'ぜんぶできたね！🎉';
    dom.progress.textContent = `${questions.length} / ${questions.length}`;
    document.querySelector('.pad').style.display = 'none';
    document.querySelector('.controls').style.display = 'none';
    setMessage('', true);
  }

  loadQuestion();
}
```

- [ ] **Step 4: 構文チェック**

Run: `node --check src/app.js && node --check src/overlay.js && node --check src/ink.js`
Expected: エラーなし（終了コード 0）。

- [ ] **Step 5: 手元サーバで目視確認（デスクトップ）**

Run: `python3 -m http.server 8000`（別ターミナルで）→ ブラウザで `http://localhost:8000/` を開く。
Expected: 例文が総ルビ（漢字の上に読み）＋ 出題字が `〇（よみ）` で表示される。マウスで書くと線が残り、正しく 1 画ずつ書き切ると「大せいかい！」と「つぎへ」が出る。「おてほん」でアニメ再生、「こたえあわせ」で薄いお手本が重なる。

- [ ] **Step 6: Commit**

```bash
git add index.html style.css src/app.js
git commit -m "feat: 画面と出題フローの結線を追加"
```

---

## Task 11: E2E 検証とデプロイ

**Files:**
- Create: `test/e2e.spec.mjs`, `playwright.config.mjs`
- Create: `.nojekyll`

**Interfaces:**
- Consumes: 実行中の静的サーバ（Playwright webServer が起動）
- Produces: なし（検証とデプロイ手順）

- [ ] **Step 1: Playwright 設定を作成**

`playwright.config.mjs`:

```javascript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test',
  testMatch: 'e2e.spec.mjs',
  use: { baseURL: 'http://localhost:8000' },
  webServer: {
    command: 'python3 -m http.server 8000',
    url: 'http://localhost:8000',
    reuseExistingServer: true,
  },
});
```

- [ ] **Step 2: E2E テストを書く**

`test/e2e.spec.mjs`:

```javascript
import { test, expect } from '@playwright/test';

// Dispatch a pointer stroke of a given pointerType along a list of [x,y] client points.
async function stroke(page, selector, points, pointerType) {
  await page.evaluate(
    ({ selector, points, pointerType }) => {
      const elErr = document.querySelector(selector);
      const r = elErr.getBoundingClientRect();
      const ev = (type, [px, py], id) =>
        elErr.dispatchEvent(
          new PointerEvent(type, {
            pointerId: id,
            pointerType,
            clientX: r.left + px,
            clientY: r.top + py,
            bubbles: true,
            cancelable: true,
          })
        );
      ev('pointerdown', points[0], 1);
      for (let i = 1; i < points.length; i++) ev('pointermove', points[i], 1);
      ev('pointerup', points[points.length - 1], 1);
    },
    { selector, points, pointerType }
  );
}

test('renders the sentence with the target blank', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#sentence .blank')).toBeVisible();
  await expect(page.locator('#sentence .blank')).toContainText('〇');
});

test('palm rejection: touch is ignored after a pen stroke', async ({ page }) => {
  await page.goto('/');
  // Override onStroke with a call counter, isolated from judge/undo behavior.
  await page.evaluate(() => {
    window.__calls = 0;
    window.__ink.penSeen = false;
    window.__ink.clear();
    window.__ink.onStroke = () => { window.__calls++; };
  });
  // A pen stroke: sets penSeen=true and fires onStroke once.
  await stroke(page, '#ink', [[20, 20], [80, 80]], 'pen');
  // A following touch stroke (palm) must be ignored: onStroke must NOT fire.
  await stroke(page, '#ink', [[10, 300], [300, 300]], 'touch');
  const calls = await page.evaluate(() => window.__calls);
  expect(calls).toBe(1);
});

test('model button animates and check button reveals overlay', async ({ page }) => {
  await page.goto('/');
  await page.click('#btn-model');
  await expect(page.locator('#model path')).not.toHaveCount(0);
  await page.click('#btn-clear');
  await page.click('#btn-check');
  await expect(page.locator('#model path')).not.toHaveCount(0);
});
```

> 注: 書き順一致による「大せいかい！」の到達は、字ごとに median 座標へ正確に軌跡を合わせる必要があり E2E では脆い。ストローク一致の判定ロジックは Task 7 の単体テストで担保し、E2E は「レンダリング・パームリジェクション・お手本/重ね」の DOM 動作に絞る。

- [ ] **Step 3: E2E を実行**

Run: `npx playwright install chromium && npm run e2e`
Expected: 3 tests pass。落ちたら該当 DOM の id / クラスを実装と突き合わせる。

- [ ] **Step 4: GitHub Pages 用 `.nojekyll` を追加**

Run: `touch .nojekyll`
（`_` や特殊パスを Jekyll に処理させないため。ES モジュール構成では安全側の定番。）

- [ ] **Step 5: 全単体テストの通しを確認**

Run: `npm test`
Expected: すべての `test/*.test.mjs` が PASS（ruby / validate-list / sample-path / convert / select / judge / ink / smoke）。

- [ ] **Step 6: Commit**

```bash
git add playwright.config.mjs test/e2e.spec.mjs .nojekyll
git commit -m "test: E2E検証とGitHub Pages設定を追加"
```

- [ ] **Step 7: デプロイ手順（ユーザー承認後・push は別途）**

このリポジトリを GitHub Pages で公開するには（実際の push はユーザーの許可を得てから）:

1. `feat/kanji-drill` を `main` にマージ（PR 経由）。
2. GitHub リポジトリ設定 → Pages → Source を `Deploy from a branch`、Branch を `main` / `/ (root)` に設定。
3. 数分後 `https://nanausako.github.io/kanji/` で公開。iPad Safari で開き、共有 → ホーム画面に追加。

- [ ] **Step 8: iPad 実機チェックリスト（手動）**

以下を iPad + Apple Pencil で確認する:
- [ ] 例文の総ルビが読める大きさで表示される。
- [ ] Apple Pencil で書くと線が残り、手のひらをついても線が増えない（パームリジェクション）。
- [ ] 正しい書き順で書き切ると「大せいかい！」＋「つぎへ」。
- [ ] 「おてほん」で書き順アニメが再生される。
- [ ] 「こたえあわせ」で自分の筆跡の上に薄いお手本が重なり、止めはねはらいを見比べられる。
- [ ] 10 問終わると「ぜんぶできたね！🎉」。
- [ ] ページを再読み込みすると出題順が変わる（重複なしランダム）。

---

## Self-Review

**1. Spec coverage:**
- §1 対象漢字・例文 → Task 3（kanji-list.json）。
- §1.1 総ルビ・`漢字《よみ》`・`｜` → Task 2（ruby.js）+ Task 10（renderSentence）。
- §2/§10 KanjiVG 自前描画・自前判定 → Task 5（strokes 直接描画データ）+ Task 7（judge）+ Task 9（overlay）。
- §2 GitHub Pages・オフライン → Task 1（devDeps 分離）+ Task 11（Pages 設定）。
- §3.1 各モジュール責務 → Task 2/6/7/8/9/10。
- §3.2 変換・差分・検証基準（画数一致・順序・median 妥当性・目視「右」）→ Task 4/5。
- §3.3 id/grade・Fisher-Yates 抽出・分母＝配列長・追加手順 → Task 3/5/6/10。
- §4.1 レイアウト・SVG下層+canvas上層 → Task 10。
- §4.2 止めはねはらい重ね → Task 9（reveal）+ Task 10（btn-check）。
- §4.3 判定要素・2 回ミスでヒント → Task 7 + Task 10。
- §5 出題フロー・ボタン・記録なし → Task 10。
- §6 パームリジェクション・touch-action・不正データは母集団除外 → Task 8 + Task 10（pool filter）+ Task 2/10。
- §7 テスト（変換・judge・抽出・ルビ・E2E）→ Task 2-8/11。
- §9 ライセンス（LICENSE/LICENSE-DATA/NOTICE/フッター/README）→ Task 1 + Task 10（footer）。

**2. Placeholder scan:** コード steps はすべて実コードを記載。TBD/TODO なし。

**3. Type consistency:** `InkPad.onStroke(poly109)` は 109 座標系 `[x,y][]`（Task 8）→ `matchStroke(poly109, median)`（Task 7）で同座標系。`Overlay.setCharacter({strokes, medians})` は `KANJI_DATA` 要素形（Task 5）と一致。`pickQuestions(pool, QUESTION_COUNT)`（Task 10）は Task 6 の署名と一致。`rubyToHtml`（Task 2）を Task 10 で使用、署名一致。
