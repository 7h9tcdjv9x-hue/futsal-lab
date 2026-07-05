import { naviga } from './app.js';
import { registraSerie, ultimaVolta } from './storage.js';
import { slugEsercizio } from './util.js';
import { chiaveSeduta } from './oggi.js';

// ─── Helper: migliore serie (max kg, poi max reps) ───────────────────────────

function migliorSerieDi(serie) {
  if (!serie || serie.length === 0) return null;
  return serie.reduce((best, cur) => {
    if (cur.kg > best.kg) return cur;
    if (cur.kg === best.kg && cur.reps > best.reps) return cur;
    return best;
  });
}

// ─── Helper: formatta data ISO come "10 lug" ─────────────────────────────────

const MESI_BREVI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

function formatDataBreve(iso) {
  const [, mm, dd] = iso.split('-');
  return `${parseInt(dd, 10)} ${MESI_BREVI[parseInt(mm, 10) - 1]}`;
}

// ─── Implementazione principale ──────────────────────────────────────────────

export function apriSeduta(stato, voce) {
  const { store, oggi } = stato;
  const { pianoId, pianoNome, seduta, momento } = voce;

  const radice = document.getElementById('vista');
  radice.innerHTML = '';

  const chiave = chiaveSeduta(pianoId, seduta.codice ?? seduta.id);

  // ── Intestazione ──────────────────────────────────────────────────────────

  const header = document.createElement('div');
  header.className = 'eyebrow';

  const backLink = document.createElement('button');
  backLink.className = 'spento';
  backLink.textContent = '← Oggi';
  backLink.addEventListener('click', () => naviga('oggi'));
  header.appendChild(backLink);

  const titoloEl = document.createElement('span');
  titoloEl.className = 'primario';
  titoloEl.textContent = seduta.titolo;
  header.appendChild(titoloEl);

  if (pianoNome) {
    const pianoEl = document.createElement('span');
    pianoEl.className = 'secondario';
    pianoEl.textContent = pianoNome;
    header.appendChild(pianoEl);
  }

  if (momento) {
    const momentoEl = document.createElement('span');
    momentoEl.className = 'secondario';
    momentoEl.textContent = momento;
    header.appendChild(momentoEl);
  }

  radice.appendChild(header);

  // ── Seduta con sole voci ──────────────────────────────────────────────────

  if (seduta.voci && seduta.voci.length > 0) {
    const cardVoci = document.createElement('div');
    cardVoci.className = 'card';

    const lista = document.createElement('ul');
    for (const voceItem of seduta.voci) {
      const li = document.createElement('li');
      li.textContent = voceItem;
      lista.appendChild(li);
    }
    cardVoci.appendChild(lista);
    radice.appendChild(cardVoci);

    const btnCompleta = document.createElement('button');
    btnCompleta.className = 'primario';
    btnCompleta.textContent = 'Seduta completata';
    btnCompleta.addEventListener('click', () => {
      const sd = store.leggi('sedute', {});
      if (!sd[oggi]) sd[oggi] = {};
      sd[oggi][chiave] = true;
      store.scrivi('sedute', sd);
      naviga('oggi');
    });
    radice.appendChild(btnCompleta);
    return;
  }

  // ── Seduta con esercizi ───────────────────────────────────────────────────

  if (seduta.esercizi && seduta.esercizi.length > 0) {
    // Stato locale: serie correnti per ogni esercizio (array di {kg, reps})
    const seriePerEsercizio = [];

    for (let idx = 0; idx < seduta.esercizi.length; idx++) {
      const e = seduta.esercizi[idx];
      const slug = slugEsercizio(e.nome);
      const nSerie = e.serie ?? 3;

      // Recupera ultima volta (esclude oggi)
      const ultima = ultimaVolta(store, slug, oggi);

      // Recupera serie salvate oggi (se già presenti nel registro)
      const registroOggi = (() => {
        const reg = store.leggi('registro', {});
        const vociSlug = reg[slug] ?? [];
        const trovata = vociSlug.find(v => v.data === oggi && v.pianoId === pianoId);
        return trovata ? trovata.serie : null;
      })();

      // Pre-fill: priorità → serie salvate oggi; fallback → ultima volta
      let seriePrefill = [];
      if (registroOggi && registroOggi.length > 0) {
        seriePrefill = registroOggi;
      } else if (ultima && ultima.serie && ultima.serie.length > 0) {
        seriePrefill = ultima.serie;
      }

      // Stato locale per questo esercizio
      const righeCorrente = [];
      for (let s = 0; s < nSerie; s++) {
        righeCorrente.push({
          kg: seriePrefill[s] !== undefined ? seriePrefill[s].kg : '',
          reps: seriePrefill[s] !== undefined ? seriePrefill[s].reps : '',
        });
      }
      seriePerEsercizio.push(righeCorrente);

      // Card esercizio
      const card = document.createElement('div');
      card.className = 'card';

      // Nome
      const nomeEl = document.createElement('h3');
      nomeEl.className = 'primario';
      nomeEl.textContent = e.nome;
      card.appendChild(nomeEl);

      // Obiettivo serie × reps
      const obiettivoEl = document.createElement('span');
      obiettivoEl.className = 'secondario';
      obiettivoEl.textContent = `${nSerie} × ${e.reps ?? '?'} reps`;
      card.appendChild(obiettivoEl);

      // Note
      if (e.note) {
        const noteEl = document.createElement('p');
        noteEl.className = 'secondario';
        noteEl.textContent = e.note;
        card.appendChild(noteEl);
      }

      // Ultima volta
      const ultimaEl = document.createElement('p');
      ultimaEl.className = 'eyebrow';
      if (ultima && ultima.serie && ultima.serie.length > 0) {
        const best = migliorSerieDi(ultima.serie);
        if (best) {
          ultimaEl.textContent = `Ultima volta: ${best.kg} kg × ${best.reps} (${formatDataBreve(ultima.data)})`;
        } else {
          ultimaEl.textContent = 'Prima volta!';
        }
      } else {
        ultimaEl.textContent = 'Prima volta!';
      }
      card.appendChild(ultimaEl);

      // Righe input (kg, reps) — una per serie
      for (let s = 0; s < nSerie; s++) {
        const riga = document.createElement('div');
        riga.className = 'riga';

        const etichettaSerie = document.createElement('span');
        etichettaSerie.className = 'secondario';
        etichettaSerie.textContent = `Serie ${s + 1}`;
        riga.appendChild(etichettaSerie);

        const inputKg = document.createElement('input');
        inputKg.type = 'number';
        inputKg.min = 0;
        inputKg.max = 200;
        inputKg.step = 0.5;
        inputKg.placeholder = 'kg';
        const valKg = righeCorrente[s].kg;
        inputKg.value = valKg !== '' && valKg !== undefined && valKg !== null ? valKg : '';

        const inputReps = document.createElement('input');
        inputReps.type = 'number';
        inputReps.min = 0;
        inputReps.max = 100;
        inputReps.step = 1;
        inputReps.placeholder = 'reps';
        const valReps = righeCorrente[s].reps;
        inputReps.value = valReps !== '' && valReps !== undefined && valReps !== null ? valReps : '';

        // Salva su ogni change
        const salva = (campo, inputEl) => {
          inputEl.addEventListener('change', () => {
            const prev = righeCorrente[s][campo];
            const raw = inputEl.value.trim();
            const parsed = campo === 'kg' ? parseFloat(raw) : parseInt(raw, 10);
            const min = campo === 'kg' ? 0 : 0;
            const max = campo === 'kg' ? 200 : 100;

            if (raw === '' || isNaN(parsed) || parsed < min || parsed > max ||
                (campo === 'reps' && !Number.isInteger(parsed))) {
              // Input non valido: ripristina
              inputEl.value = prev ?? '';
              return;
            }

            righeCorrente[s][campo] = parsed;

            // Costruisci serie valide: reps deve essere un numero valido; kg può essere 0
            const serieValide = righeCorrente
              .filter(r => {
                const rReps = typeof r.reps === 'number' ? r.reps : parseInt(r.reps, 10);
                return !isNaN(rReps) && rReps >= 0 && rReps <= 100;
              })
              .map(r => {
                const rReps = typeof r.reps === 'number' ? r.reps : parseInt(r.reps, 10);
                const rKg = typeof r.kg === 'number' ? r.kg : parseFloat(r.kg);
                return { kg: isNaN(rKg) ? 0 : rKg, reps: rReps };
              });

            registraSerie(store, { slug, data: oggi, pianoId, serie: serieValide });
          });
        };

        salva('kg', inputKg);
        salva('reps', inputReps);

        riga.appendChild(inputKg);
        riga.appendChild(inputReps);
        card.appendChild(riga);
      }

      radice.appendChild(card);
    }
  }

  // ── Bottone "Seduta completata" ───────────────────────────────────────────

  const hasEsercizi = seduta.esercizi && seduta.esercizi.length > 0;
  const hasVoci = seduta.voci && seduta.voci.length > 0;

  if (!hasEsercizi && !hasVoci) {
    const msgEmpty = document.createElement('p');
    msgEmpty.textContent = 'Questa seduta non ha contenuti registrabili.';
    radice.appendChild(msgEmpty);
  }

  const btnCompleta = document.createElement('button');
  btnCompleta.className = 'primario';
  btnCompleta.textContent = 'Seduta completata';
  btnCompleta.addEventListener('click', () => {
    const sd = store.leggi('sedute', {});
    if (!sd[oggi]) sd[oggi] = {};
    sd[oggi][chiave] = true;
    store.scrivi('sedute', sd);
    naviga('oggi');
  });
  radice.appendChild(btnCompleta);
}
