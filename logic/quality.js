// Quality, price and the customer's clue (Phase 2 and Phase 5 rules).
import { BALANCE } from '../data/balance.js';
import { SCALES } from './brew.js';

export function targetScales(target) {
  return SCALES.filter(k => target[k] !== undefined);
}

// Distance from the target, added up over the targeted scales only.
export function offBy(result, target) {
  return targetScales(target).reduce((s, k) => s + Math.abs(result[k] - target[k]), 0);
}

// 3, 2, 1 stars, or 0 = flop.
export function starsFor(off) {
  return off < BALANCE.starsByOff.length ? BALANCE.starsByOff[off] : 0;
}

export function basePrice(target) {
  return BALANCE.priceBase + BALANCE.pricePerScale * targetScales(target).length;
}

// Returns { coins, tip }.
export function payment(target, stars) {
  const base = basePrice(target);
  if (stars === 3) {
    const tip = Math.round(base * BALANCE.tipShare);
    return { coins: base + tip, tip };
  }
  if (stars === 2) return { coins: base, tip: 0 };
  if (stars === 1) return { coins: Math.floor(base / 2), tip: 0 };
  return { coins: 0, tip: 0 };
}

// The scale that is furthest off, and whether the brew was too low or too high there.
// null when the brew was perfect.
export function clue(result, target) {
  let best = null;
  for (const k of targetScales(target)) {
    const d = result[k] - target[k];
    if (d === 0) continue;
    if (!best || Math.abs(d) > Math.abs(best.d)) best = { scale: k, d };
  }
  return best ? { scale: best.scale, dir: best.d < 0 ? 'low' : 'high' } : null;
}

export function score(result, target) {
  const off = offBy(result, target);
  const stars = starsFor(off);
  return { off, stars, flop: stars === 0, ...payment(target, stars), clue: clue(result, target) };
}
