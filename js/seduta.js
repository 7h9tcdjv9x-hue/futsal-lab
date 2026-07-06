import { naviga } from './app.js';
import { registraSerie, ultimaVolta as _ultimaVolta } from './storage.js';
import { slugEsercizio as _slugEsercizio, formattaSerie } from './util.js';
import { chiaveSeduta } from './oggi.js';
import { icona } from './icone.js';
import { segmented } from './ui.js';
import { TIPI_CORSA, calcolaRitmo, sincronizzaCorse, corsaValida } from './corse.js';

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

  // ── Costruttore blocco corse (usato in entrambi i rami) ───────────────────

  function montaCorse(contenitore) {
    const origineCorsa = 'seduta:' + voce.pianoId + ':' + oggi;

    // Pre-carica le corse già salvate per questa origine
    const corseSeduta = store.leggi('corse', [])
      .filter(c => c.origine === origineCorsa)
      .map(c => ({
        tipo: 'corsa',
        tipoCorsa: c.tipo ?? '',
        tempoMin: c.tempoMin ?? '',
        distanzaKm: c.distanzaKm ?? '',
        ritmo: c.ritmo ?? '',
        note: c.note ?? '',
      }));

    // Funzione per sincronizzare le corse correnti
    const sincronizzaCorseCorrente = () => {
      const dati = corseSeduta.map(r => ({
        data: oggi,
        tipo: r.tipoCorsa ?? '',
        tempoMin: r.tempoMin,
        distanzaKm: r.distanzaKm,
        ritmo: r.ritmo ?? '',
        note: r.note ?? '',
      }));
      sincronizzaCorse(store, origineCorsa, dati);
    };

    // Contenitore righe corse
    const corseContainer = document.createElement('div');
    contenitore.appendChild(corseContainer);

    function renderCorseSeduta() {
      corseContainer.innerHTML = '';
      for (let ci = 0; ci < corseSeduta.length; ci++) {
        const r = corseSeduta[ci];
        const card = document.createElement('div');
        card.className = 'card';
        card.style.marginBottom = '12px';

        // Intestazione
        const headerC = document.createElement('div');
        headerC.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';
        const labelC = document.createElement('span');
        labelC.className = 'footnote';
        labelC.textContent = 'Corsa';
        const btnRimC = document.createElement('button');
        btnRimC.className = 'secondario';
        btnRimC.style.cssText = 'padding:4px 8px;color:var(--rosso);margin-left:auto;flex-shrink:0;';
        btnRimC.appendChild(icona('cestino', 16));
        const ciCapt = ci;
        btnRimC.addEventListener('click', () => {
          corseSeduta.splice(ciCapt, 1);
          sincronizzaCorseCorrente();
          renderCorseSeduta();
        });
        headerC.appendChild(labelC);
        headerC.appendChild(btnRimC);
        card.appendChild(headerC);

        // Select tipo
        const selectTipo = document.createElement('select');
        selectTipo.style.cssText = 'width:100%;margin-bottom:8px;';
        for (const t of [...TIPI_CORSA, 'Altro']) {
          const opt = document.createElement('option');
          opt.value = t;
          opt.textContent = t;
          selectTipo.appendChild(opt);
        }
        const tipoCorsaC = r.tipoCorsa ?? '';
        const isAltroC = tipoCorsaC !== '' && !TIPI_CORSA.includes(tipoCorsaC);
        selectTipo.value = isAltroC ? 'Altro' : (tipoCorsaC || TIPI_CORSA[0]);
        if (!tipoCorsaC) r.tipoCorsa = TIPI_CORSA[0];
        card.appendChild(selectTipo);

        // Input testo "Altro"
        const inputAltroC = document.createElement('input');
        inputAltroC.type = 'text';
        inputAltroC.placeholder = 'Tipo corsa personalizzato…';
        inputAltroC.style.cssText = 'width:100%;box-sizing:border-box;margin-bottom:8px;display:' + (isAltroC ? 'block' : 'none') + ';';
        if (isAltroC) inputAltroC.value = tipoCorsaC;
        inputAltroC.addEventListener('input', () => {
          r.tipoCorsa = inputAltroC.value;
          sincronizzaCorseCorrente();
        });
        card.appendChild(inputAltroC);

        selectTipo.addEventListener('input', () => {
          if (selectTipo.value === 'Altro') {
            inputAltroC.style.display = 'block';
            r.tipoCorsa = inputAltroC.value;
          } else {
            inputAltroC.style.display = 'none';
            r.tipoCorsa = selectTipo.value;
          }
          sincronizzaCorseCorrente();
        });

        // Tempo + Distanza
        const rigaNumeriC = document.createElement('div');
        rigaNumeriC.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;';

        const tempoWrapC = document.createElement('div');
        tempoWrapC.style.cssText = 'display:flex;flex-direction:column;gap:4px;flex:1;';
        const labelTempoC = document.createElement('span');
        labelTempoC.className = 'footnote';
        labelTempoC.textContent = 'Tempo (min)';
        const inputTempoC = document.createElement('input');
        inputTempoC.type = 'number';
        inputTempoC.min = 0;
        inputTempoC.max = 600;
        inputTempoC.step = 1;
        inputTempoC.placeholder = '0';
        inputTempoC.style.cssText = 'width:100%;box-sizing:border-box;';
        if (r.tempoMin !== '' && r.tempoMin !== undefined && r.tempoMin !== null) {
          inputTempoC.value = r.tempoMin;
        }
        tempoWrapC.appendChild(labelTempoC);
        tempoWrapC.appendChild(inputTempoC);
        rigaNumeriC.appendChild(tempoWrapC);

        const distWrapC = document.createElement('div');
        distWrapC.style.cssText = 'display:flex;flex-direction:column;gap:4px;flex:1;';
        const labelDistC = document.createElement('span');
        labelDistC.className = 'footnote';
        labelDistC.textContent = 'Distanza (km)';
        const inputDistC = document.createElement('input');
        inputDistC.type = 'number';
        inputDistC.min = 0;
        inputDistC.max = 100;
        inputDistC.step = 0.1;
        inputDistC.placeholder = '0';
        inputDistC.style.cssText = 'width:100%;box-sizing:border-box;';
        if (r.distanzaKm !== '' && r.distanzaKm !== undefined && r.distanzaKm !== null) {
          inputDistC.value = r.distanzaKm;
        }
        distWrapC.appendChild(labelDistC);
        distWrapC.appendChild(inputDistC);
        rigaNumeriC.appendChild(distWrapC);
        card.appendChild(rigaNumeriC);

        // Ritmo
        const ritmoWrapC = document.createElement('div');
        ritmoWrapC.style.cssText = 'display:flex;flex-direction:column;gap:4px;margin-bottom:8px;';
        const labelRitmoC = document.createElement('span');
        labelRitmoC.className = 'footnote';
        labelRitmoC.textContent = 'Ritmo (/km)';
        const inputRitmoC = document.createElement('input');
        inputRitmoC.type = 'text';
        inputRitmoC.style.cssText = 'width:100%;box-sizing:border-box;';
        inputRitmoC.value = r.ritmo ?? '';

        const aggiornaPlaceholderC = () => {
          const t = parseFloat(inputTempoC.value);
          const d = parseFloat(inputDistC.value);
          const calcolato = calcolaRitmo(t, d);
          inputRitmoC.placeholder = calcolato || 'es. 5:00';
        };
        aggiornaPlaceholderC();
        ritmoWrapC.appendChild(labelRitmoC);
        ritmoWrapC.appendChild(inputRitmoC);
        card.appendChild(ritmoWrapC);

        const aggiornaCampiC = () => {
          const t = parseFloat(inputTempoC.value);
          const d = parseFloat(inputDistC.value);
          r.tempoMin = inputTempoC.value === '' ? '' : (isNaN(t) ? '' : t);
          r.distanzaKm = inputDistC.value === '' ? '' : (isNaN(d) ? '' : d);
          aggiornaPlaceholderC();
          if (!inputRitmoC.value.trim()) {
            const calcolato = calcolaRitmo(r.tempoMin, r.distanzaKm);
            if (calcolato) {
              inputRitmoC.value = calcolato;
              r.ritmo = calcolato;
            }
          }
          if (corsaValida({ tipo: r.tipoCorsa, tempoMin: r.tempoMin, distanzaKm: r.distanzaKm })) {
            sincronizzaCorseCorrente();
          }
        };
        inputTempoC.addEventListener('input', aggiornaCampiC);
        inputDistC.addEventListener('input', aggiornaCampiC);
        inputRitmoC.addEventListener('input', () => {
          r.ritmo = inputRitmoC.value;
          sincronizzaCorseCorrente();
        });

        // Nota
        const notaWrapC = document.createElement('div');
        notaWrapC.style.cssText = 'display:flex;flex-direction:column;gap:4px;';
        const labelNotaC = document.createElement('span');
        labelNotaC.className = 'footnote';
        labelNotaC.textContent = 'Nota (facoltativa)';
        const inputNotaC = document.createElement('input');
        inputNotaC.type = 'text';
        inputNotaC.placeholder = 'es. pista, zona 2…';
        inputNotaC.style.cssText = 'width:100%;box-sizing:border-box;';
        inputNotaC.value = r.note ?? '';
        inputNotaC.addEventListener('input', () => {
          r.note = inputNotaC.value;
          sincronizzaCorseCorrente();
        });
        notaWrapC.appendChild(labelNotaC);
        notaWrapC.appendChild(inputNotaC);
        card.appendChild(notaWrapC);

        corseContainer.appendChild(card);
      }
    }

    renderCorseSeduta();

    // Pulsante ＋ Corsa
    const btnAddCorsa = document.createElement('button');
    btnAddCorsa.className = 'secondario';
    btnAddCorsa.style.cssText = 'display:inline-flex;align-items:center;gap:4px;margin-bottom:16px;';
    btnAddCorsa.appendChild(icona('onda', 16));
    const spnCorsaSed = document.createElement('span');
    spnCorsaSed.textContent = 'Corsa';
    btnAddCorsa.appendChild(spnCorsaSed);
    btnAddCorsa.addEventListener('click', () => {
      corseSeduta.push({ tipo: 'corsa', tipoCorsa: TIPI_CORSA[0], tempoMin: '', distanzaKm: '', ritmo: '', note: '' });
      renderCorseSeduta();
    });
    contenitore.appendChild(btnAddCorsa);

    return sincronizzaCorseCorrente;
  }

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

    const sincronizzaCorseCorrente = montaCorse(radice);

    const stickyWrap = document.createElement('div');
    stickyWrap.style.cssText = 'position:sticky;bottom:calc(64px + env(safe-area-inset-bottom) + 8px);';
    const btnCompleta = document.createElement('button');
    btnCompleta.className = 'primario';
    btnCompleta.textContent = 'Seduta completata';
    btnCompleta.addEventListener('click', () => {
      sincronizzaCorseCorrente();
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

      // Unità iniziale: dall'ultima volta, oppure derivata dal testo obiettivo, altrimenti 'reps'
      const testoObiettivo = `${e.reps ?? ''} ${e.note ?? ''}`;
      let unitaEsercizio;
      if (ultima && ultima.unita) {
        unitaEsercizio = ultima.unita;
      } else if (/sec/i.test(testoObiettivo)) {
        unitaEsercizio = 'sec';
      } else {
        unitaEsercizio = 'reps';
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
          ultimaEl.textContent = `Ultima volta: ${formattaSerie(best, ultima.unita)} (${formatDataBreve(ultima.data)})`;
        } else {
          ultimaEl.textContent = 'Prima volta!';
        }
      } else {
        ultimaEl.textContent = 'Prima volta!';
      }
      ultimaWrap.appendChild(ultimaEl);
      card.appendChild(ultimaWrap);

      // ── Interruttore reps / sec ──────────────────────────────────────────
      const indiceIniziale = unitaEsercizio === 'sec' ? 1 : 0;
      // Array di span suffisso per questo esercizio (popolato mentre si rendono le righe)
      const suffixSpans = [];

      const toggleWrap = document.createElement('div');
      toggleWrap.style.cssText = 'margin-top:10px;margin-bottom:4px;';
      const ctrl = segmented(['reps', 'sec'], indiceIniziale, (i) => {
        unitaEsercizio = i === 1 ? 'sec' : 'reps';
        for (const sp of suffixSpans) {
          sp.textContent = unitaEsercizio;
        }
      });
      toggleWrap.appendChild(ctrl);
      card.appendChild(toggleWrap);

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
        repsSuffix.textContent = unitaEsercizio;
        suffixSpans.push(repsSuffix);
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

            registraSerie(store, { slug, data: oggi, pianoId, unita: unitaEsercizio, serie: serieValide });
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

  // ── Sezione corse ─────────────────────────────────────────────────────────

  const sincronizzaCorseCorrente = montaCorse(radice);

  // ── Bottone "Seduta completata" sticky bottom ─────────────────────────────

  const stickyWrap = document.createElement('div');
  stickyWrap.style.cssText = 'position:sticky;bottom:calc(64px + env(safe-area-inset-bottom) + 8px);margin-top:8px;';

  const btnCompleta = document.createElement('button');
  btnCompleta.className = 'primario';
  btnCompleta.textContent = 'Seduta completata';
  btnCompleta.addEventListener('click', () => {
    sincronizzaCorseCorrente();
    const sd = store.leggi('sedute', {});
    if (!sd[oggi]) sd[oggi] = {};
    sd[oggi][chiave] = true;
    store.scrivi('sedute', sd);
    naviga('oggi');
  });
  stickyWrap.appendChild(btnCompleta);
  radice.appendChild(stickyWrap);
}
