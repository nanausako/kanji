// Parse Aozora-style ruby notation: 漢字《よみ》 with optional ｜ base marker.
// The placeholder 〇 (the blank for the quiz kanji) is never treated as a base.

const PLACEHOLDER = '〇';

function isKanji(ch) {
  // 々 (iteration mark, e.g. 時々) is Script=Common, not Han, so include it
  // explicitly so a ruby base like 時々《ときどき》 stays intact.
  return ch !== PLACEHOLDER && (ch === '々' || /\p{Script=Han}/u.test(ch));
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
