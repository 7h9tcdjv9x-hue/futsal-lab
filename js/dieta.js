// ─── dieta.js — tab Dieta ────────────────────────────────────────────────────
import { PASTI_MASSA, PASTI_MANTENIMENTO } from './programma.js';
import { abitudiniGiorno } from './oggi.js';

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

function creaPillole(voci, attiva, onCambia) {
  const div = document.createElement('div');
  div.className = 'pillole';
  for (const [chiave, etichetta] of voci) {
    const btn = document.createElement('button');
    btn.textContent = etichetta;
    btn.className = chiave === attiva ? 'attivo' : '';
    btn.addEventListener('click', () => {
      div.querySelectorAll('button').forEach(b => b.classList.remove('attivo'));
      btn.classList.add('attivo');
      onCambia(chiave);
    });
    div.appendChild(btn);
  }
  return div;
}

function renderCardPasti(pasti) {
  const frag = document.createDocumentFragment();
  for (const { titolo, voci } of pasti) {
    const card = creaCard(titolo);
    const ul = document.createElement('ul');
    ul.style.cssText = 'margin:6px 0 0 0;padding-left:18px;';
    for (const voce of voci) {
      const li = document.createElement('li');
      li.className = 'secondario';
      li.style.cssText = 'margin-bottom:4px;';
      li.textContent = voce;
      ul.appendChild(li);
    }
    card.appendChild(ul);
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
    const card = creaCard(piano.nome || 'Piano alimentare');
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
          const ul = document.createElement('ul');
          ul.style.cssText = 'margin:4px 0 0 0;padding-left:18px;';
          for (const voce of pasto.voci) {
            const li = document.createElement('li');
            li.className = 'secondario';
            li.style.cssText = 'margin-bottom:3px;';
            li.textContent = voce;
            ul.appendChild(li);
          }
          card.appendChild(ul);
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

  // Streak
  const streakDiv = document.createElement('div');
  streakDiv.className = 'griglia2';
  streakDiv.style.marginBottom = '12px';

  const metricaStreak = document.createElement('div');
  metricaStreak.className = 'metrica';
  const streakLabel = document.createElement('span');
  streakLabel.className = 'etichetta';
  streakLabel.textContent = 'Streak 5/5';
  metricaStreak.appendChild(streakLabel);
  const streakValore = document.createElement('span');
  streakValore.className = 'valore';
  streakValore.textContent = streak + (streak === 1 ? ' giorno' : ' giorni');
  streakValore.style.color = streak >= 7 ? '#97C459' : streak >= 3 ? '#EF9F27' : 'inherit';
  metricaStreak.appendChild(streakValore);
  streakDiv.appendChild(metricaStreak);
  card.appendChild(streakDiv);

  // Ultime 4 settimane
  for (const { inizio, percento } of settimane) {
    const riga = document.createElement('div');
    riga.className = 'riga';

    const dataSpan = document.createElement('span');
    dataSpan.className = 'secondario';
    const lunedi = new Date(inizio + 'T12:00:00');
    dataSpan.textContent = 'Sett. ' + lunedi.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });

    const percentoSpan = document.createElement('span');
    percentoSpan.className = 'primario';
    percentoSpan.textContent = percento + '%';
    percentoSpan.style.color = percento === 100 ? '#97C459' : percento >= 70 ? '#EF9F27' : 'inherit';

    riga.appendChild(dataSpan);
    riga.appendChild(percentoSpan);
    card.appendChild(riga);
  }

  container.appendChild(card);
}

// ─── Nota integratori ─────────────────────────────────────────────────────────

function renderNotaIntegratori(container) {
  const card = creaCard('Integratori');
  const p = document.createElement('p');
  p.className = 'secondario';
  p.textContent = 'Gli integratori non servono: prima il cibo vero. Per qualsiasi integratore decidi con genitori e medico.';
  card.appendChild(p);
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
  header.className = 'eyebrow';
  header.textContent = 'Dieta';
  radice.appendChild(header);

  const TABS = [
    ['massa', 'Fase massa'],
    ['mantenimento', 'Mantenimento'],
    ['abitudini', 'Abitudini'],
  ];

  const contenuto = document.createElement('div');
  contenuto.style.marginTop = '12px';

  function caricaTab(tab) {
    if (tab === 'massa') renderMassa(store, contenuto);
    else if (tab === 'mantenimento') renderMantenimento(store, contenuto);
    else renderAbitudiniTab(store, oggi, contenuto);
  }

  const pillole = creaPillole(TABS, 'massa', caricaTab);
  radice.appendChild(pillole);
  radice.appendChild(contenuto);

  caricaTab('massa');
}
