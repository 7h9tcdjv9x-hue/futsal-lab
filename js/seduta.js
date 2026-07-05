import { naviga } from './app.js';
import { registraSerie, ultimaVolta as _ultimaVolta } from './storage.js';
import { slugEsercizio as _slugEsercizio } from './util.js';
import { chiaveSeduta } from './oggi.js';
import { icona } from './icone.js';

// Re-export per uso in oggi.js (read-only, API invariate)
export { _ultimaVolta as ultimaVolta, _slugEsercizio as slugEsercizio };

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

  // ── Intestazione iOS ──────────────────────────────────────────────────────

  const header = document.createElement('div');
  header.style.cssText = 'margin-bottom:16px;';

  // Riga: frecciaSinistra + testo "Oggi" (bottone testo)
  const backBtn = document.createElement('button');
  backBtn.className = 'secondario';
  backBtn.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:6px 10px;font-size:15px;margin-bottom:8px;background:none;color:var(--accento);';
  backBtn.appendChild(icona('frecciaSinistra', 17));
  const backTesto = document.createElement('span');
  backTesto.textContent = 'Oggi';
  backBtn.appendChild(backTesto);
  backBtn.addEventListener('click', () => naviga('oggi'));
  header.appendChild(backBtn);

  // Titolo seduta (titolo-vista)
  const titoloEl = document.createElement('div');
  titoloEl.className = 'titolo-vista';
  titoloEl.textContent = seduta.titolo;
  header.appendChild(titoloEl);

  // Sottotitolo footnote: pianoNome · momento
  const sottoParti = [];
  if (pianoNome) sottoParti.push(pianoNome);
  if (momento) sottoParti.push(momento);
  if (sottoParti.length > 0) {
    const sottoEl = document.createElement('div');
    sottoEl.className = 'footnote';
    sottoEl.style.marginTop = '2px';
    sottoEl.textContent = sottoParti.join(' · ');
    header.appendChild(sottoEl);
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

    const stickyWrap = document.createElement('div');
    stickyWrap.style.cssText = 'position:sticky;bottom:calc(64px + env(safe-area-inset-bottom) + 8px);';
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
    stickyWrap.appendChild(btnCompleta);
    radice.appendChild(stickyWrap);
    return;
  }

  // ── Seduta con esercizi ───────────────────────────────────────────────────

  if (seduta.esercizi && seduta.esercizi.length > 0) {
    const seriePerEsercizio = [];

    for (let idx = 0; idx < seduta.esercizi.length; idx++) {
      const e = seduta.esercizi[idx];
      const slug = _slugEsercizio(e.nome);
      const nSerie = e.serie ?? 3;

      // Recupera ultima volta (esclude oggi)
      const ultima = _ultimaVolta(store, slug, oggi);

      // Recupera serie salvate oggi
      const registroOggi = (() => {
        const reg = store.leggi('registro', {});
        const vociSlug = reg[slug] ?? [];
        const trovata = vociSlug.find(v => v.data === oggi && v.pianoId === pianoId);
        return trovata ? trovata.serie : null;
      })();

      // Pre-fill
      let seriePrefill = [];
      if (registroOggi && registroOggi.length > 0) {
        seriePrefill = registroOggi;
      } else if (ultima && ultima.serie && ultima.serie.length > 0) {
        seriePrefill = ultima.serie;
      }

      const righeCorrente = [];
      for (let s = 0; s < nSerie; s++) {
        righeCorrente.push({
          kg: seriePrefill[s] !== undefined ? seriePrefill[s].kg : '',
          reps: seriePrefill[s] !== undefined ? seriePrefill[s].reps : '',
        });
      }
      seriePerEsercizio.push(righeCorrente);

      // Card esercizio iOS
      const card = document.createElement('div');
      card.className = 'card';

      // Nome (headline)
      const nomeEl = document.createElement('div');
      nomeEl.className = 'headline';
      nomeEl.textContent = e.nome;
      card.appendChild(nomeEl);

      // Obiettivo footnote
      const obiettivoEl = document.createElement('div');
      obiettivoEl.className = 'footnote';
      obiettivoEl.style.marginTop = '2px';
      obiettivoEl.textContent = `${nSerie} × ${e.reps ?? '?'}`;
      card.appendChild(obiettivoEl);

      // Note in footnote terziario
      if (e.note) {
        const noteEl = document.createElement('div');
        noteEl.className = 'footnote';
        noteEl.style.color = 'var(--testo3)';
        noteEl.style.marginTop = '2px';
        noteEl.textContent = e.note;
        card.appendChild(noteEl);
      }

      // Ultima volta: icona orologio + footnote
      const ultimaWrap = document.createElement('div');
      ultimaWrap.style.cssText = 'display:flex;align-items:center;gap:5px;margin-top:8px;';
      ultimaWrap.appendChild(icona('orologio', 14));
      const ultimaEl = document.createElement('div');
      ultimaEl.className = 'footnote';
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
      ultimaWrap.appendChild(ultimaEl);
      card.appendChild(ultimaWrap);

      // Righe serie: etichetta + wrapper flex con input h48 + suffissi
      for (let s = 0; s < nSerie; s++) {
        const riga = document.createElement('div');
        riga.className = 'riga';

        const etichettaSerie = document.createElement('span');
        etichettaSerie.className = 'footnote';
        etichettaSerie.textContent = `Serie ${s + 1}`;
        riga.appendChild(etichettaSerie);

        // Wrapper flex per kg e reps
        const inputsWrap = document.createElement('div');
        inputsWrap.style.cssText = 'display:flex;gap:8px;align-items:center;margin-left:auto;';

        // Input kg con suffisso
        const kgWrap = document.createElement('div');
        kgWrap.style.cssText = 'display:flex;align-items:center;gap:4px;';
        const inputKg = document.createElement('input');
        inputKg.type = 'number';
        inputKg.min = 0;
        inputKg.max = 200;
        inputKg.step = 0.5;
        inputKg.placeholder = '–';
        inputKg.style.cssText = 'width:70px;height:48px;text-align:center;';
        const valKg = righeCorrente[s].kg;
        inputKg.value = valKg !== '' && valKg !== undefined && valKg !== null ? valKg : '';
        const kgSuffix = document.createElement('span');
        kgSuffix.className = 'footnote';
        kgSuffix.textContent = 'kg';
        kgWrap.appendChild(inputKg);
        kgWrap.appendChild(kgSuffix);

        // Input reps con suffisso
        const repsWrap = document.createElement('div');
        repsWrap.style.cssText = 'display:flex;align-items:center;gap:4px;';
        const inputReps = document.createElement('input');
        inputReps.type = 'number';
        inputReps.min = 0;
        inputReps.max = 100;
        inputReps.step = 1;
        inputReps.placeholder = '–';
        inputReps.style.cssText = 'width:70px;height:48px;text-align:center;';
        const valReps = righeCorrente[s].reps;
        inputReps.value = valReps !== '' && valReps !== undefined && valReps !== null ? valReps : '';
        const repsSuffix = document.createElement('span');
        repsSuffix.className = 'footnote';
        repsSuffix.textContent = 'reps';
        repsWrap.appendChild(inputReps);
        repsWrap.appendChild(repsSuffix);

        inputsWrap.appendChild(kgWrap);
        inputsWrap.appendChild(repsWrap);
        riga.appendChild(inputsWrap);

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
              inputEl.value = prev ?? '';
              return;
            }

            righeCorrente[s][campo] = parsed;

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

        card.appendChild(riga);
      }

      radice.appendChild(card);
    }
  }

  // ── Caso vuoto ────────────────────────────────────────────────────────────

  const hasEsercizi = seduta.esercizi && seduta.esercizi.length > 0;
  const hasVoci = seduta.voci && seduta.voci.length > 0;

  if (!hasEsercizi && !hasVoci) {
    const msgEmpty = document.createElement('p');
    msgEmpty.textContent = 'Questa seduta non ha contenuti registrabili.';
    radice.appendChild(msgEmpty);
  }

  // ── Bottone "Seduta completata" sticky bottom ─────────────────────────────

  const stickyWrap = document.createElement('div');
  stickyWrap.style.cssText = 'position:sticky;bottom:calc(64px + env(safe-area-inset-bottom) + 8px);margin-top:8px;';

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
  stickyWrap.appendChild(btnCompleta);
  radice.appendChild(stickyWrap);
}
