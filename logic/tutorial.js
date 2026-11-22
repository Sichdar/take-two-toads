// Which scales and herbs the step-by-step start shows on a given day.
import { TUTORIAL } from '../data/tutorial.js';
import { INGREDIENT_BY_ID } from '../data/ingredients.js';
import { SCALES } from './brew.js';

export function tutorialDay(state, day = state.day) {
  return state && state.tutorial ? TUTORIAL[day] || null : null;
}

export function visibleScales(state, day = state.day) {
  const plan = tutorialDay(state, day);
  return plan ? plan.scales : SCALES;
}

// An herb is shown only if every scale it moves is shown.
export function ingredientShown(state, id, day = state.day) {
  const ing = INGREDIENT_BY_ID[id];
  if (!ing) return false;
  const shown = visibleScales(state, day);
  return SCALES.every(k => !ing.values[k] || shown.includes(k));
}
