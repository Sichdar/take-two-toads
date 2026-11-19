// Brewing: add up the ingredient values on each scale and clamp to the scale's stops.
import { BALANCE } from '../data/balance.js';

export const SCALES = ['H', 'S', 'W'];

export const clamp = v => Math.max(BALANCE.scaleMin, Math.min(BALANCE.scaleMax, v));

// ids: array of ingredient ids (repeats allowed). byId: id -> ingredient.
// Returns { raw, result, clamped } where clamped[k] is true if scale k hit a stop.
export function mix(ids, byId) {
  const raw = { H: 0, S: 0, W: 0 };
  for (const id of ids) {
    const ing = byId[id];
    if (!ing) throw new Error(`Unknown ingredient: ${id}`);
    for (const k of SCALES) raw[k] += ing.values[k] || 0;
  }
  const result = {};
  const clamped = {};
  for (const k of SCALES) {
    result[k] = clamp(raw[k]);
    clamped[k] = raw[k] !== result[k];
  }
  return { raw, result, clamped };
}

export function countIds(ids) {
  const counts = {};
  for (const id of ids) counts[id] = (counts[id] || 0) + 1;
  return counts;
}
