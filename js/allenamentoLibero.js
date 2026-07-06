import { registraSerie } from './storage.js';
import { slugEsercizio } from './util.js';
import { icona } from './icone.js';
import { chip, segmented } from './ui.js';
import { SEDUTE } from './programma.js';
import { TIPI_CORSA, calcolaRitmo, sincronizzaCorse, rimuoviCorseDi, corsaValida } from './corse.js';

let _contatore = 0;

/**
 * serieValide(serie) → Array<{kg,reps}>
 * Tiene solo righe con reps intero 0–100 e kg numero 0–200 (kg 0 ammesso).
 * Stringhe vuote o non numeriche sono escluse.
 */
export function serieValide(serie) {
  return serie.filter(({ kg, reps }) => {
    // Rifiuta stringhe vuote o non convertibili
    if (reps === '' || reps === null || reps === undefined) return false;
    if (kg === '' || kg === null || kg === undefined) return false;
    const r = Number(reps);
    const k = Number(kg);
    return Number.isInteger(r) && r >= 0 && r <= 100 &&
           isFinite(k) && k >= 0 && k <= 200;
  }).map(({ kg, reps }) => ({ kg: Number(kg), reps: Number(reps) }));
}

/**
 * registraAllenamento(store, allenamento:{id?,data,titolo,righe}) → id
 * Inserisce/sostituisce in fl:allenamenti (ordinato per data),
 * e per ogni esercizio valido chiama registraSerie.
 */
export function registraAllenamento(store, allenamento) {
  const id = allenamento.id ?? ('a' + Date.now() + '_' + (++_contatore));
  const voce = { ...allenamento, id };

  const lista = store.leggi('allenamenti', []).filter(a => a.id !== id);
  lista.push(voce);
  lista.sort((a, b) => a.data.localeCompare(b.data));
  store.scrivi('allenamenti', lista);

  for (const riga of (allenamento.righe ?? [])) {
    if (riga.tipo !== 'esercizio') continue;
    if (!riga.nome || !riga.nome.trim()) continue;
    const sv = serieValide(riga.serie ?? []);
    if (sv.length === 0) continue;
    registraSerie(store, {
      slug: slugEsercizio(riga.nome),
      data: allenamento.data,
      pianoId: 'libero',
      unita: riga.unita ?? 'reps',
      serie: sv,
    });
  }

  // Sincronizza corse
  const righeCorsa = (allenamento.righe ?? [])
    .filter(r => r.tipo === 'corsa')
    .map(r => ({
      data: allenamento.data,
      tipo: r.tipoCorsa ?? '',
      tempoMin: r.tempoMin,
      distanzaKm: r.distanzaKm,
      ritmo: r.ritmo ?? '',
      note: r.note ?? '',
    }));
  sincronizzaCorse(store, 'libero:' + id, righeCorsa);

  return id;
}

/**
 * allenamentiDelGiorno(store, iso) → Array
 * Filtra gli allenamenti con data === iso.
 */
export function allenamentiDelGiorno(store, iso) {
  return store.leggi('allenamenti', []).filter(a => a.data === iso);
}

/**
 * eliminaAllenamento(store, id) → void
 * Rimuove l'allenamento da fl:allenamenti (lo storico registro resta).
 */
export function eliminaAllenamento(store, id) {
  const lista = store.leggi('allenamenti', []).filter(a => a.id !== id);
  store.scrivi('allenamenti', lista);
  rimuoviCorseDi(store, 'libero:' + id);
}

// ─── Helpers vista ────────────────────────────────────────────────────────────

const MESI_ESTESI = ['gennaio','febbraio','marzo','aprile','maggio','giugno',
  'luglio','agosto','settembre','ottobre','novembre','dicembre'];
const GIORNI_ESTESI = ['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'];

function formatDataEstesa(iso) {
  const d = new Date(iso + 'T12:00:00');
  return GIORNI_ESTESI[d.getDay()] + ' ' + d.getDate() + ' ' + MESI_ESTESI[d.getMonth()] + ' ' + d.getFullYear();
}

function raccogliNomiEsercizi(store) {
  const mappa = new Map(); // slug → nome leggibile

  // Da SEDUTE del programma
  for (const seduta of Object.values(SEDUTE)) {
    for (const es of seduta.esercizi ?? []) {
      const slug = slugEsercizio(es.nome);
      if (!mappa.has(slug)) mappa.set(slug, es.nome);
    }
  }

  // Da piani utente
  const piani = store.leggi('piani', []);
  for (const piano of piani) {
    for (const sed of piano.sedute ?? []) {
      for (const es of sed.esercizi ?? []) {
        const slug = slugEsercizio(es.nome);
        if (!mappa.has(slug)) mappa.set(slug, es.nome);
      }
    }
  }

  // Da registro (slug → mostra slug se non già presente)
  const registro = store.leggi('registro', {});
  for (const slug of Object.keys(registro)) {
    if (!mappa.has(slug)) mappa.set(slug, slug);
  }

  // Da allenamenti liberi (nomi esercizi)
  const allenamenti = store.leggi('allenamenti', []);
  for (const all of allenamenti) {
    for (const riga of all.righe ?? []) {
      if (riga.tipo === 'esercizio' && riga.nome && riga.nome.trim()) {
        const slug = slugEsercizio(riga.nome);
        if (!mappa.has(slug)) mappa.set(slug, riga.nome.trim());
      }
    }
  }

  return Array.from(mappa.values());
}

// ─── Vista inserimento/modifica ───────────────────────────────────────────────

/**
 * apriAllenamentoLibero(stato, esistente=null)
 * Sovrascrive #vista con la schermata di inserimento o modifica.
 */
export function apriAllenamentoLibero(stato, esistente = null) {
  // Import dinamico di naviga per evitare circolarità a livello modulo
  import('./app.js').then(({ naviga }) => {
    const { store } = stato;
    const radice = document.getElementById('vista');
    radice.innerHTML = '';

    // ── Datalist nomi esercizi condiviso ────────────────────────────────────
    const datalistId = 'al-libero-datalist';
    const datalist = document.createElement('datalist');
    datalist.id = datalistId;
    for (const nome of raccogliNomiEsercizi(store)) {
      const opt = document.createElement('option');
      opt.value = nome;
      datalist.appendChild(opt);
    }
    radice.appendChild(datalist);

    // ── Header: freccia + "Oggi" button ────────────────────────────────────
    const backBtn = document.createElement('button');
    backBtn.className = 'secondario';
    backBtn.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:6px 10px;font-size:15px;margin-bottom:8px;background:none;color:var(--accento);';
    backBtn.appendChild(icona('frecciaSinistra', 17));
    const backTesto = document.createElement('span');
    backTesto.textContent = 'Oggi';
    backBtn.appendChild(backTesto);
    backBtn.addEventListener('click', () => naviga('oggi'));
    radice.appendChild(backBtn);

    // ── Titolo vista ────────────────────────────────────────────────────────
    const titoloEl = document.createElement('div');
    titoloEl.className = 'titolo-vista';
    titoloEl.textContent = 'Allenamento libero';
    radice.appendChild(titoloEl);

    // ── Input titolo ────────────────────────────────────────────────────────
    const inputTitolo = document.createElement('input');
    inputTitolo.type = 'text';
    inputTitolo.placeholder = formatDataEstesa(stato.oggi);
    inputTitolo.style.cssText = 'width:100%;box-sizing:border-box;margin:12px 0 16px;';
    if (esistente && esistente.titolo) inputTitolo.value = esistente.titolo;
    // Traccia titolo in memoria su input (ogni keystroke)
    let titoloVal = esistente?.titolo ?? '';
    inputTitolo.addEventListener('input', () => { titoloVal = inputTitolo.value; });
    radice.appendChild(inputTitolo);

    // ── Modello righe in memoria ────────────────────────────────────────────
    // Ogni riga: { tipo:'esercizio', nome, serie:[{kg,reps}] } | { tipo:'nota', testo }
    const righe = [];

    if (esistente && esistente.righe) {
      for (const r of esistente.righe) {
        if (r.tipo === 'esercizio') {
          righe.push({
            tipo: 'esercizio',
            nome: r.nome ?? '',
            unita: r.unita ?? 'reps',
            serie: (r.serie ?? []).map(s => ({ kg: s.kg, reps: s.reps })),
          });
        } else if (r.tipo === 'nota') {
          righe.push({ tipo: 'nota', testo: r.testo ?? '' });
        } else if (r.tipo === 'corsa') {
          righe.push({
            tipo: 'corsa',
            tipoCorsa: r.tipoCorsa ?? '',
            tempoMin: r.tempoMin ?? '',
            distanzaKm: r.distanzaKm ?? '',
            ritmo: r.ritmo ?? '',
            note: r.note ?? '',
          });
        }
      }
    }

    // ── Contenitore righe ───────────────────────────────────────────────────
    const righeContainer = document.createElement('div');
    radice.appendChild(righeContainer);

    function renderRighe() {
      righeContainer.innerHTML = '';
      for (let ri = 0; ri < righe.length; ri++) {
        const r = righe[ri];
        const card = document.createElement('div');
        card.className = 'card';
        card.style.marginBottom = '12px';

        if (r.tipo === 'esercizio') {
          // Header riga: input nome + pulsante rimuovi
          const headerRiga = document.createElement('div');
          headerRiga.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';

          const inputNome = document.createElement('input');
          inputNome.type = 'text';
          inputNome.placeholder = 'Nome esercizio';
          inputNome.setAttribute('list', datalistId);
          inputNome.style.cssText = 'flex:1;';
          // Traccia nome in memoria su input (ogni keystroke)
          inputNome.addEventListener('input', () => { r.nome = inputNome.value; });
          // textContent discipline: use .value for inputs (safe)
          inputNome.value = r.nome;

          const btnRimuovi = document.createElement('button');
          btnRimuovi.className = 'secondario';
          btnRimuovi.style.cssText = 'padding:4px 8px;color:var(--rosso);flex-shrink:0;';
          btnRimuovi.appendChild(icona('cestino', 16));
          const riCapt = ri;
          btnRimuovi.addEventListener('click', () => {
            righe.splice(riCapt, 1);
            renderRighe();
          });

          headerRiga.appendChild(inputNome);
          headerRiga.appendChild(btnRimuovi);
          card.appendChild(headerRiga);

          // ── Interruttore reps / sec ────────────────────────────────────
          // Raccoglie i suffix span delle serie per aggiornamento in-place
          const suffixSpansLibero = [];
          const indiceUnitaIniziale = (r.unita ?? 'reps') === 'sec' ? 1 : 0;
          const toggleWrapLibero = document.createElement('div');
          toggleWrapLibero.style.cssText = 'margin-top:4px;margin-bottom:4px;';
          const ctrlLibero = segmented(['reps', 'sec'], indiceUnitaIniziale, (i) => {
            r.unita = i === 1 ? 'sec' : 'reps';
            for (const sp of suffixSpansLibero) {
              sp.textContent = r.unita;
            }
          });
          toggleWrapLibero.appendChild(ctrlLibero);
          card.appendChild(toggleWrapLibero);

          // Righe serie
          const serieContainer = document.createElement('div');
          card.appendChild(serieContainer);

          function renderSerie() {
            serieContainer.innerHTML = '';
            suffixSpansLibero.length = 0;
            for (let si = 0; si < r.serie.length; si++) {
              const s = r.serie[si];
              const rigaSerie = document.createElement('div');
              rigaSerie.className = 'riga';

              const etichetta = document.createElement('span');
              etichetta.className = 'footnote';
              etichetta.textContent = 'Serie ' + (si + 1);
              rigaSerie.appendChild(etichetta);

              const inputsWrap = document.createElement('div');
              inputsWrap.style.cssText = 'display:flex;gap:8px;align-items:center;margin-left:auto;';

              // kg
              const kgWrap = document.createElement('div');
              kgWrap.style.cssText = 'display:flex;align-items:center;gap:4px;';
              const inputKg = document.createElement('input');
              inputKg.type = 'number';
              inputKg.min = 0;
              inputKg.max = 200;
              inputKg.step = 0.5;
              inputKg.placeholder = '–';
              inputKg.style.cssText = 'width:70px;height:48px;text-align:center;';
              inputKg.value = (s.kg !== '' && s.kg !== undefined && s.kg !== null) ? s.kg : '';
              const kgSuffix = document.createElement('span');
              kgSuffix.className = 'footnote';
              kgSuffix.textContent = 'kg';
              kgWrap.appendChild(inputKg);
              kgWrap.appendChild(kgSuffix);

              // reps
              const repsWrap = document.createElement('div');
              repsWrap.style.cssText = 'display:flex;align-items:center;gap:4px;';
              const inputReps = document.createElement('input');
              inputReps.type = 'number';
              inputReps.min = 0;
              inputReps.max = 100;
              inputReps.step = 1;
              inputReps.placeholder = '–';
              inputReps.style.cssText = 'width:70px;height:48px;text-align:center;';
              inputReps.value = (s.reps !== '' && s.reps !== undefined && s.reps !== null) ? s.reps : '';
              const repsSuffix = document.createElement('span');
              repsSuffix.className = 'footnote';
              repsSuffix.textContent = r.unita ?? 'reps';
              suffixSpansLibero.push(repsSuffix);
              repsWrap.appendChild(inputReps);
              repsWrap.appendChild(repsSuffix);

              inputsWrap.appendChild(kgWrap);
              inputsWrap.appendChild(repsWrap);
              rigaSerie.appendChild(inputsWrap);

              // Validazione e salvataggio: 'change' con restore, 'input' per sincronizzazione immediata
              const siCapt = si;
              const salvaInput = (campo, el) => {
                // Su 'change' (blur): validazione con restore
                el.addEventListener('change', () => {
                  const prev = r.serie[siCapt][campo];
                  const raw = el.value.trim();
                  const parsed = campo === 'kg' ? parseFloat(raw) : parseInt(raw, 10);
                  const min = 0;
                  const max = campo === 'kg' ? 200 : 100;
                  if (raw === '' || isNaN(parsed) || parsed < min || parsed > max ||
                      (campo === 'reps' && !Number.isInteger(parsed))) {
                    el.value = (prev !== '' && prev !== undefined && prev !== null) ? prev : '';
                    return;
                  }
                  r.serie[siCapt][campo] = parsed;
                });
                // Su 'input' (ogni keystroke): sincronizzazione senza validazione
                el.addEventListener('input', () => {
                  const raw = el.value.trim();
                  if (raw === '') {
                    r.serie[siCapt][campo] = '';
                    return;
                  }
                  const parsed = campo === 'kg' ? parseFloat(raw) : parseInt(raw, 10);
                  if (!isNaN(parsed)) {
                    r.serie[siCapt][campo] = parsed;
                  }
                });
              };
              salvaInput('kg', inputKg);
              salvaInput('reps', inputReps);

              // Rimuovi serie
              const btnRimSerie = document.createElement('button');
              btnRimSerie.className = 'secondario';
              btnRimSerie.style.cssText = 'padding:4px 8px;color:var(--rosso);flex-shrink:0;margin-left:8px;';
              btnRimSerie.textContent = '×';
              btnRimSerie.addEventListener('click', () => {
                r.serie.splice(siCapt, 1);
                renderSerie();
              });
              rigaSerie.appendChild(btnRimSerie);

              serieContainer.appendChild(rigaSerie);
            }
          }
          renderSerie();

          // Bottone ＋ serie
          const btnAddSerie = document.createElement('button');
          btnAddSerie.className = 'secondario';
          btnAddSerie.style.cssText = 'font-size:13px;margin-top:8px;';
          btnAddSerie.textContent = '＋ serie';
          btnAddSerie.addEventListener('click', () => {
            r.serie.push({ kg: '', reps: '' });
            renderSerie();
          });
          card.appendChild(btnAddSerie);

        } else if (r.tipo === 'nota') {
          // Intestazione nota + rimuovi
          const headerNota = document.createElement('div');
          headerNota.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';
          const labelNota = document.createElement('span');
          labelNota.className = 'footnote';
          labelNota.textContent = 'Nota';
          const btnRimNota = document.createElement('button');
          btnRimNota.className = 'secondario';
          btnRimNota.style.cssText = 'padding:4px 8px;color:var(--rosso);margin-left:auto;flex-shrink:0;';
          btnRimNota.appendChild(icona('cestino', 16));
          const riCapt = ri;
          btnRimNota.addEventListener('click', () => {
            righe.splice(riCapt, 1);
            renderRighe();
          });
          headerNota.appendChild(labelNota);
          headerNota.appendChild(btnRimNota);
          card.appendChild(headerNota);

          const textarea = document.createElement('textarea');
          textarea.rows = 3;
          textarea.style.cssText = 'width:100%;box-sizing:border-box;';
          textarea.placeholder = 'Scrivi una nota…';
          textarea.value = r.testo;
          textarea.addEventListener('input', () => { r.testo = textarea.value; });
          card.appendChild(textarea);

        } else if (r.tipo === 'corsa') {
          // Intestazione corsa + rimuovi
          const headerCorsa = document.createElement('div');
          headerCorsa.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';
          const labelCorsa = document.createElement('span');
          labelCorsa.className = 'footnote';
          labelCorsa.textContent = 'Corsa';
          const btnRimCorsa = document.createElement('button');
          btnRimCorsa.className = 'secondario';
          btnRimCorsa.style.cssText = 'padding:4px 8px;color:var(--rosso);margin-left:auto;flex-shrink:0;';
          btnRimCorsa.appendChild(icona('cestino', 16));
          const riCaptC = ri;
          btnRimCorsa.addEventListener('click', () => {
            righe.splice(riCaptC, 1);
            renderRighe();
          });
          headerCorsa.appendChild(labelCorsa);
          headerCorsa.appendChild(btnRimCorsa);
          card.appendChild(headerCorsa);

          // Select tipo corsa
          const selectTipo = document.createElement('select');
          selectTipo.style.cssText = 'width:100%;margin-bottom:8px;';
          const opzioniTipo = [...TIPI_CORSA, 'Altro'];
          for (const t of opzioniTipo) {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t;
            selectTipo.appendChild(opt);
          }
          // Imposta valore corrente
          const tipoCorsaCorrente = r.tipoCorsa ?? '';
          const isAltro = tipoCorsaCorrente !== '' && !TIPI_CORSA.includes(tipoCorsaCorrente);
          selectTipo.value = isAltro ? 'Altro' : (tipoCorsaCorrente || TIPI_CORSA[0]);
          if (!tipoCorsaCorrente) {
            r.tipoCorsa = TIPI_CORSA[0];
          } else if (isAltro) {
            // mantieni il valore libero in r.tipoCorsa
          } else {
            r.tipoCorsa = tipoCorsaCorrente;
          }
          card.appendChild(selectTipo);

          // Input testo "Altro"
          const inputAltroTipo = document.createElement('input');
          inputAltroTipo.type = 'text';
          inputAltroTipo.placeholder = 'Tipo corsa personalizzato…';
          inputAltroTipo.style.cssText = 'width:100%;box-sizing:border-box;margin-bottom:8px;display:' + (isAltro ? 'block' : 'none') + ';';
          if (isAltro) inputAltroTipo.value = tipoCorsaCorrente;
          inputAltroTipo.addEventListener('input', () => { r.tipoCorsa = inputAltroTipo.value; });
          card.appendChild(inputAltroTipo);

          selectTipo.addEventListener('input', () => {
            if (selectTipo.value === 'Altro') {
              inputAltroTipo.style.display = 'block';
              r.tipoCorsa = inputAltroTipo.value;
            } else {
              inputAltroTipo.style.display = 'none';
              r.tipoCorsa = selectTipo.value;
            }
          });

          // Riga tempo + distanza
          const rigaNumeri = document.createElement('div');
          rigaNumeri.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;';

          // Tempo (min)
          const tempoWrap = document.createElement('div');
          tempoWrap.style.cssText = 'display:flex;flex-direction:column;gap:4px;flex:1;';
          const labelTempo = document.createElement('span');
          labelTempo.className = 'footnote';
          labelTempo.textContent = 'Tempo (min)';
          const inputTempo = document.createElement('input');
          inputTempo.type = 'number';
          inputTempo.min = 0;
          inputTempo.max = 600;
          inputTempo.step = 1;
          inputTempo.placeholder = '0';
          inputTempo.style.cssText = 'width:100%;box-sizing:border-box;';
          if (r.tempoMin !== '' && r.tempoMin !== undefined && r.tempoMin !== null) {
            inputTempo.value = r.tempoMin;
          }
          tempoWrap.appendChild(labelTempo);
          tempoWrap.appendChild(inputTempo);
          rigaNumeri.appendChild(tempoWrap);

          // Distanza (km)
          const distWrap = document.createElement('div');
          distWrap.style.cssText = 'display:flex;flex-direction:column;gap:4px;flex:1;';
          const labelDist = document.createElement('span');
          labelDist.className = 'footnote';
          labelDist.textContent = 'Distanza (km)';
          const inputDist = document.createElement('input');
          inputDist.type = 'number';
          inputDist.min = 0;
          inputDist.max = 100;
          inputDist.step = 0.1;
          inputDist.placeholder = '0';
          inputDist.style.cssText = 'width:100%;box-sizing:border-box;';
          if (r.distanzaKm !== '' && r.distanzaKm !== undefined && r.distanzaKm !== null) {
            inputDist.value = r.distanzaKm;
          }
          distWrap.appendChild(labelDist);
          distWrap.appendChild(inputDist);
          rigaNumeri.appendChild(distWrap);
          card.appendChild(rigaNumeri);

          // Ritmo
          const ritmoWrap = document.createElement('div');
          ritmoWrap.style.cssText = 'display:flex;flex-direction:column;gap:4px;margin-bottom:8px;';
          const labelRitmo = document.createElement('span');
          labelRitmo.className = 'footnote';
          labelRitmo.textContent = 'Ritmo (/km)';
          const inputRitmo = document.createElement('input');
          inputRitmo.type = 'text';
          inputRitmo.style.cssText = 'width:100%;box-sizing:border-box;';
          inputRitmo.value = r.ritmo ?? '';
          // Funzione aggiornamento placeholder ritmo
          const aggiornaPlaceholderRitmo = () => {
            const t = parseFloat(inputTempo.value);
            const d = parseFloat(inputDist.value);
            const calcolato = calcolaRitmo(t, d);
            inputRitmo.placeholder = calcolato || 'es. 5:00';
          };
          aggiornaPlaceholderRitmo();
          ritmoWrap.appendChild(labelRitmo);
          ritmoWrap.appendChild(inputRitmo);
          card.appendChild(ritmoWrap);

          // Listeners su tempo e distanza
          const aggiornaCampiCorsa = () => {
            const t = parseFloat(inputTempo.value);
            const d = parseFloat(inputDist.value);
            r.tempoMin = inputTempo.value === '' ? '' : (isNaN(t) ? '' : t);
            r.distanzaKm = inputDist.value === '' ? '' : (isNaN(d) ? '' : d);
            aggiornaPlaceholderRitmo();
            // Auto-riempi ritmo solo se il campo è vuoto
            if (!inputRitmo.value.trim()) {
              const calcolato = calcolaRitmo(r.tempoMin, r.distanzaKm);
              if (calcolato) {
                inputRitmo.value = calcolato;
                r.ritmo = calcolato;
              }
            }
          };
          inputTempo.addEventListener('input', aggiornaCampiCorsa);
          inputDist.addEventListener('input', aggiornaCampiCorsa);
          inputRitmo.addEventListener('input', () => { r.ritmo = inputRitmo.value; });

          // Nota facoltativa
          const notaWrap = document.createElement('div');
          notaWrap.style.cssText = 'display:flex;flex-direction:column;gap:4px;';
          const labelNota2 = document.createElement('span');
          labelNota2.className = 'footnote';
          labelNota2.textContent = 'Nota (facoltativa)';
          const inputNotaCorsa = document.createElement('input');
          inputNotaCorsa.type = 'text';
          inputNotaCorsa.placeholder = 'es. pista, zona 2…';
          inputNotaCorsa.style.cssText = 'width:100%;box-sizing:border-box;';
          inputNotaCorsa.value = r.note ?? '';
          inputNotaCorsa.addEventListener('input', () => { r.note = inputNotaCorsa.value; });
          notaWrap.appendChild(labelNota2);
          notaWrap.appendChild(inputNotaCorsa);
          card.appendChild(notaWrap);
        }

        righeContainer.appendChild(card);
      }
    }

    renderRighe();

    // ── Pulsanti aggiungi ───────────────────────────────────────────────────
    const addBtnsRow = document.createElement('div');
    addBtnsRow.style.cssText = 'display:flex;gap:8px;margin-bottom:16px;';

    const btnAddEsercizio = document.createElement('button');
    btnAddEsercizio.className = 'secondario';
    btnAddEsercizio.style.cssText = 'display:inline-flex;align-items:center;gap:4px;';
    btnAddEsercizio.appendChild(icona('piu', 14));
    const spnEs = document.createElement('span');
    spnEs.textContent = 'Esercizio';
    btnAddEsercizio.appendChild(spnEs);
    btnAddEsercizio.addEventListener('click', () => {
      righe.push({ tipo: 'esercizio', nome: '', unita: 'reps', serie: [{ kg: '', reps: '' }] });
      renderRighe();
    });

    const btnAddNota = document.createElement('button');
    btnAddNota.className = 'secondario';
    btnAddNota.style.cssText = 'display:inline-flex;align-items:center;gap:4px;';
    btnAddNota.appendChild(icona('piu', 14));
    const spnNota = document.createElement('span');
    spnNota.textContent = 'Nota';
    btnAddNota.appendChild(spnNota);
    btnAddNota.addEventListener('click', () => {
      righe.push({ tipo: 'nota', testo: '' });
      renderRighe();
    });

    const btnAddCorsa = document.createElement('button');
    btnAddCorsa.className = 'secondario';
    btnAddCorsa.style.cssText = 'display:inline-flex;align-items:center;gap:4px;';
    btnAddCorsa.appendChild(icona('onda', 16));
    const spnCorsa = document.createElement('span');
    spnCorsa.textContent = 'Corsa';
    btnAddCorsa.appendChild(spnCorsa);
    btnAddCorsa.addEventListener('click', () => {
      righe.push({ tipo: 'corsa', tipoCorsa: TIPI_CORSA[0], tempoMin: '', distanzaKm: '', ritmo: '', note: '' });
      renderRighe();
    });

    addBtnsRow.appendChild(btnAddEsercizio);
    addBtnsRow.appendChild(btnAddNota);
    addBtnsRow.appendChild(btnAddCorsa);
    radice.appendChild(addBtnsRow);

    // ── Zona messaggi errore ────────────────────────────────────────────────
    const msgZona = document.createElement('div');
    radice.appendChild(msgZona);

    // ── Elimina (solo in modifica) ──────────────────────────────────────────
    if (esistente) {
      const btnElimina = document.createElement('button');
      btnElimina.className = 'distruttivo';
      btnElimina.style.cssText = 'width:100%;margin-bottom:12px;';
      btnElimina.appendChild(icona('cestino', 16));
      const spnEl = document.createElement('span');
      spnEl.style.marginLeft = '6px';
      spnEl.textContent = 'Elimina allenamento';
      btnElimina.appendChild(spnEl);
      btnElimina.addEventListener('click', () => {
        if (confirm('Eliminare questo allenamento?')) {
          eliminaAllenamento(store, esistente.id);
          naviga('oggi');
        }
      });
      radice.appendChild(btnElimina);
    }

    // ── Sticky "Salva allenamento" ──────────────────────────────────────────
    const stickyWrap = document.createElement('div');
    stickyWrap.style.cssText = 'position:sticky;bottom:calc(64px + env(safe-area-inset-bottom) + 8px);margin-top:8px;';

    const btnSalva = document.createElement('button');
    btnSalva.className = 'primario';
    btnSalva.textContent = 'Salva allenamento';
    btnSalva.addEventListener('click', () => {
      msgZona.innerHTML = '';

      // Leggi titolo dalla variabile sincronizzata (già aggiornato su ogni keystroke)
      // Costruisci oggetto
      const righeFinali = righe.map(r => {
        if (r.tipo === 'nota') return { tipo: 'nota', testo: r.testo };
        if (r.tipo === 'corsa') return {
          tipo: 'corsa',
          tipoCorsa: r.tipoCorsa ?? '',
          tempoMin: r.tempoMin,
          distanzaKm: r.distanzaKm,
          ritmo: r.ritmo ?? '',
          note: r.note ?? '',
        };
        return { tipo: 'esercizio', nome: r.nome, unita: r.unita ?? 'reps', serie: r.serie };
      });

      // Validazione: serve almeno un esercizio valido (nome + ≥1 serie valida), una nota non vuota, o una corsa valida
      const haEsercizioValido = righeFinali.some(r =>
        r.tipo === 'esercizio' && r.nome && r.nome.trim() &&
        serieValide(r.serie).length > 0
      );
      const haNotaValida = righeFinali.some(r => r.tipo === 'nota' && r.testo && r.testo.trim());
      const haCorsaValida = righeFinali.some(r => r.tipo === 'corsa' && corsaValida({ tipo: r.tipoCorsa, tempoMin: r.tempoMin, distanzaKm: r.distanzaKm }));

      if (!haEsercizioValido && !haNotaValida && !haCorsaValida) {
        msgZona.appendChild(chip('Aggiungi almeno un esercizio o una nota', 'ambra'));
        return;
      }

      const obj = {
        ...(esistente ? { id: esistente.id } : {}),
        data: stato.oggi,
        titolo: titoloVal,
        righe: righeFinali,
      };

      registraAllenamento(store, obj);
      naviga('oggi');
    });

    stickyWrap.appendChild(btnSalva);
    radice.appendChild(stickyWrap);
  });
}
