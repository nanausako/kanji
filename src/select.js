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
