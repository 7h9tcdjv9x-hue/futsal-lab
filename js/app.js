import { creaStore } from './storage.js';
import { dataISO } from './util.js';
import { PIANO_PRECARICATO } from './programma.js';
import { vistaOggi } from './oggi.js';
import { vistaPiani } from './pianiView.js';
import { vistaProgressi } from './progressi.js';
import { vistaDieta } from './dieta.js';
import { vistaImpostazioni } from './impostazioni.js';
import { icona } from './icone.js';

export const VISTE = {};
export const stato = { store: null, oggi: dataISO() };

VISTE.oggi = vistaOggi;
VISTE.piani = vistaPiani;
VISTE.progressi = vistaProgressi;
VISTE.dieta = vistaDieta;
VISTE.impostazioni = vistaImpostazioni;

let tabCorrente = 'oggi';

export function naviga(tab) {
  tabCorrente = tab;
  document.querySelectorAll('#tabbar button').forEach(b => b.classList.toggle('attivo', b.dataset.tab === tab));
  const radice = document.getElementById('vista');
  radice.classList.remove('entra');
  void radice.offsetWidth;
  radice.innerHTML = '';
  (VISTE[tab] ?? (() => { radice.textContent = 'In costruzione'; }))(stato, radice);
  radice.classList.add('entra');
}

if (typeof document !== 'undefined') {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
  stato.store = creaStore();
  const piani = stato.store.leggi('piani', null);
  if (!piani) stato.store.scrivi('piani', [PIANO_PRECARICATO]);
  // Popola icone SVG tab bar
  const ICONE_TAB = { oggi: 'casa', piani: 'elenco', progressi: 'grafico', dieta: 'mela' };
  document.querySelectorAll('#tabbar button[data-tab]').forEach(btn => {
    const nome = ICONE_TAB[btn.dataset.tab];
    if (nome) btn.querySelector('.icona-tab').appendChild(icona(nome, 22));
  });

  document.getElementById('tabbar').addEventListener('click', e => {
    const b = e.target.closest('button'); if (b) naviga(b.dataset.tab);
  });

  const aggiornaData = () => {
    const nuovo = dataISO();
    if (nuovo !== stato.oggi) { stato.oggi = nuovo; naviga(tabCorrente); }
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) aggiornaData(); });
  window.addEventListener('pageshow', aggiornaData);

  naviga('oggi');
}
