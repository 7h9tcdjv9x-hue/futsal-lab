import { slugEsercizio, giornoSettimana } from './util.js';
import { CALENDARIO, SEDUTE } from './programma.js';

export const TIPI_PIANO = ['allenamento', 'tecnica', 'alimentare'];

export function validaPiano(obj) {
  if (obj?.formato !== 'futsal-lab-piano@1') return { ok: false, errore: 'Formato non riconosciuto (atteso futsal-lab-piano@1).' };
  if (typeof obj.nome !== 'string' || !obj.nome.trim()) return { ok: false, errore: 'Nome piano mancante.' };
  if (!TIPI_PIANO.includes(obj.tipo)) return { ok: false, errore: `Tipo non valido: ${obj.tipo}.` };
  const piano = { id: slugEsercizio(obj.nome), nome: obj.nome.trim(), tipo: obj.tipo, stato: 'attivo', origine: 'import' };
  if (obj.tipo === 'alimentare') {
    if (!Array.isArray(obj.pasti) || !obj.pasti.length) return { ok: false, errore: 'Un piano alimentare deve avere almeno un pasto.' };
    piano.pasti = obj.pasti.map(p => ({ titolo: String(p.titolo ?? ''), voci: (p.voci ?? []).map(String) }));
    return { ok: true, piano };
  }
  if (!Array.isArray(obj.sedute) || !obj.sedute.length) return { ok: false, errore: 'Il piano non contiene sedute.' };
  piano.sedute = [];
  for (const [i, s] of obj.sedute.entries()) {
    if (typeof s.titolo !== 'string' || !s.titolo.trim()) return { ok: false, errore: `Seduta ${i + 1}: titolo mancante.` };
    const giorni = (s.giorni ?? []).filter(g => Number.isInteger(g) && g >= 0 && g <= 6);
    const date = (s.date ?? []).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
    if (!giorni.length && !date.length) return { ok: false, errore: `Seduta ${i + 1}: indica almeno un giorno della settimana o una data.` };
    const esercizi = (s.esercizi ?? []).map(e => ({ nome: String(e.nome ?? '').trim(), serie: Number(e.serie) || 1, reps: String(e.reps ?? ''), note: e.note ? String(e.note) : undefined }));
    if (esercizi.some(e => !e.nome)) return { ok: false, errore: `Seduta ${i + 1}: esercizio senza nome.` };
    piano.sedute.push({ id: s.id ?? `${piano.id}-s${i + 1}`, titolo: s.titolo.trim(), giorni, date, esercizi, voci: (s.voci ?? []).map(String) });
  }
  return { ok: true, piano };
}

export const pianiAttivi = piani => piani.filter(p => p.stato === 'attivo');

export function sedutePerGiorno(piani, iso) {
  const out = [];
  for (const p of pianiAttivi(piani)) {
    if (p.id === 'programma-2026') {
      if (iso < '2026-08-23') for (const [codice, momento] of CALENDARIO[iso] ?? [])
        if (SEDUTE[codice]) out.push({ pianoId: p.id, pianoNome: p.nome, seduta: SEDUTE[codice], momento });
      continue;
    }
    if (p.tipo === 'alimentare') continue;
    for (const s of p.sedute ?? [])
      if (s.date?.includes(iso) || s.giorni?.includes(giornoSettimana(iso)))
        out.push({ pianoId: p.id, pianoNome: p.nome, seduta: s });
  }
  return out.sort((a, b) => (a.pianoId === 'programma-2026' ? -1 : 1) - (b.pianoId === 'programma-2026' ? -1 : 1));
}

export function suggerisciUnificazioni(piano, slugNoti) {
  const sugg = [];
  for (const s of piano.sedute ?? []) for (const e of s.esercizi ?? []) {
    const slug = slugEsercizio(e.nome);
    if (slugNoti.includes(slug)) continue;
    const simile = slugNoti.find(n => n.includes(slug) || slug.includes(n));
    if (simile && !sugg.some(x => x.da === slug)) sugg.push({ da: slug, a: simile });
  }
  return sugg;
}

export function esportaPiano(piano) {
  const { id, stato, origine, ...resto } = piano;
  return JSON.stringify({ formato: 'futsal-lab-piano@1', ...resto }, null, 2);
}
