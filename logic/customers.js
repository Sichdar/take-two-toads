// Picks the day's visitors (Phase 5): yesterday's flops first, then unlocked ailments,
// newer ones more likely, never the same ailment twice in one day.
import { AILMENTS } from '../data/ailments.js';
import { BALANCE } from '../data/balance.js';
import { makeRng, hashSeed, pickWeighted } from './rng.js';

export function unlockedAilments(level) {
  return AILMENTS.filter(a => !a.story && a.level <= level);
}

// Returns [{ ailment, villager, returning }]
export function pickDay({ seed, day, level, returning = [] }) {
  const rng = makeRng(hashSeed(seed, day, 7));
  const n = BALANCE.customersPerDay;
  const pool = unlockedAilments(level);
  const used = new Set();
  const queue = [];

  // Day 1 always starts with Old Hessa's chill-cough (the first lesson).
  if (day === 1) {
    queue.push({ ailment: 'chillcough', villager: 'hessa', returning: false });
    used.add('chillcough');
  }
  for (const id of returning) {
    if (queue.length >= n || used.has(id)) continue;
    const a = pool.find(x => x.id === id);
    if (!a) continue;
    queue.push({ ailment: a.id, villager: a.villager, returning: true });
    used.add(a.id);
  }
  while (queue.length < n) {
    const left = pool.filter(a => !used.has(a.id));
    if (!left.length) break;
    const a = pickWeighted(rng, left, x => (x.level === level ? BALANCE.newerAilmentWeight : 1));
    queue.push({ ailment: a.id, villager: a.villager, returning: false });
    used.add(a.id);
  }
  return queue;
}
