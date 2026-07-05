// ─── foto.js — IndexedDB per le foto progressi ───────────────────────────────
// DB: futsal-lab v1 · store: foto · keyPath: id (autoIncrement)
// Ogni record: { id, data, nota?, blob }

const DB_NOME = 'futsal-lab';
const DB_VERSION = 1;
const STORE = 'foto';

// Guard: Node.js non ha indexedDB
function apriDB() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('indexedDB non disponibile in questo ambiente'));
  }
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NOME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

/**
 * Salva una foto nel database.
 * @param {Blob} blob  — il file immagine
 * @param {string} iso — data ISO (es. '2026-07-04')
 * @param {string} [nota] — nota opzionale
 * @returns {Promise<number>} id generato
 */
export function salvaFoto(blob, iso, nota) {
  return apriDB().then(db => new Promise((resolve, reject) => {
    const record = { data: iso, blob };
    if (nota !== undefined && nota !== null && nota !== '') record.nota = nota;
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).add(record);
    let generatedId;
    req.onsuccess = e => { generatedId = e.target.result; };
    tx.oncomplete = () => resolve(generatedId);
    tx.onerror = e => reject(e.target.error);
    tx.onabort = () => reject(new Error('Transazione annullata'));
  }));
}

/**
 * Restituisce l'elenco delle foto (senza blob), ordinate per data asc.
 * @returns {Promise<Array<{id:number, data:string, nota?:string}>>}
 */
export function elencoFoto() {
  return apriDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = e => {
      const lista = (e.target.result || []).map(({ id, data, nota }) => {
        const item = { id, data };
        if (nota !== undefined) item.nota = nota;
        return item;
      });
      lista.sort((a, b) => a.data.localeCompare(b.data) || a.id - b.id);
      resolve(lista);
    };
    req.onerror = e => reject(e.target.error);
  }));
}

/**
 * Restituisce un objectURL per il blob della foto, o null se non trovata.
 * @param {number} id
 * @returns {Promise<string|null>}
 */
export function urlFoto(id) {
  return apriDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = e => {
      const record = e.target.result;
      if (!record || !record.blob) { resolve(null); return; }
      resolve(URL.createObjectURL(record.blob));
    };
    req.onerror = e => reject(e.target.error);
  }));
}

/**
 * Elimina una foto dal database.
 * @param {number} id
 * @returns {Promise<void>}
 */
export function eliminaFoto(id) {
  return apriDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e.target.error);
    tx.onabort = () => reject(new Error('Transazione annullata'));
  }));
}
