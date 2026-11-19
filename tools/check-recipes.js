// Brute-force check: does every ailment have a 3-star recipe (0 off) with <= 4 ingredients
// from the ingredients unlocked by then? Repeats allowed. Reads the game's real data files.
// Run: node tools/check-recipes.js
import { INGREDIENTS } from '../data/ingredients.js';
import { AILMENTS } from '../data/ailments.js';
import { mix } from '../logic/brew.js';
import { offBy } from '../logic/quality.js';

const byId = Object.fromEntries(INGREDIENTS.map(i => [i.id, i]));

function combos(pool, max) {
  const out = [];
  const rec = (start, cur) => {
    if (cur.length) out.push(cur.slice());
    if (cur.length === max) return;
    for (let i = start; i < pool.length; i++) { cur.push(pool[i]); rec(i, cur); cur.pop(); }
  };
  rec(0, []);
  return out;
}

let allOk = true;
for (const a of AILMENTS) {
  const pool = INGREDIENTS.filter(i => i.level <= a.level).map(i => i.id);
  let best = null, perfect = 0, minN = 99, example = null;
  for (const c of combos(pool, 4)) {
    const off = offBy(mix(c, byId).result, a.target);
    if (best === null || off < best) best = off;
    if (off === 0) { perfect++; if (c.length < minN) { minN = c.length; example = c.join(' + '); } }
  }
  if (best !== 0) allOk = false;
  console.log(`${a.id.padEnd(14)} L${a.level} target ${JSON.stringify(a.target).padEnd(24)} perfect=${String(perfect).padEnd(3)} fewest=${minN === 99 ? '-' : minN}  e.g. ${example || '-'}`);
}
console.log(allOk ? 'ALL OK: every ailment has a 3-star recipe' : 'PROBLEM: some ailment has no 3-star recipe');
process.exitCode = allOk ? 0 : 1;
