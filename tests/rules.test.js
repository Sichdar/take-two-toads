import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INGREDIENT_BY_ID } from '../data/ingredients.js';
import { AILMENT_BY_ID } from '../data/ailments.js';
import { mix } from '../logic/brew.js';
import { score, offBy, payment } from '../logic/quality.js';
import { pickDay } from '../logic/customers.js';
import { makeRng } from '../logic/rng.js';

test('mix adds values and clamps at ±5', () => {
  const m = mix(['emberroot', 'emberroot', 'emberroot'], INGREDIENT_BY_ID);
  assert.equal(m.raw.H, 6);
  assert.equal(m.result.H, 5);
  assert.equal(m.clamped.H, true);
  assert.equal(m.clamped.S, false);
  const two = mix(['leadroot', 'sunpetal'], INGREDIENT_BY_ID);
  assert.deepEqual(two.result, { H: 1, S: 0, W: 2 });
});

test('quality bands: 0 off = 3 stars, 1 = 2, 2 = 1, 3+ = flop', () => {
  const tgt = AILMENT_BY_ID.chillcough.target; // H +2
  assert.equal(score({ H: 2, S: 4, W: -3 }, tgt).stars, 3); // untargeted scales don't count
  assert.equal(score({ H: 1, S: 0, W: 0 }, tgt).stars, 2);
  assert.equal(score({ H: 0, S: 0, W: 0 }, tgt).stars, 1);
  assert.equal(score({ H: -1, S: 0, W: 0 }, tgt).flop, true);
  assert.equal(offBy({ H: 3, S: -1, W: -2 }, AILMENT_BY_ID.blueness.target), 1);
});

test('prices: 7 / 10 / 13 base, tip on 3 stars, half on 1 star', () => {
  assert.deepEqual(payment({ H: 2 }, 3), { coins: 11, tip: 4 });
  assert.deepEqual(payment({ H: 2 }, 2), { coins: 7, tip: 0 });
  assert.deepEqual(payment({ H: 2 }, 1), { coins: 3, tip: 0 });
  assert.deepEqual(payment({ H: 2, W: -2 }, 2), { coins: 10, tip: 0 });
  assert.deepEqual(payment({ H: 3, S: -2, W: -3 }, 0), { coins: 0, tip: 0 });
});

test('clue names the furthest-off scale and the direction', () => {
  const r = score({ H: 2, S: 0, W: 0 }, AILMENT_BY_ID.blueness.target);
  assert.deepEqual(r.clue, { scale: 'W', dir: 'high' });
  assert.equal(score({ H: 2, S: 0, W: 0 }, { H: 2 }).clue, null);
});

test('rng is repeatable', () => {
  const a = makeRng(42), b = makeRng(42);
  for (let i = 0; i < 5; i++) assert.equal(a(), b());
});

test('pickDay: 5 different ailments, Hessa first on day 1, returning first', () => {
  const d1 = pickDay({ seed: 1, day: 1, level: 1 });
  assert.equal(d1.length, 5);
  assert.equal(d1[0].villager, 'hessa');
  assert.equal(new Set(d1.map(c => c.ailment)).size, 5);
  const d2 = pickDay({ seed: 1, day: 2, level: 2, returning: ['gloom'] });
  assert.equal(d2[0].ailment, 'gloom');
  assert.equal(d2[0].returning, true);
  assert.equal(new Set(d2.map(c => c.ailment)).size, 5);
  assert.deepEqual(pickDay({ seed: 9, day: 4, level: 2 }), pickDay({ seed: 9, day: 4, level: 2 }));
  assert.ok(!d2.some(c => c.ailment === 'finale'));
});
