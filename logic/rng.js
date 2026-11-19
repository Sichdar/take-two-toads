// Seeded random numbers (mulberry32), so a day always plays the same after reloading.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Mixes several numbers into one seed (for "the seed of day N of this game").
export function hashSeed(...nums) {
  let h = 2166136261 >>> 0;
  for (const n of nums) {
    h ^= (n >>> 0);
    h = Math.imul(h, 16777619) >>> 0;
    h ^= h >>> 13;
  }
  return h >>> 0;
}

export function pickWeighted(rng, items, weightOf) {
  const total = items.reduce((s, it) => s + weightOf(it), 0);
  let r = rng() * total;
  for (const it of items) {
    r -= weightOf(it);
    if (r < 0) return it;
  }
  return items[items.length - 1];
}

export function randomSeed() {
  return (Math.floor(Math.random() * 4294967296)) >>> 0;
}
