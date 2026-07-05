import { faseCorrente, FASI, TEMPLATE_STAGIONE, SEDUTE, CALENDARIO } from './programma.js';
import { sedutePerGiorno } from './piani.js';
import { apriSeduta } from './seduta.js';
import { testInRitardo } from './calcoli.js';
import { consiglioGiorno, fasciaRecupero, sincronizza } from './whoop.js';
import { backupInRitardo } from './impostazioni.js';

// Timestamp modulo-level per il guard anti-loop (al massimo 1 sync ogni 5 minuti)
let _ultimoTentativoSync = 0;

export const ABITUDINI = [
  'Colazione vera',
  'Proteine a ogni pasto',
  'Acqua abbondante',
  'Niente bibite zuccherate',
  'Sonno 8,5+ ore',
];

export const chiaveSeduta = (pianoId, id) => `${pianoId}:${id}`;

export function abitudiniGiorno(store, iso) {
  const tutte = store.leggi('abitudini', {});
  const a = (tutte[iso] ?? [false, false, false, false, false]).slice();
  const w = store.leggi('whoop', {})[iso];
  if (w?.sonnoOre >= 8.5) a[4] = true;
  return a;
}

export function spuntaAbitudine(store, iso, i, val) {
  const tutte = store.leggi('abitudini', {});
  const a = (tutte[iso] ?? [false, false, false, false, false]).slice();
  a[i] = val;
  tutte[iso] = a;
  store.scrivi('abitudini', tutte);
}

// ─── RENDER ──────────────────────────────────────────────────────────────────

export function vistaOggi(stato, radice) {
  const { store, oggi } = stato;
  radice.innerHTML = '';

  // ── 0. Promemoria container (task 11/14 riempiranno questo) ──────────────
  const divPromemoriaWrapper = document.createElement('div');
  divPromemoriaWrapper.id = 'promemoria';
  radice.appendChild(divPromemoriaWrapper);

  // Test reminder banner (Task 11)
  if (testInRitardo(store, oggi)) {
    const banner = document.createElement('div');
    banner.className = 'banner avviso';
    banner.textContent = 'È ora dei test! Ogni 3-4 settimane misura sprint, salto, trazioni, piegamenti.';
    divPromemoriaWrapper.appendChild(banner);
  }

  // Backup reminder banner (Task 14)
  if (backupInRitardo(store, oggi)) {
    const bannerBackup = document.createElement('div');
    bannerBackup.className = 'banner avviso';
    bannerBackup.textContent = 'Sono passati più di 7 giorni dall\'ultimo backup — esportalo dalle Impostazioni ⚙';
    divPromemoriaWrapper.appendChild(bannerBackup);
  }

  // ── 1. Eyebrow: data + fase + bottone Impostazioni ────────────────────────
  const fase = faseCorrente(oggi);
  const dataFormattata = new Date(oggi + 'T12:00:00').toLocaleDateString('it-IT', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const eyebrow = document.createElement('div');
  eyebrow.className = 'eyebrow';
  eyebrow.style.display = 'flex';
  eyebrow.style.justifyContent = 'space-between';
  eyebrow.style.alignItems = 'flex-start';

  const eyebrowTesti = document.createElement('div');
  const eyebrowPrimario = document.createElement('span');
  eyebrowPrimario.className = 'primario';
  eyebrowPrimario.textContent = capitalizza(dataFormattata);
  eyebrowTesti.appendChild(eyebrowPrimario);

  // Saluto con nome (Task 14)
  const profilo = store.leggi('profilo', {});
  if (profilo.nome) {
    const saluto = document.createElement('p');
    saluto.className = 'secondario';
    saluto.textContent = 'Ciao ' + profilo.nome;
    eyebrowTesti.appendChild(saluto);
  }

  const eyebrowSecondario = document.createElement('span');
  eyebrowSecondario.className = 'secondario';
  eyebrowSecondario.textContent = fase.nome + (fase.sotto ? ' · ' + fase.sotto : '');
  eyebrowTesti.appendChild(eyebrowSecondario);

  eyebrow.appendChild(eyebrowTesti);

  // Bottone ⚙ Impostazioni
  const btnImpostazioni = document.createElement('button');
  btnImpostazioni.className = 'secondario';
  btnImpostazioni.setAttribute('aria-label', 'Impostazioni');
  btnImpostazioni.textContent = '⚙';
  btnImpostazioni.style.fontSize = '1.2rem';
  btnImpostazioni.style.padding = '4px 8px';
  btnImpostazioni.style.marginLeft = '8px';
  btnImpostazioni.style.flexShrink = '0';
  btnImpostazioni.addEventListener('click', () => {
    import('./app.js').then(({ naviga }) => naviga('impostazioni'));
  });
  eyebrow.appendChild(btnImpostazioni);

  radice.appendChild(eyebrow);

  // ── 2. Sedute di oggi ─────────────────────────────────────────────────────
  const piani = store.leggi('piani', []);
  const sedute = sedutePerGiorno(piani, oggi);
  const seduteDati = store.leggi('sedute', {});
  const calOggi = CALENDARIO[oggi];

  // Context card: stagione OR riposo (mutually exclusive, in that order)
  if (fase.stagione) {
    // Card stagione: TEMPLATE_STAGIONE + toggle giorno club + bottoni rapidi
    const cardStagione = creaCard('Stagione — mantenimento');
    const stagioneDati = store.leggi('stagione', { giorniClub: [] });
    const giorniClub = stagioneDati.giorniClub ?? [];
    const isClub = giorniClub.includes(oggi);

    // Toggle giornata club
    const toggleClub = document.createElement('label');
    toggleClub.className = 'riga';
    toggleClub.innerHTML = `<span>Oggi giornata club</span><input type="checkbox" ${isClub ? 'checked' : ''}>`;
    toggleClub.querySelector('input').addEventListener('change', e => {
      const st = store.leggi('stagione', { giorniClub: [] });
      const gc = st.giorniClub ?? [];
      if (e.target.checked) { if (!gc.includes(oggi)) gc.push(oggi); }
      else { const idx = gc.indexOf(oggi); if (idx !== -1) gc.splice(idx, 1); }
      st.giorniClub = gc;
      store.scrivi('stagione', st);
      vistaOggi(stato, radice);
    });
    cardStagione.appendChild(toggleClub);

    // Voci TEMPLATE_STAGIONE
    for (const voce of TEMPLATE_STAGIONE.voci) {
      const p = document.createElement('p');
      p.className = 'secondario';
      p.textContent = voce;
      cardStagione.appendChild(p);
    }

    // Regola in evidenza
    const regola = document.createElement('p');
    regola.className = 'banner avviso';
    regola.textContent = TEMPLATE_STAGIONE.regola;
    cardStagione.appendChild(regola);

    // Bottoni rapidi Fm, T, V, REC
    const bottoniRapidi = document.createElement('div');
    bottoniRapidi.className = 'pillole';
    for (const codice of ['Fm', 'T', 'V', 'REC']) {
      const chiave = chiaveSeduta('programma-2026', codice);
      const fatta = !!(seduteDati[oggi] && seduteDati[oggi][chiave]);
      const btn = document.createElement('button');
      btn.textContent = codice + (fatta ? ' ✓' : '');
      btn.className = fatta ? 'spento' : '';
      btn.addEventListener('click', () => {
        const sd = store.leggi('sedute', {});
        if (!sd[oggi]) sd[oggi] = {};
        sd[oggi][chiave] = !(sd[oggi][chiave] === true);
        store.scrivi('sedute', sd);
        vistaOggi(stato, radice);
      });
      bottoniRapidi.appendChild(btn);
    }
    cardStagione.appendChild(bottoniRapidi);
    radice.appendChild(cardStagione);

  } else if (calOggi !== undefined && calOggi.length === 0) {
    // Giorno scarico
    const cardScarico = creaCard('Riposo');
    const msg = document.createElement('p');
    msg.className = 'primario';
    msg.textContent = 'Riposo vero: camminata, bici tranquilla, mobilità. Te lo sei guadagnato.';
    cardScarico.appendChild(msg);
    radice.appendChild(cardScarico);
  }

  // Sedute card: independent — shown whenever there are user-plan sessions
  if (sedute.length > 0) {
    const cardSedute = creaCard('Sedute di oggi');
    const sd = store.leggi('sedute', {});

    for (const { pianoId, pianoNome, seduta, momento } of sedute) {
      const chiave = chiaveSeduta(pianoId, seduta.codice ?? seduta.id);
      const fatta = !!(sd[oggi] && sd[oggi][chiave]);
      const riga = document.createElement('div');
      riga.className = 'riga' + (fatta ? ' spento' : '');

      const left = document.createElement('div');
      if (momento) {
        const spanMomento = document.createElement('span');
        spanMomento.className = 'eyebrow';
        spanMomento.textContent = momento;
        left.appendChild(spanMomento);
      }
      const spanTitolo = document.createElement('span');
      spanTitolo.className = 'primario';
      spanTitolo.textContent = (fatta ? '✓ ' : '') + seduta.titolo;
      left.appendChild(spanTitolo);
      if (pianoId !== 'programma-2026') {
        const spanPiano = document.createElement('span');
        spanPiano.className = 'secondario';
        spanPiano.textContent = pianoNome;
        left.appendChild(spanPiano);
      }

      riga.appendChild(left);
      riga.style.cursor = 'pointer';

      if (seduta.esercizi && seduta.esercizi.length > 0) {
        // Ha esercizi → apri seduta (Task 7)
        riga.addEventListener('click', () => apriSeduta(stato, { pianoId, pianoNome, seduta, momento }));
      } else if (seduta.voci && seduta.voci.length > 0) {
        // Solo voci → toggle fatta
        riga.addEventListener('click', () => {
          const sdt = store.leggi('sedute', {});
          if (!sdt[oggi]) sdt[oggi] = {};
          sdt[oggi][chiave] = !(sdt[oggi][chiave] === true);
          store.scrivi('sedute', sdt);
          vistaOggi(stato, radice);
        });
      }

      cardSedute.appendChild(riga);
    }
    radice.appendChild(cardSedute);
  }

  // ── 3. Check-in Whoop ─────────────────────────────────────────────────────
  const whoopDati = store.leggi('whoop', {});
  const _whoopRaw = whoopDati[oggi] ?? {};
  // Migrate legacy strainIeri key → strain (one-time fallback, no data loss)
  const whoopOggi = { ..._whoopRaw, strain: _whoopRaw.strain ?? _whoopRaw.strainIeri };
  const cardWhoop = creaCardWhoop('Check-in Whoop', whoopOggi.fonte === 'sync');

  const campiWhoop = [
    { label: 'Recupero (%)', key: 'recupero', min: 0, max: 100, step: 1 },
    { label: 'HRV (ms)', key: 'hrv', min: 10, max: 250, step: 1 },
    { label: 'FC riposo (bpm)', key: 'fcRiposo', min: 30, max: 120, step: 1 },
    { label: 'Ore sonno', key: 'sonnoOre', min: 0, max: 14, step: 0.1 },
    { label: 'Strain di ieri', key: 'strain', min: 0, max: 21, step: 0.1 },
  ];

  for (const { label, key, min, max, step } of campiWhoop) {
    const riga = document.createElement('div');
    riga.className = 'riga';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    const inp = document.createElement('input');
    inp.type = 'number';
    inp.min = min;
    inp.max = max;
    inp.step = step;
    inp.value = whoopOggi[key] ?? '';
    inp.addEventListener('change', () => {
      const v = parseFloat(inp.value);
      if (isNaN(v) || v < min || v > max) { inp.value = whoopOggi[key] ?? ''; return; }
      const wd = store.leggi('whoop', {});
      if (!wd[oggi]) wd[oggi] = { fonte: 'manuale' };
      wd[oggi][key] = v;
      wd[oggi].fonte = 'manuale';
      store.scrivi('whoop', wd);
      // Re-render to update habit auto-check
      vistaOggi(stato, radice);
    });
    riga.appendChild(lbl);
    riga.appendChild(inp);
    cardWhoop.appendChild(riga);
  }

  // Contenitore consiglio del giorno (Task 12)
  const consiglioDiv = document.createElement('div');
  consiglioDiv.id = 'consiglio-giorno';
  renderConsiglioGiorno(consiglioDiv, whoopOggi.recupero);
  cardWhoop.appendChild(consiglioDiv);

  // Riga "Sincronizzato alle HH:MM" (Task 17) — visibile solo se ultimaSync presente
  const p = store.leggi('whoopPonte', {});
  if (p.ultimaSync) {
    const rigaSync = document.createElement('p');
    rigaSync.id = 'whoop-ultima-sync';
    rigaSync.className = 'secondario';
    const orario = new Date(p.ultimaSync).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    rigaSync.textContent = `Sincronizzato alle ${orario}`;
    cardWhoop.appendChild(rigaSync);
  }

  radice.appendChild(cardWhoop);

  // ── 4. Abitudini di oggi ──────────────────────────────────────────────────
  const abitudini = abitudiniGiorno(store, oggi);
  const n = abitudini.filter(Boolean).length;
  const cardAbitudini = creaCard(`Abitudini di oggi · ${n} su 5`);

  for (let i = 0; i < ABITUDINI.length; i++) {
    const riga = document.createElement('label');
    riga.className = 'riga';
    const testo = document.createElement('span');
    testo.textContent = ABITUDINI[i];
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = abitudini[i];
    // Indice 4 può essere auto-spuntato da whoop; non bloccare l'interazione manuale
    chk.addEventListener('change', () => {
      spuntaAbitudine(store, oggi, i, chk.checked);
      vistaOggi(stato, radice);
    });
    riga.appendChild(testo);
    riga.appendChild(chk);
    cardAbitudini.appendChild(riga);
  }

  radice.appendChild(cardAbitudini);

  // ── 5. Griglia metriche: peso + prossima fase ─────────────────────────────
  const griglia = document.createElement('div');
  griglia.className = 'griglia2';

  // Peso
  const metricaPeso = document.createElement('div');
  metricaPeso.className = 'metrica';
  const listaPeso = store.leggi('peso', []);
  const ultimoPeso = listaPeso.length ? listaPeso[listaPeso.length - 1] : null;
  const pesoEtichetta = document.createElement('span');
  pesoEtichetta.className = 'etichetta';
  pesoEtichetta.textContent = 'Peso';
  metricaPeso.appendChild(pesoEtichetta);
  const pesoValore = document.createElement('span');
  pesoValore.className = 'valore';
  pesoValore.textContent = ultimoPeso ? ultimoPeso.kg + ' kg' : '—';
  metricaPeso.appendChild(pesoValore);

  // Input rapido peso
  const rowPeso = document.createElement('div');
  rowPeso.className = 'riga';
  const inputPeso = document.createElement('input');
  inputPeso.type = 'number';
  inputPeso.min = 30;
  inputPeso.max = 120;
  inputPeso.step = 0.1;
  inputPeso.placeholder = 'kg';
  const btnSalvaPeso = document.createElement('button');
  btnSalvaPeso.textContent = 'Salva';
  btnSalvaPeso.addEventListener('click', () => {
    const v = parseFloat(inputPeso.value);
    if (isNaN(v) || v < 30 || v > 120) return;
    const lp = store.leggi('peso', []);
    const idx = lp.findIndex(e => e.data === oggi);
    if (idx !== -1) lp[idx] = { data: oggi, kg: v };
    else lp.push({ data: oggi, kg: v });
    store.scrivi('peso', lp);
    inputPeso.value = '';
    vistaOggi(stato, radice);
  });
  rowPeso.appendChild(inputPeso);
  rowPeso.appendChild(btnSalvaPeso);
  metricaPeso.appendChild(rowPeso);

  // Prossima fase
  const metricaFase = document.createElement('div');
  metricaFase.className = 'metrica';
  const prossimaFase = calcolaProssimaFase(oggi);
  const faseEtichetta = document.createElement('span');
  faseEtichetta.className = 'etichetta';
  faseEtichetta.textContent = 'Prossima fase';
  metricaFase.appendChild(faseEtichetta);
  const faseValore = document.createElement('span');
  faseValore.className = 'valore';
  faseValore.textContent = prossimaFase.nome;
  metricaFase.appendChild(faseValore);
  const faseSecondario = document.createElement('span');
  faseSecondario.className = 'secondario';
  faseSecondario.textContent = prossimaFase.fra;
  metricaFase.appendChild(faseSecondario);

  griglia.appendChild(metricaPeso);
  griglia.appendChild(metricaFase);
  radice.appendChild(griglia);

  // ── Sync Whoop non-bloccante (Task 17) ────────────────────────────────────
  // Guard anti-loop: al massimo 1 tentativo ogni 5 minuti
  const ORA = Date.now();
  const CINQUE_MIN = 5 * 60 * 1000;
  if (ORA - _ultimoTentativoSync >= CINQUE_MIN) {
    _ultimoTentativoSync = ORA;
    sincronizza(stato.store).then(esito => {
      if (!radice.isConnected || !radice.querySelector('#promemoria')) return;
      const wrapper = radice.querySelector('#promemoria');
      if (esito === 'ok') {
        vistaOggi(stato, radice);
      } else if (esito === 'errore') {
        if (wrapper) {
          const b = document.createElement('div');
          b.className = 'banner avviso';
          b.textContent = 'Sincronizzazione Whoop non riuscita: inserisci a mano o riprova.';
          wrapper.appendChild(b);
        }
      } else if (esito === 'non-collegato') {
        if (wrapper) {
          const b = document.createElement('div');
          b.className = 'banner avviso';
          const p = stato.store.leggi('whoopPonte', {});
          if (p.urlWorker) {
            b.textContent = 'Whoop non collegato: ';
            const link = document.createElement('a');
            link.href = p.urlWorker.replace(/\/$/, '') + '/auth';
            link.target = '_blank';
            link.rel = 'noopener';
            link.style.color = 'inherit';
            link.style.textDecoration = 'underline';
            link.textContent = 'collega ora';
            b.appendChild(link);
            b.appendChild(document.createTextNode(' oppure vai nelle Impostazioni ⚙.'));
          } else {
            b.textContent = 'Whoop non collegato: apri il collegamento dalle Impostazioni ⚙.';
          }
          wrapper.appendChild(b);
        }
      }
      // 'non-configurato' → nessun banner
    });
  }
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

// Colori per fascia recupero
const FASCIA_STILI = {
  verde:  { bg: '#1d2b12', testo: '#97C459' },
  giallo: { bg: '#3a2f12', testo: '#FAC775' },
  rosso:  { bg: '#3a1212', testo: '#F09595' },
};

function renderConsiglioGiorno(container, recupero) {
  container.textContent = '';
  const recuperoNum = typeof recupero === 'number' ? recupero : parseFloat(recupero);
  const consiglio = consiglioGiorno(Number.isNaN(recuperoNum) ? null : recuperoNum);
  if (!consiglio) return;
  const stile = FASCIA_STILI[consiglio.colore];
  container.style.cssText = `background:${stile.bg};color:${stile.testo};border-radius:10px;padding:10px 12px;margin-top:10px;font-size:0.9rem;`;
  container.textContent = consiglio.testo;
}

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

/**
 * Come creaCard, ma mostra opzionalmente un badge verde "sync" accanto al titolo.
 * @param {string} titolo
 * @param {boolean} mostraBadgeSync
 */
function creaCardWhoop(titolo, mostraBadgeSync) {
  const card = document.createElement('div');
  card.className = 'card';
  if (titolo) {
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '8px';
    const h = document.createElement('h2');
    h.className = 'eyebrow';
    h.textContent = titolo;
    header.appendChild(h);
    if (mostraBadgeSync) {
      const badge = document.createElement('span');
      badge.textContent = 'sync';
      badge.style.cssText = 'background:#1d2b12;color:#97C459;border-radius:4px;padding:1px 6px;font-size:0.75rem;font-weight:600;';
      header.appendChild(badge);
    }
    card.appendChild(header);
  }
  return card;
}

function capitalizza(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function calcolaProssimaFase(oggi) {
  // Build a consolidated phase list from the imported FASI (merging by name) plus the
  // fixed Stagione boundary at 2026-08-23. Each entry is [da, a, nome].
  const FASI_CONS = [];
  for (const [da, a, nome] of FASI) {
    const last = FASI_CONS[FASI_CONS.length - 1];
    if (last && last[2] === nome) {
      last[1] = a; // extend end date for same-name phases (Blocco 1, Blocco 2)
    } else {
      FASI_CONS.push([da, a, nome]);
    }
  }
  FASI_CONS.push(['2026-08-23', '9999-12-31', 'Stagione']);

  for (let i = 0; i < FASI_CONS.length; i++) {
    const [da, a] = FASI_CONS[i];
    if (oggi >= da && oggi <= a) {
      // Dentro questa fase, la prossima è la successiva
      if (i + 1 < FASI_CONS.length) {
        const [pDa, , pNome] = FASI_CONS[i + 1];
        const giorni = Math.round((new Date(pDa + 'T12:00:00') - new Date(oggi + 'T12:00:00')) / 864e5);
        return { nome: pNome, fra: `tra ${giorni} giorn${giorni === 1 ? 'o' : 'i'}` };
      }
      return { nome: '—', fra: 'sei alla stagione' };
    }
  }
  return { nome: '—', fra: '' };
}
