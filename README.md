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
