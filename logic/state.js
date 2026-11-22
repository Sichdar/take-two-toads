// The game rules as functions: each takes the state and returns a new state (the old one is
// never changed). The UI calls these; it never edits the state itself.
import { BALANCE } from '../data/balance.js';
import { INGREDIENTS, INGREDIENT_BY_ID } from '../data/ingredients.js';
import { AILMENT_BY_ID } from '../data/ailments.js';
import { mix, countIds } from './brew.js';
import { score } from './quality.js';
import { solve, newlyKnown } from './herbal.js';
import { pickDay } from './customers.js';
import { tutorialDay } from './tutorial.js';
import { TUTORIAL_KNOWN } from '../data/tutorial.js';
import { makeRng, hashSeed } from './rng.js';

export const SAVE_VERSION = 1;

const clone = s => structuredClone(s);

export function levelFor(rep) {
  let lvl = 1;
  BALANCE.levels.forEach((need, i) => { if (rep >= need) lvl = i + 1; });
  return lvl;
}

export function unlockedIngredients(level) {
  return INGREDIENTS.filter(i => i.source !== 'story' && i.level <= level);
}

export function shelfTotal(state) {
  return Object.values(state.shelf).reduce((a, b) => a + b, 0);
}

export function slots(state) {
  return state.upgrades.slot5 ? 5 : BALANCE.cauldronSlots;
}

// tutorial: true starts with one scale on day 1, a second on day 2, all three on day 3.
export function newGame(seed, { tutorial = false } = {}) {
  const s = {
    saveVersion: SAVE_VERSION,
    seed: seed >>> 0,
    tutorial: !!tutorial,
    day: 1,
    phase: 'morning',
    coins: BALANCE.startCoins,
    rep: 0,
    level: 1,
    shelf: { ...BALANCE.startShelf },
    beds: [...BALANCE.startBeds],
    upgrades: {},
    queue: [],
    current: 0,
    cauldron: [],
    records: [],
    history: [],   // one line per finished day, for the playtest log
    // The first lesson tells you Hessa's need, so its gold mark shows from the start.
    ailmentsSeen: { chillcough: { full: true, clues: [] } },
    returning: [],
    dayLog: null,
    lastResult: null,
    morningReport: null,
    bought: [],
    levelUp: null,
    wrenNew: [],
    notesSeen: {},
    settings: { textSize: 'M', reducedMotion: false },
  };
  if (tutorial) for (const id of TUTORIAL_KNOWN) s.ailmentsSeen[id] = { full: true, clues: [] };
  return startMorning(s, { first: true });
}

export function knowledgeOf(state) {
  return solve(state.records);
}

export function startMorning(state, { first = false } = {}) {
  const s = clone(state);
  const report = { harvest: {}, wren: {}, wrenNew: {} };
  if (!first) {
    for (const id of s.beds) {
      s.shelf[id] = (s.shelf[id] || 0) + BALANCE.harvestPerBed;
      report.harvest[id] = (report.harvest[id] || 0) + BALANCE.harvestPerBed;
    }
  }
  for (const id of s.wrenNew) {
    s.shelf[id] = (s.shelf[id] || 0) + 1;
    report.wrenNew[id] = 1;
  }
  s.wrenNew = [];
  if (shelfTotal(s) < BALANCE.wrenThreshold) {
    const rng = makeRng(hashSeed(s.seed, s.day, 3));
    const basics = BALANCE.startBeds;
    for (let i = 0; i < BALANCE.wrenBundle; i++) {
      const id = basics[Math.floor(rng() * basics.length)];
      s.shelf[id] = (s.shelf[id] || 0) + 1;
      report.wren[id] = (report.wren[id] || 0) + 1;
    }
  }
  s.queue = pickDay({ seed: s.seed, day: s.day, level: s.level, returning: s.returning, plan: tutorialDay(s) });
  s.returning = [];
  s.current = 0;
  s.cauldron = [];
  s.phase = 'morning';
  s.morningReport = report;
  s.dayLog = { coins: 0, perfect: 0, ok: 0, flops: 0, startRep: s.rep };
  s.levelUp = null;
  s.bought = [];
  return s;
}

// `now` (milliseconds) times the day for the playtest log; tests can pass a fixed number.
export function openShop(state, now = Date.now()) {
  const s = clone(state);
  s.phase = 'shop';
  if (s.dayLog && !s.dayLog.openedAt) s.dayLog.openedAt = now;
  return s;
}

export function currentCustomer(state) {
  return state.queue[state.current] || null;
}

// Returns { state, error } where error is 'full', 'none' or null.
export function addToCauldron(state, id) {
  if (state.phase !== 'shop') return { state, error: 'phase' };
  if (state.cauldron.length >= slots(state)) return { state, error: 'full' };
  if (!state.shelf[id]) return { state, error: 'none' };
  const s = clone(state);
  s.shelf[id] -= 1;
  if (s.shelf[id] === 0) delete s.shelf[id];
  s.cauldron.push(id);
  return { state: s, error: null };
}

export function removeFromCauldron(state, index) {
  if (state.phase !== 'shop' || index < 0 || index >= state.cauldron.length) return state;
  const s = clone(state);
  const [id] = s.cauldron.splice(index, 1);
  s.shelf[id] = (s.shelf[id] || 0) + 1;
  return s;
}

function learnAilment(s, ailmentId, res) {
  const seen = (s.ailmentsSeen[ailmentId] ||= { full: false, clues: [] });
  if (res.stars >= 2) seen.full = true;
  if (res.clue && !seen.clues.some(c => c.scale === res.clue.scale && c.dir === res.clue.dir)) {
    seen.clues.push(res.clue);
  }
}

export function brew(state) {
  if (state.phase !== 'shop' || !state.cauldron.length) return state;
  const s = clone(state);
  const cust = currentCustomer(s);
  const ail = AILMENT_BY_ID[cust.ailment];
  const before = solve(s.records);
  const { result, clamped } = mix(s.cauldron, INGREDIENT_BY_ID);
  const res = score(result, ail.target);
  s.records.push({ counts: countIds(s.cauldron), result, clamped, day: s.day, ailment: ail.id, stars: res.stars });
  if (s.records.length > BALANCE.maxRecords) s.records = s.records.slice(-BALANCE.maxRecords);
  const after = solve(s.records);
  const wasFull = !!(s.ailmentsSeen[ail.id] && s.ailmentsSeen[ail.id].full);
  learnAilment(s, ail.id, res);
  const rep = BALANCE.repPerStars[res.stars];
  s.coins += res.coins;
  s.rep += rep;
  s.dayLog.coins += res.coins;
  if (res.stars === 3) s.dayLog.perfect++;
  else if (res.stars > 0) s.dayLog.ok++;
  else s.dayLog.flops++;
  if (res.flop && !s.returning.includes(ail.id)) s.returning.push(ail.id);
  s.lastResult = {
    ailment: ail.id, villager: cust.villager, used: s.cauldron.slice(), result,
    ...res, rep,
    discoveries: newlyKnown(before, after),
    learnedAilment: !wasFull && s.ailmentsSeen[ail.id].full,
  };
  s.cauldron = [];
  s.phase = 'result';
  return s;
}

// The player can't help this customer: they come back tomorrow, nothing is lost.
export function sendAway(state) {
  if (state.phase !== 'shop') return state;
  let s = state;
  while (s.cauldron.length) s = removeFromCauldron(s, 0);
  s = clone(s);
  const cust = currentCustomer(s);
  if (!s.returning.includes(cust.ailment)) s.returning.push(cust.ailment);
  s.dayLog.flops++;
  s.lastResult = { ailment: cust.ailment, villager: cust.villager, sentAway: true, stars: 0, coins: 0, tip: 0, rep: 0, discoveries: [] };
  s.phase = 'result';
  return s;
}

export function nextCustomer(state, now = Date.now()) {
  if (state.phase !== 'result') return state;
  const s = clone(state);
  s.current += 1;
  s.lastResult = null;
  if (s.current >= s.queue.length) {
    s.phase = 'evening';
    const log = s.dayLog || {};
    const day = {
      day: s.day, coins: s.coins, earned: log.coins || 0, perfect: log.perfect || 0, ok: log.ok || 0,
      flops: log.flops || 0, rep: s.rep,
      minutes: log.openedAt ? Math.round((now - log.openedAt) / 6000) / 10 : null,
    };
    s.history = [...(s.history || []).filter(h => h.day !== s.day), day].slice(-BALANCE.maxHistory);
    const lvl = levelFor(s.rep);
    if (lvl > s.level) {
      for (let l = s.level + 1; l <= lvl; l++) {
        s.wrenNew.push(...INGREDIENTS.filter(i => i.level === l && i.source !== 'story').map(i => i.id));
      }
      s.levelUp = lvl;
      s.level = lvl;
    }
  } else {
    s.phase = 'shop';
  }
  return s;
}

export function buy(state, id) {
  const ing = INGREDIENT_BY_ID[id];
  if (state.phase !== 'evening' || !ing || ing.level > state.level || ing.source === 'story') return { state, error: 'locked' };
  if (state.coins < ing.price) return { state, error: 'poor' };
  const s = clone(state);
  s.coins -= ing.price;
  s.shelf[id] = (s.shelf[id] || 0) + 1;
  s.bought.push({ kind: 'ing', id, cost: ing.price });
  return { state: s, error: null };
}

export function buyUpgrade(state, upgradeId) {
  const up = BALANCE.upgrades.find(u => u.id === upgradeId);
  if (state.phase !== 'evening' || !up || state.upgrades[up.id]) return { state, error: 'locked' };
  if (state.coins < up.cost) return { state, error: 'poor' };
  const s = clone(state);
  s.coins -= up.cost;
  s.upgrades[up.id] = true;
  if (up.kind === 'bed') s.beds.push(up.grows);
  s.bought.push({ kind: 'upg', id: up.id, cost: up.cost });
  return { state: s, error: null };
}

// Undo a purchase made this evening (Phase 7 rule 5).
export function refund(state, index) {
  const item = state.bought[index];
  if (state.phase !== 'evening' || !item) return state;
  const s = clone(state);
  if (item.kind === 'ing') {
    if (!s.shelf[item.id]) return state; // already used: can't return it
    s.shelf[item.id] -= 1;
    if (s.shelf[item.id] === 0) delete s.shelf[item.id];
  } else {
    const up = BALANCE.upgrades.find(u => u.id === item.id);
    delete s.upgrades[item.id];
    if (up.kind === 'bed') {
      const i = s.beds.lastIndexOf(up.grows);
      if (i >= 0) s.beds.splice(i, 1);
    }
  }
  s.coins += item.cost;
  s.bought.splice(index, 1);
  return s;
}

export function sleep(state) {
  if (state.phase !== 'evening') return state;
  const s = clone(state);
  s.day += 1;
  return startMorning(s);
}

export function markNote(state, key) {
  if (state.notesSeen[key]) return state;
  const s = clone(state);
  s.notesSeen[key] = true;
  return s;
}
