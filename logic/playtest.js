// "Copy playtest log" (Phase 8, Phase 11): a short plain-text summary the player can paste
// into a message. Built only from the save; nothing is sent anywhere.
import { BALANCE } from '../data/balance.js';

const avg = (sum, n) => (n ? (sum / n).toFixed(1) : '–');

// Per ailment: brews until the first ★★ or better, and the longest run of flops.
function ailmentStats(records) {
  const by = {};
  for (const r of records) {
    if (!r.ailment || r.ailment === 'debug') continue;
    const a = (by[r.ailment] ||= { tries: 0, solvedAt: null, run: 0, maxRun: 0 });
    a.tries++;
    if (r.stars === 0) { a.run++; a.maxRun = Math.max(a.maxRun, a.run); } else a.run = 0;
    if (a.solvedAt === null && r.stars >= 2) a.solvedAt = a.tries;
  }
  return by;
}

export function playtestLog(state, { version = '?', days = 3, date = new Date() } = {}) {
  const lines = [];
  const recs = state.records.filter(r => r.ailment !== 'debug');
  const d = date.toISOString().slice(0, 10);
  lines.push(`Take Two Toads playtest log · v${version} · ${d}`);
  lines.push(`Now: day ${state.day} (${state.phase}), level ${state.level}, reputation ${state.rep}, coins ${state.coins}`);

  lines.push(`Step-by-step start: ${state.tutorial ? 'on' : 'off'}`);
  const next = BALANCE.levels[state.level];
  if (next !== undefined) lines.push(`Next level at ${next} reputation`);

  const hist = (state.history || []).slice(-days);
  if (!hist.length) lines.push('No finished days yet.');
  for (const h of hist) {
    const brews = recs.filter(r => r.day === h.day);
    const stars = brews.reduce((a, r) => a + r.stars, 0);
    const time = h.minutes === null || h.minutes === undefined ? '? min' : `${h.minutes} min`;
    lines.push(`Day ${h.day}: ${time} · earned ${h.earned}, coins at end ${h.coins} · ★★★ ${h.perfect}, ★–★★ ${h.ok}, flops ${h.flops} · stars per brew ${avg(stars, brews.length)}`);
  }

  const allStars = recs.reduce((a, r) => a + r.stars, 0);
  lines.push(`All brews: ${recs.length}, stars per brew ${avg(allStars, recs.length)}`);

  const stats = ailmentStats(recs);
  const solved = Object.entries(stats).filter(([, a]) => a.solvedAt !== null).map(([id, a]) => `${id} ${a.solvedAt}`);
  const open = Object.entries(stats).filter(([, a]) => a.solvedAt === null).map(([id, a]) => `${id} ${a.tries}`);
  lines.push(`Brews until solved: ${solved.length ? solved.join(', ') : 'none yet'}`);
  if (open.length) lines.push(`Not solved yet (brews so far): ${open.join(', ')}`);
  const worst = Object.entries(stats).sort((a, b) => b[1].maxRun - a[1].maxRun)[0];
  lines.push(`Most flops in a row: ${worst && worst[1].maxRun ? `${worst[1].maxRun} (${worst[0]})` : '0'}`);
  return lines.join('\n');
}
