import { faseCorrente, FASI, TEMPLATE_STAGIONE, SEDUTE, CALENDARIO } from './programma.js';
import { sedutePerGiorno } from './piani.js';
import { apriSeduta, ultimaVolta, slugEsercizio } from './seduta.js';
import { testInRitardo } from './calcoli.js';
import { consiglioGiorno, fasciaRecupero, sincronizza } from './whoop.js';
import { backupInRitardo } from './impostazioni.js';
import {
  spuntaCircolare,
  anelloProgresso,
  chip,
  intestazione,
} from './ui.js';
import { icona } from './icone.js';

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

  // ── 0. Promemoria container ───────────────────────────────────────────────
  const divPromemoriaWrapper = document.createElement('div');
  divPromemoriaWrapper.id = 'promemoria';
  radice.appendChild(divPromemoriaWrapper);

  // Test reminder (chip ambra)
  if (testInRitardo(store, oggi)) {
    divPromemoriaWrapper.appendChild(
      chip('È ora dei test! Ogni 3-4 settimane misura sprint, salto, trazioni, piegamenti.', 'ambra')
    );
  }

  // Backup reminder (chip ambra)
  if (backupInRitardo(store, oggi)) {
    divPromemoriaWrapper.appendChild(
      chip("Sono passati più di 7 giorni dall'ultimo backup — esportalo dalle Impostazioni.", 'ambra')
    );
  }

  // ── 1. Header: data MAIUSCOLA · large-title saluto · footnote fase · gear ──
  const fase = faseCorrente(oggi);

  // Data MAIUSCOLA (es. "GIOVEDÌ 9 LUGLIO")
  const dataFormattata = new Date(oggi + 'T12:00:00').toLocaleDateString('it-IT', {
    weekday: 'long', month: 'long', day: 'numeric',
  }).toUpperCase();

  const header = document.createElement('div');
  header.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;';

  const headerLeft = document.createElement('div');

  const dataEl = document.createElement('div');
  dataEl.className = 'sezione-titolo';
  dataEl.style.margin = '0 0 2px 0';
  dataEl.textContent = dataFormattata;
  headerLeft.appendChild(dataEl);

  // Saluto large-title
  const profilo = store.leggi('profilo', {});
  const salutoEl = document.createElement('div');
  salutoEl.className = 'large-title';
  salutoEl.textContent = profilo.nome ? 'Ciao ' + profilo.nome : 'Oggi';
  headerLeft.appendChild(salutoEl);

  // Fase corrente in lime footnote/500
  const faseEl = document.createElement('div');
  faseEl.className = 'footnote';
  faseEl.style.cssText = 'color:var(--accento);font-weight:500;margin-top:2px;';
  faseEl.textContent = fase.nome + (fase.sotto ? ' · ' + fase.sotto : '');
  headerLeft.appendChild(faseEl);

  header.appendChild(headerLeft);

  // Gear button a destra
  const btnImpostazioni = document.createElement('button');
  btnImpostazioni.className = 'gear-btn';
  btnImpostazioni.setAttribute('aria-label', 'Impostazioni');
  btnImpostazioni.appendChild(icona('ingranaggio', 17));
  btnImpostazioni.addEventListener('click', () => {
    import('./app.js').then(({ naviga }) => naviga('impostazioni'));
  });
  header.appendChild(btnImpostazioni);

  radice.appendChild(header);

  // ── 2. Anello abitudini (card espandibile) ────────────────────────────────
  const abitudini = abitudiniGiorno(store, oggi);
  const n = abitudini.filter(Boolean).length;
  const tutteFatte = n === 5;

  // Stato espansione: espansa se n < 5, collassata se 5/5
  // Usiamo un flag in un oggetto locale che persiste nel re-render tramite attributo
  const cardAbitudini = document.createElement('div');
  cardAbitudini.className = 'card';
  cardAbitudini.style.cursor = 'pointer';

  // Stato iniziale espansione
  let espansa = !tutteFatte;

  // Header riga anello + testi + chevron
  const rigaAnello = document.createElement('div');
  rigaAnello.style.cssText = 'display:flex;align-items:center;gap:12px;';

  const anello = anelloProgresso(n / 5, { size: 52, spess: 6, testo: n + '/5' });
  rigaAnello.appendChild(anello);

  const abTesti = document.createElement('div');
  abTesti.style.flex = '1';

  const abTitolo = document.createElement('div');
  abTitolo.className = 'headline';
  abTitolo.textContent = 'Abitudini di oggi';
  abTesti.appendChild(abTitolo);

  const abSottotitolo = document.createElement('div');
  abSottotitolo.className = 'footnote';
  abSottotitolo.style.marginTop = '2px';

  if (tutteFatte) {
    abSottotitolo.textContent = 'Tutte fatte!';
  } else {
    const nonFatte = ABITUDINI.filter((_, i) => !abitudini[i]);
    if (nonFatte.length === 1) {
      abSottotitolo.textContent = 'Ti manca ' + nonFatte[0];
    } else if (nonFatte.length === 2) {
      abSottotitolo.textContent = 'Ti mancano ' + nonFatte[0] + ' e ' + nonFatte[1];
    } else {
      abSottotitolo.textContent = 'Ti mancano ' + nonFatte.length + ' abitudini';
    }
  }
  abTesti.appendChild(abSottotitolo);

  rigaAnello.appendChild(abTesti);

  const chevronEl = document.createElement('span');
  chevronEl.style.color = 'var(--testo3)';
  chevronEl.appendChild(espansa ? icona('chevronGiu', 18) : icona('chevronDestra', 18));
  rigaAnello.appendChild(chevronEl);

  cardAbitudini.appendChild(rigaAnello);

  // Elenco spunte (sotto)
  const listaAbitudini = document.createElement('div');
  listaAbitudini.style.display = espansa ? 'block' : 'none';
  listaAbitudini.style.marginTop = '8px';

  for (let i = 0; i < ABITUDINI.length; i++) {
    const riga = document.createElement('div');
    riga.className = 'riga';
    riga.style.cursor = 'pointer';

    const spunta = spuntaCircolare(abitudini[i]);
    riga.appendChild(spunta);

    const nomeEl = document.createElement('div');
    nomeEl.style.flex = '1';
    nomeEl.className = abitudini[i] ? 'footnote' : '';
    nomeEl.style.color = abitudini[i] ? 'var(--testo2)' : 'var(--testo)';
    nomeEl.textContent = ABITUDINI[i];
    riga.appendChild(nomeEl);

    const toggleAbitudine = () => {
      spuntaAbitudine(store, oggi, i, !abitudini[i]);
      vistaOggi(stato, radice);
    };

    spunta.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleAbitudine();
    });
    riga.addEventListener('click', toggleAbitudine);

    listaAbitudini.appendChild(riga);
  }

  cardAbitudini.appendChild(listaAbitudini);

  // Toggle espansione su click card (area anello/header)
  rigaAnello.addEventListener('click', () => {
    espansa = !espansa;
    listaAbitudini.style.display = espansa ? 'block' : 'none';
    chevronEl.innerHTML = '';
    chevronEl.appendChild(espansa ? icona('chevronGiu', 18) : icona('chevronDestra', 18));
  });

  radice.appendChild(cardAbitudini);

  // ── 3. Hero recupero (sostituisce #consiglio-giorno e riga sync) ──────────
  const whoopDati = store.leggi('whoop', {});
  const _whoopRaw = whoopDati[oggi] ?? {};
  const whoopOggi = { ..._whoopRaw, strain: _whoopRaw.strain ?? _whoopRaw.strainIeri };

  const recuperoNum = typeof whoopOggi.recupero === 'number'
    ? whoopOggi.recupero
    : parseFloat(whoopOggi.recupero);
  const fasciaStr = fasciaRecupero(Number.isNaN(recuperoNum) ? null : recuperoNum);

  // Mappa fascia: 'giallo' → 'ambra' per le classi CSS
  const fasciaCSS = fasciaStr === 'giallo' ? 'ambra' : fasciaStr;

  if (fasciaCSS) {
    const consiglio = consiglioGiorno(Number.isNaN(recuperoNum) ? null : recuperoNum);
    const hero = document.createElement('div');
    hero.className = 'hero hero-' + fasciaCSS;
    hero.style.cssText = 'display:flex;align-items:center;gap:12px;';

    const miniAnello = anelloProgresso(recuperoNum / 100, { size: 36, spess: 4, testo: String(Math.round(recuperoNum)) });
    hero.appendChild(miniAnello);

    const heroTesti = document.createElement('div');
    heroTesti.style.flex = '1';

    const heroTitolo = document.createElement('div');
    heroTitolo.className = 'headline';
    if (fasciaCSS === 'verde') {
      heroTitolo.textContent = 'Recupero alto';
    } else if (fasciaCSS === 'ambra') {
      heroTitolo.textContent = 'Recupero medio';
    } else {
      heroTitolo.textContent = 'Recupero basso';
    }
    heroTesti.appendChild(heroTitolo);

    if (consiglio) {
      const heroSotto = document.createElement('div');
      heroSotto.className = 'footnote';
      heroSotto.style.marginTop = '2px';
      let testoSotto = consiglio.testo;
      // Aggiungi "· sync HH:MM" solo se fonte === 'sync'
      if (whoopOggi.fonte === 'sync') {
        const p = store.leggi('whoopPonte', {});
        if (p.ultimaSync) {
          const orario = new Date(p.ultimaSync).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
          // Usiamo due nodi testo separati per rispettare textContent discipline
          heroSotto.textContent = testoSotto;
          const syncNode = document.createTextNode(' · sync ' + orario);
          heroSotto.appendChild(syncNode);
        } else {
          heroSotto.textContent = testoSotto;
        }
      } else {
        heroSotto.textContent = testoSotto;
      }
      heroTesti.appendChild(heroSotto);
    }

    hero.appendChild(heroTesti);
    radice.appendChild(hero);
  }

  // ── 4. Context card: stagione OR riposo ───────────────────────────────────
  const piani = store.leggi('piani', []);
  const sedute = sedutePerGiorno(piani, oggi);
  const seduteDati = store.leggi('sedute', {});
  const calOggi = CALENDARIO[oggi];

  if (fase.stagione) {
    const cardStagione = creaCard('Stagione — mantenimento');
    const stagioneDati = store.leggi('stagione', { giorniClub: [] });
    const giorniClub = stagioneDati.giorniClub ?? [];
    const isClub = giorniClub.includes(oggi);

    const toggleClub = document.createElement('label');
    toggleClub.className = 'riga';
    const toggleSpan = document.createElement('span');
    toggleSpan.textContent = 'Oggi giornata club';
    const toggleChk = document.createElement('input');
    toggleChk.type = 'checkbox';
    if (isClub) toggleChk.checked = true;
    toggleChk.addEventListener('change', e => {
      const st = store.leggi('stagione', { giorniClub: [] });
      const gc = st.giorniClub ?? [];
      if (e.target.checked) { if (!gc.includes(oggi)) gc.push(oggi); }
      else { const idx = gc.indexOf(oggi); if (idx !== -1) gc.splice(idx, 1); }
      st.giorniClub = gc;
      store.scrivi('stagione', st);
      vistaOggi(stato, radice);
    });
    toggleClub.appendChild(toggleSpan);
    toggleClub.appendChild(toggleChk);
    cardStagione.appendChild(toggleClub);

    for (const voce of TEMPLATE_STAGIONE.voci) {
      const p = document.createElement('p');
      p.className = 'secondario';
      p.textContent = voce;
      cardStagione.appendChild(p);
    }

    const regola = document.createElement('p');
    regola.className = 'banner avviso';
    regola.textContent = TEMPLATE_STAGIONE.regola;
    cardStagione.appendChild(regola);

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
    const cardScarico = creaCard('Riposo');
    const msg = document.createElement('p');
    msg.className = 'primario';
    msg.textContent = 'Riposo vero: camminata, bici tranquilla, mobilità. Te lo sei guadagnato.';
    cardScarico.appendChild(msg);
    radice.appendChild(cardScarico);
  }

  // ── 5. Card sedute di oggi ────────────────────────────────────────────────
  if (sedute.length > 0) {
    radice.appendChild(intestazione('SEDUTE DI OGGI'));

    const cardSedute = document.createElement('div');
    cardSedute.className = 'card';
    const sd = store.leggi('sedute', {});

    for (const { pianoId, pianoNome, seduta, momento } of sedute) {
      const chiave = chiaveSeduta(pianoId, seduta.codice ?? seduta.id);
      const fatta = !!(sd[oggi] && sd[oggi][chiave]);

      const riga = document.createElement('div');
      riga.className = 'riga';
      riga.style.cursor = 'pointer';

      // Spunta circolare
      const spuntaBtn = spuntaCircolare(fatta);

      // Contenuto principale
      const left = document.createElement('div');
      left.style.flex = '1';

      // Titolo seduta (15px/500, secondario se fatta)
      const spanTitolo = document.createElement('div');
      spanTitolo.style.cssText = 'font-size:15px;font-weight:500;' + (fatta ? 'color:var(--testo2)' : 'color:var(--testo)');
      spanTitolo.textContent = seduta.titolo;
      left.appendChild(spanTitolo);

      // Sottotitolo footnote: momento + "da battere" se esercizi
      const sottoTesto = [];
      if (momento) sottoTesto.push(momento);

      // "da battere" solo per sedute con esercizi
      if (seduta.esercizi && seduta.esercizi.length > 0) {
        const primoEsercizio = seduta.esercizi[0];
        const slug = slugEsercizio(primoEsercizio.nome);
        const ultima = ultimaVolta(store, slug, oggi);
        if (ultima && ultima.serie && ultima.serie.length > 0) {
          const best = migliorSerie(ultima.serie);
          if (best) {
            sottoTesto.push('da battere: ' + best.kg + ' kg × ' + best.reps);
          }
        }
      }

      if (sottoTesto.length > 0) {
        const spanSotto = document.createElement('div');
        spanSotto.className = 'footnote';
        spanSotto.style.marginTop = '2px';
        spanSotto.textContent = sottoTesto.join(' · ');
        left.appendChild(spanSotto);
      }

      riga.appendChild(spuntaBtn);
      riga.appendChild(left);

      const haEsercizi = seduta.esercizi && seduta.esercizi.length > 0;
      const haVoci = seduta.voci && seduta.voci.length > 0;

      if (haEsercizi) {
        // Chevron a destra (la riga apre il registro)
        const chevron = document.createElement('span');
        chevron.style.color = 'var(--testo3)';
        chevron.appendChild(icona('chevronDestra', 16));
        riga.appendChild(chevron);

        // Spunta: segna fatta senza aprire
        spuntaBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const sdt = store.leggi('sedute', {});
          if (!sdt[oggi]) sdt[oggi] = {};
          sdt[oggi][chiave] = !(sdt[oggi][chiave] === true);
          store.scrivi('sedute', sdt);
          vistaOggi(stato, radice);
        });

        // Riga: apri registro seduta
        riga.addEventListener('click', () => apriSeduta(stato, { pianoId, pianoNome, seduta, momento }));

      } else if (haVoci) {
        // Toggle su riga (solo voci)
        const toggle = () => {
          const sdt = store.leggi('sedute', {});
          if (!sdt[oggi]) sdt[oggi] = {};
          sdt[oggi][chiave] = !(sdt[oggi][chiave] === true);
          store.scrivi('sedute', sdt);
          vistaOggi(stato, radice);
        };
        spuntaBtn.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
        riga.addEventListener('click', toggle);
      }

      cardSedute.appendChild(riga);
    }

    radice.appendChild(cardSedute);
  }

  // ── 6. Check-in Whoop ─────────────────────────────────────────────────────
  const cardWhoop = document.createElement('div');
  cardWhoop.className = 'card';

  // Intestazione card Whoop
  const whoopTitolo = document.createElement('div');
  whoopTitolo.style.cssText = 'font-size:13px;color:var(--testo2);font-weight:500;margin-bottom:10px;';
  whoopTitolo.textContent = 'Check-in Whoop';
  cardWhoop.appendChild(whoopTitolo);

  const campiWhoop = [
    { label: 'Recupero (%)', key: 'recupero', min: 0, max: 100, step: 1, icnNome: 'grafico' },
    { label: 'HRV (ms)', key: 'hrv', min: 10, max: 250, step: 1, icnNome: 'onda' },
    { label: 'FC riposo (bpm)', key: 'fcRiposo', min: 30, max: 120, step: 1, icnNome: 'cuore' },
    { label: 'Ore sonno', key: 'sonnoOre', min: 0, max: 14, step: 0.1, icnNome: 'luna' },
    { label: 'Strain di ieri', key: 'strain', min: 0, max: 21, step: 0.1, icnNome: 'fiamma' },
  ];

  for (const { label, key, min, max, step, icnNome } of campiWhoop) {
    const riga = document.createElement('div');
    riga.className = 'riga';

    // Icona + etichetta a sinistra
    const etichettaWrap = document.createElement('div');
    etichettaWrap.style.cssText = 'display:flex;align-items:center;gap:8px;flex:1;color:var(--testo2);';
    etichettaWrap.appendChild(icona(icnNome, 16));
    const lbl = document.createElement('label');
    lbl.textContent = label;
    lbl.style.fontSize = '15px';
    etichettaWrap.appendChild(lbl);

    const inp = document.createElement('input');
    inp.type = 'number';
    inp.min = min;
    inp.max = max;
    inp.step = step;
    inp.value = whoopOggi[key] ?? '';
    inp.style.cssText = 'width:90px;flex-shrink:0;';
    inp.addEventListener('change', () => {
      const v = parseFloat(inp.value);
      if (isNaN(v) || v < min || v > max) { inp.value = whoopOggi[key] ?? ''; return; }
      const wd = store.leggi('whoop', {});
      if (!wd[oggi]) wd[oggi] = { fonte: 'manuale' };
      wd[oggi][key] = v;
      wd[oggi].fonte = 'manuale';
      store.scrivi('whoop', wd);
      vistaOggi(stato, radice);
    });

    riga.appendChild(etichettaWrap);
    riga.appendChild(inp);
    cardWhoop.appendChild(riga);
  }

  radice.appendChild(cardWhoop);

  // ── 7. Griglia metriche: peso rapido + prossima fase ─────────────────────
  const griglia = document.createElement('div');
  griglia.className = 'griglia2';

  // Metrica peso
  const metricaPeso = document.createElement('div');
  metricaPeso.className = 'metrica';

  const listaPeso = store.leggi('peso', []);
  const ultimoPeso = listaPeso.length ? listaPeso[listaPeso.length - 1] : null;

  const pesoEtichetta = document.createElement('div');
  pesoEtichetta.className = 'etichetta';
  pesoEtichetta.textContent = 'Peso';
  metricaPeso.appendChild(pesoEtichetta);

  const pesoValore = document.createElement('div');
  pesoValore.className = 'valore';
  pesoValore.textContent = ultimoPeso ? ultimoPeso.kg + ' kg' : '—';
  metricaPeso.appendChild(pesoValore);

  // Input rapido peso h48 + button primario compatto
  const inputPeso = document.createElement('input');
  inputPeso.type = 'number';
  inputPeso.min = 30;
  inputPeso.max = 120;
  inputPeso.step = 0.1;
  inputPeso.placeholder = 'kg';
  inputPeso.style.cssText = 'height:48px;margin-top:8px;';
  metricaPeso.appendChild(inputPeso);

  const btnSalvaPeso = document.createElement('button');
  btnSalvaPeso.className = 'primario';
  btnSalvaPeso.style.cssText = 'height:36px;font-size:14px;margin-top:6px;';
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
  metricaPeso.appendChild(btnSalvaPeso);

  // Metrica prossima fase
  const metricaFase = document.createElement('div');
  metricaFase.className = 'metrica';

  const prossimaFase = calcolaProssimaFase(oggi);

  const faseEtichetta = document.createElement('div');
  faseEtichetta.className = 'etichetta';
  faseEtichetta.textContent = 'Prossima fase';
  metricaFase.appendChild(faseEtichetta);

  const faseValore = document.createElement('div');
  faseValore.className = 'valore';
  faseValore.textContent = prossimaFase.nome;
  metricaFase.appendChild(faseValore);

  const faseSecondario = document.createElement('div');
  faseSecondario.className = 'secondario';
  faseSecondario.textContent = prossimaFase.fra;
  metricaFase.appendChild(faseSecondario);

  griglia.appendChild(metricaPeso);
  griglia.appendChild(metricaFase);
  radice.appendChild(griglia);

  // ── Sync Whoop non-bloccante ──────────────────────────────────────────────
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
          wrapper.appendChild(chip('Sincronizzazione Whoop non riuscita: inserisci a mano o riprova.', 'ambra'));
        }
      } else if (esito === 'non-collegato') {
        if (wrapper) {
          const p = stato.store.leggi('whoopPonte', {});
          if (p.urlWorker) {
            // Costruisci il chip con link manualmente (non usiamo il helper chip())
            const c2 = document.createElement('div');
            c2.className = 'chip chip-ambra';
            const span = document.createElement('span');
            span.textContent = 'Whoop non collegato: ';
            c2.appendChild(span);
            const link = document.createElement('a');
            link.href = p.urlWorker.replace(/\/$/, '') + '/auth';
            link.target = '_blank';
            link.rel = 'noopener';
            link.textContent = 'collega ora';
            link.style.cssText = 'color: inherit; text-decoration: underline;';
            c2.appendChild(link);
            const span2 = document.createElement('span');
            span2.textContent = ' oppure vai nelle Impostazioni.';
            c2.appendChild(span2);
            wrapper.appendChild(c2);
          } else {
            wrapper.appendChild(chip('Whoop non collegato: apri il collegamento dalle Impostazioni.', 'ambra'));
          }
        }
      }
      // 'non-configurato' → nessun chip
    });
  }
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Migliore serie: max kg, poi max reps (small local helper).
 */
function migliorSerie(serie) {
  if (!serie || serie.length === 0) return null;
  return serie.reduce((best, cur) => {
    if (cur.kg > best.kg) return cur;
    if (cur.kg === best.kg && cur.reps > best.reps) return cur;
    return best;
  });
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

function capitalizza(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function calcolaProssimaFase(oggi) {
  const FASI_CONS = [];
  for (const [da, a, nome] of FASI) {
    const last = FASI_CONS[FASI_CONS.length - 1];
    if (last && last[2] === nome) {
      last[1] = a;
    } else {
      FASI_CONS.push([da, a, nome]);
    }
  }
  FASI_CONS.push(['2026-08-23', '9999-12-31', 'Stagione']);

  for (let i = 0; i < FASI_CONS.length; i++) {
    const [da, a] = FASI_CONS[i];
    if (oggi >= da && oggi <= a) {
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
