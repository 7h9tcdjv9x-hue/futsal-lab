let _c = 0;

export const TIPI_CORSA = ['Continua/fondo', 'Ripetute', 'Scatti/velocità', 'Recupero', 'Bici'];

/**
 * calcolaRitmo(tempoMin, distanzaKm) → string
 * Ritorna "m:ss" se entrambi numeri > 0, altrimenti ''.
 */
export function calcolaRitmo(tempoMin, distanzaKm) {
  const t = Number(tempoMin);
  const d = Number(distanzaKm);
  if (!(t > 0) || !(d > 0)) return '';
  const totSecondi = Math.round((t / d) * 60);
  let m = Math.floor(totSecondi / 60);
  let s = totSecondi % 60;
  return m + ':' + String(s).padStart(2, '0');
}

/**
 * ritmoASecondi(ritmo) → number|null
 * Parse "m:ss"; malformato → null.
 */
export function ritmoASecondi(ritmo) {
  if (typeof ritmo !== 'string' || !ritmo) return null;
  const match = ritmo.match(/^(\d+):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * corsaValida(c) → boolean
 * Vera se tipo non vuoto O Number(tempoMin)>0 O Number(distanzaKm)>0.
 */
export function corsaValida(c) {
  if (!c) return false;
  if (c.tipo && String(c.tipo).trim()) return true;
  if (Number(c.tempoMin) > 0) return true;
  if (Number(c.distanzaKm) > 0) return true;
  return false;
}

/**
 * sincronizzaCorse(store, origine, corse) → void
 * Rimuove le corse con quell'origine, aggiunge quelle valide,
 * riordina per data, scrive fl:corse.
 */
export function sincronizzaCorse(store, origine, corse) {
  const esistenti = store.leggi('corse', []).filter(c => c.origine !== origine);
  const nuove = corse
    .filter(corsaValida)
    .map(c => {
      const id = 'c' + Date.now() + '_' + (++_c);
      const ritmo = (c.ritmo && String(c.ritmo).trim())
        ? c.ritmo
        : calcolaRitmo(c.tempoMin, c.distanzaKm);
      return { ...c, id, origine, ritmo };
    });
  const tutte = [...esistenti, ...nuove];
  tutte.sort((a, b) => (a.data ?? '').localeCompare(b.data ?? ''));
  store.scrivi('corse', tutte);
}

/**
 * rimuoviCorseDi(store, origine) → void
 */
export function rimuoviCorseDi(store, origine) {
  const corse = store.leggi('corse', []).filter(c => c.origine !== origine);
  store.scrivi('corse', corse);
}

/**
 * corseDelGiorno(store, iso) → array
 */
export function corseDelGiorno(store, iso) {
  return store.leggi('corse', []).filter(c => c.data === iso);
}

/**
 * formattaCorsa(corsa) → string
 * Campi presenti separati da " · ": tipo, "{tempoMin} min", "{distanzaKm} km", "{ritmo} /km".
 * Omette i vuoti.
 */
export function formattaCorsa(corsa) {
  const parti = [];
  if (corsa.tipo && String(corsa.tipo).trim()) parti.push(corsa.tipo);
  if (Number(corsa.tempoMin) > 0) parti.push(corsa.tempoMin + ' min');
  if (Number(corsa.distanzaKm) > 0) parti.push(corsa.distanzaKm + ' km');
  if (corsa.ritmo && String(corsa.ritmo).trim()) parti.push(corsa.ritmo + ' /km');
  return parti.join(' · ');
}
