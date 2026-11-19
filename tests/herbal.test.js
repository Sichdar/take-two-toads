import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solve, isKnown, fullyKnown, newlyKnown } from '../logic/herbal.js';
import { mix, countIds } from '../logic/brew.js';
import { INGREDIENT_BY_ID } from '../data/ingredients.js';

const rec = ids => {
  const { result, clamped } = mix(ids, INGREDIENT_BY_ID);
  return { counts: countIds(ids), result, clamped };
};

test('one ingredient alone reveals its exact values on all scales', () => {
  const k = solve([rec(['leadroot'])]);
  assert.deepEqual(k.exact.leadroot, { H: 0, S: -1, W: 2 });
  assert.ok(fullyKnown(k, 'leadroot'));
});

test('two unknowns together give only a sum', () => {
  const k = solve([rec(['emberroot', 'sunpetal'])]);
  assert.ok(!isKnown(k, 'emberroot', 'H'));
  const s = k.sums.find(x => x.scale === 'H');
  assert.deepEqual([s.a, s.b].sort(), ['emberroot', 'sunpetal']);
  assert.equal(s.value, 3);
});

test('a known ingredient separates a pair', () => {
  const k = solve([rec(['emberroot', 'sunpetal']), rec(['emberroot'])]);
  assert.equal(k.exact.sunpetal.H, 1);
  assert.equal(k.exact.emberroot.H, 2);
});

test('repeats count: 2 × x = reading', () => {
  const k = solve([rec(['stonecap', 'stonecap'])]);
  assert.equal(k.exact.stonecap.W, 2);
});

test('a clamped reading is not used for that scale', () => {
  // 3 Emberroot = raw +6, shown as +5. Must NOT conclude Emberroot = 5/3.
  const k = solve([rec(['emberroot', 'emberroot', 'emberroot'])]);
  assert.ok(!isKnown(k, 'emberroot', 'H'));
  // The other scales are still fine (0 each).
  assert.equal(k.exact.emberroot.S, 0);
});

test('three unknowns, three brews: all solved', () => {
  const k = solve([rec(['sunpetal', 'moonmoss']), rec(['sunpetal', 'dragonpepper']), rec(['moonmoss', 'dragonpepper'])]);
  assert.equal(k.exact.sunpetal.H, 1);
  assert.equal(k.exact.moonmoss.H, -1);
  assert.equal(k.exact.dragonpepper.H, 3);
  assert.equal(k.exact.dragonpepper.S, 1);
});

test('newlyKnown lists only what changed', () => {
  const a = solve([rec(['emberroot'])]);
  const b = solve([rec(['emberroot']), rec(['lullwort'])]);
  const n = newlyKnown(a, b);
  assert.ok(n.every(x => x.id === 'lullwort'));
  assert.equal(n.length, 3);
});
