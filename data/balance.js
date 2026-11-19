// All balance numbers in one place (Phase 5). Change numbers here, not in the code.
export const BALANCE = {
  scaleMin: -5,
  scaleMax: 5,
  customersPerDay: 5,
  startCoins: 10,
  startShelf: { emberroot: 3, lullwort: 3, stonecap: 3, frostmint: 2, nettlespark: 2, thistledown: 2 },
  startBeds: ['emberroot', 'lullwort', 'stonecap'],
  harvestPerBed: 2,
  wrenThreshold: 6,          // Wren's free bundle if the shelf has fewer than this
  wrenBundle: 2,
  cauldronSlots: 4,
  // Reputation needed (total) for each level, index = level - 1.
  levels: [0, 30, 100, 190, 280],
  repPerStars: [0, 1, 2, 3], // flop, ★, ★★, ★★★
  // Price = base + perScale × (number of target scales).
  priceBase: 4,
  pricePerScale: 3,
  tipShare: 0.5,             // ★★★ tip
  // Off-by → stars. 0 off = 3 stars, 1 = 2, 2 = 1, 3+ = flop (0).
  starsByOff: [3, 2, 1],
  upgrades: [
    { id: 'bed4',  cost: 40,  kind: 'bed', grows: 'frostmint' },
    { id: 'bed5',  cost: 80,  kind: 'bed', grows: 'nettlespark' },
    { id: 'slot5', cost: 120, kind: 'slot' },
  ],
  newerAilmentWeight: 2,     // ailments from the current level are this much more likely
  maxRecords: 300,
};
