// The herbal works out hidden ingredient values from past brews.
// For each scale separately, every brew is a sum: (count × value) + ... = reading.
// We solve those sums exactly (Gaussian elimination with fractions, never rounded decimals).
// A reading where the scale hit its ±5 stop is not a true sum, so it is left out for that scale.
import { SCALES } from './brew.js';

// --- tiny exact fractions --------------------------------------------------
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
const frac = (n, d = 1) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); return { n: n / g, d: d / g }; };
const sub = (a, b) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a, b) => frac(a.n * b.n, a.d * b.d);
const div = (a, b) => frac(a.n * b.d, a.d * b.n);
const isZero = a => a.n === 0;
const isOne = a => a.n === a.d;

// Reduced row echelon form. rows: arrays of fractions, last entry = right-hand side.
function rref(rows, nVars) {
  const m = rows.map(r => r.slice());
  const pivots = [];
  let r = 0;
  for (let c = 0; c < nVars && r < m.length; c++) {
    let p = r;
    while (p < m.length && isZero(m[p][c])) p++;
    if (p === m.length) continue;
    [m[r], m[p]] = [m[p], m[r]];
    const pv = m[r][c];
    m[r] = m[r].map(x => div(x, pv));
    for (let i = 0; i < m.length; i++) {
      if (i === r || isZero(m[i][c])) continue;
      const f = m[i][c];
      m[i] = m[i].map((x, j) => sub(x, mul(f, m[r][j])));
    }
    pivots.push({ row: r, col: c });
    r++;
  }
  return { m, pivots };
}

// records: [{ counts: {id: n}, result: {H,S,W}, clamped: {H,S,W} }]
// Returns { exact: { id: { H: v, ... } }, sums: [{ scale, a, b, value }] }
export function solve(records) {
  const exact = {};
  const sums = [];
  for (const k of SCALES) {
    const usable = records.filter(rec => !(rec.clamped && rec.clamped[k]));
    const vars = [...new Set(usable.flatMap(rec => Object.keys(rec.counts)))].sort();
    if (!vars.length) continue;
    const rows = usable.map(rec => [...vars.map(v => frac(rec.counts[v] || 0)), frac(rec.result[k])]);
    const { m, pivots } = rref(rows, vars.length);
    for (const { row, col } of pivots) {
      const others = [];
      for (let c = 0; c < vars.length; c++) if (c !== col && !isZero(m[row][c])) others.push(c);
      const rhs = m[row][vars.length];
      if (others.length === 0) {
        if (rhs.d === 1) (exact[vars[col]] ||= {})[k] = rhs.n;
      } else if (others.length === 1 && isOne(m[row][others[0]]) && rhs.d === 1) {
        sums.push({ scale: k, a: vars[col], b: vars[others[0]], value: rhs.n });
      }
    }
  }
  return { exact, sums };
}

export function isKnown(knowledge, id, k) {
  return knowledge.exact[id] !== undefined && knowledge.exact[id][k] !== undefined;
}

export function fullyKnown(knowledge, id) {
  return SCALES.every(k => isKnown(knowledge, id, k));
}

// What changed between two knowledge states: [{ id, scale, value }]
export function newlyKnown(before, after) {
  const out = [];
  for (const id of Object.keys(after.exact)) {
    for (const k of SCALES) {
      if (isKnown(after, id, k) && !isKnown(before, id, k)) out.push({ id, scale: k, value: after.exact[id][k] });
    }
  }
  return out;
}
