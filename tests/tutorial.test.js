import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../logic/state.js';
import { visibleScales, ingredientShown, tutorialDay } from '../logic/tutorial.js';
import { AILMENT_BY_ID } from '../data/ailments.js';
import { INGREDIENTS } from '../data/ingredients.js';
import { TUTORIAL } from '../data/tutorial.js';

// Brew the right single herb when there is one, otherwise the first shown herb.
function serveAll(s, wrong = new Set()) {
  s = G.openShop(s);
  while (s.phase !== 'evening') {
    const cust = G.currentCustomer(s);
    const target = AILMENT_BY_ID[cust.ailment].target;
    const shown = Object.keys(s.shelf).filter(id => ingredientShown(s, id));
    const right = shown.find(id => {
      const v = INGREDIENTS.find(i => i.id === id).values;
      return Object.keys(target).every(k => v[k] === target[k]);
    });
    const pick = wrong.has(cust.ailment) ? shown.find(id => id !== right) : right || shown[0];
    s = G.addToCauldron(s, pick).state;
    s = G.nextCustomer(G.brew(s));
  }
  return s;
}

test('tutorial day 1: Heat only, Hessa then Sir Pellam, both needs known', () => {
  const s = G.newGame(42, { tutorial: true });
  assert.deepEqual(visibleScales(s), ['H']);
  assert.deepEqual(s.queue.map(c => c.ailment), ['chillcough', 'kettlehead']);
  assert.ok(s.ailmentsSeen.kettlehead.full);
  const shown = Object.keys(s.shelf).filter(id => ingredientShown(s, id)).sort();
  assert.deepEqual(shown, ['emberroot', 'frostmint']);
});

test('tutorial: one new scale per day, every visitor fits the scales shown', () => {
  for (const seed of [1, 2, 3, 99, 2026]) {
    let s = G.newGame(seed, { tutorial: true });
    for (let day = 1; day <= 4; day++) {
      const shown = visibleScales(s);
      assert.equal(shown.length, Math.min(day, 3), `seed ${seed} day ${day}`);
      for (const c of s.queue) {
        for (const k of Object.keys(AILMENT_BY_ID[c.ailment].target)) assert.ok(shown.includes(k), `${c.ailment} on day ${day}`);
      }
      assert.ok(s.queue.length >= 2 && s.queue.length <= 5);
      s = G.sleep(serveAll(s));
    }
  }
});

test('tutorial day 3 starts with the floating bread and fills up to 5', () => {
  let s = G.newGame(7, { tutorial: true });
  s = G.sleep(serveAll(s));
  s = G.sleep(serveAll(s));
  assert.equal(s.day, 3);
  assert.equal(s.queue[0].ailment, 'floatingbread');
  assert.equal(s.queue.length, 5);
  assert.equal(tutorialDay(s, 4), null);
});

test("tutorial: yesterday's flop comes back first the next day", () => {
  let s = G.newGame(5, { tutorial: true });
  s = serveAll(s, new Set(['kettlehead']));
  assert.ok(s.returning.includes('kettlehead'));
  s = G.sleep(s);
  assert.equal(s.queue[0].ailment, 'kettlehead');
  assert.ok(s.queue[0].returning);
});

test('tutorial off (and old saves without the flag) play exactly as before', () => {
  const s = G.newGame(42);
  assert.equal(s.tutorial, false);
  assert.equal(s.queue.length, 5);
  assert.deepEqual(visibleScales(s), ['H', 'S', 'W']);
  const old = { ...s }; delete old.tutorial;
  assert.equal(tutorialDay(old), null);
  assert.ok(Object.keys(TUTORIAL).length === 3);
});
