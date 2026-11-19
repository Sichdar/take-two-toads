// Every ailment. target: the scale values the potion must reach (only these scales count).
// villager: who usually brings it. Text lives in lang/en.js under ail.<id>.
export const AILMENTS = [
  { id: 'chillcough',   level: 1, target: { H: 2 },                villager: 'hessa' },
  { id: 'jitters',      level: 1, target: { S: -2 },               villager: 'tamsin' },
  { id: 'gloom',        level: 1, target: { S: 2 },                villager: 'hobb' },
  { id: 'floatingbread',level: 1, target: { W: 4 },                villager: 'bram' },
  { id: 'leadenlegs',   level: 1, target: { W: -2 },               villager: 'nell' },
  { id: 'fever',        level: 2, target: { H: -3 },               villager: 'nell' },
  { id: 'beehead',      level: 2, target: { S: -3 },               villager: 'tamsin' },
  { id: 'blueness',     level: 2, target: { H: 2, W: -2 },         villager: 'mayor' },
  { id: 'gooseterror',  level: 3, target: { S: -2, W: 1 },         villager: 'pellam' },
  { id: 'bakersdouble', level: 3, target: { S: -2, W: 3 },         villager: 'bram' },
  { id: 'finale',       level: 5, target: { H: 3, S: -2, W: -3 },  villager: 'goose', story: true },
];

export const AILMENT_BY_ID = Object.fromEntries(AILMENTS.map(a => [a.id, a]));
