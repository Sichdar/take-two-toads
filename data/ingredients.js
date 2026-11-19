// Every ingredient in the game. Values are per scale: H = Heat, S = Spirit, W = Weight.
// level = reputation level that unlocks it. source: where it normally comes from.
// art: seed + kind + wash colour for the code-drawn botanical plate.
export const INGREDIENTS = [
  { id: 'emberroot',    level: 1, values: { H: 2 },         source: 'garden', price: 2, art: { seed: 11, kind: 'root',     wash: '#C9962E' } },
  { id: 'lullwort',     level: 1, values: { S: -2 },        source: 'garden', price: 2, art: { seed: 23, kind: 'herb',     wash: '#8B8FBF' } },
  { id: 'stonecap',     level: 1, values: { W: 2 },         source: 'garden', price: 2, art: { seed: 37, kind: 'mushroom', wash: '#8C7A62' } },
  { id: 'frostmint',    level: 1, values: { H: -2 },        source: 'mags',   price: 2, art: { seed: 41, kind: 'herb',     wash: '#8FB9B0' } },
  { id: 'nettlespark',  level: 1, values: { S: 2 },         source: 'mags',   price: 2, art: { seed: 53, kind: 'nettle',   wash: '#B5B84A' } },
  { id: 'thistledown',  level: 1, values: { W: -2 },        source: 'mags',   price: 2, art: { seed: 67, kind: 'thistle',  wash: '#B9A6CF' } },
  { id: 'leadroot',     level: 2, values: { W: 2, S: -1 },  source: 'mags',   price: 6, art: { seed: 71, kind: 'root',     wash: '#77767E' } },
  { id: 'sunpetal',     level: 2, values: { H: 1, S: 1 },   source: 'mags',   price: 6, art: { seed: 83, kind: 'flower',   wash: '#E0B83A' } },
  { id: 'moonmoss',     level: 2, values: { H: -1, S: -1 }, source: 'mags',   price: 6, art: { seed: 97, kind: 'moss',     wash: '#8A9BB0' } },
  { id: 'featherfern',  level: 3, values: { W: -3 },        source: 'mags',   price: 7, art: { seed: 101, kind: 'fern',    wash: '#6F9A6A' } },
  { id: 'owlseye',      level: 3, values: { S: -3, W: 1 },  source: 'mags',   price: 8, art: { seed: 113, kind: 'berry',   wash: '#6D3B5A' } },
  { id: 'dragonpepper', level: 3, values: { H: 3, S: 1 },   source: 'mags',   price: 8, art: { seed: 127, kind: 'pepper',  wash: '#A8322A' } },
  { id: 'goosedown',    level: 5, values: { W: -1 },        source: 'story',  price: 0, art: { seed: 131, kind: 'feather', wash: '#B9B4A8' } },
];

export const INGREDIENT_BY_ID = Object.fromEntries(INGREDIENTS.map(i => [i.id, i]));
