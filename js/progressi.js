import { trendPeso, bandaObiettivo, migliorSerie, mediaSettimanale } from './calcoli.js';
import { lineaSVG } from './grafici.js';
import { SEDUTE } from './programma.js';
import { giorniTra, formattaSerie } from './util.js';
import { fasciaRecupero } from './whoop.js';
import { salvaFoto, elencoFoto, urlFoto, eliminaFoto } from './foto.js';
import { segmented, chip, statoVuoto } from './ui.js';
import { icona } from './icone.js';
import { apriAllenamentoLibero } from './allenamentoLibero.js';
import { ritmoASecondi, formattaCorsa } from './corse.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function nomeDaSlug(slug, piani, allenamenti) {
  // Search in plans' exercises
  for (const piano of (piani || [])) {
    for (const seduta of (piano.sedute || [])) {
      for (const es of (seduta.esercizi || [])) {
        if (es.slug === slug || slugDaNome(es.nome) === slug) {
          return es.nome;
        }
      }
    }
  }
  // Search in SEDUTE
  for (const sed of Object.values(SEDUTE)) {
    for (const es of (sed.esercizi || [])) {
      if (slugDaNome(es.nome) === slug) return es.nome;
    }
  }
  // Search in fl:allenamenti exercise names
  for (const al of (allenamenti || [])) {
    for (const riga of (al.righe || [])) {
      if (riga.tipo === 'esercizio' && riga.nome && slugDaNome(riga.nome) === slug) {
        return riga.nome;
      }
    }
  }
  // Fallback: humanize slug
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function slugDaNome(nome) {
  return nome.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ─── Sezione Peso ─────────────────────────────────────────────────────────────

function renderPeso(store, container) {
  container.innerHTML = '';

  const pesi = [...(store.leggi('peso', []))].sort((a, b) => a.data.localeCompare(b.data));

  if (pesi.length === 0) {
    const card = creaCard('Peso');
    card.appendChild(statoVuoto('grafico', 'Nessun dato ancora', 'Registra il primo peso dalla tab Oggi.'));
    container.appendChild(card);
    return;
  }

  const card = creaCard('Peso');

  // Chart
  const banda = bandaObiettivo(pesi);
  const punti = pesi.map(p => ({ x: p.data, y: p.kg }));
  let bandaSVG = null;
  if (banda && punti.length >= 1) {
    const ultimaX = new Date(pesi[pesi.length - 1].data + 'T12:00:00').getTime();
    const ancoraX = new Date(banda.ancora.data + 'T12:00:00').getTime();
    const giorni = (ultimaX - ancoraX) / 864e5;
    bandaSVG = {
      daY: banda.ancora.kg,
      aYmin: banda.ancora.kg + banda.min * (giorni / 7),
      aYmax: banda.ancora.kg + banda.max * (giorni / 7),
    };
  }
  const chartDiv = document.createElement('div');
  chartDiv.innerHTML = lineaSVG({ punti, banda: bandaSVG, unita: 'kg' });
  card.appendChild(chartDiv);

  // Metrics griglia2
  const griglia = document.createElement('div');
  griglia.className = 'griglia2';

  const trend = trendPeso(pesi);
  const metricaTrend = document.createElement('div');
  metricaTrend.className = 'metrica';
  const trendLabel = document.createElement('span');
  trendLabel.className = 'etichetta';
  trendLabel.textContent = 'Trend';
  metricaTrend.appendChild(trendLabel);
  const trendValore = document.createElement('span');
  trendValore.className = 'valore';
  if (trend === null) {
    trendValore.textContent = '—';
    trendValore.style.color = 'var(--testo3)';
  } else {
    const segno = trend >= 0 ? '+' : '';
    trendValore.textContent = segno + trend.toFixed(2).replace('.', ',') + ' kg/sett';
    const inBanda = trend >= 0.25 && trend <= 0.5;
    trendValore.style.color = inBanda ? 'var(--accento)' : 'var(--ambra)';
  }
  metricaTrend.appendChild(trendValore);

  const ultimoPeso = pesi[pesi.length - 1];
  const metricaPeso = document.createElement('div');
  metricaPeso.className = 'metrica';
  const pesoLabel = document.createElement('span');
  pesoLabel.className = 'etichetta';
  pesoLabel.textContent = 'Ultimo peso';
  metricaPeso.appendChild(pesoLabel);
  const pesoValore = document.createElement('span');
  pesoValore.className = 'valore';
  pesoValore.textContent = ultimoPeso.kg + ' kg';
  metricaPeso.appendChild(pesoValore);
  const pesoData = document.createElement('span');
  pesoData.className = 'secondario';
  pesoData.textContent = new Date(ultimoPeso.data + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  metricaPeso.appendChild(pesoData);

  griglia.appendChild(metricaTrend);
  griglia.appendChild(metricaPeso);
  card.appendChild(griglia);

  container.appendChild(card);
}

// ─── Sezione Forza ────────────────────────────────────────────────────────────

function renderForza(store, container) {
  container.innerHTML = '';

  const registro = store.leggi('registro', {});
  const slugs = Object.keys(registro).filter(s => registro[s].length > 0);
  const piani = store.leggi('piani', []);
  const allenamenti = store.leggi('allenamenti', []);

  if (slugs.length === 0) {
    const card = creaCard('Forza');
    card.appendChild(statoVuoto('grafico', 'Nessun dato ancora', 'Nessun esercizio registrato. Completa una seduta per vedere i progressi.'));
    container.appendChild(card);
    return;
  }

  // Select esercizio
  const cardSelect = document.createElement('div');
  cardSelect.className = 'card';

  const selectLabel = document.createElement('label');
  selectLabel.className = 'riga';
  const labelSpan = document.createElement('span');
  labelSpan.textContent = 'Esercizio';
  const sel = document.createElement('select');
  for (const slug of slugs) {
    const opt = document.createElement('option');
    opt.value = slug;
    opt.textContent = nomeDaSlug(slug, piani, allenamenti);
    sel.appendChild(opt);
  }
  selectLabel.appendChild(labelSpan);
  selectLabel.appendChild(sel);
  cardSelect.appendChild(selectLabel);
  container.appendChild(cardSelect);

  const cardDettaglio = document.createElement('div');
  container.appendChild(cardDettaglio);

  function aggiornaDettaglio() {
    cardDettaglio.innerHTML = '';
    const slug = sel.value;
    const voci = registro[slug] || [];

    // Determina unita dall'ultima voce del registro per questo slug (default 'reps')
    const ultimaVoce = voci.length > 0 ? voci[voci.length - 1] : null;
    const unita = (ultimaVoce && ultimaVoce.unita) ? ultimaVoce.unita : 'reps';

    // Chart: miglior serie per data. Per gli esercizi a tempo il grafico usa i
    // secondi (il valore), per quelli a ripetizioni resta sul carico (kg).
    const perTempo = unita === 'sec';
    const puntiGrafico = [];
    for (const voce of voci) {
      const flatSerie = voce.serie || [];
      const best = migliorSerie(flatSerie);
      if (best) puntiGrafico.push({ x: voce.data, y: perTempo ? best.reps : best.kg });
    }

    if (puntiGrafico.length > 0) {
      const chartCard = creaCard('');
      chartCard.className = 'card';
      const nomeEl = document.createElement('p');
      nomeEl.className = 'primario';
      nomeEl.textContent = nomeDaSlug(slug, piani, allenamenti);
      chartCard.appendChild(nomeEl);
      // Etichetta unità sotto il nome dell'esercizio
      const unitaEl = document.createElement('p');
      unitaEl.className = 'secondario';
      unitaEl.style.fontSize = '0.8rem';
      unitaEl.textContent = unita === 'sec' ? 'Progressi in secondi' : 'Progressi in ripetizioni';
      chartCard.appendChild(unitaEl);
      const chartDiv = document.createElement('div');
      chartDiv.innerHTML = lineaSVG({ punti: puntiGrafico, unita: perTempo ? 'sec' : 'kg' });
      chartCard.appendChild(chartDiv);
      cardDettaglio.appendChild(chartCard);
    }

    // Find PR (miglior serie su tutte le voci)
    const tutteSerie = voci.flatMap(v => v.serie || []);
    const prBest = migliorSerie(tutteSerie);

    // List of dates
    const listaCard = creaCard('Storico');

    // Riga PR badge in cima allo storico
    if (prBest) {
      const rigaPR = document.createElement('div');
      rigaPR.className = 'riga';
      const prLabel = document.createElement('span');
      prLabel.className = 'secondario';
      prLabel.textContent = 'Record personale';
      const prValore = document.createElement('span');
      prValore.style.cssText = 'font-size:13px;font-weight:600;background:var(--accento);color:var(--on-accento);border-radius:999px;padding:2px 8px;line-height:1.4;';
      prValore.textContent = formattaSerie(prBest, unita);
      rigaPR.appendChild(prLabel);
      rigaPR.appendChild(prValore);
      listaCard.appendChild(rigaPR);
    }

    for (const voce of [...voci].reverse()) {
      const flatSerie = voce.serie || [];
      const best = migliorSerie(flatSerie);
      const isRecord = prBest && best && best.kg === prBest.kg && best.reps === prBest.reps;

      const riga = document.createElement('div');
      riga.className = 'riga';

      const dataSpan = document.createElement('span');
      dataSpan.className = 'secondario';
      dataSpan.textContent = new Date(voce.data + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });

      const dxDiv = document.createElement('div');
      dxDiv.style.display = 'flex';
      dxDiv.style.flexDirection = 'column';
      dxDiv.style.gap = '2px';
      dxDiv.style.alignItems = 'flex-end';

      if (isRecord) {
        // Badge PR: pill lime, footnote 600, bg accento, color on-accento, raggio 999
        const badge = document.createElement('span');
        badge.textContent = 'PR';
        badge.style.cssText = 'font-size:13px;font-weight:600;background:var(--accento);color:var(--on-accento);border-radius:999px;padding:2px 8px;line-height:1.4;';
        dxDiv.appendChild(badge);
      }

      for (const s of flatSerie) {
        const sSpan = document.createElement('span');
        sSpan.className = 'secondario';
        sSpan.textContent = formattaSerie(s, unita);
        dxDiv.appendChild(sSpan);
      }

      riga.appendChild(dataSpan);
      riga.appendChild(dxDiv);
      listaCard.appendChild(riga);
    }
    cardDettaglio.appendChild(listaCard);
  }

  sel.addEventListener('change', aggiornaDettaglio);
  aggiornaDettaglio();
}

// ─── Sezione Test ─────────────────────────────────────────────────────────────

function renderTest(store, oggi, container) {
  container.innerHTML = '';

  const card = creaCard('Test fisici');

  // Button "Giornata test"
  const btnTest = document.createElement('button');
  btnTest.className = 'primario';
  btnTest.textContent = 'Giornata test';
  card.appendChild(btnTest);

  const formDiv = document.createElement('div');
  formDiv.style.display = 'none';
  card.appendChild(formDiv);

  container.appendChild(card);

  btnTest.addEventListener('click', () => {
    formDiv.style.display = '';
    btnTest.style.display = 'none';
    mostraForm();
  });

  function mostraForm() {
    formDiv.innerHTML = '';

    const campi = [
      { label: 'Sprint 20m (s)', key: 'sprint20m', min: 2, max: 6, step: 0.01 },
      { label: 'Salto verticale (cm)', key: 'saltoCm', min: 100, max: 350, step: 1 },
      { label: 'Trazioni', key: 'trazioni', min: 0, max: 50, step: 1 },
      { label: 'Piegamenti', key: 'piegamenti', min: 0, max: 100, step: 1 },
      { label: 'Peso corporeo (kg)', key: 'pesoKg', min: 30, max: 120, step: 0.1 },
    ];

    const valori = {};
    for (const { label, key, min, max, step } of campi) {
      const riga = document.createElement('div');
      riga.className = 'riga';
      const lbl = document.createElement('label');
      lbl.textContent = label;
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.min = min;
      inp.max = max;
      inp.step = step;
      inp.placeholder = String(min) + '–' + String(max);
      inp.addEventListener('input', () => { valori[key] = parseFloat(inp.value); });
      riga.appendChild(lbl);
      riga.appendChild(inp);
      formDiv.appendChild(riga);
    }

    const btnRow = document.createElement('div');
    btnRow.className = 'riga';
    const btnSalva = document.createElement('button');
    btnSalva.className = 'primario';
    btnSalva.textContent = 'Salva';
    const btnAnnulla = document.createElement('button');
    btnAnnulla.textContent = 'Annulla';

    btnSalva.addEventListener('click', () => {
      // Validation: check all 5 fields are present, finite, and within bounds
      const campiRanges = {
        sprint20m: { min: 2, max: 6 },
        saltoCm: { min: 100, max: 350 },
        trazioni: { min: 0, max: 50 },
        piegamenti: { min: 0, max: 100 },
        pesoKg: { min: 30, max: 120 },
      };

      let validazioneOk = true;
      for (const [key, range] of Object.entries(campiRanges)) {
        const val = valori[key];
        if (val === undefined || !Number.isFinite(val) || val < range.min || val > range.max) {
          validazioneOk = false;
          break;
        }
      }

      if (!validazioneOk) {
        // Rimuovi errore precedente
        const vecchio = formDiv.querySelector('.validazione-errore');
        if (vecchio) vecchio.remove();
        // Mostra chip errore
        const erroreChip = chip('Compila tutti i campi con valori validi prima di salvare.', 'rosso');
        erroreChip.className = erroreChip.className + ' validazione-errore';
        formDiv.insertBefore(erroreChip, formDiv.firstChild);
        return;
      }

      // Remove error if validation passed
      const vecchioErrore = formDiv.querySelector('.validazione-errore');
      if (vecchioErrore) vecchioErrore.remove();

      const entry = { data: oggi, ...valori };
      const tests = store.leggi('test', []);
      const idx = tests.findIndex(t => t.data === oggi);
      if (idx !== -1) tests[idx] = entry;
      else tests.push(entry);
      tests.sort((a, b) => a.data.localeCompare(b.data));
      store.scrivi('test', tests);
      formDiv.style.display = 'none';
      btnTest.style.display = '';
      renderTestMetrics(store, container);
    });

    btnAnnulla.addEventListener('click', () => {
      formDiv.style.display = 'none';
      btnTest.style.display = '';
    });

    btnRow.appendChild(btnSalva);
    btnRow.appendChild(btnAnnulla);
    formDiv.appendChild(btnRow);
  }

  renderTestMetrics(store, container);
}

function renderTestMetrics(store, container) {
  // Remove old metrics section if exists
  const old = container.querySelector('.test-metriche');
  if (old) old.remove();

  const tests = store.leggi('test', []);
  if (tests.length === 0) return;

  const div = document.createElement('div');
  div.className = 'test-metriche';

  const metriche = [
    { key: 'sprint20m', label: 'Sprint 20m (s)' },
    { key: 'saltoCm', label: 'Salto (cm)' },
    { key: 'trazioni', label: 'Trazioni' },
    { key: 'piegamenti', label: 'Piegamenti' },
    { key: 'pesoKg', label: 'Peso (kg)' },
  ];

  for (const { key, label } of metriche) {
    const cardMetrica = creaCard(label);
    const punti = tests
      .filter(t => t[key] != null)
      .map(t => ({ x: t.data, y: t[key] }));

    if (punti.length > 1) {
      const chartDiv = document.createElement('div');
      chartDiv.innerHTML = lineaSVG({ punti });
      cardMetrica.appendChild(chartDiv);
    }

    div.appendChild(cardMetrica);
  }

  // Tabella giornate
  const tabCard = creaCard('Giornate test');
  const tabella = document.createElement('table');
  tabella.style.cssText = 'width:100%;font-size:0.82rem;border-collapse:collapse;';

  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');
  for (const col of ['Data', 'Sprint', 'Salto', 'Traz.', 'Pieg.', 'Peso']) {
    const th = document.createElement('th');
    th.textContent = col;
    th.style.cssText = 'text-align:left;padding:4px 6px;color:var(--testo3);font-weight:500;';
    trHead.appendChild(th);
  }
  thead.appendChild(trHead);
  tabella.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const t of [...tests].reverse()) {
    const tr = document.createElement('tr');
    const dataStr = new Date(t.data + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: '2-digit' });
    for (const val of [
      dataStr,
      t.sprint20m ?? '—',
      t.saltoCm ?? '—',
      t.trazioni ?? '—',
      t.piegamenti ?? '—',
      t.pesoKg ?? '—',
    ]) {
      const td = document.createElement('td');
      td.style.cssText = 'padding:4px 6px;';
      td.textContent = String(val);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  tabella.appendChild(tbody);
  tabCard.appendChild(tabella);
  div.appendChild(tabCard);

  container.appendChild(div);
}

// ─── Sezione Recupero ─────────────────────────────────────────────────────────

const FASCIA_COLORI = {
  verde:  '#63CE7A',
  giallo: '#F5B23F',
  rosso:  '#F06A5D',
};

function renderRecupero(store, container) {
  container.innerHTML = '';

  const whoopDati = store.leggi('whoop', {});
  const isoKeys = Object.keys(whoopDati).sort();

  if (isoKeys.length === 0) {
    const card = creaCard('Recupero Whoop');
    card.appendChild(statoVuoto('grafico', 'Nessun dato ancora', 'Inserisci i dati Whoop dalla tab Oggi (o collega il ponte nelle Impostazioni).'));
    container.appendChild(card);
    return;
  }

  // ── Striscia ultimi 28 giorni ─────────────────────────────────────────────
  const cardStriscia = creaCard('Ultimi 28 giorni');

  const strisciaDiv = document.createElement('div');
  // Quadratini 10px raggio 4 gap 3
  strisciaDiv.style.cssText = 'display:flex;flex-wrap:wrap;gap:3px;margin-top:8px;';

  const oggi = new Date();
  for (let i = 27; i >= 0; i--) {
    const d = new Date(oggi);
    d.setDate(oggi.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const dati = whoopDati[iso];
    const fascia = dati ? fasciaRecupero(dati.recupero) : null;
    const colore = fascia ? FASCIA_COLORI[fascia] : 'var(--sup2)';

    const sq = document.createElement('div');
    sq.style.cssText = `width:10px;height:10px;border-radius:4px;background:${colore};flex-shrink:0;`;
    sq.title = iso;
    strisciaDiv.appendChild(sq);
  }

  cardStriscia.appendChild(strisciaDiv);
  container.appendChild(cardStriscia);

  // ── Mini-sezioni con grafico + media settimanale ──────────────────────────
  const metriche = [
    { key: 'recupero',  label: 'Recupero (%)',   unita: '%'   },
    { key: 'hrv',       label: 'HRV (ms)',        unita: 'ms'  },
    { key: 'fcRiposo',  label: 'FC riposo (bpm)', unita: 'bpm' },
    { key: 'sonnoOre',  label: 'Ore sonno',       unita: 'h'   },
    { key: 'strain',    label: 'Strain',          unita: ''    },
  ];

  for (const { key, label, unita } of metriche) {
    // Build {iso: value} map (only entries that have this key)
    const mappa = {};
    for (const iso of isoKeys) {
      const v = whoopDati[iso]?.[key];
      if (v != null && !Number.isNaN(v)) mappa[iso] = v;
    }

    if (Object.keys(mappa).length === 0) continue;

    const card = creaCard(label);

    // Grafico
    const punti = Object.entries(mappa)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([x, y]) => ({ x, y }));

    if (punti.length >= 1) {
      const chartDiv = document.createElement('div');
      chartDiv.innerHTML = lineaSVG({ punti, unita });
      card.appendChild(chartDiv);
    }

    // Media settimanale
    const settimane = mediaSettimanale(mappa);
    if (settimane.length > 0) {
      const mediaDiv = document.createElement('div');
      mediaDiv.style.cssText = 'margin-top:6px;display:flex;flex-wrap:wrap;gap:6px;';
      for (const { settimana, media } of settimane) {
        const lun = new Date(settimana + 'T12:00:00');
        const etichetta = 'sett. ' + lun.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) + ': ' + media;
        const span = document.createElement('span');
        span.className = 'secondario';
        span.style.cssText = 'font-size:0.8rem;';
        span.textContent = etichetta;
        mediaDiv.appendChild(span);
      }
      card.appendChild(mediaDiv);
    }

    container.appendChild(card);
  }
}

// ─── Sezione Foto ─────────────────────────────────────────────────────────────

// Tiene traccia degli objectURL creati per revocarli al re-render
const _urlCreati = [];

function revocaURLCreati() {
  while (_urlCreati.length) {
    try { URL.revokeObjectURL(_urlCreati.pop()); } catch (_) { /* noop */ }
  }
}

function formatDataBreveIso(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: '2-digit' });
}

async function renderFoto(store, oggi, container) {
  revocaURLCreati();
  container.innerHTML = '';

  // ── Card upload ──────────────────────────────────────────────────────────
  const cardUpload = creaCard('Foto progressi');

  const inputFile = document.createElement('input');
  inputFile.type = 'file';
  inputFile.accept = 'image/*';
  inputFile.style.cssText = 'display:block;margin-bottom:8px;color:inherit;';

  inputFile.addEventListener('change', async () => {
    const file = inputFile.files[0];
    if (!file) return;
    try {
      await salvaFoto(file, oggi);
      await renderFoto(store, oggi, container);
    } catch (e) {
      console.error('Errore salvataggio foto:', e);
    }
  });

  cardUpload.appendChild(inputFile);
  container.appendChild(cardUpload);

  // ── Griglia miniature ─────────────────────────────────────────────────────
  let foto;
  try {
    foto = await elencoFoto();
  } catch (_) {
    foto = [];
  }

  if (foto.length === 0) {
    cardUpload.appendChild(statoVuoto('fotocamera', 'Nessuna foto salvata', 'Aggiungi la prima foto con il pulsante sopra.'));
  } else {
    const cardGriglia = creaCard('');
    cardGriglia.className = 'card';

    const griglia = document.createElement('div');
    griglia.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:8px;';
    cardGriglia.appendChild(griglia);
    container.appendChild(cardGriglia);

    // Confronto: al massimo 2 foto selezionate
    let selezionate = [];

    const miniatureElem = [];
    const mapIdToUrl = {}; // Mappa id → objectURL per riuso nel confronto

    for (const f of foto) {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;';

      const img = document.createElement('img');
      img.style.cssText = 'width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;border:2px solid transparent;transition:border-color 0.2s;';
      img.alt = 'Foto del ' + formatDataBreveIso(f.data);

      // Carica URL in modo asincrono
      urlFoto(f.id).then(url => {
        if (url) {
          _urlCreati.push(url);
          img.src = url;
          mapIdToUrl[f.id] = url; // Salva per riuso nel confronto
        }
      }).catch(() => {});

      const dataSpan = document.createElement('span');
      dataSpan.className = 'secondario';
      dataSpan.style.cssText = 'font-size:0.75rem;text-align:center;';
      dataSpan.textContent = formatDataBreveIso(f.data);

      const btnElimina = document.createElement('button');
      btnElimina.textContent = 'Elimina';
      btnElimina.style.cssText = 'font-size:0.75rem;padding:2px 8px;';
      btnElimina.addEventListener('click', async e => {
        e.stopPropagation();
        if (!confirm('Eliminare questa foto? Non si può annullare.')) return;
        try {
          await eliminaFoto(f.id);
          await renderFoto(store, oggi, container);
        } catch (err) {
          console.error('Errore eliminazione foto:', err);
        }
      });

      wrap.appendChild(img);
      wrap.appendChild(dataSpan);
      wrap.appendChild(btnElimina);
      griglia.appendChild(wrap);

      miniatureElem.push({ wrap, img, f });
    }

    // ── Confronto affiancato ─────────────────────────────────────────────
    const cardConfronto = document.createElement('div');
    cardConfronto.className = 'card';
    cardConfronto.style.display = 'none';
    container.appendChild(cardConfronto);

    function aggiornaConfronto() {
      // Bordi
      for (const { wrap, img, f: fi } of miniatureElem) {
        const sel = selezionate.find(s => s.id === fi.id);
        img.style.borderColor = sel ? 'var(--accento)' : 'transparent';
      }

      if (selezionate.length === 2) {
        cardConfronto.style.display = '';
        cardConfronto.innerHTML = '';

        const titolo = document.createElement('h2');
        titolo.className = 'eyebrow';
        titolo.textContent = 'Confronto';
        cardConfronto.appendChild(titolo);

        const flex = document.createElement('div');
        flex.style.cssText = 'display:flex;gap:12px;align-items:flex-start;';

        for (const sf of selezionate) {
          const col = document.createElement('div');
          col.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;';

          const imgC = document.createElement('img');
          imgC.style.cssText = 'width:100%;border-radius:8px;';
          imgC.alt = 'Foto del ' + formatDataBreveIso(sf.data);

          // Riusa l'objectURL già creato per la miniatura
          const url = mapIdToUrl[sf.id];
          if (url) {
            imgC.src = url;
          }

          const dataC = document.createElement('span');
          dataC.className = 'secondario';
          dataC.style.fontSize = '0.85rem';
          dataC.textContent = formatDataBreveIso(sf.data);

          col.appendChild(imgC);
          col.appendChild(dataC);
          flex.appendChild(col);
        }
        cardConfronto.appendChild(flex);

        const btnChiudi = document.createElement('button');
        btnChiudi.textContent = 'Chiudi confronto';
        btnChiudi.style.marginTop = '10px';
        btnChiudi.addEventListener('click', () => {
          selezionate = [];
          aggiornaConfronto();
        });
        cardConfronto.appendChild(btnChiudi);
      } else {
        cardConfronto.style.display = 'none';
        cardConfronto.innerHTML = '';
      }
    }

    for (const { wrap, f: fi } of miniatureElem) {
      wrap.addEventListener('click', () => {
        const idx = selezionate.findIndex(s => s.id === fi.id);
        if (idx !== -1) {
          selezionate.splice(idx, 1);
        } else {
          if (selezionate.length >= 2) selezionate.shift();
          selezionate.push(fi);
        }
        aggiornaConfronto();
      });
    }
  }

  // ── Nota fissa ────────────────────────────────────────────────────────────
  const notaCard = creaCard('');
  notaCard.className = 'card';
  const nota = document.createElement('p');
  nota.className = 'secondario';
  nota.style.cssText = 'font-size:0.85rem;';
  nota.textContent = 'Consiglio: scatta con l\'app Fotocamera (stessa posa, stessa luce) e importala qui: l\'originale resta nel rullino.';
  notaCard.appendChild(nota);
  container.appendChild(notaCard);
}

// ─── Sezione Diario ───────────────────────────────────────────────────────────

function renderDiario(stato, container) {
  container.innerHTML = '';

  const { store } = stato;
  const allenamenti = [...store.leggi('allenamenti', [])].reverse(); // più recenti prima

  if (allenamenti.length === 0) {
    container.appendChild(statoVuoto('elenco', 'Nessun allenamento libero', 'Aggiungilo dalla scheda Oggi'));
    return;
  }

  const card = document.createElement('div');
  card.className = 'card';

  for (const al of allenamenti) {
    const riga = document.createElement('div');
    riga.className = 'riga';
    riga.style.cursor = 'pointer';

    const left = document.createElement('div');
    left.style.flex = '1';

    const dataEl = document.createElement('div');
    dataEl.className = 'footnote';
    dataEl.style.cssText = 'color:var(--testo2);margin-bottom:2px;';
    dataEl.textContent = new Date(al.data + 'T12:00:00').toLocaleDateString('it-IT', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
    left.appendChild(dataEl);

    if (al.titolo && al.titolo.trim()) {
      const titoloEl = document.createElement('div');
      titoloEl.style.cssText = 'font-size:15px;font-weight:500;color:var(--testo);';
      titoloEl.textContent = al.titolo;
      left.appendChild(titoloEl);
    }

    const nEsercizi = (al.righe ?? []).filter(r => r.tipo === 'esercizio').length;
    const nNote = (al.righe ?? []).filter(r => r.tipo === 'nota').length;
    const parti = [];
    if (nEsercizi > 0) parti.push(nEsercizi + (nEsercizi === 1 ? ' esercizio' : ' esercizi'));
    if (nNote > 0) parti.push(nNote + (nNote === 1 ? ' nota' : ' note'));
    if (parti.length > 0) {
      const sottoEl = document.createElement('div');
      sottoEl.className = 'footnote';
      sottoEl.style.marginTop = '2px';
      sottoEl.textContent = parti.join(' · ');
      left.appendChild(sottoEl);
    }

    const chevron = document.createElement('span');
    chevron.style.color = 'var(--testo3)';
    chevron.appendChild(icona('chevronDestra', 16));

    riga.appendChild(left);
    riga.appendChild(chevron);

    const alCapt = al;
    riga.addEventListener('click', () => apriAllenamentoLibero(stato, alCapt));
    card.appendChild(riga);
  }

  container.appendChild(card);
}

// ─── Sezione Corsa ────────────────────────────────────────────────────────────

function renderCorsa(store, container) {
  container.innerHTML = '';

  const corse = [...(store.leggi('corse', []))];

  if (corse.length === 0) {
    container.appendChild(statoVuoto('onda', 'Nessuna corsa registrata', 'Aggiungila da un allenamento'));
    return;
  }

  // ── Grafico distanza ──────────────────────────────────────────────────────
  const puntiDistanza = corse
    .filter(c => Number(c.distanzaKm) > 0)
    .sort((a, b) => (a.data ?? '').localeCompare(b.data ?? ''))
    .map(c => ({ x: c.data, y: Number(c.distanzaKm) }));

  if (puntiDistanza.length >= 1) {
    const cardDistanza = creaCard('Distanza');
    const captDistanza = document.createElement('p');
    captDistanza.className = 'secondario';
    captDistanza.style.cssText = 'font-size:0.8rem;margin-bottom:4px;';
    captDistanza.textContent = 'Distanza percorsa (km)';
    cardDistanza.appendChild(captDistanza);
    const chartDiv = document.createElement('div');
    chartDiv.innerHTML = lineaSVG({ punti: puntiDistanza, unita: 'km' });
    cardDistanza.appendChild(chartDiv);
    container.appendChild(cardDistanza);
  }

  // ── Grafico ritmo ─────────────────────────────────────────────────────────
  const puntiRitmo = corse
    .filter(c => ritmoASecondi(c.ritmo) !== null)
    .sort((a, b) => (a.data ?? '').localeCompare(b.data ?? ''))
    .map(c => ({ x: c.data, y: ritmoASecondi(c.ritmo) }));

  if (puntiRitmo.length >= 1) {
    const cardRitmo = creaCard('Ritmo');
    const captRitmo = document.createElement('p');
    captRitmo.className = 'secondario';
    captRitmo.style.cssText = 'font-size:0.8rem;margin-bottom:4px;';
    captRitmo.textContent = 'Ritmo (min/km) — più in basso = più veloce';
    cardRitmo.appendChild(captRitmo);
    const chartDiv = document.createElement('div');
    chartDiv.innerHTML = lineaSVG({ punti: puntiRitmo });
    cardRitmo.appendChild(chartDiv);
    container.appendChild(cardRitmo);
  }

  // ── Elenco storico ────────────────────────────────────────────────────────
  const cardStorico = creaCard('Storico');
  const corseOrd = [...corse].sort((a, b) => (b.data ?? '').localeCompare(a.data ?? ''));
  for (const c of corseOrd) {
    const riga = document.createElement('div');
    riga.className = 'riga';

    const dataEl = document.createElement('span');
    dataEl.className = 'secondario';
    dataEl.textContent = new Date((c.data ?? '') + 'T12:00:00').toLocaleDateString('it-IT', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });

    const detEl = document.createElement('span');
    detEl.className = 'secondario';
    detEl.style.cssText = 'text-align:right;';
    detEl.textContent = formattaCorsa(c);

    riga.appendChild(dataEl);
    riga.appendChild(detEl);
    cardStorico.appendChild(riga);
  }
  container.appendChild(cardStorico);
}

// ─── Vista principale ─────────────────────────────────────────────────────────

export function vistaProgressi(stato, radice) {
  const { store, oggi } = stato;
  radice.innerHTML = '';

  const header = document.createElement('h1');
  header.className = 'titolo-vista';
  header.textContent = 'Progressi';
  radice.appendChild(header);

  const VOCI = ['Peso', 'Forza', 'Test', 'Recupero', 'Foto', 'Diario', 'Corsa'];
  const CHIAVI = ['peso', 'forza', 'test', 'recupero', 'foto', 'diario', 'corsa'];

  let tabAttiva = 0;
  const contenuto = document.createElement('div');
  contenuto.style.marginTop = '12px';

  function caricaTab(idx) {
    tabAttiva = idx;
    revocaURLCreati();
    contenuto.innerHTML = '';
    const tab = CHIAVI[idx];
    if (tab === 'peso') {
      renderPeso(store, contenuto);
    } else if (tab === 'forza') {
      renderForza(store, contenuto);
    } else if (tab === 'test') {
      renderTest(store, oggi, contenuto);
    } else if (tab === 'recupero') {
      renderRecupero(store, contenuto);
    } else if (tab === 'foto') {
      renderFoto(store, oggi, contenuto);
    } else if (tab === 'diario') {
      renderDiario(stato, contenuto);
    } else if (tab === 'corsa') {
      renderCorsa(store, contenuto);
    } else {
      const card = creaCard(VOCI[idx]);
      const p = document.createElement('p');
      p.className = 'secondario';
      p.textContent = 'In arrivo.';
      card.appendChild(p);
      contenuto.appendChild(card);
    }
  }

  const seg = segmented(VOCI, tabAttiva, caricaTab);
  radice.appendChild(seg);
  radice.appendChild(contenuto);

  caricaTab(tabAttiva);
}
