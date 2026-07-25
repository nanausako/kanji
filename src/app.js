import { KANJI_DATA } from '../data/kanji-data.js';
import { pickQuestions } from './select.js';
import { rubyToHtml } from './ruby.js';
import { matchStroke } from './judge.js';
import { InkPad } from './ink.js';
import { Overlay } from './overlay.js';

const QUESTION_COUNT = 10;
const HINT_AFTER_MISSES = 2;
const SKIP_AFTER_MISSES = 3; // after this many misses, offer とばす (§5 no-pressure)

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
    btnSkip: el('btn-skip'),
    btnNext: el('btn-next'),
    btnAgain: el('btn-again'),
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
    dom.btnSkip.hidden = true;
    overlay.setCharacter(entry);
    ink.clear();
  }

  function setMessage(text, ok) {
    dom.message.textContent = text || ' ';
    dom.message.classList.toggle('ok', !!ok);
  }

  ink.onStroke = (poly109) => {
    if (state.done) return;
    const entry = questions[state.index];
    if (state.expected >= entry.medians.length) return; // character already complete
    const result = matchStroke(poly109, entry.medians, state.expected);
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
      if (state.misses >= SKIP_AFTER_MISSES) dom.btnSkip.hidden = false; // escape hatch
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
    dom.btnSkip.hidden = true;
  });
  dom.btnCheck.addEventListener('click', () => overlay.reveal());

  function goNext() {
    state.index++;
    if (state.index >= questions.length) return finish();
    loadQuestion();
  }
  dom.btnNext.addEventListener('click', goNext);
  dom.btnSkip.addEventListener('click', goNext);
  dom.btnAgain.addEventListener('click', () => location.reload());

  function finish() {
    state.done = true;
    dom.sentence.textContent = 'ぜんぶできたね！🎉';
    dom.progress.textContent = `${questions.length} / ${questions.length}`;
    document.querySelector('.pad').style.display = 'none';
    document.querySelector('.controls').style.display = 'none';
    dom.btnAgain.hidden = false;
    setMessage('', true);
  }

  loadQuestion();
}
