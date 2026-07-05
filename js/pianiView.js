import { SEDUTE, CALENDARIO, REGOLE_ORO, TEMPLATE_STAGIONE } from './programma.js';
import { chiaveSeduta } from './oggi.js';
import { validaPiano, TIPI_PIANO, suggerisciUnificazioni, esportaPiano } from './piani.js';
import { slugEsercizio } from './util.js';
import { icona } from './icone.js';
import { segmented, chip, intestazione } from './ui.js';

// ─── COSTANTI ────────────────────────────────────────────────────────────────

const GIORNI_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function creaCard(titolo) {
  const card = document.createElement('div');
  card.className = 'card';
  if (titolo) {
    const h = document.createElement('h2');
    h.className = 'eyebrow';
    h.textContent = titolo;
    card.appendChild(h);
  }
  return card;
}

/** Quadrato icona tipo piano: 34×34, sup2 bg, radius 10 */
function iconaTipoPiano(tipo) {
  const wrap = document.createElement('div');
  wrap.style.cssText = [
    'width:34px', 'height:34px', 'border-radius:10px',
    'background:var(--sup2)', 'display:flex', 'align-items:center',
    'justify-content:center', 'flex-shrink:0',
  ].join(';');
  let nomeIcona = 'elenco';
  if (tipo === 'tecnica') nomeIcona = 'fiamma';
  else if (tipo === 'alimentare') nomeIcona = 'mela';
  wrap.appendChild(icona(nomeIcona, 18));
  return wrap;
}

/** Badge stato pill footnote */
function badgeStato(stato) {
  const badge = document.createElement('span');
  badge.style.cssText = [
    'font-size:13px', 'font-weight:600', 'padding:2px 10px',
    'border-radius:999px', 'white-space:nowrap',
  ].join(';');
  if (stato === 'attivo') {
    badge.style.background = 'var(--tinta-verde)';
    badge.style.color = 'var(--verde)';
  } else {
    badge.style.background = 'var(--sup2)';
    badge.style.color = 'var(--testo2)';
  }
  badge.textContent = stato === 'attivo' ? 'Attivo' : 'Archiviato';
  return badge;
}

// ─── EDITOR PIANI ────────────────────────────────────────────────────────────

function raccogliNomiEsercizi(store) {
  const nomiSet = new Map(); // slug → nome leggibile

  // Raccogli da SEDUTE del programma
  for (const seduta of Object.values(SEDUTE)) {
    for (const es of seduta.esercizi ?? []) {
      const slug = slugEsercizio(es.nome);
      if (!nomiSet.has(slug)) nomiSet.set(slug, es.nome);
    }
  }

  // Raccogli da piani utente
  const piani = store.leggi('piani', []);
  for (const piano of piani) {
    for (const seduta of piano.sedute ?? []) {
      for (const es of seduta.esercizi ?? []) {
        const slug = slugEsercizio(es.nome);
        if (!nomiSet.has(slug)) nomiSet.set(slug, es.nome);
      }
    }
  }

  // Raccogli slug dal registro — se lo slug non ha già un nome, mostralo as-is
  const registro = store.leggi('registro', {});
  for (const slug of Object.keys(registro)) {
    if (!nomiSet.has(slug)) nomiSet.set(slug, slug);
  }

  return Array.from(nomiSet.values());
}

function apriEditor(radice, store, pianoEsistente = null, tornaElenco = null) {
  radice.innerHTML = '';

  // Datalist esercizi condiviso
  const datalistId = 'editor-esercizi-datalist';
  const datalist = document.createElement('datalist');
  datalist.id = datalistId;
  for (const nome of raccogliNomiEsercizi(store)) {
    const opt = document.createElement('option');
    opt.value = nome;
    datalist.appendChild(opt);
  }
  radice.appendChild(datalist);

  // Riga back + titolo
  const rigaBack = document.createElement('div');
  rigaBack.className = 'riga';
  rigaBack.style.marginBottom = '16px';
  rigaBack.style.gap = '12px';

  const btnAnnulla = document.createElement('button');
  btnAnnulla.className = 'secondario';
  const freccia = icona('frecciaSinistra', 16);
  freccia.style.marginRight = '4px';
  btnAnnulla.appendChild(freccia);
  const spnAnnulla = document.createElement('span');
  spnAnnulla.textContent = 'Annulla';
  btnAnnulla.appendChild(spnAnnulla);
  btnAnnulla.addEventListener('click', () => {
    if (tornaElenco) tornaElenco();
  });

  const h1 = document.createElement('h1');
  h1.className = 'titolo-vista';
  h1.style.margin = '0';
  h1.style.flex = '1';
  h1.textContent = pianoEsistente ? 'Modifica piano' : 'Nuovo piano';

  rigaBack.appendChild(btnAnnulla);
  rigaBack.appendChild(h1);
  radice.appendChild(rigaBack);

  // Banner errore (chip rosso)
  let bannerErrore = null;
  function mostraErrore(msg) {
    if (bannerErrore) bannerErrore.remove();
    bannerErrore = chip(msg, 'rosso');
    bannerErrore.style.marginBottom = '12px';
    rigaBack.insertAdjacentElement('afterend', bannerErrore);
  }

  // Card form principale
  const cardForm = document.createElement('div');
  cardForm.className = 'card';
  radice.appendChild(cardForm);

  // Campo nome
  const labelNome = document.createElement('label');
  labelNome.style.display = 'block';
  labelNome.style.marginBottom = '4px';
  labelNome.style.fontSize = '13px';
  labelNome.style.color = 'var(--testo2)';
  labelNome.textContent = 'Nome piano';
  cardForm.appendChild(labelNome);

  const inputNome = document.createElement('input');
  inputNome.type = 'text';
  inputNome.placeholder = 'es. Scheda PT';
  inputNome.style.width = '100%';
  inputNome.style.marginBottom = '14px';
  inputNome.style.boxSizing = 'border-box';
  if (pianoEsistente) inputNome.value = pianoEsistente.nome;
  cardForm.appendChild(inputNome);

  // Campo tipo
  const labelTipo = document.createElement('label');
  labelTipo.style.display = 'block';
  labelTipo.style.marginBottom = '4px';
  labelTipo.style.fontSize = '13px';
  labelTipo.style.color = 'var(--testo2)';
  labelTipo.textContent = 'Tipo';
  cardForm.appendChild(labelTipo);

  const selectTipo = document.createElement('select');
  selectTipo.style.width = '100%';
  selectTipo.style.marginBottom = '14px';
  selectTipo.style.boxSizing = 'border-box';
  for (const tipo of TIPI_PIANO) {
    const opt = document.createElement('option');
    opt.value = tipo;
    opt.textContent = tipo.charAt(0).toUpperCase() + tipo.slice(1);
    selectTipo.appendChild(opt);
  }
  if (pianoEsistente) selectTipo.value = pianoEsistente.tipo;
  cardForm.appendChild(selectTipo);

  // Sezione dinamica (sedute o pasti)
  const sezioneContenuto = document.createElement('div');
  radice.appendChild(sezioneContenuto);

  // Struttura dati in memoria
  // sedute: [{titolo, giorni:Set, esercizi:[{nome,serie,reps,note}]}]
  // pasti:  [{titolo, testo}]
  let sedute = [];
  let pasti = [];

  function inizializzaDaEsistente() {
    if (!pianoEsistente) return;
    if (pianoEsistente.tipo === 'alimentare') {
      pasti = (pianoEsistente.pasti ?? []).map(p => ({
        titolo: p.titolo ?? '',
        testo: (p.voci ?? []).join('\n'),
      }));
    } else {
      sedute = (pianoEsistente.sedute ?? []).map(s => ({
        id: s.id,
        titolo: s.titolo ?? '',
        giorni: new Set(s.giorni ?? []),
        date: s.date,
        esercizi: (s.esercizi ?? []).map(e => ({
          nome: e.nome ?? '',
          serie: e.serie ?? 1,
          reps: e.reps ?? '',
          note: e.note ?? '',
        })),
      }));
    }
  }
  inizializzaDaEsistente();

  // ── Render sezione in base al tipo ──

  function renderSezioneSedute() {
    sezioneContenuto.innerHTML = '';

    for (let si = 0; si < sedute.length; si++) {
      const s = sedute[si];
      const cardSed = document.createElement('div');
      cardSed.className = 'card';
      cardSed.style.marginBottom = '12px';

      // Header seduta
      const headerSed = document.createElement('div');
      headerSed.className = 'riga';
      headerSed.style.marginBottom = '10px';

      const inputTitolo = document.createElement('input');
      inputTitolo.type = 'text';
      inputTitolo.placeholder = 'Titolo seduta';
      inputTitolo.className = 'cresci';
      inputTitolo.value = s.titolo;
      inputTitolo.addEventListener('input', () => { s.titolo = inputTitolo.value; });

      const btnRimuoviSed = document.createElement('button');
      btnRimuoviSed.className = 'secondario';
      btnRimuoviSed.style.fontSize = '13px';
      btnRimuoviSed.style.padding = '4px 10px';
      btnRimuoviSed.style.color = 'var(--rosso)';
      btnRimuoviSed.textContent = 'Rimuovi';
      const siCapt = si;
      btnRimuoviSed.addEventListener('click', () => {
        sedute.splice(siCapt, 1);
        renderSezioneSedute();
      });

      headerSed.appendChild(inputTitolo);
      headerSed.appendChild(btnRimuoviSed);
      cardSed.appendChild(headerSed);

      // Checkbox giorni
      const labelGiorni = document.createElement('div');
      labelGiorni.style.fontSize = '12px';
      labelGiorni.style.color = 'var(--testo2)';
      labelGiorni.style.marginBottom = '6px';
      labelGiorni.textContent = 'Giorni';
      cardSed.appendChild(labelGiorni);

      const rigaGiorni = document.createElement('div');
      rigaGiorni.style.display = 'flex';
      rigaGiorni.style.gap = '10px';
      rigaGiorni.style.flexWrap = 'wrap';
      rigaGiorni.style.marginBottom = '12px';

      for (let gi = 0; gi < GIORNI_IT.length; gi++) {
        const labelG = document.createElement('label');
        labelG.style.display = 'flex';
        labelG.style.alignItems = 'center';
        labelG.style.gap = '4px';
        labelG.style.fontSize = '13px';
        labelG.style.cursor = 'pointer';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = s.giorni.has(gi);
        const giCapt = gi;
        cb.addEventListener('change', () => {
          if (cb.checked) s.giorni.add(giCapt);
          else s.giorni.delete(giCapt);
        });

        const spanG = document.createElement('span');
        spanG.textContent = GIORNI_IT[gi];

        labelG.appendChild(cb);
        labelG.appendChild(spanG);
        rigaGiorni.appendChild(labelG);
      }
      cardSed.appendChild(rigaGiorni);

      // Esercizi
      const labelEs = document.createElement('div');
      labelEs.style.fontSize = '12px';
      labelEs.style.color = 'var(--testo2)';
      labelEs.style.marginBottom = '6px';
      labelEs.textContent = 'Esercizi';
      cardSed.appendChild(labelEs);

      const tabellaEs = document.createElement('div');
      cardSed.appendChild(tabellaEs);

      function renderEsercizi() {
        tabellaEs.innerHTML = '';
        for (let ei = 0; ei < s.esercizi.length; ei++) {
          const es = s.esercizi[ei];
          const rigaEs = document.createElement('div');
          rigaEs.className = 'riga';
          rigaEs.style.gap = '6px';
          rigaEs.style.marginBottom = '6px';
          rigaEs.style.flexWrap = 'wrap';
          rigaEs.style.alignItems = 'center';

          // Nome
          const inNome = document.createElement('input');
          inNome.type = 'text';
          inNome.placeholder = 'Nome esercizio';
          inNome.setAttribute('list', datalistId);
          inNome.style.flex = '2';
          inNome.style.minWidth = '120px';
          inNome.value = es.nome;
          inNome.addEventListener('input', () => { es.nome = inNome.value; });

          // Serie
          const inSerie = document.createElement('input');
          inSerie.type = 'number';
          inSerie.min = '1';
          inSerie.max = '10';
          inSerie.placeholder = 'Serie';
          inSerie.style.width = '60px';
          inSerie.value = es.serie;
          inSerie.addEventListener('input', () => { es.serie = Number(inSerie.value) || 1; });

          // Reps
          const inReps = document.createElement('input');
          inReps.type = 'text';
          inReps.placeholder = 'Reps';
          inReps.style.width = '80px';
          inReps.value = es.reps;
          inReps.addEventListener('input', () => { es.reps = inReps.value; });

          // Note
          const inNote = document.createElement('input');
          inNote.type = 'text';
          inNote.placeholder = 'Note (opz.)';
          inNote.style.flex = '1';
          inNote.style.minWidth = '80px';
          inNote.value = es.note;
          inNote.addEventListener('input', () => { es.note = inNote.value; });

          // Rimuovi
          const btnRimEs = document.createElement('button');
          btnRimEs.className = 'secondario';
          btnRimEs.style.fontSize = '12px';
          btnRimEs.style.padding = '4px 8px';
          btnRimEs.style.color = 'var(--rosso)';
          btnRimEs.textContent = '×';
          const eiCapt = ei;
          btnRimEs.addEventListener('click', () => {
            s.esercizi.splice(eiCapt, 1);
            renderEsercizi();
          });

          rigaEs.appendChild(inNome);
          rigaEs.appendChild(inSerie);
          rigaEs.appendChild(inReps);
          rigaEs.appendChild(inNote);
          rigaEs.appendChild(btnRimEs);
          tabellaEs.appendChild(rigaEs);
        }
      }
      renderEsercizi();

      // Bottone + esercizio
      const btnAddEs = document.createElement('button');
      btnAddEs.className = 'secondario';
      btnAddEs.style.fontSize = '13px';
      btnAddEs.style.marginTop = '6px';
      btnAddEs.textContent = '+ Esercizio';
      btnAddEs.addEventListener('click', () => {
        s.esercizi.push({ nome: '', serie: 3, reps: '', note: '' });
        renderEsercizi();
      });
      cardSed.appendChild(btnAddEs);

      sezioneContenuto.appendChild(cardSed);
    }

    // Bottone + seduta
    const btnAddSed = document.createElement('button');
    btnAddSed.className = 'secondario';
    btnAddSed.style.marginBottom = '12px';
    btnAddSed.textContent = '+ Seduta';
    btnAddSed.addEventListener('click', () => {
      sedute.push({ titolo: '', giorni: new Set(), esercizi: [] });
      renderSezioneSedute();
    });
    sezioneContenuto.appendChild(btnAddSed);
  }

  function renderSezionePasti() {
    sezioneContenuto.innerHTML = '';

    for (let pi = 0; pi < pasti.length; pi++) {
      const p = pasti[pi];
      const cardP = document.createElement('div');
      cardP.className = 'card';
      cardP.style.marginBottom = '12px';

      const headerP = document.createElement('div');
      headerP.className = 'riga';
      headerP.style.marginBottom = '8px';

      const inputTitoloP = document.createElement('input');
      inputTitoloP.type = 'text';
      inputTitoloP.placeholder = 'Titolo pasto (es. Colazione)';
      inputTitoloP.className = 'cresci';
      inputTitoloP.value = p.titolo;
      inputTitoloP.addEventListener('input', () => { p.titolo = inputTitoloP.value; });

      const btnRimP = document.createElement('button');
      btnRimP.className = 'secondario';
      btnRimP.style.fontSize = '13px';
      btnRimP.style.padding = '4px 10px';
      btnRimP.style.color = 'var(--rosso)';
      btnRimP.textContent = 'Rimuovi';
      const piCapt = pi;
      btnRimP.addEventListener('click', () => {
        pasti.splice(piCapt, 1);
        renderSezionePasti();
      });

      headerP.appendChild(inputTitoloP);
      headerP.appendChild(btnRimP);
      cardP.appendChild(headerP);

      const labelVoci = document.createElement('div');
      labelVoci.style.fontSize = '12px';
      labelVoci.style.color = 'var(--testo2)';
      labelVoci.style.marginBottom = '4px';
      labelVoci.textContent = 'Voci (una per riga)';
      cardP.appendChild(labelVoci);

      const textarea = document.createElement('textarea');
      textarea.rows = 4;
      textarea.style.width = '100%';
      textarea.style.boxSizing = 'border-box';
      textarea.value = p.testo;
      textarea.addEventListener('input', () => { p.testo = textarea.value; });
      cardP.appendChild(textarea);

      sezioneContenuto.appendChild(cardP);
    }

    // Bottone + pasto
    const btnAddP = document.createElement('button');
    btnAddP.className = 'secondario';
    btnAddP.style.marginBottom = '12px';
    btnAddP.textContent = '+ Pasto';
    btnAddP.addEventListener('click', () => {
      pasti.push({ titolo: '', testo: '' });
      renderSezionePasti();
    });
    sezioneContenuto.appendChild(btnAddP);
  }

  function renderSezione() {
    const tipo = selectTipo.value;
    if (tipo === 'alimentare') {
      renderSezionePasti();
    } else {
      renderSezioneSedute();
    }
  }

  selectTipo.addEventListener('change', () => {
    // Reset model on tipo switch (don't carry over incompatible data)
    sedute = [];
    pasti = [];
    renderSezione();
  });

  renderSezione();

  // ── Bottoni Salva / Annulla ──
  const cardAzioni = document.createElement('div');
  cardAzioni.style.marginTop = '16px';
  cardAzioni.style.display = 'flex';
  cardAzioni.style.gap = '8px';

  const btnSalva = document.createElement('button');
  btnSalva.className = 'primario';
  btnSalva.textContent = 'Salva piano';
  btnSalva.addEventListener('click', () => {
    const tipo = selectTipo.value;
    const nomeVal = inputNome.value;

    // Costruisci oggetto in base al tipo
    let obj;
    if (tipo === 'alimentare') {
      const pastiVal = pasti
        .filter(p => p.titolo.trim())
        .map(p => ({
          titolo: p.titolo.trim(),
          voci: p.testo.split('\n').map(v => v.trim()).filter(v => v),
        }));
      obj = { formato: 'futsal-lab-piano@1', nome: nomeVal, tipo, pasti: pastiVal };
    } else {
      const seduteVal = sedute.map(s => ({
        id: s.id,
        titolo: s.titolo,
        giorni: Array.from(s.giorni).sort((a, b) => a - b),
        ...(s.date !== undefined ? { date: s.date } : {}),
        esercizi: s.esercizi
          .filter(e => e.nome.trim())
          .map(e => ({ nome: e.nome.trim(), serie: e.serie, reps: e.reps, note: e.note || undefined })),
      }));
      obj = { formato: 'futsal-lab-piano@1', nome: nomeVal, tipo, sedute: seduteVal };
    }

    const risultato = validaPiano(obj);
    if (!risultato.ok) {
      mostraErrore(risultato.errore);
      return;
    }

    const piano = risultato.piano;
    piano.origine = 'editor';

    // Se in modifica, mantieni id e stato originali
    if (pianoEsistente) {
      piano.id = pianoEsistente.id;
      piano.stato = pianoEsistente.stato;
    }

    // Salva in fl:piani
    const lista = store.leggi('piani', []);
    if (pianoEsistente) {
      // Sostituisci in-place
      const idx = lista.findIndex(p => p.id === pianoEsistente.id);
      if (idx !== -1) {
        lista[idx] = piano;
      } else {
        lista.push(piano);
      }
    } else {
      // Nuovo piano: evita collisione id
      piano.id = idLibero(piano.id, lista);
      lista.push(piano);
    }

    store.scrivi('piani', lista);

    if (tornaElenco) tornaElenco();
  });

  const btnAnnulla2 = document.createElement('button');
  btnAnnulla2.className = 'secondario';
  btnAnnulla2.textContent = 'Annulla';
  btnAnnulla2.addEventListener('click', () => {
    if (tornaElenco) tornaElenco();
  });

  cardAzioni.appendChild(btnSalva);
  cardAzioni.appendChild(btnAnnulla2);
  radice.appendChild(cardAzioni);
}

// ─── HELPER COLLISIONE ID ────────────────────────────────────────────────────

function idLibero(idBase, lista) {
  if (!lista.some(p => p.id === idBase)) return idBase;
  let n = 2;
  while (lista.some(p => p.id === idBase + '-' + n)) n++;
  return idBase + '-' + n;
}

// ─── IMPORT ──────────────────────────────────────────────────────────────────

function apriImport(radice, store, tornaSu) {
  radice.innerHTML = '';

  // Riga back + titolo
  const rigaBack = document.createElement('div');
  rigaBack.className = 'riga';
  rigaBack.style.marginBottom = '16px';
  rigaBack.style.gap = '12px';

  const btnAnnulla = document.createElement('button');
  btnAnnulla.className = 'secondario';
  const freccia = icona('frecciaSinistra', 16);
  freccia.style.marginRight = '4px';
  btnAnnulla.appendChild(freccia);
  const spnBack = document.createElement('span');
  spnBack.textContent = 'Annulla';
  btnAnnulla.appendChild(spnBack);
  btnAnnulla.addEventListener('click', () => { if (tornaSu) tornaSu(); });

  const h1 = document.createElement('h1');
  h1.className = 'titolo-vista';
  h1.style.margin = '0';
  h1.style.flex = '1';
  h1.textContent = 'Importa piano';

  rigaBack.appendChild(btnAnnulla);
  rigaBack.appendChild(h1);
  radice.appendChild(rigaBack);

  // Zona errore (chip rosso)
  let bannerErroreEl = null;
  function mostraErroreImport(msg) {
    if (bannerErroreEl) bannerErroreEl.remove();
    bannerErroreEl = chip(msg, 'rosso');
    bannerErroreEl.style.marginBottom = '12px';
    rigaBack.insertAdjacentElement('afterend', bannerErroreEl);
  }

  // Card con file input + textarea
  const cardInput = document.createElement('div');
  cardInput.className = 'card';
  radice.appendChild(cardInput);

  const labelFile = document.createElement('label');
  labelFile.style.display = 'block';
  labelFile.style.marginBottom = '4px';
  labelFile.style.fontSize = '13px';
  labelFile.style.color = 'var(--testo2)';
  labelFile.textContent = 'Scegli file .json o .futsallab.json';
  cardInput.appendChild(labelFile);

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json,.futsallab.json,application/json';
  fileInput.style.display = 'block';
  fileInput.style.marginBottom = '14px';
  cardInput.appendChild(fileInput);

  const labelPasta = document.createElement('label');
  labelPasta.style.display = 'block';
  labelPasta.style.marginBottom = '4px';
  labelPasta.style.fontSize = '13px';
  labelPasta.style.color = 'var(--testo2)';
  labelPasta.textContent = 'Oppure incolla qui il testo del piano';
  cardInput.appendChild(labelPasta);

  const textarea = document.createElement('textarea');
  textarea.rows = 6;
  textarea.style.width = '100%';
  textarea.style.boxSizing = 'border-box';
  textarea.style.marginBottom = '14px';
  textarea.placeholder = '{ "formato": "futsal-lab-piano@1", ... }';
  cardInput.appendChild(textarea);

  // Quando viene selezionato un file, carica il testo nella textarea
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => { textarea.value = e.target.result; };
    reader.onerror = () => mostraErroreImport('Impossibile leggere il file.');
    reader.readAsText(file);
  });

  const btnAnteprima = document.createElement('button');
  btnAnteprima.textContent = 'Anteprima';
  cardInput.appendChild(btnAnteprima);

  // Zona anteprima (iniettata sotto)
  const zonaAnteprima = document.createElement('div');
  radice.appendChild(zonaAnteprima);

  btnAnteprima.addEventListener('click', () => {
    zonaAnteprima.innerHTML = '';
    if (bannerErroreEl) { bannerErroreEl.remove(); bannerErroreEl = null; }

    const testo = textarea.value.trim();
    if (!testo) { mostraErroreImport('Nessun testo da analizzare: scegli un file o incolla il JSON.'); return; }

    let obj;
    try {
      obj = JSON.parse(testo);
    } catch (_) {
      mostraErroreImport('File non leggibile: non è JSON valido.');
      return;
    }

    const risultato = validaPiano(obj);
    if (!risultato.ok) {
      mostraErroreImport(risultato.errore);
      return;
    }

    // Piano valido: costruisci anteprima
    const piano = risultato.piano;
    renderAnteprima(piano, zonaAnteprima, store, tornaSu);
  });
}

function renderAnteprima(piano, contenitore, store, tornaSu) {
  contenitore.innerHTML = '';

  // ── Raccolta slugs noti ──
  const slugNoti = new Set();
  const nomiDaSlug = new Map(); // slug → nome leggibile

  // Da SEDUTE precaricate
  for (const seduta of Object.values(SEDUTE)) {
    for (const es of seduta.esercizi ?? []) {
      const s = slugEsercizio(es.nome);
      slugNoti.add(s);
      if (!nomiDaSlug.has(s)) nomiDaSlug.set(s, es.nome);
    }
  }

  // Da piani esistenti
  const pianiEsistenti = store.leggi('piani', []);
  for (const p of pianiEsistenti) {
    for (const sed of p.sedute ?? []) {
      for (const es of sed.esercizi ?? []) {
        const s = slugEsercizio(es.nome);
        slugNoti.add(s);
        if (!nomiDaSlug.has(s)) nomiDaSlug.set(s, es.nome);
      }
    }
  }

  // Da registro
  const registro = store.leggi('registro', {});
  for (const slug of Object.keys(registro)) {
    slugNoti.add(slug);
  }

  const slugNotiArr = Array.from(slugNoti);

  // ── Card riepilogo ──
  const cardRiepilogo = creaCard('Anteprima piano');
  contenitore.appendChild(cardRiepilogo);

  const rigaNome = document.createElement('div');
  rigaNome.className = 'riga';
  const lNome = document.createElement('span');
  lNome.className = 'secondario';
  lNome.textContent = 'Nome';
  const vNome = document.createElement('span');
  vNome.className = 'cresci';
  vNome.style.textAlign = 'right';
  vNome.textContent = piano.nome;
  rigaNome.appendChild(lNome);
  rigaNome.appendChild(vNome);
  cardRiepilogo.appendChild(rigaNome);

  const rigaTipo = document.createElement('div');
  rigaTipo.className = 'riga';
  const lTipo = document.createElement('span');
  lTipo.className = 'secondario';
  lTipo.textContent = 'Tipo';
  const vTipo = document.createElement('span');
  vTipo.className = 'cresci';
  vTipo.style.textAlign = 'right';
  vTipo.textContent = piano.tipo;
  rigaTipo.appendChild(lTipo);
  rigaTipo.appendChild(vTipo);
  cardRiepilogo.appendChild(rigaTipo);

  const nUnita = piano.tipo === 'alimentare'
    ? (piano.pasti ?? []).length
    : (piano.sedute ?? []).length;
  const labelUnita = piano.tipo === 'alimentare'
    ? (nUnita !== 1 ? 'pasti' : 'pasto')
    : (nUnita !== 1 ? 'sedute' : 'seduta');

  const rigaN = document.createElement('div');
  rigaN.className = 'riga';
  const lN = document.createElement('span');
  lN.className = 'secondario';
  lN.textContent = piano.tipo === 'alimentare' ? 'Pasti' : 'Sedute';
  const vN = document.createElement('span');
  vN.className = 'cresci';
  vN.style.textAlign = 'right';
  vN.textContent = `${nUnita} ${labelUnita}`;
  rigaN.appendChild(lN);
  rigaN.appendChild(vN);
  cardRiepilogo.appendChild(rigaN);

  // ── Lista esercizi (solo piani non alimentari) ──
  if (piano.tipo !== 'alimentare') {
    const tuttiEsercizi = [];
    for (const sed of piano.sedute ?? []) {
      for (const es of sed.esercizi ?? []) {
        if (!tuttiEsercizi.some(e => e.nome === es.nome)) {
          tuttiEsercizi.push(es);
        }
      }
    }

    const giaNoti = tuttiEsercizi.filter(e => slugNoti.has(slugEsercizio(e.nome)));
    const nuovi = tuttiEsercizi.filter(e => !slugNoti.has(slugEsercizio(e.nome)));

    if (giaNoti.length > 0) {
      contenitore.appendChild(intestazione('GIÀ NOTI'));
      const cardNoti = document.createElement('div');
      cardNoti.className = 'card';
      contenitore.appendChild(cardNoti);
      for (const es of giaNoti) {
        const riga = document.createElement('div');
        riga.className = 'riga';
        const span = document.createElement('span');
        span.className = 'cresci';
        span.style.fontSize = '14px';
        span.textContent = es.nome;
        riga.appendChild(span);
        cardNoti.appendChild(riga);
      }
    }

    if (nuovi.length > 0) {
      contenitore.appendChild(intestazione('NUOVI'));
      const cardNuovi = document.createElement('div');
      cardNuovi.className = 'card';
      contenitore.appendChild(cardNuovi);
      for (const es of nuovi) {
        const riga = document.createElement('div');
        riga.className = 'riga';
        const span = document.createElement('span');
        span.className = 'cresci';
        span.style.fontSize = '14px';
        span.textContent = es.nome;
        riga.appendChild(span);
        cardNuovi.appendChild(riga);
      }
    }

    // ── Suggerimenti unificazione ──
    const suggerimenti = suggerisciUnificazioni(piano, slugNotiArr);
    if (suggerimenti.length > 0) {
      contenitore.appendChild(intestazione('POSSIBILI UNIFICAZIONI'));
      const cardSugg = document.createElement('div');
      cardSugg.className = 'card';
      contenitore.appendChild(cardSugg);

      // Nota: usiamo un array in memoria per rimuovere righe già gestite
      const suggAttivi = suggerimenti.map(s => ({ ...s, rimosso: false }));

      function renderSuggerimenti() {
        // Rimuovi vecchie righe suggerimento (lasciate in poi)
        cardSugg.querySelectorAll('.sugg-riga').forEach(el => el.remove());

        for (const sugg of suggAttivi) {
          if (sugg.rimosso) continue;

          // Cerca il nome leggibile per "a"
          const nomeNoto = nomiDaSlug.get(sugg.a) ?? sugg.a;

          // Trova il nome attuale dell'esercizio importato (da slug)
          let nomeImportato = sugg.da;
          outer: for (const sed of piano.sedute ?? []) {
            for (const es of sed.esercizi ?? []) {
              if (slugEsercizio(es.nome) === sugg.da) {
                nomeImportato = es.nome;
                break outer;
              }
            }
          }

          const rigaSugg = document.createElement('div');
          rigaSugg.className = 'riga sugg-riga';
          rigaSugg.style.gap = '8px';
          rigaSugg.style.flexWrap = 'wrap';
          rigaSugg.style.alignItems = 'center';
          rigaSugg.style.marginBottom = '6px';

          const testoSugg = document.createElement('span');
          testoSugg.className = 'cresci';
          testoSugg.style.fontSize = '13px';
          // Uso textContent per sicurezza su valori utente
          testoSugg.textContent = '';
          const q1 = document.createElement('span');
          q1.style.fontStyle = 'italic';
          q1.textContent = '«' + nomeImportato + '»';
          const mezzo = document.createTextNode(' sembra ');
          const q2 = document.createElement('span');
          q2.style.fontWeight = '600';
          q2.textContent = '«' + nomeNoto + '»';
          testoSugg.appendChild(q1);
          testoSugg.appendChild(mezzo);
          testoSugg.appendChild(q2);

          const btnUnifica = document.createElement('button');
          btnUnifica.className = 'secondario';
          btnUnifica.style.fontSize = '12px';
          btnUnifica.style.padding = '4px 10px';
          btnUnifica.textContent = 'Unifica';

          const btnTieni = document.createElement('button');
          btnTieni.className = 'secondario';
          btnTieni.style.fontSize = '12px';
          btnTieni.style.padding = '4px 10px';
          btnTieni.textContent = 'Tieni separato';

          const daSlug = sugg.da;
          btnUnifica.addEventListener('click', () => {
            // Rinomina l'esercizio nel piano importato col nome noto
            for (const sed of piano.sedute ?? []) {
              for (const es of sed.esercizi ?? []) {
                if (slugEsercizio(es.nome) === daSlug) {
                  es.nome = nomeNoto;
                }
              }
            }
            sugg.rimosso = true;
            renderSuggerimenti();
          });

          btnTieni.addEventListener('click', () => {
            sugg.rimosso = true;
            renderSuggerimenti();
          });

          rigaSugg.appendChild(testoSugg);
          rigaSugg.appendChild(btnUnifica);
          rigaSugg.appendChild(btnTieni);
          cardSugg.appendChild(rigaSugg);
        }
      }

      renderSuggerimenti();
    }
  }

  // ── Bottone Aggiungi piano ──
  const btnAggiungi = document.createElement('button');
  btnAggiungi.className = 'primario';
  btnAggiungi.textContent = 'Aggiungi piano';
  btnAggiungi.style.marginTop = '16px';
  contenitore.appendChild(btnAggiungi);

  btnAggiungi.addEventListener('click', () => {
    if (btnAggiungi.disabled) return;
    btnAggiungi.disabled = true;
    const lista = store.leggi('piani', []);
    piano.id = idLibero(piano.id, lista);
    piano.origine = 'import';
    lista.push(piano);
    store.scrivi('piani', lista);
    if (tornaSu) tornaSu();
  });
}

// ─── EXPORT ──────────────────────────────────────────────────────────────────

function apriExport(piano) {
  const json = esportaPiano(piano);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = piano.id + '.futsallab.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function dataBreveit(iso) {
  const d = new Date(iso + 'T12:00:00');
  const gg = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
  const mm = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  return `${gg[d.getDay()]} ${d.getDate()} ${mm[d.getMonth()]}`;
}

function contaSedutePiano(piano) {
  if (piano.tipo === 'alimentare') return (piano.pasti ?? []).length;
  if (piano.id === 'programma-2026') return Object.keys(SEDUTE).length;
  return (piano.sedute ?? []).length;
}

// ─── DETTAGLIO PIANO PRECARICATO ─────────────────────────────────────────────

function renderDettaglioPrecaricato(stato, radice, tornaSu) {
  const { store, oggi } = stato;
  radice.innerHTML = '';

  // Riga indietro + titolo
  const rigaBack = document.createElement('div');
  rigaBack.className = 'riga';
  rigaBack.style.marginBottom = '16px';
  rigaBack.style.gap = '12px';

  const btnBack = document.createElement('button');
  btnBack.className = 'secondario';
  const freccia = icona('frecciaSinistra', 16);
  freccia.style.marginRight = '4px';
  btnBack.appendChild(freccia);
  const spnBack = document.createElement('span');
  spnBack.textContent = 'Piani';
  btnBack.appendChild(spnBack);
  btnBack.addEventListener('click', tornaSu);

  const h1 = document.createElement('h1');
  h1.className = 'titolo-vista';
  h1.style.margin = '0';
  h1.style.flex = '1';
  h1.textContent = 'Programma Futsal 2026';

  rigaBack.appendChild(btnBack);
  rigaBack.appendChild(h1);
  radice.appendChild(rigaBack);

  // Segmented control di navigazione interna
  const pillole = ['Calendario', 'Sedute', 'Regole', 'Stagione'];
  let pillolaCorrente = 'Calendario';
  let indiceCorrente = 0;

  const contenuto = document.createElement('div');
  contenuto.style.marginTop = '16px';

  function renderContenutoPillola(nome) {
    contenuto.innerHTML = '';
    if (nome === 'Calendario') renderCalendario(contenuto, store, oggi);
    else if (nome === 'Sedute') renderSedute(contenuto);
    else if (nome === 'Regole') renderRegole(contenuto);
    else if (nome === 'Stagione') renderStagione(contenuto);
  }

  const seg = segmented(pillole, indiceCorrente, (i) => {
    pillolaCorrente = pillole[i];
    indiceCorrente = i;
    renderContenutoPillola(pillole[i]);
  });
  seg.style.marginBottom = '4px';
  radice.appendChild(seg);
  radice.appendChild(contenuto);

  renderContenutoPillola(pillolaCorrente);
}

// ─── SOTTO-RENDER PILLOLE ─────────────────────────────────────────────────────

function renderCalendario(contenuto, store, oggi) {
  const seduteDati = store.leggi('sedute', {});

  // Raggruppa CALENDARIO a blocchi di 7 giorni a partire da CAL_START
  const chiavi = Object.keys(CALENDARIO).sort();
  if (!chiavi.length) return;

  const settimane = [];
  let settimanaCorrente = [];
  for (let i = 0; i < chiavi.length; i++) {
    settimanaCorrente.push(chiavi[i]);
    if (settimanaCorrente.length === 7 || i === chiavi.length - 1) {
      settimane.push(settimanaCorrente);
      settimanaCorrente = [];
    }
  }

  for (let si = 0; si < settimane.length; si++) {
    const sett = settimane[si];
    const primaData = sett[0];
    const ultimaData = sett[sett.length - 1];
    const card = creaCard(`Settimana ${si + 1} · ${dataBreveit(primaData)}–${dataBreveit(ultimaData)}`);

    for (const iso of sett) {
      const seduteCal = CALENDARIO[iso] ?? [];
      const riga = document.createElement('div');
      riga.className = 'riga';

      const dataSpan = document.createElement('span');
      dataSpan.style.minWidth = '90px';

      if (iso === oggi) {
        // Pill lime per giorno corrente
        dataSpan.style.cssText = [
          'min-width:90px', 'display:inline-flex', 'align-items:center',
          'justify-content:center', 'background:var(--accento)',
          'color:var(--on-accento)', 'border-radius:999px',
          'padding:2px 10px', 'font-size:13px', 'font-weight:600',
        ].join(';');
        dataSpan.textContent = dataBreveit(iso);
      } else {
        dataSpan.style.fontSize = '13px';
        dataSpan.style.color = 'var(--testo2)';
        dataSpan.textContent = dataBreveit(iso);
      }

      const dxSpan = document.createElement('span');
      dxSpan.className = 'cresci';
      dxSpan.style.fontSize = '13px';

      if (seduteCal.length === 0) {
        dxSpan.textContent = 'riposo';
        dxSpan.style.color = 'var(--testo3)';
        dxSpan.className = 'cresci footnote';
      } else {
        // Verifica se tutte le sedute del giorno sono state fatte
        const tutteFatte = seduteCal.every(([codice]) => {
          const chiave = chiaveSeduta('programma-2026', codice);
          return !!(seduteDati[iso] && seduteDati[iso][chiave]);
        });

        const codici = seduteCal.map(([codice]) => codice).join(' · ');

        if (tutteFatte) {
          riga.classList.add('spento');
          // Testo codici + icona spunta lime
          const codiciSpan = document.createElement('span');
          codiciSpan.style.marginRight = '6px';
          codiciSpan.textContent = codici;
          dxSpan.appendChild(codiciSpan);
          const ico = icona('spunta', 14);
          ico.style.color = 'var(--accento)';
          dxSpan.appendChild(ico);
        } else {
          dxSpan.textContent = codici;
        }
      }

      riga.appendChild(dataSpan);
      riga.appendChild(dxSpan);
      card.appendChild(riga);
    }

    contenuto.appendChild(card);
  }
}

function renderSedute(contenuto) {
  for (const [codice, seduta] of Object.entries(SEDUTE)) {
    const card = creaCard('');

    // Intestazione: titolo + codice
    const header = document.createElement('div');
    header.className = 'riga';
    const titolo = document.createElement('span');
    titolo.className = 'primario cresci';
    titolo.style.fontWeight = '600';
    titolo.textContent = seduta.titolo;
    const badgeCodice = document.createElement('span');
    badgeCodice.className = 'eyebrow';
    badgeCodice.textContent = codice;
    header.appendChild(titolo);
    header.appendChild(badgeCodice);
    card.appendChild(header);

    // Esercizi o voci
    if (seduta.esercizi && seduta.esercizi.length > 0) {
      for (const es of seduta.esercizi) {
        const riga = document.createElement('div');
        riga.className = 'riga';
        riga.style.flexDirection = 'column';
        riga.style.alignItems = 'flex-start';
        riga.style.gap = '2px';

        const nomeSpan = document.createElement('span');
        nomeSpan.className = 'headline';
        nomeSpan.textContent = es.nome;

        const dettaglio = document.createElement('span');
        dettaglio.className = 'secondario footnote';
        let det = `${es.serie} × ${es.reps}`;
        if (es.note) det += ` — ${es.note}`;
        dettaglio.textContent = det;

        riga.appendChild(nomeSpan);
        riga.appendChild(dettaglio);
        card.appendChild(riga);
      }
    } else if (seduta.voci && seduta.voci.length > 0) {
      for (const voce of seduta.voci) {
        const p = document.createElement('p');
        p.className = 'footnote';
        p.style.color = 'var(--testo2)';
        p.style.padding = '4px 0';
        p.textContent = voce;
        card.appendChild(p);
      }
    }

    contenuto.appendChild(card);
  }
}

function renderRegole(contenuto) {
  const card = creaCard('5 Regole d\'oro');

  for (let i = 0; i < REGOLE_ORO.length; i++) {
    const regola = REGOLE_ORO[i];
    const riga = document.createElement('div');
    riga.className = 'riga';
    riga.style.gap = '12px';
    riga.style.padding = '8px 0';

    const numero = document.createElement('span');
    numero.style.fontWeight = '700';
    numero.style.fontSize = '20px';
    numero.style.color = 'var(--verde)';
    numero.style.minWidth = '28px';
    numero.textContent = String(i + 1);

    // Regola club → chip ambra; altre → span normale
    const isClub = regola.toLowerCase().includes('club') || regola.toLowerCase().includes('squadra');
    let testoEl;
    if (isClub) {
      testoEl = chip(regola, 'ambra');
      testoEl.className += ' cresci';
    } else {
      testoEl = document.createElement('span');
      testoEl.className = 'cresci';
      testoEl.style.fontSize = '14px';
      testoEl.textContent = regola;
    }

    riga.appendChild(numero);
    riga.appendChild(testoEl);
    card.appendChild(riga);
  }

  // Nota recupero come chip ambra
  const chipRec = chip(
    'Recupero: tra una seduta di forza e l\'altra lascia almeno 48 h. Il muscolo cresce nel riposo, non durante lo sforzo.',
    'ambra'
  );
  chipRec.style.marginTop = '12px';
  card.appendChild(chipRec);

  contenuto.appendChild(card);
}

function renderStagione(contenuto) {
  const card = creaCard('Template Stagione');

  for (const voce of TEMPLATE_STAGIONE.voci) {
    const riga = document.createElement('div');
    riga.className = 'riga';
    const bullet = document.createElement('span');
    bullet.textContent = '·';
    bullet.style.color = 'var(--verde)';
    bullet.style.fontWeight = '700';
    const testo = document.createElement('span');
    testo.className = 'cresci';
    testo.style.fontSize = '14px';
    testo.textContent = voce;
    riga.appendChild(bullet);
    riga.appendChild(testo);
    card.appendChild(riga);
  }

  const chipReg = chip(TEMPLATE_STAGIONE.regola, 'ambra');
  chipReg.style.marginTop = '12px';
  card.appendChild(chipReg);

  contenuto.appendChild(card);
}

// ─── DETTAGLIO PIANI UTENTE ───────────────────────────────────────────────────

function renderDettaglioUtente(stato, radice, piano, tornaSu) {
  radice.innerHTML = '';

  // Riga indietro + titolo
  const rigaBack = document.createElement('div');
  rigaBack.className = 'riga';
  rigaBack.style.marginBottom = '16px';
  rigaBack.style.gap = '12px';

  const btnBack = document.createElement('button');
  btnBack.className = 'secondario';
  const freccia = icona('frecciaSinistra', 16);
  freccia.style.marginRight = '4px';
  btnBack.appendChild(freccia);
  const spnBackTxt = document.createElement('span');
  spnBackTxt.textContent = 'Piani';
  btnBack.appendChild(spnBackTxt);
  btnBack.addEventListener('click', tornaSu);

  const h1 = document.createElement('h1');
  h1.className = 'titolo-vista';
  h1.style.margin = '0';
  h1.style.flex = '1';
  h1.textContent = piano.nome;

  rigaBack.appendChild(btnBack);
  rigaBack.appendChild(h1);
  radice.appendChild(rigaBack);

  // Badge tipo + origine come chip informativi
  const metaRiga = document.createElement('div');
  metaRiga.style.display = 'flex';
  metaRiga.style.gap = '8px';
  metaRiga.style.marginBottom = '12px';
  const chipTipo = chip(piano.tipo, 'verde');
  const chipOrigine = chip(piano.origine, 'verde');
  metaRiga.appendChild(chipTipo);
  metaRiga.appendChild(chipOrigine);
  radice.appendChild(metaRiga);

  // Bottoni Modifica / Esporta
  const azioniBtns = document.createElement('div');
  azioniBtns.style.display = 'flex';
  azioniBtns.style.gap = '8px';
  azioniBtns.style.marginBottom = '16px';

  const btnModifica = document.createElement('button');
  btnModifica.className = 'secondario';
  btnModifica.appendChild(icona('matita', 14));
  const spnMod = document.createElement('span');
  spnMod.style.marginLeft = '6px';
  spnMod.textContent = 'Modifica';
  btnModifica.appendChild(spnMod);
  btnModifica.addEventListener('click', () => apriEditor(radice, stato.store, piano, tornaSu));

  const btnEsporta = document.createElement('button');
  btnEsporta.className = 'secondario';
  btnEsporta.appendChild(icona('esporta', 14));
  const spnEsp = document.createElement('span');
  spnEsp.style.marginLeft = '6px';
  spnEsp.textContent = 'Esporta';
  btnEsporta.appendChild(spnEsp);
  btnEsporta.addEventListener('click', () => apriExport(piano));

  azioniBtns.appendChild(btnModifica);
  azioniBtns.appendChild(btnEsporta);
  radice.appendChild(azioniBtns);

  // Contenuto: alimentare → pasti; allenamento/tecnica → sedute
  if (piano.tipo === 'alimentare') {
    for (const pasto of piano.pasti ?? []) {
      const card = creaCard(pasto.titolo);
      for (const voce of pasto.voci ?? []) {
        const p = document.createElement('p');
        p.className = 'footnote';
        p.style.padding = '3px 0';
        p.textContent = voce;
        card.appendChild(p);
      }
      radice.appendChild(card);
    }
  } else {
    for (const seduta of piano.sedute ?? []) {
      const card = creaCard(seduta.titolo);

      // Giorni e/o date
      const giorniLabel = document.createElement('p');
      giorniLabel.className = 'footnote';
      giorniLabel.style.color = 'var(--testo3)';
      giorniLabel.style.marginBottom = '8px';
      const partiGiorni = [];
      if (seduta.giorni && seduta.giorni.length > 0) {
        partiGiorni.push(seduta.giorni.map(g => GIORNI_IT[g]).join(', '));
      }
      if (seduta.date && seduta.date.length > 0) {
        partiGiorni.push(seduta.date.join(', '));
      }
      giorniLabel.textContent = partiGiorni.join(' · ');
      card.appendChild(giorniLabel);

      // Esercizi
      for (const es of seduta.esercizi ?? []) {
        const riga = document.createElement('div');
        riga.className = 'riga';
        riga.style.flexDirection = 'column';
        riga.style.alignItems = 'flex-start';
        riga.style.gap = '2px';

        const nomeSpan = document.createElement('span');
        nomeSpan.className = 'headline';
        nomeSpan.textContent = es.nome;

        const dettaglio = document.createElement('span');
        dettaglio.className = 'secondario footnote';
        let det = `${es.serie} × ${es.reps}`;
        if (es.note) det += ` — ${es.note}`;
        dettaglio.textContent = det;

        riga.appendChild(nomeSpan);
        riga.appendChild(dettaglio);
        card.appendChild(riga);
      }

      // Voci
      for (const voce of seduta.voci ?? []) {
        const p = document.createElement('p');
        p.className = 'footnote';
        p.style.color = 'var(--testo2)';
        p.style.padding = '3px 0';
        p.textContent = voce;
        card.appendChild(p);
      }

      radice.appendChild(card);
    }
  }
}

// ─── ELENCO PIANI ────────────────────────────────────────────────────────────

function renderElenco(stato, radice) {
  const { store } = stato;
  radice.innerHTML = '';

  // Intestazione con titolo-vista e bottoni azione
  const headerDiv = document.createElement('div');
  headerDiv.className = 'riga';
  headerDiv.style.marginBottom = '16px';
  headerDiv.style.alignItems = 'center';

  const h1 = document.createElement('h1');
  h1.className = 'titolo-vista';
  h1.style.margin = '0';
  h1.style.flex = '1';
  h1.textContent = 'Piani';
  headerDiv.appendChild(h1);

  const azioniHeader = document.createElement('div');
  azioniHeader.style.display = 'flex';
  azioniHeader.style.gap = '8px';

  const btnNuovo = document.createElement('button');
  btnNuovo.className = 'primario';
  btnNuovo.style.padding = '8px 14px';
  btnNuovo.style.fontSize = '15px';
  const icoPiu = icona('piu', 16);
  icoPiu.style.marginRight = '4px';
  btnNuovo.appendChild(icoPiu);
  const spnNuovo = document.createElement('span');
  spnNuovo.textContent = 'Nuovo piano';
  btnNuovo.appendChild(spnNuovo);
  btnNuovo.addEventListener('click', () => apriEditor(radice, store, null, () => renderElenco(stato, radice)));

  const btnImporta = document.createElement('button');
  btnImporta.className = 'secondario';
  btnImporta.style.padding = '8px 14px';
  btnImporta.style.fontSize = '15px';
  btnImporta.appendChild(icona('importa', 16));
  const spnImporta = document.createElement('span');
  spnImporta.style.marginLeft = '4px';
  spnImporta.textContent = 'Importa';
  btnImporta.appendChild(spnImporta);
  btnImporta.addEventListener('click', () => apriImport(radice, store, () => renderElenco(stato, radice)));

  azioniHeader.appendChild(btnNuovo);
  azioniHeader.appendChild(btnImporta);
  headerDiv.appendChild(azioniHeader);
  radice.appendChild(headerDiv);

  const piani = store.leggi('piani', []);
  const attivi = piani.filter(p => p.stato === 'attivo');
  const archiviati = piani.filter(p => p.stato === 'archiviato');

  function renderSezione(titoloSez, lista) {
    if (!lista.length) return;

    radice.appendChild(intestazione(titoloSez));

    const cardGruppo = document.createElement('div');
    cardGruppo.className = 'card';
    cardGruppo.style.marginBottom = '12px';
    cardGruppo.style.padding = '4px 0';

    for (let pi = 0; pi < lista.length; pi++) {
      const piano = lista[pi];
      const isUltimo = pi === lista.length - 1;

      const riga = document.createElement('div');
      riga.style.cssText = [
        'cursor:pointer', 'padding:12px 16px',
        'gap:12px', 'align-items:flex-start', 'flex-direction:column',
        'display:flex',
        isUltimo ? '' : 'border-bottom:1px solid var(--bordo)',
      ].join(';');

      // Riga principale: icona tipo + testo + chevron
      const rigaPrincipale = document.createElement('div');
      rigaPrincipale.style.cssText = 'display:flex;align-items:center;gap:12px;width:100%';

      // Icona tipo
      rigaPrincipale.appendChild(iconaTipoPiano(piano.tipo));

      // Testo centrale
      const testoWrap = document.createElement('div');
      testoWrap.style.cssText = 'flex:1;min-width:0;display:flex;flex-direction:column;gap:2px';

      const nomeSpan = document.createElement('span');
      nomeSpan.className = 'headline';
      nomeSpan.style.overflow = 'hidden';
      nomeSpan.style.textOverflow = 'ellipsis';
      nomeSpan.style.whiteSpace = 'nowrap';
      nomeSpan.textContent = piano.nome;

      const metaSpan = document.createElement('span');
      metaSpan.className = 'footnote';
      metaSpan.style.color = 'var(--testo2)';
      const nSedute = contaSedutePiano(piano);
      const labelN = piano.tipo === 'alimentare'
        ? `${nSedute} ${nSedute !== 1 ? 'pasti' : 'pasto'}`
        : `${nSedute} ${nSedute !== 1 ? 'sedute' : 'seduta'}`;
      metaSpan.textContent = `${piano.origine} · ${labelN}`;

      testoWrap.appendChild(nomeSpan);
      testoWrap.appendChild(metaSpan);

      // Badge stato
      const badge = badgeStato(piano.stato);

      // Chevron
      const chev = icona('chevronDestra', 16);
      chev.style.color = 'var(--testo3)';
      chev.style.flexShrink = '0';

      rigaPrincipale.appendChild(testoWrap);
      rigaPrincipale.appendChild(badge);
      rigaPrincipale.appendChild(chev);
      riga.appendChild(rigaPrincipale);

      // Tap sulla card → dettaglio
      riga.addEventListener('click', e => {
        // Solo se non cliccato su un bottone interno
        if (e.target.closest('button')) return;
        if (piano.id === 'programma-2026') {
          renderDettaglioPrecaricato(stato, radice, () => renderElenco(stato, radice));
        } else {
          renderDettaglioUtente(stato, radice, piano, () => renderElenco(stato, radice));
        }
      });

      // Bottoni azione: Archivia/Riattiva sempre visibile; Elimina solo per editor/import archiviati
      const isArchiviato = piano.stato === 'archiviato';

      {
        const btnRow = document.createElement('div');
        btnRow.style.display = 'flex';
        btnRow.style.gap = '8px';

        // Archivia / Riattiva
        const btnToggle = document.createElement('button');
        btnToggle.className = 'secondario';
        btnToggle.style.fontSize = '13px';
        btnToggle.style.padding = '6px 12px';
        btnToggle.style.display = 'flex';
        btnToggle.style.alignItems = 'center';
        btnToggle.style.gap = '4px';
        btnToggle.appendChild(icona('archivio', 14));
        const spnToggle = document.createElement('span');
        spnToggle.textContent = isArchiviato ? 'Riattiva' : 'Archivia';
        btnToggle.appendChild(spnToggle);
        btnToggle.addEventListener('click', e => {
          e.stopPropagation();
          const lista = store.leggi('piani', []);
          const idx = lista.findIndex(p => p.id === piano.id);
          if (idx !== -1) {
            lista[idx].stato = isArchiviato ? 'attivo' : 'archiviato';
            store.scrivi('piani', lista);
          }
          renderElenco(stato, radice);
        });
        btnRow.appendChild(btnToggle);

        // Elimina (solo per editor/import in stato archiviato)
        if (isArchiviato && (piano.origine === 'editor' || piano.origine === 'import')) {
          const btnElimina = document.createElement('button');
          btnElimina.className = 'distruttivo';
          btnElimina.style.fontSize = '13px';
          btnElimina.style.padding = '6px 12px';
          btnElimina.style.display = 'flex';
          btnElimina.style.alignItems = 'center';
          btnElimina.style.gap = '4px';
          btnElimina.appendChild(icona('cestino', 14));
          const spnEl = document.createElement('span');
          spnEl.textContent = 'Elimina';
          btnElimina.appendChild(spnEl);
          btnElimina.addEventListener('click', e => {
            e.stopPropagation();
            if (confirm('Eliminare definitivamente questo piano? Lo storico esercizi resta.')) {
              const lista = store.leggi('piani', []);
              const nuova = lista.filter(p => p.id !== piano.id);
              store.scrivi('piani', nuova);
              renderElenco(stato, radice);
            }
          });
          btnRow.appendChild(btnElimina);
        }

        riga.appendChild(btnRow);
      }

      cardGruppo.appendChild(riga);
    }

    radice.appendChild(cardGruppo);
  }

  renderSezione('ATTIVI', attivi);
  renderSezione('ARCHIVIATI', archiviati);

  if (!attivi.length && !archiviati.length) {
    const vuoto = document.createElement('p');
    vuoto.className = 'secondario';
    vuoto.style.textAlign = 'center';
    vuoto.style.marginTop = '40px';
    vuoto.textContent = 'Nessun piano. Crea o importa un piano per iniziare.';
    radice.appendChild(vuoto);
  }
}

// ─── EXPORT PRINCIPALE ────────────────────────────────────────────────────────

export function vistaPiani(stato, radice) {
  renderElenco(stato, radice);
}
