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
    for (const key of ['id', 'kanji', 'reading', 'sentence']) {
      if (e[key] !== undefined && e[key] !== null && typeof e[key] !== 'string') {
        errors.push(`${where}: "${key}" must be a string`);
      }
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
      // ruby notation must be well-formed: 《 and 》 balanced.
      const opens = (e.sentence.match(/《/g) || []).length;
      const closes = (e.sentence.match(/》/g) || []).length;
      if (opens !== closes) errors.push(`${where}: unbalanced 《》 in sentence`);
    }
  }
  return { ok: errors.length === 0, errors };
}
