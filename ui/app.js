// The screens and the taps. Draws from the state; asks logic/state.js to change it.
import { t } from '../lang/en.js';
import * as G from '../logic/state.js';
import { saveGame, loadGame, clearGame, exportCode, importCode } from '../logic/save.js';
import { INGREDIENTS, INGREDIENT_BY_ID } from '../data/ingredients.js';
import { AILMENTS, AILMENT_BY_ID } from '../data/ailments.js';
import { BALANCE } from '../data/balance.js';
import { SCALES } from '../logic/brew.js';
import { solve, isKnown, fullyKnown } from '../logic/herbal.js';
import { targetScales } from '../logic/quality.js';
import { randomSeed } from '../logic/rng.js';
import { playtestLog } from '../logic/playtest.js';
import { plantSVG } from './art/plants.js';
import { scaleSVG, scaleIcon, scaleX, cauldronSVG, bustSVG, coinSVG, bookSVG, gearSVG, starStamp, makePaper } from './art/scenes.js';

export const VERSION = '0.1.1';
const REPO = 'https://github.com/Sichdar/take-two-toads';
const DEBUG = new URLSearchParams(location.search).has('debug');
const PREFS_KEY = 'scales-and-simples.prefs';

// --- storage that never throws (private mode, blocked storage) -------------------------------
const storage = (() => {
  try {
    localStorage.setItem('__t', '1'); localStorage.removeItem('__t');
    return localStorage;
  } catch {
    const m = new Map();
    return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
  }
})();

let prefs = { textSize: 'M', reducedMotion: false };
try { prefs = { ...prefs, ...JSON.parse(storage.getItem(PREFS_KEY) || '{}') }; } catch { /* defaults */ }

let state = null;
let screen = 'cover';
let overlay = null;
let bookTab = 'ing';
let shownShop = null; // which customer the shop screen was last drawn for
const ui = { newConfirm: false, resetConfirm: false, setMsg: '', eveMsg: '', exportText: '', logText: '' };

const app = document.getElementById('app');

// --- small helpers ----------------------------------------------------------------------------
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const signed = v => (v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : '0');
const scaleName = k => t(`scale.${k}`);
const fmtTarget = target => targetScales(target).map(k => `${scaleName(k)} ${signed(target[k])}`).join(', ');
const ingName = id => t(`ing.${id}`);
const symptoms = text => esc(text).replace(/_(.+?)_/g, '<u class="sym" data-act="sym">$1</u>');
const knowledge = () => solve(state.records);

function applyPrefs() {
  document.documentElement.dataset.text = prefs.textSize;
  document.documentElement.dataset.motion = prefs.reducedMotion ? 'reduced' : 'full';
}
function savePrefs() {
  try { storage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
  applyPrefs();
}

function persist() {
  if (!state) return;
  if (saveGame(storage, state)) {
    const el = document.getElementById('saved');
    if (el) { el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
  }
}

let tipTimer = null;
function tip(text) {
  const el = document.getElementById('tip');
  if (!el) return;
  el.textContent = text;
  el.hidden = false;
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

function shake(selector) {
  const el = app.querySelector(selector);
  if (!el) return;
  el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
}

function ownedIds() {
  return INGREDIENTS.filter(i => state.shelf[i.id] > 0).map(i => i.id);
}

// --- top bar --------------------------------------------------------------------------------
function topbar() {
  const served = state.current + (state.phase === 'result' ? 1 : 0);
  const pips = state.queue.map((_, i) => `<span class="pip ${i < served ? 'on' : ''}"></span>`).join('');
  return `<header class="topbar">
    <span class="day">${esc(t('hud.day', { day: state.day }))}</span>
    <span class="pips" aria-label="${served} of ${state.queue.length} served">${state.phase === 'shop' || state.phase === 'result' ? pips : ''}</span>
    <span class="coins" aria-label="${esc(t('hud.coins', { coins: state.coins }))}">${coinSVG()}<b>${state.coins}</b></span>
    <button class="iconbtn" data-act="book" aria-label="${esc(t('hud.book'))}">${bookSVG()}</button>
    <button class="iconbtn" data-act="settings" aria-label="${esc(t('set.title'))}">${gearSVG()}</button>
  </header>`;
}

function chips(obj) {
  return Object.entries(obj).map(([id, n]) =>
    `<span class="chip">${plantSVG(id)}<span>${esc(ingName(id))} ×${n}</span></span>`).join('');
}

// --- cover ----------------------------------------------------------------------------------
function renderCover() {
  const hasSave = !!loadGame(storage);
  return `<main class="page cover">
    <div class="cover-inner">
      <p class="cover-kicker">${esc(t('subtitle'))}</p>
      <h1 class="title"><span class="initial">T</span>ake Two Toads</h1>
      <div class="cover-art">${cauldronSVG()}</div>
      ${hasSave ? `<button class="big" data-act="continue">${esc(t('cover.continue'))}</button>` : ''}
      <button class="${hasSave ? 'mid' : 'big'}" data-act="new">${esc(ui.newConfirm ? t('cover.newConfirm') : t('cover.new'))}</button>
      <button class="mid" data-act="settings">${esc(t('cover.settings'))}</button>
      <p class="small">${esc(t('cover.proto', { version: VERSION }))}</p>
    </div>
  </main>`;
}

// --- morning --------------------------------------------------------------------------------
function renderMorning() {
  const r = state.morningReport || { harvest: {}, wren: {}, wrenNew: {} };
  return `<section class="sheet">
    <h2 class="rubric">${esc(t('morning.title', { day: state.day }))}</h2>
    ${state.day === 1 ? `<p>${esc(t('morning.first'))}</p><div class="chips">${chips(state.shelf)}</div>` : ''}
    ${Object.keys(r.harvest).length ? `<p>${esc(t('morning.garden'))}</p><div class="chips">${chips(r.harvest)}</div>` : ''}
    ${Object.keys(r.wrenNew).length ? `<p>${esc(t('morning.wrenNew'))}</p><div class="chips">${chips(r.wrenNew)}</div>` : ''}
    ${Object.keys(r.wren).length ? `<p>${esc(t('morning.wren'))}</p><div class="chips">${chips(r.wren)}</div>` : ''}
    <p>${esc(t('morning.queue', { n: state.queue.length }))}</p>
    <button class="big" data-act="open">${esc(t('morning.open'))}</button>
  </section>`;
}

// --- shop -----------------------------------------------------------------------------------
function noteFor(cust) {
  if (state.phase !== 'shop') return '';
  const seen = state.ailmentsSeen[cust.ailment];
  if (state.day === 1 && state.current === 0) return t('note.first');
  if (state.day === 1 && state.current === 1) return t('note.remove');
  if (!seen && state.day <= 3) return t('note.unknownAilment');
  if (state.day === 1 && state.current === 2) return t('note.alone');
  if (state.day === 2 && state.current === 0) return t('note.mark');
  return '';
}

function bubble(cust) {
  const ail = AILMENT_BY_ID[cust.ailment];
  const seen = state.ailmentsSeen[cust.ailment];
  const who = `${t(`vil.${cust.villager}`)}${seen ? ` · ${t(`ail.${ail.id}`)}` : ''}`;
  let say;
  if (state.phase === 'result') {
    const r = state.lastResult;
    if (r.sentAway) say = esc(t('react.return'));
    else {
      say = esc(t(`react.${r.stars}`));
      if (r.clue && r.stars < 3) say += ' ' + esc(t(`clue.${r.clue.scale}.${r.clue.dir}`));
      if (r.flop) say += ' ' + esc(t('react.return'));
    }
  } else {
    say = (cust.returning ? esc(t('say.returning')) : '') + symptoms(t(`say.${ail.id}`));
  }
  return `<section class="customer">
    <div class="bust">${bustSVG(cust.villager)}</div>
    <div class="bubble"><div class="who">${esc(who)}</div><p class="say">${say}</p></div>
  </section>`;
}

function scalesBlock() {
  return `<section class="scales" id="scales">${SCALES.map(k => `
    <div class="scale-row" data-k="${k}">
      <div class="scale-label">${scaleIcon(k)}<span>${esc(scaleName(k))}</span></div>
      <div class="scale-track">${scaleSVG(k)}</div>
      <div class="scale-val" data-k="${k}">0</div>
    </div>`).join('')}</section>`;
}

function updateScales() {
  if (!state || (state.phase !== 'shop' && state.phase !== 'result')) return;
  const cust = G.currentCustomer(state);
  const ail = AILMENT_BY_ID[cust.ailment];
  const seen = state.ailmentsSeen[cust.ailment];
  const know = knowledge();
  for (const k of SCALES) {
    let value = 0, unknown = false;
    if (state.phase === 'result' && state.lastResult && state.lastResult.result) {
      value = state.lastResult.result[k];
    } else {
      for (const id of state.cauldron) {
        if (isKnown(know, id, k)) value += know.exact[id][k];
        else unknown = true;
      }
      value = Math.max(BALANCE.scaleMin, Math.min(BALANCE.scaleMax, value));
    }
    const row = app.querySelector(`.scale-row[data-k="${k}"]`);
    if (!row) continue;
    const ptr = row.querySelector('.pointer');
    ptr.style.transform = `translateX(${scaleX(value)}px)`;
    ptr.classList.toggle('unknown', unknown);
    const tgt = row.querySelector('.target');
    const showTarget = seen && seen.full && ail.target[k] !== undefined;
    tgt.style.transform = `translateX(${scaleX(showTarget ? ail.target[k] : 0)}px)`;
    tgt.classList.toggle('hidden', !showTarget);
    row.classList.toggle('faded', !!(seen && seen.full && ail.target[k] === undefined));
    const val = row.querySelector('.scale-val');
    let hint = '';
    if (seen && !seen.full) {
      const c = seen.clues.find(x => x.scale === k);
      if (c) hint = c.dir === 'low' ? ' ↑' : ' ↓';
    }
    val.textContent = (unknown ? '?' : signed(value)) + hint;
  }
}

function slotsHtml() {
  const n = G.slots(state);
  let out = '';
  for (let i = 0; i < n; i++) {
    const id = state.cauldron[i];
    out += id
      ? `<button class="slot full" data-act="remove" data-i="${i}" aria-label="${esc(ingName(id))}">${plantSVG(id)}</button>`
      : `<span class="slot empty"></span>`;
  }
  return out;
}

function shelfHtml() {
  const know = knowledge();
  const ids = ownedIds();
  if (!ids.length) return `<p class="small center">${esc(t('shop.noneLeft'))}</p>`;
  const hintFirst = state.day === 1 && state.current === 0 && !state.cauldron.length;
  return ids.map((id, i) => {
    const unknown = !fullyKnown(know, id);
    return `<button class="ing ${hintFirst && id === 'emberroot' ? 'hint' : ''}" data-act="add" data-long="ing" data-id="${id}" aria-label="${esc(ingName(id))}${unknown ? ', unknown' : ''}">
      ${plantSVG(id)}<span class="ing-name">${esc(ingName(id))}</span>
      <span class="count">${state.shelf[id]}</span>${unknown ? '<span class="q">?</span>' : ''}
      ${i < 8 ? `<span class="key">${i + 1}</span>` : ''}
    </button>`;
  }).join('');
}

function updateShop() {
  const slots = app.querySelector('#slots');
  if (slots) slots.innerHTML = slotsHtml();
  const shelf = app.querySelector('#shelf');
  if (shelf) shelf.innerHTML = shelfHtml();
  const pot = app.querySelector('.cauldron');
  if (pot) pot.classList.toggle('ready', state.cauldron.length > 0);
  updateScales();
}

function resultPanel() {
  const r = state.lastResult;
  const last = state.current + 1 >= state.queue.length;
  let lines = '';
  if (!r.sentAway) {
    lines += `<p class="stamp">${r.stars ? starStamp(r.stars) : `<span class="flop">${esc(t('result.stars0'))}</span>`}</p>`;
    lines += `<p>${esc(t('result.coins', { coins: r.coins }))} ${r.tip ? esc(t('result.tip', { tip: r.tip })) : ''} · ${esc(t('result.rep', { rep: r.rep }))}</p>`;
    const byId = {};
    for (const d of r.discoveries) (byId[d.id] ||= []).push(d);
    const items = Object.entries(byId).map(([id, ds]) => {
      const nz = ds.filter(d => d.value !== 0).map(d => `${scaleName(d.scale)} ${signed(d.value)}`);
      return `<li>${plantSVG(id)}<span><b>${esc(ingName(id))}</b>: ${esc(nz.length ? nz.join(', ') : ds.map(d => `${scaleName(d.scale)} 0`).join(', '))}</span></li>`;
    }).join('');
    const ail = AILMENT_BY_ID[r.ailment];
    let learned = '';
    if (r.learnedAilment) learned = `<li class="plain">${esc(t('result.learnedAilment', { ail: t(`ail.${ail.id}`), target: fmtTarget(ail.target) }))}</li>`;
    else if (r.flop && r.clue) learned = `<li class="plain">${esc(t('result.learnedClue', { ail: t(`ail.${ail.id}`), scale: scaleName(r.clue.scale) }))}</li>`;
    if (items || learned) lines += `<p class="small">${esc(t('result.inked'))}</p><ul class="inked">${items}${learned}</ul>`;
  }
  return `<section class="result">${lines}
    <button class="big" data-act="next">${esc(last ? t('result.evening') : t('result.next'))}</button>
  </section>`;
}

function renderShop() {
  const cust = G.currentCustomer(state);
  const note = noteFor(cust);
  const lower = state.phase === 'result'
    ? resultPanel()
    : `<section class="cauldron-area">
        <div class="slots" id="slots">${slotsHtml()}</div>
        <button class="cauldron ${state.cauldron.length ? 'ready' : ''}" data-act="brew" aria-label="${esc(t('shop.brew'))}">${cauldronSVG()}<span class="brew-label">${esc(t('shop.brew'))}</span></button>
      </section>
      <section class="shelf" id="shelf">${shelfHtml()}</section>
      <div class="shop-foot"><button class="link" data-act="sendaway">${esc(t('shop.sendAway'))}</button></div>`;
  return `${bubble(cust)}
    ${note ? `<p class="note">☞ ${esc(note)}</p>` : ''}
    ${scalesBlock()}
    ${lower}`;
}

// --- evening --------------------------------------------------------------------------------
function renderEvening() {
  const log = state.dayLog;
  const lvl = state.level;
  const next = BALANCE.levels[lvl];
  const market = G.unlockedIngredients(lvl).map(ing => `
    <button class="ware" data-act="buy" data-id="${ing.id}">${plantSVG(ing.id)}
      <span class="ware-name">${esc(ingName(ing.id))}</span>
      <span class="ware-price">${esc(t('evening.cost', { cost: ing.price }))}</span>
      <span class="count">${state.shelf[ing.id] || 0}</span></button>`).join('');
  const bought = state.bought.map((b, i) => `<button class="chip btn" data-act="refund" data-i="${i}">↶ ${esc(b.kind === 'ing' ? ingName(b.id) : t(`upg.${b.id}`))} (${b.cost} c)</button>`).join('');
  const ups = BALANCE.upgrades.map(u => {
    const owned = !!state.upgrades[u.id];
    return `<button class="upg" data-act="upgrade" data-id="${u.id}" ${owned ? 'disabled' : ''}>
      <span>${esc(t(`upg.${u.id}`))}</span><b>${owned ? esc(t('evening.owned')) : esc(t('evening.cost', { cost: u.cost }))}</b></button>`;
  }).join('');
  return `<section class="sheet evening">
    <h2 class="rubric">${esc(t('evening.title', { day: state.day }))}</h2>
    <p>${esc(t('evening.earned', { coins: log.coins }))}</p>
    <p>${esc(t('evening.stars', { perfect: log.perfect, ok: log.ok, flops: log.flops }))}</p>
    <p>${esc(t('evening.rep', { rep: state.rep, level: lvl, levelName: t(`level.${lvl}`) }))}${next !== undefined ? `<br><span class="small">${esc(t('evening.nextLevel', { need: next - state.rep, levelName: t(`level.${lvl + 1}`) }))}</span>` : ''}</p>
    ${state.levelUp ? `<p class="levelup">☞ ${esc(t('evening.levelUp', { levelName: t(`level.${state.levelUp}`) }))}</p>` : ''}
    <h3 class="rubric">${esc(t('evening.market'))}</h3>
    <p class="small">${esc(t('evening.marketNote'))}</p>
    <div class="market">${market}</div>
    ${bought ? `<p class="small">${esc(t('evening.bought'))}</p><div class="chips">${bought}</div>` : ''}
    <h3 class="rubric">${esc(t('evening.upgrades'))}</h3>
    <div class="upgrades">${ups}</div>
    ${ui.eveMsg ? `<p class="msg">${esc(ui.eveMsg)}</p>` : ''}
    <button class="big" data-act="sleep">${esc(t('evening.sleep'))}</button>
  </section>`;
}

// --- the book -------------------------------------------------------------------------------
function bookHerbs() {
  const know = knowledge();
  const met = new Set(state.records.flatMap(r => Object.keys(r.counts)));
  const list = INGREDIENTS.filter(i => i.level <= state.level && i.source !== 'story' || state.shelf[i.id] || met.has(i.id));
  const locked = INGREDIENTS.length - list.length;
  const cards = list.map(ing => {
    const parts = SCALES.map(k => {
      if (isKnown(know, ing.id, k)) {
        const v = know.exact[ing.id][k];
        return v ? `<span class="val">${esc(scaleName(k))} ${signed(v)}</span>` : '';
      }
      const s = know.sums.find(x => x.scale === k && (x.a === ing.id || x.b === ing.id));
      if (s) return `<span class="val approx">${esc(scaleName(k))} ≈ ${esc(t('book.sum', { other: ingName(s.a === ing.id ? s.b : s.a), value: signed(s.value) }))}</span>`;
      return `<span class="val unk">${esc(scaleName(k))} ?</span>`;
    }).filter(Boolean).join('');
    return `<div class="card">${plantSVG(ing.id)}<div><b>${esc(ingName(ing.id))}</b> <i>${esc(t(`lat.${ing.id}`))}</i><div class="vals">${parts || `<span class="val unk">${esc(t('book.unknown'))}</span>`}</div></div></div>`;
  }).join('');
  return cards + (locked > 0 ? `<p class="small center">${esc(t('book.locked'))}: ${locked}</p>` : '');
}

function bookAilments() {
  const list = AILMENTS.filter(a => !a.story && a.level <= state.level);
  return list.map(a => {
    const seen = state.ailmentsSeen[a.id];
    if (!seen) return `<div class="card dim"><div><b>?</b><div class="small">${esc(t('book.ailUnknown'))}</div></div></div>`;
    const info = seen.full
      ? esc(t('book.ailNeeds', { target: fmtTarget(a.target) }))
      : esc(t('book.ailClues', { clues: seen.clues.map(c => `${scaleName(c.scale)} ${c.dir === 'low' ? '↑' : '↓'}`).join(', ') || '?' }));
    return `<div class="card"><div class="mini-bust">${bustSVG(a.villager)}</div><div><b>${esc(t(`ail.${a.id}`))}</b> <i>${esc(t(`vil.${a.villager}`))}</i><div class="small">${info}</div></div></div>`;
  }).join('');
}

function bookBrews() {
  const recs = state.records.slice(-15).reverse();
  if (!recs.length) return `<p class="small center">${esc(t('book.noBrews'))}</p>`;
  return recs.map(r => {
    const ings = Object.entries(r.counts).map(([id, n]) => `${ingName(id)}${n > 1 ? ` ×${n}` : ''}`).join(' + ');
    const res = SCALES.map(k => `${k} ${signed(r.result[k])}${r.clamped[k] ? '!' : ''}`).join(' · ');
    return `<div class="brew-line"><span>${esc(ings)}</span><span class="small">${esc(res)} · ${r.stars ? '★'.repeat(r.stars) : '✗'}</span></div>`;
  }).join('');
}

function renderBook() {
  const tabs = [['ing', t('book.tab.ing')], ['ail', t('book.tab.ail')], ['brews', t('book.tab.brews')]];
  const body = bookTab === 'ail' ? bookAilments() : bookTab === 'brews' ? bookBrews() : bookHerbs();
  return `<div class="overlay" role="dialog" aria-label="${esc(t('book.title'))}"><div class="overlay-page">
    <header class="ov-head"><h2 class="rubric">${esc(t('book.title'))}</h2><button class="iconbtn close" data-act="close" aria-label="${esc(t('close'))}">✕</button></header>
    <nav class="tabs">${tabs.map(([id, label]) => `<button class="tab ${bookTab === id ? 'on' : ''}" data-act="tab" data-tab="${id}">${esc(label)}</button>`).join('')}</nav>
    <div class="ov-body">${body}</div>
  </div></div>`;
}

// --- settings -------------------------------------------------------------------------------
function renderSettings() {
  const sizes = ['S', 'M', 'L'].map(s => `<button class="tab ${prefs.textSize === s ? 'on' : ''}" data-act="text" data-size="${s}">${s}</button>`).join('');
  return `<div class="overlay" role="dialog" aria-label="${esc(t('set.title'))}"><div class="overlay-page">
    <header class="ov-head"><h2 class="rubric">${esc(t('set.title'))}</h2><button class="iconbtn close" data-act="close" aria-label="${esc(t('close'))}">✕</button></header>
    <div class="ov-body settings">
      <div class="set-row"><span>${esc(t('set.text'))}</span><span class="tabs">${sizes}</span></div>
      <div class="set-row"><span>${esc(t('set.motion'))}</span><button class="tab on" data-act="motion">${esc(prefs.reducedMotion ? t('set.on') : t('set.off'))}</button></div>
      ${state ? `<h3 class="rubric">${esc(t('set.export'))}</h3>
        <p class="small">${esc(t('set.exportNote'))}</p>
        ${ui.exportText ? `<textarea readonly class="code" id="export-box">${esc(ui.exportText)}</textarea><button class="mid" data-act="copy">${esc(t('set.copy'))}</button>` : `<button class="mid" data-act="export">${esc(t('set.export'))}</button>`}
        <h3 class="rubric">${esc(t('set.log'))}</h3>
        <p class="small">${esc(t('set.logNote'))}</p>
        ${ui.logText ? `<textarea readonly class="code log" id="log-box">${esc(ui.logText)}</textarea><button class="mid" data-act="copylog">${esc(t('set.copy'))}</button>` : `<button class="mid" data-act="playlog">${esc(t('set.log'))}</button>`}` : ''}
      <h3 class="rubric">${esc(t('set.import'))}</h3>
      <p class="small">${esc(t('set.importNote'))}</p>
      <textarea class="code" id="import-box" placeholder="SS1...."></textarea>
      <button class="mid" data-act="import">${esc(t('set.load'))}</button>
      ${ui.setMsg ? `<p class="msg">${esc(ui.setMsg)}</p>` : ''}
      ${state ? `<button class="mid danger" data-act="reset">${esc(ui.resetConfirm ? t('set.resetConfirm') : t('set.reset'))}</button>` : ''}
      <h3 class="rubric">${esc(t('set.about'))}</h3>
      <p class="small">${esc(t('set.aboutText'))}</p>
      <p class="small">${esc(t('set.privacy'))}</p>
      <p class="small">${esc(t('set.licence'))} <a href="${REPO}" target="_blank" rel="noopener">${esc(t('set.source'))}</a></p>
      <p class="small">${esc(t('set.version', { version: VERSION }))}</p>
    </div>
  </div></div>`;
}

function renderDebug() {
  return `<div class="debug">
    <button data-act="dbg-coins">+50c</button><button data-act="dbg-rep">+30 rep</button>
    <button data-act="dbg-reveal">reveal herbs</button><button data-act="dbg-evening">to evening</button>
  </div>`;
}

// --- main render ----------------------------------------------------------------------------
function render() {
  let main;
  if (screen === 'cover' || !state) {
    main = renderCover();
    shownShop = null;
  } else {
    let body;
    if (state.phase === 'morning') body = renderMorning();
    else if (state.phase === 'evening') body = renderEvening();
    else body = renderShop();
    main = `<main class="page game phase-${state.phase}">${topbar()}<div class="body">${body}</div></main>`;
    shownShop = state.phase === 'shop' ? `${state.day}:${state.current}` : null;
  }
  app.innerHTML = main
    + (overlay === 'book' && state ? renderBook() : '')
    + (overlay === 'settings' ? renderSettings() : '')
    + (DEBUG && state && screen === 'game' ? renderDebug() : '')
    + `<div id="tip" class="tip" role="status" hidden></div><div id="saved" class="saved" aria-hidden="true">✒ ${esc(t('saved'))}</div>`;
  if (state && (state.phase === 'shop' || state.phase === 'result')) {
    // Draw pointers at 0 first, then move them, so the scales visibly swing.
    requestAnimationFrame(() => requestAnimationFrame(updateScales));
  }
}

function set(next, { save = true, partial = false } = {}) {
  state = next;
  if (save) persist();
  if (partial && shownShop === `${state.day}:${state.current}` && state.phase === 'shop' && !overlay) updateShop();
  else render();
}

function openOverlay(name) {
  overlay = name;
  ui.setMsg = ''; ui.exportText = ''; ui.logText = ''; ui.resetConfirm = false;
  try { history.pushState({ ov: name }, ''); } catch { /* ignore */ }
  render();
}

function closeOverlay() {
  if (history.state && history.state.ov) history.back();
  else { overlay = null; render(); }
}

window.addEventListener('popstate', () => {
  if (overlay) { overlay = null; render(); }
});

// --- actions --------------------------------------------------------------------------------
function act(name, el) {
  const d = el ? el.dataset : {};
  switch (name) {
    case 'continue': state = loadGame(storage); screen = state ? 'game' : 'cover'; ui.newConfirm = false; render(); break;
    case 'new':
      if (loadGame(storage) && !ui.newConfirm) { ui.newConfirm = true; render(); break; }
      ui.newConfirm = false;
      state = G.newGame(randomSeed());
      screen = 'game'; persist(); render();
      break;
    case 'open': set(G.openShop(state)); break;
    case 'add': {
      const r = G.addToCauldron(state, d.id);
      if (r.error === 'full') { shake('.cauldron-area'); tip(t('shop.full', { n: G.slots(state) })); break; }
      if (!r.error) set(r.state, { partial: true });
      break;
    }
    case 'remove': set(G.removeFromCauldron(state, Number(d.i)), { partial: true }); break;
    case 'brew':
      if (!state.cauldron.length) { tip(t('shop.cauldronEmpty')); shake('.cauldron'); break; }
      set(G.brew(state));
      break;
    case 'sendaway': set(G.sendAway(state)); break;
    case 'next': set(G.nextCustomer(state)); break;
    case 'buy': case 'upgrade': {
      const r = name === 'buy' ? G.buy(state, d.id) : G.buyUpgrade(state, d.id);
      if (r.error === 'poor') { ui.eveMsg = t('evening.poor'); shake('.coins'); render(); break; }
      ui.eveMsg = '';
      if (!r.error) set(r.state);
      break;
    }
    case 'refund': ui.eveMsg = ''; set(G.refund(state, Number(d.i))); break;
    case 'sleep': ui.eveMsg = ''; set(G.sleep(state)); window.scrollTo(0, 0); break;
    case 'book': bookTab = 'ing'; openOverlay('book'); break;
    case 'settings': openOverlay('settings'); break;
    case 'close': closeOverlay(); break;
    case 'tab': bookTab = d.tab; render(); break;
    case 'text': prefs.textSize = d.size; savePrefs(); render(); break;
    case 'motion': prefs.reducedMotion = !prefs.reducedMotion; savePrefs(); render(); break;
    case 'export': ui.exportText = exportCode(state); render(); break;
    case 'playlog': ui.logText = playtestLog(state, { version: VERSION }); render(); break;
    case 'copy': case 'copylog': {
      const box = document.getElementById(name === 'copy' ? 'export-box' : 'log-box');
      const text = name === 'copy' ? ui.exportText : ui.logText;
      const done = () => { ui.setMsg = t('set.copied'); render(); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => { box.select(); });
      else { box.select(); document.execCommand('copy'); done(); }
      break;
    }
    case 'import': {
      const code = (document.getElementById('import-box') || {}).value || '';
      const loaded = importCode(code);
      if (!loaded) { ui.setMsg = t('set.badCode'); render(); break; }
      state = loaded; screen = 'game'; persist(); ui.setMsg = t('set.loaded'); render();
      break;
    }
    case 'reset':
      if (!ui.resetConfirm) { ui.resetConfirm = true; render(); break; }
      clearGame(storage); state = null; screen = 'cover'; ui.resetConfirm = false;
      closeOverlay(); render();
      break;
    case 'sym': {
      const cust = G.currentCustomer(state);
      const seen = cust && state.ailmentsSeen[cust.ailment];
      const ail = cust && AILMENT_BY_ID[cust.ailment];
      tip(seen && seen.full ? t('book.ailNeeds', { target: fmtTarget(ail.target) }) : t('note.unknownAilment'));
      break;
    }
    case 'dbg-coins': set({ ...state, coins: state.coins + 50 }); break;
    case 'dbg-rep': set({ ...state, rep: state.rep + 30 }); break;
    case 'dbg-reveal': {
      const recs = G.unlockedIngredients(state.level).map(i => ({ counts: { [i.id]: 1 }, result: { H: i.values.H || 0, S: i.values.S || 0, W: i.values.W || 0 }, clamped: { H: false, S: false, W: false }, day: state.day, ailment: 'debug', stars: 0 }));
      set({ ...state, records: [...state.records, ...recs] });
      break;
    }
    case 'dbg-evening': {
      let s = state;
      if (s.phase === 'morning') s = G.openShop(s);
      while (s.phase === 'shop' || s.phase === 'result') s = s.phase === 'shop' ? G.sendAway(s) : G.nextCustomer(s);
      set(s);
      break;
    }
    default: break;
  }
}

// Long-press (450 ms) explains an ingredient instead of adding it.
let pressTimer = null, pressStart = null, suppressClick = false;
app.addEventListener('pointerdown', e => {
  const el = e.target.closest('[data-long]');
  if (!el) return;
  pressStart = [e.clientX, e.clientY];
  clearTimeout(pressTimer);
  pressTimer = setTimeout(() => {
    suppressClick = true;
    const id = el.dataset.id;
    const know = knowledge();
    const known = SCALES.filter(k => isKnown(know, id, k) && know.exact[id][k] !== 0).map(k => `${scaleName(k)} ${signed(know.exact[id][k])}`);
    const full = fullyKnown(know, id);
    tip(`${ingName(id)}: ${full ? (known.join(', ') || '0') : (known.length ? `${known.join(', ')}, more ?` : t('shop.unknownNote'))}`);
  }, 450);
});
const cancelPress = () => { clearTimeout(pressTimer); pressTimer = null; };
app.addEventListener('pointerup', cancelPress);
app.addEventListener('pointercancel', cancelPress);
app.addEventListener('pointermove', e => {
  if (pressStart && Math.hypot(e.clientX - pressStart[0], e.clientY - pressStart[1]) > 10) cancelPress();
});
app.addEventListener('contextmenu', e => { if (e.target.closest('[data-long]')) e.preventDefault(); });

app.addEventListener('click', e => {
  if (suppressClick) { suppressClick = false; e.preventDefault(); return; }
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  act(el.dataset.act, el);
});

window.addEventListener('keydown', e => {
  if (e.target.matches && e.target.matches('textarea, input')) return;
  if (e.key === 'Escape' && overlay) { closeOverlay(); return; }
  if (!state || screen !== 'game' || overlay) return;
  if (/^[1-8]$/.test(e.key) && state.phase === 'shop') {
    const id = ownedIds()[Number(e.key) - 1];
    if (id) act('add', { dataset: { id } });
  } else if (e.key === ' ') {
    e.preventDefault();
    if (state.phase === 'shop') act('brew');
    else if (state.phase === 'result') act('next');
    else if (state.phase === 'morning') act('open');
  } else if (e.key.toLowerCase() === 'b') act('book');
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && state) saveGame(storage, state);
});

// --- start ----------------------------------------------------------------------------------
applyPrefs();
makePaper();
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch { /* optional */ }
render();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* offline mode just won't be available */ });
}
