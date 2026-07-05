// ─── whoop.js ──────────────────────────────────────────────────────────────────
// Logica Whoop: consiglio del giorno + fascia di recupero

/**
 * Restituisce la fascia cromatica per un valore di recupero.
 * @param {number|null} r
 * @returns {'verde'|'giallo'|'rosso'|null}
 */
export function fasciaRecupero(r) {
  if (r == null || Number.isNaN(r)) return null;
  if (r >= 67) return 'verde';
  if (r >= 34) return 'giallo';
  return 'rosso';
}

/**
 * Restituisce il consiglio del giorno basato sul recupero Whoop.
 * @param {number|null} recupero
 * @returns {{colore:'verde'|'giallo'|'rosso', testo:string}|null}
 */
export function consiglioGiorno(recupero) {
  if (recupero == null || Number.isNaN(recupero)) return null;
  if (recupero >= 67) return { colore: 'verde', testo: 'Recupero alto: oggi puoi spingere.' };
  if (recupero >= 34) return { colore: 'giallo', testo: 'Recupero medio: allenati, punta sulla qualità.' };
  return { colore: 'rosso', testo: 'Recupero basso: oggi meglio leggero o REC. Ascolta il corpo.' };
}

/**
 * Sincronizza i dati Whoop dal worker remoto.
 * @param {object} store
 * @returns {Promise<'ok'|'non-configurato'|'errore'|'non-collegato'>}
 */
export async function sincronizza(store) {
  const p = store.leggi('whoopPonte', {});
  if (!p.urlWorker || !p.chiaveAccesso) return 'non-configurato';
  try {
    const r = await fetch(`${p.urlWorker.replace(/\/$/, '')}/dati-recenti`, { headers: { Authorization: `Bearer ${p.chiaveAccesso}` } });
    if (r.status === 409) return 'non-collegato';
    if (!r.ok) return 'errore';
    const { giorni } = await r.json();
    const w = store.leggi('whoop', {});
    for (const [iso, dati] of Object.entries(giorni)) {
      if (w[iso]?.fonte === 'manuale') continue;
      w[iso] = { ...w[iso], ...dati, fonte: 'sync' };
    }
    store.scrivi('whoop', w);
    p.ultimaSync = new Date().toISOString();
    store.scrivi('whoopPonte', p);
    return 'ok';
  } catch { return 'errore'; }
}
