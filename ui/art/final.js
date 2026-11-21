// Final art style candidate (M2 art test): ink with varying line weight,
// cross-hatching, watercolour washes with soft wobbly edges, plate frames.
// Pure string builders: the same code runs in the browser and in Node.
import { rngFor, smooth, wobble, blob, line, INK, GOLD, RUBRIC, LEAF } from './ink.js';

const BRASS = '#C8A04A', BRASS_DARK = '#8A6A2A', BRASS_LIGHT = '#E6CC85';
const LEAF_DARK = '#5E7A48', LINEN = '#F3EBDD', SKIN = '#E9C8A2', CHEEK = '#C8645A';
const SCALE_C = { H: '#C9962E', S: '#3F5A7A', W: '#6B4A2E' };
const f = n => Math.round(n * 10) / 10;

let uid = 0;
const nextId = p => `${p}${++uid}`;

// Filters shared by every drawing on the page: put this once in the document.
export const FILTER_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<filter id="ss-wash" x="-8%" y="-8%" width="116%" height="116%">
<feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="7" result="t"/>
<feDisplacementMap in="SourceGraphic" in2="t" scale="5" xChannelSelector="R" yChannelSelector="G" result="d"/>
<feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="2" result="g"/>
<feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 1.35" result="ga"/>
<feComposite in="d" in2="ga" operator="in"/>
</filter>
<filter id="ss-ink" x="-3%" y="-3%" width="106%" height="106%">
<feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="1" seed="4" result="n"/>
<feDisplacementMap in="SourceGraphic" in2="n" scale="0.9" xChannelSelector="R" yChannelSelector="G"/>
</filter>
</defs></svg>`;

// --- line helpers ------------------------------------------------------------

// Points along a Catmull-Rom curve through pts (k samples per segment).
function sample(pts, k = 6) {
  const p = [pts[0], ...pts, pts[pts.length - 1]], out = [];
  for (let i = 1; i < p.length - 2; i++) {
    const [p0, p1, p2, p3] = [p[i - 1], p[i], p[i + 1], p[i + 2]];
    for (let j = 0; j < k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t;
      const c = (a, b, c2, d) => 0.5 * (2 * b + (-a + c2) * t + (2 * a - 5 * b + 4 * c2 - d) * t2 + (-a + 3 * b - 3 * c2 + d) * t3);
      out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// A brush stroke: filled outline whose width runs w0 → wMid → w1 along the curve.
function taper(pts, w0, w1, wMid = null) {
  const s = sample(pts), n = s.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const w = wMid == null ? w0 + (w1 - w0) * t : (t < 0.5 ? w0 + (wMid - w0) * t * 2 : wMid + (w1 - wMid) * (t - 0.5) * 2);
    const a = s[Math.max(0, i - 1)], b = s[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    L.push([s[i][0] - dy * w / 2, s[i][1] + dx * w / 2]);
    R.push([s[i][0] + dy * w / 2, s[i][1] - dx * w / 2]);
  }
  const d = 'M' + [...L, ...R.reverse()].map(([x, y]) => `${f(x)} ${f(y)}`).join(' L') + 'Z';
  return `<path class="brush" d="${d}" fill="${INK}" stroke="none"/>`;
}

const stroke = (d, w = 1.2, extra = '') => `<path d="${d}" stroke-width="${w}"${extra}/>`;

// Parallel hatching clipped to a shape, inside the box (x0,y0)-(x1,y1).
function hatch(r, shape, x0, y0, x1, y1, { gap = 2.6, slope = 0.7, w = 0.6, cross = false, op = 0.85 } = {}) {
  const id = nextId('hc');
  let lines = '';
  const h = y1 - y0;
  for (let x = x0 - h * slope; x < x1; x += gap) {
    lines += stroke(line(r, x, y1, x + h * slope, y0, 0.8), w);
    if (cross) lines += stroke(line(r, x + h * slope, y1, x, y0, 0.8), w * 0.8);
  }
  return `<clipPath id="${id}"><path d="${shape}"/></clipPath><g clip-path="url(#${id})" opacity="${op}">${lines}</g>`;
}

// A leaf with midrib and veins. Returns the outline, one half (for the darker wash) and ink.
function veinLeaf(r, x, y, angle, len, w) {
  const top = [], bot = [], steps = 8;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, half = Math.pow(Math.sin(Math.PI * Math.min(t, 0.999)), 0.85) * w * (1 - 0.3 * t);
    top.push([t * len, -half]); bot.push([t * len, half]);
  }
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const place = pts => wobble(r, pts, 0.35).map(([px, py]) => [x + px * ca - py * sa, y + px * sa + py * ca]);
  const T = place(top), B = place(bot);
  const outline = smooth([...T, ...B.slice(1, -1).reverse()], true);
  const mid = place([[0, 0], [len * 0.3, -w * 0.08], [len * 0.65, -w * 0.05], [len * 0.95, 0]]);
  const halfShape = smooth([...T, ...mid.slice(1, -1).reverse()], true);
  let ink = stroke(outline, 1.1) + stroke(smooth(mid), 0.9);
  for (const t of [0.28, 0.48, 0.68]) {
    for (const side of [-1, 1]) {
      const [a, b] = place([[t * len, 0], [t * len + len * 0.16, side * w * 0.62]]);
      ink += stroke(line(r, a[0], a[1], b[0], b[1], 0.6), 0.55);
    }
  }
  return { outline, halfShape, ink };
}

// Wrap washes and ink in one SVG. Washes sit under the ink, offset like a hand wash.
function art(viewBox, wash, ink, cls, label) {
  return `<svg class="${cls}" viewBox="${viewBox}" role="img" aria-label="${label}">`
    + `<g class="wash2" filter="url(#ss-wash)" transform="translate(1.2 0.8)">${wash}</g>`
    + `<g class="ink2" filter="url(#ss-ink)" fill="none" stroke="${INK}" stroke-linecap="round" stroke-linejoin="round">${ink}</g></svg>`;
}

const washPath = (d, c, op = 1) => `<path d="${d}" fill="${c}" stroke="${c}" stroke-width="1.4" stroke-opacity="0.55" opacity="${op}"/>`;

// --- botanical plate: Emberroot ---------------------------------------------

function snail(r, x, y) {
  const pts = [];
  for (let i = 0; i < 26; i++) { const a = i * 0.55, rad = 1 + i * 0.32; pts.push([x + Math.cos(a) * rad, y + Math.sin(a) * rad * 0.9]); }
  const body = smooth(wobble(r, [[x - 12, y + 7], [x - 2, y + 6], [x + 10, y + 6], [x + 15, y + 2], [x + 17, y + 6], [x + 12, y + 9], [x - 10, y + 10]], 0.3), true);
  return {
    wash: washPath(body, '#B9A98A') + washPath(blob(r, x, y, 8.5, 7.5, { jitter: 0.04 }), '#C9962E', 0.7),
    ink: stroke(body, 1) + stroke(smooth(pts.reverse()), 1) + stroke(line(r, x + 15, y + 2, x + 17, y - 5, 1), 0.7) + stroke(line(r, x + 16, y + 2, x + 21, y - 3, 1), 0.7)
      + `<circle cx="${x + 17}" cy="${y - 5.5}" r="0.9" fill="${INK}" stroke="none"/><circle cx="${x + 21.3}" cy="${y - 3.5}" r="0.9" fill="${INK}" stroke="none"/>`,
  };
}

// Width of the tuber at height y (it narrows towards the tip).
const tuberHalf = y => 17 * Math.pow(Math.max(0, 1 - (y - 150) / 76), 0.75);

export function emberrootPlate() {
  const r = rngFor(1101);
  let wash = '', ink = '';

  // Frame: double rule, plate number, caption
  const box = (x0, y0, x1, y1, w) => [[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]].map(([a, b, c, d]) => stroke(line(r, a, b, c, d, 0.8), w)).join('');
  ink += box(8, 8, 192, 264, 1.4) + box(12, 12, 188, 260, 0.6);

  ink += stroke(line(r, 12, 236, 188, 236, 0.6), 0.6);

  // Ground line with a few pebbles
  for (const [a, b] of [[34, 52], [56, 70], [74, 84], [117, 128], [132, 150], [154, 168]]) ink += stroke(line(r, a, 151 + r() * 2, b, 151 + r() * 2, 1.5), 0.9);
  for (const [px, py] of [[46, 156], [140, 157], [62, 158]]) ink += stroke(blob(r, px, py, 2.4, 1.6, { n: 7, jitter: 0.2 }), 0.7);

  // Stems: three tapered strokes from the crown
  const stems = [
    { pts: [[98, 150], [92, 118], [84, 88], [76, 64]], leaves: [[0.25, -1, 24], [0.5, 1, 21], [0.75, -1, 17]] },
    { pts: [[100, 149], [101, 110], [100, 72], [101, 44]], leaves: [[0.3, 1, 26], [0.55, -1, 22], [0.78, 1, 17]] },
    { pts: [[102, 150], [110, 120], [118, 94], [126, 70]], leaves: [[0.28, 1, 23], [0.55, -1, 19], [0.8, 1, 15]] },
  ];
  for (const s of stems) {
    const p = wobble(r, s.pts, 0.8);
    ink += taper(p, 2.6, 0.9);
    const sp = sample(p, 8);
    for (const [t, side, len] of s.leaves) {
      const i = Math.round(t * (sp.length - 1)), [x, y] = sp[i];
      const [ax, ay] = sp[Math.max(0, i - 1)], [bx, by] = sp[Math.min(sp.length - 1, i + 1)];
      const up = Math.atan2(by - ay, bx - ax);
      const L = veinLeaf(r, x, y, up + side * (0.75 + r() * 0.2), len, 6 + r() * 1.5);
      wash += washPath(L.outline, LEAF) + washPath(L.halfShape, LEAF_DARK, 0.45);
      ink += L.ink;
    }
  }

  // Ember florets on the middle stem: flame-shaped petals, red over ochre
  const [fx, fy] = [101, 42];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.42, len = 15 - Math.abs(i - 2) * 2;
    const tip = [fx + Math.cos(a) * len, fy + Math.sin(a) * len];
    const nx = -Math.sin(a), ny = Math.cos(a);
    const flame = smooth(wobble(r, [
      [fx + nx * 2.6, fy + ny * 2.6], [fx + Math.cos(a) * len * 0.45 + nx * 4, fy + Math.sin(a) * len * 0.45 + ny * 4],
      [tip[0] + nx * 1.5, tip[1] + ny * 1.5], tip,
      [fx + Math.cos(a) * len * 0.55 - nx * 3, fy + Math.sin(a) * len * 0.55 - ny * 3], [fx - nx * 2.6, fy - ny * 2.6],
    ], 0.3), true);
    wash += washPath(flame, RUBRIC, 0.85);
    ink += stroke(flame, 1);
    const inner = blob(r, fx + Math.cos(a) * len * 0.35, fy + Math.sin(a) * len * 0.35, 1.8, 3.4, { n: 7, jitter: 0.15, rot: a + Math.PI / 2 });
    wash += washPath(inner, '#C9962E');
  }
  const calyx = blob(r, fx, fy + 3, 5, 3, { n: 8, jitter: 0.15 });
  wash += washPath(calyx, LEAF_DARK); ink += stroke(calyx, 1.1);
  for (const [sx, sy] of [[90, 20], [112, 18], [101, 14]]) ink += `<circle cx="${sx + r() * 2}" cy="${sy + r() * 2}" r="1" fill="${RUBRIC}" stroke="none"/>`;

  // Buds on the side stems
  for (const [bx, by, rot] of [[75, 61, -0.6], [127, 67, 0.6]]) {
    const bud = blob(r, bx, by, 3.2, 5.2, { n: 8, jitter: 0.1, rot, pointy: 0.25 });
    wash += washPath(bud, '#C9962E') + washPath(blob(r, bx, by - 2, 1.8, 2.4, { n: 6, rot }), RUBRIC, 0.8);
    ink += stroke(bud, 1.1);
  }

  // The root itself: ochre, red at the shoulder, rings and hatching on the shadow side
  const tuber = smooth(wobble(r, [[83, 153], [92, 147], [108, 147], [117, 153], [119, 166], [114, 183], [108, 199], [102, 214], [98, 224], [94, 212], [88, 196], [83, 178], [80, 164]], 0.6), true);
  wash += washPath(tuber, '#C9962E') + washPath(blob(r, 100, 160, 15, 10, { jitter: 0.12 }), RUBRIC, 0.45);
  ink += stroke(tuber, 1.3);
  ink += taper(wobble(r, [[109, 148], [117, 155], [118, 170], [112, 188], [104, 208], [98, 224]], 0.3), 0.6, 0.5, 2.6);
  ink += hatch(r, tuber, 104, 150, 122, 224, { gap: 2.3, slope: 0.5, w: 0.55 });
  for (let y = 160; y < 214; y += 7 + r() * 2) {
    const hw = tuberHalf(y);
    ink += stroke(smooth(wobble(r, [[100 - hw * 0.75, y - 1], [100 - hw * 0.2, y + 1.6], [100 + hw * 0.45, y + 0.6]], 0.3)), 0.7);
  }
  // Rootlets: thin tapering hairs
  for (const [x0, y0, x1, y1] of [[84, 176, 66, 190], [86, 190, 72, 210], [113, 182, 132, 196], [109, 198, 124, 216], [98, 224, 96, 236], [92, 206, 80, 226]]) {
    const mx = (x0 + x1) / 2 + (r() - 0.5) * 6, my = (y0 + y1) / 2 + 3;
    ink += taper([[x0, y0], [mx, my], [x1, y1]], 1.4, 0.2);
    ink += stroke(line(r, mx, my, mx + (x1 > x0 ? 3 : -3), my + 4, 1), 0.45);
  }
  // Crown where stems meet the root
  ink += stroke(smooth(wobble(r, [[90, 150], [96, 146], [104, 146], [110, 150]], 0.3)), 1.4);

  // Marginal snail, bottom left
  const sn = snail(r, 36, 214);
  wash += sn.wash; ink += sn.ink;

  // Lettering (plain paper behind it, per the readability rules)
  ink += `<text x="20" y="30" class="pl-tab" fill="${RUBRIC}" stroke="none">Tab. I.</text>`;
  ink += `<text x="100" y="247.5" class="pl-lat" text-anchor="middle" fill="${INK}" stroke="none">Radix ignea.</text>`;
  ink += `<text x="100" y="257" class="pl-name" text-anchor="middle" fill="${RUBRIC}" stroke="none">Emberroot</text>`;

  return art('0 0 200 272', wash, ink, 'plate2 quill', 'Botanical plate: Emberroot, Radix ignea');
}

// --- villager bust: Old Hessa --------------------------------------------------
// mood: 'neutral' | 'happy' | 'worried'

export function hessaBust(mood = 'neutral') {
  const r = rngFor(4242);
  let wash = '', ink = '';

  // Shawl over a dark dress, crossed at the front
  const shawl = smooth(wobble(r, [[14, 220], [24, 190], [44, 170], [72, 158], [100, 156], [128, 158], [156, 170], [176, 190], [186, 220]], 0.8), true);
  const dress = smooth(wobble(r, [[84, 160], [100, 198], [116, 160], [100, 168]], 0.4), true);
  wash += washPath(shawl, '#8A5A72') + washPath(dress, '#4A3A30');
  ink += stroke(shawl, 1.6) + stroke(dress, 1.2);
  ink += hatch(r, shawl, 120, 156, 186, 220, { gap: 3.2, slope: -0.6, w: 0.55, cross: true });
  ink += hatch(r, shawl, 14, 180, 46, 220, { gap: 3.4, slope: 0.6, w: 0.5 });
  // Folds and the crossing edge
  ink += taper(wobble(r, [[84, 160], [92, 182], [100, 200], [106, 220]], 0.5), 2.2, 0.6);
  ink += taper(wobble(r, [[116, 160], [110, 180], [104, 196]], 0.5), 1.8, 0.5);
  for (const [a, b, c2, d] of [[40, 182, 52, 214], [62, 172, 70, 210], [140, 170, 136, 212], [160, 182, 154, 214]]) ink += stroke(line(r, a, b, c2, d, 4), 0.9);
  // Fringe along the shawl's lower edge
  for (let x = 20; x < 182; x += 5) ink += stroke(line(r, x, 214 + Math.sin(x) * 1.5, x + 1, 220, 0.5), 0.7);

  // Kerchief: back of the linen hood, then the ties under the chin
  const hood = smooth(wobble(r, [[62, 146], [52, 112], [54, 78], [70, 50], [100, 38], [130, 50], [146, 78], [148, 112], [138, 146], [118, 154], [82, 154]], 0.8), true);
  wash += washPath(hood, LINEN);
  ink += stroke(hood, 1.7);
  ink += taper(wobble(r, [[130, 50], [146, 78], [148, 112], [138, 146]], 0.4), 0.8, 0.8, 2.4);
  ink += hatch(r, hood, 132, 60, 150, 148, { gap: 2.6, slope: 0.4, w: 0.5 });
  for (const [a, b, c2, d] of [[64, 66, 58, 104], [136, 66, 142, 104], [76, 48, 70, 70]]) ink += stroke(line(r, a, b, c2, d, 3), 0.7);
  const tieL = smooth(wobble(r, [[66, 118], [76, 140], [96, 152], [94, 158], [72, 146], [60, 122]], 0.4), true);
  const tieR = smooth(wobble(r, [[134, 118], [124, 140], [104, 152], [106, 158], [128, 146], [140, 122]], 0.4), true);
  wash += washPath(tieL, LINEN) + washPath(tieR, LINEN);
  ink += stroke(tieL, 1.1) + stroke(tieR, 1.1);

  // Face
  const face = smooth(wobble(r, [[100, 60], [122, 66], [134, 88], [133, 112], [124, 132], [110, 143], [100, 145], [90, 143], [76, 132], [67, 112], [66, 88], [78, 66]], 0.5), true);
  wash += washPath(face, SKIN);
  ink += stroke(face, 1.5);
  ink += taper(wobble(r, [[122, 66], [134, 88], [133, 112], [124, 132], [110, 143]], 0.3), 0.6, 0.6, 2.2);
  ink += hatch(r, face, 124, 88, 136, 138, { gap: 3.2, slope: 0.3, w: 0.4, op: 0.6 });
  // Cheeks, rosy from the cough; nose a little red too
  const cheekOp = mood === 'happy' ? 0.55 : 0.38;
  wash += washPath(blob(r, 80, 116, 8, 6, { jitter: 0.1 }), CHEEK, cheekOp) + washPath(blob(r, 120, 116, 8, 6, { jitter: 0.1 }), CHEEK, cheekOp);
  const nose = blob(r, 100, 114, 6.5, 5.5, { jitter: 0.08 });
  wash += washPath(nose, CHEEK, 0.5);
  ink += stroke(smooth(wobble(r, [[99, 96], [97, 106], [95, 112]], 0.2)), 1) + stroke(smooth(wobble(r, [[94, 113], [97, 118], [103, 118], [106, 113]], 0.2)), 1.1);
  ink += stroke(line(r, 96, 116, 97, 117, 0), 1.4) + stroke(line(r, 104, 116, 103, 117, 0), 1.4);

  // Grey curls peeking out under the brim
  for (const [cx, cy] of [[82, 72], [90, 69], [110, 69], [118, 72]]) {
    const c = blob(r, cx, cy, 4.5, 3.6, { n: 8, jitter: 0.15 });
    wash += washPath(c, '#B8B0A4'); ink += stroke(c, 0.9) + stroke(line(r, cx - 1.5, cy - 1, cx + 1.5, cy + 1.2, 1), 0.6);
  }
  // Brim of the kerchief across the forehead (over the curls)
  const brim = smooth(wobble(r, [[62, 80], [76, 62], [100, 54], [124, 62], [138, 80], [128, 72], [112, 66], [100, 65], [88, 66], [72, 72]], 0.3), true);
  wash += washPath(brim, LINEN);
  ink += stroke(brim, 1.4);
  // Knot under the chin
  const knot = blob(r, 100, 156, 6, 4.5, { jitter: 0.15 });
  wash += washPath(knot, LINEN); ink += stroke(knot, 1.2);

  // Eyes and brows by mood
  const eyeL = [87, 98], eyeR = [113, 98];
  if (mood === 'happy') {
    for (const [ex, ey] of [eyeL, eyeR]) {
      ink += taper([[ex - 6, ey + 1], [ex, ey - 3], [ex + 6, ey + 1]], 0.8, 0.8, 2);
      ink += stroke(line(r, ex + (ex < 100 ? -7 : 7), ey + 1, ex + (ex < 100 ? -10 : 10), ey + 4, 0.5), 0.6);
    }
    ink += stroke(smooth([[78, 87], [86, 83], [94, 86]]), 1.6) + stroke(smooth([[106, 86], [114, 83], [122, 87]]), 1.6);
  } else {
    for (const [ex, ey] of [eyeL, eyeR]) {
      const lid = mood === 'worried' ? [[ex - 5, ey], [ex, ey - 3.5], [ex + 5, ey - 0.5]] : [[ex - 5.5, ey], [ex, ey - 3], [ex + 5.5, ey]];
      ink += taper(lid, 0.6, 0.6, 1.8);
      ink += `<circle cx="${ex}" cy="${ey + (mood === 'worried' ? -0.6 : 0.6)}" r="2.1" fill="${INK}" stroke="none"/>`;
      ink += stroke(line(r, ex - 3, ey + 4.5, ex + 3, ey + 4.5, 0.5), 0.55);
      for (let k = 0; k < 2; k++) {
        const s = ex < 100 ? -1 : 1;
        ink += stroke(line(r, ex + s * 7, ey - 1 + k * 3, ex + s * 10.5, ey - 2 + k * 4.5, 0.4), 0.55);
      }
    }
    if (mood === 'worried') ink += stroke(smooth([[78, 90], [86, 86], [93, 83]]), 1.6) + stroke(smooth([[107, 83], [114, 86], [122, 90]]), 1.6);
    else ink += stroke(smooth([[78, 89], [86, 86], [94, 88]]), 1.5) + stroke(smooth([[106, 88], [114, 86], [122, 89]]), 1.5);
  }
  // Smile lines
  ink += stroke(smooth(wobble(r, [[86, 112], [84, 120], [87, 128]], 0.2)), 0.7) + stroke(smooth(wobble(r, [[114, 112], [116, 120], [113, 128]], 0.2)), 0.7);

  // Mouth by mood
  if (mood === 'happy') {
    const m = smooth([[88, 124], [100, 127], [112, 124], [108, 132], [100, 135], [92, 132]], true);
    wash += washPath(m, '#6B3A2E');
    ink += stroke(m, 1.2) + `<rect x="96" y="125.6" width="4" height="3" rx="0.6" fill="${LINEN}" stroke="${INK}" stroke-width="0.5"/>`;
  } else if (mood === 'worried') {
    ink += stroke(smooth([[92, 129], [96, 127], [100, 129], [104, 127], [108, 129]]), 1.3);
    // A little cough puff
    for (const [px, py, pr] of [[124, 132, 3.2], [131, 128, 2.4], [136, 123, 1.6]]) ink += stroke(blob(r, px, py, pr, pr * 0.85, { n: 7, jitter: 0.15 }), 0.8);
  } else {
    ink += stroke(smooth([[90, 125], [100, 129], [110, 125]]), 1.3);
  }
  ink += stroke(line(r, 96, 137, 104, 137, 1), 0.6);

  return art('0 0 200 220', wash, ink, `bust2 mood-${mood}`, `Old Hessa, ${mood}`);
}

// --- brass scale ---------------------------------------------------------------
// Track runs from -5 to +5; x = 170 + v * 24.
export const scale2X = v => 170 + v * 24;

function scaleIcon2(r, k, cx, cy) {
  if (k === 'H') {
    const d = smooth(wobble(r, [[cx, cy + 8], [cx - 6, cy + 2], [cx - 3, cy - 5], [cx - 1, cy - 1], [cx + 1, cy - 9], [cx + 6, cy], [cx + 5, cy + 6]], 0.3), true);
    return { wash: washPath(d, SCALE_C.H) + washPath(blob(r, cx, cy + 4, 2, 3, { n: 6 }), RUBRIC, 0.7), ink: stroke(d, 1.2) };
  }
  if (k === 'S') {
    const d = smooth(wobble(r, [[cx - 8, cy + 6], [cx - 3, cy + 1], [cx - 6, cy - 4], [cx, cy - 8], [cx + 5, cy - 4], [cx + 2, cy + 1], [cx + 8, cy + 5]], 0.3));
    return { wash: '', ink: `<path d="${d}" stroke="${SCALE_C.S}" stroke-width="3"/>` + stroke(d, 0.7) };
  }
  const d = blob(r, cx, cy + 1, 8, 6, { jitter: 0.12 });
  return { wash: washPath(d, SCALE_C.W), ink: stroke(d, 1.2) + hatch(r, d, cx, cy - 6, cx + 9, cy + 8, { gap: 2, w: 0.5 }) };
}

export function scale2SVG(k = 'H', { pointer = 0, target = 3 } = {}) {
  const r = rngFor(900 + k.charCodeAt(0));
  let wash = '', ink = '';

  // Roundel with the scale's own shape
  const ring = blob(r, 20, 40, 15, 15, { jitter: 0.03 });
  wash += washPath(ring, BRASS) + washPath(blob(r, 20, 40, 11, 11, { jitter: 0.03 }), '#EFE2C4');
  ink += stroke(ring, 1.4) + stroke(blob(r, 20, 40, 11, 11, { jitter: 0.03 }), 0.8);
  const ic = scaleIcon2(r, k, 20, 40);
  wash += ic.wash; ink += ic.ink;

  // Beam with end knobs, engraved line and a highlight
  const beam = smooth(wobble(r, [[44, 36], [170, 34.5], [298, 36], [298, 45], [170, 46], [44, 45]], 0.3), true);
  wash += washPath(beam, BRASS);
  wash += `<path d="${line(r, 48, 37.5, 294, 37.5, 0.5)}" stroke="${BRASS_LIGHT}" stroke-width="2" fill="none"/>`;
  ink += stroke(beam, 1.4);
  ink += taper(wobble(r, [[44, 45], [170, 46.2], [298, 45]], 0.2), 0.8, 0.8, 2);
  ink += hatch(r, beam, 44, 41, 298, 46, { gap: 2.2, slope: 0.8, w: 0.5 });
  ink += stroke(line(r, 50, 40, 290, 40, 0.6), 0.5, ' stroke-dasharray="5 3"');
  for (const x of [42, 300]) {
    const knob = blob(r, x, 40.5, 6, 6.5, { jitter: 0.06 });
    wash += washPath(knob, BRASS_DARK); ink += stroke(knob, 1.3);
    ink += `<circle cx="${x - 1.5}" cy="${38.5}" r="1.3" fill="${BRASS_LIGHT}" stroke="none"/>`;
  }
  // Colour groove from the centre to the pointer (helps reading at a glance)
  const pg = scale2X(pointer);
  if (pointer !== 0) ink += `<rect class="groove" stroke="none" x="${Math.min(170, pg)}" y="39" width="${Math.abs(pg - 170)}" height="4" fill="${SCALE_C[k]}" opacity="0.8"/>`;

  // Ticks: tall at 0, medium at ±5, short between
  for (let v = -5; v <= 5; v++) {
    const x = scale2X(v), big = v === 0, mid = Math.abs(v) === 5;
    ink += taper([[x, big ? 18 : mid ? 23 : 27], [x, 34]], big ? 2.4 : 1.6, 0.8);
  }
  ink += stroke(blob(r, 170, 15, 3, 3, { jitter: 0.1 }), 1.1);

  // Pivot and little stand
  const piv = smooth(wobble(r, [[160, 56], [170, 46], [180, 56]], 0.3), true);
  wash += washPath(piv, BRASS_DARK); ink += stroke(piv, 1.2);
  ink += stroke(line(r, 154, 57, 186, 57, 0.5), 1.6);

  // Target mark (gold diamond) and the pointer (a brass plumb hanging under the beam)
  const tx = scale2X(target);
  ink += `<g class="target2"><path d="M${tx} 6 L${tx + 6} 13 L${tx} 20 L${tx - 6} 13 Z" fill="${GOLD}" stroke="${INK}" stroke-width="1.2"/><path d="M${tx} 9 L${tx} 17" stroke="${BRASS_LIGHT}" stroke-width="0.8"/></g>`;
  ink += `<g class="pointer2" data-k="${k}" style="transform:translateX(${pg - 170}px)">`
    + `<path d="M170 48 L164 64 Q170 72 176 64 Z" fill="${BRASS_DARK}" stroke="${INK}" stroke-width="1.4"/>`
    + `<path d="M168 56 L166 63" stroke="${BRASS_LIGHT}" stroke-width="1"/>`
    + `<circle cx="170" cy="48.5" r="2.2" fill="${BRASS}" stroke="${INK}" stroke-width="1"/></g>`;

  const name = { H: 'Heat', S: 'Spirit', W: 'Weight' }[k];
  return art('0 0 320 76', wash, ink, 'scale2', `${name} scale`);
}
