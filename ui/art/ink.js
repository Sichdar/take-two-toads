// Hand-inked line helpers: smooth paths through slightly wobbled points.
import { makeRng } from '../../logic/rng.js';

export const INK = '#3B2A1E';
export const PAPER = '#EFE2C4';
export const GOLD = '#B88A2B';
export const RUBRIC = '#A8322A';
export const LEAF = '#7E9A5E';

export const rngFor = seed => makeRng(seed);

const f = n => Math.round(n * 10) / 10;

// Catmull-Rom spline through points → SVG path (closed or open).
export function smooth(pts, closed = false) {
  if (pts.length < 2) return '';
  const p = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M${f(p[1][0])} ${f(p[1][1])}`;
  for (let i = 1; i < p.length - 2; i++) {
    const [p0, p1, p2, p3] = [p[i - 1], p[i], p[i + 1], p[i + 2]];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return closed ? d + 'Z' : d;
}

export function wobble(rng, pts, amt = 1) {
  return pts.map(([x, y]) => [x + (rng() - 0.5) * 2 * amt, y + (rng() - 0.5) * 2 * amt]);
}

// A slightly irregular closed blob (leaf, berry, cap...). rot in radians.
export function blob(rng, cx, cy, rx, ry, { n = 10, jitter = 0.1, rot = 0, pointy = 0 } = {}) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    let r = 1 + (rng() - 0.5) * 2 * jitter;
    if (pointy) r *= 1 + pointy * Math.pow(Math.abs(Math.cos(a)), 6);
    const x = Math.cos(a) * rx * r, y = Math.sin(a) * ry * r;
    pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return smooth(pts, true);
}

// A leaf shape from base (x,y), pointing at angle, of length len and width w.
export function leaf(rng, x, y, angle, len, w, { serrate = 0 } = {}) {
  const pts = [];
  const steps = serrate ? 12 : 6;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let half = Math.sin(Math.PI * t) * w * (1 - 0.35 * t);
    if (serrate && i % 2) half *= 1 + serrate;
    pts.push([t * len, -half]);
  }
  for (let i = steps - 1; i > 0; i--) {
    const t = i / steps;
    let half = Math.sin(Math.PI * t) * w * (1 - 0.35 * t);
    if (serrate && i % 2) half *= 1 + serrate;
    pts.push([t * len, half]);
  }
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const placed = wobble(rng, pts, 0.5).map(([px, py]) => [x + px * ca - py * sa, y + px * sa + py * ca]);
  return smooth(placed, true);
}

export function line(rng, x1, y1, x2, y2, bend = 0) {
  const mx = (x1 + x2) / 2 + (rng() - 0.5) * bend, my = (y1 + y2) / 2 + (rng() - 0.5) * bend;
  return smooth(wobble(rng, [[x1, y1], [mx, my], [x2, y2]], 0.4));
}

// Wrap ink and wash layers into one SVG. The wash is offset 1px, like a hand wash missing the line.
export function svg(viewBox, wash, ink, cls = '') {
  return `<svg class="${cls}" viewBox="${viewBox}" aria-hidden="true">`
    + `<g class="wash" transform="translate(1 1)">${wash}</g>`
    + `<g class="ink" fill="none" stroke="${INK}" stroke-linecap="round" stroke-linejoin="round">${ink}</g></svg>`;
}
