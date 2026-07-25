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
