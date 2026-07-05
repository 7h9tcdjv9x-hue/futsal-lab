import { giorniTra } from './util.js';

// ─── trendPeso ────────────────────────────────────────────────────────────────
// Least-squares slope (kg/day) over entries within the last 28 days from the
// last entry's date, multiplied by 7 to get kg/week, rounded to 0.05.
// Returns null if fewer than 2 points in that window.
export function trendPeso(pesi) {
  if (!pesi || pesi.length < 2) return null;

  const sorted = [...pesi].sort((a, b) => a.data.localeCompare(b.data));
  const ultima = sorted[sorted.length - 1].data;

  const finestra = sorted.filter(p => giorniTra(p.data, ultima) <= 28);
  if (finestra.length < 2) return null;

  // Convert to (x=giorni since first in window, y=kg)
  const x0 = finestra[0].data;
  const xs = finestra.map(p => giorniTra(x0, p.data));
  const ys = finestra.map(p => p.kg);
  const n = xs.length;
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((s, x, i) => s + (x - xMean) * (ys[i] - yMean), 0);
  const den = xs.reduce((s, x) => s + (x - xMean) ** 2, 0);
  if (den === 0) return null;

  const slopePerDay = num / den;
  const slopePerWeek = slopePerDay * 7;

  // Round to nearest 0.05
  return Math.round(slopePerWeek / 0.05) * 0.05;
}

// ─── bandaObiettivo ───────────────────────────────────────────────────────────
// ancora = first entry with data >= '2026-07-09', else the first entry overall.
// Returns null if no entries.
export function bandaObiettivo(pesi) {
  if (!pesi || pesi.length === 0) return null;

  const sorted = [...pesi].sort((a, b) => a.data.localeCompare(b.data));
  const SOGLIA = '2026-07-09';
  const dopoSoglia = sorted.filter(p => p.data >= SOGLIA);
  const ancora = dopoSoglia.length > 0 ? dopoSoglia[0] : sorted[0];

  return { ancora, min: 0.25, max: 0.5 };
}

// ─── migliorSerie ─────────────────────────────────────────────────────────────
// Best {kg, reps}: max kg first, tie-break by max reps.
// Input: array of {kg, reps} objects (already flattened serie entries).
export function migliorSerie(voci) {
  if (!voci || voci.length === 0) return null;
  return voci.reduce((best, v) => {
    if (v.kg > best.kg) return v;
    if (v.kg === best.kg && v.reps > best.reps) return v;
    return best;
  });
}

// ─── mediaSettimanale ─────────────────────────────────────────────────────────
// Input: {isoDate: number} map
// Output: [{settimana: ISO Monday of that week, media: rounded to 1 decimal}] sorted
export function mediaSettimanale(mappa) {
  const settimane = {};

  for (const [iso, valore] of Object.entries(mappa)) {
    const d = new Date(iso + 'T12:00:00');
    // Get Monday of the week (0=Sun,1=Mon,...,6=Sat in JS)
    const dow = d.getDay(); // 0=Sun
    const diffToMon = dow === 0 ? -6 : 1 - dow;
    const lun = new Date(d);
    lun.setDate(d.getDate() + diffToMon);
    const lunISO = lun.toISOString().slice(0, 10);

    if (!settimane[lunISO]) settimane[lunISO] = [];
    settimane[lunISO].push(valore);
  }

  return Object.entries(settimane)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([settimana, valori]) => ({
      settimana,
      media: Math.round((valori.reduce((s, v) => s + v, 0) / valori.length) * 10) / 10,
    }));
}

// ─── testInRitardo ────────────────────────────────────────────────────────────
// Returns true if fl:test is empty or last test >= 21 days ago,
// BUT only if there's at least one weight or session in the store
// (to avoid nagging a fresh install).
export function testInRitardo(store, oggi) {
  const peso = store.leggi('peso', []);
  const registro = store.leggi('registro', {});
  const haDati = peso.length > 0 || Object.keys(registro).length > 0;
  if (!haDati) return false;

  const test = store.leggi('test', []);
  if (test.length === 0) return true;

  const sorted = [...test].sort((a, b) => a.data.localeCompare(b.data));
  const ultimaData = sorted[sorted.length - 1].data;
  return giorniTra(ultimaData, oggi) >= 21;
}
