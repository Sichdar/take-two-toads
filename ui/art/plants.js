// Botanical plates built from rules (Phase 6): stem, leaves, flower or fruit, root.
// The same seed always draws the same plant.
import { rngFor, smooth, wobble, blob, leaf, line, svg, LEAF } from './ink.js';
import { INGREDIENT_BY_ID } from '../../data/ingredients.js';

const cache = new Map();

function stem(r, x0, y0, x1, y1) {
  const pts = wobble(r, [[x0, y0], [x0 + (x1 - x0) * 0.33 + (r() - 0.5) * 6, y0 + (y1 - y0) * 0.33], [x0 + (x1 - x0) * 0.66 + (r() - 0.5) * 6, y0 + (y1 - y0) * 0.66], [x1, y1]], 1);
  return { d: smooth(pts), pts };
}

function hatch(r, x, y, w, h, n = 4) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const hx = x + (i / n) * w;
    d += `<path d="${line(r, hx, y + h, hx + w * 0.3, y, 1)}" stroke-width="0.7" opacity="0.6"/>`;
  }
  return d;
}

const DRAW = {
  root(r, c) {
    let wash = '', ink = '';
    const s = stem(r, 50, 60, 50 + (r() - 0.5) * 10, 16);
    ink += `<path d="${s.d}" stroke-width="1.8"/>`;
    for (let i = 0; i < 4; i++) {
      const t = 0.3 + i * 0.18, side = i % 2 ? 1 : -1;
      const y = 60 - t * 44, x = 50 + (r() - 0.5) * 4;
      const d = leaf(r, x, y, side > 0 ? -0.5 : Math.PI + 0.5, 16 + r() * 6, 5);
      wash += `<path d="${d}" fill="${LEAF}"/>`;
      ink += `<path d="${d}" stroke-width="1.3"/>`;
    }
    const tuber = blob(r, 50, 74, 9, 15, { jitter: 0.12 });
    wash += `<path d="${tuber}" fill="${c}"/>`;
    ink += `<path d="${tuber}" stroke-width="1.8"/>` + hatch(r, 52, 66, 6, 14, 4);
    for (let i = 0; i < 3; i++) ink += `<path d="${line(r, 46 + i * 4, 88, 40 + i * 9 + (r() - 0.5) * 6, 97, 4)}" stroke-width="1"/>`;
    return { wash, ink };
  },
  herb(r, c) {
    let wash = '', ink = '';
    const s = stem(r, 50, 94, 50 + (r() - 0.5) * 8, 14);
    ink += `<path d="${s.d}" stroke-width="1.6"/>`;
    for (let i = 0; i < 5; i++) {
      const y = 86 - i * 14, len = 18 - i * 2;
      for (const side of [-1, 1]) {
        const d = leaf(r, 50 + (r() - 0.5) * 3, y, side > 0 ? -0.35 - r() * 0.2 : Math.PI + 0.35 + r() * 0.2, len, 4.5);
        wash += `<path d="${d}" fill="${c}"/>`;
        ink += `<path d="${d}" stroke-width="1.2"/>`;
      }
    }
    for (let i = 0; i < 5; i++) {
      const d = blob(r, 46 + r() * 8, 10 + r() * 8, 2.2, 2.2, { n: 6, jitter: 0.2 });
      wash += `<path d="${d}" fill="${c}"/>`;
      ink += `<path d="${d}" stroke-width="0.9"/>`;
    }
    return { wash, ink };
  },
  mushroom(r, c) {
    let wash = '', ink = '';
    const stalk = smooth(wobble(r, [[42, 88], [44, 60], [43, 50], [57, 50], [56, 60], [58, 88]], 0.8), true);
    wash += `<path d="${stalk}" fill="#E4D6B4"/>`;
    ink += `<path d="${stalk}" stroke-width="1.6"/>` + hatch(r, 50, 60, 6, 24, 3);
    const cap = smooth(wobble(r, [[18, 52], [24, 32], [38, 20], [50, 17], [62, 20], [76, 32], [82, 52], [66, 54], [50, 55], [34, 54]], 0.8), true);
    wash += `<path d="${cap}" fill="${c}"/>`;
    ink += `<path d="${cap}" stroke-width="1.8"/>`;
    for (let i = 0; i < 6; i++) ink += `<path d="${line(r, 26 + i * 9, 53, 36 + i * 5.5, 50, 1)}" stroke-width="0.7"/>`;
    for (let i = 0; i < 4; i++) {
      const d = blob(r, 32 + r() * 36, 28 + r() * 14, 3, 2.2, { n: 6, jitter: 0.25 });
      wash += `<path d="${d}" fill="#DCC9A0"/>`;
      ink += `<path d="${d}" stroke-width="0.9"/>`;
    }
    ink += `<path d="${line(r, 30, 92, 70, 92, 2)}" stroke-width="1"/>`;
    return { wash, ink };
  },
  nettle(r, c) {
    let wash = '', ink = '';
    const s = stem(r, 50, 94, 50 + (r() - 0.5) * 8, 18);
    ink += `<path d="${s.d}" stroke-width="1.6"/>`;
    for (let i = 0; i < 4; i++) {
      const y = 84 - i * 17, side = i % 2 ? 1 : -1;
      const d = leaf(r, 50, y, side > 0 ? -0.45 : Math.PI + 0.45, 22 - i * 2, 7, { serrate: 0.35 });
      wash += `<path d="${d}" fill="${LEAF}"/>`;
      ink += `<path d="${d}" stroke-width="1.2"/>`;
    }
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.35, x2 = 50 + Math.cos(a) * 14, y2 = 18 + Math.sin(a) * 14;
      ink += `<path d="${line(r, 50 + Math.cos(a) * 4, 18 + Math.sin(a) * 4, x2, y2, 1)}" stroke="${c}" stroke-width="2"/>`;
    }
    const spark = blob(r, 50, 18, 4, 4, { n: 7, jitter: 0.3 });
    wash += `<path d="${spark}" fill="${c}"/>`;
    ink += `<path d="${spark}" stroke-width="1"/>`;
    return { wash, ink };
  },
  thistle(r, c) {
    let wash = '', ink = '';
    const s = stem(r, 50, 94, 50 + (r() - 0.5) * 6, 36);
    ink += `<path d="${s.d}" stroke-width="1.6"/>`;
    for (let i = 0; i < 3; i++) {
      const y = 86 - i * 16, side = i % 2 ? 1 : -1;
      const d = leaf(r, 50, y, side > 0 ? -0.5 : Math.PI + 0.5, 18, 6, { serrate: 0.6 });
      wash += `<path d="${d}" fill="${LEAF}"/>`;
      ink += `<path d="${d}" stroke-width="1.1"/>`;
    }
    const head = blob(r, 50, 38, 8, 7, { jitter: 0.08 });
    wash += `<path d="${head}" fill="${LEAF}"/>`;
    ink += `<path d="${head}" stroke-width="1.5"/>` + hatch(r, 45, 33, 10, 9, 4);
    for (let i = 0; i < 13; i++) {
      const a = -Math.PI + (i / 12) * Math.PI, x2 = 50 + Math.cos(a) * 26, y2 = 32 + Math.sin(a) * 24;
      ink += `<path d="${line(r, 50, 32, x2, y2, 3)}" stroke-width="0.8"/>`;
      wash += `<circle cx="${x2}" cy="${y2}" r="2.6" fill="${c}"/>`;
    }
    return { wash, ink };
  },
  flower(r, c) {
    let wash = '', ink = '';
    const s = stem(r, 50, 94, 50 + (r() - 0.5) * 8, 30);
    ink += `<path d="${s.d}" stroke-width="1.6"/>`;
    for (const [y, side] of [[80, -1], [66, 1]]) {
      const d = leaf(r, 50, y, side > 0 ? -0.6 : Math.PI + 0.6, 20, 6);
      wash += `<path d="${d}" fill="${LEAF}"/>`;
      ink += `<path d="${d}" stroke-width="1.2"/>`;
    }
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const d = leaf(r, 50 + Math.cos(a) * 4, 28 + Math.sin(a) * 4, a, 17, 5.5);
      wash += `<path d="${d}" fill="${c}"/>`;
      ink += `<path d="${d}" stroke-width="1.1"/>`;
    }
    const mid = blob(r, 50, 28, 6, 6, { jitter: 0.1 });
    wash += `<path d="${mid}" fill="#C9962E"/>`;
    ink += `<path d="${mid}" stroke-width="1.3"/>` + hatch(r, 46, 24, 8, 8, 3);
    return { wash, ink };
  },
  moss(r, c) {
    let wash = '', ink = '';
    for (let i = 0; i < 9; i++) {
      const x = 22 + i * 7 + (r() - 0.5) * 4, y = 74 + (r() - 0.5) * 10;
      const d = blob(r, x, y, 8, 6, { n: 8, jitter: 0.25 });
      wash += `<path d="${d}" fill="${c}"/>`;
      ink += `<path d="${d}" stroke-width="1.1"/>`;
    }
    for (let i = 0; i < 6; i++) {
      const x = 28 + i * 9 + (r() - 0.5) * 4, h = 30 + r() * 20;
      ink += `<path d="${line(r, x, 70, x + (r() - 0.5) * 8, 70 - h, 4)}" stroke-width="1"/>`;
      const d = blob(r, x + (r() - 0.5) * 6, 70 - h, 2.4, 3.6, { n: 6, jitter: 0.15 });
      wash += `<path d="${d}" fill="#E4D6B4"/>`;
      ink += `<path d="${d}" stroke-width="1"/>`;
    }
    ink += `<path d="${line(r, 14, 84, 86, 84, 3)}" stroke-width="1"/>`;
    return { wash, ink };
  },
  fern(r, c) {
    let wash = '', ink = '';
    const pts = wobble(r, [[30, 94], [38, 70], [50, 45], [64, 26], [78, 14]], 1);
    ink += `<path d="${smooth(pts)}" stroke-width="1.6"/>`;
    for (let i = 1; i < 10; i++) {
      const t = i / 10, x = 30 + t * 48, y = 94 - t * 80 + Math.sin(t * Math.PI) * -4;
      const len = 16 * (1 - t * 0.6);
      for (const side of [-1, 1]) {
        const d = leaf(r, x, y, -0.9 + side * 1.3, len, 3.2);
        wash += `<path d="${d}" fill="${c}"/>`;
        ink += `<path d="${d}" stroke-width="1"/>`;
      }
    }
    return { wash, ink };
  },
  berry(r, c) {
    let wash = '', ink = '';
    const s = stem(r, 50, 94, 52, 40);
    ink += `<path d="${s.d}" stroke-width="1.6"/>`;
    for (const [y, side] of [[84, -1], [72, 1], [60, -1]]) {
      const d = leaf(r, 51, y, side > 0 ? -0.5 : Math.PI + 0.5, 19, 6);
      wash += `<path d="${d}" fill="${LEAF}"/>`;
      ink += `<path d="${d}" stroke-width="1.2"/>`;
    }
    const spots = [[50, 30], [41, 24], [59, 24], [46, 16], [56, 15], [36, 33], [64, 33]];
    for (const [x, y] of spots) {
      ink += `<path d="${line(r, 52, 40, x, y + 4, 2)}" stroke-width="0.8"/>`;
      const d = blob(r, x, y, 4.6, 4.6, { n: 7, jitter: 0.08 });
      wash += `<path d="${d}" fill="${c}"/>`;
      ink += `<path d="${d}" stroke-width="1.2"/><circle cx="${x - 1.5}" cy="${y - 1.5}" r="0.8" fill="#EFE2C4" stroke="none"/>`;
    }
    return { wash, ink };
  },
  pepper(r, c) {
    let wash = '', ink = '';
    const body = smooth(wobble(r, [[44, 26], [54, 24], [62, 34], [64, 52], [60, 70], [50, 84], [40, 92], [44, 76], [48, 58], [46, 40]], 0.8), true);
    wash += `<path d="${body}" fill="${c}"/>`;
    ink += `<path d="${body}" stroke-width="1.8"/>` + hatch(r, 52, 36, 7, 30, 4);
    const cap = blob(r, 50, 24, 9, 4.5, { n: 8, jitter: 0.2 });
    wash += `<path d="${cap}" fill="${LEAF}"/>`;
    ink += `<path d="${cap}" stroke-width="1.4"/><path d="${line(r, 50, 21, 56, 8, 3)}" stroke-width="1.6"/>`;
    for (let i = 0; i < 3; i++) ink += `<path d="${line(r, 64 + i * 4, 30 - i * 3, 72 + i * 5, 22 - i * 5, 2)}" stroke="#A8322A" stroke-width="1"/>`;
    return { wash, ink };
  },
  feather(r, c) {
    let wash = '', ink = '';
    const shaft = smooth(wobble(r, [[34, 94], [42, 70], [52, 44], [64, 18]], 0.6));
    const vane = smooth(wobble(r, [[40, 78], [30, 56], [40, 30], [62, 14], [70, 26], [66, 50], [52, 72]], 1), true);
    wash += `<path d="${vane}" fill="${c}"/>`;
    ink += `<path d="${vane}" stroke-width="1.4"/><path d="${shaft}" stroke-width="1.6"/>`;
    for (let i = 0; i < 8; i++) {
      const t = i / 8, x = 40 + t * 22, y = 72 - t * 54;
      ink += `<path d="${line(r, x, y, x - 10, y - 4, 1)}" stroke-width="0.6"/><path d="${line(r, x, y, x + 8, y - 8, 1)}" stroke-width="0.6"/>`;
    }
    return { wash, ink };
  },
};

export function plantSVG(id) {
  if (cache.has(id)) return cache.get(id);
  const ing = INGREDIENT_BY_ID[id];
  const r = rngFor(ing.art.seed);
  const { wash, ink } = (DRAW[ing.art.kind] || DRAW.herb)(r, ing.art.wash);
  const out = svg('0 0 100 100', wash, ink, 'plate');
  cache.set(id, out);
  return out;
}
