/* js/ui.js — helper UI componenti iOS
   Nessun accesso al DOM a livello modulo: tutti gli elementi sono
   creati DENTRO le funzioni esportate. */

import { icona } from './icone.js';

const NS = 'http://www.w3.org/2000/svg';

/**
 * spuntaCircolare(fatta) → HTMLButtonElement
 * Cerchio 26px; classe .fatta quando true; contiene icona('spunta', 15).
 * Il chiamante aggiunge il listener click.
 */
export function spuntaCircolare(fatta) {
  const btn = document.createElement('button');
  btn.className = 'spunta-c' + (fatta ? ' fatta' : '');
  btn.type = 'button';
  btn.setAttribute('aria-pressed', String(!!fatta));
  btn.setAttribute('aria-label', fatta ? 'Completato' : 'Da completare');
  btn.appendChild(icona('spunta', 15));
  return btn;
}

/**
 * anelloProgresso(frazione, {size=52, spess=6, testo=''}) → SVGElement
 * SVG ring: traccia sup2 + arco lime proporzionale a frazione.
 * Testo centrale bold tabular.
 */
export function anelloProgresso(frazione, { size = 52, spess = 6, testo = '' } = {}) {
  const r = (size - spess) / 2;
  const C = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(1, frazione)) * C;

  const el = document.createElementNS(NS, 'svg');
  el.setAttribute('viewBox', `0 0 ${size} ${size}`);
  el.setAttribute('width', size);
  el.setAttribute('height', size);
  el.setAttribute('aria-hidden', 'true');

  // Traccia sfondo
  const sfondo = document.createElementNS(NS, 'circle');
  sfondo.setAttribute('cx', size / 2);
  sfondo.setAttribute('cy', size / 2);
  sfondo.setAttribute('r', r);
  sfondo.setAttribute('fill', 'none');
  sfondo.setAttribute('stroke', 'var(--sup2)');
  sfondo.setAttribute('stroke-width', spess);
  el.appendChild(sfondo);

  // Arco progresso
  const arco = document.createElementNS(NS, 'circle');
  arco.setAttribute('cx', size / 2);
  arco.setAttribute('cy', size / 2);
  arco.setAttribute('r', r);
  arco.setAttribute('fill', 'none');
  arco.setAttribute('stroke', 'var(--accento)');
  arco.setAttribute('stroke-width', spess);
  arco.setAttribute('stroke-linecap', 'round');
  arco.setAttribute('stroke-dasharray', `${dash} ${C}`);
  arco.setAttribute('transform', `rotate(-90 ${size / 2} ${size / 2})`);
  el.appendChild(arco);

  // Testo centrale
  if (testo !== '') {
    const txt = document.createElementNS(NS, 'text');
    txt.setAttribute('x', size / 2);
    txt.setAttribute('y', size / 2);
    txt.setAttribute('dominant-baseline', 'central');
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('font-size', Math.round(size * 0.27));
    txt.setAttribute('font-weight', '700');
    txt.setAttribute('fill', 'var(--testo)');
    txt.setAttribute('font-variant-numeric', 'tabular-nums');
    txt.textContent = testo;
    el.appendChild(txt);
  }

  return el;
}

/**
 * segmented(opzioni, indiceAttivo, onCambia) → HTMLElement
 * Pill con thumb lime scorrevole via transform: translateX(indice*100%).
 */
export function segmented(opzioni, indiceAttivo, onCambia) {
  const wrap = document.createElement('div');
  wrap.className = 'segmented';
  wrap.style.setProperty('--seg-count', opzioni.length);

  const thumb = document.createElement('div');
  thumb.className = 'segmented-thumb';
  thumb.style.transform = `translateX(${indiceAttivo * 100}%)`;
  wrap.appendChild(thumb);

  opzioni.forEach((testo, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'segmented-voce' + (i === indiceAttivo ? ' attiva' : '');
    btn.textContent = testo;
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('.segmented-voce').forEach((v, j) => {
        v.classList.toggle('attiva', j === i);
      });
      thumb.style.transform = `translateX(${i * 100}%)`;
      onCambia(i);
    });
    wrap.appendChild(btn);
  });

  return wrap;
}

/**
 * chip(testo, tono, nomeIcona?) → HTMLElement
 * classe "chip chip-<tono>"; icona a sinistra se fornita.
 */
export function chip(testo, tono, nomeIcona) {
  const el = document.createElement('div');
  el.className = `chip chip-${tono}`;
  if (nomeIcona) el.appendChild(icona(nomeIcona, 14));
  const span = document.createElement('span');
  span.textContent = testo;
  el.appendChild(span);
  return el;
}

/**
 * statoVuoto(nomeIcona, titolo, sottotitolo) → HTMLElement
 */
export function statoVuoto(nomeIcona, titolo, sottotitolo) {
  const wrap = document.createElement('div');
  wrap.className = 'stato-vuoto';

  const ic = icona(nomeIcona, 40);
  wrap.appendChild(ic);

  const t = document.createElement('div');
  t.className = 'titolo-vuoto';
  t.textContent = titolo;
  wrap.appendChild(t);

  if (sottotitolo) {
    const s = document.createElement('div');
    s.className = 'sotto-vuoto';
    s.textContent = sottotitolo;
    wrap.appendChild(s);
  }

  return wrap;
}

/**
 * intestazione(testo) → HTMLElement
 * Caption maiuscoletto di sezione; classe "sezione-titolo".
 */
export function intestazione(testo) {
  const el = document.createElement('div');
  el.className = 'sezione-titolo';
  el.textContent = testo;
  return el;
}
