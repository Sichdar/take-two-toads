// The step-by-step start (Phase 3): one new scale per day, so each lesson comes alone.
// Days not listed here play normally. Only games started with the tutorial on use it.
// scales: the scales shown that day (herbs that act on other scales stay off the shelf).
// queue: who comes, in order, after yesterday's flops. fill: top the day up with random visitors.
// newScale: the scale that slides in that day.
export const TUTORIAL = {
  1: { scales: ['H'], queue: ['chillcough', 'kettlehead'], fill: false },
  2: { scales: ['H', 'S'], queue: ['jitters', 'chillcough', 'gloom'], fill: false, newScale: 'S' },
  3: { scales: ['H', 'S', 'W'], queue: ['floatingbread'], fill: true, newScale: 'W' },
};

// Ailments whose need the margin note tells you, so their gold mark shows from the start.
export const TUTORIAL_KNOWN = ['chillcough', 'kettlehead'];
