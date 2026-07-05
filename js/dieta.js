// ─── dieta.js — tab Dieta ────────────────────────────────────────────────────
import { PASTI_MASSA, PASTI_MANTENIMENTO } from './programma.js';
import { abitudiniGiorno } from './oggi.js';
import { segmented, chip } from './ui.js';
import { icona } from './icone.js';

// ─── Helper: statistiche abitudini ───────────────────────────────────────────

/**
 * Calcola statistiche abitudini per le ultime 4 settimane (lun-dom).
 * Pure function: dipende solo da store e dalla data "oggi".
 *
 * @param {object} store
 * @param {string} oggi — ISO date string (es. '2026-07-04')
 * @returns {{ settimane: Array<{inizio:string, percento:number}>, streak: number }}
 */
export function statisticheAbitudini(store, oggi) {
  // Trova il lunedì della settimana corrente
  function lunediDi(iso) {
    const d = new Date(iso + 'T12:00:00');
    const dow = (d.getDay() + 6) % 7; // 0=lun ... 6=dom
    d.setDate(d.getDate() - dow);
    return d.toISOString().slice(0, 10);
  }

  function aggiungiGiorni(iso, n) {
    const d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }

  const settimaneRis = [];
  const lunediCorrente = lunediDi(oggi);

  for (let s = 0; s < 4; s++) {
    // s=0 = settimana corrente, s=1 = scorsa, ecc.
    const lunedi = aggiungiGiorni(lunediCorrente, -s * 7);
    let giorniCompleti = 0;
    let giorniTotali = 0;

    for (let g = 0; g < 7; g++) {
      const iso = aggiungiGiorni(lunedi, g);
      if (iso > oggi) continue; // non contare giorni futuri
      giorniTotali++;
      const ab = abitudiniGiorno(store, iso);
      if (ab.every(Boolean)) giorniCompleti++;
    }

    const percento = giorniTotali > 0 ? Math.round((giorniCompleti / giorniTotali) * 100) : 0;
    settimaneRis.push({ inizio: lunedi, percento });
  }

  // Streak: giorni consecutivi con 5/5 terminanti oggi o ieri
  let streak = 0;
  let cursore = oggi;

  // Se oggi non è completo, prova da ieri
  const abOggi = abitudiniGiorno(store, oggi);
  if (!abOggi.every(Boolean)) {
    cursore = aggiungiGiorni(oggi, -1);
  }

  // Conta all'indietro
  while (true) {
    const ab = abitudiniGiorno(store, cursore);
    if (!ab.every(Boolean)) break;
    streak++;
    cursore = aggiungiGiorni(cursore, -1);
  }

  return { settimane: settimaneRis, streak };
}

// ─── Helpers UI ──────────────────────────────────────────────────────────────

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

function renderCardPasti(pasti) {
  const frag = document.createDocumentFragment();
  for (const { titolo, voci } of pasti) {
    const card = creaCard('');
    // Titolo pasto: headline
    const titoloEl = document.createElement('div');
    titoloEl.className = 'headline';
    titoloEl.textContent = titolo;
    card.appendChild(titoloEl);

    // Voci footnote separate da hairline
    for (let i = 0; i < voci.length; i++) {
      if (i > 0) {
        const sep = document.createElement('div');
        sep.style.cssText = 'height:1px;background:rgba(255,255,255,0.08);margin:0;';
        card.appendChild(sep);
      }
      const voceEl = document.createElement('div');
      voceEl.className = 'footnote secondario';
      voceEl.style.cssText = 'padding:6px 0;';
      voceEl.textContent = voci[i];
      card.appendChild(voceEl);
    }
    frag.appendChild(card);
  }
  return frag;
}

// ─── Sezione: piani alimentari attivi ────────────────────────────────────────

function renderPianiAttivi(store, container) {
  const piani = store.leggi('piani', []);
  const pianiAlimentari = piani.filter(p => p.tipo === 'alimentare' && p.stato === 'attivo');

  if (pianiAlimentari.length === 0) return;

  for (const piano of pianiAlimentari) {
    const card = document.createElement('div');
    card.className = 'card';

    // Titolo piano: headline (textContent per valore utente)
    const titoloEl = document.createElement('div');
    titoloEl.className = 'headline';
    titoloEl.textContent = piano.nome || 'Piano alimentare';
    card.appendChild(titoloEl);

    if (piano.pasti && piano.pasti.length > 0) {
      for (const pasto of piano.pasti) {
        const riga = document.createElement('div');
        riga.className = 'riga';
        const nomeSpan = document.createElement('span');
        nomeSpan.className = 'primario';
        nomeSpan.textContent = pasto.titolo || pasto.nome || '';
        riga.appendChild(nomeSpan);
        card.appendChild(riga);
        if (pasto.voci && pasto.voci.length > 0) {
          for (let i = 0; i < pasto.voci.length; i++) {
            if (i > 0) {
              const sep = document.createElement('div');
              sep.style.cssText = 'height:1px;background:rgba(255,255,255,0.08);margin:0;';
              card.appendChild(sep);
            }
            const voceEl = document.createElement('div');
            voceEl.className = 'footnote secondario';
            voceEl.style.cssText = 'padding:5px 0;';
            voceEl.textContent = pasto.voci[i];
            card.appendChild(voceEl);
          }
        }
      }
    }
    container.appendChild(card);
  }
}

// ─── Sezione: abitudini settimane ─────────────────────────────────────────────

function renderAbitudini(store, oggi, container) {
  const { settimane, streak } = statisticheAbitudini(store, oggi);

  const card = creaCard('Abitudini della settimana');

  // Streak con icona fiamma lime + valore headline
  const streakRiga = document.createElement('div');
  streakRiga.className = 'riga';
  streakRiga.style.marginBottom = '8px';

  const streakLabel = document.createElement('span');
  streakLabel.className = 'secondario';
  streakLabel.textContent = 'Streak 5/5';
  streakRiga.appendChild(streakLabel);

  const streakDx = document.createElement('div');
  streakDx.style.cssText = 'display:flex;align-items:center;gap:4px;';

  const fiammaEl = icona('fiamma', 16);
  fiammaEl.style.color = 'var(--accento)';
  streakDx.appendChild(fiammaEl);

  const streakValore = document.createElement('span');
  streakValore.className = 'headline';
  streakValore.textContent = streak + (streak === 1 ? ' giorno' : ' giorni');
  streakDx.appendChild(streakValore);

  streakRiga.appendChild(streakDx);
  card.appendChild(streakRiga);

  // Ultime 4 settimane: righe "sett. del D mmm" + percentuale tabular a destra (headline)
  for (const { inizio, percento } of settimane) {
    const riga = document.createElement('div');
    riga.className = 'riga';

    const dataSpan = document.createElement('span');
    dataSpan.className = 'secondario';
    const lunedi = new Date(inizio + 'T12:00:00');
    dataSpan.textContent = 'sett. del ' + lunedi.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });

    const percentoSpan = document.createElement('span');
    percentoSpan.className = 'headline';
    percentoSpan.style.fontVariantNumeric = 'tabular-nums';
    percentoSpan.textContent = percento + '%';

    riga.appendChild(dataSpan);
    riga.appendChild(percentoSpan);
    card.appendChild(riga);
  }

  container.appendChild(card);
}

// ─── Nota integratori ─────────────────────────────────────────────────────────

function renderNotaIntegratori(container) {
  const card = creaCard('Integratori');
  // Nota come chip ambra
  const chipEl = chip('Gli integratori non servono: prima il cibo vero. Per qualsiasi integratore decidi con genitori e medico.', 'ambra');
  card.appendChild(chipEl);
  container.appendChild(card);
}

// ─── Render sezioni ───────────────────────────────────────────────────────────

function renderMassa(store, container) {
  container.innerHTML = '';
  container.appendChild(renderCardPasti(PASTI_MASSA));
  renderPianiAttivi(store, container);
  renderNotaIntegratori(container);
}

function renderMantenimento(store, container) {
  container.innerHTML = '';
  container.appendChild(renderCardPasti(PASTI_MANTENIMENTO));
  renderPianiAttivi(store, container);
  renderNotaIntegratori(container);
}

function renderAbitudiniTab(store, oggi, container) {
  container.innerHTML = '';
  renderAbitudini(store, oggi, container);
}

// ─── Vista principale ─────────────────────────────────────────────────────────

export function vistaDieta(stato, radice) {
  const { store, oggi } = stato;
  radice.innerHTML = '';

  const header = document.createElement('h1');
  header.className = 'titolo-vista';
  header.textContent = 'Dieta';
  radice.appendChild(header);

  const TABS = ['Fase massa', 'Mantenimento', 'Abitudini'];

  let tabAttiva = 0;
  const contenuto = document.createElement('div');
  contenuto.style.marginTop = '12px';

  function caricaTab(idx) {
    tabAttiva = idx;
    if (idx === 0) renderMassa(store, contenuto);
    else if (idx === 1) renderMantenimento(store, contenuto);
    else renderAbitudiniTab(store, oggi, contenuto);
  }

  const seg = segmented(TABS, 0, caricaTab);
  radice.appendChild(seg);
  radice.appendChild(contenuto);

  caricaTab(0);
}
