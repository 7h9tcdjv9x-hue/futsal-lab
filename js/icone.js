/* js/icone.js — icone SVG lineari stile SF Symbols
   icona(nome, size=24) → SVGElement
   Nessun accesso al DOM a livello modulo. */

const NS = 'http://www.w3.org/2000/svg';

function svg(size) {
  const el = document.createElementNS(NS, 'svg');
  el.setAttribute('viewBox', '0 0 24 24');
  el.setAttribute('fill', 'none');
  el.setAttribute('stroke', 'currentColor');
  el.setAttribute('stroke-width', '1.8');
  el.setAttribute('stroke-linecap', 'round');
  el.setAttribute('stroke-linejoin', 'round');
  el.setAttribute('width', size);
  el.setAttribute('height', size);
  el.setAttribute('aria-hidden', 'true');
  return el;
}

function p(d) {
  const el = document.createElementNS(NS, 'path');
  el.setAttribute('d', d);
  return el;
}

function c(cx, cy, r) {
  const el = document.createElementNS(NS, 'circle');
  el.setAttribute('cx', cx);
  el.setAttribute('cy', cy);
  el.setAttribute('r', r);
  return el;
}

const ICONE = {
  casa(s) {
    const el = svg(s);
    el.append(p('M3 11.5 12 4l9 7.5'), p('M5.5 10.5V20h13v-9.5'));
    return el;
  },
  elenco(s) {
    const el = svg(s);
    el.append(p('M4 6h16'), p('M4 12h16'), p('M4 18h10'));
    return el;
  },
  grafico(s) {
    const el = svg(s);
    el.append(p('M4 5v14h16'), p('M7 15l4-4 3 3 5-6'));
    return el;
  },
  mela(s) {
    const el = svg(s);
    el.append(p('M12 7c-3 0-5 2.5-5 5.5S9.5 20 12 20s5-3.5 5-7.5S15 7 12 7z'), p('M12 7c0-2 1-3 3-4'));
    return el;
  },
  ingranaggio(s) {
    const el = svg(s);
    el.append(
      c(12, 12, 3),
      p('M12 2v3'), p('M12 19v3'), p('M2 12h3'), p('M19 12h3'),
      p('M4.9 4.9 7 7'), p('M17 17l2.1 2.1'), p('M19.1 4.9 17 7'), p('M7 17l-2.1 2.1')
    );
    return el;
  },
  chevronDestra(s) {
    const el = svg(s);
    el.append(p('M9 6l6 6-6 6'));
    return el;
  },
  chevronGiu(s) {
    const el = svg(s);
    el.append(p('M6 9l6 6 6-6'));
    return el;
  },
  spunta(s) {
    const el = svg(s);
    el.append(p('M5 12l5 5L19 7'));
    return el;
  },
  piu(s) {
    const el = svg(s);
    el.append(p('M12 5v14'), p('M5 12h14'));
    return el;
  },
  cestino(s) {
    const el = svg(s);
    el.append(p('M4 7h16'), p('M9 7V5h6v2'), p('M6 7l1 13h10l1-13'), p('M10 11v6'), p('M14 11v6'));
    return el;
  },
  fotocamera(s) {
    const el = svg(s);
    el.append(p('M4 8h3l2-2h6l2 2h3v11H4z'), c(12, 13.5, 3.5));
    return el;
  },
  frecciaSinistra(s) {
    const el = svg(s);
    el.append(p('M11 5l-7 7 7 7'), p('M4 12h16'));
    return el;
  },
  fiamma(s) {
    const el = svg(s);
    el.append(p('M12 3c3 3 6 6.5 6 10a6 6 0 0 1-12 0c0-2 1-3.5 2.5-5C9.5 9.5 12 8 12 3z'));
    return el;
  },
  luna(s) {
    const el = svg(s);
    el.append(p('M20 14A8 8 0 1 1 10 4a6.5 6.5 0 0 0 10 10z'));
    return el;
  },
  cuore(s) {
    const el = svg(s);
    el.append(p('M12 20s-7-4.5-9-9a4.8 4.8 0 0 1 9-2.2A4.8 4.8 0 0 1 21 11c-2 4.5-9 9-9 9z'));
    return el;
  },
  onda(s) {
    const el = svg(s);
    el.append(p('M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0'));
    return el;
  },
  orologio(s) {
    const el = svg(s);
    el.append(c(12, 12, 8), p('M12 8v4l3 2'));
    return el;
  },
  esporta(s) {
    const el = svg(s);
    el.append(p('M12 15V4'), p('M8 8l4-4 4 4'), p('M5 15v5h14v-5'));
    return el;
  },
  importa(s) {
    const el = svg(s);
    el.append(p('M12 4v11'), p('M8 11l4 4 4-4'), p('M5 15v5h14v-5'));
    return el;
  },
  matita(s) {
    const el = svg(s);
    el.append(p('M4 20l1-4L16 5l3 3L8 19l-4 1z'), p('M14 7l3 3'));
    return el;
  },
  archivio(s) {
    const el = svg(s);
    el.append(p('M4 5h16v4H4z'), p('M6 9v10h12V9'), p('M10 13h4'));
    return el;
  },
};

/**
 * icona(nome, size=24) → SVGElement
 * Crea un elemento SVG per il nome icona dato.
 */
export function icona(nome, size = 24) {
  const fn = ICONE[nome];
  if (!fn) {
    const el = svg(size);
    el.append(p('M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0'));
    return el;
  }
  return fn(size);
}
