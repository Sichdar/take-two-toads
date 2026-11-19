// Saving on the device, with a backup slot, versioned upgrades and a checked export code.
import { SAVE_VERSION } from './state.js';

export const SAVE_KEY = 'scales-and-simples.save';
export const BACKUP_KEY = 'scales-and-simples.save.backup';

// Old save layouts are converted one step at a time: MIGRATIONS[1] turns v1 into v2, etc.
const MIGRATIONS = {};

export function migrate(data) {
  let d = data;
  while (d.saveVersion < SAVE_VERSION) {
    const step = MIGRATIONS[d.saveVersion];
    if (!step) throw new Error(`No migration from save version ${d.saveVersion}`);
    d = step(d);
  }
  return d;
}

function valid(d) {
  return d && typeof d === 'object' && typeof d.saveVersion === 'number' && typeof d.day === 'number' && d.shelf && Array.isArray(d.queue);
}

function parse(text) {
  if (!text) return null;
  try {
    const d = JSON.parse(text);
    return valid(d) ? migrate(d) : null;
  } catch {
    return null;
  }
}

export function saveGame(storage, state) {
  try {
    const prev = storage.getItem(SAVE_KEY);
    if (prev) storage.setItem(BACKUP_KEY, prev);
    storage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

// Loads the save; if it is damaged, falls back to the backup slot.
export function loadGame(storage) {
  try {
    return parse(storage.getItem(SAVE_KEY)) || parse(storage.getItem(BACKUP_KEY));
  } catch {
    return null;
  }
}

export function clearGame(storage) {
  try { storage.removeItem(SAVE_KEY); storage.removeItem(BACKUP_KEY); } catch { /* ignore */ }
}

// --- export code: base64 of the save plus a short check code --------------
function checksum(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (Math.imul(h, 33) ^ str.charCodeAt(i)) >>> 0;
  return h.toString(36).padStart(7, '0').slice(-7);
}

function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(b64) {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function exportCode(state) {
  const body = toBase64(JSON.stringify(state));
  return `SS1.${body}.${checksum(body)}`;
}

// Returns the state, or null if the code is mistyped or damaged.
export function importCode(code) {
  try {
    const parts = String(code).trim().replace(/\s+/g, '').split('.');
    if (parts.length !== 3 || parts[0] !== 'SS1') return null;
    if (checksum(parts[1]) !== parts[2]) return null;
    return parse(fromBase64(parts[1]));
  } catch {
    return null;
  }
}
