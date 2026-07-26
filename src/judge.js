// Stroke-order matcher in the 109x109 KanjiVG coordinate space.
// A drawn stroke is compared against ALL strokes of the character and must be
// nearest to the EXPECTED one. This distinguishes adjacent strokes (e.g. the
// stacked horizontals of 音/雨) that a loose absolute threshold would let pass.
// Thresholds are lenient for messy young handwriting; refine on device (§4.3).

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// Resample a polyline to n points evenly spaced by arc length.
export function resample(points, n) {
  if (points.length === 0) return [];
  if (points.length === 1) return Array.from({ length: n }, () => points[0].slice());

  const cum = [0];
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + dist(points[i - 1], points[i]));
  const total = cum[cum.length - 1];
  if (total === 0) return Array.from({ length: n }, () => points[0].slice()); // still pen

  const out = [];
  for (let k = 0; k < n; k++) {
    const target = (total * k) / (n - 1);
    let i = 1;
    while (i < points.length && cum[i] < target) i++;
    i = Math.min(i, points.length - 1); // clamp: never index past the last point
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

// medians: ALL strokes of the character. expectedIndex: which one should be next.
export function matchStroke(drawn, medians, expectedIndex, opts = {}) {
  const { shapeTol = 20 } = opts;
  if (!drawn || drawn.length < 2) return { ok: false, reason: 'shape' };

  const n = medians[expectedIndex].length;
  const r = resample(drawn, n);

  // Nearest stroke over the whole character (pointwise avg captures position + shape).
  let best = { idx: -1, score: Infinity, reversed: false };
  for (let i = 0; i < medians.length; i++) {
    const m = medians[i];
    const fwd = avgDist(r, m);
    const rev = avgDist(r, m.slice().reverse());
    const score = Math.min(fwd, rev);
    if (score < best.score) best = { idx: i, score, reversed: rev < fwd };
  }

  if (best.score > shapeTol * 2) return { ok: false, reason: 'shape' }; // nothing close
  if (best.idx !== expectedIndex) return { ok: false, reason: 'order' };
  if (best.reversed) return { ok: false, reason: 'direction' };
  if (best.score > shapeTol) return { ok: false, reason: 'shape' };
  return { ok: true, reason: 'ok' };
}
