// Scales, cauldron, villager busts, small icons and the paper texture.
import { rngFor, smooth, wobble, blob, line, svg, INK, GOLD } from './ink.js';
import { VILLAGERS } from '../../data/villagers.js';

// --- the brass scale ---------------------------------------------------------
// Track runs from -5 (x=20) to +5 (x=260); 24 units per step.
export const scaleX = v => 140 + v * 24;

export function scaleSVG(k) {
  const r = rngFor(k.charCodeAt(0) * 31);
  let ink = '';
  let wash = '';
  // Brass beam
  const beam = smooth(wobble(r, [[14, 30], [140, 28], [266, 30], [266, 36], [140, 35], [14, 36]], 0.5), true);
  wash += `<path d="${beam}" fill="#C8A04A"/>`;
  ink += `<path d="${beam}" stroke-width="1.4"/>`;
  for (let v = -5; v <= 5; v++) {
    const x = scaleX(v), big = v === 0;
    ink += `<path d="${line(r, x, big ? 18 : 23, x, 29, 0)}" stroke-width="${big ? 1.8 : 1}"/>`;
  }
  // Central pivot
  const piv = smooth(wobble(r, [[132, 44], [140, 36], [148, 44]], 0.4), true);
  wash += `<path d="${piv}" fill="#C8A04A"/>`;
  ink += `<path d="${piv}" stroke-width="1.2"/>`;
  return `<svg class="scale-svg" viewBox="0 0 280 48" aria-hidden="true">`
    + `<g class="wash" transform="translate(1 1)">${wash}</g>`
    + `<g fill="none" stroke="${INK}" stroke-linecap="round">${ink}</g>`
    + `<g class="target" data-k="${k}" style="transform:translateX(${scaleX(0)}px)"><path d="M0 4 L6 11 L0 18 L-6 11 Z" fill="${GOLD}" stroke="${INK}" stroke-width="1.2"/></g>`
    + `<g class="pointer" data-k="${k}" style="transform:translateX(${scaleX(0)}px)">`
    + `<path d="M0 20 L-5 34 Q0 40 5 34 Z" fill="#8A6A2A" stroke="${INK}" stroke-width="1.4"/>`
    + `<text class="ptr-q" x="0" y="47" text-anchor="middle">?</text></g>`
    + `</svg>`;
}

// Small icons for the three scales (each has its own shape, not only colour).
export function scaleIcon(k) {
  const r = rngFor(k.charCodeAt(0));
  if (k === 'H') {
    const d = smooth(wobble(r, [[12, 22], [6, 14], [10, 6], [12, 10], [15, 2], [19, 12], [18, 22]], 0.3), true);
    return svg('0 0 24 24', `<path d="${d}" fill="#C9962E"/>`, `<path d="${d}" stroke-width="1.3"/>`, 'icon');
  }
  if (k === 'S') {
    const d = smooth(wobble(r, [[4, 18], [9, 12], [6, 7], [11, 3], [16, 6], [14, 11], [19, 15]], 0.3));
    return svg('0 0 24 24', '', `<path d="${d}" stroke="#3F5A7A" stroke-width="2.2"/><path d="${d}" stroke-width="0.6"/>`, 'icon');
  }
  const d = blob(r, 12, 14, 9, 7, { jitter: 0.12 });
  return svg('0 0 24 24', `<path d="${d}" fill="#6B4A2E"/>`, `<path d="${d}" stroke-width="1.3"/>`, 'icon');
}

// --- the cauldron -------------------------------------------------------------
export function cauldronSVG() {
  const r = rngFor(777);
  const pot = smooth(wobble(r, [[18, 26], [82, 26], [88, 46], [78, 66], [50, 72], [22, 66], [12, 46]], 0.8), true);
  const rim = blob(r, 50, 26, 34, 6, { jitter: 0.04 });
  const brew = blob(r, 50, 27, 28, 3.6, { jitter: 0.06 });
  const wash = `<path d="${pot}" fill="#4A3A30"/><path d="${rim}" fill="#6B5A4E"/><path class="brew-liquid" d="${brew}" fill="#7E9A5E"/>`;
  let ink = `<path d="${pot}" stroke-width="2"/><path d="${rim}" stroke-width="1.6"/>`;
  for (let i = 0; i < 5; i++) ink += `<path d="${line(r, 30 + i * 9, 40, 26 + i * 10, 62, 2)}" stroke-width="0.7" opacity="0.7"/>`;
  ink += `<path d="${line(r, 30, 70, 24, 80, 1)}" stroke-width="2"/><path d="${line(r, 70, 70, 76, 80, 1)}" stroke-width="2"/>`;
  return svg('0 0 100 82', wash, ink, 'cauldron-svg');
}

// --- villager bust (prototype: simple woodcut-ish shapes) ---------------------
export function bustSVG(id) {
  const v = VILLAGERS[id] || VILLAGERS.hobb;
  const r = rngFor(id.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0);
  if (id === 'goose') {
    const body = blob(r, 50, 70, 30, 20, { jitter: 0.08 });
    const neck = smooth(wobble(r, [[62, 60], [64, 36], [58, 22], [66, 16], [74, 24], [70, 40], [72, 62]], 0.6), true);
    return svg('0 0 100 100', `<path d="${body}" fill="${v.coat}"/><path d="${neck}" fill="${v.coat}"/>`,
      `<path d="${body}" stroke-width="1.8"/><path d="${neck}" stroke-width="1.8"/><path d="M74 20 L86 23 L74 26" fill="#C9962E" stroke-width="1.2"/><circle cx="68" cy="20" r="1.4" fill="${INK}"/>`, 'bust');
  }
  const shoulders = smooth(wobble(r, [[12, 100], [18, 76], [34, 66], [50, 64], [66, 66], [82, 76], [88, 100]], 1), true);
  const head = blob(r, 50, 42, 15, 18, { jitter: 0.05 });
  const hair = smooth(wobble(r, [[34, 40], [36, 26], [50, 20], [64, 26], [66, 40], [60, 32], [50, 30], [40, 32]], 0.8), true);
  let wash = `<path d="${shoulders}" fill="${v.coat}"/><path d="${head}" fill="${v.skin}"/><path d="${hair}" fill="${v.hair}"/>`;
  let ink = `<path d="${shoulders}" stroke-width="1.8"/><path d="${head}" stroke-width="1.8"/><path d="${hair}" stroke-width="1.4"/>`;
  ink += `<circle cx="44" cy="42" r="1.4" fill="${INK}"/><circle cx="56" cy="42" r="1.4" fill="${INK}"/>`;
  ink += `<path d="${line(r, 45, 52, 55, 52, 2)}" stroke-width="1.2"/><path d="${line(r, 50, 44, 49, 48, 0)}" stroke-width="1"/>`;
  if (v.hat === 'cap') {
    const cap = blob(r, 50, 24, 18, 9, { jitter: 0.1 });
    wash += `<path d="${cap}" fill="#F3EBDD"/>`; ink += `<path d="${cap}" stroke-width="1.4"/>`;
  } else if (v.hat === 'helm') {
    const helm = smooth(wobble(r, [[33, 40], [34, 22], [50, 14], [66, 22], [67, 40], [60, 34], [40, 34]], 0.6), true);
    wash += `<path d="${helm}" fill="#9AA0A8"/>`; ink += `<path d="${helm}" stroke-width="1.6"/><path d="${line(r, 50, 14, 50, 34, 0)}" stroke-width="1"/>`;
  } else if (v.hat === 'chain') {
    ink += `<path d="${smooth(wobble(r, [[34, 68], [42, 80], [50, 84], [58, 80], [66, 68]], 0.5))}" stroke="${GOLD}" stroke-width="3" stroke-dasharray="3 2"/>`;
  } else if (v.hat === 'hood' || v.hat === 'shawl') {
    const hood = smooth(wobble(r, [[30, 62], [30, 34], [40, 20], [50, 17], [60, 20], [70, 34], [70, 62], [64, 50], [64, 34], [50, 26], [36, 34], [36, 50]], 0.6), true);
    wash += `<path d="${hood}" fill="${v.coat}"/>`; ink += `<path d="${hood}" stroke-width="1.5"/>`;
  } else if (v.hat === 'bonnet') {
    const bon = smooth(wobble(r, [[30, 46], [32, 26], [50, 16], [68, 26], [70, 46], [64, 34], [50, 28], [36, 34]], 0.6), true);
    wash += `<path d="${bon}" fill="#F3EBDD"/>`; ink += `<path d="${bon}" stroke-width="1.4"/>`;
  }
  return svg('0 0 100 100', wash, ink, 'bust');
}

// --- little icons ------------------------------------------------------------
export function coinSVG() {
  const r = rngFor(5);
  const c = blob(r, 12, 12, 9, 9, { jitter: 0.04 });
  return svg('0 0 24 24', `<path d="${c}" fill="#C9962E"/>`, `<path d="${c}" stroke-width="1.4"/><path d="${blob(r, 12, 12, 5, 5, { jitter: 0.05 })}" stroke-width="0.8"/>`, 'icon');
}

export function bookSVG() {
  const r = rngFor(9);
  const b = smooth(wobble(r, [[4, 5], [12, 7], [20, 5], [20, 19], [12, 21], [4, 19]], 0.3), true);
  return svg('0 0 24 24', `<path d="${b}" fill="#A8322A"/>`, `<path d="${b}" stroke-width="1.4"/><path d="M12 7 L12 21" stroke-width="1.2"/>`, 'icon');
}

export function gearSVG() {
  const r = rngFor(13);
  return svg('0 0 24 24', '', `<path d="${blob(r, 12, 12, 7, 7, { n: 16, jitter: 0.18 })}" stroke-width="1.6"/><circle cx="12" cy="12" r="2.6" stroke-width="1.4"/>`, 'icon');
}

export function starStamp(stars) {
  let out = '';
  for (let i = 0; i < 3; i++) out += `<span class="star ${i < stars ? 'on' : ''}">★</span>`;
  return out;
}

// --- paper: painted once into a canvas, then reused as a background image ----
export function makePaper() {
  try {
    const size = 256;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#EFE2C4';
    ctx.fillRect(0, 0, size, size);
    const img = ctx.getImageData(0, 0, size, size);
    const r = rngFor(2024);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (r() - 0.5) * 14;
      img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n * 0.8;
    }
    ctx.putImageData(img, 0, 0);
    for (let i = 0; i < 7; i++) {
      const x = r() * size, y = r() * size, rad = 2 + r() * 7;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, 'rgba(150,100,50,0.16)'); g.addColorStop(1, 'rgba(150,100,50,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(120,90,50,0.07)';
    for (let i = 0; i < 40; i++) {
      const x = r() * size, y = r() * size;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 30, y + (r() - 0.5) * 6); ctx.stroke();
    }
    document.documentElement.style.setProperty('--paper', `url(${cv.toDataURL('image/png')})`);
  } catch { /* plain colour fallback stays */ }
}
