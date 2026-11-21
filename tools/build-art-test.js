// Builds the M2 art test page from the real drawing code.
//   node tools/build-art-test.js [fragment-output]
// Writes art-test.html (full page, opens in any browser) and, if a path is given,
// a copy without <!doctype>/<html>/<body> for publishing as a Claude artifact.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { FILTER_DEFS, emberrootPlate, hessaBust, scale2SVG, scale2X } from '../ui/art/final.js';
import { plantSVG } from '../ui/art/plants.js';
import { bustSVG, scaleSVG } from '../ui/art/scenes.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const paperNoise = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.42  0 0 0 0 0.30  0 0 0 0 0.17  0 0 0 0.16 0"/></filter><filter id="l"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.25" numOctaves="2" seed="5" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.32  0 0 0 0 0.18  0 0 0 0.09 0"/></filter><rect width="100%" height="100%" filter="url(#l)"/><rect width="100%" height="100%" filter="url(#n)"/></svg>`);

const head = `<title>Take Two Toads Art Test</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&family=Alegreya:ital,wght@0,400;0,700;1,400&display=swap">
<style>
/* One look on purpose: the game is always a parchment page, so no dark variant.
   Layout: a single book page, one column, each sample on its own "leaf". */
:root {
  --paper: #EFE2C4; --paper-shade: #DCC9A0; --ink: #3B2A1E; --rubric: #A8322A;
  --gold: #B88A2B; --plum: #6D3B5A; --ink-soft: #5A4532;
  --head: "IM Fell English", "Palatino Linotype", Palatino, Georgia, serif;
  --caps: "IM Fell English SC", "IM Fell English", Palatino, Georgia, serif;
  --body: Alegreya, Georgia, "Times New Roman", serif;
  color-scheme: light;
}
* { box-sizing: border-box; }
body {
  margin: 0; color: var(--ink); font-family: var(--body); font-size: 17px; line-height: 1.5;
  background-color: var(--paper);
  background-image:
    radial-gradient(circle at 12% 18%, rgba(150,100,50,.10) 0 6px, transparent 14px),
    radial-gradient(circle at 84% 46%, rgba(150,100,50,.08) 0 4px, transparent 11px),
    radial-gradient(circle at 30% 82%, rgba(150,100,50,.09) 0 5px, transparent 12px),
    radial-gradient(ellipse at 50% 40%, transparent 55%, rgba(110,70,30,.20) 100%),
    url("data:image/svg+xml,${paperNoise}");
  background-attachment: scroll, scroll, scroll, fixed, scroll;
}
.page {
  max-width: 34rem; margin: 0 auto;
  padding-block: 28px 48px;
  padding-left: max(16px, env(safe-area-inset-left, 0px));
  padding-right: max(16px, env(safe-area-inset-right, 0px));
  display: flex; flex-direction: column; gap: 34px;
}
h1, h2 { font-family: var(--head); font-weight: normal; margin: 0; text-wrap: balance; }
h1 { font-size: 2.3rem; line-height: 1.05; }
h2 { font-size: 1.55rem; color: var(--rubric); line-height: 1.15; }
h2 .num { font-family: var(--caps); margin-right: .35em; }
.kicker { font-family: var(--caps); letter-spacing: .06em; color: var(--ink-soft); margin: 0 0 .2rem; font-size: .95rem; }
.initial { float: left; font-family: var(--head); font-size: 4.1rem; line-height: .8; color: var(--rubric); margin: .28rem .45rem 0 0; }
p { margin: 0; max-width: 62ch; }
.lead { font-size: 1.06rem; }
.leaf { display: flex; flex-direction: column; gap: 14px; }
.rule { display: flex; align-items: center; gap: .6em; color: var(--rubric); }
.rule::before, .rule::after { content: ""; flex: 1; border-top: 1.5px solid rgba(59,42,30,.55); }
.rule { font-size: 1.2rem; line-height: 1; }
.rule > span { font-family: var(--head); }
.art { width: 100%; height: auto; display: block; }
.plate2 { max-width: 23rem; margin: 0 auto; }
.bust2 { max-width: 17rem; margin: 0 auto; }
.wash, .wash2 { mix-blend-mode: multiply; opacity: .82; }
.pl-tab { font-family: var(--caps); font-size: 9px; letter-spacing: .05em; }
.pl-lat { font-family: var(--head); font-style: italic; font-size: 10.5px; }
.pl-name { font-family: var(--caps); font-size: 7.5px; letter-spacing: .12em; }
.ptr-q { font: 10px var(--head); fill: var(--ink); }
.note { font-size: .95rem; color: var(--ink-soft); }
.hand { color: var(--rubric); margin-right: .25em; }
.row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
button {
  font: inherit; color: var(--ink); background: rgba(239,226,196,.6); cursor: pointer;
  border: 2px solid var(--ink); border-radius: 3px; padding: .45rem .9rem; min-height: 44px;
}
button:hover { box-shadow: 0 0 0 3px rgba(168,50,42,.18); }
button:focus-visible { outline: 3px solid var(--rubric); outline-offset: 2px; }
button[aria-pressed="true"] { border-color: var(--rubric); color: var(--rubric); box-shadow: 0 0 0 3px rgba(168,50,42,.22); }
.moods { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.moods button { padding: 4px 4px 6px; display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: .9rem; }
.moods svg { width: 100%; height: auto; }
.then { display: grid; grid-template-columns: 5.5rem 1fr; gap: 12px; align-items: center; border: 1px dashed rgba(59,42,30,.45); padding: 10px; }
.then svg { width: 100%; height: auto; display: block; }
.then .wide svg { width: 100%; }
.then.scale { grid-template-columns: 1fr; }
.scales { display: flex; flex-direction: column; gap: 4px; }
.scale2 { width: 100%; height: auto; }
.pointer2 { transition: transform .7s cubic-bezier(.3,1.45,.5,1); }
.groove { transition: x .7s ease, width .7s ease; }
ol.q { margin: 0; padding-left: 1.4rem; display: flex; flex-direction: column; gap: .6rem; }
ol.q li::marker { font-family: var(--head); color: var(--rubric); }
.sig { font-family: var(--head); font-style: italic; color: var(--ink-soft); text-align: right; }
@media (prefers-reduced-motion: reduce) { .pointer2, .groove { transition: none; } }
</style>`;

const H = scale2SVG('H', { pointer: 2, target: 3 });
const S = scale2SVG('S', { pointer: -1, target: -2 });
const W = scale2SVG('W', { pointer: 0, target: 1 });
const moods = ['neutral', 'happy', 'worried'];

const body = `${FILTER_DEFS}
<main class="page">
  <header class="leaf">
    <p class="kicker">Take Two Toads · M2 · art test</p>
    <h1>The look of the finished book</h1>
    <p class="lead"><span class="initial">T</span>hree drawings in the style planned for the finished game: a plant plate, Old Hessa and the brass scales. Each one has the prototype drawing under it, so you can compare. Look at them on your phone, then answer the three questions at the end.</p>
  </header>

  <div class="rule" role="separator"><span>❧</span></div>

  <section class="leaf" aria-labelledby="h-plate">
    <h2 id="h-plate"><span class="num">I.</span>A botanical plate</h2>
    <p>Ink lines now swell and thin like a quill's, shade is cross-hatched, and the colour is a watercolour wash that misses the line a little, with paper showing through.</p>
    <div id="plate">${emberrootPlate()}</div>
    <div class="row"><button type="button" id="quill"><span class="hand">☞</span>Watch the quill draw it</button></div>
    <div class="then"><div>${plantSVG('emberroot')}</div><p class="note">The prototype's Emberroot, for comparison.</p></div>
  </section>

  <div class="rule" role="separator"><span>❧</span></div>

  <section class="leaf" aria-labelledby="h-hessa">
    <h2 id="h-hessa"><span class="num">II.</span>Old Hessa</h2>
    <p>The first customer, a kind widow with a cold cough. Villagers are the riskiest part of the art, so she is drawn as a simple woodcut. Tap a face to see her three moods.</p>
    <div id="bust">${moods.map((m, i) => `<div data-mood="${m}"${i ? ' hidden' : ''}>${hessaBust(m)}</div>`).join('')}</div>
    <div class="moods" role="group" aria-label="Hessa's mood">
      ${moods.map((m, i) => `<button type="button" data-mood="${m}" aria-pressed="${i === 0}">${hessaBust(m)}<span>${m[0].toUpperCase() + m.slice(1)}</span></button>`).join('')}
    </div>
    <div class="then"><div>${bustSVG('hessa')}</div><p class="note">The prototype's Hessa, for comparison.</p></div>
  </section>

  <div class="rule" role="separator"><span>❧</span></div>

  <section class="leaf" aria-labelledby="h-scales">
    <h2 id="h-scales"><span class="num">III.</span>The brass scales</h2>
    <p>Heat, Spirit and Weight, each with its own shape in the round badge as well as its own colour. The plumb is where the brew is now; the gold diamond is where the cure needs it. Drop an ingredient in to see the Heat plumb swing.</p>
    <div class="scales">${H}${S}${W}</div>
    <div class="row">
      <button type="button" data-add="2"><span class="hand">☞</span>Add Emberroot</button>
      <button type="button" data-add="-2"><span class="hand">☞</span>Add Frostmint</button>
    </div>
    <div class="then scale"><div class="wide">${scaleSVG('H')}</div><p class="note">The prototype's Heat scale, for comparison.</p></div>
  </section>

  <div class="rule" role="separator"><span>❧</span></div>

  <section class="leaf" aria-labelledby="h-q">
    <h2 id="h-q"><span class="num">IV.</span>Three questions</h2>
    <ol class="q">
      <li>Does it all look like one hand-made book, or does something stand out as wrong?</li>
      <li>Does Hessa look warm and alive, or stiff?</li>
      <li>On the scales, can you see at a glance where the plumb is and where it should go?</li>
    </ol>
    <p>Answer in the chat, for example "1 yes, 2 a bit stiff, 3 yes". Anything else you would change is welcome too: colours, line thickness, how busy it looks.</p>
    <p class="note">The fonts come from Google Fonts on this test page only. The game itself will carry its own copy, so it keeps working offline.</p>
    <p class="sig">Drawn in code, no images. Nothing traced.</p>
  </section>
</main>
<script>
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Quill: ink lines draw themselves, then brush strokes, lettering and washes fade in.
  document.getElementById('quill').addEventListener('click', () => {
    const svg = document.querySelector('#plate svg');
    if (!svg || reduce) return;
    const lines = [...svg.querySelectorAll('.ink2 path')].filter(p => !p.closest('clipPath') && !p.classList.contains('brush'));
    const fades = [...svg.querySelectorAll('.ink2 .brush, .ink2 text, .ink2 circle')];
    const wash = svg.querySelector('.wash2');
    lines.forEach(p => { const L = p.getTotalLength(); p.style.transition = 'none'; p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
    fades.forEach(e => { e.style.transition = 'none'; e.style.opacity = 0; });
    wash.style.transition = 'none'; wash.style.opacity = 0;
    svg.getBoundingClientRect();
    lines.forEach((p, i) => { p.style.transition = 'stroke-dashoffset 1.1s ease ' + (i / lines.length * 1.6).toFixed(2) + 's'; p.style.strokeDashoffset = 0; });
    fades.forEach(e => { e.style.transition = 'opacity .6s ease 1.4s'; e.style.opacity = ''; });
    wash.style.transition = 'opacity 1.2s ease 2s'; wash.style.opacity = '';
  });

  // Hessa's moods
  document.querySelectorAll('.moods button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.moods button').forEach(x => x.setAttribute('aria-pressed', x === b));
    document.querySelectorAll('#bust > div').forEach(d => { d.hidden = d.dataset.mood !== b.dataset.mood; });
  }));

  // Heat plumb
  let heat = 2;
  const X = v => ${scale2X(0)} + v * ${scale2X(1) - scale2X(0)};
  const ptr = document.querySelector('.pointer2[data-k="H"]');
  const groove = ptr && ptr.closest('svg').querySelector('.groove');
  document.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => {
    heat = Math.max(-5, Math.min(5, heat + Number(b.dataset.add)));
    ptr.style.transform = 'translateX(' + (X(heat) - X(0)) + 'px)';
    if (groove) { groove.setAttribute('x', Math.min(X(0), X(heat))); groove.setAttribute('width', Math.abs(X(heat) - X(0))); }
  }));
})();
</script>`;

// Old prototype SVGs rely on page CSS for .wash; add the size classes they need.
const fixed = body.replace(/<svg class="(plate|bust|scale-svg)"/g, '<svg class="$1 art"').replace(/<svg class="(plate2|bust2|scale2)/g, '<svg class="art $1');

writeFileSync(join(root, 'art-test.html'), `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${head}\n</head><body>\n${fixed}\n</body></html>\n`);
console.log('wrote art-test.html');
if (process.argv[2]) { writeFileSync(process.argv[2], `${head}\n${fixed}\n`); console.log('wrote', process.argv[2]); }
