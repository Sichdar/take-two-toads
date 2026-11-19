# Scales & Simples

A cozy apothecary puzzle for phones. Villagers of Little Wendle bring odd ailments: bread that floats, a heart that's too heavy, a knight afraid of geese. Read their complaints, work out what they need, and balance three brass scales (**Heat**, **Spirit**, **Weight**) with herbs whose effects you discover by brewing.

**Play:** https://sichdar.github.io/scales-and-simples/ (works offline once loaded; add it to your home screen)

Free, no ads, no purchases, no tracking. Your game is saved only on your device.

## Status
Prototype `0.1.0` (milestone M1): one full day loop (morning → 5 customers → evening market → next day), hidden ingredient values worked out by the herbal, quality stars, flops with clues, levels 1–3 content, save and export code. The art is a first test of the "living herbal" look; fonts, sound and the full tutorial come later.

## How it's built
Plain JavaScript modules, HTML and SVG. No framework and no build step: the files in this repo are the game.

| Folder | What's in it |
|---|---|
| `data/` | Facts: ingredients, ailments, villagers, balance numbers |
| `lang/` | Every line of text, by key |
| `logic/` | The rules as pure functions (no screen), tested with Node |
| `ui/` | Screens, taps and the art drawn in code |
| `tests/` | Automatic tests |
| `tools/` | Recipe check, icon maker, local test server |

```
node --test tests/          # run the rule tests
node tools/check-recipes.js # check every ailment can be brewed perfectly
node tools/serve.js         # play locally at http://localhost:8080
```

Add `?debug=1` to the address for a small test panel.

## Licences
- Code: [MIT](LICENSE)
- Art, music and writing: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- See [CREDITS.md](CREDITS.md)

Every herb in this game is imaginary. For real illness, see a real healer.
