const PREFISSO = 'fl:';
export function creaStore(backend = globalThis.localStorage) {
  return {
    leggi(chiave, def) { const v = backend.getItem(PREFISSO + chiave); return v == null ? def : JSON.parse(v); },
    scrivi(chiave, val) { backend.setItem(PREFISSO + chiave, JSON.stringify(val)); },
  };
}
export const CHIAVI_BACKUP = ['profilo', 'piani', 'sedute', 'registro', 'abitudini', 'peso', 'whoop', 'whoopPonte', 'test', 'stagione', 'meta'];
export function esportaBackup(store) {
  const dati = {};
  for (const k of CHIAVI_BACKUP) dati[k] = store.leggi(k, null);
  return { formato: 'futsal-lab-backup@1', esportatoIl: new Date().toISOString(), dati };
}
export function importaBackup(store, obj) {
  if (obj?.formato !== 'futsal-lab-backup@1') throw new Error('Formato backup non riconosciuto');
  const ARRAY_KEYS = ['piani', 'peso', 'test'];
  const OBJECT_KEYS = ['sedute', 'registro', 'abitudini', 'whoop', 'whoopPonte', 'stagione', 'meta', 'profilo'];
  // Validate all keys before writing anything
  for (const k of CHIAVI_BACKUP) {
    const v = obj.dati?.[k];
    if (v == null) continue;
    if (ARRAY_KEYS.includes(k) && !Array.isArray(v))
      throw new Error('campo "' + k + '" corrotto');
    if (OBJECT_KEYS.includes(k) && (typeof v !== 'object' || v === null || Array.isArray(v)))
      throw new Error('campo "' + k + '" corrotto');
  }
  for (const k of CHIAVI_BACKUP) if (obj.dati?.[k] != null) store.scrivi(k, obj.dati[k]);
}
export function registraSerie(store, { slug, data, pianoId, serie }) {
  const reg = store.leggi('registro', {});
  const voci = (reg[slug] ?? []).filter(v => !(v.data === data && v.pianoId === pianoId));
  voci.push({ data, pianoId, serie });
  voci.sort((a, b) => a.data.localeCompare(b.data));
  reg[slug] = voci;
  store.scrivi('registro', reg);
}
export function ultimaVolta(store, slug, dataEsclusa) {
  const voci = (store.leggi('registro', {})[slug] ?? []).filter(v => v.data !== dataEsclusa);
  return voci.length ? voci[voci.length - 1] : null;
}
