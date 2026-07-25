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

  // Faint single stroke as a next-stroke hint. Clears first so repeated calls
  // never stack opacity into a fully-visible answer.
  hint(index) {
    this.clear();
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
