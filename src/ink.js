// Palm rejection: once a real pen (Apple Pencil) is seen, ignore touch input.
export function shouldIgnore(pointerType, penSeen) {
  return pointerType === 'touch' && penSeen;
}

// Captures the child's raw ink on a transparent canvas overlay, preserving
// stops/hooks/sweeps (止めはねはらい). Points are stored in the 109x109 KanjiVG
// coordinate space; each completed stroke is reported to onStroke in that space.
export class InkPad {
  constructor(canvasEl, { size = 109 } = {}) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.size = size; // logical coordinate size (matches KanjiVG 109 space), NOT CSS px
    this.onStroke = () => {};
    this.penSeen = false;
    this.strokes = []; // each stroke: array of [x, y] in 109-space
    this.drawing = null;

    canvasEl.style.touchAction = 'none';
    canvasEl.addEventListener('pointerdown', (e) => this._down(e));
    canvasEl.addEventListener('pointermove', (e) => this._move(e));
    canvasEl.addEventListener('pointerup', (e) => this._up(e));
    canvasEl.addEventListener('pointercancel', (e) => this._cancel(e));

    this._fit();
    if (typeof window !== 'undefined') window.addEventListener('resize', () => this._fit());
  }

  // Size the backing store to display size × devicePixelRatio for crisp ink
  // (iPad DPR is 2–3; a fixed backing store would look blurry).
  _fit() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    if (rect.width > 0 && rect.height > 0) {
      this.canvas.width = Math.round(rect.width * dpr);
      this.canvas.height = Math.round(rect.height * dpr);
    }
    this._render();
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
    // Synthetic (test) or inactive pointers throw InvalidPointerId; ignore.
    try { this.canvas.setPointerCapture(e.pointerId); } catch { /* non-fatal */ }
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
      this.onStroke(stroke.map(([x, y]) => [x, y]));
    }
    this._render();
  }

  _cancel(e) {
    // A cancelled pointer (palm bump, gesture takeover) discards the in-progress
    // stroke rather than committing a partial line.
    if (!this.drawing || e.pointerId !== this.drawing.id) return;
    this.drawing = null;
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
    // Setting canvas.width in _fit() resets context state, so (re)apply it here.
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const px = this.canvas.width / this.size;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = '#222';
    c.lineWidth = 2.4 * px; // ~constant visual width regardless of DPR
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
