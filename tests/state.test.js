import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../logic/state.js';
import { saveGame, loadGame, exportCode, importCode, SAVE_KEY } from '../logic/save.js';
import { BALANCE } from '../data/balance.js';

function memoryStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
}

function playDay(s, pickIds) {
  s = G.openShop(s);
  while (s.phase !== 'evening') {
    for (const id of pickIds(s)) s = G.addToCauldron(s, id).state;
    s = s.cauldron.length ? G.brew(s) : G.sendAway(s);
    s = G.nextCustomer(s);
  }
  return s;
}

test('a full day runs: morning → 5 customers → evening → next morning', () => {
  let s = G.newGame(123);
  assert.equal(s.phase, 'morning');
  assert.equal(s.queue.length, 5);
  const startCoins = s.coins;
  s = playDay(s, st => [Object.keys(st.shelf)[0]]);
  assert.equal(s.phase, 'evening');
  assert.ok(s.coins >= startCoins);
  s = G.sleep(s);
  assert.equal(s.day, 2);
  assert.equal(s.phase, 'morning');
});

test('the old state is never changed', () => {
  const s = G.openShop(G.newGame(5));
  const before = JSON.stringify(s);
  G.addToCauldron(s, 'emberroot');
  assert.equal(JSON.stringify(s), before);
});

test('cauldron holds 4, the 5th is refused; removing puts it back', () => {
  let s = G.openShop(G.newGame(5));
  for (const id of ['emberroot', 'emberroot', 'lullwort', 'stonecap']) s = G.addToCauldron(s, id).state;
  assert.equal(G.addToCauldron(s, 'stonecap').error, 'full');
  const shelfBefore = s.shelf.emberroot;
  s = G.removeFromCauldron(s, 0);
  assert.equal(s.shelf.emberroot, shelfBefore + 1);
  assert.equal(s.cauldron.length, 3);
});

test('a perfect brew pays base + tip and inks the ingredient', () => {
  let s = G.openShop(G.newGame(5)); // day 1, customer 1 = Hessa, Heat +2
  s = G.addToCauldron(s, 'emberroot').state;
  s = G.brew(s);
  assert.equal(s.lastResult.stars, 3);
  assert.equal(s.coins, BALANCE.startCoins + 11);
  assert.ok(s.lastResult.discoveries.some(d => d.id === 'emberroot' && d.scale === 'H' && d.value === 2));
  assert.ok(s.ailmentsSeen.chillcough.full);
});

test('a flop pays nothing and the customer returns tomorrow', () => {
  let s = G.openShop(G.newGame(5));
  s = G.addToCauldron(s, 'frostmint').state; // H −2 for a Heat +2 ailment
  s = G.brew(s);
  assert.equal(s.lastResult.stars, 0);
  assert.equal(s.coins, BALANCE.startCoins);
  assert.ok(s.returning.includes('chillcough'));
  assert.deepEqual(s.lastResult.clue, { scale: 'H', dir: 'low' });
});

test('purchases can be undone the same evening', () => {
  let s = playDay(G.newGame(5), st => [Object.keys(st.shelf)[0]]);
  s = { ...s, coins: 50 };
  s = G.buy(s, 'frostmint').state;
  s = G.buyUpgrade(s, 'bed4').state;
  assert.equal(s.coins, 50 - 2 - 40);
  assert.equal(s.beds.length, 4);
  s = G.refund(s, 1);
  s = G.refund(s, 0);
  assert.equal(s.coins, 50);
  assert.equal(s.beds.length, 3);
  assert.equal(G.buy(s, 'leadroot').error, 'locked'); // level 2 item at level 1
});

test('level up unlocks new stock that Wren brings next morning', () => {
  let s = playDay(G.newGame(5), st => [Object.keys(st.shelf)[0]]);
  s = { ...s, rep: 29, phase: 'result', current: 4, queue: s.queue, lastResult: {} };
  s = { ...s, rep: 30 };
  s = G.nextCustomer(s);
  assert.equal(s.level, 2);
  assert.equal(s.levelUp, 2);
  s = G.sleep(s);
  assert.ok(s.shelf.leadroot >= 1 && s.shelf.sunpetal >= 1 && s.shelf.moonmoss >= 1);
});

test('Wren gives a bundle when the shelf is nearly empty', () => {
  let s = G.newGame(5);
  s = { ...s, shelf: { emberroot: 1 }, beds: [], phase: 'evening' };
  s = G.sleep(s);
  assert.ok(G.shelfTotal(s) >= 1 + BALANCE.wrenBundle);
});

test('save, load, backup slot and export code', () => {
  const st = memoryStorage();
  const s1 = G.newGame(77);
  saveGame(st, s1);
  const s2 = G.sleep({ ...s1, phase: 'evening' });
  saveGame(st, s2);
  assert.equal(loadGame(st).day, 2);
  st.setItem(SAVE_KEY, '{broken');
  assert.equal(loadGame(st).day, 1); // falls back to the backup
  const code = exportCode(s2);
  assert.equal(importCode(code).day, 2);
  assert.equal(importCode(code.slice(0, -1) + 'x'), null); // mistyped code is caught
  assert.equal(importCode('hello'), null);
});

test('level 3 starts at 70 reputation (self-review fix)', () => {
  assert.equal(G.levelFor(69), 2);
  assert.equal(G.levelFor(70), 3);
});

test('each finished day is kept for the playtest log, with its length', async () => {
  const { playtestLog } = await import('../logic/playtest.js');
  let s = G.openShop(G.newGame(77), 1_000_000);
  while (s.phase !== 'evening') {
    s = G.addToCauldron(s, Object.keys(s.shelf)[0]).state;
    s = G.brew(s);
    s = G.nextCustomer(s, 1_000_000 + 5 * 60_000);
  }
  assert.equal(s.history.length, 1);
  const h = s.history[0];
  assert.equal(h.day, 1);
  assert.equal(h.minutes, 5);
  assert.equal(h.coins, s.coins);
  assert.equal(h.perfect + h.ok + h.flops, 5);
  const text = playtestLog(s, { version: 'test', date: new Date('2026-11-21T12:00:00Z') });
  assert.match(text, /^Take Two Toads playtest log · vtest · 2026-11-21/);
  assert.match(text, /Day 1: 5 min · earned \d+, coins at end \d+/);
  assert.match(text, /All brews: 5, stars per brew/);
});

test('the playtest log works on an old save without history', async () => {
  const { playtestLog } = await import('../logic/playtest.js');
  const s = G.newGame(3);
  delete s.history;
  assert.match(playtestLog(s), /No finished days yet\./);
});
